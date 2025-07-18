'use client';
import React, { useState, useEffect } from 'react';
import { KlempnerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';
import { useRouter } from 'next/navigation';

interface KlempnerFormProps {
  data: KlempnerData;
  onDataChange: (data: KlempnerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const KlempnerForm: React.FC<KlempnerFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<KlempnerData>(data);
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
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'installation', label: 'Installation' },
    { value: 'wartung', label: 'Wartung' },
    { value: 'notfall', label: 'Notfall' },
  ];

  const problemTypeOptions = [
    { value: 'wasserschaden', label: 'Wasserschaden' },
    { value: 'verstopfung', label: 'Verstopfung' },
    { value: 'undichtigkeit', label: 'Undichtigkeit' },
    { value: 'heizung', label: 'Heizung' },
    { value: 'bad_sanierung', label: 'Bad-Sanierung' },
    { value: 'rohr_installation', label: 'Rohr-Installation' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ];

  const roomTypeOptions = [
    { value: 'bad', label: 'Bad' },
    { value: 'kueche', label: 'Küche' },
    { value: 'keller', label: 'Keller' },
    { value: 'waschraum', label: 'Waschraum' },
    { value: 'mehrere_raeume', label: 'Mehrere Räume' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ];

  const buildingTypeOptions = [
    { value: 'einfamilienhaus', label: 'Einfamilienhaus' },
    { value: 'wohnung', label: 'Wohnung' },
    { value: 'gewerbe', label: 'Gewerbe' },
  ];

  const materialProvidedOptions = [
    { value: 'kunde', label: 'Kunde stellt Material' },
    { value: 'handwerker', label: 'Handwerker bringt Material mit' },
    { value: 'gemeinsam', label: 'Gemeinsame Beschaffung' },
  ];

  const handleInputChange = (field: keyof KlempnerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.problemType &&
      formData.roomType &&
      formData.buildingType &&
      formData.materialProvided &&
      typeof formData.accessibilityIssues === 'boolean'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.problemType &&
      formData.roomType &&
      formData.buildingType &&
      formData.materialProvided &&
      typeof formData.accessibilityIssues === 'boolean'
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Klempner-Projektdetails
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

          <FormField label="Art des Problems" required>
            <FormSelect
              value={formData.problemType || ''}
              onChange={value => handleInputChange('problemType', value)}
              options={problemTypeOptions}
              placeholder="Wählen Sie die Art des Problems"
            />
          </FormField>

          <FormField label="Betroffener Raum" required>
            <FormSelect
              value={formData.roomType || ''}
              onChange={value => handleInputChange('roomType', value)}
              options={roomTypeOptions}
              placeholder="Wählen Sie den betroffenen Raum"
            />
          </FormField>

          <FormField label="Gebäudeart" required>
            <FormSelect
              value={formData.buildingType || ''}
              onChange={value => handleInputChange('buildingType', value)}
              options={buildingTypeOptions}
              placeholder="Wählen Sie die Gebäudeart"
            />
          </FormField>

          <FormField label="Materialbereitstellung" required>
            <FormSelect
              value={formData.materialProvided || ''}
              onChange={value => handleInputChange('materialProvided', value)}
              options={materialProvidedOptions}
              placeholder="Wer stellt das Material?"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Erreichbarkeit">
            <FormRadioGroup
              value={formData.accessibilityIssues || ''}
              onChange={value => handleInputChange('accessibilityIssues', value)}
              name="accessibilityIssues"
              options={[
                { value: 'normal', label: 'Normale Erreichbarkeit' },
                {
                  value: 'difficult',
                  label: 'Schwierige Erreichbarkeit (z.B. enge Räume, Dachboden)',
                },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Beschreiben Sie besondere Wünsche, Anforderungen oder Besonderheiten des Auftrags"
              rows={3}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Klempner" />
    </div>
  );
};

export default KlempnerForm;
