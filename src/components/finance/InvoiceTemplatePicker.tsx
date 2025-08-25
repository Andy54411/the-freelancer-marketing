'use client';

import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
  INVOICE_TEMPLATES,
  InvoiceTemplate,
  InvoiceTemplateRenderer,
} from './InvoiceTemplates';
import { InvoiceData } from '@/types/invoiceTypes';

interface InvoiceTemplatePickerProps {
  trigger?: React.ReactNode;
  onTemplateSelect?: (template: InvoiceTemplate) => void;
  selectedTemplate?: InvoiceTemplate;
  previewData?: InvoiceData;
  userId?: string; // Add userId for database updates
}

export function InvoiceTemplatePicker({
  trigger,
  onTemplateSelect,
  selectedTemplate = 'classic',
  previewData,
  userId,
}: InvoiceTemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<InvoiceTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // Mock preview data if none provided
  const mockPreviewData: InvoiceData = previewData || {
    id: 'preview',
    number: 'R-2024-001',
    invoiceNumber: 'R-2024-001',
    sequentialNumber: 1,
    date: new Date().toISOString().split('T')[0],
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customerName: 'Mustermann GmbH',
    customerEmail: 'info@mustermann.de',
    customerAddress: 'Musterstraße 123\n12345 Musterstadt\nDeutschland',
    description: 'Webentwicklung und Design-Services',
    companyName: 'Ihr Unternehmen',
    companyAddress: 'Ihre Straße 456\n67890 Ihre Stadt\nDeutschland',
    companyEmail: 'info@ihr-unternehmen.de',
    companyPhone: '+49 123 456789',
    companyWebsite: 'https://ihr-unternehmen.de',
    companyLogo: '',
    companyVatId: 'DE123456789',
    companyTaxNumber: '12345/67890',
    companyRegister: 'HRB 12345',
    districtCourt: 'Amtsgericht Musterstadt',
    legalForm: 'GmbH',
    companyTax: 'DE123456789',
    isSmallBusiness: false,
    vatRate: 19,
    priceInput: 'netto' as const,
    amount: 1000,
    tax: 190,
    total: 1190,
    status: 'draft',
    createdAt: new Date(),
    year: new Date().getFullYear(),
    companyId: 'preview-company',
    isStorno: false,
    items: [
      {
        id: '1',
        description: 'Webentwicklung (Frontend)',
        quantity: 20,
        unitPrice: 40,
        total: 800,
      },
      {
        id: '2',
        description: 'UI/UX Design',
        quantity: 5,
        unitPrice: 40,
        total: 200,
      },
    ],
  };

  const handleTemplateSelect = async (template: InvoiceTemplate) => {
    try {
      setSaving(true);

      // Save to database if userId is provided
      if (userId) {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          preferredInvoiceTemplate: template,
          updatedAt: new Date(),
        });
        toast.success(
          `Template "${INVOICE_TEMPLATES.find(t => t.id === template)?.name}" ausgewählt und gespeichert`
        );
      }

      // Also save to localStorage as fallback
      localStorage.setItem('selectedInvoiceTemplate', template);

      if (onTemplateSelect) {
        onTemplateSelect(template);
      }
      setOpen(false);
    } catch (error) {

      toast.error('Fehler beim Speichern der Template-Auswahl');

      // Still execute callback even if save failed
      if (onTemplateSelect) {
        onTemplateSelect(template);
      }
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = (template: InvoiceTemplate) => {
    setPreviewTemplate(template);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || <Button variant="outline">Template auswählen</Button>}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[1000px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rechnungs-Template auswählen</DialogTitle>
            <DialogDescription>
              Wählen Sie das Design aus, das am besten zu Ihrem Unternehmen passt.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {INVOICE_TEMPLATES.map(template => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedTemplate === template.id
                    ? 'ring-2 ring-[#14ad9f] bg-[#14ad9f]/5'
                    : 'hover:shadow-md'
                }`}
              >
                <CardContent className="p-4">
                  {/* Template Preview Thumbnail */}
                  <div className="relative mb-4">
                    <div className="bg-gray-100 rounded-lg p-4 h-48 overflow-hidden">
                      <div className="transform scale-25 origin-top-left w-[400%] h-[400%]">
                        <InvoiceTemplateRenderer
                          template={template.id}
                          data={mockPreviewData}
                          preview={true}
                        />
                      </div>
                    </div>

                    {/* Selected Badge */}
                    {selectedTemplate === template.id && (
                      <div className="absolute top-2 right-2 bg-[#14ad9f] text-white rounded-full p-1">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  {/* Template Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      {template.id === 'modern' && (
                        <Badge variant="secondary" className="bg-[#14ad9f] text-white">
                          Empfohlen
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{template.description}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(template.id)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Vorschau
                    </Button>
                    <Button
                      onClick={() => handleTemplateSelect(template.id)}
                      className={`flex-1 ${
                        selectedTemplate === template.id
                          ? 'bg-[#14ad9f] hover:bg-[#0f9d84]'
                          : 'bg-[#14ad9f] hover:bg-[#0f9d84]'
                      }`}
                    >
                      {selectedTemplate === template.id ? 'Ausgewählt' : 'Auswählen'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Preview Dialog */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Vorschau: {INVOICE_TEMPLATES.find(t => t.id === previewTemplate)?.name}
              </DialogTitle>
              <DialogDescription>
                So wird Ihre Rechnung mit diesem Template aussehen.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 border rounded-lg overflow-hidden">
              <InvoiceTemplateRenderer
                template={previewTemplate}
                data={mockPreviewData}
                preview={false}
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                Schließen
              </Button>
              <Button
                onClick={() => {
                  handleTemplateSelect(previewTemplate);
                  setPreviewTemplate(null);
                }}
                className="bg-[#14ad9f] hover:bg-[#0f9d84]"
              >
                Dieses Template verwenden
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
