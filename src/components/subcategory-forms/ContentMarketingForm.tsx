import React, { useState, useEffect } from 'react';
import { ContentMarketingData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface ContentMarketingFormProps {
  data: ContentMarketingData;
  onDataChange: (data: ContentMarketingData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const ContentMarketingForm: React.FC<ContentMarketingFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<ContentMarketingData>(data);

  const serviceTypeOptions = [
    { value: 'content_strategy', label: 'Content-Strategie' },
    { value: 'content_creation', label: 'Content-Erstellung' },
    { value: 'copywriting', label: 'Copywriting' },
    { value: 'blog_writing', label: 'Blog-Artikel' },
    { value: 'seo_content', label: 'SEO-Content' },
    { value: 'social_media_content', label: 'Social Media Content' },
    { value: 'email_content', label: 'E-Mail Content' },
    { value: 'video_content', label: 'Video-Content' },
    { value: 'infographics', label: 'Infografiken' },
    { value: 'whitepapers', label: 'Whitepapers' },
    { value: 'case_studies', label: 'Case Studies' },
    { value: 'ebooks', label: 'E-Books' },
  ];

  const contentTypeOptions = [
    { value: 'blog_posts', label: 'Blog-Posts' },
    { value: 'articles', label: 'Artikel' },
    { value: 'web_copy', label: 'Website-Texte' },
    { value: 'product_descriptions', label: 'Produktbeschreibungen' },
    { value: 'press_releases', label: 'Pressemitteilungen' },
    { value: 'newsletters', label: 'Newsletter' },
    { value: 'social_posts', label: 'Social Media Posts' },
    { value: 'video_scripts', label: 'Video-Skripte' },
    { value: 'podcast_content', label: 'Podcast-Content' },
    { value: 'landing_pages', label: 'Landing Pages' },
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
    { value: 'b2b_services', label: 'B2B-Dienstleistungen' },
  ];

  const toneOptions = [
    { value: 'professional', label: 'Professionell' },
    { value: 'casual', label: 'Locker' },
    { value: 'friendly', label: 'Freundlich' },
    { value: 'authoritative', label: 'Autoritativ' },
    { value: 'conversational', label: 'Gesprächig' },
    { value: 'humorous', label: 'Humorvoll' },
    { value: 'inspirational', label: 'Inspirierend' },
    { value: 'educational', label: 'Lehrreich' },
  ];
  const frequencyOptions = [
    { value: 'daily', label: 'Täglich' },
    { value: 'weekly', label: 'Wöchentlich' },
    { value: 'bi_weekly', label: 'Alle 2 Wochen' },
    { value: 'monthly', label: 'Monatlich' },
    { value: 'quarterly', label: 'Vierteljährlich' },
    { value: 'project_based', label: 'Projektbasiert' },
  ];

  const goalOptions = [
    { value: 'brand_awareness', label: 'Markenbekanntheit' },
    { value: 'lead_generation', label: 'Lead-Generierung' },
    { value: 'seo_improvement', label: 'SEO-Verbesserung' },
    { value: 'thought_leadership', label: 'Thought Leadership' },
    { value: 'customer_education', label: 'Kundenbildung' },
    { value: 'engagement', label: 'Engagement' },
    { value: 'conversion', label: 'Conversion' },
    { value: 'retention', label: 'Kundenbindung' },
  ];

  const languageOptions = [
    { value: 'deutsch', label: 'Deutsch' },
    { value: 'englisch', label: 'Englisch' },
    { value: 'französisch', label: 'Französisch' },
    { value: 'spanisch', label: 'Spanisch' },
    { value: 'italienisch', label: 'Italienisch' },
    { value: 'niederländisch', label: 'Niederländisch' },
    { value: 'polnisch', label: 'Polnisch' },
    { value: 'russisch', label: 'Russisch' },
  ];

  const additionalServicesOptions = [
    { value: 'seo_optimization', label: 'SEO-Optimierung' },
    { value: 'keyword_research', label: 'Keyword-Recherche' },
    { value: 'competitor_analysis', label: 'Konkurrenzanalyse' },
    { value: 'content_calendar', label: 'Content-Kalender' },
    { value: 'performance_tracking', label: 'Performance-Tracking' },
    { value: 'content_distribution', label: 'Content-Distribution' },
    { value: 'editing_proofreading', label: 'Lektorat & Korrektur' },
    { value: 'translation', label: 'Übersetzung' },
    { value: 'graphic_design', label: 'Grafik-Design' },
    { value: 'video_production', label: 'Video-Produktion' },
  ];

  const handleInputChange = (field: keyof ContentMarketingData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.contentTypes &&
      formData.industry &&
      formData.tone &&
      formData.frequency &&
      formData.goals &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Content Marketing-Projektdetails
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

          <FormField label="Branche" required>
            <FormSelect
              value={formData.industry || ''}
              onChange={value => handleInputChange('industry', value)}
              options={industryOptions}
              placeholder="Wählen Sie Ihre Branche"
            />
          </FormField>

          <FormField label="Tonalität" required>
            <FormSelect
              value={formData.tone || ''}
              onChange={value => handleInputChange('tone', value)}
              options={toneOptions}
              placeholder="Wählen Sie die gewünschte Tonalität"
            />
          </FormField>
          <FormField label="Häufigkeit" required>
            <FormSelect
              value={formData.frequency || ''}
              onChange={value => handleInputChange('frequency', value)}
              options={frequencyOptions}
              placeholder="Wählen Sie die Häufigkeit"
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

          <FormField label="Wörter pro Artikel">
            <FormInput
              type="number"
              value={formData.wordsPerArticle?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'wordsPerArticle',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Durchschnittliche Wörter pro Artikel"
            />
          </FormField>

          <FormField label="Artikel pro Monat">
            <FormInput
              type="number"
              value={formData.articlesPerMonth?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'articlesPerMonth',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Gewünschte Artikel pro Monat"
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

          <FormField label="Projektdauer">
            <FormInput
              type="text"
              value={formData.projectDuration || ''}
              onChange={value => handleInputChange('projectDuration', value)}
              placeholder="z.B. 6 Monate, 1 Jahr, permanent"
            />
          </FormField>

          <FormField label="Revision-Runden">
            <FormInput
              type="number"
              value={formData.revisionRounds?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'revisionRounds',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Revision-Runden"
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
          <FormField label="Sprachen">
            <FormCheckboxGroup
              value={formData.languages || []}
              onChange={value => handleInputChange('languages', value)}
              options={languageOptions}
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
              placeholder="Beschreiben Sie Ihr Content Marketing-Projekt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zielgruppe">
            <FormTextarea
              value={formData.targetAudience || ''}
              onChange={value => handleInputChange('targetAudience', value)}
              placeholder="Beschreiben Sie Ihre Zielgruppe detailliert"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Themen und Keywords">
            <FormTextarea
              value={formData.topicsAndKeywords || ''}
              onChange={value => handleInputChange('topicsAndKeywords', value)}
              placeholder="Welche Themen und Keywords sollen behandelt werden?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Markenrichtlinien">
            <FormTextarea
              value={formData.brandGuidelines || ''}
              onChange={value => handleInputChange('brandGuidelines', value)}
              placeholder="Beschreiben Sie Ihre Markenrichtlinien und Stil-Vorgaben"
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
              placeholder="Spezielle Anforderungen, Stil-Vorgaben oder Einschränkungen"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default ContentMarketingForm;
