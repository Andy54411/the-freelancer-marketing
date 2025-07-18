'use client';
import React, { useState, useEffect } from 'react';
import { DachdeckerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';
import { useRouter } from 'next/navigation';

interface DachdeckerFormProps {
  data: DachdeckerData;
  onDataChange: (data: DachdeckerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const DachdeckerForm: React.FC<DachdeckerFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<DachdeckerData>(data);
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
    { value: 'sanierung', label: 'Dachsanierung' },
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'wartung', label: 'Wartung' },
    { value: 'inspektion', label: 'Inspektion' },
  ];

  const roofTypeOptions = [
    { value: 'steildach', label: 'Steildach' },
    { value: 'flachdach', label: 'Flachdach' },
    { value: 'pultdach', label: 'Pultdach' },
    { value: 'satteldach', label: 'Satteldach' },
    { value: 'walmdach', label: 'Walmdach' },
  ];

  const materialOptions = [
    { value: 'ziegel', label: 'Ziegel' },
    { value: 'schiefer', label: 'Schiefer' },
    { value: 'beton', label: 'Betondachsteine' },
    { value: 'blech', label: 'Metallblech' },
    { value: 'bitumen', label: 'Bitumen' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const buildingTypeOptions = [
    { value: 'einfamilienhaus', label: 'Einfamilienhaus' },
    { value: 'mehrfamilienhaus', label: 'Mehrfamilienhaus' },
    { value: 'gewerbe', label: 'Gewerbegebäude' },
    { value: 'industrie', label: 'Industriegebäude' },
    { value: 'landwirtschaft', label: 'Landwirtschaftsgebäude' },
  ];

  const accessibilityOptions = [
    { value: 'einfach', label: 'Einfach zugänglich' },
    { value: 'erschwert', label: 'Erschwert zugänglich' },
    { value: 'sehr_schwer', label: 'Sehr schwer zugänglich' },
  ];

  const handleInputChange = (field: keyof DachdeckerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.roofType &&
      formData.material &&
      formData.buildingType &&
      formData.accessibility &&
      typeof formData.scaffoldingNeeded === 'boolean'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.roofType &&
      formData.material &&
      formData.buildingType &&
      formData.accessibility &&
      typeof formData.scaffoldingNeeded === 'boolean'
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Dachdecker-Projektdetails
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

          <FormField label="Dachtyp" required>
            <FormSelect
              value={formData.roofType || ''}
              onChange={value => handleInputChange('roofType', value)}
              options={roofTypeOptions}
              placeholder="Wählen Sie den Dachtyp"
            />
          </FormField>

          <FormField label="Dachfläche (m²)">
            <FormInput
              type="number"
              value={formData.roofArea?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'roofArea',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Dachfläche in m²"
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
              placeholder="Wie ist die Zugänglichkeit?"
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
        </div>

        <div className="mt-4">
          <FormField label="Gerüst erforderlich">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="scaffoldingNeeded"
                  checked={formData.scaffoldingNeeded === true}
                  onChange={() => handleInputChange('scaffoldingNeeded', true)}
                  className="mr-2"
                />
                Ja, Gerüst erforderlich
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="scaffoldingNeeded"
                  checked={formData.scaffoldingNeeded === false}
                  onChange={() => handleInputChange('scaffoldingNeeded', false)}
                  className="mr-2"
                />
                Nein, kein Gerüst erforderlich
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

      <FormSubmitButton isValid={isFormValid()} subcategory="Dachdecker" />
    </div>
  );
};

export default DachdeckerForm;
