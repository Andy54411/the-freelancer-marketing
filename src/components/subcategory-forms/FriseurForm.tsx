import React, { useState, useEffect } from 'react';
import { FriseurData } from '@/types/subcategory-forms';
import { FormField, FormSelect, FormSubmitButton, FormTextarea } from './FormComponents';

interface FriseurFormProps {
  data: FriseurData;
  onDataChange: (data: FriseurData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const FriseurForm: React.FC<FriseurFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<FriseurData>(data);

  const serviceTypeOptions = [
    { value: 'haarschnitt', label: 'Haarschnitt' },
    { value: 'färben', label: 'Färben' },
    { value: 'styling', label: 'Styling' },
    { value: 'hochsteckfrisur', label: 'Hochsteckfrisur' },
    { value: 'dauerwelle', label: 'Dauerwelle' },
    { value: 'andere', label: 'Andere' },
  ];

  const hairLengthOptions = [
    { value: 'kurz', label: 'Kurz' },
    { value: 'mittel', label: 'Mittel' },
    { value: 'lang', label: 'Lang' },
    { value: 'sehr_lang', label: 'Sehr lang' },
  ];

  const hairTypeOptions = [
    { value: 'glatt', label: 'Glatt' },
    { value: 'wellig', label: 'Wellig' },
    { value: 'lockig', label: 'Lockig' },
    { value: 'kraus', label: 'Kraus' },
  ];

  const occasionOptions = [
    { value: 'alltag', label: 'Alltag' },
    { value: 'hochzeit', label: 'Hochzeit' },
    { value: 'party', label: 'Party/Event' },
    { value: 'business', label: 'Business' },
    { value: 'date', label: 'Date' },
    { value: 'andere', label: 'Andere' },
  ];

  const handleInputChange = (field: keyof FriseurData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.hairLength &&
      formData.hairType &&
      formData.occasion &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.hairLength &&
      formData.hairType &&
      formData.occasion &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Friseur-Projektdetails
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

          <FormField label="Haarlänge" required>
            <FormSelect
              value={formData.hairLength || ''}
              onChange={value => handleInputChange('hairLength', value)}
              options={hairLengthOptions}
              placeholder="Wählen Sie die Haarlänge"
            />
          </FormField>

          <FormField label="Haartyp" required>
            <FormSelect
              value={formData.hairType || ''}
              onChange={value => handleInputChange('hairType', value)}
              options={hairTypeOptions}
              placeholder="Wählen Sie den Haartyp"
            />
          </FormField>

          <FormField label="Anlass" required>
            <FormSelect
              value={formData.occasion || ''}
              onChange={value => handleInputChange('occasion', value)}
              options={occasionOptions}
              placeholder="Wählen Sie den Anlass"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihre Friseur-Wünsche detailliert (gewünschter Look, Wunschtermin, Allergien, etc.)"
              rows={4}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Friseur" />
    </div>
  );
};

export default FriseurForm;
