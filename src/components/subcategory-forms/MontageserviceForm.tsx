import React, { useState, useEffect } from 'react';
import { MontageserviceData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface MontageserviceFormProps {
  data: MontageserviceData;
  onDataChange: (data: MontageserviceData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const MontageserviceForm: React.FC<MontageserviceFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<MontageserviceData>(data);

  const serviceTypeOptions = [
    { value: 'möbel', label: 'Möbel-Montage' },
    { value: 'küche', label: 'Küchen-Montage' },
    { value: 'elektrogeräte', label: 'Elektrogeräte-Montage' },
    { value: 'lampen', label: 'Lampen-Montage' },
    { value: 'regale', label: 'Regale-Montage' },
    { value: 'tv_wandmontage', label: 'TV-Wandmontage' },
    { value: 'gardinen', label: 'Gardinen-Montage' },
    { value: 'spiegel', label: 'Spiegel-Montage' },
    { value: 'bilder', label: 'Bilder-Aufhängung' },
    { value: 'spielgeräte', label: 'Spielgeräte-Montage' },
    { value: 'fitness', label: 'Fitness-Geräte' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ];

  const complexityOptions = [
    { value: 'einfach', label: 'Einfach (1-2 Stunden)' },
    { value: 'mittel', label: 'Mittel (2-4 Stunden)' },
    { value: 'komplex', label: 'Komplex (4+ Stunden)' },
    { value: 'mehrtägig', label: 'Mehrtägig' },
  ];

  const roomTypeOptions = [
    { value: 'wohnzimmer', label: 'Wohnzimmer' },
    { value: 'schlafzimmer', label: 'Schlafzimmer' },
    { value: 'küche', label: 'Küche' },
    { value: 'bad', label: 'Bad' },
    { value: 'kinderzimmer', label: 'Kinderzimmer' },
    { value: 'büro', label: 'Büro' },
    { value: 'keller', label: 'Keller' },
    { value: 'dachboden', label: 'Dachboden' },
    { value: 'balkon', label: 'Balkon' },
    { value: 'terrasse', label: 'Terrasse' },
    { value: 'garten', label: 'Garten' },
    { value: 'garage', label: 'Garage' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const budgetRangeOptions = [
    { value: 'bis_50', label: 'Bis 50 €' },
    { value: '50_100', label: '50 - 100 €' },
    { value: '100_200', label: '100 - 200 €' },
    { value: '200_500', label: '200 - 500 €' },
    { value: 'über_500', label: 'Über 500 €' },
  ];

  const additionalServicesOptions = [
    { value: 'demontage', label: 'Demontage alter Möbel' },
    { value: 'entsorgung', label: 'Entsorgung' },
    { value: 'transport', label: 'Transport' },
    { value: 'beratung', label: 'Beratung' },
    { value: 'nacharbeit', label: 'Nacharbeiten' },
    { value: 'garantie', label: 'Garantie' },
    { value: 'reinigung', label: 'Reinigung' },
    { value: 'justierung', label: 'Justierung' },
  ];

  const handleInputChange = (field: keyof MontageserviceData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.complexity &&
      formData.roomType &&
      formData.urgency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Montageservice-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Montage" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Montage"
            />
          </FormField>

          <FormField label="Komplexität" required>
            <FormSelect
              value={formData.complexity || ''}
              onChange={value => handleInputChange('complexity', value)}
              options={complexityOptions}
              placeholder="Wählen Sie die Komplexität"
            />
          </FormField>

          <FormField label="Raum" required>
            <FormSelect
              value={formData.roomType || ''}
              onChange={value => handleInputChange('roomType', value)}
              options={roomTypeOptions}
              placeholder="Wählen Sie den Raum"
            />
          </FormField>

          <FormField label="Dringlichkeit" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wählen Sie die Dringlichkeit"
            />
          </FormField>

          <FormField label="Anzahl Teile">
            <FormInput
              type="number"
              value={formData.itemCount?.toString() || ''}
              onChange={value =>
                handleInputChange('itemCount', typeof value === 'string' ? parseInt(value) : value)
              }
              placeholder="Anzahl zu montierender Teile"
            />
          </FormField>

          <FormField label="Budget-Rahmen">
            <FormSelect
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              options={budgetRangeOptions}
              placeholder="Wählen Sie den Budget-Rahmen"
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
          <FormField label="Werkzeug vorhanden">
            <FormRadioGroup
              name="tools"
              value={formData.tools || ''}
              onChange={value => handleInputChange('tools', value)}
              options={[
                { value: 'vorhanden', label: 'Werkzeug vorhanden' },
                { value: 'teilweise', label: 'Teilweise vorhanden' },
                { value: 'nicht_vorhanden', label: 'Nicht vorhanden' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Anleitung vorhanden">
            <FormRadioGroup
              name="instructions"
              value={formData.instructions || ''}
              onChange={value => handleInputChange('instructions', value)}
              options={[
                { value: 'vorhanden', label: 'Anleitung vorhanden' },
                { value: 'nicht_vorhanden', label: 'Nicht vorhanden' },
                { value: 'teilweise', label: 'Teilweise vorhanden' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Produktbeschreibung">
            <FormTextarea
              value={formData.productDescription || ''}
              onChange={value => handleInputChange('productDescription', value)}
              placeholder="Beschreiben Sie die zu montierenden Produkte"
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

export default MontageserviceForm;
