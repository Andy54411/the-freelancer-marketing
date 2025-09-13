// Quote Templates Export (neue Struktur mit -quote IDs)
export { ProfessionalBusinessQuoteTemplate } from './ProfessionalBusinessQuoteTemplate';
export { ExecutivePremiumQuoteTemplate } from './ExecutivePremiumQuoteTemplate';
export { CreativeModernQuoteTemplate } from './CreativeModernQuoteTemplate';
export { MinimalistElegantQuoteTemplate } from './MinimalistElegantQuoteTemplate';
export { CorporateClassicQuoteTemplate } from './CorporateClassicQuoteTemplate';
export { TechInnovationQuoteTemplate } from './TechInnovationQuoteTemplate';

export type QuoteTemplate =
  | 'professional-business-quote'
  | 'executive-premium-quote'
  | 'creative-modern-quote'
  | 'minimalist-elegant-quote'
  | 'corporate-classic-quote'
  | 'tech-innovation-quote';

export const AVAILABLE_QUOTE_TEMPLATES: ReadonlyArray<{
  id: QuoteTemplate;
  name: string;
  description?: string;
  preview?: string;
  features?: string[];
}> = [
  {
    id: 'professional-business-quote',
    name: 'Klassisch Professionell',
    description: 'Seriöses Layout mit klarer Typografie und strukturierter Leistungsübersicht.',
    features: ['Mehrspaltig', 'Zwischensummen', 'Bank-/Steuerdaten'],
  },
  {
    id: 'executive-premium-quote',
    name: 'Executive Premium',
    description: 'Elegantes, dezentes Layout mit klarer Struktur und professioneller Typografie.',
    features: ['Dezente Farben', 'Klarer Kopfbereich', 'Kompakter Fußbereich'],
  },
  {
    id: 'creative-modern-quote',
    name: 'Kreativ Modern',
    description: 'Modernes, freundliches Layout in neutraler Farbgebung.',
    features: ['Dezente Akzente', 'Klarer Tabellenstil', 'Gut lesbare Typografie'],
  },
  {
    id: 'minimalist-elegant-quote',
    name: 'Minimalistisch Elegant',
    description: 'Sehr reduzierte Darstellung mit maximaler Lesbarkeit.',
    features: ['Schlanke Linien', 'Reduzierte Farben', 'DIN-orientiert'],
  },
  {
    id: 'corporate-classic-quote',
    name: 'Corporate Klassisch',
    description: 'Klassisches, neutrales Unternehmenslayout mit klaren Hierarchien.',
    features: ['Formale Struktur', 'Klarer Kopfbereich', 'Serifen- oder Sans-Typo'],
  },
  {
    id: 'tech-innovation-quote',
    name: 'Tech Innovation',
    description: 'Tech-inspiriertes, neutrales Layout ohne starke Kontraste.',
    features: ['Sachlich', 'Sachliche Akzente', 'Kompatibel mit Logos'],
  },
];

export const DEFAULT_QUOTE_TEMPLATE: QuoteTemplate = 'professional-business-quote';
