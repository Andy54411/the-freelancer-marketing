import React, { useState, useEffect } from 'react';
import { EventplanungData } from '@/types/subcategory-forms';
import { FormField, FormSelect, FormTextarea, FormSubmitButton } from './FormComponents';

interface EventplanungFormProps {
  data: EventplanungData;
  onDataChange: (data: EventplanungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const EventplanungForm: React.FC<EventplanungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<EventplanungData>(data);

  const eventTypeOptions = [
    { value: 'hochzeit', label: 'Hochzeit' },
    { value: 'geburtstag', label: 'Geburtstag' },
    { value: 'firmenfeier', label: 'Firmenfeier' },
    { value: 'konferenz', label: 'Konferenz' },
    { value: 'gala', label: 'Gala' },
    { value: 'andere', label: 'Andere' },
  ];

  const guestCountOptions = [
    { value: '10-25', label: '10-25 Gäste' },
    { value: '25-50', label: '25-50 Gäste' },
    { value: '50-100', label: '50-100 Gäste' },
    { value: '100-200', label: '100-200 Gäste' },
    { value: 'mehr_als_200', label: 'Mehr als 200 Gäste' },
  ];

  const serviceTypeOptions = [
    { value: 'vollservice', label: 'Vollservice (komplette Planung)' },
    { value: 'teilservice', label: 'Teilservice (bestimmte Bereiche)' },
    { value: 'beratung', label: 'Nur Beratung' },
    { value: 'koordination', label: 'Koordination am Event-Tag' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const locationTypeOptions = [
    { value: 'indoor', label: 'Indoor-Location' },
    { value: 'outdoor', label: 'Outdoor-Location' },
    { value: 'gemischt', label: 'Indoor & Outdoor' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const durationOptions = [
    { value: '2-4_stunden', label: '2-4 Stunden' },
    { value: '4-6_stunden', label: '4-6 Stunden' },
    { value: 'ganzer_tag', label: 'Ganzer Tag' },
    { value: 'mehrere_tage', label: 'Mehrere Tage' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const handleInputChange = (field: keyof EventplanungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.eventType &&
      formData.guestCount &&
      formData.serviceType &&
      formData.locationType &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.eventType &&
      formData.guestCount &&
      formData.serviceType &&
      formData.locationType &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Event-Planungs-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Veranstaltung" required>
            <FormSelect
              value={formData.eventType || ''}
              onChange={value => handleInputChange('eventType', value)}
              options={eventTypeOptions}
              placeholder="Wählen Sie die Art der Veranstaltung"
            />
          </FormField>

          <FormField label="Anzahl Gäste" required>
            <FormSelect
              value={String(formData.guestCount || '')}
              onChange={value => handleInputChange('guestCount', value)}
              options={guestCountOptions}
              placeholder="Wählen Sie die Anzahl der Gäste"
            />
          </FormField>

          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Dienstleistung"
            />
          </FormField>

          <FormField label="Location-Typ" required>
            <FormSelect
              value={formData.locationType || ''}
              onChange={value => handleInputChange('locationType', value)}
              options={locationTypeOptions}
              placeholder="Wählen Sie den Location-Typ"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihre Event-Planungs-Anforderungen detailliert"
              rows={4}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Eventplanung" />
    </div>
  );
}

export default EventplanungForm;
