'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, Mail, Printer, FileText } from 'lucide-react';
import { InvoiceTemplateRenderer, InvoiceTemplate } from './InvoiceTemplates';
import { InvoiceData } from '@/types/invoiceTypes';

interface InvoicePreviewProps {
  invoiceData: Partial<InvoiceData>;
  template: InvoiceTemplate;
  trigger?: React.ReactNode;
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

export function InvoicePreview({
  invoiceData,
  template,
  trigger,
  companySettings,
}: InvoicePreviewProps) {
  // Create a complete invoice data object for preview
  const previewData: InvoiceData = {
    id: 'preview',
    number: invoiceData.invoiceNumber || 'R-2025-000',
    invoiceNumber: invoiceData.invoiceNumber || 'R-2025-000',
    sequentialNumber: 0,
    date: invoiceData.issueDate || new Date().toISOString().split('T')[0],
    issueDate: invoiceData.issueDate || new Date().toISOString().split('T')[0],
    dueDate: invoiceData.dueDate || new Date().toISOString().split('T')[0],
    customerName: invoiceData.customerName || 'Kunden auswählen...',
    customerAddress: invoiceData.customerAddress || 'Kundenadresse wird hier angezeigt',
    customerEmail: invoiceData.customerEmail || '',
    description: invoiceData.description || '',
    companyName: companySettings?.companyName || 'Ihr Unternehmen',
    companyAddress: companySettings?.companyAddress || 'Ihre Firmenadresse',
    companyEmail: companySettings?.companyEmail || 'info@ihrunternehmen.de',
    companyPhone: companySettings?.companyPhone || '+49 123 456789',
    companyWebsite: companySettings?.companyWebsite || '',
    companyLogo: companySettings?.companyLogo || '',
    companyVatId: companySettings?.vatId || '',
    companyTaxNumber: companySettings?.taxNumber || '',
    companyRegister: companySettings?.companyRegister,
    districtCourt: companySettings?.districtCourt,
    legalForm: companySettings?.legalForm,
    companyTax: companySettings?.taxNumber,
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
  };

  const handleDownloadPDF = () => {
    // In real app: Generate and download PDF
  };

  const handleSendEmail = () => {
    // In real app: Send invoice via email
  };

  const handlePrint = () => {
    // EINFACHER Ansatz - nur Drucken ohne CSS-Hacks
    window.print();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="w-full">
            <Eye className="h-4 w-4 mr-2" />
            PDF-Vorschau anzeigen
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-7xl w-[95vw] max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              PDF-Vorschau: {previewData.invoiceNumber}
              <Badge variant="secondary" className="ml-2">
                {template.charAt(0).toUpperCase() + template.slice(1)} Template
              </Badge>
            </DialogTitle>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Drucken
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                PDF herunterladen
              </Button>
              <Button
                size="sm"
                onClick={handleSendEmail}
                className="bg-[#14ad9f] hover:bg-[#0f9d84]"
              >
                <Mail className="h-4 w-4 mr-2" />
                Per E-Mail senden
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[80vh] p-1">
          <div
            className="bg-white rounded-lg shadow-lg border w-full invoice-modal-container"
            style={{ width: '100%' }}
          >
            <div style={{ width: '100%', maxWidth: 'none' }}>
              <InvoiceTemplateRenderer template={template} data={previewData} preview={true} />
            </div>
          </div>
        </div>

        {/* Preview Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Vorschau-Hinweis</h4>
              <p className="text-sm text-blue-700">
                Dies ist eine Live-Vorschau Ihrer Rechnung. Änderungen an den Formularfeldern werden
                sofort hier angezeigt.
                {previewData.items.length === 0 && (
                  <span className="block mt-1">
                    <strong>Tipp:</strong> Fügen Sie Rechnungspositionen hinzu, um sie in der
                    Vorschau zu sehen.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact Preview Component for Template Selection
interface InvoiceTemplatePreviewProps {
  template: InvoiceTemplate;
  sampleData: InvoiceData;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function InvoiceTemplatePreview({
  template,
  sampleData,
  isSelected,
  onSelect,
}: InvoiceTemplatePreviewProps) {
  return (
    <div
      className={`border rounded-lg overflow-hidden bg-white shadow-sm cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-[#14ad9f] border-[#14ad9f]' : 'hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="h-64 overflow-hidden relative">
        <div className="transform scale-[0.2] origin-top-left w-[1000px] h-[1200px] pointer-events-none">
          <InvoiceTemplateRenderer template={template} data={sampleData} preview={true} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent pointer-events-none"></div>
      </div>
      <div className="p-3 border-t">
        <h3 className="font-medium text-gray-900 capitalize">{template}</h3>
        <p className="text-sm text-gray-600">
          {template === 'german-standard' &&
            'GoBD-konform, E-Rechnungs-kompatibel, deutsche Rechtsrichtlinien'}
          {template === 'modern-business' &&
            'Professionell mit Taskilo-Branding und modernem Design'}
          {template === 'classic-professional' &&
            'Traditionelles Geschäftsdesign, seriös und vertrauenswürdig'}
          {template === 'minimal-clean' &&
            'Minimalistisches Design mit Fokus auf Klarheit und Lesbarkeit'}
          {template === 'corporate-formal' &&
            'Formelles Corporate Design für große Unternehmen und B2B'}
        </p>
      </div>
    </div>
  );
}
