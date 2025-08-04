'use client';

import React from 'react';
import { generateInvoiceHTML, type InvoiceTemplate } from '@/lib/invoice-templates';
import { InvoiceData, InvoiceItem } from '@/types/invoiceTypes';

// Re-export types for compatibility
export type { InvoiceTemplate, InvoiceData, InvoiceItem };

interface InvoiceTemplateProps {
  template: InvoiceTemplate;
  data: InvoiceData;
  preview?: boolean;
}

// Unified Template Renderer using centralized HTML templates
export function InvoiceTemplateRenderer({ template, data, preview = false }: InvoiceTemplateProps) {
  const htmlContent = generateInvoiceHTML(data, template);

  return (
    <div
      className={`
        bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm
        ${preview ? 'max-w-lg scale-90 transform-origin-top-left' : 'w-full'}
      `}
    >
      <div
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        className={`
          invoice-preview
          ${preview ? 'p-4' : 'p-6'}
        `}
        style={{
          fontSize: preview ? '12px' : '14px',
          lineHeight: '1.4',
        }}
      />
    </div>
  );
}

// Template metadata for selection
export const INVOICE_TEMPLATES = [
  {
    id: 'classic' as InvoiceTemplate,
    name: 'Klassisch',
    description: 'Traditionelles Geschäftsdesign mit klarer Struktur',
    preview: '/api/placeholder/invoice-classic.jpg',
  },
  {
    id: 'modern' as InvoiceTemplate,
    name: 'Modern',
    description: 'Zeitgemäßes Design mit Taskilo-Branding',
    preview: '/api/placeholder/invoice-modern.jpg',
  },
  {
    id: 'minimal' as InvoiceTemplate,
    name: 'Minimal',
    description: 'Reduziertes, elegantes Design',
    preview: '/api/placeholder/invoice-minimal.jpg',
  },
  {
    id: 'corporate' as InvoiceTemplate,
    name: 'Corporate',
    description: 'Professionelles Unternehmensdesign',
    preview: '/api/placeholder/invoice-corporate.jpg',
  },
  {
    id: 'creative' as InvoiceTemplate,
    name: 'Kreativ',
    description: 'Farbenfrohes, modernes Design',
    preview: '/api/placeholder/invoice-creative.jpg',
  },
  {
    id: 'german-standard' as InvoiceTemplate,
    name: 'Deutsch Standard',
    description: 'GoBD-konformes deutsches Rechnungsformat mit Storno-Unterstützung',
    preview: '/api/placeholder/invoice-german.jpg',
  },
];

// Legacy component exports for backward compatibility (using centralized templates)
export function ClassicTemplate({ data, preview }: Omit<InvoiceTemplateProps, 'template'>) {
  return <InvoiceTemplateRenderer template="classic" data={data} preview={preview} />;
}

export function ModernTemplate({ data, preview }: Omit<InvoiceTemplateProps, 'template'>) {
  return <InvoiceTemplateRenderer template="modern" data={data} preview={preview} />;
}

export function MinimalTemplate({ data, preview }: Omit<InvoiceTemplateProps, 'template'>) {
  return <InvoiceTemplateRenderer template="minimal" data={data} preview={preview} />;
}

export function CorporateTemplate({ data, preview }: Omit<InvoiceTemplateProps, 'template'>) {
  return <InvoiceTemplateRenderer template="corporate" data={data} preview={preview} />;
}

export function CreativeTemplate({ data, preview }: Omit<InvoiceTemplateProps, 'template'>) {
  return <InvoiceTemplateRenderer template="creative" data={data} preview={preview} />;
}

export function GermanStandardTemplate({ data, preview }: Omit<InvoiceTemplateProps, 'template'>) {
  return <InvoiceTemplateRenderer template="german-standard" data={data} preview={preview} />;
}
