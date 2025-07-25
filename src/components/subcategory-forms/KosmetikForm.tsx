import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface KosmetikData {
  subcategory: string;
  serviceType: string;
  duration: string;
  skinType: string;
  concerns: string[];
  addOns: boolean;
}

interface KosmetikFormProps {
  data: KosmetikData;
  onDataChange: (data: KosmetikData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const KosmetikForm: React.FC<KosmetikFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<KosmetikData>(data);

  const serviceTypeOptions = [
    { value: 'gesichtsbehandlung', label: 'Gesichtsbehandlung' },
    { value: 'maniküre', label: 'Maniküre' },
    { value: 'pediküre', label: 'Pediküre' },
    { value: 'waxing', label: 'Waxing/Enthaarung' },
    { value: 'make-up', label: 'Make-up' },
    { value: 'massage', label: 'Kosmetische Massage' },
    { value: 'beratung', label: 'Kosmetikberatung' },
  ];

  const durationOptions = [
    { value: '0-1', label: 'Weniger als 1 Stunde' },
    { value: '1-2', label: '1-2 Stunden' },
    { value: '2-3', label: '2-3 Stunden' },
    { value: '3+', label: 'Mehr als 3 Stunden' },
  ];

  const skinTypeOptions = [
    { value: 'normal', label: 'Normal' },
    { value: 'trocken', label: 'Trocken' },
    { value: 'fettig', label: 'Fettig' },
    { value: 'mischhaut', label: 'Mischhaut' },
    { value: 'empfindlich', label: 'Empfindlich' },
    { value: 'reif', label: 'Reife Haut' },
    { value: 'akne', label: 'Akne' },
  ];

  const concernOptions = [
    { value: 'reinigung', label: 'Tiefenreinigung' },
    { value: 'anti-aging', label: 'Anti-Aging' },
    { value: 'pickel', label: 'Pickel/Akne' },
    { value: 'pigmentierung', label: 'Pigmentierung' },
    { value: 'falten', label: 'Falten' },
    { value: 'feuchtigkeit', label: 'Feuchtigkeit' },
    { value: 'augenbrauen', label: 'Augenbrauen' },
    { value: 'wimpern', label: 'Wimpern' },
  ];

  const addOnsOptions = [
    { value: 'true', label: 'Ja' },
    { value: 'false', label: 'Nein' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  useEffect(() => {
    const isValid = !!(formData.serviceType && formData.duration && formData.skinType);
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const handleChange = (field: keyof KosmetikData, value: string | string[] | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    return !!(formData.serviceType && formData.duration && formData.skinType);
  };

  return (
    <div className="space-y-6">
      <FormField label="Art der kosmetischen Behandlung">
        <FormSelect
          value={formData.serviceType}
          onChange={value => handleChange('serviceType', value)}
          options={serviceTypeOptions}
        />
      </FormField>

      <FormField label="Dauer der Behandlung">
        <FormSelect
          value={formData.duration}
          onChange={value => handleChange('duration', value)}
          options={durationOptions}
        />
      </FormField>

      <FormField label="Hauttyp">
        <FormSelect
          value={formData.skinType}
          onChange={value => handleChange('skinType', value)}
          options={skinTypeOptions}
        />
      </FormField>

      <FormField label="Hautbedürfnisse / Anliegen">
        <FormCheckboxGroup
          value={formData.concerns}
          onChange={value => handleChange('concerns', value)}
          options={concernOptions}
        />
      </FormField>

      <FormField label="Zusätzliche Anwendungen gewünscht?">
        <FormRadioGroup
          name="addOns"
          value={formData.addOns ? 'true' : 'false'}
          onChange={value => handleChange('addOns', value === 'true')}
          options={addOnsOptions}
        />
      </FormField>

      <FormSubmitButton isValid={isFormValid()} subcategory="Kosmetik" />
    </div>
  );
}

export default KosmetikForm;
