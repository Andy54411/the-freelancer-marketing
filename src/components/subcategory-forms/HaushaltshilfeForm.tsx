'use client';
import React, { useState, useEffect } from 'react';
import { HaushaltshilfeData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface HaushaltshilfeFormProps {
  data: HaushaltshilfeData;
  onDataChange: (data: HaushaltshilfeData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const HaushaltshilfeForm: React.FC<HaushaltshilfeFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<HaushaltshilfeData>(data);

  const serviceTypeOptions = [
    { value: 'regelmäßige_reinigung', label: 'Regelmäßige Haushaltsreinigung' },
    { value: 'grundreinigung', label: 'Grundreinigung' },
    { value: 'fensterreinigung', label: 'Fensterreinigung' },
    { value: 'bügelservice', label: 'Bügelservice' },
    { value: 'einkaufen', label: 'Einkaufen/Besorgungen' },
    { value: 'kochen', label: 'Kochen/Mahlzeiten' },
    { value: 'kinderbetreuung', label: 'Kinderbetreuung' },
    { value: 'seniorenbetreuung', label: 'Seniorenbetreuung' },
    { value: 'gartenarbeit', label: 'Gartenarbeit' },
    { value: 'umzugshilfe', label: 'Umzugshilfe' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: '14_tägig', label: '14-tägig' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
  ];

  const houseSizeOptions = [
    { value: 'bis_50', label: 'Bis 50 m²' },
    { value: '50_100', label: '50-100 m²' },
    { value: '100_150', label: '100-150 m²' },
    { value: 'über_150', label: 'Über 150 m²' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof HaushaltshilfeData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.frequency &&
      formData.houseSize &&
      formData.urgency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.frequency &&
      formData.houseSize &&
      formData.urgency
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Haushaltshilfe Service Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Welche Hilfe wird benötigt?"
            />
          </FormField>

          <FormField label="Häufigkeit" required>
            <FormSelect
              value={formData.frequency || ''}
              onChange={value => handleInputChange('frequency', value)}
              options={frequencyOptions}
              placeholder="Wie oft wird Hilfe benötigt?"
            />
          </FormField>

          <FormField label="Wohnungsgröße" required>
            <FormSelect
              value={formData.houseSize || ''}
              onChange={value => handleInputChange('houseSize', value)}
              options={houseSizeOptions}
              placeholder="Wie groß ist die Wohnung/das Haus?"
            />
          </FormField>

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wann wird die Hilfe benötigt?"
            />
          </FormField>

          <FormField label="Stunden pro Einsatz">
            <FormInput
              type="number"
              value={formData.hoursPerSession || ''}
              onChange={value => handleInputChange('hoursPerSession', value)}
              placeholder="z.B. 3"
            />
          </FormField>

          <FormField label="Budget pro Stunde">
            <FormInput
              type="text"
              value={formData.hourlyBudget || ''}
              onChange={value => handleInputChange('hourlyBudget', value)}
              placeholder="z.B. 15-20 EUR"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Spezielle Aufgaben">
            <FormCheckboxGroup
              value={formData.specificTasks || []}
              onChange={value => handleInputChange('specificTasks', value)}
              options={[
                { value: 'staubsaugen', label: 'Staubsaugen' },
                { value: 'wischen', label: 'Böden wischen' },
                { value: 'badezimmer', label: 'Badezimmer reinigen' },
                { value: 'küche', label: 'Küche reinigen' },
                { value: 'fenster', label: 'Fenster putzen' },
                { value: 'bügeln', label: 'Bügeln' },
                { value: 'wäsche', label: 'Wäsche waschen' },
                { value: 'einkaufen', label: 'Einkaufen' },
                { value: 'kochen', label: 'Kochen' },
                { value: 'aufräumen', label: 'Aufräumen' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Informationen">
            <FormTextarea
              value={formData.additionalInfo || ''}
              onChange={value => handleInputChange('additionalInfo', value)}
              placeholder="Besondere Wünsche, Allergien, Haustiere, etc."
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Reinigungsmittel">
            <FormRadioGroup
              name="cleaningSupplies"
              value={formData.cleaningSupplies || ''}
              onChange={value => handleInputChange('cleaningSupplies', value)}
              options={[
                { value: 'mitbringen', label: 'Haushaltshilfe bringt Reinigungsmittel mit' },
                { value: 'vorhanden', label: 'Reinigungsmittel sind vorhanden' },
                { value: 'bio', label: 'Bio-/Umweltfreundliche Produkte gewünscht' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Haushaltshilfe" formData={formData} />
    </div>
  );
};

export default HaushaltshilfeForm;
