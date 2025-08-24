'use client';
import React, { useState, useEffect } from 'react';
import { SeniorenbetreuungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface SeniorenbetreuungFormProps {
  data: SeniorenbetreuungData;
  onDataChange: (data: SeniorenbetreuungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SeniorenbetreuungForm: React.FC<SeniorenbetreuungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<SeniorenbetreuungData>(data);

  const serviceTypeOptions = [
    { value: 'betreuung', label: 'Betreuung/Gesellschaft' },
    { value: 'pflege', label: 'Grundpflege' },
    { value: 'haushaltshilfe', label: 'Haushaltshilfe' },
    { value: 'einkaufen', label: 'Einkaufen/Besorgungen' },
    { value: 'transport', label: 'Transport/Begleitung' },
    { value: 'medikamente', label: 'Medikamenteneinnahme' },
    { value: 'nachtbetreuung', label: 'Nachtbetreuung' },
    { value: 'demenzbetreuung', label: 'Demenzbetreuung' },
  ];

  const careTimeOptions = [
    { value: 'stundenweise', label: 'Stundenweise' },
    { value: 'halbtags', label: 'Halbtags' },
    { value: 'ganztags', label: 'Ganztags' },
    { value: '24h', label: '24h-Betreuung' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof SeniorenbetreuungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(formData.serviceType && formData.careTime && formData.urgency);
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(formData.serviceType && formData.careTime && formData.urgency);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Seniorenbetreuung Service Details
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

          <FormField label="Betreuungsumfang" required>
            <FormSelect
              value={formData.careTime || ''}
              onChange={value => handleInputChange('careTime', value)}
              options={careTimeOptions}
              placeholder="Wie umfangreich soll die Betreuung sein?"
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

          <FormField label="Budget pro Stunde">
            <FormInput
              type="text"
              value={formData.hourlyRate || ''}
              onChange={value => handleInputChange('hourlyRate', value)}
              placeholder="z.B. 20-30 EUR"
            />
          </FormField>

          <FormField label="Alter der betreuten Person">
            <FormInput
              type="number"
              value={formData.seniorAge || ''}
              onChange={value => handleInputChange('seniorAge', value)}
              placeholder="z.B. 75"
            />
          </FormField>

          <FormField label="Stunden pro Tag">
            <FormInput
              type="number"
              value={formData.hoursPerDay || ''}
              onChange={value => handleInputChange('hoursPerDay', value)}
              placeholder="z.B. 4"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Benötigte Betreuungsleistungen">
            <FormCheckboxGroup
              value={formData.careServices || []}
              onChange={value => handleInputChange('careServices', value)}
              options={[
                { value: 'gesellschaft', label: 'Gesellschaft/Gespräche' },
                { value: 'körperpflege', label: 'Unterstützung bei Körperpflege' },
                { value: 'anziehen', label: 'Hilfe beim An-/Ausziehen' },
                { value: 'essen', label: 'Hilfe beim Essen' },
                { value: 'toilettengang', label: 'Hilfe beim Toilettengang' },
                { value: 'mobilität', label: 'Unterstützung der Mobilität' },
                { value: 'medikamente', label: 'Medikamentenerinnerung' },
                { value: 'aktivitäten', label: 'Aktivitäten/Spiele' },
                { value: 'arztbegleitung', label: 'Arztbegleitung' },
                { value: 'haushalt', label: 'Haushaltshilfe' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen/Krankheiten">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Demenz, Diabetes, Gehbehinderung, etc."
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
                { value: 'zuhause', label: 'Zu Hause beim Senior' },
                { value: 'tagespflege', label: 'Tagespflege' },
                { value: 'beides', label: 'Flexibel' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Qualifikationen erwünscht">
            <FormCheckboxGroup
              value={formData.requiredQualifications || []}
              onChange={value => handleInputChange('requiredQualifications', value)}
              options={[
                { value: 'pflege_erfahrung', label: 'Pflege-/Betreuungserfahrung' },
                { value: 'erste_hilfe', label: 'Erste-Hilfe-Kurs' },
                { value: 'demenz_schulung', label: 'Demenz-Schulung' },
                { value: 'führungszeugnis', label: 'Erweitertes Führungszeugnis' },
                { value: 'deutsch', label: 'Gute Deutschkenntnisse' },
                { value: 'auto', label: 'Führerschein/Auto' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Geschlecht der Betreuungsperson">
            <FormRadioGroup
              name="preferredGender"
              value={formData.preferredGender || ''}
              onChange={value => handleInputChange('preferredGender', value)}
              options={[
                { value: 'egal', label: 'Egal' },
                { value: 'weiblich', label: 'Weiblich bevorzugt' },
                { value: 'männlich', label: 'Männlich bevorzugt' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton
        isValid={isFormValid()}
        subcategory="Seniorenbetreuung"
        formData={formData}
      />
    </div>
  );
};

export default SeniorenbetreuungForm;
