import React, { useState, useEffect } from 'react';
import { ITData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface ITFormProps {
  data: ITData;
  onDataChange: (data: ITData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const ITForm: React.FC<ITFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<ITData>(data);

  const serviceTypeOptions = [
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'installation', label: 'Installation' },
    { value: 'entwicklung', label: 'Entwicklung' },
    { value: 'beratung', label: 'Beratung' },
    { value: 'wartung', label: 'Wartung' },
  ];

  const deviceTypeOptions = [
    { value: 'computer', label: 'Computer' },
    { value: 'laptop', label: 'Laptop' },
    { value: 'server', label: 'Server' },
    { value: 'netzwerk', label: 'Netzwerk' },
    { value: 'smartphone', label: 'Smartphone' },
    { value: 'tablet', label: 'Tablet' },
  ];

  const operatingSystemOptions = [
    { value: 'windows', label: 'Windows' },
    { value: 'mac', label: 'Mac' },
    { value: 'linux', label: 'Linux' },
    { value: 'android', label: 'Android' },
    { value: 'ios', label: 'iOS' },
  ];

  const locationOptions = [
    { value: 'vor_ort', label: 'Vor Ort' },
    { value: 'remote', label: 'Remote/Fernwartung' },
    { value: 'beides', label: 'Beides möglich' },
  ];

  const dataBackupOptions = [
    { value: 'vorhanden', label: 'Backup ist vorhanden' },
    { value: 'benötigt', label: 'Backup wird benötigt' },
    { value: 'nicht_nötig', label: 'Nicht nötig' },
  ];

  const handleInputChange = (field: keyof ITData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.location &&
      formData.dataBackup &&
      typeof formData.businessHours === 'boolean'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          IT-Support-Projektdetails
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

          <FormField label="Arbeitsort" required>
            <FormSelect
              value={formData.location || ''}
              onChange={value => handleInputChange('location', value)}
              options={locationOptions}
              placeholder="Wo soll gearbeitet werden?"
            />
          </FormField>

          <FormField label="Datensicherung" required>
            <FormSelect
              value={formData.dataBackup || ''}
              onChange={value => handleInputChange('dataBackup', value)}
              options={dataBackupOptions}
              placeholder="Status der Datensicherung"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gerätetyp">
            <FormCheckboxGroup
              value={formData.deviceType || []}
              onChange={value => handleInputChange('deviceType', value)}
              options={deviceTypeOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Betriebssystem">
            <FormCheckboxGroup
              value={formData.operatingSystem || []}
              onChange={value => handleInputChange('operatingSystem', value)}
              options={operatingSystemOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Geschäftszeiten">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="businessHours"
                  checked={formData.businessHours === true}
                  onChange={() => handleInputChange('businessHours', true)}
                  className="mr-2"
                />
                Nur während Geschäftszeiten
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="businessHours"
                  checked={formData.businessHours === false}
                  onChange={() => handleInputChange('businessHours', false)}
                  className="mr-2"
                />
                Auch außerhalb der Geschäftszeiten
              </label>
            </div>
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Beschreiben Sie das Problem, besondere Wünsche oder technische Anforderungen"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default ITForm;
