import React from 'react';
import { ProfessionalBusinessTemplate } from '@/components/templates/invoice-templates';

// Kompatibilität: Re-exportiere den zentralen Invoice-Datentyp
export type { InvoiceData } from '@/types/invoiceTypes';

// Nur noch ein universelles Template für alle Dokumenttypen
export type InvoiceTemplate = 'professional-business';

// Universelles Template für alle Dokumenttypen (Rechnungen, Angebote, Mahnungen, Gutscheine, etc.)
export const AVAILABLE_TEMPLATES: Array<{
  id: InvoiceTemplate;
  name: string;
  description: string;
  component: React.ComponentType<{ data: any; companySettings?: any; customizations?: any }>;
}> = [
  {
    id: 'professional-business',
    name: 'Universelles Template',
    description:
      'Dynamisches Template für alle Dokumenttypen - GoBD-konform für deutsche Unternehmen',
    component: ProfessionalBusinessTemplate,
  },
];

// Standard Template für normale Rechnungen
export const DEFAULT_INVOICE_TEMPLATE: InvoiceTemplate = 'professional-business';

// Template-Konstanten für verschiedene Dokumenttypen
export const DOCUMENT_TYPE_TEMPLATES = {
  invoice: 'professional-business',
  reminder: 'professional-business', // Nutze Business Template auch für Mahnungen
  quote: 'professional-business',
  delivery: 'professional-business',
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
  customizations = { showLogo: true },
}) => {
  // Ensure data.company and bankDetails are properly structured
  const normalizedData = {
    ...data,
    company: {
      ...data?.company,
      bankDetails: data?.company?.bankDetails || data?.bankDetails || {},
    },
  };

  const templateConfig = AVAILABLE_TEMPLATES.find(t => t.id === template);

  if (!templateConfig) {
    console.warn(`Template ${template} nicht gefunden, verwende Standard-Template`);
    return (
      <ProfessionalBusinessTemplate
        data={data}
        companySettings={companySettings}
        customizations={customizations}
      />
    );
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
