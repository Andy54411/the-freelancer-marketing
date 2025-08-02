'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Eye, FileText, Loader2 } from 'lucide-react';
import {
  InvoiceTemplateRenderer,
  InvoiceTemplate,
  INVOICE_TEMPLATES,
  InvoiceData,
} from '@/components/finance/InvoiceTemplates';
import { toast } from 'sonner';

export default function InvoiceTemplatesPage() {
  const router = useRouter();
  const params = useParams();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate>('modern');
  const [previewTemplate, setPreviewTemplate] = useState<InvoiceTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load user's preferred template from database
  useEffect(() => {
    const loadUserTemplate = async () => {
      if (!uid) return;

      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const preferredTemplate = userData.preferredInvoiceTemplate as InvoiceTemplate;
          if (preferredTemplate && INVOICE_TEMPLATES.some(t => t.id === preferredTemplate)) {
            setSelectedTemplate(preferredTemplate);
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden der Template-Einstellung:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserTemplate();
  }, [uid]);

  // Template-Vorschau-Daten erstellen
  const createPreviewData = (): InvoiceData => {
    return {
      id: 'preview_template',
      number: 'R-2025-001',
      invoiceNumber: 'R-2025-001',
      sequentialNumber: 1,
      date: new Date().toISOString().split('T')[0],
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      customerName: 'Mustermann GmbH',
      customerEmail: 'info@mustermann.de',
      customerAddress: 'Musterstraße 123\n12345 Berlin\nDeutschland',
      description: 'Beratungsleistungen - Projektmanagement und Strategie',
      companyName: 'Ihre Firma GmbH',
      companyAddress: 'Firmenstraße 456\n54321 Hamburg\nDeutschland',
      companyEmail: 'kontakt@ihrefirma.de',
      companyPhone: '+49 40 123456789',
      companyWebsite: 'https://ihrefirma.de',
      companyLogo: '',
      companyVatId: 'DE123456789',
      companyTaxNumber: '12345/67890',
      companyRegister: 'HRB 12345',
      districtCourt: 'Amtsgericht Hamburg',
      legalForm: 'GmbH',
      companyTax: 'DE123456789',
      isSmallBusiness: false,
      vatRate: 19,
      priceInput: 'netto' as const,
      amount: 5800.0,
      tax: 1102.0,
      total: 6902.0,
      status: 'draft',
      isStorno: false,
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
        }
      ]
    };
  };

  const previewData = createPreviewData();

  const handleTemplateSelect = (templateId: InvoiceTemplate) => {
    setSelectedTemplate(templateId);
    toast.success(
      `Template "${INVOICE_TEMPLATES.find(t => t.id === templateId)?.name}" ausgewählt`
    );
  };

  const handlePreview = (templateId: InvoiceTemplate) => {
    setPreviewTemplate(templateId);
  };

  const handleSaveAndContinue = async () => {
    if (!uid) {
      toast.error('Benutzer-ID nicht gefunden');
      return;
    }

    try {
      setSaving(true);

      // Save template preference to database
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        preferredInvoiceTemplate: selectedTemplate,
        updatedAt: new Date(),
      });

      // Also save to localStorage as fallback
      localStorage.setItem('selectedInvoiceTemplate', selectedTemplate);

      toast.success('Template-Einstellung erfolgreich gespeichert!');
      router.push('../invoices'); // Back to invoices page
    } catch (error) {
      console.error('Fehler beim Speichern der Template-Einstellung:', error);
      toast.error('Fehler beim Speichern der Template-Einstellung');
    } finally {
      setSaving(false);
    }
  };

  const handleBackToInvoices = () => {
    router.push('../invoices');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
          <span className="ml-2 text-gray-600">Template-Einstellungen werden geladen...</span>
        </div>
      ) : (
        <>
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
                  neuen Rechnungen verwendet und in Ihrem Profil gespeichert.
                </p>
              </div>
              <Badge
                variant="secondary"
                className="bg-[#14ad9f]/10 text-[#14ad9f] border-[#14ad9f]/20"
              >
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
                        data={previewData}
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
              disabled={saving}
              className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird gespeichert...
                </>
              ) : (
                'Template speichern & fortfahren'
              )}
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
                    data={previewData}
                    preview={false}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
