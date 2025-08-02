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
import { Eye, Download, Mail, Printer } from 'lucide-react';
import { InvoiceTemplateRenderer, InvoiceData, InvoiceTemplate } from './InvoiceTemplates';

interface InvoicePreviewModalProps {
  invoice: InvoiceData;
  template: InvoiceTemplate;
  trigger?: React.ReactNode;
}

export function InvoicePreviewModal({ invoice, template, trigger }: InvoicePreviewModalProps) {
  const handleDownloadPDF = () => {
    // In real app: Generate and download PDF
    console.log('Download PDF for invoice:', invoice.id);
  };

  const handleSendEmail = () => {
    // In real app: Send invoice via email
    console.log('Send email for invoice:', invoice.id);
  };

  const handlePrint = () => {
    // In real app: Print invoice
    window.print();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Vorschau
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              Rechnung {invoice.invoiceNumber}
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
                PDF
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

        <div className="overflow-y-auto max-h-[75vh] p-1">
          <div className="bg-white rounded-lg shadow-sm">
            <InvoiceTemplateRenderer template={template} data={invoice} preview={false} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Quick Template Preview Component for Selection
interface TemplateQuickPreviewProps {
  template: InvoiceTemplate;
  sampleData: InvoiceData;
}

export function TemplateQuickPreview({ template, sampleData }: TemplateQuickPreviewProps) {
  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="h-64 overflow-hidden relative">
        <div className="transform scale-[0.25] origin-top-left w-[800px] h-[1000px] pointer-events-none">
          <InvoiceTemplateRenderer template={template} data={sampleData} preview={true} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent pointer-events-none"></div>
      </div>
    </div>
  );
}
