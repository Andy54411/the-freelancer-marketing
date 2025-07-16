import React, { useState, useEffect } from 'react';
import { HaushaltshilfeData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface HaushaltshilfeFormProps {
  data: HaushaltshilfeData;
  onDataChange: (data: HaushaltshilfeData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const HaushaltshilfeForm: React.FC<HaushaltshilfeFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<HaushaltshilfeData>(data);

  const serviceTypeOptions = [
    { value: 'regelmäßig', label: 'Regelmäßig' },
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
  ];

  const servicesOptions = [
    { value: 'putzen', label: 'Putzen' },
    { value: 'waschen', label: 'Waschen' },
    { value: 'bügeln', label: 'Bügeln' },
    { value: 'kochen', label: 'Kochen' },
    { value: 'einkaufen', label: 'Einkaufen' },
    { value: 'kinderbetreuung', label: 'Kinderbetreuung' },
  ];

  const frequencyOptions = [
    { value: 'täglich', label: 'Täglich' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'zweiwöchentlich', label: 'Zweiwöchentlich' },
    { value: 'monatlich', label: 'Monatlich' },
  ];

  const timePreferenceOptions = [
    { value: 'morgens', label: 'Morgens' },
    { value: 'nachmittags', label: 'Nachmittags' },
    { value: 'abends', label: 'Abends' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const languageOptions = [
    { value: 'deutsch', label: 'Deutsch' },
    { value: 'englisch', label: 'Englisch' },
    { value: 'spanisch', label: 'Spanisch' },
    { value: 'französisch', label: 'Französisch' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ];

  const experienceOptions = [
    { value: 'egal', label: 'Egal' },
    { value: 'erfahren', label: 'Erfahren' },
    { value: 'sehr_erfahren', label: 'Sehr erfahren' },
  ];

  const handleInputChange = (field: keyof HaushaltshilfeData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.services &&
      formData.services.length > 0 &&
      formData.timePreference &&
      formData.languages &&
      formData.languages.length > 0 &&
      formData.experience &&
      typeof formData.ownTransport === 'boolean'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Haushaltshilfe-Projektdetails
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

          {formData.serviceType === 'regelmäßig' && (
            <FormField label="Häufigkeit" required>
              <FormSelect
                value={formData.frequency || ''}
                onChange={value => handleInputChange('frequency', value)}
                options={frequencyOptions}
                placeholder="Wie oft wird Hilfe benötigt?"
              />
            </FormField>
          )}

          <FormField label="Stunden pro Einsatz">
            <FormInput
              type="number"
              value={formData.hours?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'hours',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl Stunden pro Einsatz"
            />
          </FormField>

          <FormField label="Zeitpräferenz" required>
            <FormSelect
              value={formData.timePreference || ''}
              onChange={value => handleInputChange('timePreference', value)}
              options={timePreferenceOptions}
              placeholder="Bevorzugte Tageszeit"
            />
          </FormField>

          <FormField label="Erfahrung" required>
            <FormSelect
              value={formData.experience || ''}
              onChange={value => handleInputChange('experience', value)}
              options={experienceOptions}
              placeholder="Gewünschte Erfahrung"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Benötigte Services" required>
            <FormCheckboxGroup
              value={formData.services || []}
              onChange={value => handleInputChange('services', value)}
              options={servicesOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Sprachen" required>
            <FormCheckboxGroup
              value={formData.languages || []}
              onChange={value => handleInputChange('languages', value)}
              options={languageOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Eigener Transport">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="ownTransport"
                  checked={formData.ownTransport === true}
                  onChange={() => handleInputChange('ownTransport', true)}
                  className="mr-2"
                />
                Ja, hat eigenen Transport
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="ownTransport"
                  checked={formData.ownTransport === false}
                  onChange={() => handleInputChange('ownTransport', false)}
                  className="mr-2"
                />
                Nein, kein eigener Transport
              </label>
            </div>
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Beschreiben Sie besondere Wünsche, Anforderungen oder Besonderheiten"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default HaushaltshilfeForm;
