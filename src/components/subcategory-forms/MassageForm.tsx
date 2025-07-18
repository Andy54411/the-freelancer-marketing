import React, { useState, useEffect } from 'react';
import { MassageData } from '@/types/subcategory-forms';
import { FormField, FormSelect, FormSubmitButton, FormTextarea } from './FormComponents';

interface MassageFormProps {
  data: MassageData;
  onDataChange: (data: MassageData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const MassageForm: React.FC<MassageFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<MassageData>(data);

  const serviceTypeOptions = [
    { value: 'klassische_massage', label: 'Klassische Massage' },
    { value: 'entspannungsmassage', label: 'Entspannungsmassage' },
    { value: 'sportmassage', label: 'Sportmassage' },
    { value: 'hot_stone', label: 'Hot Stone Massage' },
    { value: 'thai_massage', label: 'Thai Massage' },
    { value: 'andere', label: 'Andere' },
  ];

  const bodyAreaOptions = [
    { value: 'ganzkörper', label: 'Ganzkörper' },
    { value: 'rücken', label: 'Rücken' },
    { value: 'nacken_schultern', label: 'Nacken & Schultern' },
    { value: 'füße', label: 'Füße' },
    { value: 'andere', label: 'Andere' },
  ];

  const durationOptions = [
    { value: '30', label: '30 Minuten' },
    { value: '45', label: '45 Minuten' },
    { value: '60', label: '60 Minuten' },
    { value: '90', label: '90 Minuten' },
    { value: '120', label: '120 Minuten' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: '14_tägig', label: '14-tägig' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
  ];

  const handleInputChange = (field: keyof MassageData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.bodyArea &&
      formData.duration &&
      formData.frequency &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.bodyArea &&
      formData.duration &&
      formData.frequency &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Massage-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Massage" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Massage"
            />
          </FormField>

          <FormField label="Körperbereich" required>
            <FormSelect
              value={formData.bodyArea || ''}
              onChange={value => handleInputChange('bodyArea', value)}
              options={bodyAreaOptions}
              placeholder="Wählen Sie den Körperbereich"
            />
          </FormField>

          <FormField label="Dauer" required>
            <FormSelect
              value={formData.duration || ''}
              onChange={value => handleInputChange('duration', value)}
              options={durationOptions}
              placeholder="Wählen Sie die Dauer"
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
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihre Massage-Anforderungen detailliert (gesundheitliche Beschwerden, bevorzugte Zeiten, etc.)"
              rows={4}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Massage" />
    </div>
  );
};

export default MassageForm;
