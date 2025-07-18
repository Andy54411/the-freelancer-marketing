import React, { useState, useEffect } from 'react';
import { PhysiotherapieData } from '@/types/subcategory-forms';
import { FormField, FormSelect, FormSubmitButton, FormTextarea } from './FormComponents';

interface PhysiotherapieFormProps {
  data: PhysiotherapieData;
  onDataChange: (data: PhysiotherapieData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const PhysiotherapieForm: React.FC<PhysiotherapieFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<PhysiotherapieData>(data);

  const treatmentTypeOptions = [
    { value: 'krankengymnastik', label: 'Krankengymnastik' },
    { value: 'manuelle_therapie', label: 'Manuelle Therapie' },
    { value: 'massage', label: 'Massage' },
    { value: 'lymphdrainage', label: 'Lymphdrainage' },
    { value: 'sportphysiotherapie', label: 'Sportphysiotherapie' },
    { value: 'andere', label: 'Andere' },
  ];

  const bodyAreaOptions = [
    { value: 'rücken', label: 'Rücken' },
    { value: 'nacken', label: 'Nacken' },
    { value: 'schulter', label: 'Schulter' },
    { value: 'knie', label: 'Knie' },
    { value: 'hüfte', label: 'Hüfte' },
    { value: 'andere', label: 'Andere' },
  ];

  const conditionOptions = [
    { value: 'rückenschmerzen', label: 'Rückenschmerzen' },
    { value: 'nackenschmerzen', label: 'Nackenschmerzen' },
    { value: 'gelenkprobleme', label: 'Gelenkprobleme' },
    { value: 'sportverletzung', label: 'Sportverletzung' },
    { value: 'nach_operation', label: 'Nach Operation' },
    { value: 'andere', label: 'Andere' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: '2x_woche', label: '2x pro Woche' },
    { value: '3x_woche', label: '3x pro Woche' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
  ];

  const handleInputChange = (field: keyof PhysiotherapieData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.treatmentType &&
      formData.bodyArea &&
      formData.condition &&
      formData.frequency &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.treatmentType &&
      formData.bodyArea &&
      formData.condition &&
      formData.frequency &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Physiotherapie-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Behandlungsart" required>
            <FormSelect
              value={formData.treatmentType || ''}
              onChange={value => handleInputChange('treatmentType', value)}
              options={treatmentTypeOptions}
              placeholder="Wählen Sie die Behandlungsart"
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

          <FormField label="Krankheitsbild" required>
            <FormSelect
              value={formData.condition || ''}
              onChange={value => handleInputChange('condition', value)}
              options={conditionOptions}
              placeholder="Wählen Sie das Krankheitsbild"
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
              placeholder="Beschreiben Sie Ihre Physiotherapie-Anforderungen detailliert (Symptome, Behandlungsziel, Verfügbarkeit, etc.)"
              rows={4}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Physiotherapie" />
    </div>
  );
};

export default PhysiotherapieForm;
