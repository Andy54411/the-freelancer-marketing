import React, { useState, useEffect } from 'react';
import { DekorationData } from '@/types/subcategory-forms';
import { FormField, FormSelect, FormSubmitButton, FormTextarea } from './FormComponents';

interface DekorationFormProps {
  data: DekorationData;
  onDataChange: (data: DekorationData) => void;
  onValidationChange: (isValid: boolean) => void;
  hideSubmitButton?: boolean;
}

const DekorationForm: React.FC<DekorationFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
  hideSubmitButton = false,
}) => {
  const [formData, setFormData] = useState<DekorationData>(data);

  const decorationTypeOptions = [
    { value: 'event', label: 'Event-Dekoration' },
    { value: 'hochzeit', label: 'Hochzeitsdekoration' },
    { value: 'interior', label: 'Innenraumgestaltung' },
    { value: 'blumen', label: 'Blumendekoration' },
    { value: 'tisch', label: 'Tischdekoration' },
    { value: 'andere', label: 'Andere' },
  ];

  const occasionOptions = [
    { value: 'hochzeit', label: 'Hochzeit' },
    { value: 'geburtstag', label: 'Geburtstag' },
    { value: 'firmenfeier', label: 'Firmenfeier' },
    { value: 'weihnachten', label: 'Weihnachten' },
    { value: 'ostern', label: 'Ostern' },
    { value: 'andere', label: 'Andere' },
  ];

  const areaOptions = [
    { value: 'klein', label: 'Klein (< 50m²)' },
    { value: 'mittel', label: 'Mittel (50-100m²)' },
    { value: 'groß', label: 'Groß (100-200m²)' },
    { value: 'sehr_groß', label: 'Sehr groß (> 200m²)' },
  ];

  const styleOptions = [
    { value: 'modern', label: 'Modern' },
    { value: 'klassisch', label: 'Klassisch' },
    { value: 'romantisch', label: 'Romantisch' },
    { value: 'rustikal', label: 'Rustikal' },
    { value: 'minimalistisch', label: 'Minimalistisch' },
    { value: 'andere', label: 'Andere' },
  ];

  const handleInputChange = (field: keyof DekorationData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.decorationType &&
      formData.occasion &&
      formData.area &&
      formData.style &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.decorationType &&
      formData.occasion &&
      formData.area &&
      formData.style &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Dekoration-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dekoration" required>
            <FormSelect
              value={formData.decorationType || ''}
              onChange={value => handleInputChange('decorationType', value)}
              options={decorationTypeOptions}
              placeholder="Wählen Sie die Art der Dekoration"
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

          <FormField label="Größe des zu dekorierenden Bereichs" required>
            <FormSelect
              value={formData.area || ''}
              onChange={value => handleInputChange('area', value)}
              options={areaOptions}
              placeholder="Wählen Sie die Größe des Bereichs"
            />
          </FormField>

          <FormField label="Gewünschter Stil/Design" required>
            <FormSelect
              value={formData.style || ''}
              onChange={value => handleInputChange('style', value)}
              options={styleOptions}
              placeholder="Wählen Sie den gewünschten Stil"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihr Dekoration-Projekt detailliert (Materialien, besondere Wünsche, etc.)"
              rows={4}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton
        isValid={isFormValid()}
        subcategory="Dekoration"
        formData={formData}
        hideSubmitButton={hideSubmitButton}
      />
    </div>
  );
};

export default DekorationForm;
