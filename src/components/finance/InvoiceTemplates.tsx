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
  description: string;
  component: React.ComponentType<{ data: any; companySettings?: any; customizations?: any }>;
}> = [
  { 
    id: 'professional-business',
    name: 'Klassisch Professionell',
    description: 'GoBD-konformes Standardtemplate für deutsche Unternehmen',
    component: ProfessionalBusinessTemplate 
  },
  { 
    id: 'corporate-classic',
    name: 'Corporate Klassisch',
    description: 'Professionelles Template mit Corporate Design-Elementen',
    component: CorporateClassicTemplate 
  },
  { 
    id: 'executive-premium',
    name: 'Executive Premium',
    description: 'Hochwertige Gestaltung für gehobene Ansprüche',
    component: ExecutivePremiumTemplate 
  },
  { 
    id: 'minimalist-elegant',
    name: 'Minimalistisch Elegant',
    description: 'Reduziertes Design mit klarer Struktur',
    component: MinimalistElegantTemplate 
  },
  { 
    id: 'creative-modern',
    name: 'Kreativ Modern',
    description: 'Modernes Design für kreative Unternehmen',
    component: CreativeModernTemplate 
  },
  { 
    id: 'tech-startup',
    name: 'Tech Startup',
    description: 'Innovatives Design für Tech-Unternehmen',
    component: TechStartupTemplate 
  },
];

// Standard Template für normale Rechnungen
export const DEFAULT_INVOICE_TEMPLATE: InvoiceTemplate = 'professional-business';

// Template-Konstanten für verschiedene Dokumenttypen
export const DOCUMENT_TYPE_TEMPLATES = {
  invoice: 'professional-business',
  reminder: 'professional-business', // Nutze Business Template auch für Mahnungen
  quote: 'professional-business',
  delivery: 'professional-business'
} as const;

export interface InvoiceTemplateRendererProps {
  template: InvoiceTemplate;
  data: any;
  preview?: boolean;
  onRender?: (html: string) => void;
  companySettings?: any;
  customizations?: {
    showLogo?: boolean;
    [key: string]: any;
  };
}

export const InvoiceTemplateRenderer: React.FC<InvoiceTemplateRendererProps> = ({
  template,
  data,
  preview = false,
  onRender,
  companySettings,
  customizations = { showLogo: true }
}) => {
  // Ensure data.company and bankDetails are properly structured
  const normalizedData = {
    ...data,
    company: {
      ...data?.company,
      bankDetails: data?.company?.bankDetails || data?.bankDetails || {}
    }
  };
  
  const templateConfig = AVAILABLE_TEMPLATES.find(t => t.id === template);

  if (!templateConfig) {
    console.warn(`Template ${template} nicht gefunden, verwende Standard-Template`);
    return <ProfessionalBusinessTemplate data={data} companySettings={companySettings} customizations={customizations} />;
  }

  const TemplateComponent = templateConfig.component as any;

  // Einheitliche Props für alle Templates
  return (
    <TemplateComponent 
      data={data}
      companySettings={companySettings}
      customizations={customizations}
      preview={preview}
      onRender={onRender}
    />
  );
};
