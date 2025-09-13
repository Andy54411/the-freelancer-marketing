// Reminder Templates Export – alle Varianten nutzen die professionelle Basis mit leichten Theme-Abweichungen
import { ProfessionalReminderTemplate } from './ProfessionalReminderTemplate';
import { ExecutiveReminderTemplate } from './ExecutiveReminderTemplate';
import { CorporateReminderTemplate } from './CorporateReminderTemplate';
import { MinimalistReminderTemplate } from './MinimalistReminderTemplate';
import { CreativeReminderTemplate } from './CreativeReminderTemplate';
import { TechReminderTemplate } from './TechReminderTemplate';

export {
  ProfessionalReminderTemplate,
  ExecutiveReminderTemplate,
  CorporateReminderTemplate,
  MinimalistReminderTemplate,
  CreativeReminderTemplate,
  TechReminderTemplate,
};

// Reminder Template Types
export interface ReminderTemplateInfo {
  id: string;
  name: string;
  description: string;
  features: string[];
  component: React.ComponentType<any>;
}

// Available Reminder Templates
export const REMINDER_TEMPLATES: ReminderTemplateInfo[] = [
  {
    id: 'professional-reminder',
    name: 'Mahnung (Professionell)',
    description: 'Neutrales, professionelles Layout – klare Struktur, DIN-nahe Typografie',
    features: ['Neutral', 'Deutsch', 'DIN-nah'],
    component: ProfessionalReminderTemplate,
  },
  {
    id: 'executive-reminder',
    name: 'Mahnung (Executive)',
    description: 'Wie Professionell, dezente Executive-Akzente',
    features: ['Neutral', 'Deutsch', 'dezente Akzente'],
    component: ExecutiveReminderTemplate,
  },
  {
    id: 'corporate-reminder',
    name: 'Mahnung (Corporate)',
    description: 'Wie Professionell, leicht corporate-geprägt',
    features: ['Neutral', 'Deutsch', 'Corporate-Akzent'],
    component: CorporateReminderTemplate,
  },
  {
    id: 'minimalist-reminder',
    name: 'Mahnung (Minimalistisch)',
    description: 'Wie Professionell, besonders reduzierte Akzente',
    features: ['Neutral', 'Deutsch', 'reduziert'],
    component: MinimalistReminderTemplate,
  },
  {
    id: 'modern-reminder',
    name: 'Mahnung (Modern)',
    description: 'Wie Professionell, moderne neutrale Akzente',
    features: ['Neutral', 'Deutsch', 'modern'],
    component: CreativeReminderTemplate,
  },
  {
    id: 'tech-reminder',
    name: 'Mahnung (Tech)',
    description: 'Wie Professionell, Tech-Akzente',
    features: ['Neutral', 'Deutsch', 'Tech-Akzent'],
    component: TechReminderTemplate,
  },
];
