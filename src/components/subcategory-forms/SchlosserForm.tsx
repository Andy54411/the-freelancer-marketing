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
  FormSubmitButton,
} from './FormComponents';

interface SchlosserFormProps {
  data: SchlosserData;
  onDataChange: (data: SchlosserData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SchlosserForm: React.FC<SchlosserFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<SchlosserData>(data);

  const serviceTypeOptions = [
    { value: 'türöffnung', label: 'Türöffnung/Aussperrung' },
    { value: 'schloss_wechsel', label: 'Schloss wechseln' },
    { value: 'schloss_reparatur', label: 'Schloss reparieren' },
    { value: 'schlüssel_nachmachen', label: 'Schlüssel nachmachen' },
    { value: 'sicherheitstechnik', label: 'Sicherheitstechnik installieren' },
    { value: 'tresor', label: 'Tresor/Safe' },
    { value: 'notdienst', label: 'Notdienst' },
    { value: 'beratung', label: 'Sicherheitsberatung' },
  ];

  const lockTypeOptions = [
    { value: 'haustür', label: 'Haustür-Schloss' },
    { value: 'wohnungstür', label: 'Wohnungstür-Schloss' },
    { value: 'kellertür', label: 'Kellertür-Schloss' },
    { value: 'briefkasten', label: 'Briefkasten-Schloss' },
    { value: 'auto', label: 'Auto-Schloss' },
    { value: 'möbel', label: 'Möbel-Schloss' },
    { value: 'fenster', label: 'Fenster-Schloss' },
  ];

  const urgencyOptions = [
    { value: 'notfall', label: 'Notfall (sofort)' },
    { value: 'heute', label: 'Heute' },
    { value: 'morgen', label: 'Morgen' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof SchlosserData, value: any) => {
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
          Schlosser Service Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Was wird benötigt?"
            />
          </FormField>

          <FormField label="Art des Schlosses">
            <FormSelect
              value={formData.lockType || ''}
              onChange={value => handleInputChange('lockType', value)}
              options={lockTypeOptions}
              placeholder="Welches Schloss ist betroffen?"
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
              placeholder="z.B. 100-300 EUR"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Problembeschreibung" required>
            <FormTextarea
              value={formData.problemDescription || ''}
              onChange={value => handleInputChange('problemDescription', value)}
              placeholder="Beschreiben Sie das Problem oder was gemacht werden soll..."
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

        <div className="mt-4">
          <FormField label="Zusätzliche Services">
            <FormCheckboxGroup
              value={formData.additionalServices || []}
              onChange={value => handleInputChange('additionalServices', value)}
              options={[
                { value: 'sicherheitsberatung', label: 'Sicherheitsberatung' },
                { value: 'mehrere_schlüssel', label: 'Mehrere Schlüssel anfertigen' },
                { value: 'schließanlage', label: 'Schließanlage' },
                { value: 'elektronisches_schloss', label: 'Elektronisches Schloss' },
                { value: 'überwachung', label: 'Überwachungstechnik' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Schlosser" formData={formData} />
    </div>
  );
};

export default SchlosserForm;
