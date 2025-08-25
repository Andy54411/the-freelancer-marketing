'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { CheckCircle, FileText, Shield, AlertCircle } from 'lucide-react';

// Harmonisierte Step5Data Interface
interface Step5Data {
  documentsCompleted: boolean;
}

export default function OnboardingStep5() {
  const {
    stepData,
    updateStepData,
    goToPreviousStep,
    submitOnboarding,
    getOverallCompletion,
    saveCurrentStep,
  } = useOnboarding();

  const [step5Data, setStep5Data] = useState<Step5Data>(
    stepData[5] || {
      documentsCompleted: false,
    }
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof Step5Data, value: any) => {
    const updatedData = { ...step5Data, [field]: value };
    setStep5Data(updatedData);
    updateStepData(5, updatedData);
  };

  // Berechne fehlende Felder
  const getMissingFields = () => {
    const missing: string[] = [];

    // Step 1 Prüfung
    if (!stepData[1]?.businessType) missing.push('Unternehmenstyp');
    if (!stepData[1]?.employees) missing.push('Mitarbeiteranzahl');

    // Step 2 Prüfung
    if (!stepData[2]?.kleinunternehmer) missing.push('Kleinunternehmerregelung');
    if (!stepData[2]?.profitMethod) missing.push('Gewinnermittlung');
    if (!stepData[2]?.priceInput) missing.push('Preiseingabe');
    if (!stepData[2]?.taxRate) missing.push('Steuersatz');

    // Step 4 Prüfung
    if (!stepData[4]?.availabilityType) missing.push('Verfügbarkeitstyp');
    if (!stepData[4]?.advanceBookingHours) missing.push('Vorlaufzeit');
    if (!stepData[4]?.maxTravelDistance) missing.push('Max. Entfernung');

    return missing;
  };

  const missingFields = getMissingFields();
  const completionPercentage = Math.round(getOverallCompletion());
  const canComplete = missingFields.length === 0 && step5Data.documentsCompleted;

  const handleSubmit = async () => {
    if (!canComplete) return;

    setIsSubmitting(true);
    try {
      // Erst aktuellen Step speichern
      await saveCurrentStep();
      // Dann Onboarding abschließen
      await submitOnboarding();
    } catch (error) {
      console.error('Fehler beim Abschließen des Onboardings:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Abschluss & Finalisierung</h1>
        <p className="text-gray-600">
          Überprüfen Sie Ihre Angaben und schließen Sie das Onboarding ab
        </p>
      </div>

      <div className="space-y-6">
        {/* Fortschrittsanzeige */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Ihr Fortschritt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Onboarding-Fortschritt</span>
                <span className="text-sm text-gray-500">{Math.round(completionPercentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#14ad9f] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>

              {completionPercentage >= 100 ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Alle Schritte abgeschlossen!</span>
                </div>
              ) : (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-600">
                      Bitte vervollständigen Sie alle vorherigen Schritte, bevor Sie fortfahren.
                    </span>
                  </div>
                  {missingFields.length > 0 && (
                    <div className="text-sm text-orange-700">
                      <span className="font-medium">Fehlende Felder: </span>
                      {missingFields.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Übersicht der eingegebenen Daten */}
        <Card>
          <CardHeader>
            <CardTitle>Übersicht Ihrer Angaben</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1 Übersicht */}
            {stepData[1] && (
              <div className="border-l-4 border-[#14ad9f] pl-4">
                <h4 className="font-medium text-gray-900">Unternehmensinformationen</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  {stepData[1].businessType && (
                    <p>
                      Unternehmenstyp:{' '}
                      <span className="font-medium">{stepData[1].businessType}</span>
                    </p>
                  )}
                  {stepData[1].employees && (
                    <p>
                      Mitarbeiteranzahl:{' '}
                      <span className="font-medium">{stepData[1].employees}</span>
                    </p>
                  )}
                  {stepData[1].website && (
                    <p>
                      Website: <span className="font-medium">{stepData[1].website}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2 Übersicht */}
            {stepData[2] && (
              <div className="border-l-4 border-[#14ad9f] pl-4">
                <h4 className="font-medium text-gray-900">Steuerliche Einstellungen</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  {stepData[2].kleinunternehmer && (
                    <p>
                      Kleinunternehmerregelung:{' '}
                      <span className="font-medium">
                        {stepData[2].kleinunternehmer === 'ja' ? 'Ja' : 'Nein'}
                      </span>
                    </p>
                  )}
                  {stepData[2].profitMethod && (
                    <p>
                      Gewinnermittlung:{' '}
                      <span className="font-medium">
                        {stepData[2].profitMethod === 'euer' ? 'EÜR' : 'Bilanz'}
                      </span>
                    </p>
                  )}
                  {stepData[2].priceInput && (
                    <p>
                      Preiseingabe:{' '}
                      <span className="font-medium">
                        {stepData[2].priceInput === 'brutto' ? 'Brutto' : 'Netto'}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3 Übersicht */}
            {stepData[3] && (
              <div className="border-l-4 border-[#14ad9f] pl-4">
                <h4 className="font-medium text-gray-900">Profil & Services</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  {stepData[3].skills && stepData[3].skills.length > 0 && (
                    <p>
                      Fähigkeiten:{' '}
                      <span className="font-medium">{stepData[3].skills.length} definiert</span>
                    </p>
                  )}
                  {stepData[3].servicePackages && stepData[3].servicePackages.length > 0 && (
                    <p>
                      Service-Pakete:{' '}
                      <span className="font-medium">
                        {stepData[3].servicePackages.length} erstellt
                      </span>
                    </p>
                  )}
                  {stepData[3].instantBooking && (
                    <p>
                      Sofortbuchung: <span className="font-medium">Aktiviert</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 4 Übersicht */}
            {stepData[4] && (
              <div className="border-l-4 border-[#14ad9f] pl-4">
                <h4 className="font-medium text-gray-900">Service-Bereich & Verfügbarkeit</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  {stepData[4].availabilityType && (
                    <p>
                      Verfügbarkeit:{' '}
                      <span className="font-medium">
                        {stepData[4].availabilityType === 'flexible'
                          ? 'Flexibel'
                          : stepData[4].availabilityType === 'fixed'
                            ? 'Feste Zeiten'
                            : 'Auf Abruf'}
                      </span>
                    </p>
                  )}
                  {stepData[4].maxTravelDistance && (
                    <p>
                      Max. Entfernung:{' '}
                      <span className="font-medium">{stepData[4].maxTravelDistance} km</span>
                    </p>
                  )}
                  {stepData[4].serviceAreas && stepData[4].serviceAreas.length > 0 && (
                    <p>
                      Service-Gebiete:{' '}
                      <span className="font-medium">
                        {stepData[4].serviceAreas.length} definiert
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Finale Bestätigung */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Finale Bestätigung
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Dokumentenvollständigkeit</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Bitte bestätigen Sie, dass alle Ihre Angaben vollständig und korrekt sind. Nach
                    dem Abschluss wird Ihr Profil zur Überprüfung eingereicht.
                  </p>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="documentsCompleted"
                      checked={step5Data.documentsCompleted}
                      onCheckedChange={checked => updateField('documentsCompleted', checked)}
                    />
                    <Label
                      htmlFor="documentsCompleted"
                      className="text-sm font-medium text-blue-900"
                    >
                      Ich bestätige, dass alle Dokumente und Angaben vollständig sind *
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {canComplete && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Bereit zum Abschluss! Sie können Ihr Onboarding jetzt finalisieren.
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nächste Schritte */}
        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <h3 className="font-medium mb-3">Was passiert als Nächstes?</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-xs font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium text-gray-900">Profil-Überprüfung</p>
                  <p>Unser Team überprüft Ihre Angaben (normalerweise innerhalb von 24 Stunden)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-xs font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium text-gray-900">Freischaltung</p>
                  <p>
                    Bei erfolgreicher Prüfung wird Ihr Profil aktiviert und Sie erhalten eine E-Mail
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-xs font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium text-gray-900">Los geht&apos;s</p>
                  <p>Sie können Aufträge annehmen und Ihre Services anbieten</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button
          variant="outline"
          onClick={goToPreviousStep}
          disabled={isSubmitting}
          className="px-6"
        >
          Zurück
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canComplete || isSubmitting}
          className={`px-8 ${
            canComplete
              ? 'bg-[#14ad9f] hover:bg-[#129488] text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Wird abgeschlossen...
            </div>
          ) : (
            'Onboarding abschließen'
          )}
        </Button>
      </div>
    </div>
  );
}
