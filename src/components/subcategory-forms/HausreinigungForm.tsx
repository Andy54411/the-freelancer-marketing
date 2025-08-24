import React, { useState, useEffect } from 'react';
import { HausreinigungData } from '@/types/subcategory-forms';
import { FormField, FormSelect, FormSubmitButton, FormTextarea } from './FormComponents';

interface HausreinigungFormProps {
  data: HausreinigungData;
  onDataChange: (data: HausreinigungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const HausreinigungForm: React.FC<HausreinigungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<HausreinigungData>(data);

  const serviceTypeOptions = [
    { value: 'einmalig', label: 'Einmalige Reinigung' },
    { value: 'regelmäßig', label: 'Regelmäßige Reinigung' },
    { value: 'endreinigung', label: 'Endreinigung' },
    { value: 'umzugsreinigung', label: 'Umzugsreinigung' },
  ];

  const propertyTypeOptions = [
    { value: 'wohnung', label: 'Wohnung' },
    { value: 'haus', label: 'Haus' },
    { value: 'büro', label: 'Büro' },
    { value: 'praxis', label: 'Praxis' },
  ];

  const equipmentOptions = [
    { value: 'vorhanden', label: 'Reinigungsgeräte vorhanden' },
    { value: 'mitbringen', label: 'Bitte mitbringen' },
    { value: 'bereitstellen', label: 'Soll bereitgestellt werden' },
  ];

  const chemicalsOptions = [
    { value: 'standard', label: 'Standard Reinigungsmittel' },
    { value: 'umweltfreundlich', label: 'Umweltfreundliche Mittel' },
    { value: 'allergikerfreundlich', label: 'Allergikerfreundliche Mittel' },
  ];

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.propertyType &&
      formData.equipment &&
      formData.projectDescription?.trim()
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.propertyType &&
      formData.equipment &&
      formData.projectDescription?.trim()
    );
  };

  const handleInputChange = (field: keyof HausreinigungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  return (
    <div className="space-y-6">
      <FormField label="Art der Reinigung" required>
        <FormSelect
          value={formData.serviceType || ''}
          placeholder="Wählen Sie die Reinigungsart"
          options={serviceTypeOptions}
          onChange={value => handleInputChange('serviceType', value)}
        />
      </FormField>

      <FormField label="Objekttyp" required>
        <FormSelect
          value={formData.propertyType || ''}
          placeholder="Wählen Sie den Objekttyp"
          options={propertyTypeOptions}
          onChange={value => handleInputChange('propertyType', value)}
        />
      </FormField>

      <FormField label="Reinigungsausrüstung" required>
        <FormSelect
          value={formData.equipment || ''}
          placeholder="Wählen Sie die Ausrüstung"
          options={equipmentOptions}
          onChange={value => handleInputChange('equipment', value)}
        />
      </FormField>

      <FormField label="Projektbeschreibung" required>
        <FormTextarea
          value={formData.projectDescription || ''}
          placeholder="Beschreiben Sie Ihre Reinigungsanforderungen detailliert..."
          onChange={value => handleInputChange('projectDescription', value)}
          rows={4}
        />
      </FormField>

      <FormSubmitButton isValid={isFormValid()} subcategory="Hausreinigung" formData={formData} />
    </div>
  );
};

export default HausreinigungForm;
