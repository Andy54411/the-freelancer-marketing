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
  FormSubmitButton,
} from './FormComponents';

interface HeizungSanitärFormProps {
  data: HeizungSanitärData;
  onDataChange: (data: HeizungSanitärData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const HeizungSanitärForm: React.FC<HeizungSanitärFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<HeizungSanitärData>(data);

  const serviceTypeOptions = [
    { value: 'heizung_reparatur', label: 'Heizung Reparatur' },
    { value: 'heizung_wartung', label: 'Heizung Wartung' },
    { value: 'heizung_installation', label: 'Heizung Installation' },
    { value: 'sanitär_reparatur', label: 'Sanitär Reparatur' },
    { value: 'sanitär_installation', label: 'Sanitär Installation' },
    { value: 'rohrreinigung', label: 'Rohrreinigung' },
    { value: 'notdienst', label: 'Notdienst' },
    { value: 'beratung', label: 'Beratung' },
  ];

  const heatingTypeOptions = [
    { value: 'gas', label: 'Gasheizung' },
    { value: 'öl', label: 'Ölheizung' },
    { value: 'wärmepumpe', label: 'Wärmepumpe' },
    { value: 'fernwärme', label: 'Fernwärme' },
    { value: 'pellets', label: 'Pelletheizung' },
    { value: 'elektro', label: 'Elektroheizung' },
    { value: 'solar', label: 'Solarthermie' },
  ];

  const urgencyOptions = [
    { value: 'notfall', label: 'Notfall (sofort)' },
    { value: 'dringend', label: 'Dringend (heute)' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof HeizungSanitärData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.urgency &&
      formData.problemDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.urgency &&
      formData.problemDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Heizung & Sanitär Projektdetails
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

          <FormField label="Heizungstyp">
            <FormSelect
              value={formData.heatingType || ''}
              onChange={value => handleInputChange('heatingType', value)}
              options={heatingTypeOptions}
              placeholder="Welche Heizung ist vorhanden?"
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
        </div>

        <div className="mt-4">
          <FormField label="Problembeschreibung" required>
            <FormTextarea
              value={formData.problemDescription || ''}
              onChange={value => handleInputChange('problemDescription', value)}
              placeholder="Beschreiben Sie das Problem oder die gewünschte Arbeit..."
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Betroffene Bereiche">
            <FormCheckboxGroup
              value={formData.affectedAreas || []}
              onChange={value => handleInputChange('affectedAreas', value)}
              options={[
                { value: 'badezimmer', label: 'Badezimmer' },
                { value: 'küche', label: 'Küche' },
                { value: 'heizungsraum', label: 'Heizungsraum' },
                { value: 'gäste_wc', label: 'Gäste-WC' },
                { value: 'keller', label: 'Keller' },
                { value: 'dachboden', label: 'Dachboden' },
              ]}
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

      <FormSubmitButton isValid={isFormValid()} subcategory="Heizung & Sanitär" formData={formData} />
    </div>
  );
};

export default HeizungSanitärForm;
