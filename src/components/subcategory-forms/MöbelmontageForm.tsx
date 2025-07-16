import React, { useState, useEffect } from 'react';
import { MöbelmontageData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface MöbelmontageFormProps {
  data: MöbelmontageData;
  onDataChange: (data: MöbelmontageData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const MöbelmontageForm: React.FC<MöbelmontageFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<MöbelmontageData>(data);

  const serviceTypeOptions = [
    { value: 'aufbau', label: 'Möbel aufbauen' },
    { value: 'abbau', label: 'Möbel abbauen' },
    { value: 'umzug', label: 'Abbau und Aufbau' },
    { value: 'reparatur', label: 'Reparatur' },
  ];

  const furnitureTypeOptions = [
    { value: 'ikea', label: 'IKEA Möbel' },
    { value: 'küche', label: 'Küche' },
    { value: 'schlafzimmer', label: 'Schlafzimmer' },
    { value: 'wohnzimmer', label: 'Wohnzimmer' },
    { value: 'büro', label: 'Büromöbel' },
    { value: 'badezimmer', label: 'Badezimmer' },
    { value: 'kinderzimmer', label: 'Kinderzimmer' },
    { value: 'schrank', label: 'Schränke' },
    { value: 'regale', label: 'Regale' },
    { value: 'tische', label: 'Tische' },
    { value: 'stühle', label: 'Stühle' },
    { value: 'betten', label: 'Betten' },
  ];

  const complexityOptions = [
    { value: 'einfach', label: 'Einfach (Regale, Tische)' },
    { value: 'mittel', label: 'Mittel (Schränke, Betten)' },
    { value: 'komplex', label: 'Komplex (Küchen, Einbauschränke)' },
    { value: 'sehr_komplex', label: 'Sehr komplex (Maßmöbel)' },
  ];

  const toolsOptions = [
    { value: 'vorhanden', label: 'Werkzeug vorhanden' },
    { value: 'mitbringen', label: 'Werkzeug mitbringen' },
    { value: 'teilweise', label: 'Teilweise vorhanden' },
  ];

  const locationOptions = [
    { value: 'wohnung', label: 'Wohnung' },
    { value: 'haus', label: 'Haus' },
    { value: 'büro', label: 'Büro' },
    { value: 'gewerbe', label: 'Gewerberäume' },
  ];

  const accessibilityOptions = [
    { value: 'ebenerdig', label: 'Ebenerdig' },
    { value: 'treppe', label: 'Treppen' },
    { value: 'aufzug', label: 'Aufzug vorhanden' },
    { value: 'schwer', label: 'Schwer zugänglich' },
  ];

  const handleInputChange = (field: keyof MöbelmontageData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.furnitureType &&
      formData.complexity &&
      formData.tools &&
      formData.location &&
      formData.accessibility &&
      typeof formData.instructionsAvailable === 'boolean'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Möbelmontage-Projektdetails
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

          <FormField label="Möbeltyp" required>
            <FormSelect
              value={formData.furnitureType || ''}
              onChange={value => handleInputChange('furnitureType', value)}
              options={furnitureTypeOptions}
              placeholder="Wählen Sie den Möbeltyp"
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

          <FormField label="Werkzeug" required>
            <FormSelect
              value={formData.tools || ''}
              onChange={value => handleInputChange('tools', value)}
              options={toolsOptions}
              placeholder="Werkzeug-Situation"
            />
          </FormField>

          <FormField label="Standort" required>
            <FormSelect
              value={formData.location || ''}
              onChange={value => handleInputChange('location', value)}
              options={locationOptions}
              placeholder="Wählen Sie den Standort"
            />
          </FormField>

          <FormField label="Zugänglichkeit" required>
            <FormSelect
              value={formData.accessibility || ''}
              onChange={value => handleInputChange('accessibility', value)}
              options={accessibilityOptions}
              placeholder="Wie ist die Zugänglichkeit?"
            />
          </FormField>

          <FormField label="Anzahl Möbelstücke">
            <FormInput
              type="number"
              value={formData.numberOfItems?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfItems',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Möbelstücke"
            />
          </FormField>

          <FormField label="Geschätzte Arbeitszeit (h)">
            <FormInput
              type="number"
              value={formData.estimatedTime?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'estimatedTime',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Geschätzte Arbeitszeit"
            />
          </FormField>

          <FormField label="Stockwerk">
            <FormInput
              type="number"
              value={formData.floor?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'floor',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Stockwerk"
            />
          </FormField>

          <FormField label="Hersteller/Marke">
            <FormInput
              type="text"
              value={formData.brand || ''}
              onChange={value => handleInputChange('brand', value)}
              placeholder="z.B. IKEA, Poco, etc."
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Aufbauanleitung vorhanden">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="instructionsAvailable"
                  checked={formData.instructionsAvailable === true}
                  onChange={() => handleInputChange('instructionsAvailable', true)}
                  className="mr-2"
                />
                Ja, Aufbauanleitung vorhanden
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="instructionsAvailable"
                  checked={formData.instructionsAvailable === false}
                  onChange={() => handleInputChange('instructionsAvailable', false)}
                  className="mr-2"
                />
                Nein, keine Anleitung vorhanden
              </label>
            </div>
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Beschreiben Sie besondere Wünsche, Anforderungen oder Besonderheiten des Auftrags"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default MöbelmontageForm;
