import React, { useState, useEffect } from 'react';
import { SicherheitsdienstData } from '@/types/subcategory-forms';
import { FormField, FormSelect, FormSubmitButton, FormTextarea } from './FormComponents';

interface SicherheitsdienstFormProps {
  data: SicherheitsdienstData;
  onDataChange: (data: SicherheitsdienstData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SicherheitsdienstForm: React.FC<SicherheitsdienstFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<SicherheitsdienstData>(data);

  const serviceTypeOptions = [
    { value: 'objektschutz', label: 'Objektschutz' },
    { value: 'personenschutz', label: 'Personenschutz' },
    { value: 'veranstaltung', label: 'Veranstaltungsschutz' },
    { value: 'werkschutz', label: 'Werkschutz' },
    { value: 'andere', label: 'Andere' },
  ];

  const durationOptions = [
    { value: '1-3_stunden', label: '1-3 Stunden' },
    { value: '4-8_stunden', label: '4-8 Stunden' },
    { value: 'ganzer_tag', label: 'Ganzer Tag' },
    { value: 'mehrere_tage', label: 'Mehrere Tage' },
    { value: 'dauerhaft', label: 'Dauerhaft' },
  ];

  const equipmentOptions = [
    { value: 'standard', label: 'Standard-Ausrüstung' },
    { value: 'erweitert', label: 'Erweiterte Ausrüstung' },
    { value: 'speziell', label: 'Spezielle Ausrüstung' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const trainingOptions = [
    { value: 'grundausbildung', label: 'Grundausbildung' },
    { value: 'sachkundepruefung', label: 'Sachkundeprüfung §34a' },
    { value: 'spezialist', label: 'Spezialist' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const handleInputChange = (field: keyof SicherheitsdienstData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.duration &&
      formData.training &&
      formData.equipment &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.duration &&
      formData.training &&
      formData.equipment &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Sicherheitsdienst-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art des Sicherheitsdienstes" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art des Sicherheitsdienstes"
            />
          </FormField>

          <FormField label="Einsatzdauer" required>
            <FormSelect
              value={formData.duration || ''}
              onChange={value => handleInputChange('duration', value)}
              options={durationOptions}
              placeholder="Wählen Sie die Einsatzdauer"
            />
          </FormField>

          <FormField label="Qualifikation" required>
            <FormSelect
              value={formData.training || ''}
              onChange={value => handleInputChange('training', value)}
              options={trainingOptions}
              placeholder="Wählen Sie die erforderliche Qualifikation"
            />
          </FormField>

          <FormField label="Benötigte Ausrüstung" required>
            <FormSelect
              value={
                Array.isArray(formData.equipment)
                  ? formData.equipment[0] || ''
                  : formData.equipment || ''
              }
              onChange={value => handleInputChange('equipment', value)}
              options={equipmentOptions}
              placeholder="Wählen Sie die Ausrüstung"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihren Sicherheitsbedarf detailliert"
              rows={4}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Sicherheitsdienst" formData={formData} />
    </div>
  );
}

export default SicherheitsdienstForm;
