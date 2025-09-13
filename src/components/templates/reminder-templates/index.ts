// Reminder Templates Export
import { ProfessionalReminderTemplate } from './ProfessionalReminderTemplate';
import { ExecutiveReminderTemplate } from './ExecutiveReminderTemplate';
import { CreativeReminderTemplate } from './CreativeReminderTemplate';
import { CorporateReminderTemplate } from './CorporateReminderTemplate';
import { MinimalistReminderTemplate } from './MinimalistReminderTemplate';
import { TechReminderTemplate } from './TechReminderTemplate';

export { 
  ProfessionalReminderTemplate,
  ExecutiveReminderTemplate,
  CreativeReminderTemplate,
  CorporateReminderTemplate,
  MinimalistReminderTemplate,
  TechReminderTemplate
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
    name: 'Professional Reminder',
    description: 'Modern & firm reminder design with clear urgency indicators',
    features: ['Professional', 'Clear', 'Urgent'],
    component: ProfessionalReminderTemplate
  },
  {
    id: 'executive-reminder',
    name: 'Executive Reminder',
    description: 'Elegant reminder with premium styling',
    features: ['Premium', 'Elegant', 'Formal'],
    component: ExecutiveReminderTemplate
  },
  {
    id: 'creative-reminder',
    name: 'Creative Reminder',
    description: 'Bold reminder with vibrant warning colors',
    features: ['Creative', 'Bold', 'Vibrant'],
    component: CreativeReminderTemplate
  },
  {
    id: 'corporate-reminder',
    name: 'Corporate Reminder',
    description: 'Traditional business reminder format',
    features: ['Traditional', 'Corporate', 'Formal'],
    component: CorporateReminderTemplate
  },
  {
    id: 'minimalist-reminder',
    name: 'Minimalist Reminder',
    description: 'Clean reminder with minimal design',
    features: ['Minimalist', 'Clean', 'Simple'],
    component: MinimalistReminderTemplate
  },
  {
    id: 'tech-reminder',
    name: 'Tech Reminder',
    description: 'Modern tech-style reminder with dynamic elements',
    features: ['Tech', 'Modern', 'Dynamic'],
    component: TechReminderTemplate
  }
];