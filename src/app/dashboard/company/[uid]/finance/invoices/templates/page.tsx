'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Eye, FileText } from 'lucide-react';
import {
  InvoiceTemplateRenderer,
  InvoiceTemplate,
  INVOICE_TEMPLATES,
  InvoiceData,
} from '@/components/finance/InvoiceTemplates';
import { toast } from 'sonner';

export default function InvoiceTemplatesPage() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate>('modern');
  const [previewTemplate, setPreviewTemplate] = useState<InvoiceTemplate | null>(null);

  // Mock invoice data for preview
  const mockInvoiceData: InvoiceData = {
    id: 'inv_preview_001',
    invoiceNumber: 'R-2025-001',
    customerName: 'Mustermann GmbH',
    customerEmail: 'info@mustermann.de',
    customerAddress: 'Musterstraße 123\n12345 Berlin\nDeutschland',
    companyName: 'Ihre Firma GmbH',
    companyAddress: 'Firmenstraße 456\n54321 Hamburg\nDeutschland',
    companyEmail: 'kontakt@ihrefirma.de',
    companyPhone: '+49 40 123456789',
    companyTax: 'DE123456789',
    amount: 1000.0,
    tax: 190.0,
    total: 1190.0,
    issueDate: '2025-08-02',
    dueDate: '2025-08-16',
    description: 'Beratungsleistungen - Projektmanagement und Strategie',
    items: [
      {
        id: 'item_1',
        description: 'Projektmanagement (40 Stunden)',
        quantity: 40,
        unitPrice: 85.0,
        total: 3400.0,
      },
      {
        id: 'item_2',
        description: 'Strategieberatung (20 Stunden)',
        quantity: 20,
        unitPrice: 120.0,
        total: 2400.0,
      },
    ],
  };

  const handleTemplateSelect = (templateId: InvoiceTemplate) => {
    setSelectedTemplate(templateId);
    toast.success(
      `Template "${INVOICE_TEMPLATES.find(t => t.id === templateId)?.name}" ausgewählt`
    );
  };

  const handlePreview = (templateId: InvoiceTemplate) => {
    setPreviewTemplate(templateId);
  };

  const handleSaveAndContinue = () => {
    // In real app: Save template preference to user settings
    localStorage.setItem('selectedInvoiceTemplate', selectedTemplate);
    toast.success('Template-Einstellung gespeichert!');
    router.push('../invoices'); // Back to invoices page
  };

  const handleBackToInvoices = () => {
    router.push('../invoices');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={handleBackToInvoices}
          className="mb-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zu Rechnungen
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Rechnungs-Templates</h1>
            <p className="text-gray-600">
              Wählen Sie das Design für Ihre Rechnungen aus. Das gewählte Template wird für alle
              neuen Rechnungen verwendet.
            </p>
          </div>
          <Badge variant="secondary" className="bg-[#14ad9f]/10 text-[#14ad9f] border-[#14ad9f]/20">
            {INVOICE_TEMPLATES.find(t => t.id === selectedTemplate)?.name} ausgewählt
          </Badge>
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {INVOICE_TEMPLATES.map(template => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedTemplate === template.id
                ? 'ring-2 ring-[#14ad9f] shadow-lg'
                : 'hover:ring-1 hover:ring-gray-300'
            }`}
            onClick={() => handleTemplateSelect(template.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-[#14ad9f]" />
                  {template.name}
                  {selectedTemplate === template.id && (
                    <Check className="h-4 w-4 ml-2 text-[#14ad9f]" />
                  )}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    handlePreview(template.id);
                  }}
                  className="text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Vorschau
                </Button>
              </div>
              <CardDescription className="text-sm">{template.description}</CardDescription>
            </CardHeader>

            <CardContent>
              {/* Mini Preview */}
              <div className="bg-gray-50 rounded-lg p-4 h-48 overflow-hidden relative">
                <div className="transform scale-[0.15] origin-top-left w-[800px] h-[1000px] pointer-events-none">
                  <InvoiceTemplateRenderer
                    template={template.id}
                    data={mockInvoiceData}
                    preview={true}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-transparent to-transparent pointer-events-none"></div>
              </div>

              {/* Template Features */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Stil:</span>
                  <span className="font-medium">
                    {template.id === 'classic' && 'Traditionell'}
                    {template.id === 'modern' && 'Zeitgemäß'}
                    {template.id === 'minimal' && 'Reduziert'}
                    {template.id === 'corporate' && 'Professionell'}
                    {template.id === 'creative' && 'Farbenfroh'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Für:</span>
                  <span className="font-medium">
                    {template.id === 'classic' && 'Alle Branchen'}
                    {template.id === 'modern' && 'Tech & Digital'}
                    {template.id === 'minimal' && 'Design & Beratung'}
                    {template.id === 'corporate' && 'B2B & Konzerne'}
                    {template.id === 'creative' && 'Kreativ & Marketing'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBackToInvoices}>
          Abbrechen
        </Button>

        <Button
          onClick={handleSaveAndContinue}
          className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
        >
          Template speichern & fortfahren
        </Button>
      </div>

      {/* Full Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="font-semibold text-lg">
                Vorschau: {INVOICE_TEMPLATES.find(t => t.id === previewTemplate)?.name}
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTemplateSelect(previewTemplate)}
                >
                  Template wählen
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPreviewTemplate(null)}>
                  Schließen
                </Button>
              </div>
            </div>
            <div className="p-6">
              <InvoiceTemplateRenderer
                template={previewTemplate}
                data={mockInvoiceData}
                preview={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
