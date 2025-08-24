import React, { useState, useEffect } from 'react';
import { FotografData } from '@/types/subcategory-forms';
import { FormField, FormSelect, FormSubmitButton, FormTextarea } from './FormComponents';

interface FotografFormProps {
  data: FotografData;
  onDataChange: (data: FotografData) => void;
  onValidationChange: (isValid: boolean) => void;
  hideSubmitButton?: boolean;
}

const FotografForm: React.FC<FotografFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
  hideSubmitButton = false,
}) => {
  const [formData, setFormData] = useState<FotografData>(data);

  const shootingTypeOptions = [
    { value: 'portrait', label: 'Portrait' },
    { value: 'hochzeit', label: 'Hochzeit' },
    { value: 'event', label: 'Event' },
    { value: 'business', label: 'Business' },
    { value: 'produkt', label: 'Produkt' },
    { value: 'andere', label: 'Andere' },
  ];

  const durationOptions = [
    { value: '1-2_stunden', label: '1-2 Stunden' },
    { value: '2-4_stunden', label: '2-4 Stunden' },
    { value: '4-6_stunden', label: '4-6 Stunden' },
    { value: 'ganzer_tag', label: 'Ganzer Tag' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const locationOptions = [
    { value: 'studio', label: 'Studio' },
    { value: 'outdoor', label: 'Outdoor' },
    { value: 'zuhause', label: 'Zuhause/On Location' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const deliveryOptions = [
    { value: 'digital', label: 'Digital (nur Dateien)' },
    { value: 'prints', label: 'Prints (gedruckt)' },
    { value: 'beides', label: 'Digital & Prints' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const editingOptions = [
    { value: 'basic', label: 'Basic-Bearbeitung' },
    { value: 'erweitert', label: 'Erweiterte Bearbeitung' },
    { value: 'keine', label: 'Keine Bearbeitung' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const handleInputChange = (field: keyof FotografData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.shootingType &&
      formData.duration &&
      formData.location &&
      formData.delivery &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.shootingType &&
      formData.duration &&
      formData.location &&
      formData.delivery &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Fotograf-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Fotografie" required>
            <FormSelect
              value={formData.shootingType || ''}
              onChange={value => handleInputChange('shootingType', value)}
              options={shootingTypeOptions}
              placeholder="Wählen Sie die Art der Fotografie"
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

          <FormField label="Location" required>
            <FormSelect
              value={formData.location || ''}
              onChange={value => handleInputChange('location', value)}
              options={locationOptions}
              placeholder="Wählen Sie die Location"
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
              placeholder="Beschreiben Sie Ihr Fotoprojekt detailliert"
              rows={4}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton
        isValid={isFormValid()}
        subcategory="Fotograf"
        formData={formData}
        hideSubmitButton={hideSubmitButton}
      />
    </div>
  );
};

export default FotografForm;
