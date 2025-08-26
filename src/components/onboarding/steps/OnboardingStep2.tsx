'use client';

import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { Calculator, Percent, CreditCard, CheckCircle } from 'lucide-react';

interface OnboardingStep2Props {
  companyUid: string;
}

interface Step2Data {
  // Steuerliche Zusatzeinstellungen
  kleinunternehmer: 'ja' | 'nein';
  profitMethod: 'euer' | 'bilanz';
  priceInput: 'brutto' | 'netto';
  taxRate: string;
}

const OnboardingStep2: React.FC<OnboardingStep2Props> = ({ companyUid }) => {
  const { updateStepData, stepData, goToPreviousStep, goToNextStep, saveCurrentStep } =
    useOnboarding();
  const { user } = useAuth();

  const [formData, setFormData] = useState<Step2Data>({
    kleinunternehmer: 'nein',
    profitMethod: 'euer',
    priceInput: 'netto',
    taxRate: '19',
  });

  const [loading, setLoading] = useState(true);

  // Lade vorhandene Daten
  useEffect(() => {
    const loadExistingData = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const existingStep2 = userData.step2 || {};

          setFormData({
            kleinunternehmer: existingStep2.kleinunternehmer || 'nein',
            profitMethod: existingStep2.profitMethod || 'euer',
            priceInput: existingStep2.priceInput || 'netto',
            taxRate: existingStep2.taxRate || '19',
          });
        }
      } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExistingData();
  }, [user]);

  // Handle form changes
  const handleChange = (field: keyof Step2Data, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Validierung
  const validateForm = (): string[] => {
    const missing: string[] = [];

    if (!formData.kleinunternehmer) missing.push('Kleinunternehmerregelung');
    if (!formData.profitMethod) missing.push('Gewinnermittlungsart');
    if (!formData.priceInput) missing.push('Preiseingabe-Modus');
    if (!formData.taxRate) missing.push('Steuersatz');

    return missing;
  };

  const isFormValid = validateForm().length === 0;

  // Speichern und weiter
  const [isSaving, setIsSaving] = useState(false);

  const handleNext = async () => {
    if (isSaving) {
      console.log('🔄 Speichervorgang bereits aktiv - ignoriere weiteren Click');
      return; // Verhindere mehrfache Clicks
    }

    const missingFields = validateForm();
    if (missingFields.length > 0) {
      alert(`Bitte füllen Sie folgende Pflichtfelder aus: ${missingFields.join(', ')}`);
      return;
    }

    console.log('🚀 Step 2 handleNext gestartet...');
    setIsSaving(true);

    try {
      // 1. Nur lokal updaten (KEIN Firestore!)
      console.log('📝 Lokale Daten aktualisieren...');
      updateStepData(2, formData);

      // 2. Kurz warten damit lokale Updates verarbeitet werden
      await new Promise(resolve => setTimeout(resolve, 100));

      // 3. EINMAL in Firestore speichern
      console.log('💾 Firestore speichern...');
      await saveCurrentStep();

      // 4. Zum nächsten Step (OHNE weitere Speicherung)
      console.log('➡️ Zum nächsten Step navigieren...');
      goToNextStep();

      console.log('✅ Step 2 erfolgreich abgeschlossen');
    } catch (error) {
      console.error('❌ Fehler beim Speichern:', error);
      alert('Fehler beim Speichern der Daten. Bitte versuchen Sie es erneut.');
    } finally {
      // Sofort zurücksetzen - keine Verzögerung
      setIsSaving(false);
      console.log('🔓 isSaving zurückgesetzt');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Steuerliche Einstellungen</h1>
          <p className="text-gray-600">
            Konfigurieren Sie Ihre grundlegenden steuerlichen Einstellungen
          </p>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="grid gap-8">
            {/* Kleinunternehmerregelung */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-[#14ad9f]" />
                <label className="text-lg font-semibold text-gray-900">
                  Kleinunternehmerregelung *
                </label>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Nutzen Sie die Kleinunternehmerregelung nach §19 UStG? (bis 22.000€ Jahresumsatz)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    value: 'ja',
                    label: 'Ja, ich nutze die Kleinunternehmerregelung',
                    desc: 'Keine Umsatzsteuer ausweisen',
                  },
                  {
                    value: 'nein',
                    label: 'Nein, normale Umsatzsteuerpflicht',
                    desc: 'Umsatzsteuer wird ausgewiesen',
                  },
                ].map(option => (
                  <label
                    key={option.value}
                    className={`cursor-pointer p-4 border-2 rounded-lg transition-all ${
                      formData.kleinunternehmer === option.value
                        ? 'border-[#14ad9f] bg-[#14ad9f]/5'
                        : 'border-gray-200 hover:border-[#14ad9f]/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="kleinunternehmer"
                      value={option.value}
                      checked={formData.kleinunternehmer === option.value}
                      onChange={e =>
                        handleChange('kleinunternehmer', e.target.value as 'ja' | 'nein')
                      }
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="font-semibold text-gray-900 mb-1">{option.label}</div>
                      <div className="text-sm text-gray-600">{option.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Gewinnermittlungsart */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#14ad9f]" />
                <label className="text-lg font-semibold text-gray-900">
                  Gewinnermittlungsart *
                </label>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Wie ermitteln Sie Ihren Gewinn für die Steuererklärung?
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    value: 'euer',
                    label: 'Einnahmen-Überschuss-Rechnung (EÜR)',
                    desc: 'Vereinfachte Gewinnermittlung',
                  },
                  {
                    value: 'bilanz',
                    label: 'Bilanzierung',
                    desc: 'Doppelte Buchführung mit Bilanz',
                  },
                ].map(option => (
                  <label
                    key={option.value}
                    className={`cursor-pointer p-4 border-2 rounded-lg transition-all ${
                      formData.profitMethod === option.value
                        ? 'border-[#14ad9f] bg-[#14ad9f]/5'
                        : 'border-gray-200 hover:border-[#14ad9f]/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="profitMethod"
                      value={option.value}
                      checked={formData.profitMethod === option.value}
                      onChange={e =>
                        handleChange('profitMethod', e.target.value as 'euer' | 'bilanz')
                      }
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="font-semibold text-gray-900 mb-1">{option.label}</div>
                      <div className="text-sm text-gray-600">{option.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Preiseingabe-Modus */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-[#14ad9f]" />
                <label className="text-lg font-semibold text-gray-900">Preiseingabe-Modus *</label>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Wie möchten Sie Ihre Preise eingeben und anzeigen?
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { value: 'netto', label: 'Netto-Preise', desc: 'Preise ohne Umsatzsteuer' },
                  {
                    value: 'brutto',
                    label: 'Brutto-Preise',
                    desc: 'Preise inklusive Umsatzsteuer',
                  },
                ].map(option => (
                  <label
                    key={option.value}
                    className={`cursor-pointer p-4 border-2 rounded-lg transition-all ${
                      formData.priceInput === option.value
                        ? 'border-[#14ad9f] bg-[#14ad9f]/5'
                        : 'border-gray-200 hover:border-[#14ad9f]/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="priceInput"
                      value={option.value}
                      checked={formData.priceInput === option.value}
                      onChange={e =>
                        handleChange('priceInput', e.target.value as 'brutto' | 'netto')
                      }
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="font-semibold text-gray-900 mb-1">{option.label}</div>
                      <div className="text-sm text-gray-600">{option.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Steuersatz */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-[#14ad9f]" />
                <label className="text-lg font-semibold text-gray-900">
                  Standard-Steuersatz (%) *
                </label>
              </div>
              <select
                value={formData.taxRate}
                onChange={e => handleChange('taxRate', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                required
              >
                <option value="19">19% (Regelsteuersatz)</option>
                <option value="7">7% (Ermäßigter Steuersatz)</option>
                <option value="0">0% (Steuerbefreit/Kleinunternehmer)</option>
              </select>
              <p className="text-sm text-gray-600">
                Wählen Sie Ihren Standard-Umsatzsteuersatz für die meisten Dienstleistungen
              </p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => goToPreviousStep()}
              className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!isFormValid || isSaving}
              style={{ pointerEvents: !isFormValid || isSaving ? 'none' : 'auto' }}
              className={`px-6 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${
                isFormValid && !isSaving
                  ? 'bg-[#14ad9f] hover:bg-[#129488] cursor-pointer'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {isSaving && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {isSaving ? 'Speichert...' : 'Weiter'}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>💡 Hinweis:</strong> Steuernummer und USt-IdNr. wurden bereits bei der
            Registrierung erfasst. Bankdaten (IBAN, Kontoinhaber) sind ebenfalls bereits hinterlegt.
            Hier konfigurieren Sie nur die grundlegenden steuerlichen Einstellungen für Ihr
            Geschäft.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingStep2;
