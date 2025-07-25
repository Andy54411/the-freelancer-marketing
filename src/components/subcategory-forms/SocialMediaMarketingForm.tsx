'use client';
import React, { useState, useEffect } from 'react';
import { SocialMediaMarketingData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface SocialMediaMarketingFormProps {
  data: SocialMediaMarketingData;
  onDataChange: (data: SocialMediaMarketingData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SocialMediaMarketingForm: React.FC<SocialMediaMarketingFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<SocialMediaMarketingData>(data);

  const serviceTypeOptions = [
    { value: 'strategy', label: 'Social Media Strategie' },
    { value: 'content_creation', label: 'Content Erstellung' },
    { value: 'community_management', label: 'Community Management' },
    { value: 'advertising', label: 'Social Media Werbung' },
    { value: 'analytics', label: 'Analytics & Reporting' },
    { value: 'influencer', label: 'Influencer Marketing' },
    { value: 'complete_management', label: 'Komplette Betreuung' },
    { value: 'consulting', label: 'Beratung/Schulung' },
  ];

  const platformOptions = [
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'twitter', label: 'Twitter/X' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'pinterest', label: 'Pinterest' },
    { value: 'snapchat', label: 'Snapchat' },
  ];

  const companyTypeOptions = [
    { value: 'startup', label: 'Startup' },
    { value: 'kleinunternehmen', label: 'Kleinunternehmen' },
    { value: 'mittelstand', label: 'Mittelstand' },
    { value: 'konzern', label: 'Großkonzern' },
    { value: 'nonprofit', label: 'Non-Profit' },
    { value: 'personal_brand', label: 'Personal Brand' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof SocialMediaMarketingData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.platforms &&
      formData.platforms.length > 0 &&
      formData.companyType &&
      formData.urgency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.platforms &&
      formData.platforms.length > 0 &&
      formData.companyType &&
      formData.urgency
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Social Media Marketing Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Welcher Service wird benötigt?"
            />
          </FormField>

          <FormField label="Unternehmenstyp" required>
            <FormSelect
              value={formData.companyType || ''}
              onChange={value => handleInputChange('companyType', value)}
              options={companyTypeOptions}
              placeholder="Was für ein Unternehmen ist es?"
            />
          </FormField>

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wann soll das Projekt starten?"
            />
          </FormField>

          <FormField label="Budget-Rahmen">
            <FormInput
              type="text"
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              placeholder="z.B. 1.000-3.000 EUR/Monat"
            />
          </FormField>

          <FormField label="Aktuelle Follower-Anzahl">
            <FormInput
              type="text"
              value={formData.currentFollowers || ''}
              onChange={value => handleInputChange('currentFollowers', value)}
              placeholder="z.B. 1.000 auf Instagram"
            />
          </FormField>

          <FormField label="Ziel-Follower in 6 Monaten">
            <FormInput
              type="text"
              value={formData.targetFollowers || ''}
              onChange={value => handleInputChange('targetFollowers', value)}
              placeholder="z.B. 10.000"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gewünschte Plattformen" required>
            <FormCheckboxGroup
              value={formData.platforms || []}
              onChange={value => handleInputChange('platforms', value)}
              options={platformOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zielgruppe">
            <FormTextarea
              value={formData.targetAudience || ''}
              onChange={value => handleInputChange('targetAudience', value)}
              placeholder="Beschreiben Sie Ihre Zielgruppe (Alter, Interessen, etc.)"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Marketing-Ziele">
            <FormCheckboxGroup
              value={formData.marketingGoals || []}
              onChange={value => handleInputChange('marketingGoals', value)}
              options={[
                { value: 'awareness', label: 'Markenbekanntheit steigern' },
                { value: 'followers', label: 'Follower-Wachstum' },
                { value: 'engagement', label: 'Engagement erhöhen' },
                { value: 'leads', label: 'Leads generieren' },
                { value: 'sales', label: 'Verkäufe steigern' },
                { value: 'website_traffic', label: 'Website-Traffic' },
                { value: 'community', label: 'Community aufbauen' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Content-Präferenzen">
            <FormCheckboxGroup
              value={formData.contentPreferences || []}
              onChange={value => handleInputChange('contentPreferences', value)}
              options={[
                { value: 'posts', label: 'Social Media Posts' },
                { value: 'stories', label: 'Stories' },
                { value: 'videos', label: 'Videos' },
                { value: 'reels', label: 'Reels/TikToks' },
                { value: 'graphics', label: 'Grafiken/Designs' },
                { value: 'photography', label: 'Fotografie' },
                { value: 'blogs', label: 'Blog-Artikel' },
                { value: 'livestreams', label: 'Livestreams' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung">
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihr Social Media Marketing Projekt..."
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Posting-Frequenz gewünscht">
            <FormRadioGroup
              name="postingFrequency"
              value={formData.postingFrequency || ''}
              onChange={value => handleInputChange('postingFrequency', value)}
              options={[
                { value: 'daily', label: 'Täglich' },
                { value: 'few_times_week', label: 'Mehrmals pro Woche' },
                { value: 'weekly', label: 'Wöchentlich' },
                { value: 'flexible', label: 'Flexibel' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Branche/Industrie">
            <FormInput
              type="text"
              value={formData.industry || ''}
              onChange={value => handleInputChange('industry', value)}
              placeholder="z.B. Mode, Technologie, Gastronomie"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Werbeanzeigen gewünscht">
            <FormRadioGroup
              name="paidAdvertising"
              value={formData.paidAdvertising || ''}
              onChange={value => handleInputChange('paidAdvertising', value)}
              options={[
                { value: 'ja', label: 'Ja, bezahlte Werbung gewünscht' },
                { value: 'nein', label: 'Nein, nur organisch' },
                { value: 'später', label: 'Später möglich' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Social Media Marketing" formData={formData} />
    </div>
  );
};

export default SocialMediaMarketingForm;
