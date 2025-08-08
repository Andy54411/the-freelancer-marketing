'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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

  // Load onboarding status
  useEffect(() => {
    const loadOnboardingStatus = async () => {
      if (!companyId || !user) return;

      try {
        const onboardingDoc = await getDoc(doc(db, 'companies', companyId, 'onboarding', 'status'));
        if (onboardingDoc.exists()) {
          const data = onboardingDoc.data() as CompanyOnboardingStatus;
          setOnboardingStatus(data);
          setStepData(data.stepData || {});
          // Set current step based on saved progress or initialStep
          const stepNumber = initialStep || parseInt(data.currentStep) || 1;
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

          await setDoc(doc(db, 'companies', companyId, 'onboarding', 'status'), {
            ...initialStatus,
            startedAt: serverTimestamp(),
            registrationCompletedAt: serverTimestamp(),
          });

          setOnboardingStatus(initialStatus);
        }
      } catch (error) {
        console.error('Error loading onboarding status:', error);
      }
    };

    loadOnboardingStatus();
  }, [companyId, user]);

  // Auto-save functionality (Stripe-style)
  useEffect(() => {
    if (!user || !companyId || Object.keys(stepData).length === 0) return;

    const saveTimer = setTimeout(async () => {
      await saveCurrentStep();
    }, 3000); // Auto-save after 3 seconds like Stripe

    return () => clearTimeout(saveTimer);
  }, [stepData, companyId, user]);

  // Validation functions
  const validateStep = useCallback((step: number, data: any): boolean => {
    const rules = stepValidationRules[step];
    if (!rules) return true;

    // Check required fields
    if (rules.required) {
      for (const field of rules.required) {
        if (!data[field] || data[field] === '') {
          return false;
        }
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

    return true;
  }, []);

  const getStepCompletion = useCallback(
    (step: number): number => {
      const data = stepData[step] || {};
      const rules = stepValidationRules[step as keyof typeof stepValidationRules];

      if (!rules) return 0;

      const requiredFields = rules.required || [];
      const completedFields = requiredFields.filter(field => data[field] && data[field] !== '');

      return requiredFields.length > 0 ? (completedFields.length / requiredFields.length) * 100 : 0;
    },
    [stepData]
  );

  const getOverallCompletion = useCallback((): number => {
    const stepCompletions = Array.from({ length: totalSteps }, (_, i) => getStepCompletion(i + 1));
    return stepCompletions.reduce((sum, completion) => sum + completion, 0) / totalSteps;
  }, [getStepCompletion, totalSteps]);

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

  // Helper function to serialize stepData for Firestore
  const serializeStepData = useCallback((data: Record<number, any>) => {
    const serialized: Record<string, any> = {};

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
              // Filter out any non-serializable array items and flatten
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
              // For objects, recursively clean them and flatten structure
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

    console.log('🔧 Serialized stepData:', serialized);
    return serialized;
  }, []);

  const saveCurrentStep = useCallback(async (): Promise<void> => {
    if (!user || !companyId) return;

    setIsSaving(true);
    try {
      const newStatus: CompanyOnboardingStatus['status'] =
        getOverallCompletion() === 100 ? 'completed' : 'in_progress';
      const serializedStepData = serializeStepData(stepData);

      const updatedStatus: CompanyOnboardingStatus = {
        ...onboardingStatus!,
        currentStep: currentStep.toString(),
        stepData: serializedStepData, // Use serialized data for status
        completionPercentage: getOverallCompletion(),
        status: newStatus,
      };

      await updateDoc(doc(db, 'companies', companyId, 'onboarding', 'status'), {
        currentStep: currentStep.toString(),
        stepData: serializedStepData, // Use only serialized data
        completionPercentage: getOverallCompletion(),
        status: newStatus,
        lastUpdated: serverTimestamp(),
      });

      setOnboardingStatus(updatedStatus);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving onboarding step:', error);
    } finally {
      setIsSaving(false);
    }
  }, [
    user,
    companyId,
    currentStep,
    stepData,
    onboardingStatus,
    getOverallCompletion,
    serializeStepData,
  ]);

  const goToStep = useCallback(
    (step: number): void => {
      if (canJumpToStep(step)) {
        setCurrentStep(step);
      }
    },
    [canJumpToStep]
  );

  const submitOnboarding = useCallback(async (): Promise<void> => {
    if (!user || !companyId) return;

    try {
      console.log('📝 Submitting onboarding with stepData:', stepData);

      // Prepare all onboarding data for final save - ensure all values are serializable
      const allOnboardingData = {
        // Step 1: Basic company info
        companyName: String(stepData[1]?.companyName || ''),
        businessType: String(stepData[1]?.businessType || ''),
        industry: String(stepData[1]?.industry || ''),
        address: String(stepData[1]?.address || ''),
        street: String(stepData[1]?.street || ''),
        city: String(stepData[1]?.city || ''),
        postalCode: String(stepData[1]?.postalCode || ''),
        country: String(stepData[1]?.country || 'DE'),
        phone: String(stepData[1]?.phone || ''),
        email: String(stepData[1]?.email || ''),
        legalForm: String(stepData[1]?.legalForm || ''),
        employees: String(stepData[1]?.employees || ''),
        website: String(stepData[1]?.website || ''),
        managerData: stepData[1]?.managerData
          ? {
              firstName: String(stepData[1].managerData.firstName || ''),
              lastName: String(stepData[1].managerData.lastName || ''),
              position: String(stepData[1].managerData.position || ''),
              email: String(stepData[1].managerData.email || ''),
              phone: String(stepData[1].managerData.phone || ''),
              dateOfBirth: String(stepData[1].managerData.dateOfBirth || ''),
              street: String(stepData[1].managerData.street || ''),
              city: String(stepData[1].managerData.city || ''),
              postalCode: String(stepData[1].managerData.postalCode || ''),
              country: String(stepData[1].managerData.country || 'DE'),
            }
          : null,

        // Step 2: Banking & Accounting
        kleinunternehmer: Boolean(stepData[2]?.kleinunternehmer),
        taxRate: Number(stepData[2]?.taxRate || 19),
        iban: String(stepData[2]?.iban || ''),
        accountHolder: String(stepData[2]?.accountHolder || ''),
        currency: String(stepData[2]?.currency || 'EUR'),

        // Step 3: Public Profile
        companyLogo: String(stepData[3]?.companyLogo || ''),
        profileBannerImage: String(stepData[3]?.profileBannerImage || ''),
        publicDescription: String(stepData[3]?.publicDescription || ''),
        hourlyRate: Number(stepData[3]?.hourlyRate || 0),
        skills: Array.isArray(stepData[3]?.skills) ? stepData[3].skills.map(String) : [],
        languages: Array.isArray(stepData[3]?.languages) ? stepData[3].languages.map(String) : [],
        specialties: Array.isArray(stepData[3]?.specialties)
          ? stepData[3].specialties.map(String)
          : [],
        servicePackages: Array.isArray(stepData[3]?.servicePackages)
          ? stepData[3].servicePackages
          : [],
        portfolio: Array.isArray(stepData[3]?.portfolio) ? stepData[3].portfolio : [],
        faqs: Array.isArray(stepData[3]?.faqs) ? stepData[3].faqs : [],

        // Step 4: Services & Categories
        selectedCategory: String(stepData[4]?.selectedCategory || ''),
        selectedSubcategory: String(stepData[4]?.selectedSubcategory || ''),
        additionalCategories: Array.isArray(stepData[4]?.additionalCategories)
          ? stepData[4].additionalCategories.map(String)
          : [],
        lat: Number(stepData[4]?.lat || 0),
        lng: Number(stepData[4]?.lng || 0),
        radiusKm: Number(stepData[4]?.radiusKm || 25),
        serviceAreas: Array.isArray(stepData[4]?.serviceAreas)
          ? stepData[4].serviceAreas.map(String)
          : [],
        availabilityType: String(stepData[4]?.availabilityType || 'flexible'),
        advanceBookingHours: Number(stepData[4]?.advanceBookingHours || 24),
        pricingModel: String(stepData[4]?.pricingModel || 'hourly'),
        basePrice: Number(stepData[4]?.basePrice || 0),
        travelCosts: Boolean(stepData[4]?.travelCosts),
        travelCostPerKm: Number(stepData[4]?.travelCostPerKm || 0),
        maxTravelDistance: Number(stepData[4]?.maxTravelDistance || 50),

        // Step 5: Final confirmation
        finalTermsAccepted: Boolean(stepData[5]?.finalTermsAccepted),

        // Onboarding completion metadata
        onboardingCompleted: true,
        onboardingCompletedAt: serverTimestamp(),
        profileComplete: true,
        profileStatus: 'pending_review',
      };

      console.log('💾 Saving allOnboardingData to users collection:', allOnboardingData);

      // Update main user document with ALL onboarding data
      await updateDoc(doc(db, 'users', user.uid), allOnboardingData);

      console.log('🏢 Updating company document with profile data...');
      // Update company document with onboarding completion AND profile data
      await updateDoc(doc(db, 'companies', companyId), {
        // Onboarding completion
        onboardingCompleted: true,
        onboardingCompletedAt: serverTimestamp(),
        profileComplete: true,

        // Profile data for immediate use
        companyName: allOnboardingData.companyName,
        city: allOnboardingData.city,
        country: allOnboardingData.country,
        street: allOnboardingData.street,
        postalCode: allOnboardingData.postalCode,
        phone: allOnboardingData.phone,
        email: allOnboardingData.email,
        publicDescription: allOnboardingData.publicDescription,
        hourlyRate: allOnboardingData.hourlyRate,
        selectedCategory: allOnboardingData.selectedCategory,
        selectedSubcategory: allOnboardingData.selectedSubcategory,
      });

      // Serialize stepData for onboarding status document
      const serializedStepData = serializeStepData(stepData);

      console.log('📊 Updating onboarding status document...');
      // Update onboarding status document
      await updateDoc(doc(db, 'companies', companyId, 'onboarding', 'status'), {
        status: 'completed',
        completedAt: serverTimestamp(),
        completionPercentage: 100,
        stepData: serializedStepData, // Save serialized step data for reference
      });

      console.log('✅ Onboarding completed successfully - all data saved to users collection');
    } catch (error) {
      console.error('Error submitting onboarding:', error);
      throw error;
    }
  }, [user, companyId, stepData, serializeStepData]);

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
    goToNextStep: () => {
      if (canGoNext()) {
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
