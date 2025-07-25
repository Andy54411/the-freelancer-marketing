'use client';
import React, { useState, useEffect } from 'react';
import { SpediteurData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface SpediteurFormProps {
  data: SpediteurData;
  onDataChange: (data: SpediteurData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SpediteurForm: React.FC<SpediteurFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<SpediteurData>(data);

  const serviceTypeOptions = [
    { value: 'transport', label: 'Transport/Lieferung' },
    { value: 'distribution', label: 'Distribution' },
    { value: 'courier', label: 'Kurierdienst' },
    { value: 'moving', label: 'Umzugsservice' },
    { value: 'express', label: 'Express-Transport' },
    { value: 'logistics', label: 'Logistik-Service' },
    { value: 'special_transport', label: 'Spezialtransport' },
    { value: 'international', label: 'Internationale Spedition' },
  ];

  const vehicleTypeOptions = [
    { value: 'pkw', label: 'PKW' },
    { value: 'kleinbus', label: 'Kleinbus/Transporter' },
    { value: 'lkw_75t', label: 'LKW bis 7,5t' },
    { value: 'lkw_12t', label: 'LKW bis 12t' },
    { value: 'lkw_40t', label: 'LKW bis 40t' },
    { value: 'sattelzug', label: 'Sattelzug' },
    { value: 'special', label: 'Spezialfahrzeug' },
  ];

  const distanceTypeOptions = [
    { value: 'regional', label: 'Regional (bis 100km)' },
    { value: 'national', label: 'National (Deutschland)' },
    { value: 'eu', label: 'EU-weit' },
    { value: 'international', label: 'International/Weltweit' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'heute', label: 'Heute' },
    { value: 'morgen', label: 'Morgen' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof SpediteurData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.vehicleType &&
      formData.fromLocation &&
      formData.toLocation &&
      formData.urgency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.vehicleType &&
      formData.fromLocation &&
      formData.toLocation &&
      formData.urgency
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Spediteur Projektdetails
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

          <FormField label="Fahrzeugtyp" required>
            <FormSelect
              value={formData.vehicleType || ''}
              onChange={value => handleInputChange('vehicleType', value)}
              options={vehicleTypeOptions}
              placeholder="Welches Fahrzeug wird benötigt?"
            />
          </FormField>

          <FormField label="Von (Abholort)" required>
            <FormInput
              type="text"
              value={formData.fromLocation || ''}
              onChange={value => handleInputChange('fromLocation', value)}
              placeholder="z.B. Berlin, 10115"
            />
          </FormField>

          <FormField label="Nach (Zielort)" required>
            <FormInput
              type="text"
              value={formData.toLocation || ''}
              onChange={value => handleInputChange('toLocation', value)}
              placeholder="z.B. München, 80331"
            />
          </FormField>

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wann soll transportiert werden?"
            />
          </FormField>

          <FormField label="Entfernungstyp">
            <FormSelect
              value={formData.distanceType || ''}
              onChange={value => handleInputChange('distanceType', value)}
              options={distanceTypeOptions}
              placeholder="Regional/National/International?"
            />
          </FormField>

          <FormField label="Gewicht der Ladung">
            <FormInput
              type="text"
              value={formData.weight || ''}
              onChange={value => handleInputChange('weight', value)}
              placeholder="z.B. 500 kg, 2 Tonnen"
            />
          </FormField>

          <FormField label="Volumen der Ladung">
            <FormInput
              type="text"
              value={formData.volume || ''}
              onChange={value => handleInputChange('volume', value)}
              placeholder="z.B. 5 m³, 10 Paletten"
            />
          </FormField>

          <FormField label="Ladungstyp">
            <FormInput
              type="text"
              value={formData.cargoType || ''}
              onChange={value => handleInputChange('cargoType', value)}
              placeholder="z.B. Möbel, Maschinen, Lebensmittel"
            />
          </FormField>

          <FormField label="Wunschtermin">
            <FormInput
              type="text"
              value={formData.preferredDate || ''}
              onChange={value => handleInputChange('preferredDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Spezielle Anforderungen">
            <FormCheckboxGroup
              value={formData.specialRequirements || []}
              onChange={value => handleInputChange('specialRequirements', value)}
              options={[
                { value: 'fragile', label: 'Zerbrechliche Ware' },
                { value: 'temperature', label: 'Temperaturgeführt' },
                { value: 'hazardous', label: 'Gefahrgut' },
                { value: 'oversized', label: 'Übermaße' },
                { value: 'valuable', label: 'Wertvolle Güter' },
                { value: 'express', label: 'Express-Service' },
                { value: 'loading_help', label: 'Beladehilfe benötigt' },
                { value: 'insurance', label: 'Zusatzversicherung' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Services">
            <FormCheckboxGroup
              value={formData.additionalServices || []}
              onChange={value => handleInputChange('additionalServices', value)}
              options={[
                { value: 'packaging', label: 'Verpackungsservice' },
                { value: 'assembly', label: 'Montage/Demontage' },
                { value: 'storage', label: 'Zwischenlagerung' },
                { value: 'return', label: 'Rücktransport' },
                { value: 'tracking', label: 'Live-Tracking' },
                { value: 'photo_proof', label: 'Foto-Nachweis' },
                { value: 'signature', label: 'Unterschrifts-Nachweis' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Beschreibung der Ladung">
            <FormTextarea
              value={formData.cargoDescription || ''}
              onChange={value => handleInputChange('cargoDescription', value)}
              placeholder="Beschreiben Sie die zu transportierende Ladung..."
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Hinweise">
            <FormTextarea
              value={formData.specialInstructions || ''}
              onChange={value => handleInputChange('specialInstructions', value)}
              placeholder="Besondere Hinweise für den Transport..."
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Versicherung gewünscht">
            <FormRadioGroup
              name="insurance"
              value={formData.insurance || ''}
              onChange={value => handleInputChange('insurance', value)}
              options={[
                { value: 'standard', label: 'Standard-Versicherung' },
                { value: 'premium', label: 'Premium-Versicherung' },
                { value: 'custom', label: 'Individuelle Versicherung' },
                { value: 'none', label: 'Keine Zusatzversicherung' },
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
              placeholder="z.B. 200-500 EUR"
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Spediteur" formData={formData} />
    </div>
  );
};

export default SpediteurForm;
