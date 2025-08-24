import React, { useState, useEffect } from 'react';
import { BodenreinigungData } from '@/types/subcategory-forms';
import { FormField, FormSelect, FormSubmitButton, FormTextarea } from './FormComponents';

interface BodenreinigungFormProps {
  data: BodenreinigungData;
  onDataChange: (data: BodenreinigungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const BodenreinigungForm: React.FC<BodenreinigungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<BodenreinigungData>(data);

  const serviceTypeOptions = [
    { value: 'grundreinigung', label: 'Grundreinigung' },
    { value: 'einmalig', label: 'Einmalige Reinigung' },
    { value: 'regelmäßig', label: 'Regelmäßige Reinigung' },
  ];

  const floorTypeOptions = [
    { value: 'parkett', label: 'Parkett' },
    { value: 'laminat', label: 'Laminat' },
    { value: 'fliesen', label: 'Fliesen' },
    { value: 'vinyl', label: 'Vinyl' },
    { value: 'teppich', label: 'Teppichboden' },
    { value: 'naturstein', label: 'Naturstein' },
  ];

  const treatmentTypeOptions = [
    { value: 'standard', label: 'Standard' },
    { value: 'tiefenreinigung', label: 'Tiefenreinigung' },
    { value: 'versiegelung', label: 'Versiegelung' },
    { value: 'polieren', label: 'Polieren' },
  ];

  const handleInputChange = (field: keyof BodenreinigungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.floorType &&
      formData.treatmentType &&
      formData.projectDescription &&
      formData.projectDescription.trim().length > 0
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.floorType &&
      formData.treatmentType &&
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

        <FormField label="Bodentyp" required>
          <FormSelect
            value={formData.floorType || ''}
            onChange={value => handleInputChange('floorType', value)}
            options={floorTypeOptions}
            placeholder="Wählen Sie den Bodentyp"
          />
        </FormField>

        <FormField label="Behandlungsart" required>
          <FormSelect
            value={formData.treatmentType || ''}
            onChange={value => handleInputChange('treatmentType', value)}
            options={treatmentTypeOptions}
            placeholder="Wählen Sie die Behandlung"
          />
        </FormField>
      </div>

      <FormField label="Projektbeschreibung" required>
        <FormTextarea
          value={formData.projectDescription || ''}
          onChange={value => handleInputChange('projectDescription', value)}
          placeholder="Beschreiben Sie Ihre Bodenreinigung-Anforderungen"
          rows={3}
        />
      </FormField>

      <FormSubmitButton isValid={isFormValid()} subcategory="Bodenreinigung" formData={formData} />
    </div>
  );
};

export default BodenreinigungForm;
