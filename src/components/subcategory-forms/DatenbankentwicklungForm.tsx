import React, { useState, useEffect } from 'react';
import { DatenbankentwicklungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface DatenbankentwicklungFormProps {
  data: DatenbankentwicklungData;
  onDataChange: (data: DatenbankentwicklungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const DatenbankentwicklungForm: React.FC<DatenbankentwicklungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<DatenbankentwicklungData>(data);

  const serviceTypeOptions = [
    { value: 'new_design', label: 'Neues Datenbank-Design' },
    { value: 'migration', label: 'Datenbank-Migration' },
    { value: 'optimization', label: 'Optimierung' },
    { value: 'maintenance', label: 'Wartung' },
    { value: 'backup_recovery', label: 'Backup & Recovery' },
    { value: 'integration', label: 'Integration' },
    { value: 'analysis', label: 'Datenanalyse' },
    { value: 'consulting', label: 'Beratung' },
  ];

  const databaseTypeOptions = [
    { value: 'mysql', label: 'MySQL' },
    { value: 'postgresql', label: 'PostgreSQL' },
    { value: 'oracle', label: 'Oracle' },
    { value: 'mssql', label: 'Microsoft SQL Server' },
    { value: 'mongodb', label: 'MongoDB' },
    { value: 'redis', label: 'Redis' },
    { value: 'cassandra', label: 'Cassandra' },
    { value: 'elasticsearch', label: 'Elasticsearch' },
    { value: 'sqlite', label: 'SQLite' },
    { value: 'firebase', label: 'Firebase' },
  ];

  const dataSizeOptions = [
    { value: 'small', label: 'Klein (< 1 GB)' },
    { value: 'medium', label: 'Mittel (1-100 GB)' },
    { value: 'large', label: 'Groß (100 GB - 1 TB)' },
    { value: 'enterprise', label: 'Enterprise (> 1 TB)' },
  ];

  const performanceOptions = [
    { value: 'low', label: 'Niedrig' },
    { value: 'medium', label: 'Mittel' },
    { value: 'high', label: 'Hoch' },
    { value: 'critical', label: 'Kritisch' },
  ];

  const accessTypeOptions = [
    { value: 'read_heavy', label: 'Lese-intensiv' },
    { value: 'write_heavy', label: 'Schreib-intensiv' },
    { value: 'mixed', label: 'Gemischt' },
    { value: 'analytical', label: 'Analytisch' },
  ];
  const featuresOptions = [
    { value: 'replication', label: 'Replikation' },
    { value: 'clustering', label: 'Clustering' },
    { value: 'sharding', label: 'Sharding' },
    { value: 'encryption', label: 'Verschlüsselung' },
    { value: 'backup_automation', label: 'Automatische Backups' },
    { value: 'monitoring', label: 'Monitoring' },
    { value: 'partitioning', label: 'Partitionierung' },
    { value: 'indexing', label: 'Indizierung' },
    { value: 'compression', label: 'Komprimierung' },
  ];

  const additionalServicesOptions = [
    { value: 'data_modeling', label: 'Datenmodellierung' },
    { value: 'performance_tuning', label: 'Performance Tuning' },
    { value: 'security_audit', label: 'Sicherheitsaudit' },
    { value: 'documentation', label: 'Dokumentation' },
    { value: 'training', label: 'Schulung' },
    { value: 'support', label: '24/7 Support' },
    { value: 'migration_support', label: 'Migrations-Support' },
    { value: 'api_development', label: 'API-Entwicklung' },
  ];

  const handleInputChange = (field: keyof DatenbankentwicklungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.databaseType &&
      formData.dataSize &&
      formData.performanceRequirements &&
      formData.accessType &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Datenbankentwicklung-Projektdetails
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

          <FormField label="Datenbank-Typ" required>
            <FormSelect
              value={formData.databaseType || ''}
              onChange={value => handleInputChange('databaseType', value)}
              options={databaseTypeOptions}
              placeholder="Wählen Sie den Datenbank-Typ"
            />
          </FormField>

          <FormField label="Datengröße" required>
            <FormSelect
              value={formData.dataSize || ''}
              onChange={value => handleInputChange('dataSize', value)}
              options={dataSizeOptions}
              placeholder="Wählen Sie die Datengröße"
            />
          </FormField>

          <FormField label="Performance-Anforderungen" required>
            <FormSelect
              value={formData.performanceRequirements || ''}
              onChange={value => handleInputChange('performanceRequirements', value)}
              options={performanceOptions}
              placeholder="Wählen Sie die Performance-Anforderungen"
            />
          </FormField>

          <FormField label="Zugriffsmuster" required>
            <FormSelect
              value={formData.accessType || ''}
              onChange={value => handleInputChange('accessType', value)}
              options={accessTypeOptions}
              placeholder="Wählen Sie das Zugriffsmuster"
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
              placeholder="Anzahl der gleichzeitigen Benutzer"
            />
          </FormField>

          <FormField label="Anzahl Tabellen">
            <FormInput
              type="number"
              value={formData.numberOfTables?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfTables',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Geschätzte Anzahl der Tabellen"
            />
          </FormField>

          <FormField label="Projekt-Name">
            <FormInput
              type="text"
              value={formData.projectName || ''}
              onChange={value => handleInputChange('projectName', value)}
              placeholder="Name des Projekts"
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
          <FormField label="Gewünschte Features">
            <FormCheckboxGroup
              value={formData.features || []}
              onChange={value => handleInputChange('features', value)}
              options={featuresOptions}
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
              placeholder="Beschreiben Sie Ihr Datenbank-Projekt detailliert"
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
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Compliance, Sicherheit, Integration oder andere spezielle Anforderungen"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default DatenbankentwicklungForm;
