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
  FormSubmitButton,
} from './FormComponents';

interface GlaserFormProps {
  data: GlaserData;
  onDataChange: (data: GlaserData) => void;
  onValidationChange: (isValid: boolean) => void;
  hideSubmitButton?: boolean;
}

const GlaserForm: React.FC<GlaserFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
  hideSubmitButton = false,
}) => {
  const [formData, setFormData] = useState<GlaserData>(data);

  const serviceTypeOptions = [
    { value: 'glasreparatur', label: 'Glasreparatur' },
    { value: 'glasersatz', label: 'Glasersatz' },
    { value: 'glasschnitt', label: 'Glasschnitt nach Maß' },
    { value: 'spiegelarbeiten', label: 'Spiegelarbeiten' },
    { value: 'sicherheitsglas', label: 'Sicherheitsglas' },
    { value: 'isolierglas', label: 'Isolierglas' },
    { value: 'duschkabine', label: 'Duschkabinen-Glas' },
    { value: 'notdienst', label: 'Notdienst' },
  ];

  const glassTypeOptions = [
    { value: 'fensterglas', label: 'Fensterglas' },
    { value: 'sicherheitsglas', label: 'Sicherheitsglas' },
    { value: 'isolierglas', label: 'Isolierglas' },
    { value: 'spiegel', label: 'Spiegel' },
    { value: 'duschglas', label: 'Duschkabinen-Glas' },
    { value: 'vitrinenglas', label: 'Vitrinenglas' },
    { value: 'ornamentglas', label: 'Ornamentglas' },
  ];

  const urgencyOptions = [
    { value: 'notfall', label: 'Notfall (sofort)' },
    { value: 'heute', label: 'Heute' },
    { value: 'morgen', label: 'Morgen' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof GlaserData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.glassType &&
      formData.urgency &&
      formData.workDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.glassType &&
      formData.urgency &&
      formData.workDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Glaser Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Was soll gemacht werden?"
            />
          </FormField>

          <FormField label="Glastyp" required>
            <FormSelect
              value={formData.glassType || ''}
              onChange={value => handleInputChange('glassType', value)}
              options={glassTypeOptions}
              placeholder="Welcher Glastyp wird benötigt?"
            />
          </FormField>

          <FormField label="Dringlichkeit" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wie dringend ist es?"
            />
          </FormField>

          <FormField label="Budget-Rahmen">
            <FormInput
              type="text"
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              placeholder="z.B. 200-500 EUR"
            />
          </FormField>

          <FormField label="Maße (LxBxD in cm)">
            <FormInput
              type="text"
              value={formData.dimensions || ''}
              onChange={value => handleInputChange('dimensions', value)}
              placeholder="z.B. 120x80x0.4"
            />
          </FormField>

          <FormField label="Glasstärke (mm)">
            <FormInput
              type="text"
              value={formData.thickness || ''}
              onChange={value => handleInputChange('thickness', value)}
              placeholder="z.B. 4, 6, 8 mm"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Arbeitsbeschreibung" required>
            <FormTextarea
              value={formData.workDescription || ''}
              onChange={value => handleInputChange('workDescription', value)}
              placeholder="Beschreiben Sie genau, was gemacht werden soll..."
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Notdienst erforderlich">
            <FormRadioGroup
              name="emergencyService"
              value={formData.emergencyService || ''}
              onChange={value => handleInputChange('emergencyService', value)}
              options={[
                { value: 'ja', label: 'Ja, Notdienst erforderlich' },
                { value: 'nein', label: 'Nein, regulärer Termin' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton
        isValid={isFormValid()}
        subcategory="Glaser"
        formData={formData}
        hideSubmitButton={hideSubmitButton}
      />
    </div>
  );
};

export default GlaserForm;
