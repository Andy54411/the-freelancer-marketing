import React, { useState, useEffect } from 'react';
import { NetzwerkadministrationData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface NetzwerkadministrationFormProps {
  data: NetzwerkadministrationData;
  onDataChange: (data: NetzwerkadministrationData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const NetzwerkadministrationForm: React.FC<NetzwerkadministrationFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<NetzwerkadministrationData>(data);

  const serviceTypeOptions = [
    { value: 'setup', label: 'Netzwerk-Setup' },
    { value: 'maintenance', label: 'Wartung' },
    { value: 'troubleshooting', label: 'Fehlerbehebung' },
    { value: 'optimization', label: 'Optimierung' },
    { value: 'security', label: 'Sicherheit' },
    { value: 'monitoring', label: 'Monitoring' },
    { value: 'migration', label: 'Migration' },
    { value: 'consulting', label: 'Beratung' },
  ];

  const networkTypeOptions = [
    { value: 'lan', label: 'LAN (Local Area Network)' },
    { value: 'wan', label: 'WAN (Wide Area Network)' },
    { value: 'wlan', label: 'WLAN (Wireless LAN)' },
    { value: 'vpn', label: 'VPN (Virtual Private Network)' },
    { value: 'hybrid', label: 'Hybrid-Netzwerk' },
    { value: 'cloud', label: 'Cloud-Netzwerk' },
    { value: 'enterprise', label: 'Enterprise-Netzwerk' },
  ];

  const companySizeOptions = [
    { value: 'small', label: 'Klein (1-10 Mitarbeiter)' },
    { value: 'medium', label: 'Mittel (11-50 Mitarbeiter)' },
    { value: 'large', label: 'Groß (51-200 Mitarbeiter)' },
    { value: 'enterprise', label: 'Enterprise (200+ Mitarbeiter)' },
  ];

  const urgencyOptions = [
    { value: 'low', label: 'Niedrig' },
    { value: 'medium', label: 'Mittel' },
    { value: 'high', label: 'Hoch' },
    { value: 'critical', label: 'Kritisch' },
  ];

  const equipmentOptions = [
    { value: 'router', label: 'Router' },
    { value: 'switch', label: 'Switch' },
    { value: 'firewall', label: 'Firewall' },
    { value: 'access_point', label: 'Access Point' },
    { value: 'server', label: 'Server' },
    { value: 'nas', label: 'NAS' },
    { value: 'ups', label: 'USV' },
    { value: 'patch_panel', label: 'Patch Panel' },
  ];

  const servicesOptions = [
    { value: 'installation', label: 'Installation' },
    { value: 'configuration', label: 'Konfiguration' },
    { value: 'documentation', label: 'Dokumentation' },
    { value: 'training', label: 'Schulung' },
    { value: 'support', label: '24/7 Support' },
    { value: 'backup', label: 'Backup-Lösung' },
    { value: 'disaster_recovery', label: 'Disaster Recovery' },
    { value: 'performance_monitoring', label: 'Performance Monitoring' },
  ];

  const handleInputChange = (field: keyof NetzwerkadministrationData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.networkType &&
      formData.companySize &&
      formData.urgency &&
      formData.problemDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Netzwerkadministration-Projektdetails
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

          <FormField label="Netzwerk-Typ" required>
            <FormSelect
              value={formData.networkType || ''}
              onChange={value => handleInputChange('networkType', value)}
              options={networkTypeOptions}
              placeholder="Wählen Sie den Netzwerk-Typ"
            />
          </FormField>

          <FormField label="Unternehmensgröße" required>
            <FormSelect
              value={formData.companySize || ''}
              onChange={value => handleInputChange('companySize', value)}
              options={companySizeOptions}
              placeholder="Wählen Sie die Unternehmensgröße"
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

          <FormField label="Anzahl Benutzer">
            <FormInput
              type="number"
              value={formData.numberOfUsers?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfUsers',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Netzwerk-Benutzer"
            />
          </FormField>

          <FormField label="Anzahl Geräte">
            <FormInput
              type="number"
              value={formData.numberOfDevices?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfDevices',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Netzwerk-Geräte"
            />
          </FormField>

          <FormField label="Standort">
            <FormInput
              type="text"
              value={formData.location || ''}
              onChange={value => handleInputChange('location', value)}
              placeholder="Standort des Netzwerks"
            />
          </FormField>

          <FormField label="Betriebssystem">
            <FormInput
              type="text"
              value={formData.operatingSystem || ''}
              onChange={value => handleInputChange('operatingSystem', value)}
              placeholder="z.B. Windows, macOS, Linux"
            />
          </FormField>

          <FormField label="Internet-Geschwindigkeit">
            <FormInput
              type="text"
              value={formData.internetSpeed || ''}
              onChange={value => handleInputChange('internetSpeed', value)}
              placeholder="z.B. 100 Mbit/s, 1 Gbit/s"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Vorhandene Ausrüstung">
            <FormCheckboxGroup
              value={formData.existingEquipment || []}
              onChange={value => handleInputChange('existingEquipment', value)}
              options={equipmentOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gewünschte Services">
            <FormCheckboxGroup
              value={formData.requiredServices || []}
              onChange={value => handleInputChange('requiredServices', value)}
              options={servicesOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Problembeschreibung" required>
            <FormTextarea
              value={formData.problemDescription || ''}
              onChange={value => handleInputChange('problemDescription', value)}
              placeholder="Beschreiben Sie das Problem oder die Anforderung detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Aktuelle Netzwerk-Konfiguration">
            <FormTextarea
              value={formData.currentSetup || ''}
              onChange={value => handleInputChange('currentSetup', value)}
              placeholder="Beschreiben Sie die aktuelle Netzwerk-Konfiguration"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Spezielle Sicherheits- oder Compliance-Anforderungen"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default NetzwerkadministrationForm;
