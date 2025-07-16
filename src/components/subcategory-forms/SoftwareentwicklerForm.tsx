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

interface SoftwareentwicklerFormProps {
  data: SoftwareentwicklungData;
  onDataChange: (data: SoftwareentwicklungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SoftwareentwicklerForm: React.FC<SoftwareentwicklerFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<SoftwareentwicklungData>(data);

  const serviceTypeOptions = [
    { value: 'custom_software', label: 'Custom Software' },
    { value: 'web_application', label: 'Web Application' },
    { value: 'mobile_app', label: 'Mobile App' },
    { value: 'desktop_app', label: 'Desktop Application' },
    { value: 'api_development', label: 'API Development' },
    { value: 'database_development', label: 'Database Development' },
    { value: 'integration', label: 'System Integration' },
    { value: 'migration', label: 'Migration' },
    { value: 'maintenance', label: 'Wartung' },
    { value: 'consulting', label: 'Beratung' },
    { value: 'code_review', label: 'Code Review' },
    { value: 'testing', label: 'Testing' },
    { value: 'debugging', label: 'Debugging' },
    { value: 'optimization', label: 'Optimierung' },
    { value: 'andere', label: 'Andere' },
  ];

  const applicationTypeOptions = [
    { value: 'web_app', label: 'Web Application' },
    { value: 'mobile_app', label: 'Mobile App' },
    { value: 'desktop_app', label: 'Desktop Application' },
    { value: 'enterprise_software', label: 'Enterprise Software' },
    { value: 'saas', label: 'SaaS' },
    { value: 'crm', label: 'CRM' },
    { value: 'erp', label: 'ERP' },
    { value: 'cms', label: 'CMS' },
    { value: 'e_commerce', label: 'E-Commerce' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'portal', label: 'Portal' },
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'reporting', label: 'Reporting Tool' },
    { value: 'analytics', label: 'Analytics Tool' },
    { value: 'automation', label: 'Automation Tool' },
    { value: 'workflow', label: 'Workflow System' },
    { value: 'inventory', label: 'Inventory System' },
    { value: 'booking', label: 'Booking System' },
    { value: 'payment', label: 'Payment System' },
    { value: 'chat', label: 'Chat System' },
    { value: 'forum', label: 'Forum' },
    { value: 'social_network', label: 'Social Network' },
    { value: 'game', label: 'Game' },
    { value: 'utility', label: 'Utility Tool' },
    { value: 'andere', label: 'Andere' },
  ];

  const budgetRangeOptions = [
    { value: 'unter_1000', label: 'Unter 1000€' },
    { value: '1000_5000', label: '1000€ - 5000€' },
    { value: '5000_10000', label: '5000€ - 10000€' },
    { value: '10000_25000', label: '10000€ - 25000€' },
    { value: '25000_50000', label: '25000€ - 50000€' },
    { value: '50000_100000', label: '50000€ - 100000€' },
    { value: 'über_100000', label: 'Über 100000€' },
  ];

  const urgencyOptions = [
    { value: 'nicht_eilig', label: 'Nicht eilig' },
    { value: 'normal', label: 'Normal' },
    { value: 'eilig', label: 'Eilig' },
    { value: 'sehr_eilig', label: 'Sehr eilig' },
  ];

  const complexityOptions = [
    { value: 'einfach', label: 'Einfach' },
    { value: 'mittel', label: 'Mittel' },
    { value: 'komplex', label: 'Komplex' },
    { value: 'sehr_komplex', label: 'Sehr komplex' },
  ];

  const projectSizeOptions = [
    { value: 'klein', label: 'Klein (< 3 Monate)' },
    { value: 'mittel', label: 'Mittel (3-6 Monate)' },
    { value: 'gross', label: 'Groß (6-12 Monate)' },
    { value: 'sehr_gross', label: 'Sehr groß (> 12 Monate)' },
  ];

