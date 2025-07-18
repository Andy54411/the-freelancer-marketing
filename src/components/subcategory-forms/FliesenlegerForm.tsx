'use client';
import React, { useState, useEffect } from 'react';
import { FliesenlegerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';
import { useRouter } from 'next/navigation';

interface FliesenlegerFormProps {
  data: FliesenlegerData;
  onDataChange: (data: FliesenlegerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const FliesenlegerForm: React.FC<FliesenlegerFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<FliesenlegerData>(data);
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
    { value: 'neubau', label: 'Neubau' },
    { value: 'renovierung', label: 'Renovierung' },
    { value: 'reparatur', label: 'Reparatur' },
  ];

  const roomTypeOptions = [
    { value: 'bad', label: 'Bad' },
    { value: 'kueche', label: 'Küche' },
    { value: 'wohnbereich', label: 'Wohnbereich' },
    { value: 'terrasse', label: 'Terrasse' },
    { value: 'balkon', label: 'Balkon' },
    { value: 'mehrere_raeume', label: 'Mehrere Räume' },
  ];

  const tileTypeOptions = [
    { value: 'keramik', label: 'Keramik' },
    { value: 'naturstein', label: 'Naturstein' },
    { value: 'feinsteinzeug', label: 'Feinsteinzeug' },
    { value: 'mosaik', label: 'Mosaik' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const tileSizeOptions = [
    { value: 'klein', label: 'Klein (bis 30x30cm)' },
    { value: 'mittel', label: 'Mittel (30x30 - 60x60cm)' },
    { value: 'groß', label: 'Groß (60x60 - 100x100cm)' },
    { value: 'großformat', label: 'Großformat (über 100x100cm)' },
  ];

  const patternOptions = [
    { value: 'standard', label: 'Standard' },
    { value: 'diagonal', label: 'Diagonal' },
    { value: 'versetzt', label: 'Versetzt' },
    { value: 'muster', label: 'Spezielles Muster' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const preparationWorkOptions = [
    { value: 'benötigt', label: 'Vorarbeiten erforderlich' },
    { value: 'teilweise', label: 'Teilweise erforderlich' },
    { value: 'nicht_nötig', label: 'Nicht erforderlich' },
  ];

  const materialProvidedOptions = [
    { value: 'kunde', label: 'Kunde stellt Material' },
    { value: 'handwerker', label: 'Handwerker bringt Material mit' },
    { value: 'gemeinsam', label: 'Gemeinsame Beschaffung' },
  ];

  const handleInputChange = (field: keyof FliesenlegerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.roomType &&
      formData.tileType &&
      formData.tileSize &&
      formData.pattern &&
      formData.preparationWork &&
      formData.materialProvided &&
      typeof formData.waterproofing === 'boolean'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.roomType &&
      formData.tileType &&
      formData.tileSize &&
      formData.pattern &&
      formData.preparationWork &&
      formData.materialProvided &&
      typeof formData.waterproofing === 'boolean'
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Fliesenleger-Projektdetails
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

          <FormField label="Raumtyp" required>
            <FormSelect
              value={formData.roomType || ''}
              onChange={value => handleInputChange('roomType', value)}
              options={roomTypeOptions}
              placeholder="Wählen Sie den Raumtyp"
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
              placeholder="Fläche in m²"
            />
          </FormField>

          <FormField label="Fliesenart" required>
            <FormSelect
              value={formData.tileType || ''}
              onChange={value => handleInputChange('tileType', value)}
              options={tileTypeOptions}
              placeholder="Wählen Sie die Fliesenart"
            />
          </FormField>

          <FormField label="Fliesengröße" required>
            <FormSelect
              value={formData.tileSize || ''}
              onChange={value => handleInputChange('tileSize', value)}
              options={tileSizeOptions}
              placeholder="Wählen Sie die Fliesengröße"
            />
          </FormField>

          <FormField label="Verlegemuster" required>
            <FormSelect
              value={formData.pattern || ''}
              onChange={value => handleInputChange('pattern', value)}
              options={patternOptions}
              placeholder="Wählen Sie das Verlegemuster"
            />
          </FormField>

          <FormField label="Vorarbeiten" required>
            <FormSelect
              value={formData.preparationWork || ''}
              onChange={value => handleInputChange('preparationWork', value)}
              options={preparationWorkOptions}
              placeholder="Sind Vorarbeiten erforderlich?"
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
          <FormField label="Abdichtung erforderlich">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="waterproofing"
                  checked={formData.waterproofing === true}
                  onChange={() => handleInputChange('waterproofing', true)}
                  className="mr-2"
                />
                Ja, Abdichtung erforderlich
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="waterproofing"
                  checked={formData.waterproofing === false}
                  onChange={() => handleInputChange('waterproofing', false)}
                  className="mr-2"
                />
                Nein, keine Abdichtung erforderlich
              </label>
            </div>
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

      <FormSubmitButton isValid={isFormValid()} subcategory="Fliesenleger" />
    </div>
  );
};

export default FliesenlegerForm;
