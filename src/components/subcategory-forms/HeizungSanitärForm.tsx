'use client';
import React, { useState, useEffect } from 'react';
import { HeizungSanitärData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';
import { useRouter } from 'next/navigation';

interface HeizungSanitärFormProps {
  data: HeizungSanitärData;
  onDataChange: (data: HeizungSanitärData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const HeizungSanitärForm: React.FC<HeizungSanitärFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<HeizungSanitärData>(data);
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
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'installation', label: 'Installation' },
    { value: 'wartung', label: 'Wartung' },
    { value: 'notfall', label: 'Notfall' },
    { value: 'modernisierung', label: 'Modernisierung' },
  ];

  const systemTypeOptions = [
    { value: 'heizung', label: 'Heizung' },
    { value: 'sanitär', label: 'Sanitär' },
    { value: 'lüftung', label: 'Lüftung' },
    { value: 'komplettsystem', label: 'Komplettsystem' },
  ];

  const buildingTypeOptions = [
    { value: 'einfamilienhaus', label: 'Einfamilienhaus' },
    { value: 'wohnung', label: 'Wohnung' },
    { value: 'gewerbe', label: 'Gewerbe' },
    { value: 'neubau', label: 'Neubau' },
  ];

  const heatingTypeOptions = [
    { value: 'gas', label: 'Gas' },
    { value: 'öl', label: 'Öl' },
    { value: 'wärmepumpe', label: 'Wärmepumpe' },
    { value: 'fernwärme', label: 'Fernwärme' },
    { value: 'solar', label: 'Solar' },
    { value: 'holz', label: 'Holz' },
  ];

  const materialProvidedOptions = [
    { value: 'kunde', label: 'Kunde stellt Material' },
    { value: 'handwerker', label: 'Handwerker bringt Material mit' },
    { value: 'gemeinsam', label: 'Gemeinsame Beschaffung' },
  ];

  const handleInputChange = (field: keyof HeizungSanitärData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.systemType &&
      formData.buildingType &&
      formData.materialProvided &&
      typeof formData.certificationNeeded === 'boolean'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.systemType &&
      formData.buildingType &&
      formData.materialProvided &&
      typeof formData.certificationNeeded === 'boolean'
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Heizungsbau & Sanitär-Projektdetails
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

          <FormField label="Systemtyp" required>
            <FormSelect
              value={formData.systemType || ''}
              onChange={value => handleInputChange('systemType', value)}
              options={systemTypeOptions}
              placeholder="Wählen Sie den Systemtyp"
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
              placeholder="Anzahl der betroffenen Räume"
            />
          </FormField>

          <FormField label="Heizungsart">
            <FormSelect
              value={formData.heatingType || ''}
              onChange={value => handleInputChange('heatingType', value)}
              options={heatingTypeOptions}
              placeholder="Wählen Sie die Heizungsart"
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
          <FormField label="Zertifizierung erforderlich">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="certificationNeeded"
                  checked={formData.certificationNeeded === true}
                  onChange={() => handleInputChange('certificationNeeded', true)}
                  className="mr-2"
                />
                Ja, Zertifizierung erforderlich
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="certificationNeeded"
                  checked={formData.certificationNeeded === false}
                  onChange={() => handleInputChange('certificationNeeded', false)}
                  className="mr-2"
                />
                Nein, keine Zertifizierung erforderlich
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

      <FormSubmitButton isValid={isFormValid()} subcategory="HeizungSanitär" />
    </div>
  );
}

export default HeizungSanitärForm;
