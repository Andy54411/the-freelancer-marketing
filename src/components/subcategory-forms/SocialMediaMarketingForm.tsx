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
} from './FormComponents';
import { useRouter } from 'next/navigation';

interface SocialMediaMarketingFormProps {
  data: SocialMediaMarketingData;
  onDataChange: (data: SocialMediaMarketingData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SocialMediaMarketingForm: React.FC<SocialMediaMarketingFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<SocialMediaMarketingData>(data);
  const router = useRouter();
    return (
      <div className="space-y-6 mt-8">
        {!isValid && (
          <div className="text-center">
            <div className="inline-flex items-center py-3 px-5 bg-gradient-to-r from-teal-50 to-cyan-50 border border-[#14ad9f]/20 rounded-xl shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-3 text-[#14ad9f]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-gray-700 font-medium">
                Bitte füllen Sie alle Pflichtfelder aus, um fortzufahren.
              </span>
            </div>
          </div>
        )}
        {isValid && (
          <div className="text-center">
            <button
              className="bg-[#14ad9f] hover:bg-teal-700 text-white font-medium py-3 px-6 rounded-lg shadow transition-colors duration-200"
              onClick={handleNextClick}
            >
              Weiter zur Adresseingabe
            </button>
          </div>
        )}
      </div>
    );
  };

  const serviceTypeOptions = [
    { value: 'content_creation', label: 'Content-Erstellung' },
    { value: 'account_management', label: 'Account-Management' },
    { value: 'advertising', label: 'Social Media Advertising' },
    { value: 'strategy_development', label: 'Strategie-Entwicklung' },
    { value: 'community_management', label: 'Community Management' },
    { value: 'influencer_marketing', label: 'Influencer Marketing' },
    { value: 'analytics_reporting', label: 'Analytics & Reporting' },
    { value: 'crisis_management', label: 'Krisen-Management' },
  ];

  const businessTypeOptions = [
    { value: 'b2b', label: 'B2B (Business-to-Business)' },
    { value: 'b2c', label: 'B2C (Business-to-Consumer)' },
    { value: 'ecommerce', label: 'E-Commerce' },
    { value: 'local_business', label: 'Lokales Geschäft' },
    { value: 'startup', label: 'Startup' },
    { value: 'nonprofit', label: 'Non-Profit' },
    { value: 'personal_brand', label: 'Personal Brand' },
    { value: 'restaurant', label: 'Restaurant/Gastronomie' },
  ];

