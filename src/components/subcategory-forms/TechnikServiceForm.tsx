import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface TechnikServiceData {
  subcategory: string;
  serviceType: string;
  deviceType: string[];
  operatingSystem: string;
  location: string;
  remotePossible: boolean;
  problem: string;
  description?: string;
}

interface TechnikServiceFormProps {
  data: TechnikServiceData;
  onDataChange: (data: TechnikServiceData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const TechnikServiceForm: React.FC<TechnikServiceFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<TechnikServiceData>(data);

  const serviceTypeOptions = [
    { value: 'reparatur', label: 'Reparatur/Fehlerbehebung' },
    { value: 'installation', label: 'Installation/Einrichtung' },
    { value: 'optimierung', label: 'Optimierung/Upgrade' },
    { value: 'beratung', label: 'Beratung/Schulung' },
    { value: 'netzwerk', label: 'Netzwerkeinrichtung' },
    { value: 'datensicherung', label: 'Datensicherung/Wiederherstellung' },
    { value: 'virenschutz', label: 'Virenschutz/Malwareentfernung' },
    { value: 'smart_home', label: 'Smart Home Installation' },
    { value: 'andere', label: 'Andere' },
  ];

  const deviceTypeOptions = [
    { value: 'pc', label: 'PC/Desktop-Computer' },
    { value: 'laptop', label: 'Laptop/Notebook' },
    { value: 'tablet', label: 'Tablet' },
    { value: 'smartphone', label: 'Smartphone' },
    { value: 'drucker', label: 'Drucker/Scanner' },
    { value: 'router', label: 'Router/Netzwerkgeräte' },
    { value: 'server', label: 'Server/NAS' },
    { value: 'tv', label: 'TV/Heimkino' },
    { value: 'spielkonsole', label: 'Spielkonsole' },
    { value: 'smart_home', label: 'Smart Home Geräte' },
    { value: 'andere', label: 'Andere' },
  ];

  const operatingSystemOptions = [
    { value: 'windows', label: 'Windows' },
    { value: 'macos', label: 'macOS/Apple' },
    { value: 'linux', label: 'Linux' },
    { value: 'android', label: 'Android' },
    { value: 'ios', label: 'iOS/iPadOS' },
    { value: 'andere', label: 'Andere' },
    { value: 'nicht_relevant', label: 'Nicht relevant' },
  ];

  const locationOptions = [
    { value: 'vor_ort', label: 'Vor Ort bei mir' },
    { value: 'beim_dienstleister', label: 'Beim Dienstleister' },
    { value: 'flexibel', label: 'Flexibel/nach Absprache' },
  ];

  const remotePossibleOptions = [
    { value: 'true', label: 'Ja, Fernwartung ist möglich' },
    { value: 'false', label: 'Nein, persönlicher Termin nötig' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (field: keyof TechnikServiceData, value: string | string[] | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.deviceType &&
      formData.deviceType.length > 0
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <FormField label="Art des Technik-Service" required>
        <FormSelect
          value={formData.serviceType}
          onChange={value => handleChange('serviceType', value)}
          options={serviceTypeOptions}
        />
      </FormField>

      <FormField label="Geräteart" required>
        <FormCheckboxGroup
          value={formData.deviceType || []}
          onChange={value => handleChange('deviceType', value)}
          options={deviceTypeOptions}
        />
      </FormField>

      <FormField label="Betriebssystem">
        <FormSelect
          value={formData.operatingSystem || ''}
          onChange={value => handleChange('operatingSystem', value)}
          options={operatingSystemOptions}
        />
      </FormField>

      <FormField label="Gewünschter Serviceort">
        <FormSelect
          value={formData.location || ''}
          onChange={value => handleChange('location', value)}
          options={locationOptions}
        />
      </FormField>

      <FormField label="Fernwartung möglich?">
        <FormRadioGroup
          name="remotePossible"
          value={formData.remotePossible ? 'true' : 'false'}
          onChange={value => handleChange('remotePossible', value === 'true')}
          options={remotePossibleOptions}
        />
      </FormField>

      <FormField label="Problem/Anliegen">
        <FormInput
          value={formData.problem || ''}
          onChange={value => handleChange('problem', value.toString())}
          placeholder="z.B. 'Computer startet nicht', 'WLAN-Installation', etc."
        />
      </FormField>

      <FormField label="Detaillierte Problembeschreibung">
        <FormTextarea
          value={formData.description || ''}
          onChange={value => handleChange('description', value)}
          placeholder="Beschreiben Sie das Problem genauer, inkl. Fehlermeldungen, Symptome, wann es auftritt, bisherige Lösungsversuche, etc."
        />
      </FormField>
    </div>
  );
};

export default TechnikServiceForm;
