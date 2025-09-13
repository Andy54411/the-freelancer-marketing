import ProfessionalBusinessDeliveryTemplate from './ProfessionalBusinessDeliveryTemplate';
import ExecutivePremiumDeliveryTemplate from './ExecutivePremiumDeliveryTemplate';
import CreativeModernDeliveryTemplate from './CreativeModernDeliveryTemplate';
import MinimalistElegantDeliveryTemplate from './MinimalistElegantDeliveryTemplate';
import BusinessStandardDeliveryTemplate from './BusinessStandardDeliveryTemplate';
import TechInnovationDeliveryTemplate from './TechInnovationDeliveryTemplate';
import { ModernCleanDeliveryTemplate } from './ModernCleanDeliveryTemplate';

export {
  ProfessionalBusinessDeliveryTemplate,
  ExecutivePremiumDeliveryTemplate,
  CreativeModernDeliveryTemplate,
  MinimalistElegantDeliveryTemplate,
  TechInnovationDeliveryTemplate,
  BusinessStandardDeliveryTemplate,
};

export type DeliveryNoteTemplate =
  | 'professional-business-delivery'
  | 'executive-premium-delivery'
  | 'creative-modern-delivery'
  | 'minimalist-elegant-delivery'
  | 'tech-innovation-delivery'
  | 'business-standard-delivery'
  | 'modern-clean-delivery';

export const AVAILABLE_DELIVERY_NOTE_TEMPLATES = [
  {
    id: 'professional-business-delivery',
    name: 'Klassisch Professionell',
    description: 'Seriöses, neutrales Layout mit klarer Typografie',
    component: ProfessionalBusinessDeliveryTemplate,
  },
  {
    id: 'executive-premium-delivery',
    name: 'Executive Premium',
    description: 'Elegantes, dezentes Layout für gehobene Ansprüche',
    component: ExecutivePremiumDeliveryTemplate,
  },
  {
    id: 'creative-modern-delivery',
    name: 'Kreativ Modern',
    description: 'Moderne, klare Struktur – neutral und professionell',
    component: CreativeModernDeliveryTemplate,
  },
  {
    id: 'minimalist-elegant-delivery',
    name: 'Minimalistisch Elegant',
    description: 'Minimal, reduziert und sehr übersichtlich',
    component: MinimalistElegantDeliveryTemplate,
  },
  {
    id: 'tech-innovation-delivery',
    name: 'Tech Innovation',
    description: 'Zeitgemäße Tech-Ästhetik, neutral und klar',
    component: TechInnovationDeliveryTemplate,
  },
  {
    id: 'business-standard-delivery',
    name: 'Business Standard (DIN-orientiert)',
    description: 'Klares, rechtssicheres B2B-Layout nach DIN-Logik',
    component: BusinessStandardDeliveryTemplate,
  },
  {
    id: 'modern-clean-delivery',
    name: 'Modern & Sauber',
    description: 'Ein modernes, sauberes und ansprechendes Design',
    component: ModernCleanDeliveryTemplate,
  },
] as const;
