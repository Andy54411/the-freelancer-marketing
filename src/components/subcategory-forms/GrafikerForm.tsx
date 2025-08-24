import React, { useState, useEffect } from 'react';
import { GrafikerData } from '@/types/subcategory-forms';
import { FormField, FormSelect, FormTextarea, FormSubmitButton } from './FormComponents';

interface GrafikerFormProps {
  data: GrafikerData;
  onDataChange: (data: GrafikerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const GrafikerForm: React.FC<GrafikerFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<GrafikerData>(data);

  const projectTypeOptions = [
    { value: 'logo', label: 'Logo-Design' },
    { value: 'flyer', label: 'Flyer/Broschüre' },
    { value: 'visitenkarten', label: 'Visitenkarten' },
    { value: 'webdesign', label: 'Webdesign' },
    { value: 'verpackung', label: 'Verpackungsdesign' },
    { value: 'andere', label: 'Andere' },
  ];

  const complexityOptions = [
    { value: 'einfach', label: 'Einfach' },
    { value: 'mittel', label: 'Mittel' },
    { value: 'komplex', label: 'Komplex' },
    { value: 'sehr_komplex', label: 'Sehr komplex' },
  ];

  const revisionsOptions = [
    { value: '1', label: '1 Revision' },
    { value: '2', label: '2 Revisionen' },
    { value: '3', label: '3 Revisionen' },
    { value: 'unbegrenzt', label: 'Unbegrenzte Revisionen' },
  ];

  const deliveryOptions = [
    { value: 'digital', label: 'Digital (PDF, PNG, JPG)' },
    { value: 'print', label: 'Druckfertig' },
    { value: 'web', label: 'Web-optimiert' },
    { value: 'alle_formate', label: 'Alle Formate' },
  ];

  const timeframeOptions = [
    { value: '1-3_tage', label: '1-3 Tage' },
    { value: '1_woche', label: '1 Woche' },
    { value: '2_wochen', label: '2 Wochen' },
    { value: '1_monat', label: '1 Monat' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const handleInputChange = (field: keyof GrafikerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.projectType &&
      formData.complexity &&
      formData.revisions &&
      formData.delivery &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.projectType &&
      formData.complexity &&
      formData.revisions &&
      formData.delivery &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Grafiker-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art des Projekts" required>
            <FormSelect
              value={formData.projectType || ''}
              onChange={value => handleInputChange('projectType', value)}
              options={projectTypeOptions}
              placeholder="Wählen Sie die Art des Projekts"
            />
          </FormField>

          <FormField label="Komplexität" required>
            <FormSelect
              value={formData.complexity || ''}
              onChange={value => handleInputChange('complexity', value)}
              options={complexityOptions}
              placeholder="Wählen Sie die Komplexität"
            />
          </FormField>

          <FormField label="Anzahl Revisionen" required>
            <FormSelect
              value={String(formData.revisions) || ''}
              onChange={value => handleInputChange('revisions', value)}
              options={revisionsOptions}
              placeholder="Wählen Sie die Anzahl Revisionen"
            />
          </FormField>

          <FormField label="Lieferformat" required>
            <FormSelect
              value={formData.delivery || ''}
              onChange={value => handleInputChange('delivery', value)}
              options={deliveryOptions}
              placeholder="Wählen Sie das Lieferformat"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihr Grafik-Projekt detailliert"
              rows={4}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Grafiker" formData={formData} />
    </div>
  );
};

export default GrafikerForm;
