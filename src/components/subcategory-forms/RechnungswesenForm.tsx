import React, { useState, useEffect } from 'react';
import { RechnungswesenData } from '@/types/subcategory-forms';
import { FormField, FormSelect, FormSubmitButton, FormTextarea } from './FormComponents';

interface RechnungswesenFormProps {
  data: RechnungswesenData;
  onDataChange: (data: RechnungswesenData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const RechnungswesenForm: React.FC<RechnungswesenFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<RechnungswesenData>(data);

  const serviceTypeOptions = [
    { value: 'rechnungsstellung', label: 'Rechnungsstellung' },
    { value: 'mahnwesen', label: 'Mahnwesen' },
    { value: 'zahlungsüberwachung', label: 'Zahlungsüberwachung' },
    { value: 'debitorenbuchhaltung', label: 'Debitorenbuchhaltung' },
    { value: 'kreditorenbuchhaltung', label: 'Kreditorenbuchhaltung' },
  ];

  const companyTypeOptions = [
    { value: 'kleinunternehmen', label: 'Kleinunternehmen' },
    { value: 'mittelstand', label: 'Mittelständisches Unternehmen' },
    { value: 'großunternehmen', label: 'Großunternehmen' },
    { value: 'freiberufler', label: 'Freiberufler' },
    { value: 'verein', label: 'Verein/Organisation' },
  ];

  const volumeOptions = [
    { value: 'niedrig', label: 'Niedrig (bis 50 Belege/Monat)' },
    { value: 'mittel', label: 'Mittel (50-200 Belege/Monat)' },
    { value: 'hoch', label: 'Hoch (200-500 Belege/Monat)' },
    { value: 'sehr_hoch', label: 'Sehr hoch (über 500 Belege/Monat)' },
  ];

  const urgencyOptions = [
    { value: 'normal', label: 'Normal (2-4 Wochen)' },
    { value: 'schnell', label: 'Schnell (1-2 Wochen)' },
    { value: 'express', label: 'Express (1 Woche)' },
    { value: 'sofort', label: 'Sofort' },
  ];

  const handleInputChange = (field: keyof RechnungswesenData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.companyType &&
      formData.volume &&
      formData.urgency &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.companyType &&
      formData.volume &&
      formData.urgency &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Rechnungswesen-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art des Services" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie den Service-Typ"
            />
          </FormField>

          <FormField label="Unternehmenstyp" required>
            <FormSelect
              value={formData.companyType || ''}
              onChange={value => handleInputChange('companyType', value)}
              options={companyTypeOptions}
              placeholder="Wählen Sie den Unternehmenstyp"
            />
          </FormField>

          <FormField label="Arbeitsvolumen" required>
            <FormSelect
              value={formData.volume || ''}
              onChange={value => handleInputChange('volume', value)}
              options={volumeOptions}
              placeholder="Wählen Sie das Arbeitsvolumen"
            />
          </FormField>

          <FormField label="Dringlichkeit" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wählen Sie die Dringlichkeit"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihre Rechnungswesen-Anforderungen (spezielle Software, Fristen, besondere Anforderungen, etc.)"
              rows={4}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Rechnungswesen" />
    </div>
  );
};

export default RechnungswesenForm;
