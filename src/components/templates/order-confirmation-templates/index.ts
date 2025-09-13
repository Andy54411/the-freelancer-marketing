export { ProfessionalBusinessOrderTemplate } from './ProfessionalBusinessOrderTemplate';
export { ExecutivePremiumOrderTemplate } from './ExecutivePremiumOrderTemplate';
export { CreativeModernOrderTemplate } from './CreativeModernOrderTemplate';
export { MinimalistElegantOrderTemplate } from './MinimalistElegantOrderTemplate';
export { CorporateClassicOrderTemplate } from './CorporateClassicOrderTemplate';
export { TechInnovationOrderTemplate } from './TechInnovationOrderTemplate';

export const orderConfirmationTemplates = [
  {
    id: 'professional-business-order',
    name: 'Professional Business',
    description: 'Clean and professional order confirmation design',
    component: 'ProfessionalBusinessOrderTemplate'
  },
  {
    id: 'executive-premium-order',
    name: 'Executive Premium',
    description: 'Sophisticated executive-level order confirmation',
    component: 'ExecutivePremiumOrderTemplate'
  },
  {
    id: 'creative-modern-order',
    name: 'Creative Modern',
    description: 'Vibrant and creative order confirmation with gradients',
    component: 'CreativeModernOrderTemplate'
  },
  {
    id: 'minimalist-elegant-order',
    name: 'Minimalist Elegant',
    description: 'Clean minimalist order confirmation design',
    component: 'MinimalistElegantOrderTemplate'
  },
  {
    id: 'corporate-classic-order',
    name: 'Corporate Classic',
    description: 'Traditional corporate order confirmation template',
    component: 'CorporateClassicOrderTemplate'
  },
  {
    id: 'tech-innovation-order',
    name: 'Tech Innovation',
    description: 'Terminal-style tech order confirmation interface',
    component: 'TechInnovationOrderTemplate'
  }
];

export const defaultOrderConfirmationTemplate = orderConfirmationTemplates[0];