  const platformOptions = [
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'twitter', label: 'Twitter' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'pinterest', label: 'Pinterest' },
    { value: 'snapchat', label: 'Snapchat' },
    { value: 'xing', label: 'XING' },
    { value: 'clubhouse', label: 'Clubhouse' },
  ];

  const contentTypeOptions = [
    { value: 'images', label: 'Bilder' },
    { value: 'videos', label: 'Videos' },
    { value: 'stories', label: 'Stories' },
    { value: 'reels', label: 'Reels' },
    { value: 'live_streaming', label: 'Live-Streaming' },
    { value: 'polls', label: 'Umfragen' },
    { value: 'infographics', label: 'Infografiken' },
    { value: 'user_generated', label: 'User-Generated Content' },
    { value: 'blog_posts', label: 'Blog-Posts' },
  ];
  const frequencyOptions = [
    { value: 'daily', label: 'Täglich' },
    { value: 'multiple_daily', label: 'Mehrmals täglich' },
    { value: 'weekly', label: 'Wöchentlich' },
    { value: 'bi_weekly', label: 'Alle 2 Wochen' },
    { value: 'monthly', label: 'Monatlich' },
    { value: 'custom', label: 'Individuell' },
  ];

  const goalOptions = [
    { value: 'brand_awareness', label: 'Markenbekanntheit' },
    { value: 'lead_generation', label: 'Lead-Generierung' },
    { value: 'sales_increase', label: 'Umsatzsteigerung' },
    { value: 'engagement', label: 'Engagement' },
    { value: 'follower_growth', label: 'Follower-Wachstum' },
    { value: 'website_traffic', label: 'Website-Traffic' },
    { value: 'customer_service', label: 'Kundenservice' },
    { value: 'reputation_management', label: 'Reputation Management' },
  ];

  const targetAudienceOptions = [
    { value: 'teens', label: 'Teenager (13-19)' },
    { value: 'young_adults', label: 'Junge Erwachsene (20-30)' },
    { value: 'adults', label: 'Erwachsene (31-50)' },
    { value: 'seniors', label: 'Senioren (50+)' },
    { value: 'professionals', label: 'Berufstätige' },
    { value: 'students', label: 'Studenten' },
    { value: 'parents', label: 'Eltern' },
    { value: 'entrepreneurs', label: 'Unternehmer' },
  ];

  const additionalServicesOptions = [
    { value: 'graphic_design', label: 'Grafik-Design' },
    { value: 'video_editing', label: 'Video-Bearbeitung' },
    { value: 'photography', label: 'Fotografie' },
    { value: 'copywriting', label: 'Copywriting' },
    { value: 'hashtag_research', label: 'Hashtag-Recherche' },
    { value: 'competitor_analysis', label: 'Konkurrenzanalyse' },
    { value: 'social_listening', label: 'Social Listening' },
    { value: 'influencer_outreach', label: 'Influencer-Kontaktaufnahme' },
  ];

  const handleInputChange = (field: keyof SocialMediaMarketingData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.businessType &&
      formData.platforms &&
      formData.contentTypes &&
      formData.postingFrequency &&
      formData.goals &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.businessType &&
      formData.platforms &&
      formData.contentTypes &&
      formData.postingFrequency &&
      formData.goals &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Social Media Marketing-Projektdetails
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
          <FormField label="Posting-Frequenz" required>
            <FormSelect
              value={formData.postingFrequency || ''}
              onChange={value => handleInputChange('postingFrequency', value)}
              options={frequencyOptions}
              placeholder="Wählen Sie die Posting-Frequenz"
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

          <FormField label="Aktuelle Follower">
            <FormInput
              type="number"
              value={formData.currentFollowers?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'currentFollowers',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Aktuelle Follower-Anzahl"
            />
          </FormField>

          <FormField label="Ziel-Follower">
            <FormInput
              type="number"
              value={formData.targetFollowers?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'targetFollowers',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Gewünschte Follower-Anzahl"
            />
          </FormField>

          <FormField label="Durchschnittliches Engagement">
            <FormInput
              type="number"
              value={formData.averageEngagement?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'averageEngagement',
                  typeof value === 'string' ? (value ? parseFloat(value) : undefined) : value
                )
              }
              placeholder="Engagement-Rate in %"
            />
          </FormField>

          <FormField label="Ziel-Engagement">
            <FormInput
              type="number"
              value={formData.targetEngagement?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'targetEngagement',
                  typeof value === 'string' ? (value ? parseFloat(value) : undefined) : value
                )
              }
              placeholder="Gewünschte Engagement-Rate in %"
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

          <FormField label="Kampagnendauer">
            <FormInput
              type="text"
              value={formData.campaignDuration || ''}
              onChange={value => handleInputChange('campaignDuration', value)}
              placeholder="z.B. 3 Monate, 6 Monate, permanent"
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
          <FormField label="Content-Arten" required>
            <FormCheckboxGroup
              value={formData.contentTypes || []}
              onChange={value => handleInputChange('contentTypes', value)}
              options={contentTypeOptions}
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
          <FormField label="Zielgruppe">
            <FormCheckboxGroup
              value={formData.targetAudience || []}
              onChange={value => handleInputChange('targetAudience', value)}
              options={targetAudienceOptions}
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
              placeholder="Beschreiben Sie Ihr Social Media Marketing-Projekt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Markenidentität">
            <FormTextarea
              value={formData.brandIdentity || ''}
              onChange={value => handleInputChange('brandIdentity', value)}
              placeholder="Beschreiben Sie Ihre Markenidentität und Tonalität"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Aktuelle Social Media Aktivitäten">
            <FormTextarea
              value={formData.currentSocialMediaActivities || ''}
              onChange={value => handleInputChange('currentSocialMediaActivities', value)}
              placeholder="Welche Social Media Aktivitäten führen Sie bereits durch?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Wettbewerber">
            <FormTextarea
              value={formData.competitors || ''}
              onChange={value => handleInputChange('competitors', value)}
              placeholder="Nennen Sie Ihre wichtigsten Konkurrenten in Social Media"
              rows={2}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Spezielle Anforderungen, Content-Richtlinien oder Einschränkungen"
              rows={3}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="SocialMediaMarketing" />
    </div>
  );
}

export default SocialMediaMarketingForm;
