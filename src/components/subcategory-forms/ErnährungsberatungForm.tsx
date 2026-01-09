import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormCheckboxGroup,
  FormSubmitButton,
} from './FormComponents';

interface ErnährungsberatungData {
  subcategory: string;
  serviceType: string;
  duration: string;
  goal: string;
  restrictions: string[];
  frequency: string;
}

interface ErnährungsberatungFormProps {
  data: ErnährungsberatungData;
  onDataChange: (data: ErnährungsberatungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const ErnährungsberatungForm: React.FC<ErnährungsberatungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<ErnährungsberatungData>(data);

  const serviceTypeOptions = [
    { value: 'beratung', label: 'Ernährungsberatung' },
    { value: 'ernährungsplan', label: 'Ernährungsplan' },
    { value: 'diätplanung', label: 'Diätplanung' },
    { value: 'sportlerernährung', label: 'Sportlerernährung' },
    { value: 'allergieberatung', label: 'Allergieberatung' },
  ];

  const durationOptions = [
    { value: '1-3', label: '1-3 Monate' },
    { value: '3-6', label: '3-6 Monate' },
    { value: '6-12', label: '6-12 Monate' },
    { value: '12+', label: 'Über 12 Monate' },
  ];

  const goalOptions = [
    { value: 'gewichtsabnahme', label: 'Gewichtsabnahme' },
    { value: 'gewichtszunahme', label: 'Gewichtszunahme' },
    { value: 'muskelaufbau', label: 'Muskelaufbau' },
    { value: 'gesundheit', label: 'Allgemeine Gesundheit' },
    { value: 'speziell', label: 'Spezielle Anforderungen' },
  ];

  const restrictionOptions = [
    { value: 'keine', label: 'Keine' },
    { value: 'vegetarisch', label: 'Vegetarisch' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'glutenfrei', label: 'Glutenfrei' },
    { value: 'laktosefrei', label: 'Laktosefrei' },
    { value: 'nussfrei', label: 'Nussfrei' },
    { value: 'andere', label: 'Andere' },
  ];

  const frequencyOptions = [
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: '2-wöchentlich', label: 'Alle 2 Wochen' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'quartalsweise', label: 'Quartalsweise' },
    { value: 'einmalig', label: 'Einmalig' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.duration &&
      formData.goal &&
      formData.frequency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const handleChange = (field: keyof ErnährungsberatungData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    return !!(formData.serviceType && formData.duration && formData.goal && formData.frequency);
  };

  return (
    <div className="space-y-6">
      <FormField label="Art der Ernährungsberatung">
        <FormSelect
          value={formData.serviceType}
          onChange={value => handleChange('serviceType', value)}
          options={serviceTypeOptions}
        />
      </FormField>

      <FormField label="Dauer der Beratung">
        <FormSelect
          value={formData.duration}
          onChange={value => handleChange('duration', value)}
          options={durationOptions}
        />
      </FormField>

      <FormField label="Ziel der Ernährungsberatung">
        <FormSelect
          value={formData.goal}
          onChange={value => handleChange('goal', value)}
          options={goalOptions}
        />
      </FormField>

      <FormField label="Ernährungsweise / Einschränkungen">
        <FormCheckboxGroup
          value={formData.restrictions}
          onChange={value => handleChange('restrictions', value)}
          options={restrictionOptions}
        />
      </FormField>

      <FormField label="Häufigkeit der Beratung">
        <FormSelect
          value={formData.frequency}
          onChange={value => handleChange('frequency', value)}
          options={frequencyOptions}
        />
      </FormField>

      <FormSubmitButton
        isValid={isFormValid()}
        subcategory="Ernährungsberatung"
        formData={formData}
      />
    </div>
  );
};

export default ErnährungsberatungForm;
