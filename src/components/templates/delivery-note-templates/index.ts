// Delivery Note Templates Export
export type DeliveryNoteTemplate =
  | 'professional-business-delivery'
  | 'executive-premium-delivery'
  | 'creative-modern-delivery'
  | 'minimalist-elegant-delivery'
  | 'corporate-classic-delivery'
  | 'tech-innovation-delivery';
export { ProfessionalBusinessDeliveryTemplate } from './ProfessionalBusinessDeliveryTemplate';
export { ExecutivePremiumDeliveryTemplate } from './ExecutivePremiumDeliveryTemplate';
export { CreativeModernDeliveryTemplate } from './CreativeModernDeliveryTemplate';
export { MinimalistElegantDeliveryTemplate } from './MinimalistElegantDeliveryTemplate';
export { CorporateClassicDeliveryTemplate } from './CorporateClassicDeliveryTemplate';
export { TechInnovationDeliveryTemplate } from './TechInnovationDeliveryTemplate';

export const deliveryNoteTemplates: Array<{
  id: DeliveryNoteTemplate;
  name: string;
  description: string;
  component: string;
}> = [
  {
    id: 'professional-business-delivery',
    name: 'Professional Business',
    description: 'Professionelles Lieferschein-Design für Geschäftskunden',
    component: 'ProfessionalBusinessDeliveryTemplate'
  },
  {
    id: 'executive-premium-delivery',
    name: 'Executive Premium',
    description: 'Elegante Lieferdokumentation für Führungsebene',
    component: 'ExecutivePremiumDeliveryTemplate'
  },
  {
    id: 'creative-modern-delivery',
    name: 'Creative Modern',
    description: 'Modernes, professionelles Lieferschein-Design',
    component: 'CreativeModernDeliveryTemplate'
  },
  {
    id: 'minimalist-elegant-delivery',
    name: 'Minimalist Elegant',
    description: 'Klares und minimalistisches Lieferschein-Design',
    component: 'MinimalistElegantDeliveryTemplate'
  },
  {
    id: 'corporate-classic-delivery',
    name: 'Corporate Classic',
    description: 'Klassische Unternehmens-Lieferdokumentation',
    component: 'CorporateClassicDeliveryTemplate'
  },
  {
    id: 'tech-innovation-delivery',
    name: 'Tech Innovation',
    description: 'Professionelles Lieferschein-Design für Technologieunternehmen',
    component: 'TechInnovationDeliveryTemplate'
  }
];

export const defaultDeliveryNoteTemplate = deliveryNoteTemplates[0];

// Kompatibilitäts-Export für bestehende Finance-Komponenten
export const AVAILABLE_DELIVERY_NOTE_TEMPLATES: ReadonlyArray<{
  id: DeliveryNoteTemplate;
  name: string;
  description: string;
  component: string;
}> = deliveryNoteTemplates;