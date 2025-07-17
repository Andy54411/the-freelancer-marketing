import React, { useState, useEffect } from 'react';
import { SystemintegrationData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface SystemintegrationFormProps {
  data: SystemintegrationData;
  onDataChange: (data: SystemintegrationData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SystemintegrationForm: React.FC<SystemintegrationFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<SystemintegrationData>(data);

  const integrationTypeOptions = [
    { value: 'api_integration', label: 'API-Integration' },
    { value: 'database_integration', label: 'Datenbank-Integration' },
    { value: 'erp_integration', label: 'ERP-Integration' },
    { value: 'crm_integration', label: 'CRM-Integration' },
    { value: 'payment_integration', label: 'Zahlungs-Integration' },
    { value: 'cloud_integration', label: 'Cloud-Integration' },
    { value: 'legacy_system', label: 'Legacy-System Integration' },
    { value: 'microservices', label: 'Microservices-Integration' },
  ];

  const complexityOptions = [
    { value: 'simple', label: 'Einfach' },
    { value: 'medium', label: 'Mittel' },
    { value: 'complex', label: 'Komplex' },
    { value: 'enterprise', label: 'Enterprise-Level' },
  ];

  const systemsOptions = [
    { value: 'sap', label: 'SAP' },
    { value: 'salesforce', label: 'Salesforce' },
    { value: 'microsoft_dynamics', label: 'Microsoft Dynamics' },
    { value: 'oracle', label: 'Oracle' },
    { value: 'hubspot', label: 'HubSpot' },
    { value: 'stripe', label: 'Stripe' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'shopify', label: 'Shopify' },
    { value: 'mailchimp', label: 'Mailchimp' },
    { value: 'zendesk', label: 'Zendesk' },
    { value: 'slack', label: 'Slack' },
    { value: 'google_workspace', label: 'Google Workspace' },
    { value: 'microsoft_365', label: 'Microsoft 365' },
  ];

  const dataVolumeOptions = [
    { value: 'low', label: 'Niedrig (< 1GB)' },
    { value: 'medium', label: 'Mittel (1-100GB)' },
    { value: 'high', label: 'Hoch (100GB-1TB)' },
    { value: 'enterprise', label: 'Enterprise (> 1TB)' },
  ];
  const timelineOptions = [
    { value: 'unter_1_monat', label: 'Unter 1 Monat' },
    { value: '1_3_monate', label: '1-3 Monate' },
    { value: '3_6_monate', label: '3-6 Monate' },
    { value: '6_12_monate', label: '6-12 Monate' },
    { value: 'über_1_jahr', label: 'Über 1 Jahr' },
  ];

  const requirementsOptions = [
    { value: 'real_time', label: 'Echtzeit-Synchronisation' },
    { value: 'batch_processing', label: 'Batch-Verarbeitung' },
    { value: 'data_transformation', label: 'Daten-Transformation' },
    { value: 'error_handling', label: 'Fehlerbehandlung' },
    { value: 'logging', label: 'Logging' },
    { value: 'monitoring', label: 'Monitoring' },
    { value: 'security', label: 'Sicherheit' },
    { value: 'backup', label: 'Backup' },
  ];

  const additionalServicesOptions = [
    { value: 'testing', label: 'Testing' },
    { value: 'documentation', label: 'Dokumentation' },
    { value: 'training', label: 'Schulung' },
    { value: 'support', label: 'Support' },
    { value: 'maintenance', label: 'Wartung' },
    { value: 'monitoring_setup', label: 'Monitoring Setup' },
    { value: 'performance_optimization', label: 'Performance-Optimierung' },
    { value: 'security_audit', label: 'Sicherheitsaudit' },
  ];

  const handleInputChange = (field: keyof SystemintegrationData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.integrationType &&
      formData.complexity &&
      formData.sourceSystem &&
      formData.targetSystem &&
      formData.dataVolume &&
      formData.timeline &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Systemintegration-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Integration" required>
            <FormSelect
              value={formData.integrationType || ''}
              onChange={value => handleInputChange('integrationType', value)}
              options={integrationTypeOptions}
              placeholder="Wählen Sie die Art der Integration"
            />
          </FormField>

          <FormField label="Komplexität" required>
            <FormSelect
              value={formData.complexity || ''}
              onChange={value => handleInputChange('complexity', value)}
              options={complexityOptions}
              placeholder="Wählen Sie die Komplexität"
            />
          </FormField>

          <FormField label="Quellsystem" required>
            <FormInput
              type="text"
              value={formData.sourceSystem || ''}
              onChange={value => handleInputChange('sourceSystem', value)}
              placeholder="System, von dem Daten kommen"
            />
          </FormField>

          <FormField label="Zielsystem" required>
            <FormInput
              type="text"
              value={formData.targetSystem || ''}
              onChange={value => handleInputChange('targetSystem', value)}
              placeholder="System, zu dem Daten gehen"
            />
          </FormField>

          <FormField label="Datenvolumen" required>
            <FormSelect
              value={formData.dataVolume || ''}
              onChange={value => handleInputChange('dataVolume', value)}
              options={dataVolumeOptions}
              placeholder="Wählen Sie das Datenvolumen"
            />
          </FormField>
          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.timeline || ''}
              onChange={value => handleInputChange('timeline', value)}
              options={timelineOptions}
              placeholder="Wählen Sie den Zeitrahmen"
            />
          </FormField>

          <FormField label="Projekt-Name">
            <FormInput
              type="text"
              value={formData.projectName || ''}
              onChange={value => handleInputChange('projectName', value)}
              placeholder="Name des Integrationsprojekts"
            />
          </FormField>

          <FormField label="Unternehmen">
            <FormInput
              type="text"
              value={formData.company || ''}
              onChange={value => handleInputChange('company', value)}
              placeholder="Ihr Unternehmen"
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
              placeholder="Anzahl der Benutzer"
            />
          </FormField>

          <FormField label="Frequenz der Synchronisation">
            <FormInput
              type="text"
              value={formData.syncFrequency || ''}
              onChange={value => handleInputChange('syncFrequency', value)}
              placeholder="z.B. Echtzeit, stündlich, täglich"
            />
          </FormField>

          <FormField label="Startdatum">
            <FormInput
              type="text"
              value={formData.startDate || ''}
              onChange={value => handleInputChange('startDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Fertigstellungsdatum">
            <FormInput
              type="text"
              value={formData.completionDate || ''}
              onChange={value => handleInputChange('completionDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Beteiligte Systeme">
            <FormCheckboxGroup
              value={formData.involvedSystems || []}
              onChange={value => handleInputChange('involvedSystems', value)}
              options={systemsOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Anforderungen">
            <FormCheckboxGroup
              value={formData.requirements || []}
              onChange={value => handleInputChange('requirements', value)}
              options={requirementsOptions}
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
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihr Integrationsprojekt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Aktuelle Architektur">
            <FormTextarea
              value={formData.currentArchitecture || ''}
              onChange={value => handleInputChange('currentArchitecture', value)}
              placeholder="Beschreiben Sie die aktuelle System-Architektur"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Datenformate">
            <FormTextarea
              value={formData.dataFormats || ''}
              onChange={value => handleInputChange('dataFormats', value)}
              placeholder="Welche Datenformate werden verwendet? (JSON, XML, CSV, etc.)"
              rows={2}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Compliance, Sicherheit oder andere spezielle Anforderungen"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default SystemintegrationForm;
