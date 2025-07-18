'use client';
import React, { useState, useEffect } from 'react';
import { GlaserData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';
import { useRouter } from 'next/navigation';

interface GlaserFormProps {
  data: GlaserData;
  onDataChange: (data: GlaserData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const GlaserForm: React.FC<GlaserFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<GlaserData>(data);
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
        {/* Validierungsanzeige */}
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

        {/* Submit Button - wird NUR angezeigt wenn das Formular vollständig ausgefüllt ist */}
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
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'austausch', label: 'Austausch' },
    { value: 'notdienst', label: 'Notdienst' },
  ];

  const glassTypeOptions = [
    { value: 'einfachglas', label: 'Einfachglas' },
    { value: 'isolierglas', label: 'Isolierglas' },
    { value: 'sicherheitsglas', label: 'Sicherheitsglas' },
    { value: 'verbundglas', label: 'Verbundglas' },
    { value: 'thermoglas', label: 'Thermoglas' },
    { value: 'sonnenschutzglas', label: 'Sonnenschutzglas' },
  ];

  const applicationOptions = [
    { value: 'fenster', label: 'Fenster' },
    { value: 'türen', label: 'Türen' },
    { value: 'schaufenster', label: 'Schaufenster' },
    { value: 'spiegel', label: 'Spiegel' },
    { value: 'duschkabine', label: 'Duschkabine' },
    { value: 'wintergarten', label: 'Wintergarten' },
    { value: 'vitrine', label: 'Vitrine' },
  ];

  const thicknessOptions = [
    { value: '4', label: '4 mm' },
    { value: '6', label: '6 mm' },
    { value: '8', label: '8 mm' },
    { value: '10', label: '10 mm' },
    { value: '12', label: '12 mm' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const frameTypeOptions = [
    { value: 'holz', label: 'Holzrahmen' },
    { value: 'alu', label: 'Aluminiumrahmen' },
    { value: 'kunststoff', label: 'Kunststoffrahmen' },
    { value: 'stahl', label: 'Stahlrahmen' },
    { value: 'rahmenlos', label: 'Rahmenlos' },
  ];

  const handleInputChange = (field: keyof GlaserData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.glassType &&
      formData.application &&
      formData.thickness &&
      formData.frameType &&
      typeof formData.measurement === 'string'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.glassType &&
      formData.application &&
      formData.thickness &&
      formData.frameType &&
      typeof formData.measurement === 'string'
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Glaser-Projektdetails
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

          <FormField label="Glasart" required>
            <FormSelect
              value={formData.glassType || ''}
              onChange={value => handleInputChange('glassType', value)}
              options={glassTypeOptions}
              placeholder="Wählen Sie die Glasart"
            />
          </FormField>

          <FormField label="Verwendung" required>
            <FormSelect
              value={formData.application || ''}
              onChange={value => handleInputChange('application', value)}
              options={applicationOptions}
              placeholder="Wählen Sie die Verwendung"
            />
          </FormField>

          <FormField label="Glasstärke" required>
            <FormSelect
              value={formData.thickness || ''}
              onChange={value => handleInputChange('thickness', value)}
              options={thicknessOptions}
              placeholder="Wählen Sie die Glasstärke"
            />
          </FormField>

          <FormField label="Rahmentyp" required>
            <FormSelect
              value={formData.frameType || ''}
              onChange={value => handleInputChange('frameType', value)}
              options={frameTypeOptions}
              placeholder="Wählen Sie den Rahmentyp"
            />
          </FormField>

          <FormField label="Maße (B x H in cm)">
            <FormInput
              type="text"
              value={formData.dimensions || ''}
              onChange={value => handleInputChange('dimensions', value)}
              placeholder="z.B. 120 x 80"
            />
          </FormField>

          <FormField label="Anzahl Scheiben">
            <FormInput
              type="number"
              value={formData.quantity?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'quantity',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Scheiben"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Aufmaß vor Ort erforderlich">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="measurement"
                  checked={formData.measurement === 'benötigt'}
                  onChange={() => handleInputChange('measurement', 'benötigt')}
                  className="mr-2"
                />
                Ja, Aufmaß vor Ort erforderlich
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="measurement"
                  checked={formData.measurement === 'vorhanden'}
                  onChange={() => handleInputChange('measurement', 'vorhanden')}
                  className="mr-2"
                />
                Nein, Maße sind bekannt
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

      <FormSubmitButton isValid={isFormValid()} subcategory="Glaser" />
    </div>
  );
};

export default GlaserForm;
