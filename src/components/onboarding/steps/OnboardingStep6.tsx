'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { 
  CheckCircle, 
  FileText, 
  Shield, 
  AlertCircle, 
  Building2, 
  Calculator, 
  Briefcase, 
  MapPin, 
  Clock,
  Zap,
  Users,
  Car,
  Loader2,
  PartyPopper,
  ArrowRight
} from 'lucide-react';
import { RequiredFieldIndicator } from '@/components/onboarding/RequiredFieldLabel';

// Step6Data Interface
interface Step6Data {
  documentsCompleted: boolean;
}

// Company Data Interface für Registrierungsdaten
interface CompanyData {
  companyName?: string;
  legalForm?: string;
  address?: {
    street?: string;
    zip?: string;
    city?: string;
    country?: string;
  };
  contactPerson?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  hourlyRate?: string;
  taxNumber?: string;
  vatId?: string;
  companyRegister?: string;
}

interface OnboardingStep6Props {
  companyUid?: string;
}

export default function OnboardingStep6({ companyUid }: OnboardingStep6Props) {
  const { 
    stepData, 
    updateStepData, 
    goToPreviousStep,
    saveCurrentStep,
    submitOnboarding 
  } = useOnboarding();
  const { user } = useAuth();

  const [step6Data, setStep6Data] = useState<Step6Data>(
    stepData[6] || {
      documentsCompleted: false,
    }
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);

  // Lade Company-Daten aus Firestore
  useEffect(() => {
    const loadCompanyData = async () => {
      const uid = companyUid || user?.uid;
      if (!uid) return;

      try {
        const companyDoc = await getDoc(doc(db, 'companies', uid));
        if (companyDoc.exists()) {
          const data = companyDoc.data();
          
          // Prüfe verschiedene mögliche Speicherorte für Adressdaten
          // 1. Direkt in address
          // 2. In step1.address (Onboarding-Format)
          // 3. Als Top-Level Felder
          const addressData = data.address || data.step1?.address || {
            street: data.street || data.step1?.address?.street,
            zip: data.zip || data.postalCode || data.step1?.address?.postalCode,
            city: data.city || data.step1?.address?.city,
            country: data.country || data.step1?.address?.country,
          };
          
          setCompanyData({
            companyName: data.companyName || data.name || data.step1?.companyName,
            legalForm: data.legalForm || data.step1?.legalForm,
            address: addressData,
            contactPerson: data.contactPerson || data.step2?.contactPerson,
            hourlyRate: data.hourlyRate,
            taxNumber: data.taxNumber,
            vatId: data.vatId,
            companyRegister: data.companyRegister || data.step1?.companyRegister,
          });
        }
      } catch {
        // Fehler beim Laden - ignorieren
      }
    };

    loadCompanyData();
  }, [companyUid, user?.uid]);

  const updateField = (field: keyof Step6Data, value: any) => {
    const newData = { ...step6Data, [field]: value };
    setStep6Data(newData);
    updateStepData(6, newData);
  };

  // Fehlende Felder aus vorherigen Schritten ermitteln
  const getMissingFields = (): string[] => {
    const missing: string[] = [];
    
    // Company-Daten validieren (aus Registrierung)
    if (!companyData?.companyName) missing.push('Unternehmensname');
    if (!companyData?.legalForm) missing.push('Rechtsform');
    // Stadt ist bei Registrierung Pflicht, aber Service-Gebiete in Step 4 sind optional
    // Daher hier keine Stadt-Validierung

    // Step 2 validieren - Steuerliche Einstellungen
    const step2 = stepData[2];
    if (!step2?.kleinunternehmer) missing.push('Kleinunternehmer-Status');

    // Step 3 validieren
    const step3 = stepData[3];
    if (!step3?.skills || step3.skills.length === 0) missing.push('Mindestens eine Fähigkeit');

    // Step 4 validieren - Service-Gebiete sind optional, nur Verfügbarkeitstyp ist Pflicht
    const step4 = stepData[4];
    if (!step4?.availabilityType) missing.push('Verfügbarkeitstyp');

    return missing;
  };

  // Gesamtkompletion berechnen
  const getOverallCompletion = (): number => {
    const totalFields = 10; // Geschätzte Anzahl wichtiger Felder
    const missingCount = getMissingFields().length;
    return Math.max(0, ((totalFields - missingCount) / totalFields) * 100);
  };

  // Online/Offline Status überwachen
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    // Initial check
    setIsOffline(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const missingFields = getMissingFields();
  const completionPercentage = Math.round(getOverallCompletion());
  const canComplete = missingFields.length === 0 && step6Data.documentsCompleted;

  // Validierungsstatus prüfen
  const isValidForNext = () => {
    return canComplete;
  };

  const getValidationMessage = () => {
    if (!step6Data.documentsCompleted) {
      return "Bestätigung dass alle Dokumente vollständig sind ist erforderlich";
    }
    if (missingFields.length > 0) {
      return `Fehlende Felder in vorherigen Schritten: ${missingFields.join(', ')}`;
    }
    return null;
  };

  // Debugging für Completion-Berechnung

  const handleSubmit = async () => {
    console.log('[Step6] handleSubmit gestartet', { canComplete, isOffline, user: user?.uid });
    
    if (!canComplete || isOffline) {
      console.log('[Step6] Abbruch:', { canComplete, isOffline });
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      console.log('[Step6] Speichere aktuellen Step...');
      // Erst aktuellen Step speichern
      await saveCurrentStep();
      console.log('[Step6] Step gespeichert, starte submitOnboarding...');
      // Dann Onboarding abschließen
      await submitOnboarding();
      console.log('[Step6] submitOnboarding erfolgreich!');

      // CRITICAL FIX: Erfolgreiche Weiterleitung zum Company Dashboard

      setIsCompleted(true);

      // Kurze Verzögerung für UI-Feedback
      setTimeout(() => {
        window.location.href = `/dashboard/company/${user?.uid}?onboarding=completed`;
      }, 1500);
    } catch (error) {
      // Erweiterte Fehlerbehandlung für Netzwerkprobleme
      if (error instanceof Error && error.message.includes('network')) {
        setSubmitError(
          'Netzwerkfehler: Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.'
        );
      } else if (error instanceof Error && error.message.includes('Firebase')) {
        setSubmitError(
          'Verbindungsfehler zum Server. Bitte versuchen Sie es in einem Moment erneut.'
        );
      } else {
        setSubmitError('Unerwarteter Fehler beim Abschließen. Bitte versuchen Sie es erneut.');
      }

      setIsSubmitting(false);
      setIsCompleted(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header mit Confetti-Style bei Erfolg */}
      <div className="text-center mb-8">
        {isCompleted ? (
          <div className="animate-pulse">
            <PartyPopper className="h-16 w-16 text-[#14ad9f] mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-[#14ad9f] mb-2">Onboarding abgeschlossen!</h1>
            <p className="text-gray-600">Sie werden zum Dashboard weitergeleitet...</p>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 bg-[#14ad9f]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-[#14ad9f]" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Abschluss & Finalisierung</h1>
            <p className="text-gray-600 max-w-lg mx-auto">
              Überprüfen Sie Ihre Angaben und schließen Sie das Onboarding ab, um Ihr Profil zu aktivieren
            </p>
          </>
        )}
      </div>

      {/* Required Fields Indicator */}
      <RequiredFieldIndicator />

      <div className="space-y-6">
        {/* Submit-Fehleranzeige */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">Fehler beim Abschließen</h4>
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          </div>
        )}

        {/* Offline-Warnung */}
        {isOffline && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800">Keine Internetverbindung</h4>
              <p className="text-sm text-amber-700">
                Bitte stellen Sie eine Internetverbindung her, um das Onboarding abzuschließen.
              </p>
            </div>
          </div>
        )}

        {/* Fortschrittsanzeige - Premium Design */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-xl">
          {/* Hintergrund-Dekoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#14ad9f]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative p-8">
            {/* Header mit Icon und Prozent */}
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  completionPercentage >= 100 
                    ? 'bg-[#14ad9f]/20' 
                    : 'bg-[#14ad9f]/10'
                }`}>
                  {completionPercentage >= 100 ? (
                    <CheckCircle className="h-7 w-7 text-[#14ad9f]" />
                  ) : (
                    <Zap className="h-7 w-7 text-[#14ad9f]" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Ihr Fortschritt</h3>
                  <p className="text-sm text-gray-500">
                    {completionPercentage >= 100 
                      ? 'Bereit zur Aktivierung' 
                      : 'Fast geschafft!'}
                  </p>
                </div>
              </div>
              
              {/* Kreisförmiger Fortschritt */}
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#e5e7eb"
                    strokeWidth="6"
                    fill="none"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#14ad9f"
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - completionPercentage / 100)}`}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-[#14ad9f]">
                    {Math.round(completionPercentage)}%
                  </span>
                </div>
              </div>
            </div>
            
            {/* Fortschrittsbalken */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Onboarding-Status</span>
                <span className="font-medium text-[#14ad9f]">
                  {completionPercentage >= 100 ? 'Vollständig' : `${Math.round(completionPercentage)}% abgeschlossen`}
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out bg-linear-to-r from-[#14ad9f] to-teal-400"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
            
            {/* Status-Badges */}
            <div className="flex flex-wrap gap-3">
              {completionPercentage >= 100 ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#14ad9f]/10 border border-[#14ad9f]/30 rounded-xl">
                  <CheckCircle className="h-5 w-5 text-[#14ad9f]" />
                  <span className="font-medium text-[#14ad9f]">Alle Schritte abgeschlossen!</span>
                </div>
              ) : (
                <>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <span className="font-medium text-amber-700">{missingFields.length} Felder fehlen</span>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Fehlende Felder - Footer */}
          {missingFields.length > 0 && (
            <div className="border-t border-gray-100 bg-gray-50/50 px-8 py-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Bitte vervollständigen Sie:</p>
              <div className="flex flex-wrap gap-2">
                {missingFields.map((field, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 shadow-sm"
                  >
                    {field}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Übersicht der eingegebenen Daten - Grid Layout */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#14ad9f]" />
              Übersicht Ihrer Angaben
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Unternehmen - aus Company-Daten */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-[#14ad9f]/10 rounded-lg flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-[#14ad9f]" />
                  </div>
                  <h4 className="font-semibold text-gray-900">Unternehmen</h4>
                  {(companyData?.companyName || companyData?.legalForm) && (
                    <CheckCircle className="h-4 w-4 text-[#14ad9f] ml-auto" />
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  {companyData?.companyName && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Name:</span>
                      <span className="font-medium text-gray-900 truncate max-w-[150px]">{companyData.companyName}</span>
                    </div>
                  )}
                  {companyData?.legalForm && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Rechtsform:</span>
                      <span className="font-medium text-gray-900">{companyData.legalForm}</span>
                    </div>
                  )}
                  {companyData?.address?.city && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Standort:</span>
                      <span className="font-medium text-gray-900">
                        {companyData.address.zip} {companyData.address.city}
                      </span>
                    </div>
                  )}
                  {companyData?.hourlyRate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Stundenpreis:</span>
                      <span className="font-medium text-gray-900">{companyData.hourlyRate} EUR/h</span>
                    </div>
                  )}
                  {(companyData?.taxNumber || companyData?.vatId || companyData?.companyRegister) && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Steuer-ID:</span>
                      <span className="font-medium text-[#14ad9f]">Vorhanden</span>
                    </div>
                  )}
                  {!companyData?.companyName && !companyData?.legalForm && (
                    <p className="text-gray-400 italic">Wird geladen...</p>
                  )}
                </div>
              </div>

              {/* Step 2 - Steuerliche Einstellungen */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-[#14ad9f]/10 rounded-lg flex items-center justify-center">
                    <Calculator className="h-4 w-4 text-[#14ad9f]" />
                  </div>
                  <h4 className="font-semibold text-gray-900">Steuern</h4>
                  {stepData[2]?.kleinunternehmer && (
                    <CheckCircle className="h-4 w-4 text-[#14ad9f] ml-auto" />
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  {stepData[2]?.kleinunternehmer && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Kleinunternehmer:</span>
                      <span className={`font-medium px-2 py-0.5 rounded ${
                        stepData[2].kleinunternehmer === 'ja' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {stepData[2].kleinunternehmer === 'ja' ? 'Ja' : 'Nein'}
                      </span>
                    </div>
                  )}
                  {stepData[2]?.profitMethod && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Gewinnermittlung:</span>
                      <span className="font-medium text-gray-900">
                        {stepData[2].profitMethod === 'euer' ? 'EÜR' : 'Bilanz'}
                      </span>
                    </div>
                  )}
                  {stepData[2]?.priceInput && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Preiseingabe:</span>
                      <span className="font-medium text-gray-900">
                        {stepData[2].priceInput === 'brutto' ? 'Brutto' : 'Netto'}
                      </span>
                    </div>
                  )}
                  {!stepData[2]?.kleinunternehmer && (
                    <p className="text-gray-400 italic">Noch nicht ausgefüllt</p>
                  )}
                </div>
              </div>

              {/* Step 3 - Profil & Skills */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-[#14ad9f]/10 rounded-lg flex items-center justify-center">
                    <Briefcase className="h-4 w-4 text-[#14ad9f]" />
                  </div>
                  <h4 className="font-semibold text-gray-900">Profil</h4>
                  {stepData[3]?.skills && stepData[3].skills.length > 0 && (
                    <CheckCircle className="h-4 w-4 text-[#14ad9f] ml-auto" />
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  {stepData[3]?.skills && stepData[3].skills.length > 0 && (
                    <div>
                      <span className="text-gray-500">Fähigkeiten:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {stepData[3].skills.slice(0, 3).map((skill: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-[#14ad9f]/10 text-[#14ad9f] rounded text-xs font-medium">
                            {skill}
                          </span>
                        ))}
                        {stepData[3].skills.length > 3 && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs font-medium">
                            +{stepData[3].skills.length - 3} mehr
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {stepData[3]?.languages && stepData[3].languages.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Sprachen:</span>
                      <span className="font-medium text-gray-900">{stepData[3].languages.length}</span>
                    </div>
                  )}
                  {(!stepData[3]?.skills || stepData[3].skills.length === 0) && (
                    <p className="text-gray-400 italic">Noch nicht ausgefüllt</p>
                  )}
                </div>
              </div>

              {/* Step 4 - Verfügbarkeit */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-[#14ad9f]/10 rounded-lg flex items-center justify-center">
                    <Clock className="h-4 w-4 text-[#14ad9f]" />
                  </div>
                  <h4 className="font-semibold text-gray-900">Verfügbarkeit</h4>
                  {stepData[4]?.availabilityType && (
                    <CheckCircle className="h-4 w-4 text-[#14ad9f] ml-auto" />
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  {stepData[4]?.availabilityType && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Typ:</span>
                      <span className="inline-flex items-center gap-1 font-medium text-gray-900">
                        {stepData[4].availabilityType === 'flexible' && <Zap className="h-3 w-3" />}
                        {stepData[4].availabilityType === 'fixed' && <Users className="h-3 w-3" />}
                        {stepData[4].availabilityType === 'on-demand' && <Clock className="h-3 w-3" />}
                        {stepData[4].availabilityType === 'flexible' ? 'Flexibel' : 
                         stepData[4].availabilityType === 'fixed' ? 'Feste Zeiten' : 'Auf Abruf'}
                      </span>
                    </div>
                  )}
                  {stepData[4]?.advanceBookingHours && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Vorlaufzeit:</span>
                      <span className="font-medium text-gray-900">
                        {stepData[4].advanceBookingHours >= 24 
                          ? `${Math.floor(stepData[4].advanceBookingHours / 24)} Tag(e)`
                          : `${stepData[4].advanceBookingHours} Std.`}
                      </span>
                    </div>
                  )}
                  {stepData[4]?.maxTravelDistance && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Einsatzradius:</span>
                      <span className="inline-flex items-center gap-1 font-medium text-gray-900">
                        <Car className="h-3 w-3" />
                        {stepData[4].maxTravelDistance} km
                      </span>
                    </div>
                  )}
                  {stepData[4]?.serviceAreas && stepData[4].serviceAreas.length > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Gebiete:</span>
                      <span className="inline-flex items-center gap-1 font-medium text-gray-900">
                        <MapPin className="h-3 w-3" />
                        {stepData[4].serviceAreas.length} definiert
                      </span>
                    </div>
                  )}
                  {!stepData[4]?.availabilityType && (
                    <p className="text-gray-400 italic">Noch nicht ausgefüllt</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Finale Bestätigung - Modern */}
        <Card className="border-2 border-[#14ad9f]/20">
          <CardHeader className="bg-[#14ad9f]/5">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#14ad9f]" />
              Finale Bestätigung
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-[#14ad9f]/10 rounded-xl flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-[#14ad9f]" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">Dokumentenvollständigkeit</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Bitte bestätigen Sie, dass alle Ihre Angaben vollständig und korrekt sind. 
                  Nach dem Abschluss wird Ihr Profil zur Überprüfung eingereicht.
                </p>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <Checkbox
                    id="documentsCompleted"
                    checked={step6Data.documentsCompleted}
                    onCheckedChange={checked => updateField('documentsCompleted', checked)}
                    className="mt-0.5"
                  />
                  <span className="text-sm font-medium text-gray-900 group-hover:text-[#14ad9f] transition-colors">
                    Ich bestätige, dass alle Dokumente und Angaben vollständig und korrekt sind *
                  </span>
                </label>
              </div>
            </div>

            {canComplete && (
              <div className="bg-[#14ad9f]/10 border border-[#14ad9f]/30 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#14ad9f]/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-[#14ad9f]" />
                </div>
                <div>
                  <h4 className="font-medium text-[#14ad9f]">Bereit zum Abschluss!</h4>
                  <p className="text-sm text-teal-700">Sie können Ihr Onboarding jetzt finalisieren.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nächste Schritte - Timeline Design */}
        <Card className="bg-linear-to-br from-gray-50 to-white">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-lg text-gray-900 mb-6">Was passiert als Nächstes?</h3>
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
              
              <div className="space-y-6">
                <div className="relative flex items-start gap-4">
                  <div className="relative z-10 w-10 h-10 bg-[#14ad9f] rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    1
                  </div>
                  <div className="flex-1 pt-1">
                    <h4 className="font-semibold text-gray-900">Profil-Überprüfung</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Unser Team überprüft Ihre Angaben innerhalb von 24 Stunden
                    </p>
                  </div>
                </div>
                
                <div className="relative flex items-start gap-4">
                  <div className="relative z-10 w-10 h-10 bg-[#14ad9f] rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    2
                  </div>
                  <div className="flex-1 pt-1">
                    <h4 className="font-semibold text-gray-900">Freischaltung</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Bei erfolgreicher Prüfung wird Ihr Profil aktiviert - Sie erhalten eine E-Mail
                    </p>
                  </div>
                </div>
                
                <div className="relative flex items-start gap-4">
                  <div className="relative z-10 w-10 h-10 bg-[#14ad9f] rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    3
                  </div>
                  <div className="flex-1 pt-1">
                    <h4 className="font-semibold text-gray-900">Los geht&apos;s!</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Sie können Aufträge annehmen und Ihre Services anbieten
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation Message */}
      {!isValidForNext() && !isCompleted && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800">Onboarding kann nicht abgeschlossen werden</h4>
            <p className="text-sm text-amber-700">{getValidationMessage()}</p>
          </div>
        </div>
      )}

      {/* Navigation - Modern */}
      <div className="flex justify-between pt-6">
        <Button
          variant="outline"
          onClick={goToPreviousStep}
          disabled={isSubmitting}
          className="px-6 h-12"
        >
          Zurück
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canComplete || isSubmitting || isOffline}
          className={`px-8 h-12 text-base font-semibold ${
            canComplete && !isOffline
              ? 'bg-linear-to-r from-[#14ad9f] to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {isCompleted ? 'Erfolgreich! Weiterleitung...' : 'Wird abgeschlossen...'}
            </div>
          ) : isOffline ? (
            <span className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Offline
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Onboarding abschließen
              <ArrowRight className="h-5 w-5" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
