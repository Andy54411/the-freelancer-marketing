import React, { useState, useEffect } from 'react';
import { OnlineMarketingData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

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
    { value: 'affiliate_marketing', label: 'Affiliate Marketing' },
    { value: 'conversion_optimization', label: 'Conversion-Optimierung' },
    { value: 'marketing_automation', label: 'Marketing Automation' },
    { value: 'influencer_marketing', label: 'Influencer Marketing' },
  ];

  const businessTypeOptions = [
    { value: 'b2b', label: 'B2B (Business-to-Business)' },
    { value: 'b2c', label: 'B2C (Business-to-Consumer)' },
    { value: 'ecommerce', label: 'E-Commerce' },
    { value: 'local_business', label: 'Lokales Geschäft' },
    { value: 'startup', label: 'Startup' },
    { value: 'nonprofit', label: 'Non-Profit' },
    { value: 'saas', label: 'SaaS' },
    { value: 'service', label: 'Dienstleistung' },
  ];

  const industryOptions = [
    { value: 'technology', label: 'Technologie' },
    { value: 'healthcare', label: 'Gesundheitswesen' },
    { value: 'finance', label: 'Finanzwesen' },
    { value: 'retail', label: 'Einzelhandel' },
    { value: 'education', label: 'Bildung' },
    { value: 'real_estate', label: 'Immobilien' },
    { value: 'automotive', label: 'Automobil' },
    { value: 'food_beverage', label: 'Lebensmittel & Getränke' },
    { value: 'fashion', label: 'Mode' },
    { value: 'travel', label: 'Reisen' },
    { value: 'fitness', label: 'Fitness & Wellness' },
    { value: 'other', label: 'Andere' },
  ];

  const budgetRangeOptions = [
    { value: 'unter_1000', label: 'Unter 1.000€/Monat' },
    { value: '1000_3000', label: '1.000€ - 3.000€/Monat' },
    { value: '3000_10000', label: '3.000€ - 10.000€/Monat' },
    { value: '10000_25000', label: '10.000€ - 25.000€/Monat' },
    { value: 'über_25000', label: 'Über 25.000€/Monat' },
  ];

  const timelineOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'kurzfristig', label: 'Kurzfristig (1-3 Monate)' },
    { value: 'mittelfristig', label: 'Mittelfristig (3-6 Monate)' },
    { value: 'langfristig', label: 'Langfristig (6-12 Monate)' },
    { value: 'permanent', label: 'Permanent' },
  ];

  const goalOptions = [
    { value: 'brand_awareness', label: 'Markenbekanntheit' },
    { value: 'lead_generation', label: 'Lead-Generierung' },
    { value: 'sales_increase', label: 'Umsatzsteigerung' },
    { value: 'website_traffic', label: 'Website-Traffic' },
    { value: 'conversion_rate', label: 'Conversion-Rate' },
    { value: 'customer_retention', label: 'Kundenbindung' },
    { value: 'market_penetration', label: 'Marktdurchdringung' },
    { value: 'competitive_advantage', label: 'Wettbewerbsvorteil' },
  ];

  const platformOptions = [
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
    { value: 'strategy_development', label: 'Strategie-Entwicklung' },
    { value: 'competitor_analysis', label: 'Konkurrenzanalyse' },
    { value: 'target_audience_research', label: 'Zielgruppenanalyse' },
    { value: 'creative_design', label: 'Creative Design' },
    { value: 'copywriting', label: 'Copywriting' },
    { value: 'video_production', label: 'Video-Produktion' },
    { value: 'landing_page_design', label: 'Landing Page Design' },
    { value: 'reporting_analytics', label: 'Reporting & Analytics' },
    { value: 'training_consulting', label: 'Schulung & Beratung' },
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
      formData.budgetRange &&
      formData.timeline &&
      formData.goals &&
      formData.projectDescription
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
              value={formData.timeline || ''}
              onChange={value => handleInputChange('timeline', value)}
              options={timelineOptions}
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
              type="number"
              value={formData.currentTraffic?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'currentTraffic',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Besucher pro Monat"
            />
          </FormField>

          <FormField label="Ziel-Traffic">
            <FormInput
              type="number"
              value={formData.targetTraffic?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'targetTraffic',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Gewünschte Besucher pro Monat"
            />
          </FormField>

          <FormField label="Aktuelle Conversion-Rate">
            <FormInput
              type="number"
              value={formData.currentConversionRate?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'currentConversionRate',
                  typeof value === 'string' ? (value ? parseFloat(value) : undefined) : value
                )
              }
              placeholder="Conversion-Rate in %"
            />
          </FormField>

          <FormField label="Ziel-Conversion-Rate">
            <FormInput
              type="number"
              value={formData.targetConversionRate?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'targetConversionRate',
                  typeof value === 'string' ? (value ? parseFloat(value) : undefined) : value
                )
              }
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

        <div className="mt-4">
          <FormField label="Marketing-Ziele" required>
            <FormCheckboxGroup
              value={formData.goals || []}
              onChange={value => handleInputChange('goals', value)}
              options={goalOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gewünschte Plattformen">
            <FormCheckboxGroup
              value={formData.platforms || []}
              onChange={value => handleInputChange('platforms', value)}
              options={platformOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Analytics & Tracking">
            <FormCheckboxGroup
              value={formData.analyticsTools || []}
              onChange={value => handleInputChange('analyticsTools', value)}
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

        <div className="mt-4">
          <FormField label="Zielgruppe">
            <FormTextarea
              value={formData.targetAudience || ''}
              onChange={value => handleInputChange('targetAudience', value)}
              placeholder="Beschreiben Sie Ihre Zielgruppe (Alter, Geschlecht, Interessen, etc.)"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Aktuelle Marketing-Aktivitäten">
            <FormTextarea
              value={formData.currentMarketingActivities || ''}
              onChange={value => handleInputChange('currentMarketingActivities', value)}
              placeholder="Welche Marketing-Aktivitäten führen Sie bereits durch?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Wettbewerber">
            <FormTextarea
              value={formData.competitors || ''}
              onChange={value => handleInputChange('competitors', value)}
              placeholder="Nennen Sie Ihre wichtigsten Konkurrenten"
              rows={2}
            />
          </FormField>
        </div>

        <div className="mt-4">
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

export default OnlineMarketingForm;
