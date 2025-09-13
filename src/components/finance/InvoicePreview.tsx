'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Eye, Printer } from 'lucide-react';
import { GermanStandardTemplate } from '../templates/templates/GermanStandardTemplate';
import { InvoiceData } from '@/types/invoiceTypes';

interface InvoicePreviewProps {
  invoiceData: Partial<InvoiceData>;
  companySettings?: {
    companyName?: string;
    companyAddress?: string;
    companyEmail?: string;
    companyPhone?: string;
    companyWebsite?: string;
    companyLogo?: string;
    profilePictureURL?: string;
    vatId?: string;
    taxNumber?: string;
    ust?: string;
    iban?: string;
    accountHolder?: string;
    bankName?: string;
    bic?: string;
    isSmallBusiness?: boolean;
  };
}

export function InvoicePreview({ invoiceData, companySettings }: InvoicePreviewProps) {
  // Einfache Daten-Vorbereitung
  const previewData: InvoiceData = {
    id: 'preview',
    number: invoiceData.invoiceNumber || 'R-2025-000',
    invoiceNumber: invoiceData.invoiceNumber || 'R-2025-000',
    sequentialNumber: 0,
    date: invoiceData.issueDate || new Date().toISOString().split('T')[0],
    issueDate: invoiceData.issueDate || new Date().toISOString().split('T')[0],
    dueDate: invoiceData.dueDate || new Date().toISOString().split('T')[0],
    customerName: invoiceData.customerName || 'Kunde auswählen...',
    customerAddress: invoiceData.customerAddress || 'Kundenadresse',
    customerEmail: invoiceData.customerEmail || '',
    description: invoiceData.description || '',
    companyName: companySettings?.companyName || 'Ihr Unternehmen',
    companyAddress: companySettings?.companyAddress || 'Ihre Adresse',
    companyEmail: companySettings?.companyEmail || 'info@ihrunternehmen.de',
    companyPhone: companySettings?.companyPhone || '+49 123 456789',
    companyWebsite: companySettings?.companyWebsite || '',
    companyLogo: companySettings?.companyLogo || companySettings?.profilePictureURL || '',
    profilePictureURL: companySettings?.profilePictureURL || '',
    logo: companySettings?.profilePictureURL || companySettings?.companyLogo || '',
    companyVatId: companySettings?.vatId || '',
    companyTaxNumber: companySettings?.taxNumber || '',
    items: invoiceData.items || [],
    amount: invoiceData.amount || 0,
    tax: invoiceData.tax || 0,
    total: invoiceData.total || 0,
    status: 'draft',
    createdAt: new Date(),
    year: new Date().getFullYear(),
    companyId: 'preview',
    isStorno: false,
    isSmallBusiness:
      companySettings?.ust === 'kleinunternehmer' || companySettings?.isSmallBusiness || false,
    vatRate: 19,
    priceInput: 'netto' as const,
    taxNote:
      invoiceData.taxNote ||
      (companySettings?.ust === 'kleinunternehmer' ? 'kleinunternehmer' : 'none'),
    bankDetails: companySettings?.iban
      ? {
          iban: companySettings.iban,
          bic: companySettings.bic,
          accountHolder: companySettings.accountHolder || '',
          bankName: companySettings.bankName,
        }
      : undefined,
    paymentTerms: invoiceData.paymentTerms || '',
    skontoEnabled: invoiceData.skontoEnabled || false,
    skontoDays: invoiceData.skontoDays || 3,
    skontoPercentage: invoiceData.skontoPercentage || 2.0,
    skontoText: invoiceData.skontoText || '',
    notes: invoiceData.notes || '',
  };

  const handlePrint = () => {
    // Erstelle ein neues Fenster nur für das Template
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return;
    }

    // Hole alle Styles aus dem aktuellen Dokument
    const allStyles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch (e) {
          return '';
        }
      })
      .join('\n');

    // Erstelle das HTML für das Print-Fenster mit dem Template
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rechnung ${previewData.invoiceNumber}</title>
          <meta charset="utf-8">
          <style>
            ${allStyles}
            
            /* A4 Print-Styles */
            @media print {
              @page {
                size: A4;
                margin: 0.5in;
              }
              body {
                margin: 0;
                padding: 0;
                background: white;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
                print-color-adjust: exact;
              }
              * {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div id="print-content"></div>
        </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();

    // Warte bis das Dokument geladen ist
    printWindow.onload = () => {
      // Rendere das Template direkt ins Print-Fenster
      import('react-dom/client').then(({ createRoot }) => {
        const container = printWindow.document.getElementById('print-content');
        if (container) {
          const root = createRoot(container);
          root.render(React.createElement(GermanStandardTemplate, { data: previewData }));

          // Warte bis React gerendert hat, dann drucke
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 500);
        }
      });
    };
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Eye className="h-4 w-4 mr-2" />
          Vorschau anzeigen
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Rechnungsvorschau
            </DialogTitle>
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Drucken
            </Button>
          </div>
        </DialogHeader>

        <div className="bg-white">
          <GermanStandardTemplate data={previewData} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
