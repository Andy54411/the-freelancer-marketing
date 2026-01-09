'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { useAuth } from '@/contexts/AuthContext';
import {
  OnboardingContextType,
  CompanyOnboardingStatus,
  stepValidationRules,
  onboardingSteps,
} from '@/types/onboarding';

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};

interface OnboardingProviderProps {
  children: React.ReactNode;
  companyId: string;
  initialStep?: number;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({
  children,
  companyId,
  initialStep,
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [stepData, setStepData] = useState<Record<number, any>>({});
  const [onboardingStatus, setOnboardingStatus] = useState<CompanyOnboardingStatus | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const totalSteps = onboardingSteps.length;

  // Load onboarding status mit Rate-Limiting
  useEffect(() => {
    let lastLoadTime = 0;
    const RATE_LIMIT_MS = 5000; // Maximal alle 5 Sekunden laden

    const loadOnboardingStatus = async () => {
      if (!companyId || !user) return;

      const now = Date.now();
      if (now - lastLoadTime < RATE_LIMIT_MS) {
        return;
      }
      lastLoadTime = now;

      try {
        // 🔧 SAUBERE TRENNUNG: Lade Onboarding aus companies collection
        const companyDoc = await getDoc(doc(db, 'companies', companyId));

        if (companyDoc.exists()) {
          const companyData = companyDoc.data();

          // Check if onboarding is completed
          const isCompleted = companyData.onboardingCompleted === true;
          const currentStepFromData = companyData.onboardingCurrentStep || '1';

          // Load step data from companies collection
          const stepDataFromCompany: Record<number, any> = {};
          ['step1', 'step2', 'step3', 'step4', 'step5'].forEach((stepKey, index) => {
            if (companyData[stepKey]) {
              stepDataFromCompany[index + 1] = companyData[stepKey];
            }
          });

          const status: CompanyOnboardingStatus = {
            uid: companyId,
            status: isCompleted ? 'completed' : 'pending_onboarding',
            completedSteps: companyData.onboardingCompletedSteps || [],
            currentStep: currentStepFromData,
            startedAt: companyData.onboardingStartedAt?.toDate() || new Date(),
            registrationCompletedAt: companyData.createdAt?.toDate() || new Date(),
            registrationMethod: 'new_registration',
            stepData: stepDataFromCompany,
            completionPercentage: companyData.onboardingCompletionPercentage || 0,
          };

          setOnboardingStatus(status);
          setStepData(stepDataFromCompany);

          // Set current step based on saved progress or initialStep
          const stepNumber = initialStep || parseInt(currentStepFromData) || 1;
          setCurrentStep(stepNumber);
        } else {
          // Create initial onboarding status for new companies
          const initialStatus: CompanyOnboardingStatus = {
            uid: companyId,
            status: 'pending_onboarding',
            completedSteps: [],
            currentStep: '1',
            startedAt: new Date(),
            registrationCompletedAt: new Date(),
            registrationMethod: 'new_registration',
            stepData: {},
            completionPercentage: 0,
          };

          // Save initial status to companies document (nicht users)
          await updateDoc(doc(db, 'companies', companyId), {
            onboardingStartedAt: serverTimestamp(),
            onboardingCurrentStep: '1',
            onboardingCompletionPercentage: 0,
          });

          setOnboardingStatus(initialStatus);
        }
      } catch {
        // Fallback: Set default status to prevent app crash
        const fallbackStatus: CompanyOnboardingStatus = {
          uid: companyId,
          status: 'pending_onboarding',
          completedSteps: [],
          currentStep: '1',
          startedAt: new Date(),
          registrationCompletedAt: new Date(),
          registrationMethod: 'new_registration',
          stepData: {},
          completionPercentage: 0,
        };
        setOnboardingStatus(fallbackStatus);
      }
    };

    loadOnboardingStatus();
  }, [companyId, user, initialStep]);

  // Auto-save functionality - DEAKTIVIERT wegen Performance-Problemen
  // Stattdessen: Manuelles Speichern nur beim Step-Wechsel
  /*
  useEffect(() => {
    if (!user || !companyId || Object.keys(stepData).length === 0) return;
     const saveTimer = setTimeout(async () => {
      await saveCurrentStep();
    }, 3000); // Auto-save after 3 seconds like Stripe
     return () => clearTimeout(saveTimer);
  }, [stepData, companyId, user]);
  */

  // Validation functions
  const validateStep = useCallback((step: number, data: any): boolean => {
    const rules = stepValidationRules[step];
    if (!rules) return true;

    // Check required fields
    if (rules.required) {
      for (const field of rules.required) {
        const value = data[field];
        // Handle different data types properly
        if (value === null || value === undefined) {
          return false;
        }
        // For strings, empty string is invalid
        if (typeof value === 'string' && value === '') {
          return false;
        }
        // For arrays, empty array is invalid
        if (Array.isArray(value) && value.length === 0) {
          return false;
        }
        // For numbers and booleans, 0 and false are valid values
      }
    }

    // Check validators
    if (rules.validators) {
      for (const [field, validator] of Object.entries(rules.validators)) {
        if (data[field] && !validator(data[field])) {
          return false;
        }
      }
    }

    // Check minimum lengths (only for required fields or filled fields)
    if (rules.minLength) {
      for (const [field, minLength] of Object.entries(rules.minLength)) {
        // Only validate minLength if field is required or has content
        const isRequired = rules.required?.includes(field);
        const hasContent =
          data[field] &&
          (Array.isArray(data[field])
            ? data[field].length > 0
            : typeof data[field] === 'string'
              ? data[field].length > 0
              : true);

        if (isRequired || hasContent) {
          if (Array.isArray(data[field])) {
            if (data[field].length < minLength) return false;
          } else if (typeof data[field] === 'string') {
            if (data[field].length < minLength) return false;
          }
        }
      }
    }

    // Check conditional validators
    if (rules.conditional) {
      for (const [_field, validator] of Object.entries(rules.conditional)) {
        if (!validator(data)) {
          return false;
        }
      }
    }

    return true;
  }, []);

  const getStepCompletion = useCallback(
    (step: number): number => {
      const data = stepData[step] || {};
      const rules = stepValidationRules[step as keyof typeof stepValidationRules];

      if (!rules) return 0;

      const requiredFields = rules.required || [];

      // Erweiterte Validierung: berücksichtigt auch 0 als gültigen Wert und conditional fields
      const completedFields = requiredFields.filter(field => {
        const value = data[field];

        // Für Zahlen: 0 ist gültig
        if (typeof value === 'number') return true;

        // Für Booleans: false ist gültig
        if (typeof value === 'boolean') return true;

        // Für Strings: nicht leer
        if (typeof value === 'string') return value.length > 0;

        // Für Arrays: nicht leer
        if (Array.isArray(value)) return value.length > 0;

        // Andere Werte: truthy
        return !!value;
      });

      // Zusätzlich conditional fields überprüfen
      let conditionalFieldsValid = 0;
      let totalConditionalFields = 0;

      if (rules.conditional) {
        for (const [field, validator] of Object.entries(rules.conditional)) {
          totalConditionalFields++;
          if (validator(data)) {
            conditionalFieldsValid++;
          }
        }
      }

      const totalFields = requiredFields.length + totalConditionalFields;
      const completedTotal = completedFields.length + conditionalFieldsValid;

      return totalFields > 0 ? (completedTotal / totalFields) * 100 : 100;
    },
    [stepData]
  );

  const getOverallCompletion = useCallback((): number => {
    const stepCompletions = Array.from({ length: totalSteps }, (_, i) => getStepCompletion(i + 1));
    const overallCompletion =
      stepCompletions.reduce((sum, completion) => sum + completion, 0) / totalSteps;

    return overallCompletion;
  }, [getStepCompletion, totalSteps, stepData]);

  const canGoNext = useCallback((): boolean => {
    return validateStep(currentStep, stepData[currentStep] || {});
  }, [currentStep, stepData, validateStep]);

  const canGoBack = useCallback((): boolean => {
    return currentStep > 1;
  }, [currentStep]);

  const canJumpToStep = useCallback(
    (targetStep: number): boolean => {
      if (targetStep < 1 || targetStep > totalSteps) return false;

      // Can always go back to previous steps
      if (targetStep < currentStep) return true;

      // Can go to next step only if current is valid
      if (targetStep === currentStep + 1) {
        return canGoNext();
      }

      // Can't skip ahead
      return false;
    },
    [currentStep, totalSteps, canGoNext]
  );

  // OPTIMIZED: Helper function to serialize stepData for Firestore (prevent data bloat)
  const _serializeStepData = useCallback((data: Record<number, any>) => {
    const serialized: Record<string, any> = {};

    // Clear existing step data to prevent accumulation
    const stepKeys = ['step1', 'step2', 'step3', 'step4', 'step5'];
    stepKeys.forEach(key => {
      delete serialized[key];
    });

    Object.entries(data).forEach(([stepKey, stepValue]) => {
      if (stepValue && typeof stepValue === 'object') {
        const cleanStepData: Record<string, any> = {};

        Object.entries(stepValue).forEach(([key, value]) => {
          // Only include non-null, non-undefined values
          if (value !== undefined && value !== null && value !== '') {
            if (
              typeof value === 'string' ||
              typeof value === 'number' ||
              typeof value === 'boolean'
            ) {
              cleanStepData[key] = value;
            } else if (Array.isArray(value)) {
              // Filter out any non-serializable array items
              const cleanArray = value.filter(
                item =>
                  item !== null &&
                  item !== undefined &&
                  item !== '' &&
                  (typeof item === 'string' ||
                    typeof item === 'number' ||
                    typeof item === 'boolean')
              );
              if (cleanArray.length > 0) {
                cleanStepData[key] = cleanArray;
              }
            } else if (typeof value === 'object' && !Array.isArray(value)) {
              // For objects, recursively clean them
              const cleanObject: Record<string, any> = {};
              Object.entries(value).forEach(([objKey, objValue]) => {
                if (
                  objValue !== null &&
                  objValue !== undefined &&
                  objValue !== '' &&
                  (typeof objValue === 'string' ||
                    typeof objValue === 'number' ||
                    typeof objValue === 'boolean')
                ) {
                  cleanObject[objKey] = objValue;
                }
              });
              if (Object.keys(cleanObject).length > 0) {
                cleanStepData[key] = cleanObject;
              }
            }
          }
        });

        if (Object.keys(cleanStepData).length > 0) {
          serialized[`step${stepKey}`] = cleanStepData;
        }
      }
    });

    return serialized;
  }, []);

  // Rate-limiting für saveCurrentStep
  const [lastSaveTime, setLastSaveTime] = useState(0);
  const SAVE_THROTTLE_MS = 2000; // Minimum 2 Sekunden zwischen Saves

  const saveCurrentStep = useCallback(async (): Promise<void> => {
    if (!user || !companyId) return;

    const now = Date.now();
    if (now - lastSaveTime < SAVE_THROTTLE_MS) {
      return;
    }

    // DEBUG: Stack trace to see what's calling this

    try {
      setLastSaveTime(now);
      setIsSaving(true);

      // 🔧 SAUBERE TRENNUNG: Speichere in companies collection
      const companyUpdates: any = {
        onboardingCurrentStep: String(currentStep),
        onboardingLastSaved: serverTimestamp(),
      };

      // Nur aktuellen Step-Data speichern
      if (stepData[currentStep]) {
        companyUpdates[`step${currentStep}`] = stepData[currentStep];
      }

      const companyDocRef = doc(db, 'companies', companyId);
      await updateDoc(companyDocRef, companyUpdates);

      setLastSaved(new Date());
    } catch (error) {
    } finally {
      setIsSaving(false);
    }
  }, [user, companyId, currentStep, stepData, lastSaveTime]);

  const goToStep = useCallback(
    (step: number): void => {
      if (canJumpToStep(step)) {
        setCurrentStep(step);
      }
    },
    [canJumpToStep]
  );

  const submitOnboarding = useCallback(async (): Promise<void> => {
    console.log('[submitOnboarding] Start', { user: user?.uid, companyId });
    
    if (!user || !companyId) {
      console.error('[submitOnboarding] Fehler: user oder companyId fehlt', { user: !!user, companyId });
      throw new Error('User oder CompanyId fehlt');
    }

    try {
      console.log('[submitOnboarding] Lade Company-Dokument...');
      // 🔧 SAUBERE TRENNUNG: Alle Onboarding-Daten in companies collection
      const companyDocRef = doc(db, 'companies', companyId);
      const companyDocSnap = await getDoc(companyDocRef);
      const existingCompanyData = companyDocSnap.exists() ? companyDocSnap.data() : {};
      console.log('[submitOnboarding] Company-Dokument geladen:', { exists: companyDocSnap.exists() });

      // Alle Onboarding-Daten gehen in companies collection
      const companyUpdates: any = {};

      // Step 1: Erweiterte Unternehmensdaten
      if (stepData[1]?.businessType) companyUpdates.businessType = String(stepData[1].businessType);
      if (stepData[1]?.employees) companyUpdates.employees = String(stepData[1].employees);
      if (stepData[1]?.website) companyUpdates.website = String(stepData[1].website);
      if (stepData[1]?.description) companyUpdates.description = String(stepData[1].description);

      // Manager Zusatzdaten
      if (stepData[1]?.managerData?.position) {
        companyUpdates.managerPosition = String(stepData[1].managerData.position);
      }
      if (stepData[1]?.managerData?.nationality) {
        companyUpdates.managerNationality = String(stepData[1].managerData.nationality);
      }

      // Step 2: Steuerliche Zusatzeinstellungen
      if (stepData[2]?.kleinunternehmer)
        companyUpdates.kleinunternehmer = String(stepData[2].kleinunternehmer);
      if (stepData[2]?.profitMethod) companyUpdates.profitMethod = String(stepData[2].profitMethod);
      if (stepData[2]?.priceInput) companyUpdates.priceInput = String(stepData[2].priceInput);
      if (stepData[2]?.taxRate) companyUpdates.taxRate = String(stepData[2].taxRate);

      // Step 3: Profil & Service-Details
      if (stepData[3]?.companyLogo) companyUpdates.companyLogo = String(stepData[3].companyLogo);
      if (stepData[3]?.profileBannerImage)
        companyUpdates.profileBannerImage = String(stepData[3].profileBannerImage);
      if (stepData[3]?.publicDescription)
        companyUpdates.publicDescription = String(stepData[3].publicDescription);
      if (stepData[3]?.instantBooking !== undefined)
        companyUpdates.instantBooking = Boolean(stepData[3].instantBooking);
      if (stepData[3]?.responseTimeGuarantee)
        companyUpdates.responseTimeGuarantee = Number(stepData[3].responseTimeGuarantee);
      if (Array.isArray(stepData[3]?.skills) && stepData[3].skills.length > 0) {
        companyUpdates.skills = stepData[3].skills;
      }
      if (Array.isArray(stepData[3]?.specialties) && stepData[3].specialties.length > 0) {
        companyUpdates.specialties = stepData[3].specialties;
      }
      if (Array.isArray(stepData[3]?.languages) && stepData[3].languages.length > 0) {
        companyUpdates.languages = stepData[3].languages;
      }
      if (Array.isArray(stepData[3]?.servicePackages) && stepData[3].servicePackages.length > 0) {
        companyUpdates.servicePackages = stepData[3].servicePackages;
      }
      if (Array.isArray(stepData[3]?.portfolio) && stepData[3].portfolio.length > 0) {
        companyUpdates.portfolio = stepData[3].portfolio;
      }
      if (Array.isArray(stepData[3]?.faqs) && stepData[3].faqs.length > 0) {
        companyUpdates.faqs = stepData[3].faqs;
      }

      // Step 4: Service-Bereich & Verfügbarkeit
      if (Array.isArray(stepData[4]?.serviceAreas) && stepData[4].serviceAreas.length > 0) {
        companyUpdates.serviceAreas = stepData[4].serviceAreas;
      }
      if (stepData[4]?.availabilityType)
        companyUpdates.availabilityType = String(stepData[4].availabilityType);
      if (stepData[4]?.advanceBookingHours)
        companyUpdates.advanceBookingHours = Number(stepData[4].advanceBookingHours);
      if (stepData[4]?.travelCosts !== undefined)
        companyUpdates.travelCosts = Boolean(stepData[4].travelCosts);
      if (stepData[4]?.travelCostPerKm)
        companyUpdates.travelCostPerKm = Number(stepData[4].travelCostPerKm);
      if (stepData[4]?.maxTravelDistance)
        companyUpdates.maxTravelDistance = Number(stepData[4].maxTravelDistance);

      // Step 5: E-Mail-Verbindung
      if (stepData[5]?.emailType) companyUpdates.emailType = String(stepData[5].emailType);
      if (stepData[5]?.gmailConnected !== undefined)
        companyUpdates.gmailConnected = Boolean(stepData[5].gmailConnected);
      if (stepData[5]?.gmailEmail) companyUpdates.gmailEmail = String(stepData[5].gmailEmail);
      if (stepData[5]?.taskiloEmailConnected !== undefined)
        companyUpdates.taskiloEmailConnected = Boolean(stepData[5].taskiloEmailConnected);
      if (stepData[5]?.taskiloEmail) companyUpdates.taskiloEmail = String(stepData[5].taskiloEmail);

      // Step 6: Finale Bestätigung
      if (stepData[6]?.documentsCompleted !== undefined)
        companyUpdates.documentsCompleted = Boolean(stepData[6].documentsCompleted);

      // Onboarding completion metadata
      companyUpdates.onboardingCompleted = true;
      companyUpdates.onboardingCompletedAt = serverTimestamp();
      companyUpdates.onboardingCompletionPercentage = 100;
      companyUpdates.onboardingCurrentStep = 'completed';
      companyUpdates.profileComplete = true;
      companyUpdates.profileStatus = 'pending_review';

      // Helper: Entferne undefined Werte aus Objekten (Firestore erlaubt keine undefined)
      const removeUndefined = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (Array.isArray(obj)) return obj.map(removeUndefined).filter(v => v !== undefined);
        if (typeof obj === 'object') {
          const cleaned: any = {};
          for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
              cleaned[key] = removeUndefined(value);
            }
          }
          return cleaned;
        }
        return obj;
      };

      // Step structures für Functions - mit undefined-Bereinigung
      if (stepData[1]) companyUpdates.step1 = removeUndefined(stepData[1]);
      if (stepData[2]) companyUpdates.step2 = removeUndefined(stepData[2]);
      if (stepData[3]) companyUpdates.step3 = removeUndefined(stepData[3]);
      if (stepData[4]) companyUpdates.step4 = removeUndefined(stepData[4]);
      if (stepData[5]) companyUpdates.step5 = removeUndefined(stepData[5]);
      if (stepData[6]) companyUpdates.step6 = removeUndefined(stepData[6]);

      // Update companies document mit allen Onboarding-Daten
      console.log('[submitOnboarding] Speichere Updates...', { 
        updateKeys: Object.keys(companyUpdates),
        hasStep6: !!companyUpdates.step6,
        documentsCompleted: companyUpdates.documentsCompleted
      });

      await updateDoc(companyDocRef, companyUpdates);
      console.log('[submitOnboarding] Updates gespeichert!');

      // Create default payment accounts (Kasse und Basiskonto)
      try {
        const { PaymentAccountService } = await import('@/services/paymentAccountService');
        await PaymentAccountService.createDefaultAccounts(companyId);
      } catch (error) {
        console.error('Error creating default payment accounts:', error);
        // Don't fail onboarding if payment accounts creation fails
      }

      // Sync mit Hetzner Webmail wenn taskiloEmail vorhanden
      // Dies synchronisiert Firebase-Daten → Hetzner und holt die verifizierte Telefonnummer zurück
      const taskiloEmail = stepData[5]?.taskiloEmail || existingCompanyData?.taskiloEmail;
      if (taskiloEmail && taskiloEmail.endsWith('@taskilo.de')) {
        try {
          console.log('[submitOnboarding] Starte Webmail-Profil-Sync für:', taskiloEmail);
          const { WebmailProfileSyncService } = await import('@/services/webmail/WebmailProfileSyncService');
          
          // Contact Person Daten aus step2
          const contactPerson = existingCompanyData?.step2?.contactPerson || {};
          
          // Sammle Company-Daten für den Sync (mit allen möglichen Feldnamen)
          const companyDataForSync = {
            companyId,
            companyName: existingCompanyData?.companyName || existingCompanyData?.name || '',
            street: existingCompanyData?.companyStreet || existingCompanyData?.street || '',
            houseNumber: existingCompanyData?.companyHouseNumber || existingCompanyData?.houseNumber || '',
            zip: existingCompanyData?.companyPostalCode || existingCompanyData?.postalCode || existingCompanyData?.zip || '',
            city: existingCompanyData?.companyCity || existingCompanyData?.city || '',
            country: existingCompanyData?.companyCountry || existingCompanyData?.country || 'DE',
            vatId: existingCompanyData?.vatId || '',
            taxNumber: existingCompanyData?.taxNumber || '',
            phone: existingCompanyData?.phone || existingCompanyData?.phoneNumber || existingCompanyData?.companyPhoneNumber || '',
            website: existingCompanyData?.companyWebsite || existingCompanyData?.website || '',
            legalForm: existingCompanyData?.legalForm || '',
            // Zusätzliche Felder
            iban: existingCompanyData?.iban || '',
            bic: existingCompanyData?.bic || '',
            bankName: existingCompanyData?.bankName || '',
            industry: existingCompanyData?.industry || existingCompanyData?.selectedCategory || '',
            accountHolder: existingCompanyData?.accountHolder || '',
            // Contact Person - Vor- und Nachname
            firstName: contactPerson.firstName || existingCompanyData?.firstName || '',
            lastName: contactPerson.lastName || existingCompanyData?.lastName || '',
          };

          const syncResult = await WebmailProfileSyncService.syncCompanyWithWebmail(
            taskiloEmail,
            companyDataForSync
          );

          // Wenn die verifizierte Telefonnummer zurückkommt, überschreibe Firebase-Telefonnummer
          if (syncResult.success && syncResult.verifiedPhone && syncResult.phoneVerified) {
            console.log('[submitOnboarding] Verifizierte Telefonnummer aus Webmail:', syncResult.verifiedPhone);
            await updateDoc(companyDocRef, {
              phone: syncResult.verifiedPhone,
              phoneNumber: syncResult.verifiedPhone,
              phoneVerifiedFromWebmail: true,
              phoneVerifiedAt: serverTimestamp(),
            });
            console.log('[submitOnboarding] Firebase Telefonnummer aktualisiert mit verifizierter Nummer');
          }
        } catch (syncError) {
          console.error('[submitOnboarding] Webmail-Sync fehlgeschlagen:', syncError);
          // Sync-Fehler sollen das Onboarding nicht abbrechen
        }
      }

      // SUCCESS: Onboarding abgeschlossen - companies-only architecture

      // Set cookies for middleware

      document.cookie = `taskilo_onboarding_complete=true; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Strict`;
      document.cookie = `taskilo_profile_status=pending_review; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Strict`;
      
      console.log('[submitOnboarding] Cookies gesetzt, Onboarding erfolgreich abgeschlossen!');
      // Update onboarding status
    } catch (error) {
      console.error('[submitOnboarding] FEHLER:', error);
      throw error;
    }
  }, [user, companyId, stepData]);

  // Helper functions
  const isStepCompleted = useCallback(
    (step: number): boolean => {
      const rules = stepValidationRules[step];
      if (!rules || !stepData[step]) return false;

      const data = stepData[step];

      // Check required fields
      if (rules.required) {
        for (const field of rules.required) {
          if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
            return false;
          }
        }
      }

      // Check validators
      if (rules.validators) {
        for (const [field, validator] of Object.entries(rules.validators)) {
          if (!validator(data[field])) {
            return false;
          }
        }
      }

      return true;
    },
    [stepData]
  );

  const updateStepData = useCallback((step: number, data: any) => {
    // DEBUG: Stack trace to see what's calling this
    // Nur lokal speichern, NICHT in Firestore!
    setStepData(prev => ({
      ...prev,
      [step]: { ...prev[step], ...data },
    }));
  }, []);

  const value: OnboardingContextType = {
    // Current State
    currentStep,
    totalSteps,
    completionPercentage: getOverallCompletion(),

    // Navigation Control
    canGoNext,
    canGoBack,
    canJumpToStep,

    // Data Management
    stepData,
    allStepsValid: getOverallCompletion() === 100,

    // Auto-Save
    autoSaveEnabled: true,
    lastSaved,
    isSaving,

    // Onboarding Management
    onboardingStatus,
    stepsData: onboardingSteps.map(step => ({
      step: step.step,
      title: step.title,
      description: step.description,
      isRequired: step.isRequired,
      estimatedTime: step.estimatedTime,
      isCompleted: isStepCompleted(step.step),
      isOptional: !step.isRequired,
    })),

    // Progress Tracking
    getStepCompletion,
    getOverallCompletion,

    // Actions
    goToStep,
    goToNextStep: (skipValidation?: boolean) => {
      if (skipValidation || canGoNext()) {
        setCurrentStep(prev => Math.min(prev + 1, onboardingSteps.length));
      }
    },
    goToPreviousStep: () => {
      if (canGoBack()) {
        setCurrentStep(prev => Math.max(prev - 1, 1));
      }
    },
    updateStepData,
    saveCurrentStep,
    submitOnboarding,
    startOnboarding: () => {
      setCurrentStep(1);
      if (onboardingStatus) {
        setOnboardingStatus({
          ...onboardingStatus,
          status: 'in_progress',
        });
      }
    },
    completeOnboarding: async () => {
      await submitOnboarding();
    },
    resetOnboarding: () => {
      setCurrentStep(1);
      setStepData({});
      if (onboardingStatus) {
        setOnboardingStatus({
          ...onboardingStatus,
          status: 'pending_onboarding',
          completionPercentage: 0,
        });
      }
    },
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
};
