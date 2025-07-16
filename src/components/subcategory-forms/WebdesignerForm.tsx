import React, { useState, useEffect } from 'react';
import { WebdesignData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface WebdesignerFormProps {
  data: WebdesignData;
  onDataChange: (data: WebdesignData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const WebdesignerForm: React.FC<WebdesignerFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<WebdesignData>(data);

  const serviceTypeOptions = [
    { value: 'website_design', label: 'Website Design' },
    { value: 'website_redesign', label: 'Website Redesign' },
    { value: 'ui_ux_design', label: 'UI/UX Design' },
    { value: 'responsive_design', label: 'Responsive Design' },
    { value: 'mobile_design', label: 'Mobile Design' },
    { value: 'app_design', label: 'App Design' },
    { value: 'e_commerce', label: 'E-Commerce' },
    { value: 'landingpage', label: 'Landingpage' },
    { value: 'onepage', label: 'One-Page Website' },
    { value: 'portfolio', label: 'Portfolio Website' },
    { value: 'corporate_website', label: 'Corporate Website' },
    { value: 'blog', label: 'Blog' },
    { value: 'cms', label: 'CMS' },
    { value: 'wartung', label: 'Wartung' },
    { value: 'andere', label: 'Andere' },
  ];

  const websiteTypeOptions = [
    { value: 'business', label: 'Business Website' },
    { value: 'e_commerce', label: 'E-Commerce' },
    { value: 'portfolio', label: 'Portfolio' },
    { value: 'blog', label: 'Blog' },
    { value: 'magazine', label: 'Magazin' },
    { value: 'news', label: 'News-Portal' },
    { value: 'community', label: 'Community' },
    { value: 'forum', label: 'Forum' },
    { value: 'social_network', label: 'Social Network' },
    { value: 'nonprofit', label: 'Nonprofit' },
    { value: 'education', label: 'Bildung' },
    { value: 'medical', label: 'Medizin' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'hotel', label: 'Hotel' },
    { value: 'immobilien', label: 'Immobilien' },
    { value: 'auto', label: 'Automobil' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'beauty', label: 'Beauty' },
    { value: 'fashion', label: 'Fashion' },
    { value: 'art', label: 'Kunst' },
    { value: 'andere', label: 'Andere' },
  ];

  const budgetRangeOptions = [
    { value: 'unter_500', label: 'Unter 500€' },
    { value: '500_1000', label: '500€ - 1000€' },
    { value: '1000_2500', label: '1000€ - 2500€' },
    { value: '2500_5000', label: '2500€ - 5000€' },
    { value: '5000_10000', label: '5000€ - 10000€' },
    { value: 'über_10000', label: 'Über 10000€' },
  ];

  const urgencyOptions = [
    { value: 'nicht_eilig', label: 'Nicht eilig' },
    { value: 'normal', label: 'Normal' },
    { value: 'eilig', label: 'Eilig' },
    { value: 'sehr_eilig', label: 'Sehr eilig' },
  ];

  const numberOfPagesOptions = [
    { value: '1', label: '1 Seite' },
    { value: '2_5', label: '2-5 Seiten' },
    { value: '6_10', label: '6-10 Seiten' },
    { value: '11_20', label: '11-20 Seiten' },
    { value: '21_50', label: '21-50 Seiten' },
    { value: 'über_50', label: 'Über 50 Seiten' },
  ];

  const cmsOptions = [
    { value: 'wordpress', label: 'WordPress' },
    { value: 'drupal', label: 'Drupal' },
    { value: 'joomla', label: 'Joomla' },
    { value: 'typo3', label: 'TYPO3' },
    { value: 'shopify', label: 'Shopify' },
    { value: 'woocommerce', label: 'WooCommerce' },
    { value: 'magento', label: 'Magento' },
    { value: 'prestashop', label: 'PrestaShop' },
    { value: 'custom', label: 'Custom CMS' },
    { value: 'keine', label: 'Keine CMS' },
    { value: 'andere', label: 'Andere' },
  ];

  const styleOptions = [
    { value: 'modern', label: 'Modern' },
    { value: 'klassisch', label: 'Klassisch' },
    { value: 'minimalistisch', label: 'Minimalistisch' },
    { value: 'vintage', label: 'Vintage' },
    { value: 'corporate', label: 'Corporate' },
    { value: 'kreativ', label: 'Kreativ' },
    { value: 'elegant', label: 'Elegant' },
    { value: 'verspielt', label: 'Verspielt' },
    { value: 'luxuriös', label: 'Luxuriös' },
    { value: 'jugendlich', label: 'Jugendlich' },
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

  const featuresOptions = [
    { value: 'kontaktformular', label: 'Kontaktformular' },
    { value: 'newsletter', label: 'Newsletter' },
    { value: 'blog', label: 'Blog' },
    { value: 'galerie', label: 'Galerie' },
    { value: 'slideshow', label: 'Slideshow' },
    { value: 'video', label: 'Video' },
    { value: 'audio', label: 'Audio' },
    { value: 'social_media', label: 'Social Media Integration' },
    { value: 'seo', label: 'SEO-Optimierung' },
    { value: 'analytics', label: 'Analytics' },
    { value: 'multilingual', label: 'Mehrsprachig' },
    { value: 'search', label: 'Suche' },
    { value: 'user_registration', label: 'Benutzerregistrierung' },
    { value: 'user_login', label: 'Benutzer-Login' },
    { value: 'user_profile', label: 'Benutzerprofil' },
    { value: 'forum', label: 'Forum' },
    { value: 'chat', label: 'Chat' },
    { value: 'booking', label: 'Buchungssystem' },
    { value: 'calendar', label: 'Kalender' },
    { value: 'events', label: 'Events' },
    { value: 'shop', label: 'Online-Shop' },
    { value: 'payment', label: 'Zahlungssystem' },
    { value: 'cart', label: 'Warenkorb' },
    { value: 'wishlist', label: 'Wunschliste' },
    { value: 'reviews', label: 'Bewertungen' },
    { value: 'ratings', label: 'Bewertungen' },
    { value: 'testimonials', label: 'Testimonials' },
    { value: 'faq', label: 'FAQ' },
    { value: 'dokumentation', label: 'Dokumentation' },
    { value: 'support', label: 'Support' },
    { value: 'helpdesk', label: 'Helpdesk' },
    { value: 'ticketing', label: 'Ticketing' },
    { value: 'crm', label: 'CRM' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'reporting', label: 'Reporting' },
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'admin_panel', label: 'Admin Panel' },
    { value: 'andere', label: 'Andere' },
  ];

  const additionalServicesOptions = [
    { value: 'logo_design', label: 'Logo Design' },
    { value: 'branding', label: 'Branding' },
    { value: 'corporate_design', label: 'Corporate Design' },
    { value: 'style_guide', label: 'Style Guide' },
    { value: 'content_creation', label: 'Content Creation' },
    { value: 'copywriting', label: 'Copywriting' },
    { value: 'texterstellung', label: 'Texterstellung' },
    { value: 'übersetzung', label: 'Übersetzung' },
    { value: 'fotografie', label: 'Fotografie' },
    { value: 'bildbearbeitung', label: 'Bildbearbeitung' },
    { value: 'video_produktion', label: 'Video Produktion' },
    { value: 'animation', label: 'Animation' },
    { value: 'motion_graphics', label: 'Motion Graphics' },
    { value: 'seo', label: 'SEO' },
    { value: 'sea', label: 'SEA' },
    { value: 'sem', label: 'SEM' },
    { value: 'social_media_marketing', label: 'Social Media Marketing' },
    { value: 'content_marketing', label: 'Content Marketing' },
    { value: 'email_marketing', label: 'E-Mail Marketing' },
    { value: 'online_marketing', label: 'Online Marketing' },
    { value: 'beratung', label: 'Beratung' },
    { value: 'konzeption', label: 'Konzeption' },
    { value: 'strategie', label: 'Strategie' },
    { value: 'planung', label: 'Planung' },
    { value: 'projektmanagement', label: 'Projektmanagement' },
    { value: 'schulung', label: 'Schulung' },
    { value: 'training', label: 'Training' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'support', label: 'Support' },
    { value: 'wartung', label: 'Wartung' },
    { value: 'hosting', label: 'Hosting' },
    { value: 'domain', label: 'Domain' },
    { value: 'ssl', label: 'SSL-Zertifikat' },
    { value: 'backup', label: 'Backup' },
    { value: 'security', label: 'Sicherheit' },
    { value: 'monitoring', label: 'Monitoring' },
    { value: 'updates', label: 'Updates' },
    { value: 'migration', label: 'Migration' },
    { value: 'import', label: 'Import' },
    { value: 'export', label: 'Export' },
    { value: 'integration', label: 'Integration' },
    { value: 'api', label: 'API' },
    { value: 'third_party', label: 'Third Party' },
    { value: 'plugins', label: 'Plugins' },
    { value: 'extensions', label: 'Extensions' },
    { value: 'custom_development', label: 'Custom Development' },
    { value: 'programming', label: 'Programming' },
    { value: 'frontend', label: 'Frontend' },
    { value: 'backend', label: 'Backend' },
    { value: 'database', label: 'Database' },
    { value: 'testing', label: 'Testing' },
    { value: 'quality_assurance', label: 'Quality Assurance' },
    { value: 'debugging', label: 'Debugging' },
    { value: 'optimization', label: 'Optimization' },
    { value: 'performance', label: 'Performance' },
    { value: 'speed', label: 'Speed' },
    { value: 'accessibility', label: 'Accessibility' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'gdpr', label: 'GDPR' },
    { value: 'legal', label: 'Legal' },
    { value: 'impressum', label: 'Impressum' },
    { value: 'datenschutz', label: 'Datenschutz' },
    { value: 'agb', label: 'AGB' },
    { value: 'andere', label: 'Andere' },
  ];

  const handleInputChange = (field: keyof WebdesignData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.websiteType &&
      formData.budgetRange &&
      formData.urgency &&
      formData.numberOfPages &&
      formData.description
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Webdesigner-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Webentwicklung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Webentwicklung"
            />
          </FormField>

          <FormField label="Website-Typ" required>
            <FormSelect
              value={formData.websiteType || ''}
              onChange={value => handleInputChange('websiteType', value)}
              options={websiteTypeOptions}
              placeholder="Wählen Sie den Website-Typ"
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

          <FormField label="Anzahl Seiten" required>
            <FormSelect
              value={formData.numberOfPages || ''}
              onChange={value => handleInputChange('numberOfPages', value)}
              options={numberOfPagesOptions}
              placeholder="Wählen Sie die Anzahl der Seiten"
            />
          </FormField>

          <FormField label="CMS">
            <FormSelect
              value={formData.cms || ''}
              onChange={value => handleInputChange('cms', value)}
              options={cmsOptions}
              placeholder="Wählen Sie ein CMS"
            />
          </FormField>

          <FormField label="Stil">
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

          <FormField label="Gewünschter Starttermin">
            <FormInput
              type="text"
              value={formData.preferredStartDate || ''}
              onChange={value => handleInputChange('preferredStartDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Gewünschter Liefertermin">
            <FormInput
              type="text"
              value={formData.preferredLaunchDate || ''}
              onChange={value => handleInputChange('preferredLaunchDate', value)}
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

          <FormField label="Aktuelle Website">
            <FormInput
              type="text"
              value={formData.currentWebsite || ''}
              onChange={value => handleInputChange('currentWebsite', value)}
              placeholder="URL der aktuellen Website"
            />
          </FormField>

          <FormField label="Domain">
            <FormInput
              type="text"
              value={formData.domain || ''}
              onChange={value => handleInputChange('domain', value)}
              placeholder="Gewünschte Domain"
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

          <FormField label="Sprachen">
            <FormInput
              type="text"
              value={formData.languages || ''}
              onChange={value => handleInputChange('languages', value)}
              placeholder="Sprachen (z.B. Deutsch, Englisch)"
            />
          </FormField>

          <FormField label="Responsive Design gewünscht">
            <FormRadioGroup
              name="responsive"
              value={formData.responsive || ''}
              onChange={value => handleInputChange('responsive', value)}
              options={[
                { value: 'ja', label: 'Ja, responsive Design' },
                { value: 'nein', label: 'Nein, nur Desktop' },
                { value: 'mobile_first', label: 'Mobile First' },
              ]}
            />
          </FormField>

          <FormField label="Content Management gewünscht">
            <FormRadioGroup
              name="contentManagement"
              value={formData.contentManagement || ''}
              onChange={value => handleInputChange('contentManagement', value)}
              options={[
                { value: 'ja', label: 'Ja, CMS gewünscht' },
                { value: 'nein', label: 'Nein, statische Website' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>

          <FormField label="E-Commerce gewünscht">
            <FormRadioGroup
              name="ecommerce"
              value={formData.ecommerce || ''}
              onChange={value => handleInputChange('ecommerce', value)}
              options={[
                { value: 'ja', label: 'Ja, Online-Shop gewünscht' },
                { value: 'nein', label: 'Nein, kein Shop' },
                { value: 'später', label: 'Später hinzufügen' },
              ]}
            />
          </FormField>

          <FormField label="SEO-Optimierung gewünscht">
            <FormRadioGroup
              name="seo"
              value={formData.seo || ''}
              onChange={value => handleInputChange('seo', value)}
              options={[
                { value: 'ja', label: 'Ja, SEO gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'basic', label: 'Basic SEO' },
                { value: 'erweitert', label: 'Erweiterte SEO' },
              ]}
            />
          </FormField>

          <FormField label="Analytics gewünscht">
            <FormRadioGroup
              name="analytics"
              value={formData.analytics || ''}
              onChange={value => handleInputChange('analytics', value)}
              options={[
                { value: 'ja', label: 'Ja, Analytics gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'google', label: 'Google Analytics' },
                { value: 'andere', label: 'Andere Tools' },
              ]}
            />
          </FormField>

          <FormField label="Hosting gewünscht">
            <FormRadioGroup
              name="hosting"
              value={formData.hosting || ''}
              onChange={value => handleInputChange('hosting', value)}
              options={[
                { value: 'ja', label: 'Ja, Hosting gewünscht' },
                { value: 'nein', label: 'Nein, eigenes Hosting' },
                { value: 'beratung', label: 'Beratung gewünscht' },
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
                { value: 'vertrag', label: 'Wartungsvertrag' },
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
                { value: 'benutzerhandbuch', label: 'Benutzerhandbuch' },
                { value: 'technische_doku', label: 'Technische Dokumentation' },
              ]}
            />
          </FormField>

          <FormField label="Backup gewünscht">
            <FormRadioGroup
              name="backup"
              value={formData.backup || ''}
              onChange={value => handleInputChange('backup', value)}
              options={[
                { value: 'ja', label: 'Ja, Backup gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'automatisch', label: 'Automatisches Backup' },
              ]}
            />
          </FormField>

          <FormField label="SSL-Zertifikat gewünscht">
            <FormRadioGroup
              name="ssl"
              value={formData.ssl || ''}
              onChange={value => handleInputChange('ssl', value)}
              options={[
                { value: 'ja', label: 'Ja, SSL gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'bereits_vorhanden', label: 'Bereits vorhanden' },
              ]}
            />
          </FormField>

          <FormField label="GDPR-Compliance gewünscht">
            <FormRadioGroup
              name="gdpr"
              value={formData.gdpr || ''}
              onChange={value => handleInputChange('gdpr', value)}
              options={[
                { value: 'ja', label: 'Ja, GDPR-Compliance gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'beratung', label: 'Beratung gewünscht' },
              ]}
            />
          </FormField>

          <FormField label="Accessibility gewünscht">
            <FormRadioGroup
              name="accessibility"
              value={formData.accessibility || ''}
              onChange={value => handleInputChange('accessibility', value)}
              options={[
                { value: 'ja', label: 'Ja, Accessibility gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'wcag', label: 'WCAG-konform' },
              ]}
            />
          </FormField>

          <FormField label="Performance-Optimierung gewünscht">
            <FormRadioGroup
              name="performance"
              value={formData.performance || ''}
              onChange={value => handleInputChange('performance', value)}
              options={[
                { value: 'ja', label: 'Ja, Performance-Optimierung gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'speed', label: 'Geschwindigkeitsoptimierung' },
              ]}
            />
          </FormField>

          <FormField label="Testing gewünscht">
            <FormRadioGroup
              name="testing"
              value={formData.testing || ''}
              onChange={value => handleInputChange('testing', value)}
              options={[
                { value: 'ja', label: 'Ja, Testing gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'umfassend', label: 'Umfassendes Testing' },
              ]}
            />
          </FormField>

          <FormField label="Migration gewünscht">
            <FormRadioGroup
              name="migration"
              value={formData.migration || ''}
              onChange={value => handleInputChange('migration', value)}
              options={[
                { value: 'ja', label: 'Ja, Migration gewünscht' },
                { value: 'nein', label: 'Nein, neue Website' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>

          <FormField label="Integration gewünscht">
            <FormRadioGroup
              name="integration"
              value={formData.integration || ''}
              onChange={value => handleInputChange('integration', value)}
              options={[
                { value: 'ja', label: 'Ja, Integration gewünscht' },
                { value: 'nein', label: 'Nein, nicht gewünscht' },
                { value: 'api', label: 'API-Integration' },
                { value: 'third_party', label: 'Third-Party-Integration' },
              ]}
            />
          </FormField>

          <FormField label="Custom Development gewünscht">
            <FormRadioGroup
              name="customDevelopment"
              value={formData.customDevelopment || ''}
              onChange={value => handleInputChange('customDevelopment', value)}
              options={[
                { value: 'ja', label: 'Ja, Custom Development gewünscht' },
                { value: 'nein', label: 'Nein, Standard-Lösung' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>

          <FormField label="Frontend Framework">
            <FormInput
              type="text"
              value={formData.frontendFramework || ''}
              onChange={value => handleInputChange('frontendFramework', value)}
              placeholder="z.B. React, Vue, Angular"
            />
          </FormField>

          <FormField label="Backend Framework">
            <FormInput
              type="text"
              value={formData.backendFramework || ''}
              onChange={value => handleInputChange('backendFramework', value)}
              placeholder="z.B. Node.js, PHP, Python"
            />
          </FormField>

          <FormField label="Database">
            <FormInput
              type="text"
              value={formData.database || ''}
              onChange={value => handleInputChange('database', value)}
              placeholder="z.B. MySQL, PostgreSQL, MongoDB"
            />
          </FormField>

          <FormField label="Hosting Provider">
            <FormInput
              type="text"
              value={formData.hostingProvider || ''}
              onChange={value => handleInputChange('hostingProvider', value)}
              placeholder="z.B. AWS, Google Cloud, Hetzner"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gewünschte Features">
            <FormCheckboxGroup
              value={formData.features || []}
              onChange={value => handleInputChange('features', value)}
              options={featuresOptions}
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
              placeholder="Beschreiben Sie Ihr Webprojekt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Ziele">
            <FormTextarea
              value={formData.goals || ''}
              onChange={value => handleInputChange('goals', value)}
              placeholder="Welche Ziele sollen mit der Website erreicht werden?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Existierende Inhalte">
            <FormTextarea
              value={formData.existingContent || ''}
              onChange={value => handleInputChange('existingContent', value)}
              placeholder="Welche Inhalte sind bereits vorhanden?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Inspiration">
            <FormTextarea
              value={formData.inspiration || ''}
              onChange={value => handleInputChange('inspiration', value)}
              placeholder="Inspirationen oder Referenz-Websites"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Stilwünsche">
            <FormTextarea
              value={formData.stylePreferences || ''}
              onChange={value => handleInputChange('stylePreferences', value)}
              placeholder="Besondere Stilwünsche oder Designvorstellungen"
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

export default WebdesignerForm;
