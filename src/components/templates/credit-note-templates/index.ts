export { ProfessionalBusinessCreditTemplate } from './ProfessionalBusinessCreditTemplate';
export { ExecutivePremiumCreditTemplate } from './ExecutivePremiumCreditTemplate';
export { CreativeModernCreditTemplate } from './CreativeModernCreditTemplate';
export { MinimalistElegantCreditTemplate } from './MinimalistElegantCreditTemplate';
export { CorporateClassicCreditTemplate } from './CorporateClassicCreditTemplate';
export { TechInnovationCreditTemplate } from './TechInnovationCreditTemplate';

export const creditNoteTemplates = [
  {
    id: 'professional-business-credit',
    name: 'Professional Business',
    description: 'Clean and professional credit note design',
    component: 'ProfessionalBusinessCreditTemplate'
  },
  {
    id: 'executive-premium-credit',
    name: 'Executive Premium',
    description: 'Sophisticated executive-level credit note',
    component: 'ExecutivePremiumCreditTemplate'
  },
  {
    id: 'creative-modern-credit',
    name: 'Creative Modern',
    description: 'Vibrant and creative credit note with gradients',
    component: 'CreativeModernCreditTemplate'
  },
  {
    id: 'minimalist-elegant-credit',
    name: 'Minimalist Elegant',
    description: 'Clean minimalist credit note design',
    component: 'MinimalistElegantCreditTemplate'
  },
  {
    id: 'corporate-classic-credit',
    name: 'Corporate Classic',
    description: 'Traditional corporate credit note template',
    component: 'CorporateClassicCreditTemplate'
  },
  {
    id: 'tech-innovation-credit',
    name: 'Tech Innovation',
    description: 'Terminal-style tech credit note interface',
    component: 'TechInnovationCreditTemplate'
  }
];

export const defaultCreditNoteTemplate = creditNoteTemplates[0];