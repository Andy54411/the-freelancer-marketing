import React, { useState, useEffect } from 'react';
import { FahrerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface FahrerFormProps {
  data: FahrerData;
  onDataChange: (data: FahrerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const FahrerForm: React.FC<FahrerFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<FahrerData>(data);

  const serviceTypeOptions = [
    { value: 'einmalig', label: 'Einmalige Fahrt' },
    { value: 'regelmäßig', label: 'Regelmäßige Fahrten' },
    { value: 'stundenweise', label: 'Stundenweise' },
    { value: 'tagesweise', label: 'Tagesweise' },
  ];

  const vehicleTypeOptions = [
    { value: 'pkw', label: 'PKW' },
    { value: 'kombi', label: 'Kombi' },
    { value: 'transporter', label: 'Transporter' },
    { value: 'lkw', label: 'LKW' },
    { value: 'bus', label: 'Bus' },
    { value: 'motorrad', label: 'Motorrad' },
  ];

  const purposeOptions = [
    { value: 'person', label: 'Personentransport' },
    { value: 'transport', label: 'Warentransport' },
    { value: 'umzug', label: 'Umzug' },
    { value: 'einkauf', label: 'Einkaufsfahrt' },
    { value: 'arzt', label: 'Arztbesuch' },
    { value: 'flughafen', label: 'Flughafen-Transfer' },
    { value: 'event', label: 'Event-Transport' },
    { value: 'business', label: 'Business-Fahrt' },
  ];

  const distanceOptions = [
    { value: 'lokal', label: 'Lokal (bis 50 km)' },
    { value: 'regional', label: 'Regional (50-200 km)' },
    { value: 'überregional', label: 'Überregional (über 200 km)' },
    { value: 'international', label: 'International' },
  ];

  const durationOptions = [
    { value: 'unter_1h', label: 'Unter 1 Stunde' },
    { value: '1_3h', label: '1-3 Stunden' },
    { value: '3_6h', label: '3-6 Stunden' },
    { value: 'ganztags', label: 'Ganztags' },
    { value: 'mehrtägig', label: 'Mehrtägig' },
  ];

  const licenseOptions = [
    { value: 'b', label: 'Führerschein Klasse B' },
    { value: 'be', label: 'Führerschein Klasse BE' },
    { value: 'c', label: 'Führerschein Klasse C' },
    { value: 'ce', label: 'Führerschein Klasse CE' },
    { value: 'd', label: 'Führerschein Klasse D' },
    { value: 'taxi', label: 'Taxi-Schein' },
  ];

  const handleInputChange = (field: keyof FahrerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.vehicleType &&
      formData.purpose &&
      formData.distance &&
      formData.duration &&
      formData.license &&
      typeof formData.ownVehicle === 'boolean'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Fahrer-Projektdetails
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

          <FormField label="Fahrzeugtyp" required>
            <FormSelect
              value={formData.vehicleType || ''}
              onChange={value => handleInputChange('vehicleType', value)}
              options={vehicleTypeOptions}
              placeholder="Wählen Sie den Fahrzeugtyp"
            />
          </FormField>

          <FormField label="Zweck der Fahrt" required>
            <FormSelect
              value={formData.purpose || ''}
              onChange={value => handleInputChange('purpose', value)}
              options={purposeOptions}
              placeholder="Wählen Sie den Zweck"
            />
          </FormField>

          <FormField label="Entfernung" required>
            <FormSelect
              value={formData.distance || ''}
              onChange={value => handleInputChange('distance', value)}
              options={distanceOptions}
              placeholder="Wählen Sie die Entfernung"
            />
          </FormField>

          <FormField label="Dauer" required>
            <FormSelect
              value={formData.duration || ''}
              onChange={value => handleInputChange('duration', value)}
              options={durationOptions}
              placeholder="Wählen Sie die Dauer"
            />
          </FormField>

          <FormField label="Führerschein" required>
            <FormSelect
              value={formData.license || ''}
              onChange={value => handleInputChange('license', value)}
              options={licenseOptions}
              placeholder="Erforderlicher Führerschein"
            />
          </FormField>

          <FormField label="Anzahl Personen">
            <FormInput
              type="number"
              value={formData.numberOfPeople?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfPeople',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Personen"
            />
          </FormField>

          <FormField label="Startort">
            <FormInput
              type="text"
              value={formData.startLocation || ''}
              onChange={value => handleInputChange('startLocation', value)}
              placeholder="Startort der Fahrt"
            />
          </FormField>

          <FormField label="Zielort">
            <FormInput
              type="text"
              value={formData.destination || ''}
              onChange={value => handleInputChange('destination', value)}
              placeholder="Zielort der Fahrt"
            />
          </FormField>

          <FormField label="Datum und Zeit">
            <FormInput
              type="text"
              value={formData.dateTime || ''}
              onChange={value => handleInputChange('dateTime', value)}
              placeholder="TT.MM.JJJJ HH:MM"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Eigenes Fahrzeug">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="ownVehicle"
                  checked={formData.ownVehicle === true}
                  onChange={() => handleInputChange('ownVehicle', true)}
                  className="mr-2"
                />
                Ja, eigenes Fahrzeug wird gestellt
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="ownVehicle"
                  checked={formData.ownVehicle === false}
                  onChange={() => handleInputChange('ownVehicle', false)}
                  className="mr-2"
                />
                Nein, Fahrzeug wird benötigt
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

export default FahrerForm;
