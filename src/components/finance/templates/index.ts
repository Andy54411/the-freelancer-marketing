/**
 * Modulare deutsche Rechnungsvorlagen für Taskilo Platform
 * Exportiert alle verfügbaren Templates für das Invoice-System
 *
 * Features:
 * - Deutsche GoBD-Compliance
 * - UStG §14 konforme E-Rechnungen
 * - Kleinunternehmerregelung Support
 * - Professional Logo-Integration
 * - A4-Standard Dimensionen (595px × 842px)
 */

// Re-export types from types.ts
export type { InvoiceData, InvoiceItem, InvoiceTemplate, InvoiceTemplateProps } from './types';

// Template Components
export { GermanStandardTemplate } from './GermanStandardTemplate';
export { GermanMultiPageTemplate } from './GermanMultiPageTemplate';

// Import for use in AVAILABLE_TEMPLATES
import { GermanStandardTemplate } from './GermanStandardTemplate';
import { GermanMultiPageTemplate } from './GermanMultiPageTemplate';

// Template Metadata
export const AVAILABLE_TEMPLATES = [
  {
    id: 'german-standard',
    name: 'German Standard',
    description: 'GoBD-konforme Standardvorlage mit automatischer Mehrseitigkeit',
    component: GermanStandardTemplate,
    features: [
      'UStG §14 konform',
      'GoBD-zertifiziert',
      'Kleinunternehmer-Support',
      'Auto-Mehrseitigkeit',
    ],
    preview: '/templates/german-standard.jpg',
  },
  {
    id: 'german-multipage',
    name: 'German Multi-Page',
    description: 'Mehrseitige deutsche Rechnung mit Header/Footer auf jeder Seite',
    component: GermanMultiPageTemplate,
    features: [
      'Mehrseitig',
      'Header/Footer auf jeder Seite',
      'Automatische Seitenumbrüche',
      'Print-optimiert',
    ],
    preview: '/templates/german-multipage.jpg',
  },
] as const;

// Helper Functions
export const getTemplateById = (templateId: string) => {
  return AVAILABLE_TEMPLATES.find(template => template.id === templateId);
};

export const getTemplateComponent = (templateId: string) => {
  const template = getTemplateById(templateId);
  return template?.component;
};
