/**
 * Modulare deutsche Lieferschein-Vorlagen für Taskilo Platform
 * Exportiert alle verfügbaren Templates für das Delivery Note-System
 *
 * Features:
 * - Deutsche Compliance
 * - Professional Layout
 * - A4-Standard Dimensionen (595px × 842px)
 * - Mehrseitige Unterstützung
 * - Optionale Preisanzeige
 */

// Re-export types from types.ts
export type { DeliveryNoteData, DeliveryNoteItemData, DeliveryNoteTemplate, DeliveryNoteTemplateProps } from './types';

// Template Components
export { GermanStandardDeliveryNoteTemplate } from './GermanStandardDeliveryNoteTemplate';
export { GermanMultiPageDeliveryNoteTemplate } from './GermanMultiPageDeliveryNoteTemplate';

// Import for use in AVAILABLE_TEMPLATES
import { GermanStandardDeliveryNoteTemplate } from './GermanStandardDeliveryNoteTemplate';
import { GermanMultiPageDeliveryNoteTemplate } from './GermanMultiPageDeliveryNoteTemplate';
import { DeliveryNoteTemplate } from './types';

// Template Metadata
export const AVAILABLE_DELIVERY_NOTE_TEMPLATES = [
  {
    id: 'german-standard',
    name: 'German Standard',
    description: 'Standard-Lieferschein mit automatischer Mehrseitigkeit',
    component: GermanStandardDeliveryNoteTemplate,
    features: [
      'Professionelles Layout',
      'Optionale Preisanzeige',
      'Auto-Mehrseitigkeit',
      'Firmen-Branding',
    ],
    preview: '/templates/delivery-note-german-standard.jpg',
  },
  {
    id: 'german-multipage',
    name: 'German Multi-Page',
    description: 'Mehrseitige Lieferschein-Vorlage mit Header/Footer auf jeder Seite',
    component: GermanMultiPageDeliveryNoteTemplate,
    features: [
      'Mehrseitig',
      'Header/Footer auf jeder Seite',
      'Automatische Seitenumbrüche',
      'Print-optimiert',
    ],
    preview: '/templates/delivery-note-german-multipage.jpg',
  },
] as const;

// Default Template
export const DEFAULT_DELIVERY_NOTE_TEMPLATE: DeliveryNoteTemplate = 'german-standard';

// Helper Functions
export const getDeliveryNoteTemplateById = (templateId: string) => {
  return AVAILABLE_DELIVERY_NOTE_TEMPLATES.find(template => template.id === templateId);
};

export const getDeliveryNoteTemplateComponent = (templateId: string) => {
  const template = getDeliveryNoteTemplateById(templateId);
  return template?.component;
};
