import React, { useState, useEffect } from 'react';
import { KurierdiensteData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface KurierdienstFormProps {
  data: KurierdiensteData;
  onDataChange: (data: KurierdiensteData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const KurierdienstForm: React.FC<KurierdienstFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<KurierdiensteData>(data);

  const serviceTypeOptions = [
    { value: 'sofort', label: 'Sofort-Kurier' },
    { value: 'express', label: 'Express-Kurier' },
    { value: 'standard', label: 'Standard-Kurier' },
    { value: 'scheduled', label: 'Terminierter Kurier' },
    { value: 'overnight', label: 'Über-Nacht-Kurier' },
  ];

  const packageSizeOptions = [
    { value: 'envelope', label: 'Umschlag/Brief' },
    { value: 'small', label: 'Klein (bis 30cm)' },
    { value: 'medium', label: 'Mittel (30-60cm)' },
    { value: 'large', label: 'Groß (über 60cm)' },
    { value: 'sperrig', label: 'Sperrig' },
  ];

  const weightOptions = [
    { value: 'leicht', label: 'Leicht (bis 5kg)' },
    { value: 'mittel', label: 'Mittel (5-20kg)' },
    { value: 'schwer', label: 'Schwer (über 20kg)' },
  ];

  const distanceOptions = [
    { value: 'lokal', label: 'Lokal (bis 25 km)' },
    { value: 'regional', label: 'Regional (25-100 km)' },
    { value: 'überregional', label: 'Überregional (über 100 km)' },
    { value: 'international', label: 'International' },
  ];

  const specialOptions = [
    { value: 'fragile', label: 'Zerbrechlich' },
    { value: 'valuable', label: 'Wertvoll' },
    { value: 'confidential', label: 'Vertraulich' },
    { value: 'temperature', label: 'Temperaturempfindlich' },
    { value: 'signature', label: 'Unterschrift erforderlich' },
    { value: 'id_check', label: 'Ausweiskontrolle' },
  ];

  const handleInputChange = (field: keyof KurierdiensteData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.packageSize &&
      formData.weight &&
      formData.distance &&
      formData.pickupAddress &&
      formData.deliveryAddress
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.packageSize &&
      formData.weight &&
      formData.distance &&
      formData.pickupAddress &&
      formData.deliveryAddress
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Kurierdienst-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art des Kurierdienstes"
            />
          </FormField>

          <FormField label="Paketgröße" required>
            <FormSelect
              value={formData.packageSize || ''}
              onChange={value => handleInputChange('packageSize', value)}
              options={packageSizeOptions}
              placeholder="Wählen Sie die Paketgröße"
            />
          </FormField>

          <FormField label="Gewicht" required>
            <FormSelect
              value={formData.weight || ''}
              onChange={value => handleInputChange('weight', value)}
              options={weightOptions}
              placeholder="Wählen Sie das Gewicht"
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
          <FormField label="Besondere Anforderungen">
            <FormCheckboxGroup
              value={
                Array.isArray(formData.specialRequirements) ? formData.specialRequirements : []
              }
              onChange={value => handleInputChange('specialRequirements', value)}
              options={specialOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Informationen">
            <FormTextarea
              value={formData.additionalInfo || ''}
              onChange={value => handleInputChange('additionalInfo', value)}
              placeholder="Beschreiben Sie weitere Details, Besonderheiten oder Anforderungen"
              rows={3}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Kurierdienst" formData={formData} />
    </div>
  );
}

export default KurierdienstForm;
