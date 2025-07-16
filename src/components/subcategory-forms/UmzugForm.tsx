import React, { useState, useEffect } from 'react';
import { UmzugData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface UmzugFormProps {
  data: UmzugData;
  onDataChange: (data: UmzugData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const UmzugForm: React.FC<UmzugFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<UmzugData>(data);

  const serviceTypeOptions = [
    { value: 'komplettservice', label: 'Komplettservice' },
    { value: 'nur_transport', label: 'Nur Transport' },
    { value: 'nur_verpackung', label: 'Nur Verpackung' },
    { value: 'nur_hilfe', label: 'Nur Hilfe beim Tragen' },
  ];

  const hasElevatorOptions = [
    { value: 'beide', label: 'Beide Standorte haben Aufzug' },
    { value: 'von', label: 'Nur Abholort hat Aufzug' },
    { value: 'nach', label: 'Nur Zielort hat Aufzug' },
    { value: 'keine', label: 'Keine Aufzüge vorhanden' },
  ];

  const furnitureTypeOptions = [
    { value: 'schwere_möbel', label: 'Schwere Möbel' },
    { value: 'zerbrechlich', label: 'Zerbrechliche Gegenstände' },
    { value: 'elektronik', label: 'Elektronik' },
    { value: 'pflanzen', label: 'Pflanzen' },
    { value: 'klavier', label: 'Klavier/Flügel' },
  ];

  const packingMaterialOptions = [
    { value: 'benötigt', label: 'Verpackungsmaterial wird benötigt' },
    { value: 'vorhanden', label: 'Verpackungsmaterial ist vorhanden' },
    { value: 'nicht_nötig', label: 'Nicht nötig' },
  ];

  const vehicleSizeOptions = [
    { value: 'klein', label: 'Klein (Transporter)' },
    { value: 'mittel', label: 'Mittel (7,5t LKW)' },
    { value: 'groß', label: 'Groß (12t LKW)' },
    { value: 'lkw', label: 'LKW (>12t)' },
  ];

  const additionalServicesOptions = [
    { value: 'montage', label: 'Möbelmontage' },
    { value: 'demontage', label: 'Möbeldemontage' },
    { value: 'verpackung', label: 'Verpackungsservice' },
    { value: 'reinigung', label: 'Endreinigung' },
  ];

  const handleInputChange = (field: keyof UmzugData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      typeof formData.fromFloor === 'number' &&
      typeof formData.toFloor === 'number' &&
      formData.hasElevator &&
      typeof formData.distance === 'number' &&
      typeof formData.roomCount === 'number' &&
      formData.furnitureType &&
      formData.furnitureType.length > 0 &&
      formData.packingMaterial &&
      formData.vehicleSize &&
      formData.additionalServices &&
      typeof formData.dateFlexible === 'boolean'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Umzugshelfer-Projektdetails
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

          <FormField label="Stockwerk Abholort" required>
            <FormInput
              type="number"
              value={formData.fromFloor?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'fromFloor',
                  typeof value === 'string' ? (value ? parseInt(value) : 0) : value
                )
              }
              placeholder="Stockwerk der alten Wohnung"
            />
          </FormField>

          <FormField label="Stockwerk Zielort" required>
            <FormInput
              type="number"
              value={formData.toFloor?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'toFloor',
                  typeof value === 'string' ? (value ? parseInt(value) : 0) : value
                )
              }
              placeholder="Stockwerk der neuen Wohnung"
            />
          </FormField>

          <FormField label="Aufzug verfügbar" required>
            <FormSelect
              value={formData.hasElevator || ''}
              onChange={value => handleInputChange('hasElevator', value)}
              options={hasElevatorOptions}
              placeholder="Verfügbarkeit von Aufzügen"
            />
          </FormField>

          <FormField label="Entfernung (km)" required>
            <FormInput
              type="number"
              value={formData.distance?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'distance',
                  typeof value === 'string' ? (value ? parseInt(value) : 0) : value
                )
              }
              placeholder="Entfernung zwischen den Standorten"
            />
          </FormField>

          <FormField label="Anzahl Zimmer" required>
            <FormInput
              type="number"
              value={formData.roomCount?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'roomCount',
                  typeof value === 'string' ? (value ? parseInt(value) : 0) : value
                )
              }
              placeholder="Anzahl der Zimmer"
            />
          </FormField>

          <FormField label="Verpackungsmaterial" required>
            <FormSelect
              value={formData.packingMaterial || ''}
              onChange={value => handleInputChange('packingMaterial', value)}
              options={packingMaterialOptions}
              placeholder="Bedarf an Verpackungsmaterial"
            />
          </FormField>

          <FormField label="Fahrzeuggröße" required>
            <FormSelect
              value={formData.vehicleSize || ''}
              onChange={value => handleInputChange('vehicleSize', value)}
              options={vehicleSizeOptions}
              placeholder="Benötigte Fahrzeuggröße"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Möbelarten" required>
            <FormCheckboxGroup
              value={formData.furnitureType || []}
              onChange={value => handleInputChange('furnitureType', value)}
              options={furnitureTypeOptions}
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
          <FormField label="Terminflexibilität">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="dateFlexible"
                  checked={formData.dateFlexible === true}
                  onChange={() => handleInputChange('dateFlexible', true)}
                  className="mr-2"
                />
                Termin ist flexibel
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="dateFlexible"
                  checked={formData.dateFlexible === false}
                  onChange={() => handleInputChange('dateFlexible', false)}
                  className="mr-2"
                />
                Fester Termin erforderlich
              </label>
            </div>
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Beschreiben Sie besondere Wünsche, schwierige Zugangsbedingungen oder Besonderheiten des Umzugs"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default UmzugForm;
