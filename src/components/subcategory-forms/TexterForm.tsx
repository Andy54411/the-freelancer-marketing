import React, { useState, useEffect } from 'react';
import { TexterData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface TexterFormProps {
  data: TexterData;
  onDataChange: (data: TexterData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const TexterForm: React.FC<TexterFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<TexterData>(data);

  const serviceTypeOptions = [
    { value: 'content_writing', label: 'Content Writing' },
    { value: 'copywriting', label: 'Copywriting' },
    { value: 'seo_texte', label: 'SEO-Texte' },
    { value: 'blog_artikel', label: 'Blog-Artikel' },
    { value: 'website_texte', label: 'Website-Texte' },
    { value: 'produktbeschreibungen', label: 'Produktbeschreibungen' },
    { value: 'marketing_texte', label: 'Marketing-Texte' },
    { value: 'werbetexte', label: 'Werbetexte' },
    { value: 'social_media_texte', label: 'Social Media Texte' },
    { value: 'newsletter', label: 'Newsletter' },
    { value: 'pressemitteilungen', label: 'Pressemitteilungen' },
    { value: 'fachartikel', label: 'Fachartikel' },
    { value: 'ratgeber', label: 'Ratgeber' },
    { value: 'whitepaper', label: 'Whitepaper' },
    { value: 'case_studies', label: 'Case Studies' },
    { value: 'ebooks', label: 'E-Books' },
    { value: 'scripts', label: 'Scripts' },
    { value: 'reden', label: 'Reden' },
    { value: 'ghostwriting', label: 'Ghostwriting' },
    { value: 'lektorat', label: 'Lektorat' },
    { value: 'korrektorat', label: 'Korrektorat' },
    { value: 'andere', label: 'Andere' },
  ];

  const contentTypeOptions = [
    { value: 'informativ', label: 'Informativ' },
    { value: 'werbend', label: 'Werbend' },
    { value: 'unterhaltsam', label: 'Unterhaltsam' },
    { value: 'bildend', label: 'Bildend' },
    { value: 'persuasiv', label: 'Persuasiv' },
    { value: 'emotional', label: 'Emotional' },
    { value: 'technisch', label: 'Technisch' },
    { value: 'wissenschaftlich', label: 'Wissenschaftlich' },
    { value: 'journalistisch', label: 'Journalistisch' },
    { value: 'kreativ', label: 'Kreativ' },
    { value: 'sachlich', label: 'Sachlich' },
    { value: 'persönlich', label: 'Persönlich' },
    { value: 'andere', label: 'Andere' },
  ];

  const budgetRangeOptions = [
    { value: 'unter_100', label: 'Unter 100€' },
    { value: '100_500', label: '100€ - 500€' },
    { value: '500_1000', label: '500€ - 1000€' },
    { value: '1000_2500', label: '1000€ - 2500€' },
    { value: '2500_5000', label: '2500€ - 5000€' },
    { value: 'über_5000', label: 'Über 5000€' },
  ];

  const urgencyOptions = [
    { value: 'nicht_eilig', label: 'Nicht eilig' },
    { value: 'normal', label: 'Normal' },
    { value: 'eilig', label: 'Eilig' },
    { value: 'sehr_eilig', label: 'Sehr eilig' },
  ];

  const wordCountOptions = [
    { value: 'unter_500', label: 'Unter 500 Wörter' },
    { value: '500_1000', label: '500 - 1000 Wörter' },
    { value: '1000_2500', label: '1000 - 2500 Wörter' },
    { value: '2500_5000', label: '2500 - 5000 Wörter' },
    { value: '5000_10000', label: '5000 - 10000 Wörter' },
    { value: 'über_10000', label: 'Über 10000 Wörter' },
  ];

  const toneOptions = [
    { value: 'professionell', label: 'Professionell' },
    { value: 'freundlich', label: 'Freundlich' },
    { value: 'locker', label: 'Locker' },
    { value: 'förmlich', label: 'Förmlich' },
    { value: 'humorvoll', label: 'Humorvoll' },
    { value: 'sachlich', label: 'Sachlich' },
    { value: 'emotional', label: 'Emotional' },
    { value: 'persuasiv', label: 'Persuasiv' },
    { value: 'inspirierend', label: 'Inspirierend' },
    { value: 'vertrauenswürdig', label: 'Vertrauenswürdig' },
    { value: 'andere', label: 'Andere' },
  ];

  const targetAudienceOptions = [
    { value: 'b2b', label: 'B2B' },
    { value: 'b2c', label: 'B2C' },
    { value: 'fachpublikum', label: 'Fachpublikum' },
    { value: 'allgemeinpublikum', label: 'Allgemeinpublikum' },
    { value: 'jugendliche', label: 'Jugendliche' },
    { value: 'erwachsene', label: 'Erwachsene' },
    { value: 'senioren', label: 'Senioren' },
    { value: 'männlich', label: 'Männlich' },
    { value: 'weiblich', label: 'Weiblich' },
    { value: 'divers', label: 'Divers' },
    { value: 'andere', label: 'Andere' },
  ];

  const industryOptions = [
    { value: 'technologie', label: 'Technologie' },
    { value: 'medizin', label: 'Medizin' },
    { value: 'finanzen', label: 'Finanzen' },
    { value: 'immobilien', label: 'Immobilien' },
    { value: 'automobil', label: 'Automobil' },
    { value: 'mode', label: 'Mode' },
    { value: 'beauty', label: 'Beauty' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'reise', label: 'Reise' },
    { value: 'gastronomie', label: 'Gastronomie' },
    { value: 'bildung', label: 'Bildung' },
    { value: 'unterhaltung', label: 'Unterhaltung' },
    { value: 'sport', label: 'Sport' },
    { value: 'kunst', label: 'Kunst' },
    { value: 'musik', label: 'Musik' },
    { value: 'literatur', label: 'Literatur' },
    { value: 'umwelt', label: 'Umwelt' },
    { value: 'energie', label: 'Energie' },
    { value: 'landwirtschaft', label: 'Landwirtschaft' },
    { value: 'handel', label: 'Handel' },
    { value: 'andere', label: 'Andere' },
  ];

  const platformOptions = [
    { value: 'website', label: 'Website' },
    { value: 'blog', label: 'Blog' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'twitter', label: 'Twitter' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'pinterest', label: 'Pinterest' },
    { value: 'email', label: 'E-Mail' },
    { value: 'newsletter', label: 'Newsletter' },
    { value: 'print', label: 'Print' },
    { value: 'magazin', label: 'Magazin' },
    { value: 'zeitung', label: 'Zeitung' },
    { value: 'broschüre', label: 'Broschüre' },
    { value: 'flyer', label: 'Flyer' },
    { value: 'katalog', label: 'Katalog' },
    { value: 'andere', label: 'Andere' },
  ];

  const formatOptions = [
    { value: 'artikel', label: 'Artikel' },
    { value: 'liste', label: 'Liste' },
    { value: 'anleitung', label: 'Anleitung' },
    { value: 'interview', label: 'Interview' },
    { value: 'bericht', label: 'Bericht' },
    { value: 'rezension', label: 'Rezension' },
    { value: 'kommentar', label: 'Kommentar' },
    { value: 'meinung', label: 'Meinung' },
    { value: 'nachrichten', label: 'Nachrichten' },
    { value: 'pressemitteilung', label: 'Pressemitteilung' },
    { value: 'produktbeschreibung', label: 'Produktbeschreibung' },
    { value: 'landing_page', label: 'Landing Page' },
    { value: 'sales_page', label: 'Sales Page' },
    { value: 'about_page', label: 'About Page' },
    { value: 'faq', label: 'FAQ' },
    { value: 'agb', label: 'AGB' },
    { value: 'datenschutz', label: 'Datenschutz' },
    { value: 'impressum', label: 'Impressum' },
    { value: 'andere', label: 'Andere' },
  ];

  const additionalServicesOptions = [
    { value: 'keyword_recherche', label: 'Keyword-Recherche' },
    { value: 'seo_optimierung', label: 'SEO-Optimierung' },
    { value: 'content_strategie', label: 'Content-Strategie' },
    { value: 'content_planung', label: 'Content-Planung' },
    { value: 'redaktionsplan', label: 'Redaktionsplan' },
    { value: 'recherche', label: 'Recherche' },
    { value: 'fact_checking', label: 'Fact-Checking' },
    { value: 'lektorat', label: 'Lektorat' },
    { value: 'korrektorat', label: 'Korrektorat' },
    { value: 'proofreading', label: 'Proofreading' },
    { value: 'stilberatung', label: 'Stilberatung' },
    { value: 'zielgruppen_analyse', label: 'Zielgruppen-Analyse' },
    { value: 'konkurrenz_analyse', label: 'Konkurrenz-Analyse' },
    { value: 'content_audit', label: 'Content-Audit' },
    { value: 'content_update', label: 'Content-Update' },
    { value: 'content_migration', label: 'Content-Migration' },
    { value: 'headline_testing', label: 'Headline-Testing' },
    { value: 'a_b_testing', label: 'A/B-Testing' },
    { value: 'performance_analyse', label: 'Performance-Analyse' },
    { value: 'content_metriken', label: 'Content-Metriken' },
    { value: 'social_media_posts', label: 'Social Media Posts' },
    { value: 'hashtag_recherche', label: 'Hashtag-Recherche' },
    { value: 'community_management', label: 'Community Management' },
    { value: 'influencer_texte', label: 'Influencer-Texte' },
    { value: 'video_scripts', label: 'Video-Scripts' },
    { value: 'podcast_scripts', label: 'Podcast-Scripts' },
    { value: 'webinar_inhalte', label: 'Webinar-Inhalte' },
    { value: 'präsentationen', label: 'Präsentationen' },
    { value: 'pitch_decks', label: 'Pitch Decks' },
    { value: 'business_pläne', label: 'Business-Pläne' },
    { value: 'jahresberichte', label: 'Jahresberichte' },
    { value: 'nachhaltigkeitsberichte', label: 'Nachhaltigkeitsberichte' },
    { value: 'case_studies', label: 'Case Studies' },
    { value: 'testimonials', label: 'Testimonials' },
    { value: 'user_stories', label: 'User Stories' },
    { value: 'personas', label: 'Personas' },
    { value: 'buyer_journey', label: 'Buyer Journey' },
    { value: 'content_mapping', label: 'Content-Mapping' },
    { value: 'editorial_guidelines', label: 'Editorial Guidelines' },
    { value: 'style_guide', label: 'Style Guide' },
    { value: 'brand_voice', label: 'Brand Voice' },
    { value: 'tone_of_voice', label: 'Tone of Voice' },
    { value: 'storytelling', label: 'Storytelling' },
    { value: 'brand_storytelling', label: 'Brand Storytelling' },
    { value: 'narrative_entwicklung', label: 'Narrative-Entwicklung' },
    { value: 'content_personalisierung', label: 'Content-Personalisierung' },
    { value: 'multilingual_content', label: 'Multilingual Content' },
    { value: 'lokalisierung', label: 'Lokalisierung' },
    { value: 'transkription', label: 'Transkription' },
    { value: 'untertitel', label: 'Untertitel' },
    { value: 'voice_over_scripts', label: 'Voice-Over Scripts' },
    { value: 'andere', label: 'Andere' },
  ];

  const handleInputChange = (field: keyof TexterData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.contentType &&
      formData.budgetRange &&
      formData.urgency &&
      formData.wordCount &&
      formData.tone &&
      formData.targetAudience &&
      formData.description
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Texter-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art des Textes" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art des Textes"
            />
          </FormField>

          <FormField label="Content-Typ" required>
            <FormSelect
              value={formData.contentType || ''}
              onChange={value => handleInputChange('contentType', value)}
              options={contentTypeOptions}
              placeholder="Wählen Sie den Content-Typ"
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

          <FormField label="Wortanzahl" required>
            <FormSelect
              value={formData.wordCount || ''}
              onChange={value => handleInputChange('wordCount', value)}
              options={wordCountOptions}
              placeholder="Wählen Sie die Wortanzahl"
            />
          </FormField>

          <FormField label="Ton/Stil" required>
            <FormSelect
              value={formData.tone || ''}
              onChange={value => handleInputChange('tone', value)}
              options={toneOptions}
              placeholder="Wählen Sie den Ton/Stil"
            />
          </FormField>

          <FormField label="Zielgruppe" required>
            <FormSelect
              value={formData.targetAudience || ''}
              onChange={value => handleInputChange('targetAudience', value)}
              options={targetAudienceOptions}
              placeholder="Wählen Sie die Zielgruppe"
            />
          </FormField>

          <FormField label="Branche">
            <FormSelect
              value={formData.industry || ''}
              onChange={value => handleInputChange('industry', value)}
              options={industryOptions}
              placeholder="Wählen Sie die Branche"
            />
          </FormField>

          <FormField label="Plattform">
            <FormSelect
              value={formData.platform || ''}
              onChange={value => handleInputChange('platform', value)}
              options={platformOptions}
              placeholder="Wählen Sie die Plattform"
            />
          </FormField>

          <FormField label="Format">
            <FormSelect
              value={formData.format || ''}
              onChange={value => handleInputChange('format', value)}
              options={formatOptions}
              placeholder="Wählen Sie das Format"
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

          <FormField label="Website">
            <FormInput
              type="text"
              value={formData.website || ''}
              onChange={value => handleInputChange('website', value)}
              placeholder="Website-URL"
            />
          </FormField>

          <FormField label="Konkurrenz">
            <FormInput
              type="text"
              value={formData.competitors || ''}
              onChange={value => handleInputChange('competitors', value)}
              placeholder="Konkurrenz-Websites"
            />
          </FormField>

          <FormField label="Keywords">
            <FormInput
              type="text"
              value={formData.keywords || ''}
              onChange={value => handleInputChange('keywords', value)}
              placeholder="Wichtige Keywords"
            />
          </FormField>

          <FormField label="Sprache">
            <FormInput
              type="text"
              value={formData.language || ''}
              onChange={value => handleInputChange('language', value)}
              placeholder="Sprache (z.B. Deutsch, Englisch)"
            />
          </FormField>

          <FormField label="Regionalität">
            <FormInput
              type="text"
              value={formData.regionality || ''}
              onChange={value => handleInputChange('regionality', value)}
              placeholder="Regionalität (z.B. Deutschland, Österreich)"
            />
          </FormField>

          <FormField label="Call-to-Action">
            <FormInput
              type="text"
              value={formData.callToAction || ''}
              onChange={value => handleInputChange('callToAction', value)}
              placeholder="Gewünschte Call-to-Action"
            />
          </FormField>

          <FormField label="Referenzen">
            <FormInput
              type="text"
              value={formData.references || ''}
              onChange={value => handleInputChange('references', value)}
              placeholder="Referenz-Texte oder -Websites"
            />
          </FormField>

          <FormField label="Stil-Referenzen">
            <FormInput
              type="text"
              value={formData.styleReferences || ''}
              onChange={value => handleInputChange('styleReferences', value)}
              placeholder="Stil-Referenzen"
            />
          </FormField>

          <FormField label="Zielkeywords">
            <FormInput
              type="text"
              value={formData.targetKeywords || ''}
              onChange={value => handleInputChange('targetKeywords', value)}
              placeholder="Zielkeywords für SEO"
            />
          </FormField>

          <FormField label="Meta-Beschreibung">
            <FormInput
              type="text"
              value={formData.metaDescription || ''}
              onChange={value => handleInputChange('metaDescription', value)}
              placeholder="Meta-Beschreibung"
            />
          </FormField>

          <FormField label="SEO-Optimierung gewünscht">
            <FormRadioGroup
              name="seoOptimization"
              value={formData.seoOptimization || ''}
              onChange={value => handleInputChange('seoOptimization', value)}
              options={[
                { value: 'ja', label: 'Ja, SEO-Optimierung gewünscht' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'basic', label: 'Basic SEO' },
                { value: 'advanced', label: 'Advanced SEO' },
              ]}
            />
          </FormField>

          <FormField label="Recherche gewünscht">
            <FormRadioGroup
              name="research"
              value={formData.research || ''}
              onChange={value => handleInputChange('research', value)}
              options={[
                { value: 'ja', label: 'Ja, Recherche gewünscht' },
                { value: 'nein', label: 'Nein, Inhalte vorhanden' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>

          <FormField label="Bilder gewünscht">
            <FormRadioGroup
              name="images"
              value={formData.images || ''}
              onChange={value => handleInputChange('images', value)}
              options={[
                { value: 'ja', label: 'Ja, Bilder gewünscht' },
                { value: 'nein', label: 'Nein, nur Text' },
                { value: 'vorschläge', label: 'Bildvorschläge' },
              ]}
            />
          </FormField>

          <FormField label="Mehrsprachig">
            <FormRadioGroup
              name="multilingual"
              value={formData.multilingual || ''}
              onChange={value => handleInputChange('multilingual', value)}
              options={[
                { value: 'ja', label: 'Ja, mehrsprachig' },
                { value: 'nein', label: 'Nein, nur eine Sprache' },
                { value: 'später', label: 'Später geplant' },
              ]}
            />
          </FormField>

          <FormField label="Lektorat gewünscht">
            <FormRadioGroup
              name="editing"
              value={formData.editing || ''}
              onChange={value => handleInputChange('editing', value)}
              options={[
                { value: 'ja', label: 'Ja, Lektorat gewünscht' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'korrektorat', label: 'Nur Korrektorat' },
              ]}
            />
          </FormField>

          <FormField label="Revision gewünscht">
            <FormRadioGroup
              name="revision"
              value={formData.revision || ''}
              onChange={value => handleInputChange('revision', value)}
              options={[
                { value: 'ja', label: 'Ja, Revision gewünscht' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'eine_runde', label: 'Eine Revision' },
                { value: 'mehrere_runden', label: 'Mehrere Revisionen' },
              ]}
            />
          </FormField>

          <FormField label="Content-Strategie gewünscht">
            <FormRadioGroup
              name="contentStrategy"
              value={formData.contentStrategy || ''}
              onChange={value => handleInputChange('contentStrategy', value)}
              options={[
                { value: 'ja', label: 'Ja, Content-Strategie gewünscht' },
                { value: 'nein', label: 'Nein, nur Texte' },
                { value: 'beratung', label: 'Beratung gewünscht' },
              ]}
            />
          </FormField>

          <FormField label="Regelmäßige Zusammenarbeit">
            <FormRadioGroup
              name="regularCollaboration"
              value={formData.regularCollaboration || ''}
              onChange={value => handleInputChange('regularCollaboration', value)}
              options={[
                { value: 'ja', label: 'Ja, regelmäßige Zusammenarbeit' },
                { value: 'nein', label: 'Nein, einmalig' },
                { value: 'möglich', label: 'Möglich' },
              ]}
            />
          </FormField>

          <FormField label="Rush-Job">
            <FormRadioGroup
              name="rushJob"
              value={formData.rushJob || ''}
              onChange={value => handleInputChange('rushJob', value)}
              options={[
                { value: 'ja', label: 'Ja, Rush-Job' },
                { value: 'nein', label: 'Nein, normaler Zeitrahmen' },
                { value: 'express', label: 'Express-Service' },
              ]}
            />
          </FormField>

          <FormField label="Exklusivität">
            <FormRadioGroup
              name="exclusivity"
              value={formData.exclusivity || ''}
              onChange={value => handleInputChange('exclusivity', value)}
              options={[
                { value: 'ja', label: 'Ja, exklusiv' },
                { value: 'nein', label: 'Nein, nicht exklusiv' },
                { value: 'branche', label: 'Branche-exklusiv' },
              ]}
            />
          </FormField>

          <FormField label="Nutzungsrechte">
            <FormRadioGroup
              name="usageRights"
              value={formData.usageRights || ''}
              onChange={value => handleInputChange('usageRights', value)}
              options={[
                { value: 'vollständig', label: 'Vollständige Nutzungsrechte' },
                { value: 'zeitlich_begrenzt', label: 'Zeitlich begrenzt' },
                { value: 'regional_begrenzt', label: 'Regional begrenzt' },
                { value: 'medium_begrenzt', label: 'Medium-begrenzt' },
              ]}
            />
          </FormField>

          <FormField label="Autorennennung">
            <FormRadioGroup
              name="authorCredit"
              value={formData.authorCredit || ''}
              onChange={value => handleInputChange('authorCredit', value)}
              options={[
                { value: 'ja', label: 'Ja, Autorennennung gewünscht' },
                { value: 'nein', label: 'Nein, Ghostwriting' },
                { value: 'optional', label: 'Optional' },
              ]}
            />
          </FormField>

          <FormField label="Plagiatsprüfung">
            <FormRadioGroup
              name="plagiarismCheck"
              value={formData.plagiarismCheck || ''}
              onChange={value => handleInputChange('plagiarismCheck', value)}
              options={[
                { value: 'ja', label: 'Ja, Plagiatsprüfung gewünscht' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'zertifikat', label: 'Mit Zertifikat' },
              ]}
            />
          </FormField>

          <FormField label="Formatierung">
            <FormRadioGroup
              name="formatting"
              value={formData.formatting || ''}
              onChange={value => handleInputChange('formatting', value)}
              options={[
                { value: 'ja', label: 'Ja, Formatierung gewünscht' },
                { value: 'nein', label: 'Nein, nur Text' },
                { value: 'basic', label: 'Basic-Formatierung' },
                { value: 'advanced', label: 'Advanced-Formatierung' },
              ]}
            />
          </FormField>

          <FormField label="CMS-Upload">
            <FormRadioGroup
              name="cmsUpload"
              value={formData.cmsUpload || ''}
              onChange={value => handleInputChange('cmsUpload', value)}
              options={[
                { value: 'ja', label: 'Ja, CMS-Upload gewünscht' },
                { value: 'nein', label: 'Nein, nur Textlieferung' },
                { value: 'wordpress', label: 'WordPress' },
                { value: 'andere', label: 'Andere CMS' },
              ]}
            />
          </FormField>

          <FormField label="Performance-Tracking">
            <FormRadioGroup
              name="performanceTracking"
              value={formData.performanceTracking || ''}
              onChange={value => handleInputChange('performanceTracking', value)}
              options={[
                { value: 'ja', label: 'Ja, Performance-Tracking gewünscht' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'beratung', label: 'Beratung gewünscht' },
              ]}
            />
          </FormField>

          <FormField label="A/B-Testing">
            <FormRadioGroup
              name="abTesting"
              value={formData.abTesting || ''}
              onChange={value => handleInputChange('abTesting', value)}
              options={[
                { value: 'ja', label: 'Ja, A/B-Testing gewünscht' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'headlines', label: 'Nur Headlines' },
              ]}
            />
          </FormField>

          <FormField label="Social Media Integration">
            <FormRadioGroup
              name="socialMediaIntegration"
              value={formData.socialMediaIntegration || ''}
              onChange={value => handleInputChange('socialMediaIntegration', value)}
              options={[
                { value: 'ja', label: 'Ja, Social Media Integration' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'posts', label: 'Zusätzliche Posts' },
              ]}
            />
          </FormField>

          <FormField label="Brand Guidelines vorhanden">
            <FormRadioGroup
              name="brandGuidelines"
              value={formData.brandGuidelines || ''}
              onChange={value => handleInputChange('brandGuidelines', value)}
              options={[
                { value: 'ja', label: 'Ja, Brand Guidelines vorhanden' },
                { value: 'nein', label: 'Nein, nicht vorhanden' },
                { value: 'erstellen', label: 'Erstellen gewünscht' },
              ]}
            />
          </FormField>

          <FormField label="Style Guide vorhanden">
            <FormRadioGroup
              name="styleGuide"
              value={formData.styleGuide || ''}
              onChange={value => handleInputChange('styleGuide', value)}
              options={[
                { value: 'ja', label: 'Ja, Style Guide vorhanden' },
                { value: 'nein', label: 'Nein, nicht vorhanden' },
                { value: 'erstellen', label: 'Erstellen gewünscht' },
              ]}
            />
          </FormField>

          <FormField label="Content-Kalender gewünscht">
            <FormRadioGroup
              name="contentCalendar"
              value={formData.contentCalendar || ''}
              onChange={value => handleInputChange('contentCalendar', value)}
              options={[
                { value: 'ja', label: 'Ja, Content-Kalender gewünscht' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'erstellen', label: 'Erstellen gewünscht' },
              ]}
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
              placeholder="Beschreiben Sie Ihr Textprojekt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zielgruppe Details">
            <FormTextarea
              value={formData.targetAudienceDetails || ''}
              onChange={value => handleInputChange('targetAudienceDetails', value)}
              placeholder="Detaillierte Beschreibung der Zielgruppe"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Botschaft">
            <FormTextarea
              value={formData.message || ''}
              onChange={value => handleInputChange('message', value)}
              placeholder="Kernbotschaft des Textes"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Ziele">
            <FormTextarea
              value={formData.goals || ''}
              onChange={value => handleInputChange('goals', value)}
              placeholder="Welche Ziele sollen mit dem Text erreicht werden?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Briefing">
            <FormTextarea
              value={formData.briefing || ''}
              onChange={value => handleInputChange('briefing', value)}
              placeholder="Detailliertes Briefing"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Stil-Vorgaben">
            <FormTextarea
              value={formData.styleGuidelines || ''}
              onChange={value => handleInputChange('styleGuidelines', value)}
              placeholder="Stil-Vorgaben und Richtlinien"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Besondere Anforderungen oder Wünsche"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bestehende Inhalte">
            <FormTextarea
              value={formData.existingContent || ''}
              onChange={value => handleInputChange('existingContent', value)}
              placeholder="Bestehende Inhalte oder Materialien"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Inspiration">
            <FormTextarea
              value={formData.inspiration || ''}
              onChange={value => handleInputChange('inspiration', value)}
              placeholder="Inspiration oder Referenz-Texte"
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

export default TexterForm;
