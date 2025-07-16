import React, { useState, useEffect } from 'react';
import { WebentwicklungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface WebentwicklungFormProps {
  data: WebentwicklungData;
  onDataChange: (data: WebentwicklungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const WebentwicklungForm: React.FC<WebentwicklungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<WebentwicklungData>(data);

  const serviceTypeOptions = [
    { value: 'neubau', label: 'Neubau' },
    { value: 'redesign', label: 'Redesign' },
    { value: 'wartung', label: 'Wartung' },
    { value: 'optimierung', label: 'Optimierung' },
  ];

  const projectTypeOptions = [
    { value: 'website', label: 'Website' },
    { value: 'webshop', label: 'Webshop' },
    { value: 'webapp', label: 'Web-App' },
    { value: 'landing_page', label: 'Landing Page' },
    { value: 'blog', label: 'Blog' },
  ];

  const technologyOptions = [
    { value: 'html_css', label: 'HTML/CSS' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue.js' },
    { value: 'angular', label: 'Angular' },
    { value: 'php', label: 'PHP' },
    { value: 'python', label: 'Python' },
    { value: 'wordpress', label: 'WordPress' },
  ];

  const complexityOptions = [
    { value: 'einfach', label: 'Einfach' },
    { value: 'mittel', label: 'Mittel' },
    { value: 'komplex', label: 'Komplex' },
  ];

  const featureOptions = [
    { value: 'responsive', label: 'Responsive Design' },
    { value: 'cms', label: 'Content Management System' },
    { value: 'seo', label: 'SEO-Optimierung' },
    { value: 'analytics', label: 'Analytics Integration' },
    { value: 'mehrsprachig', label: 'Mehrsprachigkeit' },
    { value: 'datenbank', label: 'Datenbank-Integration' },
  ];

  const timeframeOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'innerhalb_monat', label: 'Innerhalb eines Monats' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const supportOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'laufend', label: 'Laufende Betreuung' },
    { value: 'nicht_nötig', label: 'Nicht nötig' },
  ];

  const handleInputChange = (field: keyof WebentwicklungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.projectType &&
      formData.technology &&
      formData.technology.length > 0 &&
      formData.complexity &&
      formData.features &&
      formData.features.length > 0 &&
      formData.timeframe &&
      formData.support
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Webentwicklung-Projektdetails
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

          <FormField label="Projekttyp" required>
            <FormSelect
              value={formData.projectType || ''}
              onChange={value => handleInputChange('projectType', value)}
              options={projectTypeOptions}
              placeholder="Wählen Sie den Projekttyp"
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

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.timeframe || ''}
              onChange={value => handleInputChange('timeframe', value)}
              options={timeframeOptions}
              placeholder="Wählen Sie den Zeitrahmen"
            />
          </FormField>

          <FormField label="Support" required>
            <FormSelect
              value={formData.support || ''}
              onChange={value => handleInputChange('support', value)}
              options={supportOptions}
              placeholder="Wählen Sie den Support-Typ"
            />
          </FormField>

          <FormField label="Budget (€)">
            <FormInput
              type="number"
              value={formData.budget?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'budget',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Ihr Budget in Euro"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Technologien" required>
            <FormCheckboxGroup
              value={formData.technology || []}
              onChange={value => handleInputChange('technology', value)}
              options={technologyOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gewünschte Features" required>
            <FormCheckboxGroup
              value={formData.features || []}
              onChange={value => handleInputChange('features', value)}
              options={featureOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Beschreiben Sie besondere Wünsche, technische Anforderungen oder Besonderheiten des Projekts"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default WebentwicklungForm;
