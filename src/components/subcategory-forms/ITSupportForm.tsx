import React, { useState, useEffect } from 'react';
import { ITSupportData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface ITSupportFormProps {
  data: ITSupportData;
  onDataChange: (data: ITSupportData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const ITSupportForm: React.FC<ITSupportFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<ITSupportData>(data);

  const serviceTypeOptions = [
    { value: 'hardware_support', label: 'Hardware Support' },
    { value: 'software_support', label: 'Software Support' },
    { value: 'netzwerk_support', label: 'Netzwerk Support' },
    { value: 'system_installation', label: 'System Installation' },
    { value: 'wartung', label: 'Wartung & Instandhaltung' },
    { value: 'beratung', label: 'IT-Beratung' },
    { value: 'schulung', label: 'Schulung & Training' },
  ];

  const problemTypeOptions = [
    { value: 'computer_laptop', label: 'Computer/Laptop Probleme' },
    { value: 'drucker_scanner', label: 'Drucker/Scanner Probleme' },
    { value: 'netzwerk', label: 'Netzwerk/Internet Probleme' },
    { value: 'software', label: 'Software Installation/Probleme' },
    { value: 'email', label: 'E-Mail Probleme' },
    { value: 'backup', label: 'Backup/Datensicherung' },
    { value: 'virus', label: 'Virus/Malware Entfernung' },
    { value: 'performance', label: 'Performance Optimierung' },
  ];

  const supportLocationOptions = [
    { value: 'vor_ort', label: 'Vor Ort' },
    { value: 'remote', label: 'Remote Support' },
    { value: 'beides', label: 'Beides möglich' },
  ];

  const operatingSystemOptions = [
    { value: 'windows', label: 'Windows' },
    { value: 'macos', label: 'macOS' },
    { value: 'linux', label: 'Linux' },
    { value: 'android', label: 'Android' },
    { value: 'ios', label: 'iOS' },
    { value: 'andere', label: 'Andere' },
  ];

  const businessSizeOptions = [
    { value: 'privatperson', label: 'Privatperson' },
    { value: 'klein', label: 'Kleines Unternehmen (1-10 Mitarbeiter)' },
    { value: 'mittel', label: 'Mittleres Unternehmen (11-50 Mitarbeiter)' },
    { value: 'gross', label: 'Großes Unternehmen (50+ Mitarbeiter)' },
  ];

  const handleInputChange = (field: keyof ITSupportData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.problemType &&
      formData.supportLocation &&
      formData.operatingSystem &&
      formData.businessSize &&
      formData.problemDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          IT-Support Projektdetails
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

          <FormField label="Support-Art" required>
            <FormSelect
              value={formData.supportLocation || ''}
              onChange={value => handleInputChange('supportLocation', value)}
              options={supportLocationOptions}
              placeholder="Wählen Sie die Support-Art"
            />
          </FormField>

          <FormField label="Betriebssystem" required>
            <FormSelect
              value={formData.operatingSystem || ''}
              onChange={value => handleInputChange('operatingSystem', value)}
              options={operatingSystemOptions}
              placeholder="Wählen Sie das Betriebssystem"
            />
          </FormField>

          <FormField label="Unternehmensgröße" required>
            <FormSelect
              value={formData.businessSize || ''}
              onChange={value => handleInputChange('businessSize', value)}
              options={businessSizeOptions}
              placeholder="Wählen Sie die Unternehmensgröße"
            />
          </FormField>

          <FormField label="Anzahl betroffener Geräte">
            <FormInput
              type="number"
              value={formData.deviceCount?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'deviceCount',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der betroffenen Geräte"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Problembeschreibung" required>
            <FormTextarea
              value={formData.problemDescription || ''}
              onChange={value => handleInputChange('problemDescription', value)}
              placeholder="Beschreiben Sie das Problem detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gewünschte Lösung">
            <FormTextarea
              value={formData.desiredSolution || ''}
              onChange={value => handleInputChange('desiredSolution', value)}
              placeholder="Beschreiben Sie die gewünschte Lösung"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Informationen">
            <FormTextarea
              value={formData.additionalInfo || ''}
              onChange={value => handleInputChange('additionalInfo', value)}
              placeholder="Weitere wichtige Informationen"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default ITSupportForm;
