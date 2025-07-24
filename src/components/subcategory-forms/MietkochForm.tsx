import React, { useState, useEffect } from 'react';
import { MietkochData } from '@/types/subcategory-forms';
import { FormField, FormSelect, FormSubmitButton, FormTextarea } from './FormComponents';

interface MietkochFormProps {
  data: MietkochData;
  onDataChange: (data: MietkochData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const MietkochForm: React.FC<MietkochFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<MietkochData>(data);

  const serviceTypeOptions = [
    { value: 'einzelevent', label: 'Einzelevent' },
    { value: 'private_dinner', label: 'Private Dinner' },
    { value: 'mehrtägig', label: 'Mehrtägiges Event' },
    { value: 'regelmäßig', label: 'Regelmäßige Betreuung' },
    { value: 'catering', label: 'Catering-Service' },
    { value: 'kochkurs', label: 'Kochkurs' },
    { value: 'hotel', label: 'Hotel' },
    { value: 'restaurant', label: 'Restaurant' },
  ];

  const cuisineTypeOptions = [
    { value: 'deutsch', label: 'Deutsche Küche' },
    { value: 'italienisch', label: 'Italienische Küche' },
    { value: 'französisch', label: 'Französische Küche' },
    { value: 'mediterran', label: 'Mediterrane Küche' },
    { value: 'asiatisch', label: 'Asiatische Küche' },
    { value: 'vegetarisch', label: 'Vegetarische Küche' },
    { value: 'vegan', label: 'Vegane Küche' },
    { value: 'fusion', label: 'Fusion-Küche' },
  ];

  const eventTypeOptions = [
    { value: 'geburtstag', label: 'Geburtstag' },
    { value: 'firmenevent', label: 'Firmenevent' },
    { value: 'familienfeier', label: 'Familienfeier' },
    { value: 'dinner_party', label: 'Dinner Party' },
    { value: 'a la cart', label: 'a la cart' },
    { value: 'HP', label: 'HP' },
  ];

  const accommodationOptions = [
    { value: 'mit_übernachtung', label: 'Mit Übernachtung' },
    { value: 'ohne_übernachtung', label: 'Ohne Übernachtung' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const handleInputChange = (field: keyof MietkochData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.cuisineType &&
      formData.eventType &&
      formData.accommodation &&
      formData.projectDescription?.trim()
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.cuisineType &&
      formData.eventType &&
      formData.accommodation &&
      formData.projectDescription?.trim()
    );
  };

  return (
    <div className="space-y-6">
      <FormField label="Art der Dienstleistung" required>
        <FormSelect
          value={formData.serviceType || ''}
          onChange={value => handleInputChange('serviceType', value)}
          options={serviceTypeOptions}
          placeholder="Wählen Sie die Art der Dienstleistung"
        />
      </FormField>

      <FormField label="Küchenstil" required>
        <FormSelect
          value={
            Array.isArray(formData.cuisineType)
              ? formData.cuisineType[0] || ''
              : formData.cuisineType || ''
          }
          onChange={value => handleInputChange('cuisineType', [value])}
          options={cuisineTypeOptions}
          placeholder="Wählen Sie den Küchenstil"
        />
      </FormField>

      <FormField label="Art des Events" required>
        <FormSelect
          value={formData.eventType || ''}
          onChange={value => handleInputChange('eventType', value)}
          options={eventTypeOptions}
          placeholder="Wählen Sie die Art des Events"
        />
      </FormField>

      <FormField label="Mit oder ohne Übernachtung Möglichkeit" required>
        <FormSelect
          value={formData.accommodation || ''}
          onChange={value => handleInputChange('accommodation', value)}
          options={accommodationOptions}
          placeholder="Wählen Sie die Übernachtung Möglichkeit"
        />
      </FormField>

      <FormField label="Projektbeschreibung" required>
        <FormTextarea
          value={formData.projectDescription || ''}
          onChange={value => handleInputChange('projectDescription', value)}
          placeholder="Beschreiben Sie Ihre Koch-Anforderungen detailliert..."
          rows={4}
        />
      </FormField>

      <FormSubmitButton isValid={isFormValid()} subcategory="Mietkoch" formData={formData} />
    </div>
  );
};

export default MietkochForm;
