'use client';
import React, { useState, useEffect } from 'react';
import { ContentMarketingData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface ContentMarketingFormProps {
  data: ContentMarketingData;
  onDataChange: (data: ContentMarketingData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const ContentMarketingForm: React.FC<ContentMarketingFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<ContentMarketingData>(data);

  const serviceTypeOptions = [
    { value: 'blog_posts', label: 'Blog-Beiträge' },
    { value: 'social_media', label: 'Social Media Content' },
    { value: 'website_content', label: 'Website-Content' },
    { value: 'email_marketing', label: 'E-Mail-Marketing' },
    { value: 'video_content', label: 'Video-Content' },
    { value: 'infographics', label: 'Infografiken' },
    { value: 'whitepapers', label: 'Whitepapers' },
    { value: 'case_studies', label: 'Case Studies' },
    { value: 'press_releases', label: 'Pressemitteilungen' },
    { value: 'content_strategy', label: 'Content-Strategie' },
  ];

  const targetAudienceOptions = [
    { value: 'b2b', label: 'B2B (Business-to-Business)' },
    { value: 'b2c', label: 'B2C (Business-to-Consumer)' },
    { value: 'both', label: 'Beide' },
  ];

  const industryOptions = [
    { value: 'technology', label: 'Technologie' },
    { value: 'healthcare', label: 'Gesundheitswesen' },
    { value: 'finance', label: 'Finanzwesen' },
    { value: 'education', label: 'Bildung' },
    { value: 'retail', label: 'Einzelhandel' },
    { value: 'manufacturing', label: 'Produktion' },
    { value: 'real_estate', label: 'Immobilien' },
    { value: 'hospitality', label: 'Gastgewerbe' },
    { value: 'automotive', label: 'Automotive' },
    { value: 'other', label: 'Sonstige' },
  ];

  const contentVolumeOptions = [
    { value: 'low', label: 'Niedrig (1-5 Beiträge/Monat)' },
    { value: 'medium', label: 'Mittel (6-15 Beiträge/Monat)' },
    { value: 'high', label: 'Hoch (16-30 Beiträge/Monat)' },
    { value: 'very_high', label: 'Sehr hoch (30+ Beiträge/Monat)' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'quartalsweise', label: 'Quartalsweise' },
    { value: 'laufend', label: 'Laufend' },
  ];

  const handleInputChange = (field: keyof ContentMarketingData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.targetAudience &&
      formData.industry &&
      formData.contentVolume &&
      formData.frequency &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.targetAudience &&
      formData.industry &&
      formData.contentVolume &&
      formData.frequency &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Content-Marketing Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art des Contents"
            />
          </FormField>

          <FormField label="Zielgruppe" required>
            <FormSelect
              value={formData.targetAudience || ''}
              onChange={value => handleInputChange('targetAudience', value)}
              options={targetAudienceOptions}
              placeholder="Wählen Sie Ihre Zielgruppe"
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

          <FormField label="Content-Volumen" required>
            <FormSelect
              value={formData.contentVolume || ''}
              onChange={value => handleInputChange('contentVolume', value)}
              options={contentVolumeOptions}
              placeholder="Wie viel Content benötigen Sie?"
            />
          </FormField>

          <FormField label="Häufigkeit" required>
            <FormSelect
              value={formData.frequency || ''}
              onChange={value => handleInputChange('frequency', value)}
              options={frequencyOptions}
              placeholder="Wie oft benötigen Sie Content?"
            />
          </FormField>

          <FormField label="Projektzeitraum">
            <FormInput
              type="text"
              value={formData.projectDuration || ''}
              onChange={value => handleInputChange('projectDuration', value)}
              placeholder="z.B. 3 Monate, 1 Jahr"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihr Content-Marketing Projekt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Content-Ziele">
            <FormTextarea
              value={formData.contentGoals || ''}
              onChange={value => handleInputChange('contentGoals', value)}
              placeholder="Was möchten Sie mit dem Content erreichen?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bestehende Content-Strategie">
            <FormRadioGroup
              name="existingStrategy"
              value={formData.existingStrategy || ''}
              onChange={value => handleInputChange('existingStrategy', value)}
              options={[
                { value: 'ja', label: 'Ja, wir haben bereits eine Content-Strategie' },
                { value: 'teilweise', label: 'Teilweise, aber sie muss überarbeitet werden' },
                { value: 'nein', label: 'Nein, wir beginnen von Grund auf' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Budget-Rahmen">
            <FormInput
              type="text"
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              placeholder="z.B. 1.000-5.000 EUR/Monat"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="SEO-Optimierung, bestimmte Keywords, Corporate Design etc."
              rows={3}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Content Marketing" formData={formData} />
    </div>
  );
};

export default ContentMarketingForm;
