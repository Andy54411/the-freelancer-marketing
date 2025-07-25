import React, { useState, useEffect } from 'react';
import { DJServiceData } from '@/types/subcategory-forms';
import { FormField, FormSelect, FormSubmitButton, FormTextarea } from './FormComponents';

interface DJServiceFormProps {
  data: DJServiceData;
  onDataChange: (data: DJServiceData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const DJServiceForm: React.FC<DJServiceFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<DJServiceData>(data);

  const serviceTypeOptions = [
    { value: 'hochzeit', label: 'Hochzeits-DJ' },
    { value: 'geburtstag', label: 'Geburtstags-DJ' },
    { value: 'firmenfeier', label: 'Firmenfeier-DJ' },
    { value: 'party', label: 'Party-DJ' },
    { value: 'club', label: 'Club-DJ' },
    { value: 'mobile_disco', label: 'Mobile Disco' },
    { value: 'karaoke', label: 'Karaoke-DJ' },
    { value: 'andere', label: 'Andere' },
  ];

  const musicGenreOptions = [
    { value: 'pop', label: 'Pop' },
    { value: 'rock', label: 'Rock' },
    { value: 'electronic', label: 'Electronic' },
    { value: 'hip_hop', label: 'Hip-Hop' },
    { value: 'house', label: 'House' },
    { value: 'techno', label: 'Techno' },
    { value: 'disco', label: 'Disco' },
    { value: 'schlager', label: 'Schlager' },
    { value: 'mixed', label: 'Gemischt' },
  ];

  const eventTypeOptions = [
    { value: 'indoor', label: 'Indoor-Event' },
    { value: 'outdoor', label: 'Outdoor-Event' },
    { value: 'private', label: 'Private Feier' },
    { value: 'corporate', label: 'Firmenevent' },
    { value: 'wedding', label: 'Hochzeit' },
    { value: 'party', label: 'Party' },
  ];

  const durationOptions = [
    { value: '2_stunden', label: '2 Stunden' },
    { value: '4_stunden', label: '4 Stunden' },
    { value: '6_stunden', label: '6 Stunden' },
    { value: '8_stunden', label: '8 Stunden' },
    { value: 'ganzer_tag', label: 'Ganzer Tag' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const handleInputChange = (field: keyof DJServiceData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.musicGenre &&
      formData.eventType &&
      formData.duration &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.musicGenre &&
      formData.eventType &&
      formData.duration &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          DJ Service-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art des Events" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art des Events"
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

          <FormField label="Event-Typ" required>
            <FormSelect
              value={formData.eventType || ''}
              onChange={value => handleInputChange('eventType', value)}
              options={eventTypeOptions}
              placeholder="Wählen Sie den Event-Typ"
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
              placeholder="Beschreiben Sie Ihre DJ-Anforderungen detailliert"
              rows={4}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="DJService" formData={formData} />
    </div>
  );
}

export default DJServiceForm;
