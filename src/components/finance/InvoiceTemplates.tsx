import React from 'react';
import {
  ProfessionalBusinessTemplate,
  CorporateClassicTemplate,
  ExecutivePremiumTemplate,
  MinimalistElegantTemplate,
  CreativeModernTemplate,
  TechStartupTemplate,
} from '@/components/templates/invoice-templates';

// Kompatibilität: Re-exportiere den zentralen Invoice-Datentyp
export type { InvoiceData } from '@/types/invoiceTypes';

// String-Union der neuen Rechnungs-Template-IDs
export type InvoiceTemplate =
  | 'professional-business'
  | 'corporate-classic'
  | 'executive-premium'
  | 'minimalist-elegant'
  | 'creative-modern'
  | 'tech-startup';

// Zentrale Liste verfügbarer Rechnungs-Templates für Renderer/Picker
export const AVAILABLE_TEMPLATES: Array<{
  id: InvoiceTemplate;
  name: string;
  component: React.ComponentType<{ data: any; companySettings?: any; customizations?: any }>;
}> = [
  { id: 'professional-business', name: 'Klassisch Professionell', component: ProfessionalBusinessTemplate },
  { id: 'corporate-classic', name: 'Corporate Klassisch', component: CorporateClassicTemplate },
  { id: 'executive-premium', name: 'Executive Premium', component: ExecutivePremiumTemplate },
  { id: 'minimalist-elegant', name: 'Minimalistisch Elegant', component: MinimalistElegantTemplate },
  { id: 'creative-modern', name: 'Kreativ Modern', component: CreativeModernTemplate },
  { id: 'tech-startup', name: 'Tech Startup', component: TechStartupTemplate },
];

export const DEFAULT_INVOICE_TEMPLATE: InvoiceTemplate = 'professional-business';

export interface InvoiceTemplateRendererProps {
  template: InvoiceTemplate;
  data: any;
  preview?: boolean;
  onRender?: (html: string) => void;
}

export const InvoiceTemplateRenderer: React.FC<InvoiceTemplateRendererProps> = ({
  template,
  data,
  preview: _preview = false,
  onRender: _onRender,
}) => {
  const templateConfig = AVAILABLE_TEMPLATES.find(t => t.id === template);

  if (!templateConfig) {
    return <div>Template nicht gefunden: {template}</div>;
  }

  const TemplateComponent = templateConfig.component as any;

  // Übergib Daten; optionale companySettings/customizations können später ergänzt werden
  return <TemplateComponent data={data} />;
};
