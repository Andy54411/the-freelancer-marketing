import React, { useState, useEffect } from 'react';
import { SoftwareentwicklungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface SoftwareentwicklungFormProps {
  data: SoftwareentwicklungData;
  onDataChange: (data: SoftwareentwicklungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SoftwareentwicklungForm: React.FC<SoftwareentwicklungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<SoftwareentwicklungData>(data);

  const projectTypeOptions = [
    { value: 'web_application', label: 'Web-Anwendung' },
    { value: 'mobile_app', label: 'Mobile App' },
    { value: 'desktop_software', label: 'Desktop-Software' },
    { value: 'api_development', label: 'API-Entwicklung' },
    { value: 'database_design', label: 'Datenbank-Design' },
    { value: 'microservices', label: 'Microservices' },
    { value: 'enterprise_software', label: 'Enterprise-Software' },
    { value: 'plugin_extension', label: 'Plugin/Extension' },
  ];

  const platformOptions = [
    { value: 'web', label: 'Web (Browser)' },
    { value: 'ios', label: 'iOS' },
    { value: 'android', label: 'Android' },
    { value: 'windows', label: 'Windows' },
    { value: 'macos', label: 'macOS' },
    { value: 'linux', label: 'Linux' },
    { value: 'cross_platform', label: 'Cross-Platform' },
    { value: 'cloud', label: 'Cloud' },
  ];

  const technologyOptions = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'react', label: 'React' },
    { value: 'angular', label: 'Angular' },
    { value: 'vue', label: 'Vue.js' },
    { value: 'nodejs', label: 'Node.js' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'csharp', label: 'C#' },
    { value: 'php', label: 'PHP' },
    { value: 'swift', label: 'Swift' },
    { value: 'kotlin', label: 'Kotlin' },
    { value: 'flutter', label: 'Flutter' },
    { value: 'react_native', label: 'React Native' },
  ];

  const databaseOptions = [
    { value: 'mysql', label: 'MySQL' },
    { value: 'postgresql', label: 'PostgreSQL' },
    { value: 'mongodb', label: 'MongoDB' },
    { value: 'redis', label: 'Redis' },
    { value: 'sqlite', label: 'SQLite' },
    { value: 'oracle', label: 'Oracle' },
    { value: 'mssql', label: 'Microsoft SQL Server' },
    { value: 'firebase', label: 'Firebase' },
  ];

  const budgetRangeOptions = [
    { value: 'unter_5000', label: 'Unter 5.000€' },
    { value: '5000_15000', label: '5.000€ - 15.000€' },
    { value: '15000_50000', label: '15.000€ - 50.000€' },
    { value: '50000_100000', label: '50.000€ - 100.000€' },
    { value: 'über_100000', label: 'Über 100.000€' },
  ];

  const timelineOptions = [
    { value: 'unter_1_monat', label: 'Unter 1 Monat' },
    { value: '1_3_monate', label: '1-3 Monate' },
    { value: '3_6_monate', label: '3-6 Monate' },
    { value: '6_12_monate', label: '6-12 Monate' },
    { value: 'über_1_jahr', label: 'Über 1 Jahr' },
  ];

  const additionalServicesOptions = [
    { value: 'ui_ux_design', label: 'UI/UX Design' },
    { value: 'testing', label: 'Testing' },
    { value: 'deployment', label: 'Deployment' },
    { value: 'maintenance', label: 'Wartung' },
    { value: 'documentation', label: 'Dokumentation' },
    { value: 'training', label: 'Schulung' },
    { value: 'support', label: 'Support' },
    { value: 'hosting', label: 'Hosting' },
  ];

  const handleInputChange = (field: keyof SoftwareentwicklungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.projectType &&
      formData.platform &&
      formData.technologies &&
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
          Softwareentwicklung-Projektdetails
        </h3>

        <div className="space-y-4">
          <FormField label="Projektart" required>
            <FormSelect
              value={formData.projectType || ''}
              onChange={value => handleInputChange('projectType', value)}
              options={projectTypeOptions}
              placeholder="Wählen Sie die Projektart"
            />
          </FormField>

          <FormField label="Plattform" required>
            <FormCheckboxGroup
              value={formData.platform || []}
              onChange={value => handleInputChange('platform', value)}
              options={platformOptions}
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Erwartete Nutzer">
              <FormInput
                type="number"
                value={formData.expectedUsers?.toString() || ''}
                onChange={value =>
                  handleInputChange(
                    'expectedUsers',
                    typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                  )
                }
                placeholder="Erwartete Anzahl der Nutzer"
              />
            </FormField>

            <FormField label="Gewünschtes Fertigstellungsdatum">
              <FormInput
                type="text"
                value={formData.completionDate || ''}
                onChange={value => handleInputChange('completionDate', value)}
                placeholder="TT.MM.JJJJ"
              />
            </FormField>
          </div>
        </div>

        <div className="mt-4">
          <FormField label="Technologien" required>
            <FormCheckboxGroup
              value={formData.technologies || []}
              onChange={value => handleInputChange('technologies', value)}
              options={technologyOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Datenbank">
            <FormCheckboxGroup
              value={formData.database || []}
              onChange={value => handleInputChange('database', value)}
              options={databaseOptions}
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
              placeholder="Beschreiben Sie Ihr Projekt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Funktionale Anforderungen">
            <FormTextarea
              value={formData.functionalRequirements || ''}
              onChange={value => handleInputChange('functionalRequirements', value)}
              placeholder="Listen Sie die wichtigsten Funktionen auf"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Technische Anforderungen">
            <FormTextarea
              value={formData.technicalRequirements || ''}
              onChange={value => handleInputChange('technicalRequirements', value)}
              placeholder="Spezielle technische Anforderungen"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default SoftwareentwicklungForm;
