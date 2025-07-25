'use client';
import React, { useState, useEffect } from 'react';
import { FensterputzerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';
import { useRouter } from 'next/navigation';

interface FensterputzerFormProps {
  data: FensterputzerData;
  onDataChange: (data: FensterputzerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const FensterputzerForm: React.FC<FensterputzerFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<FensterputzerData>(data);
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
    { value: 'einmalig', label: 'Einmalige Reinigung' },
    { value: 'regelmäßig', label: 'Regelmäßige Reinigung' },
    { value: 'grundreinigung', label: 'Grundreinigung' },
    { value: 'nach_bau', label: 'Baureinigung' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'alle_2_wochen', label: 'Alle 2 Wochen' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'vierteljährlich', label: 'Vierteljährlich' },
    { value: 'halbjährlich', label: 'Halbjährlich' },
  ];

  const buildingTypeOptions = [
    { value: 'einfamilienhaus', label: 'Einfamilienhaus' },
    { value: 'mehrfamilienhaus', label: 'Mehrfamilienhaus' },
    { value: 'büro', label: 'Bürogebäude' },
    { value: 'gewerbe', label: 'Gewerbegebäude' },
    { value: 'hochhaus', label: 'Hochhaus' },
  ];

  const accessibilityOptions = [
    { value: 'ebenerdig', label: 'Ebenerdig' },
    { value: 'leiter', label: 'Mit Leiter erreichbar' },
    { value: 'gerüst', label: 'Gerüst erforderlich' },
    { value: 'hebebühne', label: 'Hebebühne erforderlich' },
    { value: 'seilzugang', label: 'Seilzugang erforderlich' },
  ];

  const windowTypeOptions = [
    { value: 'standard', label: 'Standard Fenster' },
    { value: 'dachfenster', label: 'Dachfenster' },
    { value: 'schaufenster', label: 'Schaufenster' },
    { value: 'wintergarten', label: 'Wintergarten' },
    { value: 'balkon', label: 'Balkontüren' },
  ];

  const additionalServicesOptions = [
    { value: 'rahmen', label: 'Rahmen reinigen' },
    { value: 'rollläden', label: 'Rollläden reinigen' },
    { value: 'jalousien', label: 'Jalousien reinigen' },
    { value: 'insektenschutz', label: 'Insektenschutz reinigen' },
  ];

  const handleInputChange = (field: keyof FensterputzerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.frequency &&
      formData.buildingType &&
      formData.accessibility &&
      formData.windowType &&
      typeof formData.insideAndOutside === 'boolean'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.frequency &&
      formData.buildingType &&
      formData.accessibility &&
      formData.windowType &&
      typeof formData.insideAndOutside === 'boolean'
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Fensterputzer-Projektdetails
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

          <FormField label="Häufigkeit" required>
            <FormSelect
              value={formData.frequency || ''}
              onChange={value => handleInputChange('frequency', value)}
              options={frequencyOptions}
              placeholder="Wählen Sie die Häufigkeit"
            />
          </FormField>

          <FormField label="Gebäudetyp" required>
            <FormSelect
              value={formData.buildingType || ''}
              onChange={value => handleInputChange('buildingType', value)}
              options={buildingTypeOptions}
              placeholder="Wählen Sie den Gebäudetyp"
            />
          </FormField>

          <FormField label="Zugänglichkeit" required>
            <FormSelect
              value={formData.accessibility || ''}
              onChange={value => handleInputChange('accessibility', value)}
              options={accessibilityOptions}
              placeholder="Wie sind die Fenster zugänglich?"
            />
          </FormField>

          <FormField label="Fenstertyp" required>
            <FormSelect
              value={formData.windowType || ''}
              onChange={value => handleInputChange('windowType', value)}
              options={windowTypeOptions}
              placeholder="Wählen Sie den Fenstertyp"
            />
          </FormField>

          <FormField label="Anzahl Fenster">
            <FormInput
              type="number"
              value={formData.numberOfWindows?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfWindows',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Fenster"
            />
          </FormField>

          <FormField label="Stockwerke">
            <FormInput
              type="number"
              value={formData.floors?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'floors',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Stockwerke"
            />
          </FormField>

          <FormField label="Fensterfläche (m²)">
            <FormInput
              type="number"
              value={formData.windowArea?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'windowArea',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Geschätzte Fensterfläche"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Innen und außen reinigen">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="insideAndOutside"
                  checked={formData.insideAndOutside === true}
                  onChange={() => handleInputChange('insideAndOutside', true)}
                  className="mr-2"
                />
                Ja, innen und außen
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="insideAndOutside"
                  checked={formData.insideAndOutside === false}
                  onChange={() => handleInputChange('insideAndOutside', false)}
                  className="mr-2"
                />
                Nein, nur außen
              </label>
            </div>
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Services">
            <FormCheckboxGroup
              options={additionalServicesOptions}
              value={formData.additionalServices || []}
              onChange={value => handleInputChange('additionalServices', value)}
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

      <FormSubmitButton isValid={isFormValid()} subcategory="Fensterputzer" />
    </div>
  );
}

export default FensterputzerForm;
