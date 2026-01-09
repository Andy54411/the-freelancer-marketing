import React, { useState, useEffect } from 'react';
import { VideografData } from '@/types/subcategory-forms';
import { FormField, FormSelect, FormSubmitButton, FormTextarea } from './FormComponents';

interface VideografFormProps {
  data: VideografData;
  onDataChange: (data: VideografData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const VideografForm: React.FC<VideografFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<VideografData>(data);

  const eventTypeOptions = [
    { value: 'hochzeit', label: 'Hochzeit' },
    { value: 'event', label: 'Event/Veranstaltung' },
    { value: 'business', label: 'Business/Unternehmens-Video' },
    { value: 'produkt', label: 'Produkt-Video' },
    { value: 'social_media', label: 'Social Media Content' },
    { value: 'andere', label: 'Andere' },
  ];

  const durationOptions = [
    { value: '1-2_stunden', label: '1-2 Stunden Dreh' },
    { value: 'halbtag', label: 'Halber Tag' },
    { value: 'ganzer_tag', label: 'Ganzer Tag' },
    { value: 'mehrere_tage', label: 'Mehrere Tage' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const locationOptions = [
    { value: 'innen', label: 'Indoor' },
    { value: 'aussen', label: 'Outdoor' },
    { value: 'studio', label: 'Studio' },
    { value: 'gemischt', label: 'Indoor & Outdoor' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const outputOptions = [
    { value: 'highlights', label: 'Highlights-Video' },
    { value: 'vollvideo', label: 'Vollständiges Video' },
    { value: 'beides', label: 'Highlights & Vollvideo' },
    { value: 'social_media', label: 'Social Media Clips' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const _equipmentOptions = [
    { value: 'basic', label: 'Basic-Ausstattung' },
    { value: 'standard', label: 'Standard-Ausstattung' },
    { value: 'professionell', label: 'Professionelle Ausstattung' },
    { value: 'premium', label: 'Premium-Ausstattung' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const handleInputChange = (field: keyof VideografData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.eventType &&
      formData.duration &&
      formData.location &&
      formData.output &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.eventType &&
      formData.duration &&
      formData.location &&
      formData.output &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Videograf-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Videoproduktion" required>
            <FormSelect
              value={formData.eventType || ''}
              onChange={value => handleInputChange('eventType', value)}
              options={eventTypeOptions}
              placeholder="Wählen Sie die Art der Videoproduktion"
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

          <FormField label="Gewünschtes Ergebnis" required>
            <FormSelect
              value={
                Array.isArray(formData.output) ? formData.output[0] || '' : formData.output || ''
              }
              onChange={value => handleInputChange('output', value)}
              options={outputOptions}
              placeholder="Wählen Sie das gewünschte Ergebnis"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihr Videoprojekt detailliert"
              rows={4}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Videograf" formData={formData} />
    </div>
  );
};

export default VideografForm;
