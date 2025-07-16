import React, { useState, useEffect } from 'react';
import { HausmeisterdienstData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface HausmeisterdienstFormProps {
  data: HausmeisterdienstData;
  onDataChange: (data: HausmeisterdienstData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const HausmeisterdienstForm: React.FC<HausmeisterdienstFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<HausmeisterdienstData>(data);

  const serviceTypeOptions = [
    { value: 'einmalig', label: 'Einmalige Dienstleistung' },
    { value: 'regelmäßig', label: 'Regelmäßige Betreuung' },
    { value: 'notfall', label: 'Notfall-Service' },
    { value: 'wartung', label: 'Wartungsarbeiten' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'täglich', label: 'Täglich' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'bei_bedarf', label: 'Bei Bedarf' },
  ];

  const propertyTypeOptions = [
    { value: 'wohngebäude', label: 'Wohngebäude' },
    { value: 'bürogebäude', label: 'Bürogebäude' },
    { value: 'gewerbe', label: 'Gewerbeimmobilie' },
    { value: 'mehrfamilienhaus', label: 'Mehrfamilienhaus' },
    { value: 'einfamilienhaus', label: 'Einfamilienhaus' },
  ];

  const servicesOptions = [
    { value: 'reinigung', label: 'Reinigungsarbeiten' },
    { value: 'gartenpflege', label: 'Gartenpflege' },
    { value: 'winterdienst', label: 'Winterdienst' },
    { value: 'kleinreparaturen', label: 'Kleinreparaturen' },
    { value: 'wartung', label: 'Wartungsarbeiten' },
    { value: 'kontrolle', label: 'Kontrollgänge' },
    { value: 'schlüsseldienst', label: 'Schlüsseldienst' },
    { value: 'post', label: 'Postverteilung' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'heute', label: 'Heute' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const availabilityOptions = [
    { value: 'werktags', label: 'Werktags' },
    { value: 'wochenende', label: 'Wochenende' },
    { value: 'feiertags', label: 'Feiertags' },
    { value: 'rund_um_uhr', label: 'Rund um die Uhr' },
  ];

  const handleInputChange = (field: keyof HausmeisterdienstData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.frequency &&
      formData.propertyType &&
      formData.urgency &&
      formData.availability &&
      typeof formData.emergencyService === 'boolean'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Hausmeisterdienst-Projektdetails
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

          <FormField label="Häufigkeit" required>
            <FormSelect
              value={formData.frequency || ''}
              onChange={value => handleInputChange('frequency', value)}
              options={frequencyOptions}
              placeholder="Wählen Sie die Häufigkeit"
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

          <FormField label="Dringlichkeit" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wählen Sie die Dringlichkeit"
            />
          </FormField>

          <FormField label="Verfügbarkeit" required>
            <FormSelect
              value={formData.availability || ''}
              onChange={value => handleInputChange('availability', value)}
              options={availabilityOptions}
              placeholder="Wann soll der Service verfügbar sein?"
            />
          </FormField>

          <FormField label="Anzahl Einheiten">
            <FormInput
              type="number"
              value={formData.numberOfUnits?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfUnits',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Wohneinheiten/Büros"
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

          <FormField label="Außenbereich (m²)">
            <FormInput
              type="number"
              value={formData.outsideArea?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'outsideArea',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Außenbereich in m²"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Notfall-Service gewünscht">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="emergencyService"
                  checked={formData.emergencyService === true}
                  onChange={() => handleInputChange('emergencyService', true)}
                  className="mr-2"
                />
                Ja, Notfall-Service gewünscht
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="emergencyService"
                  checked={formData.emergencyService === false}
                  onChange={() => handleInputChange('emergencyService', false)}
                  className="mr-2"
                />
                Nein, nur regulärer Service
              </label>
            </div>
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gewünschte Services">
            <FormCheckboxGroup
              options={servicesOptions}
              value={formData.services || []}
              onChange={value => handleInputChange('services', value)}
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

export default HausmeisterdienstForm;
