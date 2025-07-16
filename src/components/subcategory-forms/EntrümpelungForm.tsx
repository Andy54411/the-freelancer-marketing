import React, { useState, useEffect } from 'react';
import { EntrümpelungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface EntrümpelungFormProps {
  data: EntrümpelungData;
  onDataChange: (data: EntrümpelungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const EntrümpelungForm: React.FC<EntrümpelungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<EntrümpelungData>(data);

  const serviceTypeOptions = [
    { value: 'komplett', label: 'Komplette Entrümpelung' },
    { value: 'teilweise', label: 'Teilweise Entrümpelung' },
    { value: 'keller', label: 'Keller entrümpeln' },
    { value: 'dachboden', label: 'Dachboden entrümpeln' },
    { value: 'garage', label: 'Garage entrümpeln' },
    { value: 'büro', label: 'Büro entrümpeln' },
  ];

  const propertyTypeOptions = [
    { value: 'wohnung', label: 'Wohnung' },
    { value: 'haus', label: 'Haus' },
    { value: 'büro', label: 'Büro' },
    { value: 'gewerbe', label: 'Gewerberäume' },
    { value: 'keller', label: 'Keller' },
    { value: 'dachboden', label: 'Dachboden' },
    { value: 'garage', label: 'Garage' },
  ];

  const volumeOptions = [
    { value: 'klein', label: 'Klein (1-3 m³)' },
    { value: 'mittel', label: 'Mittel (3-10 m³)' },
    { value: 'groß', label: 'Groß (10-20 m³)' },
    { value: 'sehr_groß', label: 'Sehr groß (über 20 m³)' },
  ];

  const accessibilityOptions = [
    { value: 'ebenerdig', label: 'Ebenerdig' },
    { value: 'treppe', label: 'Treppen vorhanden' },
    { value: 'aufzug', label: 'Aufzug vorhanden' },
    { value: 'schwer', label: 'Schwer zugänglich' },
  ];

  const disposalOptions = [
    { value: 'standard', label: 'Standard Entsorgung' },
    { value: 'sortiert', label: 'Sortierte Entsorgung' },
    { value: 'recycling', label: 'Recycling-gerecht' },
    { value: 'sondermüll', label: 'Sondermüll vorhanden' },
  ];

  const itemTypesOptions = [
    { value: 'möbel', label: 'Möbel' },
    { value: 'elektro', label: 'Elektrogeräte' },
    { value: 'kleidung', label: 'Kleidung' },
    { value: 'bücher', label: 'Bücher/Papier' },
    { value: 'bauschutt', label: 'Bauschutt' },
    { value: 'sperrmüll', label: 'Sperrmüll' },
    { value: 'wertstoffe', label: 'Wertstoffe' },
  ];

  const handleInputChange = (field: keyof EntrümpelungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.propertyType &&
      formData.volume &&
      formData.accessibility &&
      formData.disposal &&
      typeof formData.cleaningIncluded === 'boolean'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Entrümpelung-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Entrümpelung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Entrümpelung"
            />
          </FormField>

          <FormField label="Objekttyp" required>
            <FormSelect
              value={formData.propertyType || ''}
              onChange={value => handleInputChange('propertyType', value)}
              options={propertyTypeOptions}
              placeholder="Wählen Sie den Objekttyp"
            />
          </FormField>

          <FormField label="Volumen" required>
            <FormSelect
              value={formData.volume || ''}
              onChange={value => handleInputChange('volume', value)}
              options={volumeOptions}
              placeholder="Schätzen Sie das Volumen"
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

          <FormField label="Entsorgung" required>
            <FormSelect
              value={formData.disposal || ''}
              onChange={value => handleInputChange('disposal', value)}
              options={disposalOptions}
              placeholder="Art der Entsorgung"
            />
          </FormField>

          <FormField label="Anzahl Räume">
            <FormInput
              type="number"
              value={formData.numberOfRooms?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfRooms',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Räume"
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
              placeholder="Fläche in m²"
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
        </div>

        <div className="mt-4">
          <FormField label="Reinigung inklusive">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="cleaningIncluded"
                  checked={formData.cleaningIncluded === true}
                  onChange={() => handleInputChange('cleaningIncluded', true)}
                  className="mr-2"
                />
                Ja, Reinigung inklusive
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="cleaningIncluded"
                  checked={formData.cleaningIncluded === false}
                  onChange={() => handleInputChange('cleaningIncluded', false)}
                  className="mr-2"
                />
                Nein, nur Entrümpelung
              </label>
            </div>
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gegenstandstypen">
            <FormCheckboxGroup
              options={itemTypesOptions}
              value={formData.itemTypes || []}
              onChange={value => handleInputChange('itemTypes', value)}
            />
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

export default EntrümpelungForm;
