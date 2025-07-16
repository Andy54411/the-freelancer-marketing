import React, { useState, useEffect } from 'react';
import { SchlosserData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface SchlosserFormProps {
  data: SchlosserData;
  onDataChange: (data: SchlosserData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SchlosserForm: React.FC<SchlosserFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<SchlosserData>(data);

  const serviceTypeOptions = [
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'austausch', label: 'Austausch' },
    { value: 'neubau', label: 'Neubau' },
    { value: 'notfall', label: 'Notfall' },
    { value: 'öffnung', label: 'Türöffnung' },
  ];

  const workTypeOptions = [
    { value: 'schloss', label: 'Schlossarbeit' },
    { value: 'türbeschlag', label: 'Türbeschlag' },
    { value: 'sicherheit', label: 'Sicherheitstechnik' },
    { value: 'zaun', label: 'Zaun' },
    { value: 'gitter', label: 'Gitter' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ];

  const lockTypeOptions = [
    { value: 'standardschloss', label: 'Standardschloss' },
    { value: 'sicherheitsschloss', label: 'Sicherheitsschloss' },
    { value: 'elektronisch', label: 'Elektronisches Schloss' },
    { value: 'mehrfachverriegelung', label: 'Mehrfachverriegelung' },
    { value: 'tresorschloss', label: 'Tresorschloss' },
  ];

  const securityLevelOptions = [
    { value: 'standard', label: 'Standard' },
    { value: 'erhöht', label: 'Erhöht' },
    { value: 'hoch', label: 'Hoch' },
    { value: 'sehr_hoch', label: 'Sehr hoch' },
  ];

  const urgencyOptions = [
    { value: 'notfall', label: 'Notfall (sofort)' },
    { value: 'dringend', label: 'Dringend (innerhalb 24h)' },
    { value: 'normal', label: 'Normal (innerhalb 1 Woche)' },
    { value: 'flexibel', label: 'Flexibel (nach Absprache)' },
  ];

  const materialOptions = [
    { value: 'stahl', label: 'Stahl' },
    { value: 'edelstahl', label: 'Edelstahl' },
    { value: 'messing', label: 'Messing' },
    { value: 'aluminium', label: 'Aluminium' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const handleInputChange = (field: keyof SchlosserData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.workType &&
      formData.lockType &&
      formData.securityLevel &&
      formData.urgency &&
      formData.material &&
      formData.keyService &&
      formData.installation
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Schlosser-Projektdetails
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

          <FormField label="Art der Schlosserarbeit" required>
            <FormSelect
              value={formData.workType || ''}
              onChange={value => handleInputChange('workType', value)}
              options={workTypeOptions}
              placeholder="Wählen Sie die Art der Schlosserarbeit"
            />
          </FormField>

          <FormField label="Schlosstyp" required>
            <FormSelect
              value={formData.lockType || ''}
              onChange={value => handleInputChange('lockType', value)}
              options={lockTypeOptions}
              placeholder="Wählen Sie den Schlosstyp"
            />
          </FormField>

          <FormField label="Sicherheitsstufe" required>
            <FormSelect
              value={formData.securityLevel || ''}
              onChange={value => handleInputChange('securityLevel', value)}
              options={securityLevelOptions}
              placeholder="Wählen Sie die Sicherheitsstufe"
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

          <FormField label="Material" required>
            <FormSelect
              value={formData.material || ''}
              onChange={value => handleInputChange('material', value)}
              options={materialOptions}
              placeholder="Wählen Sie das Material"
            />
          </FormField>

          <FormField label="Schlüsselservice" required>
            <FormSelect
              value={formData.keyService || ''}
              onChange={value => handleInputChange('keyService', value)}
              options={[
                { value: 'inklusive', label: 'Inklusive' },
                { value: 'separat', label: 'Separat' },
                { value: 'nicht_nötig', label: 'Nicht nötig' },
              ]}
              placeholder="Schlüsselservice erforderlich?"
            />
          </FormField>

          <FormField label="Installation" required>
            <FormSelect
              value={formData.installation || ''}
              onChange={value => handleInputChange('installation', value)}
              options={[
                { value: 'inklusive', label: 'Inklusive' },
                { value: 'separat', label: 'Separat' },
                { value: 'nicht_nötig', label: 'Nicht nötig' },
              ]}
              placeholder="Installation erforderlich?"
            />
          </FormField>

          <FormField label="Anzahl Schlösser">
            <FormInput
              type="number"
              value={formData.quantity?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'quantity',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Schlösser"
            />
          </FormField>

          <FormField label="Anzahl Schlüssel">
            <FormInput
              type="number"
              value={formData.keyQuantity?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'keyQuantity',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Schlüssel"
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

export default SchlosserForm;
