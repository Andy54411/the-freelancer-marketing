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
    description: 'Elegantes, dunkles Header-Design für gehobene Business-Ansprüche.',
    features: ['Akzentfarben', 'Header-Block', 'Kompakter Fußbereich'],
  },
  {
    id: 'creative-modern-quote',
    name: 'Kreativ Modern',
    description: 'Modernes, freundliches Layout mit dezenten Farbflächen.',
    features: ['Badge-Elemente', 'Leichte Akzente', 'Klarer Tabellenstil'],
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
    description: 'Klassisches Corporate-Design mit klaren Hierarchien.',
    features: ['Formale Struktur', 'Klarer Kopfbereich', 'Serifentypografie optional'],
  },
  {
    id: 'tech-innovation-quote',
    name: 'Tech Innovation',
    description: 'Tech-inspiriertes Layout mit prägnanten Kontrasten.',
    features: ['High-Contrast', 'Markante Akzente', 'Kompatibel mit dunklen Logos'],
  },
];

export const DEFAULT_QUOTE_TEMPLATE: QuoteTemplate = 'professional-business-quote';