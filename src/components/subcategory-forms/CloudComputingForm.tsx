import React, { useState, useEffect } from 'react';
import { CloudComputingData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface CloudComputingFormProps {
  data: CloudComputingData;
  onDataChange: (data: CloudComputingData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const CloudComputingForm: React.FC<CloudComputingFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<CloudComputingData>(data);

  const serviceTypeOptions = [
    { value: 'migration', label: 'Cloud-Migration' },
    { value: 'setup', label: 'Cloud-Setup' },
    { value: 'optimization', label: 'Optimierung' },
    { value: 'consulting', label: 'Beratung' },
    { value: 'management', label: 'Cloud-Management' },
    { value: 'security', label: 'Cloud-Security' },
    { value: 'backup', label: 'Backup & Recovery' },
    { value: 'monitoring', label: 'Monitoring' },
  ];

  const cloudProviderOptions = [
    { value: 'aws', label: 'Amazon Web Services (AWS)' },
    { value: 'azure', label: 'Microsoft Azure' },
    { value: 'google_cloud', label: 'Google Cloud Platform' },
    { value: 'ibm_cloud', label: 'IBM Cloud' },
    { value: 'oracle_cloud', label: 'Oracle Cloud' },
    { value: 'digitalocean', label: 'DigitalOcean' },
    { value: 'heroku', label: 'Heroku' },
    { value: 'vercel', label: 'Vercel' },
    { value: 'netlify', label: 'Netlify' },
    { value: 'multiple', label: 'Multi-Cloud' },
  ];

  const deploymentTypeOptions = [
    { value: 'public', label: 'Public Cloud' },
    { value: 'private', label: 'Private Cloud' },
    { value: 'hybrid', label: 'Hybrid Cloud' },
    { value: 'multi_cloud', label: 'Multi-Cloud' },
  ];

  const companySizeOptions = [
    { value: 'startup', label: 'Startup (1-10 Mitarbeiter)' },
    { value: 'small', label: 'Klein (11-50 Mitarbeiter)' },
    { value: 'medium', label: 'Mittel (51-200 Mitarbeiter)' },
    { value: 'large', label: 'Groß (201-1000 Mitarbeiter)' },
    { value: 'enterprise', label: 'Enterprise (1000+ Mitarbeiter)' },
  ];

  const budgetRangeOptions = [
    { value: 'unter_5000', label: 'Unter 5.000€' },
    { value: '5000_15000', label: '5.000€ - 15.000€' },
    { value: '15000_50000', label: '15.000€ - 50.000€' },
    { value: '50000_100000', label: '50.000€ - 100.000€' },
    { value: 'über_100000', label: 'Über 100.000€' },
  ];

  const timelineOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'unter_1_monat', label: 'Unter 1 Monat' },
    { value: '1_3_monate', label: '1-3 Monate' },
    { value: '3_6_monate', label: '3-6 Monate' },
    { value: 'über_6_monate', label: 'Über 6 Monate' },
  ];

  const servicesOptions = [
    { value: 'compute', label: 'Compute (VMs, Container)' },
    { value: 'storage', label: 'Storage' },
    { value: 'database', label: 'Database' },
    { value: 'networking', label: 'Networking' },
    { value: 'security', label: 'Security Services' },
    { value: 'analytics', label: 'Analytics' },
    { value: 'ai_ml', label: 'AI/Machine Learning' },
    { value: 'devops', label: 'DevOps Tools' },
    { value: 'monitoring', label: 'Monitoring & Logging' },
    { value: 'backup', label: 'Backup & Recovery' },
  ];

  const complianceOptions = [
    { value: 'gdpr', label: 'GDPR' },
    { value: 'hipaa', label: 'HIPAA' },
    { value: 'sox', label: 'SOX' },
    { value: 'iso27001', label: 'ISO 27001' },
    { value: 'pci_dss', label: 'PCI DSS' },
    { value: 'fedramp', label: 'FedRAMP' },
    { value: 'bsi', label: 'BSI' },
  ];

  const additionalServicesOptions = [
    { value: 'training', label: 'Schulung' },
    { value: 'documentation', label: 'Dokumentation' },
    { value: 'support', label: '24/7 Support' },
    { value: 'cost_optimization', label: 'Kostenoptimierung' },
    { value: 'disaster_recovery', label: 'Disaster Recovery' },
    { value: 'automation', label: 'Automatisierung' },
    { value: 'governance', label: 'Cloud Governance' },
    { value: 'performance_tuning', label: 'Performance Tuning' },
  ];

  const handleInputChange = (field: keyof CloudComputingData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.cloudProvider &&
      formData.deploymentType &&
      formData.companySize &&
      formData.budgetRange &&
      formData.timeline &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Cloud Computing-Projektdetails
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

          <FormField label="Cloud-Provider" required>
            <FormCheckboxGroup
              value={formData.cloudProvider || []}
              onChange={value => handleInputChange('cloudProvider', value)}
              options={cloudProviderOptions}
            />
          </FormField>

          <FormField label="Deployment-Typ" required>
            <FormSelect
              value={formData.deploymentType || ''}
              onChange={value => handleInputChange('deploymentType', value)}
              options={deploymentTypeOptions}
              placeholder="Wählen Sie den Deployment-Typ"
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

          <FormField label="Budget-Rahmen" required>
            <FormSelect
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              options={budgetRangeOptions}
              placeholder="Wählen Sie den Budget-Rahmen"
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
              placeholder="Name des Cloud-Projekts"
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

          <FormField label="Monatliches Cloud-Budget">
            <FormInput
              type="number"
              value={formData.monthlyCloudBudget?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'monthlyCloudBudget',
                  typeof value === 'string' ? (value ? parseFloat(value) : undefined) : value
                )
              }
              placeholder="Monatliches Budget in €"
            />
          </FormField>

          <FormField label="Aktueller Provider">
            <FormInput
              type="text"
              value={formData.currentProvider || ''}
              onChange={value => handleInputChange('currentProvider', value)}
              placeholder="Aktueller Cloud-Provider"
            />
          </FormField>

          <FormField label="Gewünschte Region">
            <FormInput
              type="text"
              value={formData.preferredRegion || ''}
              onChange={value => handleInputChange('preferredRegion', value)}
              placeholder="Europa, USA, Asien, etc."
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
          <FormField label="Benötigte Cloud-Services">
            <FormCheckboxGroup
              value={formData.requiredServices || []}
              onChange={value => handleInputChange('requiredServices', value)}
              options={servicesOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Compliance-Anforderungen">
            <FormCheckboxGroup
              value={formData.complianceRequirements || []}
              onChange={value => handleInputChange('complianceRequirements', value)}
              options={complianceOptions}
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
              placeholder="Beschreiben Sie Ihr Cloud-Projekt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Aktuelle Infrastruktur">
            <FormTextarea
              value={formData.currentInfrastructure || ''}
              onChange={value => handleInputChange('currentInfrastructure', value)}
              placeholder="Beschreiben Sie die aktuelle IT-Infrastruktur"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Migrationsziele">
            <FormTextarea
              value={formData.migrationGoals || ''}
              onChange={value => handleInputChange('migrationGoals', value)}
              placeholder="Was möchten Sie mit der Cloud-Migration erreichen?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Sicherheit, Performance oder andere spezielle Anforderungen"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default CloudComputingForm;
