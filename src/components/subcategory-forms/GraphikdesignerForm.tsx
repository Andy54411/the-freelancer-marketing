import React, { useState, useEffect } from 'react';
import { GraphikdesignerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface GraphikdesignerFormProps {
  data: GraphikdesignerData;
  onDataChange: (data: GraphikdesignerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const GraphikdesignerForm: React.FC<GraphikdesignerFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<GraphikdesignerData>(data);

  const serviceTypeOptions = [
    { value: 'logo_design', label: 'Logo Design' },
    { value: 'corporate_design', label: 'Corporate Design' },
    { value: 'flyer', label: 'Flyer' },
    { value: 'broschüre', label: 'Broschüre' },
    { value: 'visitenkarten', label: 'Visitenkarten' },
    { value: 'poster', label: 'Poster' },
    { value: 'banner', label: 'Banner' },
    { value: 'web_design', label: 'Web Design' },
    { value: 'social_media', label: 'Social Media Design' },
    { value: 'packaging', label: 'Packaging Design' },
    { value: 'buchcover', label: 'Buchcover' },
    { value: 'illustration', label: 'Illustration' },
    { value: 'infografik', label: 'Infografik' },
    { value: 'präsentation', label: 'Präsentation' },
    { value: 'andere', label: 'Andere' },
  ];

  const projectTypeOptions = [
    { value: 'neues_design', label: 'Neues Design' },
    { value: 'überarbeitung', label: 'Überarbeitung' },
    { value: 'anpassung', label: 'Anpassung' },
    { value: 'optimierung', label: 'Optimierung' },
    { value: 'layout', label: 'Layout' },
    { value: 'konzept', label: 'Konzept' },
    { value: 'beratung', label: 'Beratung' },
    { value: 'andere', label: 'Andere' },
  ];
  const styleOptions = [
    { value: 'modern', label: 'Modern' },
    { value: 'klassisch', label: 'Klassisch' },
    { value: 'minimalistisch', label: 'Minimalistisch' },
    { value: 'vintage', label: 'Vintage' },
    { value: 'verspielt', label: 'Verspielt' },
    { value: 'elegant', label: 'Elegant' },
    { value: 'kreativ', label: 'Kreativ' },
    { value: 'corporate', label: 'Corporate' },
    { value: 'jugendlich', label: 'Jugendlich' },
    { value: 'luxuriös', label: 'Luxuriös' },
    { value: 'andere', label: 'Andere' },
  ];

  const colorSchemeOptions = [
    { value: 'bunt', label: 'Bunt' },
    { value: 'schwarz_weiss', label: 'Schwarz-Weiß' },
    { value: 'monochrom', label: 'Monochrom' },
    { value: 'warm', label: 'Warme Farben' },
    { value: 'kalt', label: 'Kalte Farben' },
    { value: 'pastell', label: 'Pastellfarben' },
    { value: 'neon', label: 'Neonfarben' },
    { value: 'erdtöne', label: 'Erdtöne' },
    { value: 'corporate', label: 'Corporate Colors' },
    { value: 'andere', label: 'Andere' },
  ];

  const formatOptions = [
    { value: 'print', label: 'Print' },
    { value: 'digital', label: 'Digital' },
    { value: 'beide', label: 'Beide' },
    { value: 'web', label: 'Web' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'mobile', label: 'Mobile' },
    { value: 'andere', label: 'Andere' },
  ];

  const sizeOptions = [
    { value: 'a4', label: 'A4' },
    { value: 'a5', label: 'A5' },
    { value: 'a6', label: 'A6' },
    { value: 'a3', label: 'A3' },
    { value: 'a2', label: 'A2' },
    { value: 'a1', label: 'A1' },
    { value: 'a0', label: 'A0' },
    { value: 'din_lang', label: 'DIN Lang' },
    { value: 'quadratisch', label: 'Quadratisch' },
    { value: 'custom', label: 'Custom' },
    { value: 'andere', label: 'Andere' },
  ];

  const fileFormatOptions = [
    { value: 'pdf', label: 'PDF' },
    { value: 'jpg', label: 'JPG' },
    { value: 'png', label: 'PNG' },
    { value: 'svg', label: 'SVG' },
    { value: 'eps', label: 'EPS' },
    { value: 'ai', label: 'AI' },
    { value: 'psd', label: 'PSD' },
    { value: 'indd', label: 'INDD' },
    { value: 'andere', label: 'Andere' },
  ];

  const additionalServicesOptions = [
    { value: 'konzeption', label: 'Konzeption' },
    { value: 'beratung', label: 'Beratung' },
    { value: 'research', label: 'Research' },
    { value: 'briefing', label: 'Briefing' },
    { value: 'präsentation', label: 'Präsentation' },
    { value: 'style_guide', label: 'Style Guide' },
    { value: 'brand_guidelines', label: 'Brand Guidelines' },
    { value: 'farbkonzept', label: 'Farbkonzept' },
    { value: 'schriftkonzept', label: 'Schriftkonzept' },
    { value: 'layout', label: 'Layout' },
    { value: 'satz', label: 'Satz' },
    { value: 'bildbearbeitung', label: 'Bildbearbeitung' },
    { value: 'retusche', label: 'Retusche' },
    { value: 'illustration', label: 'Illustration' },
    { value: 'icon_design', label: 'Icon Design' },
    { value: 'infografik', label: 'Infografik' },
    { value: 'diagramm', label: 'Diagramm' },
    { value: 'animation', label: 'Animation' },
    { value: 'motion_graphics', label: 'Motion Graphics' },
    { value: 'video_editing', label: 'Video Editing' },
    { value: 'web_development', label: 'Web Development' },
    { value: 'ui_ux', label: 'UI/UX Design' },
    { value: 'responsive_design', label: 'Responsive Design' },
    { value: 'mobile_design', label: 'Mobile Design' },
    { value: 'app_design', label: 'App Design' },
    { value: 'social_media_design', label: 'Social Media Design' },
    { value: 'facebook_design', label: 'Facebook Design' },
    { value: 'instagram_design', label: 'Instagram Design' },
    { value: 'twitter_design', label: 'Twitter Design' },
    { value: 'linkedin_design', label: 'LinkedIn Design' },
    { value: 'youtube_design', label: 'YouTube Design' },
    { value: 'newsletter_design', label: 'Newsletter Design' },
    { value: 'email_design', label: 'E-Mail Design' },
    { value: 'banner_design', label: 'Banner Design' },
    { value: 'display_ads', label: 'Display Ads' },
    { value: 'google_ads', label: 'Google Ads' },
    { value: 'facebook_ads', label: 'Facebook Ads' },
    { value: 'print_design', label: 'Print Design' },
    { value: 'druckvorbereitung', label: 'Druckvorbereitung' },
    { value: 'druckabwicklung', label: 'Druckabwicklung' },
    { value: 'papierauswahl', label: 'Papierauswahl' },
    { value: 'veredelung', label: 'Veredelung' },
    { value: 'stanzen', label: 'Stanzen' },
    { value: 'prägen', label: 'Prägen' },
    { value: 'lackierung', label: 'Lackierung' },
    { value: 'folierung', label: 'Folierung' },
    { value: 'laminierung', label: 'Laminierung' },
    { value: 'bindung', label: 'Bindung' },
    { value: 'falzen', label: 'Falzen' },
    { value: 'schneiden', label: 'Schneiden' },
    { value: 'perforieren', label: 'Perforieren' },
    { value: 'lochen', label: 'Lochen' },
    { value: 'heften', label: 'Heften' },
    { value: 'kleben', label: 'Kleben' },
    { value: 'versand', label: 'Versand' },
    { value: 'lagerung', label: 'Lagerung' },
    { value: 'distribution', label: 'Distribution' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'werbung', label: 'Werbung' },
    { value: 'kampagne', label: 'Kampagne' },
    { value: 'strategie', label: 'Strategie' },
    { value: 'planung', label: 'Planung' },
    { value: 'koordination', label: 'Koordination' },
    { value: 'projektmanagement', label: 'Projektmanagement' },
    { value: 'qualitätskontrolle', label: 'Qualitätskontrolle' },
    { value: 'revision', label: 'Revision' },
    { value: 'korrektur', label: 'Korrektur' },
    { value: 'lektorat', label: 'Lektorat' },
    { value: 'übersetzung', label: 'Übersetzung' },
    { value: 'lokalisierung', label: 'Lokalisierung' },
    { value: 'mehrsprachigkeit', label: 'Mehrsprachigkeit' },
    { value: 'barrierefreiheit', label: 'Barrierefreiheit' },
    { value: 'accessibility', label: 'Accessibility' },
    { value: 'usability', label: 'Usability' },
    { value: 'user_testing', label: 'User Testing' },
    { value: 'a_b_testing', label: 'A/B Testing' },
    { value: 'analytics', label: 'Analytics' },
    { value: 'tracking', label: 'Tracking' },
    { value: 'optimierung', label: 'Optimierung' },
    { value: 'seo', label: 'SEO' },
    { value: 'sea', label: 'SEA' },
    { value: 'sem', label: 'SEM' },
    { value: 'social_media_marketing', label: 'Social Media Marketing' },
    { value: 'content_marketing', label: 'Content Marketing' },
    { value: 'influencer_marketing', label: 'Influencer Marketing' },
    { value: 'email_marketing', label: 'E-Mail Marketing' },
    { value: 'newsletter_marketing', label: 'Newsletter Marketing' },
    { value: 'direct_marketing', label: 'Direct Marketing' },
    { value: 'permission_marketing', label: 'Permission Marketing' },
    { value: 'viral_marketing', label: 'Viral Marketing' },
    { value: 'guerilla_marketing', label: 'Guerilla Marketing' },
    { value: 'event_marketing', label: 'Event Marketing' },
    { value: 'pr', label: 'PR' },
    { value: 'public_relations', label: 'Public Relations' },
    { value: 'pressearbeit', label: 'Pressearbeit' },
    { value: 'medienarbeit', label: 'Medienarbeit' },
    { value: 'kommunikation', label: 'Kommunikation' },
    { value: 'corporate_communication', label: 'Corporate Communication' },
    { value: 'interne_kommunikation', label: 'Interne Kommunikation' },
    { value: 'externe_kommunikation', label: 'Externe Kommunikation' },
    { value: 'krisenkommunikation', label: 'Krisenkommunikation' },
    { value: 'change_kommunikation', label: 'Change Kommunikation' },
    { value: 'employer_branding', label: 'Employer Branding' },
    { value: 'personal_branding', label: 'Personal Branding' },
    { value: 'brand_identity', label: 'Brand Identity' },
    { value: 'brand_strategy', label: 'Brand Strategy' },
    { value: 'brand_positioning', label: 'Brand Positioning' },
    { value: 'brand_management', label: 'Brand Management' },
    { value: 'brand_monitoring', label: 'Brand Monitoring' },
    { value: 'brand_protection', label: 'Brand Protection' },
    { value: 'trademark', label: 'Trademark' },
    { value: 'copyright', label: 'Copyright' },
    { value: 'lizenzierung', label: 'Lizenzierung' },
    { value: 'rechte_management', label: 'Rechte Management' },
    { value: 'legal_check', label: 'Legal Check' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'datenschutz', label: 'Datenschutz' },
    { value: 'dsgvo', label: 'DSGVO' },
    { value: 'gdpr', label: 'GDPR' },
    { value: 'impressum', label: 'Impressum' },
    { value: 'agb', label: 'AGB' },
    { value: 'datenschutzerklärung', label: 'Datenschutzerklärung' },
    { value: 'cookie_policy', label: 'Cookie Policy' },
    { value: 'disclaimer', label: 'Disclaimer' },
    { value: 'terms_of_use', label: 'Terms of Use' },
    { value: 'privacy_policy', label: 'Privacy Policy' },
    { value: 'andere', label: 'Andere' },
  ];

  const handleInputChange = (field: keyof GraphikdesignerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.projectType &&
      formData.style &&
      formData.description
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Grafikdesigner-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art des Designs" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art des Designs"
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

          <FormField label="Stil" required>
            <FormSelect
              value={formData.style || ''}
              onChange={value => handleInputChange('style', value)}
              options={styleOptions}
              placeholder="Wählen Sie den Stil"
            />
          </FormField>

          <FormField label="Farbschema">
            <FormSelect
              value={formData.colorScheme || ''}
              onChange={value => handleInputChange('colorScheme', value)}
              options={colorSchemeOptions}
              placeholder="Wählen Sie das Farbschema"
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

          <FormField label="Größe">
            <FormSelect
              value={formData.size || ''}
              onChange={value => handleInputChange('size', value)}
              options={sizeOptions}
              placeholder="Wählen Sie die Größe"
            />
          </FormField>

          <FormField label="Dateiformat">
            <FormSelect
              value={formData.fileFormat || ''}
              onChange={value => handleInputChange('fileFormat', value)}
              options={fileFormatOptions}
              placeholder="Wählen Sie das Dateiformat"
            />
          </FormField>

          <FormField label="Gewünschter Termin">
            <FormInput
              type="text"
              value={formData.preferredDate || ''}
              onChange={value => handleInputChange('preferredDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>
          <FormField label="Website">
            <FormInput
              type="text"
              value={formData.website || ''}
              onChange={value => handleInputChange('website', value)}
              placeholder="Website"
            />
          </FormField>

          <FormField label="Anzahl Varianten">
            <FormInput
              type="number"
              value={formData.numberOfVariants?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfVariants',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl Varianten"
            />
          </FormField>

          <FormField label="Anzahl Seiten">
            <FormInput
              type="number"
              value={formData.numberOfPages?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfPages',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl Seiten"
            />
          </FormField>

          <FormField label="Auflage">
            <FormInput
              type="number"
              value={formData.printRun?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'printRun',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Auflage"
            />
          </FormField>

          <FormField label="Zielgruppe">
            <FormInput
              type="text"
              value={formData.targetGroup || ''}
              onChange={value => handleInputChange('targetGroup', value)}
              placeholder="Zielgruppe"
            />
          </FormField>

          <FormField label="Branche">
            <FormInput
              type="text"
              value={formData.industry || ''}
              onChange={value => handleInputChange('industry', value)}
              placeholder="Branche"
            />
          </FormField>

          <FormField label="Verwendungszweck">
            <FormInput
              type="text"
              value={formData.purpose || ''}
              onChange={value => handleInputChange('purpose', value)}
              placeholder="Verwendungszweck"
            />
          </FormField>

          <FormField label="Sprache">
            <FormInput
              type="text"
              value={formData.language || ''}
              onChange={value => handleInputChange('language', value)}
              placeholder="Sprache"
            />
          </FormField>

          <FormField label="Revisionen gewünscht">
            <FormRadioGroup
              name="revisions"
              value={formData.revisions || ''}
              onChange={value => handleInputChange('revisions', value)}
              options={[
                { value: 'keine', label: 'Keine Revisionen' },
                { value: '1', label: '1 Revision' },
                { value: '2', label: '2 Revisionen' },
                { value: '3', label: '3 Revisionen' },
                { value: 'unbegrenzt', label: 'Unbegrenzt' },
              ]}
            />
          </FormField>

          <FormField label="Quelldateien gewünscht">
            <FormRadioGroup
              name="sourceFiles"
              value={formData.sourceFiles || ''}
              onChange={value => handleInputChange('sourceFiles', value)}
              options={[
                { value: 'ja', label: 'Ja, Quelldateien gewünscht' },
                { value: 'nein', label: 'Nein, nur finale Dateien' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>

          <FormField label="Druckvorbereitung gewünscht">
            <FormRadioGroup
              name="printPreparation"
              value={formData.printPreparation || ''}
              onChange={value => handleInputChange('printPreparation', value)}
              options={[
                { value: 'ja', label: 'Ja, Druckvorbereitung gewünscht' },
                { value: 'nein', label: 'Nein, nur Design' },
                { value: 'beratung', label: 'Beratung gewünscht' },
              ]}
            />
          </FormField>

          <FormField label="Druckabwicklung gewünscht">
            <FormRadioGroup
              name="printProduction"
              value={formData.printProduction || ''}
              onChange={value => handleInputChange('printProduction', value)}
              options={[
                { value: 'ja', label: 'Ja, Druckabwicklung gewünscht' },
                { value: 'nein', label: 'Nein, nur Design' },
                { value: 'beratung', label: 'Beratung gewünscht' },
              ]}
            />
          </FormField>

          <FormField label="Copyright gewünscht">
            <FormRadioGroup
              name="copyright"
              value={formData.copyright || ''}
              onChange={value => handleInputChange('copyright', value)}
              options={[
                { value: 'ja', label: 'Ja, Copyright gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'lizenz', label: 'Lizenz gewünscht' },
              ]}
            />
          </FormField>

          <FormField label="Exklusivität gewünscht">
            <FormRadioGroup
              name="exclusivity"
              value={formData.exclusivity || ''}
              onChange={value => handleInputChange('exclusivity', value)}
              options={[
                { value: 'ja', label: 'Ja, Exklusivität gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'branche', label: 'Nur in der Branche' },
              ]}
            />
          </FormField>

          <FormField label="Nutzungsrechte gewünscht">
            <FormRadioGroup
              name="usageRights"
              value={formData.usageRights || ''}
              onChange={value => handleInputChange('usageRights', value)}
              options={[
                { value: 'unbegrenzt', label: 'Unbegrenzt' },
                { value: 'zeitlich_begrenzt', label: 'Zeitlich begrenzt' },
                { value: 'regional_begrenzt', label: 'Regional begrenzt' },
                { value: 'zweckgebunden', label: 'Zweckgebunden' },
              ]}
            />
          </FormField>

          <FormField label="Wartung gewünscht">
            <FormRadioGroup
              name="maintenance"
              value={formData.maintenance || ''}
              onChange={value => handleInputChange('maintenance', value)}
              options={[
                { value: 'ja', label: 'Ja, Wartung gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'beratung', label: 'Beratung gewünscht' },
              ]}
            />
          </FormField>

          <FormField label="Updates gewünscht">
            <FormRadioGroup
              name="updates"
              value={formData.updates || ''}
              onChange={value => handleInputChange('updates', value)}
              options={[
                { value: 'ja', label: 'Ja, Updates gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'regelmäßig', label: 'Regelmäßig' },
              ]}
            />
          </FormField>

          <FormField label="Support gewünscht">
            <FormRadioGroup
              name="support"
              value={formData.support || ''}
              onChange={value => handleInputChange('support', value)}
              options={[
                { value: 'ja', label: 'Ja, Support gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'zeitlich_begrenzt', label: 'Zeitlich begrenzt' },
              ]}
            />
          </FormField>

          <FormField label="Schulung gewünscht">
            <FormRadioGroup
              name="training"
              value={formData.training || ''}
              onChange={value => handleInputChange('training', value)}
              options={[
                { value: 'ja', label: 'Ja, Schulung gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'online', label: 'Online-Schulung' },
                { value: 'vor_ort', label: 'Vor-Ort-Schulung' },
              ]}
            />
          </FormField>

          <FormField label="Dokumentation gewünscht">
            <FormRadioGroup
              name="documentation"
              value={formData.documentation || ''}
              onChange={value => handleInputChange('documentation', value)}
              options={[
                { value: 'ja', label: 'Ja, Dokumentation gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'ausführlich', label: 'Ausführlich' },
                { value: 'basic', label: 'Basic' },
              ]}
            />
          </FormField>

          <FormField label="Präsentation gewünscht">
            <FormRadioGroup
              name="presentation"
              value={formData.presentation || ''}
              onChange={value => handleInputChange('presentation', value)}
              options={[
                { value: 'ja', label: 'Ja, Präsentation gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'online', label: 'Online-Präsentation' },
                { value: 'vor_ort', label: 'Vor-Ort-Präsentation' },
              ]}
            />
          </FormField>

          <FormField label="Beratung gewünscht">
            <FormRadioGroup
              name="consultation"
              value={formData.consultation || ''}
              onChange={value => handleInputChange('consultation', value)}
              options={[
                { value: 'ja', label: 'Ja, Beratung gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'umfassend', label: 'Umfassend' },
                { value: 'basic', label: 'Basic' },
              ]}
            />
          </FormField>

          <FormField label="Konzeption gewünscht">
            <FormRadioGroup
              name="conception"
              value={formData.conception || ''}
              onChange={value => handleInputChange('conception', value)}
              options={[
                { value: 'ja', label: 'Ja, Konzeption gewünscht' },
                { value: 'nein', label: 'Nein, bereits vorhanden' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>

          <FormField label="Research gewünscht">
            <FormRadioGroup
              name="research"
              value={formData.research || ''}
              onChange={value => handleInputChange('research', value)}
              options={[
                { value: 'ja', label: 'Ja, Research gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'marktanalyse', label: 'Marktanalyse' },
                { value: 'zielgruppe', label: 'Zielgruppenanalyse' },
              ]}
            />
          </FormField>

          <FormField label="Briefing gewünscht">
            <FormRadioGroup
              name="briefing"
              value={formData.briefing || ''}
              onChange={value => handleInputChange('briefing', value)}
              options={[
                { value: 'ja', label: 'Ja, Briefing gewünscht' },
                { value: 'nein', label: 'Nein, bereits vorhanden' },
                { value: 'gemeinsam', label: 'Gemeinsam erstellen' },
              ]}
            />
          </FormField>

          <FormField label="Style Guide gewünscht">
            <FormRadioGroup
              name="styleGuide"
              value={formData.styleGuide || ''}
              onChange={value => handleInputChange('styleGuide', value)}
              options={[
                { value: 'ja', label: 'Ja, Style Guide gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'erweitern', label: 'Vorhandenen erweitern' },
              ]}
            />
          </FormField>

          <FormField label="Brand Guidelines gewünscht">
            <FormRadioGroup
              name="brandGuidelines"
              value={formData.brandGuidelines || ''}
              onChange={value => handleInputChange('brandGuidelines', value)}
              options={[
                { value: 'ja', label: 'Ja, Brand Guidelines gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'aktualisieren', label: 'Vorhandene aktualisieren' },
              ]}
            />
          </FormField>

          <FormField label="Farbkonzept gewünscht">
            <FormRadioGroup
              name="colorConcept"
              value={formData.colorConcept || ''}
              onChange={value => handleInputChange('colorConcept', value)}
              options={[
                { value: 'ja', label: 'Ja, Farbkonzept gewünscht' },
                { value: 'nein', label: 'Nein, bereits vorhanden' },
                { value: 'anpassen', label: 'Vorhandenes anpassen' },
              ]}
            />
          </FormField>

          <FormField label="Schriftkonzept gewünscht">
            <FormRadioGroup
              name="fontConcept"
              value={formData.fontConcept || ''}
              onChange={value => handleInputChange('fontConcept', value)}
              options={[
                { value: 'ja', label: 'Ja, Schriftkonzept gewünscht' },
                { value: 'nein', label: 'Nein, bereits vorhanden' },
                { value: 'anpassen', label: 'Vorhandenes anpassen' },
              ]}
            />
          </FormField>

          <FormField label="Bildkonzept gewünscht">
            <FormRadioGroup
              name="imageConcept"
              value={formData.imageConcept || ''}
              onChange={value => handleInputChange('imageConcept', value)}
              options={[
                { value: 'ja', label: 'Ja, Bildkonzept gewünscht' },
                { value: 'nein', label: 'Nein, bereits vorhanden' },
                { value: 'stockfotos', label: 'Stockfotos verwenden' },
                { value: 'eigene_bilder', label: 'Eigene Bilder verwenden' },
              ]}
            />
          </FormField>

          <FormField label="Bildbearbeitung gewünscht">
            <FormRadioGroup
              name="imageEditing"
              value={formData.imageEditing || ''}
              onChange={value => handleInputChange('imageEditing', value)}
              options={[
                { value: 'ja', label: 'Ja, Bildbearbeitung gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'basic', label: 'Basic-Bearbeitung' },
                { value: 'erweitert', label: 'Erweiterte Bearbeitung' },
              ]}
            />
          </FormField>

          <FormField label="Illustrationen gewünscht">
            <FormRadioGroup
              name="illustrations"
              value={formData.illustrations || ''}
              onChange={value => handleInputChange('illustrations', value)}
              options={[
                { value: 'ja', label: 'Ja, Illustrationen gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'eigene', label: 'Eigene Illustrationen' },
                { value: 'lizenzfrei', label: 'Lizenzfreie Illustrationen' },
              ]}
            />
          </FormField>

          <FormField label="Icons gewünscht">
            <FormRadioGroup
              name="icons"
              value={formData.icons || ''}
              onChange={value => handleInputChange('icons', value)}
              options={[
                { value: 'ja', label: 'Ja, Icons gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'eigene', label: 'Eigene Icons' },
                { value: 'lizenzfrei', label: 'Lizenzfreie Icons' },
              ]}
            />
          </FormField>

          <FormField label="Infografiken gewünscht">
            <FormRadioGroup
              name="infographics"
              value={formData.infographics || ''}
              onChange={value => handleInputChange('infographics', value)}
              options={[
                { value: 'ja', label: 'Ja, Infografiken gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'einfach', label: 'Einfache Infografiken' },
                { value: 'komplex', label: 'Komplexe Infografiken' },
              ]}
            />
          </FormField>

          <FormField label="Diagramme gewünscht">
            <FormRadioGroup
              name="charts"
              value={formData.charts || ''}
              onChange={value => handleInputChange('charts', value)}
              options={[
                { value: 'ja', label: 'Ja, Diagramme gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'interaktiv', label: 'Interaktive Diagramme' },
                { value: 'statisch', label: 'Statische Diagramme' },
              ]}
            />
          </FormField>

          <FormField label="Animationen gewünscht">
            <FormRadioGroup
              name="animations"
              value={formData.animations || ''}
              onChange={value => handleInputChange('animations', value)}
              options={[
                { value: 'ja', label: 'Ja, Animationen gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'einfach', label: 'Einfache Animationen' },
                { value: 'komplex', label: 'Komplexe Animationen' },
              ]}
            />
          </FormField>

          <FormField label="Motion Graphics gewünscht">
            <FormRadioGroup
              name="motionGraphics"
              value={formData.motionGraphics || ''}
              onChange={value => handleInputChange('motionGraphics', value)}
              options={[
                { value: 'ja', label: 'Ja, Motion Graphics gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'logo', label: 'Logo-Animation' },
                { value: 'text', label: 'Text-Animation' },
              ]}
            />
          </FormField>

          <FormField label="Video Editing gewünscht">
            <FormRadioGroup
              name="videoEditing"
              value={formData.videoEditing || ''}
              onChange={value => handleInputChange('videoEditing', value)}
              options={[
                { value: 'ja', label: 'Ja, Video Editing gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'basic', label: 'Basic Editing' },
                { value: 'professional', label: 'Professional Editing' },
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
              placeholder="Beschreiben Sie Ihr Designprojekt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Ziele">
            <FormTextarea
              value={formData.goals || ''}
              onChange={value => handleInputChange('goals', value)}
              placeholder="Welche Ziele sollen mit dem Design erreicht werden?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Botschaft">
            <FormTextarea
              value={formData.message || ''}
              onChange={value => handleInputChange('message', value)}
              placeholder="Welche Botschaft soll vermittelt werden?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Stilwünsche">
            <FormTextarea
              value={formData.stylePreferences || ''}
              onChange={value => handleInputChange('stylePreferences', value)}
              placeholder="Besondere Stilwünsche oder Vorstellungen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Inspirationen">
            <FormTextarea
              value={formData.inspiration || ''}
              onChange={value => handleInputChange('inspiration', value)}
              placeholder="Inspirationen oder Referenzen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Vorhandene Materialien">
            <FormTextarea
              value={formData.existingMaterials || ''}
              onChange={value => handleInputChange('existingMaterials', value)}
              placeholder="Vorhandene Materialien oder Assets"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Texte">
            <FormTextarea
              value={formData.texts || ''}
              onChange={value => handleInputChange('texts', value)}
              placeholder="Texte für das Design"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Wünsche">
            <FormTextarea
              value={formData.specialRequests || ''}
              onChange={value => handleInputChange('specialRequests', value)}
              placeholder="Besondere Wünsche oder Anforderungen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Technische Anforderungen">
            <FormTextarea
              value={formData.technicalRequirements || ''}
              onChange={value => handleInputChange('technicalRequirements', value)}
              placeholder="Technische Anforderungen oder Spezifikationen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Konkurrenz">
            <FormTextarea
              value={formData.competition || ''}
              onChange={value => handleInputChange('competition', value)}
              placeholder="Informationen zur Konkurrenz"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Marktumfeld">
            <FormTextarea
              value={formData.marketEnvironment || ''}
              onChange={value => handleInputChange('marketEnvironment', value)}
              placeholder="Informationen zum Marktumfeld"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Erfolg messen">
            <FormTextarea
              value={formData.successMeasurement || ''}
              onChange={value => handleInputChange('successMeasurement', value)}
              placeholder="Wie soll der Erfolg gemessen werden?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zeitplan">
            <FormTextarea
              value={formData.timeline || ''}
              onChange={value => handleInputChange('timeline', value)}
              placeholder="Zeitplan und Meilensteine"
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

export default GraphikdesignerForm;
