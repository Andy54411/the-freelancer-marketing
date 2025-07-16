import React, { useState, useEffect } from 'react';
import { KinderbetreuungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
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
    { value: 'babysitter', label: 'Babysitter' },
    { value: 'tagesmutter', label: 'Tagesmutter' },
    { value: 'nanny', label: 'Nanny' },
    { value: 'au_pair', label: 'Au-Pair' },
    { value: 'notbetreuung', label: 'Notbetreuung' },
    { value: 'stundenbetreuung', label: 'Stundenbetreuung' },
  ];

  const ageGroupOptions = [
    { value: 'baby', label: 'Baby (0-12 Monate)' },
    { value: 'kleinkind', label: 'Kleinkind (1-3 Jahre)' },
    { value: 'kindergarten', label: 'Kindergarten (3-6 Jahre)' },
    { value: 'grundschule', label: 'Grundschule (6-10 Jahre)' },
    { value: 'teenager', label: 'Teenager (10+ Jahre)' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'gelegentlich', label: 'Gelegentlich' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'täglich', label: 'Täglich' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
  ];

  const timeOptions = [
    { value: 'vormittags', label: 'Vormittags' },
    { value: 'nachmittags', label: 'Nachmittags' },
    { value: 'abends', label: 'Abends' },
    { value: 'nachts', label: 'Nachts' },
    { value: 'ganztags', label: 'Ganztags' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const additionalServicesOptions = [
    { value: 'hausaufgaben', label: 'Hausaufgaben-Hilfe' },
    { value: 'kochen', label: 'Kochen' },
    { value: 'putzen', label: 'Leichte Hausarbeiten' },
    { value: 'transport', label: 'Transport/Fahrdienst' },
    { value: 'spielen', label: 'Spielen/Aktivitäten' },
    { value: 'spazieren', label: 'Spazieren gehen' },
    { value: 'baden', label: 'Baden/Körperpflege' },
    { value: 'bettbringen', label: 'Ins Bett bringen' },
    { value: 'windeln', label: 'Windeln wechseln' },
    { value: 'füttern', label: 'Füttern' },
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
      formData.childrenCount &&
      formData.frequency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Kinderbetreuung-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Betreuung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Betreuung"
            />
          </FormField>

          <FormField label="Altersgruppe" required>
            <FormSelect
              value={formData.ageGroup || ''}
              onChange={value => handleInputChange('ageGroup', value)}
              options={ageGroupOptions}
              placeholder="Wählen Sie die Altersgruppe"
            />
          </FormField>

          <FormField label="Anzahl Kinder" required>
            <FormInput
              type="number"
              value={formData.childrenCount?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'childrenCount',
                  typeof value === 'string' ? parseInt(value) : value
                )
              }
              placeholder="Anzahl der Kinder"
            />
          </FormField>

          <FormField label="Häufigkeit" required>
            <FormSelect
              value={formData.frequency || ''}
              onChange={value => handleInputChange('frequency', value)}
              options={frequencyOptions}
              placeholder="Wählen Sie die Häufigkeit"
            />
          </FormField>

          <FormField label="Uhrzeit">
            <FormSelect
              value={formData.timePreference || ''}
              onChange={value => handleInputChange('timePreference', value)}
              options={timeOptions}
              placeholder="Wählen Sie die bevorzugte Uhrzeit"
            />
          </FormField>

          <FormField label="Stundenlohn">
            <FormInput
              type="number"
              value={formData.hourlyRate?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'hourlyRate',
                  typeof value === 'string' ? parseFloat(value) : value
                )
              }
              placeholder="Stundenlohn in €"
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
          <FormField label="Ort der Betreuung">
            <FormRadioGroup
              name="location"
              value={formData.location || ''}
              onChange={value => handleInputChange('location', value)}
              options={[
                { value: 'bei_uns', label: 'Bei uns zu Hause' },
                { value: 'bei_betreuerin', label: 'Bei der Betreuerin' },
                { value: 'flexibel', label: 'Flexibel' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Qualifikationen erwünscht">
            <FormCheckboxGroup
              value={formData.qualifications || []}
              onChange={value => handleInputChange('qualifications', value)}
              options={[
                { value: 'nicht_wichtig', label: 'Nicht wichtig' },
                { value: 'erfahrung', label: 'Erfahrung erwünscht' },
                { value: 'ausbildung', label: 'Pädagogische Ausbildung' },
                { value: 'erste_hilfe', label: 'Erste-Hilfe-Kurs' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Besondere Anforderungen, Allergien, Routinen etc."
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

export default KinderbetreuungForm;
