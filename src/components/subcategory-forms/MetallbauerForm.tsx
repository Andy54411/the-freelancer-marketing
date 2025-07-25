'use client';
import React, { useState, useEffect } from 'react';
import { MetallbauerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';
import { useRouter } from 'next/navigation';

interface MetallbauerFormProps {
  data: MetallbauerData;
  onDataChange: (data: MetallbauerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const MetallbauerForm: React.FC<MetallbauerFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<MetallbauerData>(data);
  const router = useRouter();
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
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'renovierung', label: 'Renovierung' },
    { value: 'wartung', label: 'Wartung' },
  ];

  const workTypeOptions = [
    { value: 'treppen', label: 'Treppen' },
    { value: 'geländer', label: 'Geländer' },
    { value: 'zäune', label: 'Zäune' },
    { value: 'tore', label: 'Tore' },
    { value: 'balkone', label: 'Balkone' },
    { value: 'carports', label: 'Carports' },
    { value: 'überdachungen', label: 'Überdachungen' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ];

  const materialOptions = [
    { value: 'stahl', label: 'Stahl' },
    { value: 'edelstahl', label: 'Edelstahl' },
    { value: 'aluminium', label: 'Aluminium' },
    { value: 'verzinkt', label: 'Verzinkter Stahl' },
    { value: 'corten', label: 'Cortenstahl' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const finishOptions = [
    { value: 'pulverbeschichtet', label: 'Pulverbeschichtet' },
    { value: 'lackiert', label: 'Lackiert' },
    { value: 'verzinkt', label: 'Verzinkt' },
    { value: 'eloxiert', label: 'Eloxiert' },
    { value: 'natur', label: 'Natur (unbehandelt)' },
  ];

  const connectionTypeOptions = [
    { value: 'geschweißt', label: 'Geschweißt' },
    { value: 'geschraubt', label: 'Geschraubt' },
    { value: 'genietet', label: 'Genietet' },
    { value: 'geklebt', label: 'Geklebt' },
    { value: 'kombiniert', label: 'Kombiniert' },
  ];

  const complexityOptions = [
    { value: 'einfach', label: 'Einfach' },
    { value: 'mittel', label: 'Mittel' },
    { value: 'komplex', label: 'Komplex' },
    { value: 'sehr_komplex', label: 'Sehr komplex' },
  ];

  const handleInputChange = (field: keyof MetallbauerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.workType &&
      formData.material &&
      formData.finish &&
      formData.connectionType &&
      formData.complexity &&
      typeof formData.weatherResistant === 'boolean'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.workType &&
      formData.material &&
      formData.finish &&
      formData.connectionType &&
      formData.complexity &&
      typeof formData.weatherResistant === 'boolean'
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Metallbauer-Projektdetails
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

          <FormField label="Art der Metallbauarbeit" required>
            <FormSelect
              value={formData.workType || ''}
              onChange={value => handleInputChange('workType', value)}
              options={workTypeOptions}
              placeholder="Wählen Sie die Art der Metallbauarbeit"
            />
          </FormField>

          <FormField label="Material" required>
            <FormSelect
              value={formData.material || ''}
              onChange={value => handleInputChange('material', value)}
              options={materialOptions}
              placeholder="Wählen Sie das Material"
            />
          </FormField>

          <FormField label="Oberflächenbehandlung" required>
            <FormSelect
              value={formData.finish || ''}
              onChange={value => handleInputChange('finish', value)}
              options={finishOptions}
              placeholder="Wählen Sie die Oberflächenbehandlung"
            />
          </FormField>

          <FormField label="Verbindungsart" required>
            <FormSelect
              value={formData.connectionType || ''}
              onChange={value => handleInputChange('connectionType', value)}
              options={connectionTypeOptions}
              placeholder="Wählen Sie die Verbindungsart"
            />
          </FormField>

          <FormField label="Komplexität" required>
            <FormSelect
              value={formData.complexity || ''}
              onChange={value => handleInputChange('complexity', value)}
              options={complexityOptions}
              placeholder="Wählen Sie die Komplexität"
            />
          </FormField>

          <FormField label="Materialstärke (mm)">
            <FormInput
              type="number"
              value={formData.thickness?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'thickness',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Materialstärke in mm"
            />
          </FormField>

          <FormField label="Gewicht (kg)">
            <FormInput
              type="number"
              value={formData.weight?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'weight',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Geschätztes Gewicht in kg"
            />
          </FormField>

          <FormField label="Maße (L x B x H in cm)">
            <FormInput
              type="text"
              value={formData.dimensions || ''}
              onChange={value => handleInputChange('dimensions', value)}
              placeholder="z.B. 200 x 100 x 120"
            />
          </FormField>

          <FormField label="Anzahl Elemente">
            <FormInput
              type="number"
              value={formData.quantity?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'quantity',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Elemente"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Witterungsbeständigkeit erforderlich">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="weatherResistant"
                  checked={formData.weatherResistant === true}
                  onChange={() => handleInputChange('weatherResistant', true)}
                  className="mr-2"
                />
                Ja, für Außeneinsatz
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="weatherResistant"
                  checked={formData.weatherResistant === false}
                  onChange={() => handleInputChange('weatherResistant', false)}
                  className="mr-2"
                />
                Nein, nur für Innenbereich
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

      <FormSubmitButton isValid={isFormValid()} subcategory="Metallbauer" />
    </div>
  );
}

export default MetallbauerForm;
