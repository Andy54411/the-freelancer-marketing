import React, { useState, useEffect } from 'react';
import { CybersecurityData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface CybersecurityFormProps {
  data: CybersecurityData;
  onDataChange: (data: CybersecurityData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const CybersecurityForm: React.FC<CybersecurityFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<CybersecurityData>(data);

  const serviceTypeOptions = [
    { value: 'security_audit', label: 'Sicherheitsaudit' },
    { value: 'penetration_testing', label: 'Penetrationstests' },
    { value: 'vulnerability_assessment', label: 'Schwachstellenanalyse' },
    { value: 'security_consulting', label: 'Sicherheitsberatung' },
    { value: 'incident_response', label: 'Incident Response' },
    { value: 'security_training', label: 'Sicherheitsschulung' },
    { value: 'compliance_audit', label: 'Compliance-Audit' },
    { value: 'security_implementation', label: 'Sicherheitsimplementierung' },
  ];

  const threatLevelOptions = [
    { value: 'low', label: 'Niedrig' },
    { value: 'medium', label: 'Mittel' },
    { value: 'high', label: 'Hoch' },
    { value: 'critical', label: 'Kritisch' },
  ];

  const companySizeOptions = [
    { value: 'startup', label: 'Startup (1-10 Mitarbeiter)' },
    { value: 'small', label: 'Klein (11-50 Mitarbeiter)' },
    { value: 'medium', label: 'Mittel (51-200 Mitarbeiter)' },
    { value: 'large', label: 'Groß (201-1000 Mitarbeiter)' },
    { value: 'enterprise', label: 'Enterprise (1000+ Mitarbeiter)' },
  ];

  const industryOptions = [
    { value: 'finance', label: 'Finanzwesen' },
    { value: 'healthcare', label: 'Gesundheitswesen' },
    { value: 'government', label: 'Öffentlicher Sektor' },
    { value: 'education', label: 'Bildung' },
    { value: 'retail', label: 'Einzelhandel' },
    { value: 'manufacturing', label: 'Fertigung' },
    { value: 'technology', label: 'Technologie' },
    { value: 'energy', label: 'Energie' },
    { value: 'telecommunications', label: 'Telekommunikation' },
    { value: 'transportation', label: 'Transport' },
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

  const threatTypesOptions = [
    { value: 'malware', label: 'Malware' },
    { value: 'phishing', label: 'Phishing' },
    { value: 'ransomware', label: 'Ransomware' },
    { value: 'ddos', label: 'DDoS-Attacken' },
    { value: 'insider_threats', label: 'Insider-Bedrohungen' },
    { value: 'social_engineering', label: 'Social Engineering' },
    { value: 'data_breach', label: 'Datenlecks' },
    { value: 'advanced_persistent_threats', label: 'Advanced Persistent Threats' },
  ];

  const complianceOptions = [
    { value: 'gdpr', label: 'GDPR' },
    { value: 'hipaa', label: 'HIPAA' },
    { value: 'sox', label: 'SOX' },
    { value: 'iso27001', label: 'ISO 27001' },
    { value: 'pci_dss', label: 'PCI DSS' },
    { value: 'nist', label: 'NIST' },
    { value: 'bsi', label: 'BSI' },
    { value: 'cis', label: 'CIS Controls' },
  ];

  const systemsOptions = [
    { value: 'network', label: 'Netzwerk' },
    { value: 'web_applications', label: 'Web-Anwendungen' },
    { value: 'mobile_apps', label: 'Mobile Apps' },
    { value: 'cloud_infrastructure', label: 'Cloud-Infrastruktur' },
    { value: 'databases', label: 'Datenbanken' },
    { value: 'endpoints', label: 'Endpoints' },
    { value: 'iot_devices', label: 'IoT-Geräte' },
    { value: 'industrial_systems', label: 'Industrielle Systeme' },
  ];

  const additionalServicesOptions = [
    { value: 'continuous_monitoring', label: 'Kontinuierliche Überwachung' },
    { value: 'threat_intelligence', label: 'Threat Intelligence' },
    { value: 'security_awareness', label: 'Sicherheitsbewusstsein' },
    { value: 'backup_recovery', label: 'Backup & Recovery' },
    { value: 'forensics', label: 'Digitale Forensik' },
    { value: 'risk_assessment', label: 'Risikobewertung' },
    { value: 'policy_development', label: 'Richtlinienentwicklung' },
    { value: 'security_architecture', label: 'Sicherheitsarchitektur' },
  ];

  const handleInputChange = (field: keyof CybersecurityData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.threatLevel &&
      formData.companySize &&
      formData.industry &&
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
          Cybersecurity-Projektdetails
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

          <FormField label="Bedrohungslevel" required>
            <FormSelect
              value={formData.threatLevel || ''}
              onChange={value => handleInputChange('threatLevel', value)}
              options={threatLevelOptions}
              placeholder="Wählen Sie das Bedrohungslevel"
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

          <FormField label="Branche" required>
            <FormSelect
              value={formData.industry || ''}
              onChange={value => handleInputChange('industry', value)}
              options={industryOptions}
              placeholder="Wählen Sie Ihre Branche"
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
              placeholder="Name des Sicherheitsprojekts"
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

          <FormField label="Anzahl Mitarbeiter">
            <FormInput
              type="number"
              value={formData.numberOfEmployees?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfEmployees',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Mitarbeiter"
            />
          </FormField>

          <FormField label="Anzahl Systeme">
            <FormInput
              type="number"
              value={formData.numberOfSystems?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfSystems',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der zu prüfenden Systeme"
            />
          </FormField>

          <FormField label="Letzte Sicherheitsprüfung">
            <FormInput
              type="text"
              value={formData.lastSecurityAudit || ''}
              onChange={value => handleInputChange('lastSecurityAudit', value)}
              placeholder="TT.MM.JJJJ oder 'Noch nie'"
            />
          </FormField>

          <FormField label="Bisherige Sicherheitsvorfälle">
            <FormInput
              type="text"
              value={formData.previousIncidents || ''}
              onChange={value => handleInputChange('previousIncidents', value)}
              placeholder="Anzahl oder Art der Vorfälle"
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
          <FormField label="Relevante Bedrohungsarten">
            <FormCheckboxGroup
              value={formData.threatTypes || []}
              onChange={value => handleInputChange('threatTypes', value)}
              options={threatTypesOptions}
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
          <FormField label="Zu prüfende Systeme">
            <FormCheckboxGroup
              value={formData.systemsToTest || []}
              onChange={value => handleInputChange('systemsToTest', value)}
              options={systemsOptions}
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
              placeholder="Beschreiben Sie Ihr Cybersecurity-Projekt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Aktuelle Sicherheitsmaßnahmen">
            <FormTextarea
              value={formData.currentSecurityMeasures || ''}
              onChange={value => handleInputChange('currentSecurityMeasures', value)}
              placeholder="Welche Sicherheitsmaßnahmen sind bereits implementiert?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Sicherheitsziele">
            <FormTextarea
              value={formData.securityGoals || ''}
              onChange={value => handleInputChange('securityGoals', value)}
              placeholder="Was möchten Sie mit diesem Projekt erreichen?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Spezielle Sicherheitsanforderungen oder Einschränkungen"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default CybersecurityForm;
