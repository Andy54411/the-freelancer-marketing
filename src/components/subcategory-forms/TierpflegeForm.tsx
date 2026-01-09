import React, { useState, useEffect } from 'react';
import { TierpflegeData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormTextarea,
  FormSubmitButton,
} from './FormComponents';

interface TierpflegeFormProps {
  data: TierpflegeData;
  onDataChange: (data: TierpflegeData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const TierpflegeForm: React.FC<TierpflegeFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<TierpflegeData>(data);

  const serviceTypeOptions = [
    { value: 'fellpflege', label: 'Fellpflege' },
    { value: 'scheren', label: 'Scheren' },
    { value: 'baden', label: 'Baden' },
    { value: 'krallenschneiden', label: 'Krallenschneiden' },
    { value: 'zahnpflege', label: 'Zahnpflege' },
    { value: 'ohrenpflege', label: 'Ohrenpflege' },
    { value: 'entwurmen', label: 'Entwurmen' },
    { value: 'impfung', label: 'Impfung' },
    { value: 'gesundheitscheck', label: 'Gesundheitscheck' },
    { value: 'erste_hilfe', label: 'Erste Hilfe' },
  ];

  const animalTypeOptions = [
    { value: 'hund', label: 'Hund' },
    { value: 'katze', label: 'Katze' },
    { value: 'kaninchen', label: 'Kaninchen' },
    { value: 'meerschweinchen', label: 'Meerschweinchen' },
    { value: 'hamster', label: 'Hamster' },
    { value: 'vogel', label: 'Vogel' },
    { value: 'reptil', label: 'Reptil' },
    { value: 'pferd', label: 'Pferd' },
    { value: 'schaf', label: 'Schaf' },
    { value: 'ziege', label: 'Ziege' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ];

  const sizeOptions = [
    { value: 'sehr_klein', label: 'Sehr klein (bis 5kg)' },
    { value: 'klein', label: 'Klein (5-15kg)' },
    { value: 'mittel', label: 'Mittel (15-30kg)' },
    { value: 'groß', label: 'Groß (30-50kg)' },
    { value: 'sehr_groß', label: 'Sehr groß (über 50kg)' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'vierteljährlich', label: 'Vierteljährlich' },
    { value: 'halbjährlich', label: 'Halbjährlich' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
  ];
  const handleInputChange = (field: keyof TierpflegeData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.animalType &&
      formData.size &&
      formData.frequency &&
      formData.specialRequirements
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.animalType &&
      formData.size &&
      formData.frequency &&
      formData.specialRequirements
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Tierpflege-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Pflege" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Pflege"
            />
          </FormField>

          <FormField label="Tierart" required>
            <FormSelect
              value={formData.animalType || ''}
              onChange={value => handleInputChange('animalType', value)}
              options={animalTypeOptions}
              placeholder="Wählen Sie die Tierart"
            />
          </FormField>

          <FormField label="Größe/Gewicht" required>
            <FormSelect
              value={formData.size || ''}
              onChange={value => handleInputChange('size', value)}
              options={sizeOptions}
              placeholder="Wählen Sie die Größe"
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
          <FormField label="Besondere Anforderungen" required>
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Beschreiben Sie Ihre Tierpflege-Anforderungen (Name, Alter, Rasse, Temperament, Gesundheitszustand, besondere Wünsche, etc.)"
              rows={4}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Tierpflege" formData={formData} />
    </div>
  );
};

export default TierpflegeForm;
