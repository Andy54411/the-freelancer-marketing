/**
 * Modulare deutsche Angebots-Vorlagen für Taskilo Platform
 * Exportiert alle verfügbaren Templates für das Quote-System
 */

// Template Components
export { GermanStandardQuoteTemplate } from './GermanStandardQuoteTemplate';
export { GermanMultiPageQuoteTemplate } from './GermanMultiPageQuoteTemplate';

// Import for use in AVAILABLE_TEMPLATES
import { GermanStandardQuoteTemplate } from './GermanStandardQuoteTemplate';
import { GermanMultiPageQuoteTemplate } from './GermanMultiPageQuoteTemplate';

export type QuoteTemplate = string;

// Template Metadata
export const AVAILABLE_QUOTE_TEMPLATES = [
  {
    id: 'german-standard',
    name: 'German Standard',
    description: 'Standard-Angebot mit automatischer Mehrseitigkeit',
    component: GermanStandardQuoteTemplate,
    features: [
      'Professionelles Layout',
      'Auto-Mehrseitigkeit',
      'Firmen-Branding',
      'Print-optimiert',
    ],
    preview: '/templates/quote-german-standard.jpg',
  },
  {
    id: 'german-multipage',
    name: 'German Multi-Page',
    description: 'Mehrseitige Angebots-Vorlage mit Header/Footer auf jeder Seite',
    component: GermanMultiPageQuoteTemplate,
    features: [
      'Mehrseitig',
      'Header/Footer auf jeder Seite',
      'Automatische Seitenumbrüche',
      'Print-optimiert',
    ],
    preview: '/templates/quote-german-multipage.jpg',
  },
] as const;

export type QuoteTemplateConfig = (typeof AVAILABLE_QUOTE_TEMPLATES)[number];

// Default Template
export const DEFAULT_QUOTE_TEMPLATE: QuoteTemplate = 'german-standard';

// Helper Functions
export const getQuoteTemplateById = (templateId: string) => {
  return AVAILABLE_QUOTE_TEMPLATES.find(template => template.id === templateId);
};

export const getQuoteTemplateComponent = (templateId: string) => {
  const template = getQuoteTemplateById(templateId);
  return template?.component;
};
