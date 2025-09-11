'use client';

import React from 'react';
import { InvoiceTemplateRenderer, InvoiceTemplate } from './InvoiceTemplates';
import { InvoiceData } from '@/types/invoiceTypes';

interface LiveInvoicePreviewProps {
  invoiceData: Partial<InvoiceData>;
  template: InvoiceTemplate;
  companySettings?: {
    companyName?: string;
    companyAddress?: string;
    companyEmail?: string;
    companyPhone?: string;
    companyWebsite?: string;
    companyLogo?: string;
    vatId?: string;
    taxNumber?: string;
    companyRegister?: string;
    districtCourt?: string;
    legalForm?: string;
    ust?: string;
    iban?: string;
    accountHolder?: string;
    bankName?: string;
    bic?: string;
    isSmallBusiness?: boolean;
  };
}

/**
 * Live-Vorschau-Komponente für Rechnungen
 *
 * Diese Komponente zeigt eine Live-Vorschau der Rechnung während der Erstellung an.
 * Sie passt sich automatisch an die Bildschirmgröße an und zeigt das Template
 * in optimaler Größe für die Vorschau.
 */
export function LiveInvoicePreview({
  invoiceData,
  template,
  companySettings,
}: LiveInvoicePreviewProps) {
  // Create a complete invoice data object for live preview
  const previewData: InvoiceData = {
    // Basis-Identifikation
    id: 'preview-' + Date.now(),
    number: invoiceData.invoiceNumber || 'R-2025-000',
    invoiceNumber: invoiceData.invoiceNumber || 'R-2025-000',
    sequentialNumber: invoiceData.sequentialNumber || 1,

    // Datum-Informationen
    date: invoiceData.issueDate || new Date().toLocaleDateString('de-DE'),
    issueDate: invoiceData.issueDate || new Date().toLocaleDateString('de-DE'),
    dueDate:
      invoiceData.dueDate ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE'),

    // Kundendaten
    customerName: invoiceData.customerName || 'Beispiel Kunde',
    customerAddress: invoiceData.customerAddress || 'Musterstraße 123\n12345 Musterstadt',
    customerEmail: invoiceData.customerEmail || 'kunde@beispiel.de',

    // Rechnungsbeschreibung
    description: invoiceData.description || 'Dienstleistung',

    // Unternehmensdaten
    companyName: companySettings?.companyName || invoiceData.companyName || 'Ihr Unternehmen',
    companyAddress: companySettings?.companyAddress || invoiceData.companyAddress || 'Ihre Adresse',
    companyEmail: companySettings?.companyEmail || invoiceData.companyEmail || 'ihre@email.de',
    companyPhone: companySettings?.companyPhone || invoiceData.companyPhone || '+49 123 456789',
    companyWebsite:
      companySettings?.companyWebsite || invoiceData.companyWebsite || 'www.ihre-website.de',
    companyLogo: companySettings?.companyLogo || invoiceData.companyLogo || '',
    companyVatId: companySettings?.vatId || invoiceData.companyVatId || '',
    companyTaxNumber: companySettings?.taxNumber || invoiceData.companyTaxNumber || '',
    companyRegister: companySettings?.companyRegister || invoiceData.companyRegister || '',
    districtCourt: companySettings?.districtCourt || invoiceData.districtCourt || '',

    // Steuereinstellungen
    isSmallBusiness: companySettings?.isSmallBusiness || invoiceData.isSmallBusiness || false,
    vatRate: invoiceData.vatRate || 19,
    priceInput: 'netto' as const,

    // Finanzielle Daten
    items: invoiceData.items || [
      {
        id: 'example-1',
        description: 'Beispiel Dienstleistung',
        quantity: 1,
        unitPrice: 100.0,
        total: 100.0,
        taxRate: 19,
      },
    ],
    amount: invoiceData.amount || 100.0,
    tax: invoiceData.tax || 19.0,
    total: invoiceData.total || 119.0,

    // Status und Metadaten
    status: 'draft' as const,
    createdAt: new Date(),
    year: new Date().getFullYear(),
    companyId: 'preview',
    isStorno: false,

    // Optionale Zusatzfelder
    taxNote: invoiceData.taxNote,
    paymentTerms: invoiceData.paymentTerms || 'Zahlbar innerhalb von 30 Tagen.',
    notes: invoiceData.notes,
    bankDetails: {
      iban: companySettings?.iban || invoiceData.bankDetails?.iban || '',
      bic: companySettings?.bic || invoiceData.bankDetails?.bic || '',
      accountHolder: companySettings?.accountHolder || invoiceData.bankDetails?.accountHolder || '',
      bankName: companySettings?.bankName || invoiceData.bankDetails?.bankName || '',
    },
  };

  return (
    <div
      className="w-full h-full overflow-auto bg-gray-50 p-2"
      style={{
        zoom: 0.4,
        height: '600px',
        maxHeight: '600px',
      }}
    >
      <div className="flex justify-center">
        <InvoiceTemplateRenderer data={previewData} template={template} preview={true} />
      </div>
    </div>
  );
}
