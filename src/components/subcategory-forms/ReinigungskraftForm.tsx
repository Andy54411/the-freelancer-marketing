'use client';
import React, { useState, useEffect } from 'react';
import { ReinigungskraftData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';
import { useRouter } from 'next/navigation';

interface ReinigungskraftFormProps {
  data: ReinigungskraftData;
  onDataChange: (data: ReinigungskraftData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const ReinigungskraftForm: React.FC<ReinigungskraftFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<ReinigungskraftData>(data);
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
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'regelmäßig', label: 'Regelmäßig' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
  ];

  const cleaningTypeOptions = [
    { value: 'grundreinigung', label: 'Grundreinigung' },
    { value: 'unterhaltsreinigung', label: 'Unterhaltsreinigung' },
    { value: 'endreinigung', label: 'Endreinigung' },
    { value: 'büroreinigung', label: 'Büroreinigung' },
  ];

  const frequencyOptions = [
    { value: 'täglich', label: 'Täglich' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'zweiwöchentlich', label: 'Zweiwöchentlich' },
    { value: 'monatlich', label: 'Monatlich' },
  ];

  const specialAreasOptions = [
    { value: 'bad', label: 'Bad' },
    { value: 'küche', label: 'Küche' },
    { value: 'fenster', label: 'Fenster' },
    { value: 'balkon', label: 'Balkon' },
    { value: 'keller', label: 'Keller' },
    { value: 'dachboden', label: 'Dachboden' },
  ];

  const equipmentOptions = [
    { value: 'vorhanden', label: 'Reinigungsgeräte sind vorhanden' },
    { value: 'mitbringen', label: 'Reinigungskraft bringt Geräte mit' },
    { value: 'bereitstellen', label: 'Geräte werden bereitgestellt' },
  ];

  const chemicalsOptions = [
    { value: 'vorhanden', label: 'Reinigungsmittel sind vorhanden' },
    { value: 'mitbringen', label: 'Reinigungskraft bringt Mittel mit' },
    { value: 'bereitstellen', label: 'Mittel werden bereitgestellt' },
    { value: 'umweltfreundlich', label: 'Nur umweltfreundliche Mittel' },
  ];

  const timePreferenceOptions = [
    { value: 'morgens', label: 'Morgens' },
    { value: 'nachmittags', label: 'Nachmittags' },
    { value: 'abends', label: 'Abends' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const accessMethodOptions = [
    { value: 'anwesend', label: 'Ich bin anwesend' },
    { value: 'schlüssel', label: 'Schlüsselübergabe' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const handleInputChange = (field: keyof ReinigungskraftData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.cleaningType &&
      formData.equipment &&
      formData.chemicals &&
      formData.timePreference &&
      formData.accessMethod &&
      formData.specialAreas &&
      formData.specialAreas.length > 0
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.cleaningType &&
      formData.equipment &&
      formData.chemicals &&
      formData.timePreference &&
      formData.accessMethod &&
      formData.specialAreas &&
      formData.specialAreas.length > 0
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Reinigungskraft-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Dienstleistung"
            />
          </FormField>

          <FormField label="Art der Reinigung" required>
            <FormSelect
              value={formData.cleaningType || ''}
              onChange={value => handleInputChange('cleaningType', value)}
              options={cleaningTypeOptions}
              placeholder="Wählen Sie die Art der Reinigung"
            />
          </FormField>

          {formData.serviceType === 'regelmäßig' && (
            <FormField label="Häufigkeit" required>
              <FormSelect
                value={formData.frequency || ''}
                onChange={value => handleInputChange('frequency', value)}
                options={frequencyOptions}
                placeholder="Wie oft soll gereinigt werden?"
              />
            </FormField>
          )}

          <FormField label="Anzahl Räume">
            <FormInput
              type="number"
              value={formData.roomCount?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'roomCount',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der zu reinigenden Räume"
            />
          </FormField>

          <FormField label="Quadratmeter">
            <FormInput
              type="number"
              value={formData.squareMeters?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'squareMeters',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Gesamtfläche in m²"
            />
          </FormField>

          <FormField label="Reinigungsgeräte" required>
            <FormSelect
              value={formData.equipment || ''}
              onChange={value => handleInputChange('equipment', value)}
              options={equipmentOptions}
              placeholder="Verfügbarkeit von Reinigungsgeräten"
            />
          </FormField>

          <FormField label="Reinigungsmittel" required>
            <FormSelect
              value={formData.chemicals || ''}
              onChange={value => handleInputChange('chemicals', value)}
              options={chemicalsOptions}
              placeholder="Verfügbarkeit von Reinigungsmitteln"
            />
          </FormField>

          <FormField label="Zeitpräferenz" required>
            <FormSelect
              value={formData.timePreference || ''}
              onChange={value => handleInputChange('timePreference', value)}
              options={timePreferenceOptions}
              placeholder="Bevorzugte Tageszeit"
            />
          </FormField>

          <FormField label="Zugang" required>
            <FormSelect
              value={formData.accessMethod || ''}
              onChange={value => handleInputChange('accessMethod', value)}
              options={accessMethodOptions}
              placeholder="Wie erfolgt der Zugang?"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Bereiche" required>
            <FormCheckboxGroup
              value={formData.specialAreas || []}
              onChange={value => handleInputChange('specialAreas', value)}
              options={specialAreasOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Beschreiben Sie besondere Wünsche, Reinigungsanforderungen oder Besonderheiten"
              rows={3}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Reinigungskraft" />
    </div>
  );
};

export default ReinigungskraftForm;
