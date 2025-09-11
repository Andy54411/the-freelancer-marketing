'use client';

import React from 'react';

// Import modular templates
import {
  GermanStandardTemplate,
  ModernBusinessTemplate,
  ClassicProfessionalTemplate,
  MinimalCleanTemplate,
  CorporateFormalTemplate,
  AVAILABLE_TEMPLATES,
  type InvoiceData,
  type InvoiceTemplate,
} from './templates';

// Default Template Konstante für die gesamte Anwendung
export const DEFAULT_INVOICE_TEMPLATE: InvoiceTemplate = 'german-standard';

// Main Template Props Interface
export interface InvoiceTemplateProps {
  template: InvoiceTemplate;
  data: InvoiceData;
  preview?: boolean;
}

// Main Template Renderer with modular templates
export function InvoiceTemplateRenderer({ template, data, preview = false }: InvoiceTemplateProps) {
  const TemplateComponent = () => {
    switch (template) {
      case 'german-standard':
        return <GermanStandardTemplate data={data} preview={preview} />;
      case 'modern-business':
        return <ModernBusinessTemplate data={data} preview={preview} />;
      case 'classic-professional':
        return <ClassicProfessionalTemplate data={data} preview={preview} />;
      case 'minimal-clean':
        return <MinimalCleanTemplate data={data} preview={preview} />;
      case 'corporate-formal':
        return <CorporateFormalTemplate data={data} preview={preview} />;
      default:
        return <GermanStandardTemplate data={data} preview={preview} />;
    }
  };

  return (
    <div
      className="bg-white shadow-sm"
      style={{
        width: '595px', // A4 width in pixels at 72 DPI
        minHeight: '842px', // A4 height in pixels at 72 DPI
        maxWidth: '595px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <TemplateComponent />
    </div>
  );
}

// Template metadata for selection
export const INVOICE_TEMPLATES = [
  {
    id: 'german-standard' as InvoiceTemplate,
    name: 'Deutsch Standard',
    description: 'GoBD-konform, E-Rechnungs-kompatibel, deutsche Rechtsrichtlinien',
    preview: '/api/placeholder/invoice-german.jpg',
    features: ['GoBD-konform', 'E-Rechnung', 'Rechtssicher', 'Vollständige Pflichtangaben'],
  },
  {
    id: 'modern-business' as InvoiceTemplate,
    name: 'Modern Business',
    description: 'Professionell mit Taskilo-Branding und modernem Design',
    preview: '/api/placeholder/invoice-modern.jpg',
    features: ['Taskilo-Branding', 'Gradient-Design', 'Professionell', 'Logos integriert'],
  },
  {
    id: 'classic-professional' as InvoiceTemplate,
    name: 'Klassisch Professionell',
    description: 'Traditionelles Geschäftsdesign, seriös und vertrauenswürdig',
    preview: '/api/placeholder/invoice-classic.jpg',
    features: ['Traditionell', 'Seriös', 'Business-Standard', 'Zeitlos'],
  },
  {
    id: 'minimal-clean' as InvoiceTemplate,
    name: 'Minimal Clean',
    description: 'Minimalistisches Design mit Fokus auf Klarheit und Lesbarkeit',
    preview: '/api/placeholder/invoice-minimal.jpg',
    features: ['Minimalistisch', 'Clean Design', 'Fokus auf Inhalt', 'Modern'],
  },
  {
    id: 'corporate-formal' as InvoiceTemplate,
    name: 'Corporate Formal',
    description: 'Formelles Corporate Design für große Unternehmen und B2B',
    preview: '/api/placeholder/invoice-corporate.jpg',
    features: ['Corporate Design', 'Formal', 'B2B-optimiert', 'Repräsentativ'],
  },
] as const;

// Utility function to get default German terms
export function getDefaultGermanTerms(isSmallBusiness = false, paymentTerms?: string) {
  if (isSmallBusiness) {
    return `Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.

Zahlungsbedingungen: ${paymentTerms || 'Zahlbar ohne Abzug binnen 14 Tagen nach Rechnungsstellung.'}

Diese Rechnung entspricht den Anforderungen des UStG und ist GoBD-konform archiviert.`;
  }

  return `Zahlungsbedingungen: ${paymentTerms || 'Zahlbar ohne Abzug binnen 14 Tagen nach Rechnungsstellung.'}

Diese Rechnung entspricht den Anforderungen des UStG §14 und ist GoBD-konform archiviert.`;
}

// Re-export types and templates
export type { InvoiceData, InvoiceTemplate } from './templates';
