import React, { useState, useEffect } from 'react';
import { CateringData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface CateringFormProps {
  data: CateringData;
  onDataChange: (data: CateringData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const CateringForm: React.FC<CateringFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<CateringData>(data);

  const serviceTypeOptions = [
    { value: 'buffet', label: 'Buffet' },
    { value: 'menü', label: 'Menü-Service' },
    { value: 'fingerfood', label: 'Fingerfood' },
    { value: 'grillservice', label: 'Grill-Service' },
    { value: 'getränke', label: 'Getränke-Service' },
    { value: 'komplettservice', label: 'Komplettservice' },
  ];

  const eventTypeOptions = [
    { value: 'hochzeit', label: 'Hochzeit' },
    { value: 'geburtstag', label: 'Geburtstag' },
    { value: 'firmenfeier', label: 'Firmenfeier' },
    { value: 'meeting', label: 'Meeting/Konferenz' },
    { value: 'privatfeier', label: 'Privatfeier' },
    { value: 'jubiläum', label: 'Jubiläum' },
    { value: 'taufe', label: 'Taufe' },
    { value: 'trauerfeier', label: 'Trauerfeier' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ];

  const cuisineTypeOptions = [
    { value: 'deutsch', label: 'Deutsche Küche' },
    { value: 'italienisch', label: 'Italienische Küche' },
    { value: 'asiatisch', label: 'Asiatische Küche' },
    { value: 'mediterran', label: 'Mediterrane Küche' },
    { value: 'international', label: 'Internationale Küche' },
    { value: 'vegetarisch', label: 'Vegetarische Küche' },
    { value: 'vegan', label: 'Vegane Küche' },
    { value: 'bio', label: 'Bio-Küche' },
    { value: 'regional', label: 'Regionale Küche' },
  ];

  const budgetRangeOptions = [
    { value: 'bis_20', label: 'Bis 20 € pro Person' },
    { value: '20_40', label: '20 - 40 € pro Person' },
    { value: '40_60', label: '40 - 60 € pro Person' },
    { value: '60_100', label: '60 - 100 € pro Person' },
    { value: 'über_100', label: 'Über 100 € pro Person' },
  ];

  const additionalServicesOptions = [
    { value: 'geschirr', label: 'Geschirr & Besteck' },
    { value: 'tischdecken', label: 'Tischdecken' },
    { value: 'dekoration', label: 'Tisch-Dekoration' },
    { value: 'service_personal', label: 'Service-Personal' },
    { value: 'getränke_service', label: 'Getränke-Service' },
    { value: 'bar_service', label: 'Bar-Service' },
    { value: 'aufbau', label: 'Aufbau' },
    { value: 'abbau', label: 'Abbau' },
    { value: 'spüldienst', label: 'Spüldienst' },
    { value: 'lieferung', label: 'Lieferung' },
    { value: 'abholung', label: 'Abholung' },
  ];

  const handleInputChange = (field: keyof CateringData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.eventType &&
      formData.guestCount &&
      formData.eventDate
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Catering-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art des Caterings"
            />
          </FormField>

          <FormField label="Veranstaltungstyp" required>
            <FormSelect
              value={formData.eventType || ''}
              onChange={value => handleInputChange('eventType', value)}
              options={eventTypeOptions}
              placeholder="Wählen Sie den Veranstaltungstyp"
            />
          </FormField>

          <FormField label="Anzahl Gäste" required>
            <FormInput
              type="number"
              value={formData.guestCount?.toString() || ''}
              onChange={value =>
                handleInputChange('guestCount', typeof value === 'string' ? parseInt(value) : value)
              }
              placeholder="Anzahl der Gäste"
            />
          </FormField>

          <FormField label="Veranstaltungsdatum" required>
            <FormInput
              type="text"
              value={formData.eventDate || ''}
              onChange={value => handleInputChange('eventDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Veranstaltungsort">
            <FormInput
              type="text"
              value={formData.eventLocation || ''}
              onChange={value => handleInputChange('eventLocation', value)}
              placeholder="Adresse der Veranstaltung"
            />
          </FormField>

          <FormField label="Küchenart">
            <FormSelect
              value={formData.cuisineType || ''}
              onChange={value => handleInputChange('cuisineType', value)}
              options={cuisineTypeOptions}
              placeholder="Wählen Sie die Küchenart"
            />
          </FormField>

          <FormField label="Budget pro Person">
            <FormSelect
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              options={budgetRangeOptions}
              placeholder="Wählen Sie das Budget pro Person"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Services">
            <FormCheckboxGroup
              value={formData.additionalServices || []}
              onChange={value => handleInputChange('additionalServices', value)}
              options={additionalServicesOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Allergien/Diäten">
            <FormTextarea
              value={formData.dietaryRequirements || ''}
              onChange={value => handleInputChange('dietaryRequirements', value)}
              placeholder="Besondere Ernährungsanforderungen, Allergien oder Diäten"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Weitere Informationen">
            <FormTextarea
              value={formData.additionalInfo || ''}
              onChange={value => handleInputChange('additionalInfo', value)}
              placeholder="Weitere wichtige Informationen"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default CateringForm;
