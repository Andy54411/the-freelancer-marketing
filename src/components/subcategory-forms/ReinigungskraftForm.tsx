'use client';
import React, { useState, useEffect } from 'react';
import { ReinigungskraftData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface ReinigungskraftFormProps {
  data: ReinigungskraftData;
  onDataChange: (data: ReinigungskraftData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const ReinigungskraftForm: React.FC<ReinigungskraftFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<ReinigungskraftData>(data);

  const serviceTypeOptions = [
    { value: 'privatreinigung', label: 'Privatreinigung' },
    { value: 'büroreinigung', label: 'Büroreinigung' },
    { value: 'fensterreinigung', label: 'Fensterreinigung' },
    { value: 'grundreinigung', label: 'Grundreinigung' },
    { value: 'umzugsreinigung', label: 'Umzugsreinigung' },
    { value: 'treppenreinigung', label: 'Treppenreinigung' },
    { value: 'industriereinigung', label: 'Industriereinigung' },
    { value: 'sonderreinigung', label: 'Sonderreinigung' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: '14_tägig', label: '14-tägig' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
  ];

  const areaSizeOptions = [
    { value: 'bis_50', label: 'Bis 50 m²' },
    { value: '50_100', label: '50-100 m²' },
    { value: '100_200', label: '100-200 m²' },
    { value: 'über_200', label: 'Über 200 m²' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof ReinigungskraftData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.frequency &&
      formData.areaSize &&
      formData.urgency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.frequency &&
      formData.areaSize &&
      formData.urgency
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Reinigungskraft Service Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Reinigung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Welche Art der Reinigung wird benötigt?"
            />
          </FormField>

          <FormField label="Häufigkeit" required>
            <FormSelect
              value={formData.frequency || ''}
              onChange={value => handleInputChange('frequency', value)}
              options={frequencyOptions}
              placeholder="Wie oft soll gereinigt werden?"
            />
          </FormField>

          <FormField label="Flächengröße" required>
            <FormSelect
              value={formData.areaSize || ''}
              onChange={value => handleInputChange('areaSize', value)}
              options={areaSizeOptions}
              placeholder="Wie groß ist die zu reinigende Fläche?"
            />
          </FormField>

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wann wird die Reinigung benötigt?"
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
              value={formData.hourlyRate || ''}
              onChange={value => handleInputChange('hourlyRate', value)}
              placeholder="z.B. 15-20 EUR"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zu reinigende Bereiche">
            <FormCheckboxGroup
              value={formData.areasToClean || []}
              onChange={value => handleInputChange('areasToClean', value)}
              options={[
                { value: 'küche', label: 'Küche' },
                { value: 'badezimmer', label: 'Badezimmer' },
                { value: 'wohnzimmer', label: 'Wohnzimmer' },
                { value: 'schlafzimmer', label: 'Schlafzimmer' },
                { value: 'flur', label: 'Flur/Eingang' },
                { value: 'balkon', label: 'Balkon/Terrasse' },
                { value: 'keller', label: 'Keller' },
                { value: 'dachboden', label: 'Dachboden' },
                { value: 'fenster', label: 'Fenster' },
                { value: 'büroräume', label: 'Büroräume' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Allergien, Haustiere, besondere Reinigungsanforderungen, etc."
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
                { value: 'mitbringen', label: 'Reinigungskraft bringt Reinigungsmittel mit' },
                { value: 'vorhanden', label: 'Reinigungsmittel sind vorhanden' },
                { value: 'bio', label: 'Bio-/Umweltfreundliche Produkte gewünscht' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zugang zur Wohnung/Büro">
            <FormRadioGroup
              name="accessMethod"
              value={formData.accessMethod || ''}
              onChange={value => handleInputChange('accessMethod', value)}
              options={[
                { value: 'anwesenheit', label: 'Nur bei Anwesenheit' },
                { value: 'schlüssel', label: 'Schlüsselübergabe möglich' },
                { value: 'code', label: 'Zugangscode' },
                { value: 'hausmeister', label: 'Über Hausmeister' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Reinigungskraft" formData={formData} />
    </div>
  );
};

export default ReinigungskraftForm;
