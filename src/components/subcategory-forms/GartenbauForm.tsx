'use client';
import React, { useState, useEffect } from 'react';
import { GartenData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface GartenbauFormProps {
  data: GartenData;
  onDataChange: (data: GartenData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const GartenbauForm: React.FC<GartenbauFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<GartenData>(data);

  const serviceTypeOptions = [
    { value: 'gartenplanung', label: 'Gartenplanung' },
    { value: 'gartenpflege', label: 'Gartenpflege' },
    { value: 'gartenanlage', label: 'Gartenanlage' },
    { value: 'gartenbau', label: 'Gartenbau' },
    { value: 'landschaftsbau', label: 'Landschaftsbau' },
    { value: 'bepflanzung', label: 'Bepflanzung' },
    { value: 'bewässerung', label: 'Bewässerungsanlage' },
    { value: 'rasenpflege', label: 'Rasenpflege' },
  ];

  const gardenTypeOptions = [
    { value: 'privatgarten', label: 'Privatgarten' },
    { value: 'dachgarten', label: 'Dachgarten' },
    { value: 'vorgarten', label: 'Vorgarten' },
    { value: 'balkongarten', label: 'Balkongarten' },
    { value: 'gewerbe', label: 'Gewerbegelände' },
    { value: 'parkanlage', label: 'Parkanlage' },
  ];

  const gardenSizeOptions = [
    { value: 'klein', label: 'Klein (bis 100 m²)' },
    { value: 'mittel', label: 'Mittel (100-500 m²)' },
    { value: 'gross', label: 'Groß (500-1000 m²)' },
    { value: 'sehr_gross', label: 'Sehr groß (über 1000 m²)' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'diesen_monat', label: 'Diesen Monat' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof GartenData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.gardenType &&
      formData.gardenSize &&
      formData.urgency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.gardenType &&
      formData.gardenSize &&
      formData.urgency
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Gartenbau Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Welcher Service wird benötigt?"
            />
          </FormField>

          <FormField label="Art des Gartens" required>
            <FormSelect
              value={formData.gardenType || ''}
              onChange={value => handleInputChange('gardenType', value)}
              options={gardenTypeOptions}
              placeholder="Was für ein Garten ist es?"
            />
          </FormField>

          <FormField label="Gartengröße" required>
            <FormSelect
              value={formData.gardenSize || ''}
              onChange={value => handleInputChange('gardenSize', value)}
              options={gardenSizeOptions}
              placeholder="Wie groß ist der Garten?"
            />
          </FormField>

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wann soll das Projekt starten?"
            />
          </FormField>

          <FormField label="Budget-Rahmen">
            <FormInput
              type="text"
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              placeholder="z.B. 1.000-5.000 EUR"
            />
          </FormField>

          <FormField label="Quadratmeter (genau)">
            <FormInput
              type="number"
              value={formData.squareMeters || ''}
              onChange={value => handleInputChange('squareMeters', Number(value))}
              placeholder="z.B. 250"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gewünschte Arbeiten">
            <FormCheckboxGroup
              value={formData.services || []}
              onChange={value => handleInputChange('services', value)}
              options={[
                { value: 'planung', label: 'Gartenplanung' },
                { value: 'erdarbeiten', label: 'Erdarbeiten' },
                { value: 'pflanzung', label: 'Bepflanzung' },
                { value: 'rasen', label: 'Rasenanlage' },
                { value: 'bewässerung', label: 'Bewässerungssystem' },
                { value: 'wege', label: 'Wege und Terrassen' },
                { value: 'zäune', label: 'Zäune und Sichtschutz' },
                { value: 'beleuchtung', label: 'Gartenbeleuchtung' },
                { value: 'pflege', label: 'Laufende Pflege' },
                { value: 'bäume', label: 'Baumarbeiten' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung">
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihr Gartenprojekt..."
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Besondere Wünsche oder Anforderungen..."
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gartenstil">
            <FormRadioGroup
              name="gardenStyle"
              value={formData.gardenStyle || ''}
              onChange={value => handleInputChange('gardenStyle', value)}
              options={[
                { value: 'modern', label: 'Modern' },
                { value: 'klassisch', label: 'Klassisch' },
                { value: 'natürlich', label: 'Natürlich' },
                { value: 'mediterran', label: 'Mediterran' },
                { value: 'japanisch', label: 'Japanisch' },
                { value: 'pflegeleicht', label: 'Pflegeleicht' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bodenbeschaffenheit">
            <FormRadioGroup
              name="soilType"
              value={formData.soilType || ''}
              onChange={value => handleInputChange('soilType', value)}
              options={[
                { value: 'lehm', label: 'Lehmboden' },
                { value: 'sand', label: 'Sandboden' },
                { value: 'ton', label: 'Tonboden' },
                { value: 'gemischt', label: 'Gemischt' },
                { value: 'unbekannt', label: 'Unbekannt' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Gartenbau" formData={formData} />
    </div>
  );
};

export default GartenbauForm;
