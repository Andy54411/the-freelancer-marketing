import React from 'react';
import { ProfessionalReminderTemplate } from './ProfessionalReminderTemplate';

interface TemplateProps {
  data: any;
  preview?: boolean;
}

export const TechReminderTemplate: React.FC<TemplateProps> = ({ data, preview = false }) => (
  <ProfessionalReminderTemplate data={data} preview={preview} themeVariant="tech" />
);
