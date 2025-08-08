'use client';

import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { CheckCircle, AlertCircle, Edit3, Eye, FileText, Shield, Clock, Award } from 'lucide-react';

interface OnboardingStep5Props {
  companyUid: string;
}

const OnboardingStep5: React.FC<OnboardingStep5Props> = ({ companyUid }) => {
  const {
    stepData,
    stepsData,
    completionPercentage,
    goToStep,
    completeOnboarding,
    onboardingStatus,
    updateStepData,
  } = useOnboarding();
  const { user } = useAuth();
  const router = useRouter();
  const [allData, setAllData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [finalTermsAccepted, setFinalTermsAccepted] = useState(false);

  // Handle terms acceptance and save to stepData
  const handleTermsChange = (accepted: boolean) => {
    setFinalTermsAccepted(accepted);
    updateStepData(5, { finalTermsAccepted: accepted });
  };

  // Load all data for review
  useEffect(() => {
    const loadAllData = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setAllData({
            ...userData,
            ...stepData,
          });
        }

        // Load existing step 5 data
        if (stepData[5]?.finalTermsAccepted) {
          setFinalTermsAccepted(stepData[5].finalTermsAccepted);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [user, stepData]);

  const handleCompleteOnboarding = async () => {
    if (!finalTermsAccepted) {
      alert('Bitte bestätigen Sie die finalen Geschäftsbedingungen.');
      return;
    }

    setSubmitting(true);
    try {
      console.log('🚀 Starting onboarding completion...');
      await completeOnboarding();
      console.log('✅ Onboarding completed successfully');

      // Success - redirect to dashboard
      router.push(`/dashboard/company/${companyUid}?onboarding=completed`);
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      alert('Fehler beim Abschließen des Onboardings. Bitte versuchen Sie es erneut.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStepStatus = (stepNumber: number) => {
    const step = stepsData.find(s => s.step === stepNumber);
    return step?.isCompleted || false;
  };

  const getStepSummary = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return {
          title: 'Grunddaten',
          items: [
            { label: 'Firmenname', value: allData[1]?.companyName || allData.companyName },
            { label: 'Geschäftstyp', value: allData[1]?.businessType },
            { label: 'Branche', value: allData[1]?.industry },
            {
              label: 'Adresse',
              value: allData[1]?.street ? `${allData[1].street}, ${allData[1].city}` : null,
            },
            { label: 'Telefon', value: allData[1]?.phone },
            { label: 'E-Mail', value: allData[1]?.email },
          ].filter(item => item.value),
        };

      case 2:
        return {
          title: 'Buchhaltung & Banking',
          items: [
            {
              label: 'Kleinunternehmer',
              value: allData[2]?.kleinunternehmer === 'ja' ? 'Ja' : 'Nein',
            },
            {
              label: 'Gewinnermittlung',
              value: allData[2]?.profitMethod === 'euer' ? 'EÜR' : 'Bilanzierung',
            },
            {
              label: 'Preiseingabe',
              value: allData[2]?.priceInput === 'brutto' ? 'Brutto' : 'Netto',
            },
            { label: 'Steuersatz', value: allData[2]?.taxRate ? `${allData[2].taxRate}%` : null },
            { label: 'Kontoinhaber', value: allData[2]?.accountHolder },
            { label: 'IBAN', value: allData[2]?.iban ? `${allData[2].iban.slice(0, 8)}...` : null },
          ].filter(item => item.value),
        };

      case 3:
        return {
          title: 'Profil & Services',
          items: [
            { label: 'Logo', value: allData[3]?.companyLogo ? 'Hochgeladen' : null },
            {
              label: 'Beschreibung',
              value: allData[3]?.publicDescription
                ? `${allData[3].publicDescription.length} Zeichen`
                : null,
            },
            {
              label: 'Stundensatz',
              value: allData[3]?.hourlyRate ? `${allData[3].hourlyRate}€` : null,
            },
            {
              label: 'Fähigkeiten',
              value: allData[3]?.skills?.length ? `${allData[3].skills.length} Skills` : null,
            },
            {
              label: 'Arbeitszeiten',
              value: allData[3]?.workingHours?.filter((h: any) => h.enabled).length
                ? 'Konfiguriert'
                : null,
            },
            {
              label: 'Service-Pakete',
              value: allData[3]?.servicePackages?.length
                ? `${allData[3].servicePackages.length} Pakete`
                : null,
            },
          ].filter(item => item.value),
        };

      case 4:
        return {
          title: 'Services & Kategorien',
          items: [
            { label: 'Hauptkategorie', value: allData[4]?.selectedCategory },
            { label: 'Unterkategorie', value: allData[4]?.selectedSubcategory },
            {
              label: 'Tätigkeitsradius',
              value: allData[4]?.radiusKm ? `${allData[4].radiusKm} km` : null,
            },
            { label: 'Preismodell', value: allData[4]?.pricingModel },
            {
              label: 'Grundpreis',
              value: allData[4]?.basePrice ? `${allData[4].basePrice}€` : null,
            },
            {
              label: 'Anfahrtskosten',
              value: allData[4]?.travelCosts ? `${allData[4].travelCostPerKm}€/km` : 'Keine',
            },
          ].filter(item => item.value),
        };

      default:
        return { title: `Schritt ${stepNumber}`, items: [] };
    }
  };

  const allStepsComplete = stepsData.every(step => step.isCompleted);
  const readyForSubmission = finalTermsAccepted; // Only require checkbox, not all steps

  // Validation function to check what's missing
  const getValidationStatus = () => {
    const missing: string[] = [];
    if (!finalTermsAccepted) missing.push('Finale Bestätigung ankreuzen');

    // Only check previous steps (1-4), not step 5 itself
    const incompleteSteps = stepsData
      .filter(step => step.step < 5 && !step.isCompleted)
      .map(step => `Schritt ${step.step}`);
    missing.push(...incompleteSteps);

    return {
      isValid: missing.length === 0,
      missing: missing,
      completed: finalTermsAccepted ? ['Finale Bestätigung'] : [],
    };
  };

  const validationStatus = getValidationStatus();

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded mb-4"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Überprüfung & Abschluss</h3>
        <p className="text-sm text-gray-600 mb-6">
          Überprüfen Sie alle Ihre Eingaben und schließen Sie das Onboarding ab.
        </p>
      </div>

      {/* Overall Progress */}
      <div className="bg-gradient-to-r from-[#14ad9f] to-[#129488] rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold">Setup-Fortschritt</h4>
            <p className="text-sm opacity-90">{Math.round(completionPercentage)}% abgeschlossen</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{Math.round(completionPercentage)}%</div>
            <div className="text-sm opacity-90">von 100%</div>
          </div>
        </div>
        <div className="w-full bg-white bg-opacity-20 rounded-full h-2 mt-4">
          <div
            className="bg-white h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Step Review */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-gray-900">Übersicht aller Schritte</h4>

        {[1, 2, 3, 4].map(stepNumber => {
          const isCompleted = getStepStatus(stepNumber);
          const summary = getStepSummary(stepNumber);

          return (
            <div
              key={stepNumber}
              className={`border rounded-lg p-4 transition-colors ${
                isCompleted ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isCompleted ? 'bg-green-600 text-white' : 'bg-yellow-500 text-white'
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="w-4 h-4" /> : stepNumber}
                  </div>
                  <div className="ml-4">
                    <h5 className="font-medium text-gray-900">
                      Schritt {stepNumber}: {summary.title}
                    </h5>
                    {isCompleted ? (
                      <div className="mt-2 space-y-1">
                        {summary.items.map((item, index) => (
                          <div key={index} className="text-sm text-gray-600">
                            <span className="font-medium">{item.label}:</span> {item.value}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">
                        Dieser Schritt ist noch nicht vollständig abgeschlossen.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => goToStep(stepNumber)}
                    className="text-[#14ad9f] hover:text-[#129488] text-sm flex items-center"
                  >
                    <Edit3 className="w-4 h-4 mr-1" />
                    Bearbeiten
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Profile Preview */}
      <div className="border-t border-gray-200 pt-8">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Profil-Vorschau</h4>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            {allData[3]?.companyLogo && (
              <img
                src={allData[3].companyLogo}
                alt="Logo"
                className="w-16 h-16 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <h5 className="text-lg font-medium text-gray-900">
                {allData[1]?.companyName || allData.companyName || 'Ihr Unternehmen'}
              </h5>
              <p className="text-sm text-gray-600 mt-1">
                {allData[4]?.selectedSubcategory} • {allData[4]?.selectedCategory}
              </p>
              {allData[3]?.hourlyRate && (
                <p className="text-sm text-[#14ad9f] font-medium mt-2">
                  Ab {allData[3].hourlyRate}€/Stunde
                </p>
              )}
              {allData[3]?.publicDescription && (
                <p className="text-sm text-gray-700 mt-3 line-clamp-3 break-words overflow-wrap-anywhere">
                  {allData[3].publicDescription}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="border-t border-gray-200 pt-8">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Was passiert als Nächstes?</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h6 className="font-medium text-gray-900">1. Review</h6>
              <p className="text-sm text-gray-600">
                Unser Team überprüft Ihre Angaben und Dokumente.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
              <Shield className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <h6 className="font-medium text-gray-900">2. Verifizierung</h6>
              <p className="text-sm text-gray-600">
                Ihre Identität und Qualifikationen werden geprüft.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Award className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h6 className="font-medium text-gray-900">3. Freischaltung</h6>
              <p className="text-sm text-gray-600">
                Nach erfolgreicher Prüfung wird Ihr Profil freigeschaltet.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Final Terms */}
      <div className="border-t border-gray-200 pt-8">
        {/* Validation Status */}
        <div
          className={`p-4 rounded-lg border mb-6 ${
            validationStatus.isValid
              ? 'bg-green-50 border-green-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}
        >
          <div className="flex items-start">
            <div
              className={`flex-shrink-0 ${validationStatus.isValid ? 'text-green-400' : 'text-yellow-400'}`}
            >
              {validationStatus.isValid ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-current flex items-center justify-center">
                  <span className="text-xs font-bold">!</span>
                </div>
              )}
            </div>
            <div className="ml-3">
              <h4
                className={`text-sm font-medium ${
                  validationStatus.isValid ? 'text-green-800' : 'text-yellow-800'
                }`}
              >
                {validationStatus.isValid ? 'Bereit zum Abschluss!' : 'Noch nicht vollständig'}
              </h4>
              {!validationStatus.isValid && (
                <p className="mt-1 text-sm text-yellow-700">
                  Zum Abschluss des Onboardings fehlen noch: {validationStatus.missing.join(', ')}
                </p>
              )}
              {validationStatus.completed.length > 0 && (
                <p className="mt-1 text-sm text-green-700">
                  ✓ Erledigt: {validationStatus.completed.join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Finale Bestätigung</h4>

          <div className="space-y-4">
            <div className="flex items-start">
              <input
                type="checkbox"
                checked={finalTermsAccepted}
                onChange={e => handleTermsChange(e.target.checked)}
                className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f] border-gray-300 rounded mt-1"
              />
              <div className="ml-3">
                <label className="text-sm text-gray-700">
                  Ich bestätige, dass alle von mir gemachten Angaben korrekt und vollständig sind.
                  Ich habe die{' '}
                  <a
                    href="/terms"
                    target="_blank"
                    className="text-[#14ad9f] hover:text-[#129488] underline"
                  >
                    Allgemeinen Geschäftsbedingungen
                  </a>
                  ,{' '}
                  <a
                    href="/privacy"
                    target="_blank"
                    className="text-[#14ad9f] hover:text-[#129488] underline"
                  >
                    Datenschutzerklärung
                  </a>{' '}
                  und{' '}
                  <a
                    href="/provider-terms"
                    target="_blank"
                    className="text-[#14ad9f] hover:text-[#129488] underline"
                  >
                    Anbieter-Bedingungen
                  </a>{' '}
                  gelesen und akzeptiert.
                </label>
              </div>
            </div>

            {/* Warnings if incomplete */}
            {!allStepsComplete && (
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div className="ml-3">
                  <p className="text-sm text-gray-700">
                    <strong>Hinweis:</strong> Nicht alle Schritte sind vollständig abgeschlossen.
                    Sie können das Onboarding trotzdem abschließen, aber unvollständige Bereiche
                    müssen vor der Freischaltung nachgeholt werden.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Completion Button */}
      <div className="border-t border-gray-200 pt-8">
        <div className="flex justify-center">
          <button
            onClick={handleCompleteOnboarding}
            disabled={!finalTermsAccepted || submitting}
            className={`px-8 py-3 rounded-lg text-lg font-medium transition-all duration-200 ${
              readyForSubmission
                ? 'bg-[#14ad9f] text-white hover:bg-[#129488] hover:shadow-lg transform hover:-translate-y-0.5'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <div className="flex items-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Onboarding wird abgeschlossen...
              </div>
            ) : (
              'Onboarding abschließen'
            )}
          </button>
        </div>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            {allStepsComplete
              ? 'Ihr Profil wird zur Überprüfung eingereicht.'
              : 'Unvollständige Bereiche können später nachgeholt werden.'}
          </p>
        </div>
      </div>

      {/* Status Info */}
      {onboardingStatus && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="ml-3">
              <h5 className="font-medium text-blue-900">
                Aktueller Status: {onboardingStatus.status}
              </h5>
              <p className="text-sm text-blue-800 mt-1">
                Geschätzte Bearbeitungszeit: 1-3 Werktage
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingStep5;
