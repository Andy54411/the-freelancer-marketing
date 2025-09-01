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
export { ModernBusinessTemplate } from './ModernBusinessTemplate';
export { ClassicProfessionalTemplate } from './ClassicProfessionalTemplate';
export { MinimalCleanTemplate } from './MinimalCleanTemplate';
export { CorporateFormalTemplate } from './CorporateFormalTemplate';

// Template Metadata
export const AVAILABLE_TEMPLATES = [
  {
    id: 'german-standard',
    name: 'German Standard',
    description: 'GoBD-konforme Standardvorlage mit deutschen Rechtspflichten',
    component: 'GermanStandardTemplate',
    features: ['UStG §14 konform', 'GoBD-zertifiziert', 'Kleinunternehmer-Support'],
    preview: '/templates/german-standard.jpg',
  },
  {
    id: 'modern-business',
    name: 'Modern Business',
    description: 'Moderne Geschäftsvorlage mit Corporate Design',
    component: 'ModernBusinessTemplate',
    features: ['Taskilo Branding', 'Logo-Integration', 'Professional Layout'],
    preview: '/templates/modern-business.jpg',
  },
  {
    id: 'classic-professional',
    name: 'Classic Professional',
    description: 'Klassisches Design für traditionelle Unternehmen',
    component: 'ClassicProfessionalTemplate',
    features: ['Konservatives Design', 'Klare Struktur', 'Zeitlos elegant'],
    preview: '/templates/classic-professional.jpg',
  },
  {
    id: 'minimal-clean',
    name: 'Minimal Clean',
    description: 'Minimalistisches Design mit Fokus auf Inhalt',
    component: 'MinimalCleanTemplate',
    features: ['Clean Design', 'Fokus auf Inhalt', 'Moderne Typografie'],
    preview: '/templates/minimal-clean.jpg',
  },
  {
    id: 'corporate-formal',
    name: 'Corporate Formal',
    description: 'Formelle Vorlage für große Unternehmen',
    component: 'CorporateFormalTemplate',
    features: ['Corporate Identity', 'Formal Layout', 'B2B-optimiert'],
    preview: '/templates/corporate-formal.jpg',
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
