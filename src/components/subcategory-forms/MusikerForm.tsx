import React, { useState, useEffect } from 'react';
import { MusikerData } from '@/types/subcategory-forms';
import { FormField, FormSelect, FormSubmitButton, FormTextarea } from './FormComponents';

interface MusikerFormProps {
  data: MusikerData;
  onDataChange: (data: MusikerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const MusikerForm: React.FC<MusikerFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<MusikerData>(data);

  const serviceTypeOptions = [
    { value: 'live_musik', label: 'Live-Musik' },
    { value: 'dj', label: 'DJ' },
    { value: 'band', label: 'Band' },
    { value: 'solo_künstler', label: 'Solo-Künstler' },
    { value: 'duo', label: 'Duo' },
    { value: 'trio', label: 'Trio' },
    { value: 'quartett', label: 'Quartett' },
    { value: 'musikunterricht', label: 'Musikunterricht' },
  ];

  const musicGenreOptions = [
    { value: 'pop', label: 'Pop' },
    { value: 'rock', label: 'Rock' },
    { value: 'jazz', label: 'Jazz' },
    { value: 'klassik', label: 'Klassik' },
    { value: 'blues', label: 'Blues' },
    { value: 'country', label: 'Country' },
    { value: 'folk', label: 'Folk' },
    { value: 'electronic', label: 'Electronic' },
    { value: 'hip_hop', label: 'Hip-Hop' },
    { value: 'andere', label: 'Andere' },
  ];

  const eventTypeOptions = [
    { value: 'hochzeit', label: 'Hochzeit' },
    { value: 'geburtstag', label: 'Geburtstag' },
    { value: 'firmenfeier', label: 'Firmenfeier' },
    { value: 'konzert', label: 'Konzert' },
    { value: 'party', label: 'Party' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'andere', label: 'Andere' },
  ];

  const durationOptions = [
    { value: '1_stunde', label: '1 Stunde' },
    { value: '2_stunden', label: '2 Stunden' },
    { value: '3_stunden', label: '3 Stunden' },
    { value: '4_stunden', label: '4 Stunden' },
    { value: 'ganzer_tag', label: 'Ganzer Tag' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const handleInputChange = (field: keyof MusikerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.musicGenre &&
      (Array.isArray(formData.eventType) ? formData.eventType.length > 0 : formData.eventType) &&
      formData.duration &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.musicGenre &&
      (Array.isArray(formData.eventType) ? formData.eventType.length > 0 : formData.eventType) &&
      formData.duration &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Musiker-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Dienstleistung"
            />
          </FormField>

          <FormField label="Musikrichtung" required>
            <FormSelect
              value={formData.musicGenre || ''}
              onChange={value => handleInputChange('musicGenre', value)}
              options={musicGenreOptions}
              placeholder="Wählen Sie die Musikrichtung"
            />
          </FormField>

          <FormField label="Art der Veranstaltung" required>
            <FormSelect
              value={
                Array.isArray(formData.eventType)
                  ? formData.eventType[0] || ''
                  : formData.eventType || ''
              }
              onChange={value => handleInputChange('eventType', [value])}
              options={eventTypeOptions}
              placeholder="Wählen Sie die Art der Veranstaltung"
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
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihre Musik-Anforderungen detailliert"
              rows={4}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Musiker" />
    </div>
  );
}

export default MusikerForm;
