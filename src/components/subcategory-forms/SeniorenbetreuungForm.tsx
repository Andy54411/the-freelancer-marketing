'use client';
import React, { useState, useEffect } from 'react';
import { SeniorenbetreuungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';
import { useRouter } from 'next/navigation';

interface SeniorenbetreuungFormProps {
  data: SeniorenbetreuungData;
  onDataChange: (data: SeniorenbetreuungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SeniorenbetreuungForm: React.FC<SeniorenbetreuungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<SeniorenbetreuungData>(data);
  const router = useRouter();

  // Lokale FormSubmitButton Komponente
  const FormSubmitButton = ({
    isValid,
    subcategory,
  }: {
    isValid: boolean;
    subcategory: string;
  }) => {
    const handleNextClick = () => {
      if (!isValid) {
        return;
      }

      const encodedSubcategory = encodeURIComponent(subcategory);
      router.push(`/auftrag/get-started/${encodedSubcategory}/adresse`);
    };

    return (
      <div className="space-y-6 mt-8">
        {!isValid && (
          <div className="text-center">
            <div className="inline-flex items-center py-3 px-5 bg-gradient-to-r from-teal-50 to-cyan-50 border border-[#14ad9f]/20 rounded-xl shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-3 text-[#14ad9f]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-gray-700 font-medium">
                Bitte füllen Sie alle Pflichtfelder aus, um fortzufahren.
              </span>
            </div>
          </div>
        )}
        {isValid && (
          <div className="text-center">
            <button
              className="bg-[#14ad9f] hover:bg-teal-700 text-white font-medium py-3 px-6 rounded-lg shadow transition-colors duration-200"
              onClick={handleNextClick}
            >
              Weiter zur Adresseingabe
            </button>
          </div>
        )}
      </div>
    );
  };

  const serviceTypeOptions = [
    { value: 'stundenbetreuung', label: 'Stundenbetreuung' },
    { value: 'tagespflege', label: 'Tagespflege' },
    { value: 'nachtbetreuung', label: 'Nachtbetreuung' },
    { value: '24h_betreuung', label: '24h-Betreuung' },
    { value: 'demenzbetreuung', label: 'Demenzbetreuung' },
    { value: 'alltagsbegleitung', label: 'Alltagsbegleitung' },
  ];

  const careLevelOptions = [
    { value: 'ohne_pflegegrad', label: 'Ohne Pflegegrad' },
    { value: 'pflegegrad_1', label: 'Pflegegrad 1' },
    { value: 'pflegegrad_2', label: 'Pflegegrad 2' },
    { value: 'pflegegrad_3', label: 'Pflegegrad 3' },
    { value: 'pflegegrad_4', label: 'Pflegegrad 4' },
    { value: 'pflegegrad_5', label: 'Pflegegrad 5' },
  ];

  const additionalServicesOptions = [
    { value: 'haushaltsführung', label: 'Haushaltsführung' },
    { value: 'kochen', label: 'Kochen' },
    { value: 'einkaufen', label: 'Einkaufen' },
    { value: 'körperpflege', label: 'Körperpflege' },
    { value: 'medikamente', label: 'Medikamentengabe' },
    { value: 'begleitung', label: 'Begleitung zu Terminen' },
    { value: 'spazieren', label: 'Spazieren gehen' },
    { value: 'gesellschaft', label: 'Gesellschaft leisten' },
    { value: 'gedächtnistraining', label: 'Gedächtnistraining' },
    { value: 'transport', label: 'Transport/Fahrdienst' },
    { value: 'notfallbetreuung', label: 'Notfallbetreuung' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'gelegentlich', label: 'Gelegentlich' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'täglich', label: 'Täglich' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
  ];

  const timeOptions = [
    { value: 'vormittags', label: 'Vormittags' },
    { value: 'nachmittags', label: 'Nachmittags' },
    { value: 'abends', label: 'Abends' },
    { value: 'nachts', label: 'Nachts' },
    { value: 'ganztags', label: 'Ganztags' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof SeniorenbetreuungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(formData.serviceType && formData.careLevel && formData.frequency);
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(formData.serviceType && formData.careLevel && formData.frequency);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Seniorenbetreuung-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Betreuung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Betreuung"
            />
          </FormField>

          <FormField label="Pflegegrad" required>
            <FormSelect
              value={formData.careLevel || ''}
              onChange={value => handleInputChange('careLevel', value)}
              options={careLevelOptions}
              placeholder="Wählen Sie den Pflegegrad"
            />
          </FormField>

          <FormField label="Häufigkeit" required>
            <FormSelect
              value={formData.frequency || ''}
              onChange={value => handleInputChange('frequency', value)}
              options={frequencyOptions}
              placeholder="Wählen Sie die Häufigkeit"
            />
          </FormField>

          <FormField label="Uhrzeit">
            <FormSelect
              value={formData.timePreference || ''}
              onChange={value => handleInputChange('timePreference', value)}
              options={timeOptions}
              placeholder="Wählen Sie die bevorzugte Uhrzeit"
            />
          </FormField>

          <FormField label="Stunden pro Einsatz">
            <FormInput
              type="number"
              value={formData.hoursPerSession?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'hoursPerSession',
                  typeof value === 'string' ? parseInt(value) : value
                )
              }
              placeholder="Stunden pro Einsatz"
            />
          </FormField>

          <FormField label="Stundenlohn">
            <FormInput
              type="number"
              value={formData.hourlyRate?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'hourlyRate',
                  typeof value === 'string' ? parseFloat(value) : value
                )
              }
              placeholder="Stundenlohn in €"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Services">
            <FormCheckboxGroup
              value={formData.additionalServices || []}
              onChange={value => handleInputChange('additionalServices', value)}
              options={additionalServicesOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Qualifikationen erwünscht">
            <FormRadioGroup
              name="qualifications"
              value={formData.qualifications || ''}
              onChange={value => handleInputChange('qualifications', value)}
              options={[
                { value: 'nicht_wichtig', label: 'Nicht wichtig' },
                { value: 'erfahrung', label: 'Erfahrung in der Seniorenbetreuung' },
                { value: 'pflegeausbildung', label: 'Pflegeausbildung' },
                { value: 'demenz_schulung', label: 'Demenz-Schulung' },
                { value: 'erste_hilfe', label: 'Erste-Hilfe-Kurs' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Sprache">
            <FormRadioGroup
              name="language"
              value={formData.language || ''}
              onChange={value => handleInputChange('language', value)}
              options={[
                { value: 'deutsch', label: 'Deutsch' },
                { value: 'mehrsprachig', label: 'Mehrsprachig erwünscht' },
                { value: 'nicht_wichtig', label: 'Nicht wichtig' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Besondere Anforderungen, Krankheiten, Routinen etc."
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Weitere Informationen">
            <FormTextarea
              value={formData.additionalInfo || ''}
              onChange={value => handleInputChange('additionalInfo', value)}
              placeholder="Weitere wichtige Informationen"
              rows={3}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Seniorenbetreuung" />
    </div>
  );
};

export default SeniorenbetreuungForm;
