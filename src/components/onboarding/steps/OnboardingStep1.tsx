'use client';

import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { CheckCircle, Building2, Users, Globe, FileText } from 'lucide-react';

interface OnboardingStep1Props {
  companyUid: string;
}

interface ManagerData {
  position: string;
  nationality: string;
}

interface Step1Data {
  businessType: 'b2b' | 'b2c' | 'hybrid';
  employees: string;
  website: string;
  description: string;
  managerData?: ManagerData;
}

const OnboardingStep1: React.FC<OnboardingStep1Props> = ({ companyUid }) => {
  const { updateStepData, stepData, goToNextStep } = useOnboarding();
  const { user } = useAuth();

  const [formData, setFormData] = useState<Step1Data>({
    businessType: 'hybrid',
    employees: '',
    website: '',
    description: '',
  });

  const [loading, setLoading] = useState(true);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [managerData, setManagerData] = useState<ManagerData>({
    position: '',
    nationality: '',
  });

  // Lade vorhandene Daten und Registration-Daten
  useEffect(() => {
    const loadExistingData = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Lade Onboarding-Daten falls vorhanden
          const existingStep1 = userData.step1 || {};

          setFormData({
            businessType: existingStep1.businessType || 'hybrid',
            employees: existingStep1.employees || '',
            website: existingStep1.website || userData.companyWebsite || '',
            description: existingStep1.description || '',
          });

          // Lade Manager-Daten falls erforderlich
          if (existingStep1.managerData) {
            setManagerData(existingStep1.managerData);
            setFormData(prev => ({ ...prev, managerData: existingStep1.managerData }));
          }
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
  const handleChange = (field: keyof Step1Data, value: string | ManagerData) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle manager data changes
  const handleManagerChange = (field: keyof ManagerData, value: string) => {
    const updatedManagerData = {
      ...managerData,
      [field]: value,
    };
    setManagerData(updatedManagerData);
    setFormData(prev => ({
      ...prev,
      managerData: updatedManagerData,
    }));
  };

  // Prüfe ob Manager-Daten erforderlich sind (basierend auf Registration legalForm)
  const requiresManager = (legalForm: string): boolean => {
    const formsRequiringManager = ['GmbH', 'UG (haftungsbeschränkt)', 'AG'];
    return formsRequiringManager.includes(legalForm);
  };

  // Validierung
  const validateForm = (): string[] => {
    const missing: string[] = [];

    if (!formData.businessType) missing.push('Geschäftsmodell');
    if (!formData.employees) missing.push('Mitarbeiteranzahl');

    return missing;
  };

  // Speichern und weiter
  const handleNext = async () => {
    const missingFields = validateForm();
    if (missingFields.length > 0) {
      alert(`Bitte füllen Sie folgende Pflichtfelder aus: ${missingFields.join(', ')}`);
      return;
    }

    try {
      await updateStepData(1, formData);
      console.log('✅ Step 1 erfolgreich gespeichert');
    } catch (error) {
      console.error('❌ Fehler beim Speichern:', error);
      alert('Fehler beim Speichern der Daten. Bitte versuchen Sie es erneut.');
    }
  };

  const isFormValid = validateForm().length === 0;

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Erweiterte Unternehmensdaten</h1>
          <p className="text-gray-600">
            Vervollständigen Sie Ihr Firmenprofil mit zusätzlichen Informationen
          </p>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="grid gap-8">
            {/* Geschäftsmodell */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#14ad9f]" />
                <label className="text-lg font-semibold text-gray-900">Geschäftsmodell *</label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    value: 'b2c',
                    label: 'B2C - Privatkunden',
                    desc: 'Dienstleistungen für Privatpersonen',
                  },
                  {
                    value: 'b2b',
                    label: 'B2B - Geschäftskunden',
                    desc: 'Dienstleistungen für Unternehmen',
                  },
                  {
                    value: 'hybrid',
                    label: 'Hybrid - Beides',
                    desc: 'Sowohl Privat- als auch Geschäftskunden',
                  },
                ].map(option => (
                  <label
                    key={option.value}
                    className={`cursor-pointer p-4 border-2 rounded-lg transition-all ${
                      formData.businessType === option.value
                        ? 'border-[#14ad9f] bg-[#14ad9f]/5'
                        : 'border-gray-200 hover:border-[#14ad9f]/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="businessType"
                      value={option.value}
                      checked={formData.businessType === option.value}
                      onChange={e =>
                        handleChange('businessType', e.target.value as 'b2b' | 'b2c' | 'hybrid')
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

            {/* Mitarbeiteranzahl */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#14ad9f]" />
                <label className="text-lg font-semibold text-gray-900">Mitarbeiteranzahl *</label>
              </div>
              <select
                value={formData.employees}
                onChange={e => handleChange('employees', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                required
              >
                <option value="">Wählen Sie die Mitarbeiteranzahl</option>
                <option value="1">Nur ich (Einzelunternehmer)</option>
                <option value="2-5">2-5 Mitarbeiter</option>
                <option value="6-10">6-10 Mitarbeiter</option>
                <option value="11-25">11-25 Mitarbeiter</option>
                <option value="26-50">26-50 Mitarbeiter</option>
                <option value="51-100">51-100 Mitarbeiter</option>
                <option value="100+">Mehr als 100 Mitarbeiter</option>
              </select>
            </div>

            {/* Website */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-[#14ad9f]" />
                <label className="text-lg font-semibold text-gray-900">Firmenwebsite</label>
              </div>
              <input
                type="url"
                value={formData.website}
                onChange={e => handleChange('website', e.target.value)}
                placeholder="https://ihre-website.de"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              />
              <p className="text-sm text-gray-600">
                Optional: Ihre Firmenwebsite für das öffentliche Profil
              </p>
            </div>

            {/* Firmenbeschreibung */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#14ad9f]" />
                <label className="text-lg font-semibold text-gray-900">Firmenbeschreibung</label>
              </div>
              <textarea
                value={formData.description}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="Beschreiben Sie Ihr Unternehmen und Ihre Dienstleistungen..."
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] resize-none"
              />
              <p className="text-sm text-gray-600">
                Optional: Kurze Beschreibung Ihres Unternehmens für das öffentliche Profil
              </p>
            </div>

            {/* Manager Modal Trigger */}
            {showManagerModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Manager Zusatzdaten</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Position/Titel *
                      </label>
                      <input
                        type="text"
                        value={managerData.position}
                        onChange={e => handleManagerChange('position', e.target.value)}
                        placeholder="z.B. Geschäftsführer"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nationalität
                      </label>
                      <input
                        type="text"
                        value={managerData.nationality}
                        onChange={e => handleManagerChange('nationality', e.target.value)}
                        placeholder="z.B. deutsch"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowManagerModal(false)}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={() => {
                        setFormData(prev => ({ ...prev, managerData }));
                        setShowManagerModal(false);
                      }}
                      className="flex-1 px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] transition-colors"
                    >
                      Speichern
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={async () => {
                await handleNext();
                if (isFormValid) {
                  goToNextStep();
                }
              }}
              disabled={!isFormValid}
              className={`px-6 py-2 text-white rounded-lg transition-colors ${
                isFormValid ? 'bg-[#14ad9f] hover:bg-[#129488]' : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              Weiter
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>💡 Hinweis:</strong> Grunddaten wie Firmenname, E-Mail und Adresse wurden
            bereits bei der Registrierung erfasst. Hier ergänzen Sie nur zusätzliche Informationen
            für Ihr vollständiges Firmenprofil.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingStep1;
