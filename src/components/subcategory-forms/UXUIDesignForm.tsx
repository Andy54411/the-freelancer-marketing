import React, { useState, useEffect } from 'react';
import { UXUIDesignData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface UXUIDesignFormProps {
  data: UXUIDesignData;
  onDataChange: (data: UXUIDesignData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const UXUIDesignForm: React.FC<UXUIDesignFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<UXUIDesignData>(data);

  const projectTypeOptions = [
    { value: 'web_design', label: 'Web-Design' },
    { value: 'mobile_app', label: 'Mobile App Design' },
    { value: 'desktop_app', label: 'Desktop App Design' },
    { value: 'redesign', label: 'Redesign' },
    { value: 'landing_page', label: 'Landing Page' },
    { value: 'ecommerce', label: 'E-Commerce Design' },
    { value: 'dashboard', label: 'Dashboard Design' },
    { value: 'prototype', label: 'Prototyping' },
  ];

  const serviceTypeOptions = [
    { value: 'ux_research', label: 'UX Research' },
    { value: 'ui_design', label: 'UI Design' },
    { value: 'ux_design', label: 'UX Design' },
    { value: 'wireframing', label: 'Wireframing' },
    { value: 'prototyping', label: 'Prototyping' },
    { value: 'user_testing', label: 'User Testing' },
    { value: 'design_system', label: 'Design System' },
    { value: 'usability_audit', label: 'Usability Audit' },
  ];

  const platformOptions = [
    { value: 'web', label: 'Web' },
    { value: 'ios', label: 'iOS' },
    { value: 'android', label: 'Android' },
    { value: 'desktop', label: 'Desktop' },
    { value: 'tablet', label: 'Tablet' },
    { value: 'responsive', label: 'Responsive' },
    { value: 'cross_platform', label: 'Cross-Platform' },
  ];

  const designStyleOptions = [
    { value: 'modern', label: 'Modern' },
    { value: 'minimalist', label: 'Minimalistisch' },
    { value: 'corporate', label: 'Corporate' },
    { value: 'creative', label: 'Kreativ' },
    { value: 'playful', label: 'Spielerisch' },
    { value: 'elegant', label: 'Elegant' },
    { value: 'bold', label: 'Markant' },
    { value: 'classic', label: 'Klassisch' },
  ];

  const budgetRangeOptions = [
    { value: 'unter_2000', label: 'Unter 2.000€' },
    { value: '2000_5000', label: '2.000€ - 5.000€' },
    { value: '5000_10000', label: '5.000€ - 10.000€' },
    { value: '10000_25000', label: '10.000€ - 25.000€' },
    { value: 'über_25000', label: 'Über 25.000€' },
  ];

  const timelineOptions = [
    { value: 'unter_2_wochen', label: 'Unter 2 Wochen' },
    { value: '2_4_wochen', label: '2-4 Wochen' },
    { value: '1_2_monate', label: '1-2 Monate' },
    { value: '2_3_monate', label: '2-3 Monate' },
    { value: 'über_3_monate', label: 'Über 3 Monate' },
  ];

  const deliverableOptions = [
    { value: 'wireframes', label: 'Wireframes' },
    { value: 'mockups', label: 'Mockups' },
    { value: 'prototypes', label: 'Prototypes' },
    { value: 'design_files', label: 'Design Files' },
    { value: 'style_guide', label: 'Style Guide' },
    { value: 'user_flows', label: 'User Flows' },
    { value: 'personas', label: 'Personas' },
    { value: 'usability_report', label: 'Usability Report' },
  ];

  const toolsOptions = [
    { value: 'figma', label: 'Figma' },
    { value: 'sketch', label: 'Sketch' },
    { value: 'adobe_xd', label: 'Adobe XD' },
    { value: 'photoshop', label: 'Photoshop' },
    { value: 'illustrator', label: 'Illustrator' },
    { value: 'invision', label: 'InVision' },
    { value: 'principle', label: 'Principle' },
    { value: 'framer', label: 'Framer' },
  ];

  const handleInputChange = (field: keyof UXUIDesignData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.projectType &&
      formData.serviceType &&
      formData.platform &&
      formData.designStyle &&
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
          UX/UI Design-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Projektart" required>
            <FormSelect
              value={formData.projectType || ''}
              onChange={value => handleInputChange('projectType', value)}
              options={projectTypeOptions}
              placeholder="Wählen Sie die Projektart"
            />
          </FormField>

          <FormField label="Service-Typ" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie den Service-Typ"
            />
          </FormField>

          <FormField label="Plattform" required>
            <FormSelect
              value={formData.platform || ''}
              onChange={value => handleInputChange('platform', value)}
              options={platformOptions}
              placeholder="Wählen Sie die Plattform"
            />
          </FormField>

          <FormField label="Design-Stil" required>
            <FormSelect
              value={formData.designStyle || ''}
              onChange={value => handleInputChange('designStyle', value)}
              options={designStyleOptions}
              placeholder="Wählen Sie den Design-Stil"
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

          <FormField label="Website/App URL">
            <FormInput
              type="text"
              value={formData.websiteUrl || ''}
              onChange={value => handleInputChange('websiteUrl', value)}
              placeholder="Aktuelle Website oder App URL"
            />
          </FormField>

          <FormField label="Zielgruppe">
            <FormInput
              type="text"
              value={formData.targetAudience || ''}
              onChange={value => handleInputChange('targetAudience', value)}
              placeholder="Beschreibung der Zielgruppe"
            />
          </FormField>

          <FormField label="Anzahl Screens/Seiten">
            <FormInput
              type="number"
              value={formData.numberOfScreens?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfScreens',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Geschätzte Anzahl der Screens"
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
          <FormField label="Gewünschte Ergebnisse">
            <FormCheckboxGroup
              value={formData.deliverables || []}
              onChange={value => handleInputChange('deliverables', value)}
              options={deliverableOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bevorzugte Tools">
            <FormCheckboxGroup
              value={formData.preferredTools || []}
              onChange={value => handleInputChange('preferredTools', value)}
              options={toolsOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihr Design-Projekt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Design-Inspirationen">
            <FormTextarea
              value={formData.designInspiration || ''}
              onChange={value => handleInputChange('designInspiration', value)}
              placeholder="Links zu Websites, Apps oder Designs, die Ihnen gefallen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Farbpräferenzen">
            <FormTextarea
              value={formData.colorPreferences || ''}
              onChange={value => handleInputChange('colorPreferences', value)}
              placeholder="Bevorzugte Farben, Farbpalette oder Corporate Colors"
              rows={2}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Accessibility, Branding-Guidelines oder andere spezielle Anforderungen"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default UXUIDesignForm;
