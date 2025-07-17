import React, { useState, useEffect } from 'react';
import { MarketingberaterData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormTextarea,
  FormInput,
  FormRadioGroup,
  FormCheckboxGroup,
} from './FormComponents';

interface MarketingberaterFormProps {
  data: MarketingberaterData;
  onDataChange: (data: MarketingberaterData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const MarketingberaterForm: React.FC<MarketingberaterFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<MarketingberaterData>(data);

  const serviceTypeOptions = [
    { value: 'seo', label: 'SEO (Suchmaschinenoptimierung)' },
    { value: 'sea', label: 'SEA (Google Ads)' },
    { value: 'social_media_marketing', label: 'Social Media Marketing' },
    { value: 'content_marketing', label: 'Content Marketing' },
    { value: 'email_marketing', label: 'E-Mail Marketing' },
    { value: 'influencer_marketing', label: 'Influencer Marketing' },
    { value: 'online_marketing_strategie', label: 'Online Marketing Strategie' },
    { value: 'conversion_optimierung', label: 'Conversion Optimierung' },
    { value: 'marketing_automation', label: 'Marketing Automation' },
    { value: 'andere', label: 'Andere' },
  ];

  const businessTypeOptions = [
    { value: 'b2b', label: 'B2B (Business-to-Business)' },
    { value: 'b2c', label: 'B2C (Business-to-Consumer)' },
    { value: 'e_commerce', label: 'E-Commerce' },
    { value: 'dienstleistung', label: 'Dienstleistung' },
    { value: 'startup', label: 'Startup' },
    { value: 'lokales_geschäft', label: 'Lokales Geschäft' },
  ];

  const industryOptions = [
    { value: 'technologie', label: 'Technologie' },
    { value: 'e_commerce', label: 'E-Commerce' },
    { value: 'gesundheit', label: 'Gesundheit' },
    { value: 'bildung', label: 'Bildung' },
    { value: 'immobilien', label: 'Immobilien' },
    { value: 'gastronomie', label: 'Gastronomie' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'mode', label: 'Mode' },
    { value: 'automobil', label: 'Automobil' },
    { value: 'finanzdienstleistungen', label: 'Finanzdienstleistungen' },
    { value: 'andere', label: 'Andere' },
  ];

  const budgetRangeOptions = [
    { value: 'unter_1000', label: 'Unter 1.000€' },
    { value: '1000_5000', label: '1.000€ - 5.000€' },
    { value: '5000_10000', label: '5.000€ - 10.000€' },
    { value: '10000_25000', label: '10.000€ - 25.000€' },
    { value: 'über_25000', label: 'Über 25.000€' },
  ];

  const zeitrahmenOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: '1_monat', label: 'Innerhalb 1 Monat' },
    { value: '3_monate', label: 'Innerhalb 3 Monate' },
    { value: '6_monate', label: 'Innerhalb 6 Monate' },
    { value: 'langfristig', label: 'Langfristige Zusammenarbeit' },
  ];

  const marketingGoalOptions = [
    { value: 'markenbekanntheit', label: 'Markenbekanntheit' },
    { value: 'lead_generation', label: 'Lead-Generierung' },
    { value: 'umsatzsteigerung', label: 'Umsatzsteigerung' },
    { value: 'website_traffic', label: 'Website-Traffic' },
    { value: 'conversion_rate', label: 'Conversion-Rate' },
    { value: 'kundenbindung', label: 'Kundenbindung' },
    { value: 'marktdurchdringung', label: 'Marktdurchdringung' },
    { value: 'wettbewerbsvorteil', label: 'Wettbewerbsvorteil' },
  ];

  const plattformOptions = [
    { value: 'google_ads', label: 'Google Ads' },
    { value: 'facebook_ads', label: 'Facebook Ads' },
    { value: 'instagram_ads', label: 'Instagram Ads' },
    { value: 'linkedin_ads', label: 'LinkedIn Ads' },
    { value: 'twitter_ads', label: 'Twitter Ads' },
    { value: 'youtube_ads', label: 'YouTube Ads' },
    { value: 'tiktok_ads', label: 'TikTok Ads' },
    { value: 'pinterest_ads', label: 'Pinterest Ads' },
    { value: 'xing_ads', label: 'XING Ads' },
  ];

  const analyticsOptions = [
    { value: 'google_analytics', label: 'Google Analytics' },
    { value: 'google_tag_manager', label: 'Google Tag Manager' },
    { value: 'facebook_pixel', label: 'Facebook Pixel' },
    { value: 'hotjar', label: 'Hotjar' },
    { value: 'mixpanel', label: 'Mixpanel' },
    { value: 'adobe_analytics', label: 'Adobe Analytics' },
    { value: 'custom_tracking', label: 'Custom Tracking' },
  ];

  const additionalServicesOptions = [
    { value: 'strategie_entwicklung', label: 'Strategie-Entwicklung' },
    { value: 'konkurrenzanalyse', label: 'Konkurrenzanalyse' },
    { value: 'zielgruppenanalyse', label: 'Zielgruppenanalyse' },
    { value: 'creative_design', label: 'Creative Design' },
    { value: 'copywriting', label: 'Copywriting' },
    { value: 'video_produktion', label: 'Video-Produktion' },
    { value: 'landing_page_design', label: 'Landing Page Design' },
    { value: 'reporting_analytics', label: 'Reporting & Analytics' },
    { value: 'schulung_beratung', label: 'Schulung & Beratung' },
  ];

  const handleInputChange = (field: keyof MarketingberaterData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.businessType &&
      formData.industry &&
      formData.budgetRange &&
      formData.zeitrahmen &&
      formData.description
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

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
              value={formData.zeitrahmen || ''}
              onChange={value => handleInputChange('zeitrahmen', value)}
              options={zeitrahmenOptions}
              placeholder="Wählen Sie den Zeitrahmen"
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

          <FormField label="Website">
            <FormInput
              type="text"
              value={formData.website || ''}
              onChange={value => handleInputChange('website', value)}
              placeholder="Ihre Website-URL"
            />
          </FormField>

          <FormField label="Aktueller monatlicher Traffic">
            <FormInput
              type="text"
              value={formData.currentTraffic || ''}
              onChange={value => handleInputChange('currentTraffic', value)}
              placeholder="Besucher pro Monat"
            />
          </FormField>

          <FormField label="Ziel-Traffic">
            <FormInput
              type="text"
              value={formData.targetTraffic || ''}
              onChange={value => handleInputChange('targetTraffic', value)}
              placeholder="Gewünschte Besucher pro Monat"
            />
          </FormField>

          <FormField label="Aktuelle Conversion-Rate">
            <FormInput
              type="text"
              value={formData.currentConversionRate || ''}
              onChange={value => handleInputChange('currentConversionRate', value)}
              placeholder="Conversion-Rate in %"
            />
          </FormField>

          <FormField label="Ziel-Conversion-Rate">
            <FormInput
              type="text"
              value={formData.targetConversionRate || ''}
              onChange={value => handleInputChange('targetConversionRate', value)}
              placeholder="Gewünschte Conversion-Rate in %"
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
        </div>

        <div className="mt-6">
          <FormField label="Marketing-Ziele" required>
            <FormCheckboxGroup
              value={formData.marketingGoals || []}
              onChange={value => handleInputChange('marketingGoals', value)}
              options={marketingGoalOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gewünschte Plattformen">
            <FormCheckboxGroup
              value={formData.platforms || []}
              onChange={value => handleInputChange('platforms', value)}
              options={plattformOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Analytics & Tracking">
            <FormCheckboxGroup
              value={formData.analytics || []}
              onChange={value => handleInputChange('analytics', value)}
              options={analyticsOptions}
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

        <div className="mt-6 space-y-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.description || ''}
              onChange={value => handleInputChange('description', value)}
              placeholder="Beschreiben Sie Ihr Online Marketing-Projekt detailliert"
              rows={4}
            />
          </FormField>

          <FormField label="Zielgruppe">
            <FormTextarea
              value={formData.targetAudience || ''}
              onChange={value => handleInputChange('targetAudience', value)}
              placeholder="Beschreiben Sie Ihre Zielgruppe (Alter, Geschlecht, Interessen, etc.)"
              rows={3}
            />
          </FormField>

          <FormField label="Aktuelle Marketing-Aktivitäten">
            <FormTextarea
              value={formData.currentMarketing || ''}
              onChange={value => handleInputChange('currentMarketing', value)}
              placeholder="Welche Marketing-Aktivitäten führen Sie bereits durch?"
              rows={3}
            />
          </FormField>

          <FormField label="Wettbewerber">
            <FormTextarea
              value={formData.competitors || ''}
              onChange={value => handleInputChange('competitors', value)}
              placeholder="Nennen Sie Ihre wichtigsten Konkurrenten"
              rows={3}
            />
          </FormField>

          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Spezielle Anforderungen oder Einschränkungen"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default MarketingberaterForm;
