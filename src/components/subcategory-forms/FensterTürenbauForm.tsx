'use client';
import React, { useState, useEffect } from 'react';
import { FensterTürenbauData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';
import { useRouter } from 'next/navigation';

interface FensterTürenbauFormProps {
  data: FensterTürenbauData;
  onDataChange: (data: FensterTürenbauData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const FensterTürenbauForm: React.FC<FensterTürenbauFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<FensterTürenbauData>(data);
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
    { value: 'austausch', label: 'Austausch' },
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'wartung', label: 'Wartung' },
  ];

  const productTypeOptions = [
    { value: 'fenster', label: 'Fenster' },
    { value: 'türen', label: 'Türen' },
    { value: 'wintergarten', label: 'Wintergarten' },
    { value: 'rollläden', label: 'Rollläden' },
    { value: 'jalousien', label: 'Jalousien' },
  ];

  const materialOptions = [
    { value: 'kunststoff', label: 'Kunststoff' },
    { value: 'holz', label: 'Holz' },
    { value: 'aluminium', label: 'Aluminium' },
    { value: 'holz_alu', label: 'Holz-Aluminium' },
    { value: 'stahl', label: 'Stahl' },
  ];

  const glazingOptions = [
    { value: 'einfach', label: 'Einfachverglasung' },
    { value: 'doppelt', label: 'Doppelverglasung' },
    { value: 'dreifach', label: 'Dreifachverglasung' },
    { value: 'schallschutz', label: 'Schallschutzverglasung' },
    { value: 'sicherheit', label: 'Sicherheitsverglasung' },
  ];

  const openingTypeOptions = [
    { value: 'dreh', label: 'Dreh' },
    { value: 'kipp', label: 'Kipp' },
    { value: 'dreh_kipp', label: 'Dreh-Kipp' },
    { value: 'schiebe', label: 'Schiebe' },
    { value: 'fest', label: 'Festverglasung' },
  ];

  const energyClassOptions = [
    { value: 'standard', label: 'Standard' },
    { value: 'energiespar', label: 'Energiesparend' },
    { value: 'passivhaus', label: 'Passivhaus' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const handleInputChange = (field: keyof FensterTürenbauData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.productType &&
      formData.material &&
      formData.glazing &&
      formData.openingType &&
      formData.energyClass &&
      typeof formData.securityFeatures === 'boolean'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.productType &&
      formData.material &&
      formData.glazing &&
      formData.openingType &&
      formData.energyClass &&
      typeof formData.securityFeatures === 'boolean'
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Fenster- & Türenbau Projektdetails
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

          <FormField label="Produkttyp" required>
            <FormSelect
              value={formData.productType || ''}
              onChange={value => handleInputChange('productType', value)}
              options={productTypeOptions}
              placeholder="Wählen Sie den Produkttyp"
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

          <FormField label="Verglasung" required>
            <FormSelect
              value={formData.glazing || ''}
              onChange={value => handleInputChange('glazing', value)}
              options={glazingOptions}
              placeholder="Wählen Sie die Verglasung"
            />
          </FormField>

          <FormField label="Öffnungsart" required>
            <FormSelect
              value={formData.openingType || ''}
              onChange={value => handleInputChange('openingType', value)}
              options={openingTypeOptions}
              placeholder="Wählen Sie die Öffnungsart"
            />
          </FormField>

          <FormField label="Energieeffizienz" required>
            <FormSelect
              value={formData.energyClass || ''}
              onChange={value => handleInputChange('energyClass', value)}
              options={energyClassOptions}
              placeholder="Wählen Sie die Energieeffizienz"
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

          <FormField label="Maße (B x H in cm)">
            <FormInput
              type="text"
              value={formData.dimensions || ''}
              onChange={value => handleInputChange('dimensions', value)}
              placeholder="z.B. 120 x 150"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Sicherheitsfeatures gewünscht">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="securityFeatures"
                  checked={formData.securityFeatures === true}
                  onChange={() => handleInputChange('securityFeatures', true)}
                  className="mr-2"
                />
                Ja, Sicherheitsfeatures erwünscht
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="securityFeatures"
                  checked={formData.securityFeatures === false}
                  onChange={() => handleInputChange('securityFeatures', false)}
                  className="mr-2"
                />
                Nein, Standard ausreichend
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

      <FormSubmitButton isValid={isFormValid()} subcategory="FensterTürenbau" />
    </div>
  );
}

export default FensterTürenbauForm;