  const programmingLanguageOptions = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'csharp', label: 'C#' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'swift', label: 'Swift' },
    { value: 'kotlin', label: 'Kotlin' },
    { value: 'dart', label: 'Dart' },
    { value: 'scala', label: 'Scala' },
    { value: 'r', label: 'R' },
    { value: 'matlab', label: 'MATLAB' },
    { value: 'sql', label: 'SQL' },
    { value: 'andere', label: 'Andere' },
  ];

  const frameworkOptions = [
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue.js' },
    { value: 'angular', label: 'Angular' },
    { value: 'next', label: 'Next.js' },
    { value: 'nuxt', label: 'Nuxt.js' },
    { value: 'svelte', label: 'Svelte' },
    { value: 'express', label: 'Express.js' },
    { value: 'nodejs', label: 'Node.js' },
    { value: 'django', label: 'Django' },
    { value: 'flask', label: 'Flask' },
    { value: 'fastapi', label: 'FastAPI' },
    { value: 'spring', label: 'Spring' },
    { value: 'laravel', label: 'Laravel' },
    { value: 'symfony', label: 'Symfony' },
    { value: 'rails', label: 'Ruby on Rails' },
    { value: 'dotnet', label: '.NET' },
    { value: 'flutter', label: 'Flutter' },
    { value: 'react_native', label: 'React Native' },
    { value: 'ionic', label: 'Ionic' },
    { value: 'electron', label: 'Electron' },
    { value: 'andere', label: 'Andere' },
  ];

  const databaseOptions = [
    { value: 'mysql', label: 'MySQL' },
    { value: 'postgresql', label: 'PostgreSQL' },
    { value: 'sqlite', label: 'SQLite' },
    { value: 'mongodb', label: 'MongoDB' },
    { value: 'redis', label: 'Redis' },
    { value: 'elasticsearch', label: 'Elasticsearch' },
    { value: 'firebase', label: 'Firebase' },
    { value: 'supabase', label: 'Supabase' },
    { value: 'oracle', label: 'Oracle' },
    { value: 'mssql', label: 'Microsoft SQL Server' },
    { value: 'cassandra', label: 'Cassandra' },
    { value: 'dynamodb', label: 'DynamoDB' },
    { value: 'andere', label: 'Andere' },
  ];

  const cloudProviderOptions = [
    { value: 'aws', label: 'Amazon Web Services' },
    { value: 'google_cloud', label: 'Google Cloud' },
    { value: 'azure', label: 'Microsoft Azure' },
    { value: 'digital_ocean', label: 'DigitalOcean' },
    { value: 'heroku', label: 'Heroku' },
    { value: 'vercel', label: 'Vercel' },
    { value: 'netlify', label: 'Netlify' },
    { value: 'hetzner', label: 'Hetzner' },
    { value: 'linode', label: 'Linode' },
    { value: 'vultr', label: 'Vultr' },
    { value: 'on_premise', label: 'On-Premise' },
    { value: 'andere', label: 'Andere' },
  ];

  const featuresOptions = [
    { value: 'user_authentication', label: 'User Authentication' },
    { value: 'user_management', label: 'User Management' },
    { value: 'role_based_access', label: 'Role-based Access' },
    { value: 'payment_integration', label: 'Payment Integration' },
    { value: 'api_integration', label: 'API Integration' },
    { value: 'third_party_integration', label: 'Third-party Integration' },
    { value: 'real_time_updates', label: 'Real-time Updates' },
    { value: 'notifications', label: 'Notifications' },
    { value: 'email_system', label: 'Email System' },
    { value: 'file_upload', label: 'File Upload' },
    { value: 'image_processing', label: 'Image Processing' },
    { value: 'video_processing', label: 'Video Processing' },
    { value: 'search_functionality', label: 'Search Functionality' },
    { value: 'reporting', label: 'Reporting' },
    { value: 'analytics', label: 'Analytics' },
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'admin_panel', label: 'Admin Panel' },
    { value: 'multilingual', label: 'Multilingual' },
    { value: 'responsive_design', label: 'Responsive Design' },
    { value: 'mobile_optimized', label: 'Mobile Optimized' },
    { value: 'seo_optimization', label: 'SEO Optimization' },
    { value: 'caching', label: 'Caching' },
    { value: 'security', label: 'Security Features' },
    { value: 'backup', label: 'Backup System' },
    { value: 'monitoring', label: 'Monitoring' },
    { value: 'logging', label: 'Logging' },
    { value: 'testing', label: 'Testing' },
    { value: 'ci_cd', label: 'CI/CD' },
    { value: 'documentation', label: 'Documentation' },
    { value: 'andere', label: 'Andere' },
  ];

  const additionalServicesOptions = [
    { value: 'projektmanagement', label: 'Projektmanagement' },
    { value: 'beratung', label: 'Beratung' },
    { value: 'anforderungsanalyse', label: 'Anforderungsanalyse' },
    { value: 'konzeption', label: 'Konzeption' },
    { value: 'architektur', label: 'Software-Architektur' },
    { value: 'design', label: 'UI/UX Design' },
    { value: 'prototyping', label: 'Prototyping' },
    { value: 'wireframing', label: 'Wireframing' },
    { value: 'mockups', label: 'Mockups' },
    { value: 'testing', label: 'Testing' },
    { value: 'qa', label: 'Quality Assurance' },
    { value: 'code_review', label: 'Code Review' },
    { value: 'refactoring', label: 'Refactoring' },
    { value: 'optimization', label: 'Performance Optimization' },
    { value: 'security_audit', label: 'Security Audit' },
    { value: 'penetration_testing', label: 'Penetration Testing' },
    { value: 'load_testing', label: 'Load Testing' },
    { value: 'deployment', label: 'Deployment' },
    { value: 'devops', label: 'DevOps' },
    { value: 'ci_cd_setup', label: 'CI/CD Setup' },
    { value: 'infrastructure', label: 'Infrastructure' },
    { value: 'cloud_setup', label: 'Cloud Setup' },
    { value: 'database_design', label: 'Database Design' },
    { value: 'data_migration', label: 'Data Migration' },
    { value: 'api_design', label: 'API Design' },
    { value: 'documentation', label: 'Documentation' },
    { value: 'training', label: 'Training' },
    { value: 'schulung', label: 'Schulung' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'support', label: 'Support' },
    { value: 'wartung', label: 'Wartung' },
    { value: 'monitoring', label: 'Monitoring' },
    { value: 'backup', label: 'Backup' },
    { value: 'disaster_recovery', label: 'Disaster Recovery' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'gdpr', label: 'GDPR' },
    { value: 'accessibility', label: 'Accessibility' },
    { value: 'internationalization', label: 'Internationalization' },
    { value: 'localization', label: 'Localization' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'bug_fixes', label: 'Bug Fixes' },
    { value: 'updates', label: 'Updates' },
    { value: 'feature_additions', label: 'Feature Additions' },
    { value: 'integration_support', label: 'Integration Support' },
    { value: 'legacy_modernization', label: 'Legacy Modernization' },
    { value: 'technology_consulting', label: 'Technology Consulting' },
    { value: 'architecture_review', label: 'Architecture Review' },
    { value: 'andere', label: 'Andere' },
  ];

  const handleInputChange = (field: keyof SoftwareentwicklungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.applicationType &&
      formData.budgetRange &&
      formData.urgency &&
      formData.complexity &&
      formData.projectSize &&
      formData.description
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Softwareentwicklung-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Entwicklung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Entwicklung"
            />
          </FormField>

          <FormField label="Anwendungstyp" required>
            <FormSelect
              value={formData.applicationType || ''}
              onChange={value => handleInputChange('applicationType', value)}
              options={applicationTypeOptions}
              placeholder="Wählen Sie den Anwendungstyp"
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

          <FormField label="Dringlichkeit" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wählen Sie die Dringlichkeit"
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

          <FormField label="Projektgröße" required>
            <FormSelect
              value={formData.projectSize || ''}
              onChange={value => handleInputChange('projectSize', value)}
              options={projectSizeOptions}
              placeholder="Wählen Sie die Projektgröße"
            />
          </FormField>

          <FormField label="Programmiersprache">
            <FormSelect
              value={formData.programmingLanguage || ''}
              onChange={value => handleInputChange('programmingLanguage', value)}
              options={programmingLanguageOptions}
              placeholder="Wählen Sie die Programmiersprache"
            />
          </FormField>

          <FormField label="Framework">
            <FormSelect
              value={formData.framework || ''}
              onChange={value => handleInputChange('framework', value)}
              options={frameworkOptions}
              placeholder="Wählen Sie das Framework"
            />
          </FormField>

          <FormField label="Datenbank">
            <FormSelect
              value={formData.database || ''}
              onChange={value => handleInputChange('database', value)}
              options={databaseOptions}
              placeholder="Wählen Sie die Datenbank"
            />
          </FormField>

          <FormField label="Cloud Provider">
            <FormSelect
              value={formData.cloudProvider || ''}
              onChange={value => handleInputChange('cloudProvider', value)}
              options={cloudProviderOptions}
              placeholder="Wählen Sie den Cloud Provider"
            />
          </FormField>

          <FormField label="Gewünschter Starttermin">
            <FormInput
              type="text"
              value={formData.preferredStartDate || ''}
              onChange={value => handleInputChange('preferredStartDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Gewünschter Liefertermin">
            <FormInput
              type="text"
              value={formData.preferredDeliveryDate || ''}
              onChange={value => handleInputChange('preferredDeliveryDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Kontaktperson">
            <FormInput
              type="text"
              value={formData.contactPerson || ''}
              onChange={value => handleInputChange('contactPerson', value)}
              placeholder="Name der Kontaktperson"
            />
          </FormField>

          <FormField label="Unternehmen">
            <FormInput
              type="text"
              value={formData.company || ''}
              onChange={value => handleInputChange('company', value)}
              placeholder="Unternehmen"
            />
          </FormField>

          <FormField label="Telefonnummer">
            <FormInput
              type="text"
              value={formData.phoneNumber || ''}
              onChange={value => handleInputChange('phoneNumber', value)}
              placeholder="Telefonnummer"
            />
          </FormField>

          <FormField label="E-Mail">
            <FormInput
              type="email"
              value={formData.email || ''}
              onChange={value => handleInputChange('email', value)}
              placeholder="E-Mail-Adresse"
            />
          </FormField>

          <FormField label="Branche">
            <FormInput
              type="text"
              value={formData.industry || ''}
              onChange={value => handleInputChange('industry', value)}
              placeholder="Branche"
            />
          </FormField>

          <FormField label="Zielgruppe">
            <FormInput
              type="text"
              value={formData.targetGroup || ''}
              onChange={value => handleInputChange('targetGroup', value)}
              placeholder="Zielgruppe"
            />
          </FormField>

          <FormField label="Anzahl Benutzer">
            <FormInput
              type="text"
              value={formData.userCount || ''}
              onChange={value => handleInputChange('userCount', value)}
              placeholder="Erwartete Anzahl Benutzer"
            />
          </FormField>

          <FormField label="Plattform">
            <FormInput
              type="text"
              value={
                Array.isArray(formData.platform)
                  ? formData.platform.join(', ')
                  : formData.platform || ''
              }
              onChange={value => handleInputChange('platform', value)}
              placeholder="Zielplattform (z.B. Web, iOS, Android)"
            />
          </FormField>

          <FormField label="Sprachen">
            <FormInput
              type="text"
              value={formData.languages || ''}
              onChange={value => handleInputChange('languages', value)}
              placeholder="Sprachen (z.B. Deutsch, Englisch)"
            />
          </FormField>

          <FormField label="Versionsverwaltung">
            <FormInput
              type="text"
              value={formData.versionControl || ''}
              onChange={value => handleInputChange('versionControl', value)}
              placeholder="z.B. Git, GitHub, GitLab"
            />
          </FormField>

          <FormField label="Deployment">
            <FormInput
              type="text"
              value={formData.deployment || ''}
              onChange={value => handleInputChange('deployment', value)}
              placeholder="Deployment-Strategie"
            />
          </FormField>

          <FormField label="Monitoring">
            <FormInput
              type="text"
              value={formData.monitoring || ''}
              onChange={value => handleInputChange('monitoring', value)}
              placeholder="Monitoring-Tools"
            />
          </FormField>

          <FormField label="Testing">
            <FormInput
              type="text"
              value={formData.testing || ''}
              onChange={value => handleInputChange('testing', value)}
              placeholder="Testing-Strategie"
            />
          </FormField>

          <FormField label="Agile Methodik gewünscht">
            <FormRadioGroup
              name="agileMethodology"
              value={formData.agileMethodology || ''}
              onChange={value => handleInputChange('agileMethodology', value)}
              options={[
                { value: 'ja', label: 'Ja, Agile Entwicklung' },
                { value: 'nein', label: 'Nein, Wasserfall' },
                { value: 'scrum', label: 'Scrum' },
                { value: 'kanban', label: 'Kanban' },
              ]}
            />
          </FormField>

          <FormField label="Open Source gewünscht">
            <FormRadioGroup
              name="openSource"
              value={formData.openSource || ''}
              onChange={value => handleInputChange('openSource', value)}
              options={[
                { value: 'ja', label: 'Ja, Open Source' },
                { value: 'nein', label: 'Nein, proprietär' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>

          <FormField label="Skalierbarkeit gewünscht">
            <FormRadioGroup
              name="scalability"
              value={formData.scalability || ''}
              onChange={value => handleInputChange('scalability', value)}
              options={[
                { value: 'ja', label: 'Ja, hohe Skalierbarkeit' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'mittel', label: 'Mittlere Skalierbarkeit' },
              ]}
            />
          </FormField>

          <FormField label="Performance-Anforderungen">
            <FormRadioGroup
              name="performance"
              value={formData.performance || ''}
              onChange={value => handleInputChange('performance', value)}
              options={[
                { value: 'hoch', label: 'Hohe Performance' },
                { value: 'mittel', label: 'Mittlere Performance' },
                { value: 'niedrig', label: 'Niedrige Performance' },
              ]}
            />
          </FormField>

          <FormField label="Sicherheitsanforderungen">
            <FormRadioGroup
              name="security"
              value={formData.security || ''}
              onChange={value => handleInputChange('security', value)}
              options={[
                { value: 'hoch', label: 'Hohe Sicherheit' },
                { value: 'mittel', label: 'Mittlere Sicherheit' },
                { value: 'niedrig', label: 'Niedrige Sicherheit' },
              ]}
            />
          </FormField>

          <FormField label="Wartung gewünscht">
            <FormRadioGroup
              name="maintenance"
              value={formData.maintenance || ''}
              onChange={value => handleInputChange('maintenance', value)}
              options={[
                { value: 'ja', label: 'Ja, Wartung gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'vertrag', label: 'Wartungsvertrag' },
              ]}
            />
          </FormField>

          <FormField label="Support gewünscht">
            <FormRadioGroup
              name="support"
              value={formData.support || ''}
              onChange={value => handleInputChange('support', value)}
              options={[
                { value: 'ja', label: 'Ja, Support gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'zeitlich_begrenzt', label: 'Zeitlich begrenzt' },
              ]}
            />
          </FormField>

          <FormField label="Dokumentation gewünscht">
            <FormRadioGroup
              name="documentation"
              value={formData.documentation || ''}
              onChange={value => handleInputChange('documentation', value)}
              options={[
                { value: 'ja', label: 'Ja, Dokumentation gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'umfassend', label: 'Umfassende Dokumentation' },
              ]}
            />
          </FormField>

          <FormField label="Schulung gewünscht">
            <FormRadioGroup
              name="training"
              value={formData.training || ''}
              onChange={value => handleInputChange('training', value)}
              options={[
                { value: 'ja', label: 'Ja, Schulung gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'online', label: 'Online-Schulung' },
                { value: 'vor_ort', label: 'Vor-Ort-Schulung' },
              ]}
            />
          </FormField>

          <FormField label="Code Review gewünscht">
            <FormRadioGroup
              name="codeReview"
              value={formData.codeReview || ''}
              onChange={value => handleInputChange('codeReview', value)}
              options={[
                { value: 'ja', label: 'Ja, Code Review gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'regelmäßig', label: 'Regelmäßige Reviews' },
              ]}
            />
          </FormField>

          <FormField label="Testing gewünscht">
            <FormRadioGroup
              name="testingRequired"
              value={formData.testingRequired || ''}
              onChange={value => handleInputChange('testingRequired', value)}
              options={[
                { value: 'ja', label: 'Ja, Testing gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'umfassend', label: 'Umfassendes Testing' },
              ]}
            />
          </FormField>

          <FormField label="CI/CD gewünscht">
            <FormRadioGroup
              name="cicd"
              value={formData.cicd || ''}
              onChange={value => handleInputChange('cicd', value)}
              options={[
                { value: 'ja', label: 'Ja, CI/CD gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'setup', label: 'Setup erforderlich' },
              ]}
            />
          </FormField>

          <FormField label="DevOps gewünscht">
            <FormRadioGroup
              name="devops"
              value={formData.devops || ''}
              onChange={value => handleInputChange('devops', value)}
              options={[
                { value: 'ja', label: 'Ja, DevOps gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'beratung', label: 'DevOps-Beratung' },
              ]}
            />
          </FormField>

          <FormField label="Cloud-nativ gewünscht">
            <FormRadioGroup
              name="cloudNative"
              value={formData.cloudNative || ''}
              onChange={value => handleInputChange('cloudNative', value)}
              options={[
                { value: 'ja', label: 'Ja, Cloud-nativ' },
                { value: 'nein', label: 'Nein, traditionell' },
                { value: 'hybrid', label: 'Hybrid-Lösung' },
              ]}
            />
          </FormField>

          <FormField label="Microservices gewünscht">
            <FormRadioGroup
              name="microservices"
              value={formData.microservices || ''}
              onChange={value => handleInputChange('microservices', value)}
              options={[
                { value: 'ja', label: 'Ja, Microservices' },
                { value: 'nein', label: 'Nein, Monolith' },
                { value: 'hybrid', label: 'Hybrid-Architektur' },
              ]}
            />
          </FormField>

          <FormField label="API-First gewünscht">
            <FormRadioGroup
              name="apiFirst"
              value={formData.apiFirst || ''}
              onChange={value => handleInputChange('apiFirst', value)}
              options={[
                { value: 'ja', label: 'Ja, API-First' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'restful', label: 'RESTful API' },
                { value: 'graphql', label: 'GraphQL' },
              ]}
            />
          </FormField>

          <FormField label="Mobile-First gewünscht">
            <FormRadioGroup
              name="mobileFirst"
              value={formData.mobileFirst || ''}
              onChange={value => handleInputChange('mobileFirst', value)}
              options={[
                { value: 'ja', label: 'Ja, Mobile-First' },
                { value: 'nein', label: 'Nein, Desktop-First' },
                { value: 'responsive', label: 'Responsive Design' },
              ]}
            />
          </FormField>

          <FormField label="PWA gewünscht">
            <FormRadioGroup
              name="pwa"
              value={formData.pwa || ''}
              onChange={value => handleInputChange('pwa', value)}
              options={[
                { value: 'ja', label: 'Ja, PWA gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'prüfen', label: 'Prüfen ob sinnvoll' },
              ]}
            />
          </FormField>

          <FormField label="Offline-Funktionalität gewünscht">
            <FormRadioGroup
              name="offline"
              value={formData.offline || ''}
              onChange={value => handleInputChange('offline', value)}
              options={[
                { value: 'ja', label: 'Ja, Offline-Funktionalität' },
                { value: 'nein', label: 'Nein, nur Online' },
                { value: 'teilweise', label: 'Teilweise offline' },
              ]}
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
              value={formData.description || ''}
              onChange={value => handleInputChange('description', value)}
              placeholder="Beschreiben Sie Ihr Softwareprojekt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Funktionale Anforderungen">
            <FormTextarea
              value={formData.functionalRequirements || ''}
              onChange={value => handleInputChange('functionalRequirements', value)}
              placeholder="Beschreiben Sie die funktionalen Anforderungen"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Technische Anforderungen">
            <FormTextarea
              value={formData.technicalRequirements || ''}
              onChange={value => handleInputChange('technicalRequirements', value)}
              placeholder="Beschreiben Sie die technischen Anforderungen"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bestehende Systeme">
            <FormTextarea
              value={formData.existingSystems || ''}
              onChange={value => handleInputChange('existingSystems', value)}
              placeholder="Beschreiben Sie bestehende Systeme und Integrationen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Ziele">
            <FormTextarea
              value={formData.goals || ''}
              onChange={value => handleInputChange('goals', value)}
              placeholder="Welche Ziele sollen mit der Software erreicht werden?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Erfolgskriterien">
            <FormTextarea
              value={formData.successCriteria || ''}
              onChange={value => handleInputChange('successCriteria', value)}
              placeholder="Wie wird der Erfolg gemessen?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Constraints">
            <FormTextarea
              value={formData.constraints || ''}
              onChange={value => handleInputChange('constraints', value)}
              placeholder="Beschreiben Sie Einschränkungen und Vorgaben"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Risiken">
            <FormTextarea
              value={formData.risks || ''}
              onChange={value => handleInputChange('risks', value)}
              placeholder="Welche Risiken sehen Sie?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Team">
            <FormTextarea
              value={formData.team || ''}
              onChange={value => handleInputChange('team', value)}
              placeholder="Informationen zum Team"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zeitplan">
            <FormTextarea
              value={formData.timeline || ''}
              onChange={value => handleInputChange('timeline', value)}
              placeholder="Zeitplan und Meilensteine"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Weitere Informationen">
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

export default SoftwareentwicklerForm;
