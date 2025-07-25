'use client';
import React, { useState, useEffect } from 'react';
import { KlempnerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface KlempnerFormProps {
  data: KlempnerData;
  onDataChange: (data: KlempnerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const KlempnerForm: React.FC<KlempnerFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<KlempnerData>(data);

  const serviceTypeOptions = [
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'installation', label: 'Installation' },
    { value: 'wartung', label: 'Wartung' },
    { value: 'notfall', label: 'Notfall' },
  ];

  const problemTypeOptions = [
    { value: 'wasserschaden', label: 'Wasserschaden' },
    { value: 'verstopfung', label: 'Verstopfung' },
    { value: 'undichtigkeit', label: 'Undichtigkeit' },
    { value: 'heizung', label: 'Heizung' },
    { value: 'bad_sanierung', label: 'Bad-Sanierung' },
    { value: 'rohr_installation', label: 'Rohr-Installation' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ];

  const roomTypeOptions = [
    { value: 'bad', label: 'Bad' },
    { value: 'kueche', label: 'Küche' },
    { value: 'keller', label: 'Keller' },
    { value: 'waschraum', label: 'Waschraum' },
    { value: 'mehrere_raeume', label: 'Mehrere Räume' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ];

  const buildingTypeOptions = [
    { value: 'einfamilienhaus', label: 'Einfamilienhaus' },
    { value: 'wohnung', label: 'Wohnung' },
    { value: 'gewerbe', label: 'Gewerbe' },
  ];

  const materialProvidedOptions = [
    { value: 'kunde', label: 'Kunde stellt Material' },
    { value: 'handwerker', label: 'Handwerker bringt Material mit' },
    { value: 'gemeinsam', label: 'Gemeinsame Beschaffung' },
  ];

  const handleInputChange = (field: keyof KlempnerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.problemType &&
      formData.roomType &&
      formData.buildingType &&
      formData.materialProvided &&
      formData.accessibilityIssues
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.problemType &&
      formData.roomType &&
      formData.buildingType &&
      formData.materialProvided &&
      formData.accessibilityIssues
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Klempner-Projektdetails
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

          <FormField label="Art des Problems" required>
            <FormSelect
              value={formData.problemType || ''}
              onChange={value => handleInputChange('problemType', value)}
              options={problemTypeOptions}
              placeholder="Wählen Sie die Art des Problems"
            />
          </FormField>

          <FormField label="Betroffener Raum" required>
            <FormSelect
              value={formData.roomType || ''}
              onChange={value => handleInputChange('roomType', value)}
              options={roomTypeOptions}
              placeholder="Wählen Sie den betroffenen Raum"
            />
          </FormField>

          <FormField label="Gebäudeart" required>
            <FormSelect
              value={formData.buildingType || ''}
              onChange={value => handleInputChange('buildingType', value)}
              options={buildingTypeOptions}
              placeholder="Wählen Sie die Gebäudeart"
            />
          </FormField>

          <FormField label="Materialbereitstellung" required>
            <FormSelect
              value={formData.materialProvided || ''}
              onChange={value => handleInputChange('materialProvided', value)}
              options={materialProvidedOptions}
              placeholder="Wer stellt das Material?"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Erreichbarkeit">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="accessibilityIssues"
                  checked={formData.accessibilityIssues === 'normal'}
                  onChange={() => handleInputChange('accessibilityIssues', 'normal')}
                  className="mr-2"
                />
                Normale Erreichbarkeit
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="accessibilityIssues"
                  checked={formData.accessibilityIssues === 'difficult'}
                  onChange={() => handleInputChange('accessibilityIssues', 'difficult')}
                  className="mr-2"
                />
                Schwierige Erreichbarkeit (z.B. enge Räume, Dachboden)
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

      <FormSubmitButton isValid={isFormValid()} subcategory="Klempner" />
    </div>
  );
}

export default KlempnerForm;
