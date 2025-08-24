import React, { useState, useEffect } from 'react';
import { MietkellnerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface MietkellnerFormProps {
  data: MietkellnerData;
  onDataChange: (data: MietkellnerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const MietkellnerForm: React.FC<MietkellnerFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<MietkellnerData>(data);

  const serviceTypeOptions = [
    { value: 'einzelevent', label: 'Einzelevent' },
    { value: 'mehrtägig', label: 'Mehrtägiges Event' },
    { value: 'regelmäßig', label: 'Regelmäßige Betreuung' },
    { value: 'hochzeit', label: 'Hochzeits-Service' },
    { value: 'firmenevent', label: 'Firmenevent' },
    { value: 'private_party', label: 'Private Party' },
  ];

  const serviceStyleOptions = [
    { value: 'buffet', label: 'Buffet-Service' },
    { value: 'menü', label: 'Menü-Service' },
    { value: 'cocktail', label: 'Cocktail-Service' },
    { value: 'flying_buffet', label: 'Flying Buffet' },
    { value: 'fine_dining', label: 'Fine Dining' },
    { value: 'casual', label: 'Casual Service' },
    { value: 'barkeeper', label: 'Barkeeper-Service' },
  ];

  const eventTypeOptions = [
    { value: 'hochzeit', label: 'Hochzeit' },
    { value: 'geburtstag', label: 'Geburtstag' },
    { value: 'firmenevent', label: 'Firmenevent' },
    { value: 'familienfeier', label: 'Familienfeier' },
    { value: 'dinner_party', label: 'Dinner Party' },
    { value: 'weihnachtsfeier', label: 'Weihnachtsfeier' },
    { value: 'empfang', label: 'Empfang' },
    { value: 'gala', label: 'Gala-Event' },
    { value: 'meeting', label: 'Business Meeting' },
    { value: 'konferenz', label: 'Konferenz' },
  ];

  const dressCodeOptions = [
    { value: 'uniform', label: 'Uniform (wird gestellt)' },
    { value: 'schwarz_weiß', label: 'Schwarz-Weiß' },
    { value: 'elegant', label: 'Elegant/Festlich' },
    { value: 'business', label: 'Business-Kleidung' },
    { value: 'casual', label: 'Casual' },
    { value: 'thematisch', label: 'Thematische Kleidung' },
  ];

  const experienceOptions = [
    { value: 'einsteiger', label: 'Einsteiger' },
    { value: 'erfahren', label: 'Erfahren' },
    { value: 'profi', label: 'Profi' },
    { value: 'spezialist', label: 'Spezialist' },
  ];

  const additionalServicesOptions = [
    { value: 'setup', label: 'Tisch-Setup' },
    { value: 'decoration', label: 'Dekoration' },
    { value: 'geschirr', label: 'Geschirr-Service' },
    { value: 'reinigung', label: 'Reinigung' },
    { value: 'koordination', label: 'Event-Koordination' },
    { value: 'musik', label: 'Musik-Betreuung' },
    { value: 'getränke', label: 'Getränke-Service' },
    { value: 'garderobe', label: 'Garderobe' },
  ];

  const handleInputChange = (field: keyof MietkellnerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.serviceStyle &&
      formData.eventType &&
      formData.dressCode &&
      formData.numberOfGuests
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.serviceStyle &&
      formData.eventType &&
      formData.dressCode &&
      formData.numberOfGuests
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Mietkellner-Projektdetails
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

          <FormField label="Service-Stil" required>
            <FormSelect
              value={formData.serviceStyle || ''}
              onChange={value => handleInputChange('serviceStyle', value)}
              options={serviceStyleOptions}
              placeholder="Wählen Sie den Service-Stil"
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

          <FormField label="Dress-Code" required>
            <FormSelect
              value={formData.dressCode || ''}
              onChange={value => handleInputChange('dressCode', value)}
              options={dressCodeOptions}
              placeholder="Wählen Sie den Dress-Code"
            />
          </FormField>

          <FormField label="Anzahl Gäste" required>
            <FormInput
              type="number"
              value={formData.numberOfGuests?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfGuests',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Gäste"
            />
          </FormField>

          <FormField label="Erfahrungslevel">
            <FormSelect
              value={formData.experienceLevel || ''}
              onChange={value => handleInputChange('experienceLevel', value)}
              options={experienceOptions}
              placeholder="Gewünschtes Erfahrungslevel"
            />
          </FormField>

          <FormField label="Sprachen">
            <FormInput
              type="text"
              value={
                Array.isArray(formData.languages)
                  ? formData.languages.join(', ')
                  : formData.languages || ''
              }
              onChange={value =>
                handleInputChange(
                  'languages',
                  typeof value === 'string' ? value.split(', ') : value
                )
              }
              placeholder="Gewünschte Sprachen (z.B. Deutsch, Englisch)"
            />
          </FormField>

          <FormField label="Aufbauzeit (Stunden)">
            <FormInput
              type="number"
              value={formData.setupTime?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'setupTime',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Benötigte Aufbauzeit in Stunden"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Event-Beschreibung">
            <FormTextarea
              value={formData.eventDescription || ''}
              onChange={value => handleInputChange('eventDescription', value)}
              placeholder="Beschreiben Sie das Event und die Atmosphäre"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Besondere Wünsche oder Anforderungen an das Service-Personal"
              rows={3}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Mietkellner" formData={formData} />
    </div>
  );
};

export default MietkellnerForm;
