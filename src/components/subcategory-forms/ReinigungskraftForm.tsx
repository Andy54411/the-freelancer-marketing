import React, { useState, useEffect } from 'react';
import { ReinigungskraftData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface ReinigungskraftFormProps {
  data: ReinigungskraftData;
  onDataChange: (data: ReinigungskraftData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const ReinigungskraftForm: React.FC<ReinigungskraftFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<ReinigungskraftData>(data);

  const serviceTypeOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'regelmäßig', label: 'Regelmäßig' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
  ];

  const cleaningTypeOptions = [
    { value: 'grundreinigung', label: 'Grundreinigung' },
    { value: 'unterhaltsreinigung', label: 'Unterhaltsreinigung' },
    { value: 'endreinigung', label: 'Endreinigung' },
    { value: 'büroreinigung', label: 'Büroreinigung' },
  ];

  const frequencyOptions = [
    { value: 'täglich', label: 'Täglich' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'zweiwöchentlich', label: 'Zweiwöchentlich' },
    { value: 'monatlich', label: 'Monatlich' },
  ];

  const specialAreasOptions = [
    { value: 'bad', label: 'Bad' },
    { value: 'küche', label: 'Küche' },
    { value: 'fenster', label: 'Fenster' },
    { value: 'balkon', label: 'Balkon' },
    { value: 'keller', label: 'Keller' },
    { value: 'dachboden', label: 'Dachboden' },
  ];

  const equipmentOptions = [
    { value: 'vorhanden', label: 'Reinigungsgeräte sind vorhanden' },
    { value: 'mitbringen', label: 'Reinigungskraft bringt Geräte mit' },
    { value: 'bereitstellen', label: 'Geräte werden bereitgestellt' },
  ];

  const chemicalsOptions = [
    { value: 'vorhanden', label: 'Reinigungsmittel sind vorhanden' },
    { value: 'mitbringen', label: 'Reinigungskraft bringt Mittel mit' },
    { value: 'bereitstellen', label: 'Mittel werden bereitgestellt' },
    { value: 'umweltfreundlich', label: 'Nur umweltfreundliche Mittel' },
  ];

  const timePreferenceOptions = [
    { value: 'morgens', label: 'Morgens' },
    { value: 'nachmittags', label: 'Nachmittags' },
    { value: 'abends', label: 'Abends' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const accessMethodOptions = [
    { value: 'anwesend', label: 'Ich bin anwesend' },
    { value: 'schlüssel', label: 'Schlüsselübergabe' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const handleInputChange = (field: keyof ReinigungskraftData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.cleaningType &&
      formData.equipment &&
      formData.chemicals &&
      formData.timePreference &&
      formData.accessMethod &&
      formData.specialAreas &&
      formData.specialAreas.length > 0
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Reinigungskraft-Projektdetails
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

          <FormField label="Art der Reinigung" required>
            <FormSelect
              value={formData.cleaningType || ''}
              onChange={value => handleInputChange('cleaningType', value)}
              options={cleaningTypeOptions}
              placeholder="Wählen Sie die Art der Reinigung"
            />
          </FormField>

          {formData.serviceType === 'regelmäßig' && (
            <FormField label="Häufigkeit" required>
              <FormSelect
                value={formData.frequency || ''}
                onChange={value => handleInputChange('frequency', value)}
                options={frequencyOptions}
                placeholder="Wie oft soll gereinigt werden?"
              />
            </FormField>
          )}

          <FormField label="Anzahl Räume">
            <FormInput
              type="number"
              value={formData.roomCount?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'roomCount',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der zu reinigenden Räume"
            />
          </FormField>

          <FormField label="Quadratmeter">
            <FormInput
              type="number"
              value={formData.squareMeters?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'squareMeters',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Gesamtfläche in m²"
            />
          </FormField>

          <FormField label="Reinigungsgeräte" required>
            <FormSelect
              value={formData.equipment || ''}
              onChange={value => handleInputChange('equipment', value)}
              options={equipmentOptions}
              placeholder="Verfügbarkeit von Reinigungsgeräten"
            />
          </FormField>

          <FormField label="Reinigungsmittel" required>
            <FormSelect
              value={formData.chemicals || ''}
              onChange={value => handleInputChange('chemicals', value)}
              options={chemicalsOptions}
              placeholder="Verfügbarkeit von Reinigungsmitteln"
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

          <FormField label="Zugang" required>
            <FormSelect
              value={formData.accessMethod || ''}
              onChange={value => handleInputChange('accessMethod', value)}
              options={accessMethodOptions}
              placeholder="Wie erfolgt der Zugang?"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Bereiche" required>
            <FormCheckboxGroup
              value={formData.specialAreas || []}
              onChange={value => handleInputChange('specialAreas', value)}
              options={specialAreasOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Beschreiben Sie besondere Wünsche, Reinigungsanforderungen oder Besonderheiten"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default ReinigungskraftForm;
