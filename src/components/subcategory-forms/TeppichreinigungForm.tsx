import React, { useState, useEffect } from 'react';
import { TeppichreinigungData } from '@/types/subcategory-forms';
import { FormField, FormSelect, FormSubmitButton, FormTextarea } from './FormComponents';

interface TeppichreinigungFormProps {
  data: TeppichreinigungData;
  onDataChange: (data: TeppichreinigungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const TeppichreinigungForm: React.FC<TeppichreinigungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<TeppichreinigungData>(data);

  const serviceTypeOptions = [
    { value: 'vor_ort', label: 'Vor Ort beim Kunden' },
    { value: 'abholung', label: 'Abhol-/Lieferservice' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const carpetTypeOptions = [
    { value: 'orientteppich', label: 'Orientteppich' },
    { value: 'perserteppich', label: 'Perserteppich' },
    { value: 'wollteppich', label: 'Wollteppich' },
    { value: 'synthetik', label: 'Synthetik' },
    { value: 'hochflor', label: 'Hochflor' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ];

  const sizeOptions = [
    { value: 'klein', label: 'Klein' },
    { value: 'mittel', label: 'Mittel' },
    { value: 'groß', label: 'Groß' },
    { value: 'sehr_groß', label: 'Sehr groß' },
  ];

  const handleInputChange = (field: keyof TeppichreinigungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.carpetType &&
      formData.size &&
      formData.projectDescription &&
      formData.projectDescription.trim().length > 0
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.carpetType &&
      formData.size &&
      formData.projectDescription &&
      formData.projectDescription.trim().length > 0
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Art der Reinigung" required>
          <FormSelect
            value={formData.serviceType || ''}
            onChange={value => handleInputChange('serviceType', value)}
            options={serviceTypeOptions}
            placeholder="Wählen Sie die Art"
          />
        </FormField>

        <FormField label="Teppichart" required>
          <FormSelect
            value={formData.carpetType || ''}
            onChange={value => handleInputChange('carpetType', value)}
            options={carpetTypeOptions}
            placeholder="Wählen Sie die Teppichart"
          />
        </FormField>

        <FormField label="Teppichgröße" required>
          <FormSelect
            value={formData.size || ''}
            onChange={value => handleInputChange('size', value)}
            options={sizeOptions}
            placeholder="Wählen Sie die Größe"
          />
        </FormField>
      </div>

      <FormField label="Projektbeschreibung" required>
        <FormTextarea
          value={formData.projectDescription || ''}
          onChange={value => handleInputChange('projectDescription', value)}
          placeholder="Beschreiben Sie Ihre Teppichreinigung-Anforderungen"
          rows={3}
        />
      </FormField>

      <FormSubmitButton isValid={isFormValid()} subcategory="Teppichreinigung" />
    </div>
  );
}

export default TeppichreinigungForm;
