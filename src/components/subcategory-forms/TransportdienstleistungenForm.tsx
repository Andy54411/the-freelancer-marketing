import React, { useState, useEffect } from 'react';
import { TransportdienstleistungenData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormSubmitButton,
} from './FormComponents';

interface TransportdienstleistungenFormProps {
  data: TransportdienstleistungenData;
  onDataChange: (data: TransportdienstleistungenData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const TransportdienstleistungenForm: React.FC<TransportdienstleistungenFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<TransportdienstleistungenData>(data);

  const serviceTypeOptions = [
    { value: 'standard', label: 'Standard-Transport' },
    { value: 'express', label: 'Express-Transport' },
    { value: 'overnight', label: 'Overnight-Transport' },
    { value: 'scheduled', label: 'Terminierter Transport' },
    { value: 'recurring', label: 'Regelmäßiger Transport' },
  ];

  const vehicleTypeOptions = [
    { value: 'pkw', label: 'PKW' },
    { value: 'kombi', label: 'Kombi' },
    { value: 'transporter', label: 'Transporter' },
    { value: 'lkw_75t', label: 'LKW 7,5t' },
    { value: 'lkw_12t', label: 'LKW 12t' },
    { value: 'lkw_24t', label: 'LKW 24t' },
    { value: 'sattelzug', label: 'Sattelzug' },
    { value: 'spezialfahrzeug', label: 'Spezialfahrzeug' },
  ];

  const loadTypeOptions = [
    { value: 'standard', label: 'Standard-Ladung' },
    { value: 'sperrig', label: 'Sperrige Güter' },
    { value: 'schwer', label: 'Schwere Güter' },
    { value: 'fragile', label: 'Zerbrechliche Güter' },
    { value: 'hazardous', label: 'Gefahrgut' },
    { value: 'refrigerated', label: 'Kühlware' },
    { value: 'valuable', label: 'Wertvolle Güter' },
  ];

  const distanceOptions = [
    { value: 'lokal', label: 'Lokal (bis 50 km)' },
    { value: 'regional', label: 'Regional (50-200 km)' },
    { value: 'national', label: 'National (über 200 km)' },
    { value: 'international', label: 'International' },
  ];

  const additionalServicesOptions = [
    { value: 'loading', label: 'Be- und Entladung' },
    { value: 'packaging', label: 'Verpackung' },
    { value: 'insurance', label: 'Zusätzliche Versicherung' },
    { value: 'tracking', label: 'Sendungsverfolgung' },
    { value: 'appointment', label: 'Terminabsprache' },
    { value: 'signature', label: 'Unterschrift bei Zustellung' },
    { value: 'photo', label: 'Foto bei Zustellung' },
  ];

  const handleInputChange = (field: keyof TransportdienstleistungenData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.vehicleType &&
      formData.loadType &&
      formData.distance &&
      formData.pickupAddress &&
      formData.deliveryAddress
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.vehicleType &&
      formData.loadType &&
      formData.distance &&
      formData.pickupAddress &&
      formData.deliveryAddress
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Transportdienstleistungen-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art des Transports"
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

          <FormField label="Art der Ladung" required>
            <FormSelect
              value={formData.loadType || ''}
              onChange={value => handleInputChange('loadType', value)}
              options={loadTypeOptions}
              placeholder="Wählen Sie die Art der Ladung"
            />
          </FormField>

          <FormField label="Entfernung" required>
            <FormSelect
              value={formData.distance?.toString() || ''}
              onChange={value => handleInputChange('distance', value)}
              options={distanceOptions}
              placeholder="Wählen Sie die Entfernung"
            />
          </FormField>

          <FormField label="Gewicht (kg)">
            <FormInput
              type="number"
              value={formData.weight?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'weight',
                  typeof value === 'string' ? (value ? parseFloat(value) : undefined) : value
                )
              }
              placeholder="Gewicht in kg"
            />
          </FormField>

          <FormField label="Volumen (m³)">
            <FormInput
              type="number"
              value={formData.volume?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'volume',
                  typeof value === 'string' ? (value ? parseFloat(value) : undefined) : value
                )
              }
              placeholder="Volumen in m³"
            />
          </FormField>

          <FormField label="Ansprechpartner Abholung">
            <FormInput
              type="text"
              value={formData.pickupContact || ''}
              onChange={value => handleInputChange('pickupContact', value)}
              placeholder="Name und Telefonnummer"
            />
          </FormField>

          <FormField label="Ansprechpartner Lieferung">
            <FormInput
              type="text"
              value={formData.deliveryContact || ''}
              onChange={value => handleInputChange('deliveryContact', value)}
              placeholder="Name und Telefonnummer"
            />
          </FormField>

          <FormField label="Versicherungswert">
            <FormInput
              type="number"
              value={formData.insuranceValue?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'insuranceValue',
                  typeof value === 'string' ? (value ? parseFloat(value) : undefined) : value
                )
              }
              placeholder="Wert in €"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Dienstleistungen">
            <FormCheckboxGroup
              value={formData.additionalServices || []}
              onChange={value => handleInputChange('additionalServices', value)}
              options={additionalServicesOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Beschreibung der Güter">
            <FormTextarea
              value={formData.goodsDescription || ''}
              onChange={value => handleInputChange('goodsDescription', value)}
              placeholder="Beschreiben Sie die zu transportierenden Güter"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Informationen">
            <FormTextarea
              value={formData.additionalInfo || ''}
              onChange={value => handleInputChange('additionalInfo', value)}
              placeholder="Weitere Details, Besonderheiten oder Anforderungen"
              rows={3}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton
        isValid={isFormValid()}
        subcategory="Transportdienstleistungen"
        formData={formData}
      />
    </div>
  );
};

export default TransportdienstleistungenForm;
