'use client';
import React, { useState, useEffect } from 'react';
import { SchlosserData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';
import { useRouter } from 'next/navigation';

interface SchlosserFormProps {
  data: SchlosserData;
  onDataChange: (data: SchlosserData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SchlosserForm: React.FC<SchlosserFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<SchlosserData>(data);
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
    { value: 'austausch', label: 'Austausch' },
    { value: 'neubau', label: 'Neubau' },
    { value: 'notfall', label: 'Notfall' },
    { value: 'öffnung', label: 'Türöffnung' },
  ];

  const workTypeOptions = [
    { value: 'schloss', label: 'Schlossarbeit' },
    { value: 'türbeschlag', label: 'Türbeschlag' },
    { value: 'sicherheit', label: 'Sicherheitstechnik' },
    { value: 'zaun', label: 'Zaun' },
    { value: 'gitter', label: 'Gitter' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ];

  const lockTypeOptions = [
    { value: 'standardschloss', label: 'Standardschloss' },
    { value: 'sicherheitsschloss', label: 'Sicherheitsschloss' },
    { value: 'elektronisch', label: 'Elektronisches Schloss' },
    { value: 'mehrfachverriegelung', label: 'Mehrfachverriegelung' },
    { value: 'tresorschloss', label: 'Tresorschloss' },
  ];

  const securityLevelOptions = [
    { value: 'standard', label: 'Standard' },
    { value: 'erhöht', label: 'Erhöht' },
    { value: 'hoch', label: 'Hoch' },
    { value: 'sehr_hoch', label: 'Sehr hoch' },
  ];

  const materialOptions = [
    { value: 'stahl', label: 'Stahl' },
    { value: 'edelstahl', label: 'Edelstahl' },
    { value: 'messing', label: 'Messing' },
    { value: 'aluminium', label: 'Aluminium' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const handleInputChange = (field: keyof SchlosserData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.workType &&
      formData.lockType &&
      formData.securityLevel &&
      formData.material &&
      formData.keyService &&
      formData.installation
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.workType &&
      formData.lockType &&
      formData.securityLevel &&
      formData.material &&
      formData.keyService &&
      formData.installation
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Schlosser-Projektdetails
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

          <FormField label="Art der Schlosserarbeit" required>
            <FormSelect
              value={formData.workType || ''}
              onChange={value => handleInputChange('workType', value)}
              options={workTypeOptions}
              placeholder="Wählen Sie die Art der Schlosserarbeit"
            />
          </FormField>

          <FormField label="Schlosstyp" required>
            <FormSelect
              value={formData.lockType || ''}
              onChange={value => handleInputChange('lockType', value)}
              options={lockTypeOptions}
              placeholder="Wählen Sie den Schlosstyp"
            />
          </FormField>

          <FormField label="Sicherheitsstufe" required>
            <FormSelect
              value={formData.securityLevel || ''}
              onChange={value => handleInputChange('securityLevel', value)}
              options={securityLevelOptions}
              placeholder="Wählen Sie die Sicherheitsstufe"
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

          <FormField label="Schlüsselservice" required>
            <FormSelect
              value={formData.keyService || ''}
              onChange={value => handleInputChange('keyService', value)}
              options={[
                { value: 'inklusive', label: 'Inklusive' },
                { value: 'separat', label: 'Separat' },
                { value: 'nicht_nötig', label: 'Nicht nötig' },
              ]}
              placeholder="Schlüsselservice erforderlich?"
            />
          </FormField>

          <FormField label="Installation" required>
            <FormSelect
              value={formData.installation || ''}
              onChange={value => handleInputChange('installation', value)}
              options={[
                { value: 'inklusive', label: 'Inklusive' },
                { value: 'separat', label: 'Separat' },
                { value: 'nicht_nötig', label: 'Nicht nötig' },
              ]}
              placeholder="Installation erforderlich?"
            />
          </FormField>

          <FormField label="Anzahl Schlösser">
            <FormInput
              type="number"
              value={formData.quantity?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'quantity',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Schlösser"
            />
          </FormField>

          <FormField label="Anzahl Schlüssel">
            <FormInput
              type="number"
              value={formData.keyQuantity?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'keyQuantity',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Schlüssel"
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

      <FormSubmitButton isValid={isFormValid()} subcategory="Schlosser" />
    </div>
  );
};

export default SchlosserForm;
