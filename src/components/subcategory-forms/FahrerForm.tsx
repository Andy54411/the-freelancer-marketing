'use client';
import React, { useState, useEffect } from 'react';
import { FahrerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface FahrerFormProps {
  data: FahrerData;
  onDataChange: (data: FahrerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const FahrerForm: React.FC<FahrerFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<FahrerData>(data);

  const serviceTypeOptions = [
    { value: 'privat_chauffeur', label: 'Privatchauffeur' },
    { value: 'business_fahrer', label: 'Business-Fahrer' },
    { value: 'event_fahrer', label: 'Event-Fahrer' },
    { value: 'flughafen_transfer', label: 'Flughafen-Transfer' },
    { value: 'stadt_tour', label: 'Stadttour' },
    { value: 'kurierfahrt', label: 'Kurierfahrt' },
    { value: 'umzugshilfe', label: 'Umzugshilfe Fahrdienst' },
    { value: 'seniorenfahrt', label: 'Seniorenfahrdienst' },
  ];

  const vehicleTypeOptions = [
    { value: 'limousine', label: 'Limousine' },
    { value: 'suv', label: 'SUV' },
    { value: 'van', label: 'Van/Kleinbus' },
    { value: 'kombi', label: 'Kombi' },
    { value: 'cabrio', label: 'Cabrio' },
    { value: 'luxusfahrzeug', label: 'Luxusfahrzeug' },
    { value: 'egal', label: 'Fahrzeugtyp egal' },
  ];

  const durationOptions = [
    { value: 'stundenweise', label: 'Stundenweise' },
    { value: 'halbtags', label: 'Halbtags' },
    { value: 'ganztags', label: 'Ganztags' },
    { value: 'mehrere_tage', label: 'Mehrere Tage' },
    { value: 'wochen', label: 'Wochenweise' },
    { value: 'monatlich', label: 'Monatlich' },
  ];

  const distanceOptions = [
    { value: 'lokal', label: 'Lokal (bis 50 km)' },
    { value: 'regional', label: 'Regional (50-200 km)' },
    { value: 'national', label: 'National (über 200 km)' },
    { value: 'international', label: 'International' },
  ];

  const specialRequirementsOptions = [
    { value: 'kindersitze', label: 'Kindersitze erforderlich' },
    { value: 'rollstuhl', label: 'Rollstuhlgerecht' },
    { value: 'gepäckraum', label: 'Großer Gepäckraum' },
    { value: 'luxus', label: 'Luxusausstattung' },
    { value: 'diskret', label: 'Diskretion erforderlich' },
    { value: 'pünktlichkeit', label: 'Höchste Pünktlichkeit' },
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
      formData.duration &&
      formData.distance &&
      formData.startLocation &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.vehicleType &&
      formData.duration &&
      formData.distance &&
      formData.startLocation &&
      formData.projectDescription
    );
  };

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
              placeholder="Wählen Sie die Art des Fahrdienstes"
            />
          </FormField>

          <FormField label="Fahrzeugtyp" required>
            <FormSelect
              value={formData.vehicleType || ''}
              onChange={value => handleInputChange('vehicleType', value)}
              options={vehicleTypeOptions}
              placeholder="Welcher Fahrzeugtyp wird benötigt?"
            />
          </FormField>

          <FormField label="Dauer" required>
            <FormSelect
              value={formData.duration || ''}
              onChange={value => handleInputChange('duration', value)}
              options={durationOptions}
              placeholder="Wie lange wird der Fahrer benötigt?"
            />
          </FormField>

          <FormField label="Entfernung" required>
            <FormSelect
              value={formData.distance || ''}
              onChange={value => handleInputChange('distance', value)}
              options={distanceOptions}
              placeholder="Welche Entfernungen werden gefahren?"
            />
          </FormField>

          <FormField label="Startort" required>
            <FormInput
              type="text"
              value={formData.startLocation || ''}
              onChange={value => handleInputChange('startLocation', value)}
              placeholder="Von wo soll gestartet werden?"
            />
          </FormField>

          <FormField label="Zielort">
            <FormInput
              type="text"
              value={formData.destination || ''}
              onChange={value => handleInputChange('destination', value)}
              placeholder="Wohin soll gefahren werden?"
            />
          </FormField>

          <FormField label="Datum und Uhrzeit">
            <FormInput
              type="text"
              value={formData.dateTime || ''}
              onChange={value => handleInputChange('dateTime', value)}
              placeholder="Wann wird der Fahrer benötigt?"
            />
          </FormField>

          <FormField label="Anzahl Passagiere">
            <FormInput
              type="number"
              value={formData.numberOfPassengers || ''}
              onChange={value => handleInputChange('numberOfPassengers', value)}
              placeholder="Wie viele Personen fahren mit?"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Besondere Anforderungen an den Fahrer..."
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihren Fahrdienst-Bedarf detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Informationen">
            <FormTextarea
              value={formData.additionalInfo || ''}
              onChange={value => handleInputChange('additionalInfo', value)}
              placeholder="Weitere wichtige Informationen oder Wünsche"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Fahrzeug bereitstellen">
            <FormRadioGroup
              name="vehicleProvision"
              value={formData.vehicleProvision || ''}
              onChange={value => handleInputChange('vehicleProvision', value)}
              options={[
                { value: 'fahrer_fahrzeug', label: 'Fahrer bringt eigenes Fahrzeug mit' },
                { value: 'kunde_fahrzeug', label: 'Kunde stellt Fahrzeug zur Verfügung' },
                { value: 'mietwagen', label: 'Mietwagen wird organisiert' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Budget-Rahmen">
            <FormInput
              type="text"
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              placeholder="z.B. 25-50 EUR/Stunde"
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Fahrer" formData={formData} />
    </div>
  );
};

export default FahrerForm;
