import React, { useState, useEffect } from 'react';
import { OnlineMarketingData } from '@/types/subcategory-forms';
import { FormField, FormSelect, FormSubmitButton, FormTextarea } from './FormComponents';

interface OnlineMarketingFormProps {
  data: OnlineMarketingData;
  onDataChange: (data: OnlineMarketingData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const OnlineMarketingForm: React.FC<OnlineMarketingFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<OnlineMarketingData>(data);

  const serviceTypeOptions = [
    { value: 'seo', label: 'SEO (Suchmaschinenoptimierung)' },
    { value: 'sea', label: 'SEA (Suchmaschinenwerbung)' },
    { value: 'social_media', label: 'Social Media Marketing' },
    { value: 'content_marketing', label: 'Content Marketing' },
    { value: 'email_marketing', label: 'E-Mail Marketing' },
    { value: 'display_advertising', label: 'Display Advertising' },
    { value: 'conversion_optimization', label: 'Conversion-Optimierung' },
    { value: 'marketing_automation', label: 'Marketing Automation' },
  ];

  const businessTypeOptions = [
    { value: 'b2b', label: 'B2B (Business-to-Business)' },
    { value: 'b2c', label: 'B2C (Business-to-Consumer)' },
    { value: 'ecommerce', label: 'E-Commerce' },
    { value: 'local_business', label: 'Lokales Geschäft' },
    { value: 'startup', label: 'Startup' },
    { value: 'service', label: 'Dienstleistung' },
  ];

  const industryOptions = [
    { value: 'technology', label: 'Technologie' },
    { value: 'healthcare', label: 'Gesundheitswesen' },
    { value: 'finance', label: 'Finanzwesen' },
    { value: 'retail', label: 'Einzelhandel' },
    { value: 'education', label: 'Bildung' },
    { value: 'real_estate', label: 'Immobilien' },
    { value: 'food_beverage', label: 'Lebensmittel & Getränke' },
    { value: 'other', label: 'Andere' },
  ];

  const timelineOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'kurzfristig', label: 'Kurzfristig (1-3 Monate)' },
    { value: 'mittelfristig', label: 'Mittelfristig (3-6 Monate)' },
    { value: 'langfristig', label: 'Langfristig (6-12 Monate)' },
    { value: 'permanent', label: 'Permanent' },
  ];

  const handleInputChange = (field: keyof OnlineMarketingData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.businessType &&
      formData.industry &&
      formData.timeline &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.businessType &&
      formData.industry &&
      formData.timeline &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Online Marketing-Projektdetails
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

          <FormField label="Geschäftstyp" required>
            <FormSelect
              value={formData.businessType || ''}
              onChange={value => handleInputChange('businessType', value)}
              options={businessTypeOptions}
              placeholder="Wählen Sie den Geschäftstyp"
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

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.timeline || ''}
              onChange={value => handleInputChange('timeline', value)}
              options={timelineOptions}
              placeholder="Wählen Sie den Zeitrahmen"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihr Online Marketing-Projekt detailliert"
              rows={4}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="OnlineMarketing" formData={formData} />
    </div>
  );
};

export default OnlineMarketingForm;
