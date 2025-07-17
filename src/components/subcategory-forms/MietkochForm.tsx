import React, { useState, useEffect } from 'react';
import { MietkochData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

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
    { value: 'hotel_service', label: 'Hotel-Service' },
    { value: 'restaurant_service', label: 'Restaurant-Service' },
    { value: 'aushilfe', label: 'Koch-Aushilfe' },
    { value: 'vertretung', label: 'Küchenchef-Vertretung' },
  ];

  const cuisineTypeOptions = [
    { value: 'deutsch', label: 'Deutsche Küche' },
    { value: 'italienisch', label: 'Italienische Küche' },
    { value: 'französisch', label: 'Französische Küche' },
    { value: 'mediterran', label: 'Mediterrane Küche' },
    { value: 'asiatisch', label: 'Asiatische Küche' },
    { value: 'indisch', label: 'Indische Küche' },
    { value: 'orientalisch', label: 'Orientalische Küche' },
    { value: 'amerikanisch', label: 'Amerikanische Küche' },
    { value: 'vegetarisch', label: 'Vegetarische Küche' },
    { value: 'vegan', label: 'Vegane Küche' },
    { value: 'fusion', label: 'Fusion-Küche' },
    { value: 'regional', label: 'Regionale Küche' },
  ];

  const eventTypeOptions = [
    { value: 'hochzeit', label: 'Hochzeit' },
    { value: 'geburtstag', label: 'Geburtstag' },
    { value: 'firmenevent', label: 'Firmenevent' },
    { value: 'familienfeier', label: 'Familienfeier' },
    { value: 'dinner_party', label: 'Dinner Party' },
    { value: 'weihnachtsfeier', label: 'Weihnachtsfeier' },
    { value: 'grillparty', label: 'Grillparty' },
    { value: 'brunch', label: 'Brunch' },
    { value: 'buffet', label: 'Buffet' },
    { value: 'menü', label: 'Menü' },
    { value: 'hotel_restaurant', label: 'Hotel & Restaurant' },
    { value: 'catering_event', label: 'Catering Event' },
    { value: 'popup_restaurant', label: 'Pop-up Restaurant' },
    { value: 'kochshow', label: 'Kochshow' },
  ];

  const levelOptions = [
    { value: 'hausmannskost', label: 'Hausmannskost' },
    { value: 'gehobene_küche', label: 'Gehobene Küche' },
    { value: 'fine_dining', label: 'Fine Dining' },
    { value: 'sterneküche', label: 'Sterneküche' },
    { value: 'schnelle_küche', label: 'Schnelle Küche' },
    { value: 'gesunde_küche', label: 'Gesunde Küche' },
  ];

  const additionalServicesOptions = [
    { value: 'einkauf', label: 'Einkauf der Zutaten' },
    { value: 'service', label: 'Service-Personal' },
    { value: 'geschirr', label: 'Geschirr und Besteck' },
    { value: 'dekoration', label: 'Tischdekoration' },
    { value: 'reinigung', label: 'Küchen-Reinigung' },
    { value: 'weinberatung', label: 'Weinberatung' },
    { value: 'allergieberatung', label: 'Allergieberatung' },
    { value: 'menüplanung', label: 'Menüplanung' },
    { value: 'speisekarte', label: 'Speisekarten-Entwicklung' },
    { value: 'personalschulung', label: 'Personal-Schulung' },
    { value: 'kostenkontrolle', label: 'Kostenkontrolle' },
    { value: 'qualitätskontrolle', label: 'Qualitätskontrolle' },
    { value: 'hygieneschulung', label: 'Hygieneschulung' },
    { value: 'buffetbetreuung', label: 'Buffet-Betreuung' },
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
      formData.level &&
      formData.numberOfGuests &&
      formData.location
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Mietkoch-Projektdetails
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

          <FormField label="Küchenstil" required>
            <FormCheckboxGroup
              value={formData.cuisineType || []}
              onChange={value => handleInputChange('cuisineType', value)}
              options={cuisineTypeOptions}
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

          <FormField label="Küchenniveau" required>
            <FormSelect
              value={formData.level || ''}
              onChange={value => handleInputChange('level', value)}
              options={levelOptions}
              placeholder="Wählen Sie das Küchenniveau"
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

          <FormField label="Veranstaltungsort" required>
            <FormInput
              type="text"
              value={formData.location || ''}
              onChange={value => handleInputChange('location', value)}
              placeholder="Adresse des Veranstaltungsorts"
            />
          </FormField>

          <FormField label="Budget pro Person (€)">
            <FormInput
              type="number"
              value={formData.budgetPerPerson?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'budgetPerPerson',
                  typeof value === 'string' ? (value ? parseFloat(value) : undefined) : value
                )
              }
              placeholder="Budget pro Person in €"
            />
          </FormField>

          <FormField label="Küchengröße">
            <FormInput
              type="text"
              value={formData.kitchenSize || ''}
              onChange={value => handleInputChange('kitchenSize', value)}
              placeholder="Klein, Mittel, Groß oder Professionell"
            />
          </FormField>

          <FormField label="Küchenaustattung">
            <FormInput
              type="text"
              value={formData.kitchenEquipment || ''}
              onChange={value => handleInputChange('kitchenEquipment', value)}
              placeholder="Beschreibung der verfügbaren Ausstattung"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Dienstleistungen">
            <FormCheckboxGroup
              value={formData.additionalServices || []}
              onChange={value => handleInputChange('additionalServices', value)}
              options={additionalServicesOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Allergien und Unverträglichkeiten">
            <FormTextarea
              value={formData.allergies || ''}
              onChange={value => handleInputChange('allergies', value)}
              placeholder="Listen Sie alle Allergien und Unverträglichkeiten der Gäste auf"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Menüwünsche">
            <FormTextarea
              value={formData.menuWishes || ''}
              onChange={value => handleInputChange('menuWishes', value)}
              placeholder="Beschreiben Sie spezielle Menüwünsche oder Vorlieben"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Weitere besondere Wünsche oder Anforderungen"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default MietkochForm;
