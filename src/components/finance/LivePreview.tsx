'use client';

import React from 'react';
import ProfessionalBusinessTemplate from '@/components/templates/invoice-templates/ProfessionalBusinessTemplate';
import { InvoiceData } from '@/types/invoiceTypes';

interface LivePreviewProps {
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

export function LivePreview({ invoiceData, companySettings }: LivePreviewProps) {
  // Einfache Daten-Vorbereitung für Live Preview
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
    companyLogo: companySettings?.companyLogo || '',
    companyVatId: companySettings?.vatId || '',
    companyTaxNumber: companySettings?.taxNumber || '',
    items: invoiceData.items || [
      {
        id: 'placeholder',
        description: 'Beispiel Dienstleistung',
        quantity: 1,
        unitPrice: 100.0,
        total: 100.0,
      },
    ],
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

  return (
    <div
      className="w-full h-full overflow-hidden bg-white"
      style={{
        transform: 'scale(0.25)',
        transformOrigin: 'top left',
        width: '400%',
        height: '400%',
      }}
    >
      <ProfessionalBusinessTemplate
        data={{
          documentNumber: previewData.invoiceNumber,
          date: previewData.issueDate,
          dueDate: previewData.dueDate,
          customer: {
            name: previewData.customerName,
            email: previewData.customerEmail || '',
            address: {
              street: (previewData.customerAddress || '').split('\n')[0] || '',
              zipCode: (previewData.customerAddress || '').split('\n')[1]?.split(' ')[0] || '',
              city:
                (previewData.customerAddress || '').split('\n')[1]?.split(' ').slice(1).join(' ') ||
                '',
              country: 'Deutschland',
            },
          },
          company: {
            name: previewData.companyName,
            email: previewData.companyEmail,
            phone: previewData.companyPhone || '',
            address: {
              street: (previewData.companyAddress || '').split('\n')[0] || '',
              zipCode: (previewData.companyAddress || '').split('\n')[1]?.split(' ')[0] || '',
              city:
                (previewData.companyAddress || '').split('\n')[1]?.split(' ').slice(1).join(' ') ||
                '',
              country: 'Deutschland',
            },
            taxNumber: previewData.companyTaxNumber || '',
            vatId: previewData.companyVatId || '',
            bankDetails: {
              iban: previewData.bankDetails?.iban || '',
              bic: previewData.bankDetails?.bic || '',
              accountHolder: previewData.bankDetails?.accountHolder || '',
            },
          },
          items: (previewData.items || []).map((i, idx) => ({
            description: i.description || `Position ${idx + 1}`,
            quantity: (i as any).quantity || 1,
            unit: (i as any).unit || 'Stk.',
            unitPrice: (i as any).unitPrice || (i.total ? i.total : 0),
            total: i.total || ((i as any).unitPrice || 0) * ((i as any).quantity || 1),
          })),
          subtotal: previewData.amount || 0,
          taxRate: previewData.vatRate || 19,
          taxAmount: previewData.tax || 0,
          total: previewData.total || 0,
          paymentTerms: previewData.paymentTerms || '',
          notes: previewData.notes || '',
          status: previewData.status || 'draft',
          isSmallBusiness: previewData.isSmallBusiness || false,
        }}
      />
    </div>
  );
}
