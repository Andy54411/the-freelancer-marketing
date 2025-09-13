export { ProfessionalBusinessLetterTemplate } from './ProfessionalBusinessLetterTemplate';
export { ExecutivePremiumLetterTemplate } from './ExecutivePremiumLetterTemplate';
export { CreativeModernLetterTemplate } from './CreativeModernLetterTemplate';
export { MinimalistElegantLetterTemplate } from './MinimalistElegantLetterTemplate';
export { CorporateClassicLetterTemplate } from './CorporateClassicLetterTemplate';
export { TechInnovationLetterTemplate } from './TechInnovationLetterTemplate';

export const letterTemplates = [
  {
    id: 'professional-business-letter',
    name: 'Professional Business',
    description: 'Clean and professional business letter template',
    component: 'ProfessionalBusinessLetterTemplate'
  },
  {
    id: 'executive-premium-letter',
    name: 'Executive Premium',
    description: 'Sophisticated executive-level correspondence',
    component: 'ExecutivePremiumLetterTemplate'
  },
  {
    id: 'creative-modern-letter',
    name: 'Creative Modern',
    description: 'Vibrant and creative letter design with gradients',
    component: 'CreativeModernLetterTemplate'
  },
  {
    id: 'minimalist-elegant-letter',
    name: 'Minimalist Elegant',
    description: 'Clean minimalist letter template',
    component: 'MinimalistElegantLetterTemplate'
  },
  {
    id: 'corporate-classic-letter',
    name: 'Corporate Classic',
    description: 'Traditional corporate correspondence template',
    component: 'CorporateClassicLetterTemplate'
  },
  {
    id: 'tech-innovation-letter',
    name: 'Tech Innovation',
    description: 'Terminal-style tech correspondence interface',
    component: 'TechInnovationLetterTemplate'
  }
];

export const defaultLetterTemplate = letterTemplates[0];