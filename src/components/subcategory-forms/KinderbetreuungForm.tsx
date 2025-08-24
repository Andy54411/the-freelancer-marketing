'use client';
import React, { useState, useEffect } from 'react';
import { KinderbetreuungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface KinderbetreuungFormProps {
  data: KinderbetreuungData;
  onDataChange: (data: KinderbetreuungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const KinderbetreuungForm: React.FC<KinderbetreuungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<KinderbetreuungData>(data);

  const serviceTypeOptions = [
    { value: 'babysitting', label: 'Babysitting' },
    { value: 'tagesmutter', label: 'Tagesmutter' },
    { value: 'nanny', label: 'Nanny/Au-pair' },
    { value: 'nachhilfe', label: 'Nachhilfe' },
    { value: 'spielgruppe', label: 'Spielgruppe' },
    { value: 'notbetreuung', label: 'Notbetreuung' },
    { value: 'ferienbetreuung', label: 'Ferienbetreuung' },
  ];

  const ageGroupOptions = [
    { value: 'baby', label: 'Baby (0-1 Jahr)' },
    { value: 'kleinkind', label: 'Kleinkind (1-3 Jahre)' },
    { value: 'kindergarten', label: 'Kindergartenkind (3-6 Jahre)' },
    { value: 'grundschule', label: 'Grundschulkind (6-10 Jahre)' },
    { value: 'teenager', label: 'Teenager (10+ Jahre)' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'gelegentlich', label: 'Gelegentlich' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'täglich', label: 'Täglich' },
    { value: 'vollzeit', label: 'Vollzeit' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'heute', label: 'Heute' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof KinderbetreuungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.ageGroup &&
      formData.frequency &&
      formData.urgency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(formData.serviceType && formData.ageGroup && formData.frequency && formData.urgency);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Kinderbetreuung Service Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Betreuung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Welche Art der Betreuung wird benötigt?"
            />
          </FormField>

          <FormField label="Altersgruppe" required>
            <FormSelect
              value={formData.ageGroup || ''}
              onChange={value => handleInputChange('ageGroup', value)}
              options={ageGroupOptions}
              placeholder="Wie alt sind die Kinder?"
            />
          </FormField>

          <FormField label="Häufigkeit" required>
            <FormSelect
              value={formData.frequency || ''}
              onChange={value => handleInputChange('frequency', value)}
              options={frequencyOptions}
              placeholder="Wie oft wird Betreuung benötigt?"
            />
          </FormField>

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wann wird die Betreuung benötigt?"
            />
          </FormField>

          <FormField label="Anzahl Kinder">
            <FormInput
              type="number"
              value={formData.numberOfChildren || ''}
              onChange={value => handleInputChange('numberOfChildren', value)}
              placeholder="Wie viele Kinder?"
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
          <FormField label="Betreuungszeiten">
            <FormCheckboxGroup
              value={formData.careSchedule || []}
              onChange={value => handleInputChange('careSchedule', value)}
              options={[
                { value: 'morgens', label: 'Morgens (6-12 Uhr)' },
                { value: 'mittags', label: 'Mittags (12-18 Uhr)' },
                { value: 'abends', label: 'Abends (18-22 Uhr)' },
                { value: 'nachts', label: 'Nachts (22-6 Uhr)' },
                { value: 'wochenende', label: 'Wochenende' },
                { value: 'feiertage', label: 'Feiertage' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Spezielle Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Allergien, besondere Bedürfnisse, Aktivitäten, etc."
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Ort der Betreuung">
            <FormRadioGroup
              name="careLocation"
              value={formData.careLocation || ''}
              onChange={value => handleInputChange('careLocation', value)}
              options={[
                { value: 'zuhause', label: 'Bei uns zu Hause' },
                { value: 'betreuer', label: 'Bei der Betreuungsperson' },
                { value: 'flexibel', label: 'Flexibel' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Qualifikationen gewünscht">
            <FormCheckboxGroup
              value={formData.qualifications || []}
              onChange={value => handleInputChange('qualifications', value)}
              options={[
                { value: 'erfahrung', label: 'Erfahrung mit Kindern' },
                { value: 'erste_hilfe', label: 'Erste-Hilfe-Kurs' },
                { value: 'führungszeugnis', label: 'Erweitertes Führungszeugnis' },
                { value: 'pädagogik', label: 'Pädagogische Ausbildung' },
                { value: 'mehrsprachig', label: 'Mehrsprachigkeit' },
                { value: 'hausaufgaben', label: 'Hausaufgabenhilfe' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Kinderbetreuung" formData={formData} />
    </div>
  );
};

export default KinderbetreuungForm;
