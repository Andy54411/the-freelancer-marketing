'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Check } from 'lucide-react';

// Alte Templates wurden entfernt – keine Importe mehr aus templates/

// Import der neuen Invoice Templates
import ProfessionalBusinessTemplate from '@/components/templates/invoice-templates/ProfessionalBusinessTemplate';
import CorporateClassicTemplate from '@/components/templates/invoice-templates/CorporateClassicTemplate';
import ExecutivePremiumTemplate from '@/components/templates/invoice-templates/ExecutivePremiumTemplate';
import MinimalistElegantTemplate from '@/components/templates/invoice-templates/MinimalistElegantTemplate';
import CreativeModernTemplate from '@/components/templates/invoice-templates/CreativeModernTemplate';
import TechStartupTemplate from '@/components/templates/invoice-templates/TechStartupTemplate';

// Import aller neuen Template-Kategorien
import {
  ProfessionalBusinessQuoteTemplate,
  ExecutivePremiumQuoteTemplate,
  CreativeModernQuoteTemplate,
  MinimalistElegantQuoteTemplate,
  CorporateClassicQuoteTemplate,
  TechInnovationQuoteTemplate,
} from '@/components/templates/quote-templates';

import {
  ProfessionalBusinessOrderTemplate,
  ExecutivePremiumOrderTemplate,
  CreativeModernOrderTemplate,
  MinimalistElegantOrderTemplate,
  CorporateClassicOrderTemplate,
  TechInnovationOrderTemplate,
} from '@/components/templates/order-confirmation-templates';

import {
  ProfessionalBusinessLetterTemplate,
  ExecutivePremiumLetterTemplate,
  CreativeModernLetterTemplate,
  MinimalistElegantLetterTemplate,
  CorporateClassicLetterTemplate,
  TechInnovationLetterTemplate,
} from '@/components/templates/letter-templates';

import {
  ProfessionalBusinessCreditTemplate,
  ExecutivePremiumCreditTemplate,
  CreativeModernCreditTemplate,
  MinimalistElegantCreditTemplate,
  CorporateClassicCreditTemplate,
  TechInnovationCreditTemplate,
} from '@/components/templates/credit-note-templates';

import {
  ProfessionalBusinessDeliveryTemplate,
  ExecutivePremiumDeliveryTemplate,
  CreativeModernDeliveryTemplate,
  MinimalistElegantDeliveryTemplate,
  CorporateClassicDeliveryTemplate,
  TechInnovationDeliveryTemplate,
} from '@/components/templates/delivery-note-templates';

import type { TemplateProps } from '@/components/templates/types';

interface TemplatePreviewProps {
  documentType:
    | 'Invoice'
    | 'Invoicereminder'
    | 'Order'
    | 'Contractnote'
    | 'Packinglist'
    | 'Letter'
    | 'Creditnote';
  templateId?: string;
  className?: string;
  onTemplateSelect?: (templateId: string) => void;
}

const getDocumentTypeInfo = (type: string) => {
  const typeMap = {
    Invoice: { label: 'Rechnung', color: 'bg-blue-500', bgColor: 'bg-blue-50' },
    Invoicereminder: { label: 'Mahnung', color: 'bg-red-500', bgColor: 'bg-red-50' },
    Order: { label: 'Angebot', color: 'bg-green-500', bgColor: 'bg-green-50' },
    Contractnote: { label: 'Auftragsbestätigung', color: 'bg-purple-500', bgColor: 'bg-purple-50' },
    Packinglist: { label: 'Lieferschein', color: 'bg-orange-500', bgColor: 'bg-orange-50' },
    Letter: { label: 'Brief', color: 'bg-gray-500', bgColor: 'bg-gray-50' },
    Creditnote: { label: 'Gutschrift', color: 'bg-yellow-500', bgColor: 'bg-yellow-50' },
  };

  return typeMap[type as keyof typeof typeMap] || typeMap.Invoice;
};

// Alte Invoice-Vorschau-Daten entfernt – wir nutzen die neuen Daten unten (getNewInvoiceTemplateData)

// Erweiterte Beispieldaten für neue Invoice Templates
const getNewInvoiceTemplateData = (): any => {
  return {
    documentNumber: '2024-001',
    date: '13.09.2024',
    dueDate: '13.10.2024',
    customer: {
      name: 'Musterkunde GmbH',
      email: 'kunde@musterkunde.de',
      address: {
        street: 'Kundenstraße 456',
        zipCode: '67890',
        city: 'Kundenstadt',
        country: 'Deutschland',
      },
    },
    company: {
      name: 'Ihre Firma GmbH',
      email: 'info@ihrefirma.de',
      phone: '+49 123 456789',
      address: {
        street: 'Musterstraße 123',
        zipCode: '12345',
        city: 'Musterstadt',
        country: 'Deutschland',
      },
      taxNumber: '123/456/78901',
      vatId: 'DE123456789',
      bankDetails: {
        iban: 'DE89 1234 5678 9012 3456 78',
        bic: 'DEUTDEFF123',
        accountHolder: 'Ihre Firma GmbH',
      },
    },
    items: [
      {
        description: 'Webentwicklung Dienstleistung',
        quantity: 10,
        unit: 'Stunden',
        unitPrice: 85.0,
        total: 850.0,
      },
      {
        description: 'Design & Konzeption',
        quantity: 5,
        unit: 'Stunden',
        unitPrice: 75.0,
        total: 375.0,
      },
    ],
    subtotal: 1225.0,
    taxRate: 19,
    taxAmount: 232.75,
    total: 1457.75,
    paymentTerms: '14 Tage netto',
    notes: 'Vielen Dank für Ihr Vertrauen!',
    status: 'draft',
    isSmallBusiness: false,
  };
};

// Beispieldaten für neue Template-Kategorien
const getSampleTemplateData = (): TemplateProps => {
  return {
    data: {
      documentNumber: '2024-001',
      date: '13.09.2025',
      validUntil: '13.10.2025',
      customerName: 'Musterkunde GmbH',
      customerAddress: {
        street: 'Kundenstraße 456',
        zipCode: '67890',
        city: 'Kundenstadt',
      },
      customerContact: 'kunde@musterkunde.de',
      items: [
        {
          description: 'Webentwicklung Dienstleistung',
          quantity: 10,
          unit: 'Stunden',
          unitPrice: 85.0,
        },
        {
          description: 'Design & Konzeption',
          quantity: 5,
          unit: 'Stunden',
          unitPrice: 75.0,
        },
      ],
      subtotal: 1225.0,
      taxRate: 19,
      taxAmount: 232.75,
      total: 1457.75,
      notes: 'Vielen Dank für Ihr Vertrauen!',
      createdBy: 'Max Mustermann',
    },
    companySettings: {
      companyName: 'Ihre Firma GmbH',
      logoUrl: '/images/Gemini_Generated_Image_pqjk64pqjk64pqjk.jpeg',
      address: {
        street: 'Musterstraße 123',
        zipCode: '12345',
        city: 'Musterstadt',
      },
      contactInfo: {
        email: 'info@ihrefirma.de',
        phone: '+49 123 456789',
      },
      taxId: '123/456/78901',
      vatId: 'DE123456789',
      bankDetails: {
        iban: 'DE89 1234 5678 9012 3456 78',
        bic: 'DEUTDEFF123',
        bankName: 'Ihre Firma GmbH',
      },
    },
  };
};

// Template-Konfigurationen
const NEW_TEMPLATES = {
  invoice: [
    {
      id: 'professional-business',
      name: 'Klassisch Professionell',
      component: ProfessionalBusinessTemplate,
    },
    { id: 'corporate-classic', name: 'Corporate Klassisch', component: CorporateClassicTemplate },
    { id: 'executive-premium', name: 'Executive Premium', component: ExecutivePremiumTemplate },
    {
      id: 'minimalist-elegant',
      name: 'Minimalistisch Elegant',
      component: MinimalistElegantTemplate,
    },
    { id: 'creative-modern', name: 'Kreativ Modern', component: CreativeModernTemplate },
    { id: 'tech-startup', name: 'Tech Startup', component: TechStartupTemplate },
  ],
  quote: [
    {
      id: 'professional-business-quote',
      name: 'Klassisch Professionell',
      component: ProfessionalBusinessQuoteTemplate,
    },
    {
      id: 'executive-premium-quote',
      name: 'Executive Premium',
      component: ExecutivePremiumQuoteTemplate,
    },
    { id: 'creative-modern-quote', name: 'Kreativ Modern', component: CreativeModernQuoteTemplate },
    {
      id: 'minimalist-elegant-quote',
      name: 'Minimalistisch Elegant',
      component: MinimalistElegantQuoteTemplate,
    },
    {
      id: 'corporate-classic-quote',
      name: 'Corporate Klassisch',
      component: CorporateClassicQuoteTemplate,
    },
    {
      id: 'tech-innovation-quote',
      name: 'Tech Innovation',
      component: TechInnovationQuoteTemplate,
    },
  ],
  order: [
    {
      id: 'professional-business-order',
      name: 'Klassisch Professionell',
      component: ProfessionalBusinessOrderTemplate,
    },
    {
      id: 'executive-premium-order',
      name: 'Executive Premium',
      component: ExecutivePremiumOrderTemplate,
    },
    { id: 'creative-modern-order', name: 'Kreativ Modern', component: CreativeModernOrderTemplate },
    {
      id: 'minimalist-elegant-order',
      name: 'Minimalistisch Elegant',
      component: MinimalistElegantOrderTemplate,
    },
    {
      id: 'corporate-classic-order',
      name: 'Corporate Klassisch',
      component: CorporateClassicOrderTemplate,
    },
    {
      id: 'tech-innovation-order',
      name: 'Tech Innovation',
      component: TechInnovationOrderTemplate,
    },
  ],
  letter: [
    {
      id: 'professional-business-letter',
      name: 'Klassisch Professionell',
      component: ProfessionalBusinessLetterTemplate,
    },
    {
      id: 'executive-premium-letter',
      name: 'Executive Premium',
      component: ExecutivePremiumLetterTemplate,
    },
    {
      id: 'creative-modern-letter',
      name: 'Kreativ Modern',
      component: CreativeModernLetterTemplate,
    },
    {
      id: 'minimalist-elegant-letter',
      name: 'Minimalistisch Elegant',
      component: MinimalistElegantLetterTemplate,
    },
    {
      id: 'corporate-classic-letter',
      name: 'Corporate Klassisch',
      component: CorporateClassicLetterTemplate,
    },
    {
      id: 'tech-innovation-letter',
      name: 'Tech Innovation',
      component: TechInnovationLetterTemplate,
    },
  ],
  credit: [
    {
      id: 'professional-business-credit',
      name: 'Klassisch Professionell',
      component: ProfessionalBusinessCreditTemplate,
    },
    {
      id: 'executive-premium-credit',
      name: 'Executive Premium',
      component: ExecutivePremiumCreditTemplate,
    },
    {
      id: 'creative-modern-credit',
      name: 'Kreativ Modern',
      component: CreativeModernCreditTemplate,
    },
    {
      id: 'minimalist-elegant-credit',
      name: 'Minimalistisch Elegant',
      component: MinimalistElegantCreditTemplate,
    },
    {
      id: 'corporate-classic-credit',
      name: 'Corporate Klassisch',
      component: CorporateClassicCreditTemplate,
    },
    {
      id: 'tech-innovation-credit',
      name: 'Tech Innovation',
      component: TechInnovationCreditTemplate,
    },
  ],
  delivery: [
    {
      id: 'professional-business-delivery',
      name: 'Klassisch Professionell',
      component: ProfessionalBusinessDeliveryTemplate,
    },
    {
      id: 'executive-premium-delivery',
      name: 'Executive Premium',
      component: ExecutivePremiumDeliveryTemplate,
    },
    {
      id: 'creative-modern-delivery',
      name: 'Kreativ Modern',
      component: CreativeModernDeliveryTemplate,
    },
    {
      id: 'minimalist-elegant-delivery',
      name: 'Minimalistisch Elegant',
      component: MinimalistElegantDeliveryTemplate,
    },
    {
      id: 'corporate-classic-delivery',
      name: 'Corporate Klassisch',
      component: CorporateClassicDeliveryTemplate,
    },
    {
      id: 'tech-innovation-delivery',
      name: 'Tech Innovation',
      component: TechInnovationDeliveryTemplate,
    },
  ],
};

const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  documentType,
  templateId,
  className = '',
  onTemplateSelect,
}) => {
  const docInfo = getDocumentTypeInfo(documentType);

  // Bestimme den Standard-Template basierend auf Dokumenttyp
  const getDefaultTemplate = () => {
    if (templateId) return templateId;

    switch (documentType) {
      case 'Invoice':
      case 'Invoicereminder':
        return 'professional-business';
      case 'Order':
        return 'professional-business-quote';
      case 'Contractnote':
        return 'professional-business-order';
      case 'Letter':
        return 'professional-business-letter';
      case 'Creditnote':
        return 'professional-business-credit';
      case 'Packinglist':
        return 'professional-business-delivery';
      default:
        return 'professional-business';
    }
  };

  const [selectedTemplate, setSelectedTemplate] = useState<string>(getDefaultTemplate());

  const handleTemplateSelect = (newTemplateId: string) => {
    setSelectedTemplate(newTemplateId);
    onTemplateSelect?.(newTemplateId);
  };

  const renderTemplateComponent = (template: string) => {
    const templateData = getSampleTemplateData();

    // Für Rechnungstypen (Invoice, Invoicereminder) - neue Templates
    if (['Invoice', 'Invoicereminder'].includes(documentType)) {
      const invoiceTemplate = NEW_TEMPLATES.invoice.find(t => t.id === template);
      if (invoiceTemplate) {
        const Component = invoiceTemplate.component;
        const sampleData = getNewInvoiceTemplateData();
        const { companySettings } = getSampleTemplateData();
        return (
          <Component
            data={sampleData}
            companySettings={companySettings}
            customizations={{ showLogo: true, logoUrl: companySettings?.logoUrl }}
          />
        );
      }
      // Kein Fallback mehr – alte Templates wurden entfernt
    }

    // Für Angebote (Order)
    if (documentType === 'Order') {
      const quoteTemplate = NEW_TEMPLATES.quote.find(t => t.id === template);
      if (quoteTemplate) {
        const Component = quoteTemplate.component;
        return <Component {...templateData} />;
      }
      // Fallback für alte Templates
      return (
        <div className="p-8 text-center text-gray-500">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">Angebot Template</h3>
          <p>Template wird geladen...</p>
        </div>
      );
    }

    // Für Auftragsbestätigungen (Contractnote)
    if (documentType === 'Contractnote') {
      const orderTemplate = NEW_TEMPLATES.order.find(t => t.id === template);
      if (orderTemplate) {
        const Component = orderTemplate.component;
        return <Component {...templateData} />;
      }
    }

    // Für Briefe (Letter)
    if (documentType === 'Letter') {
      const letterTemplate = NEW_TEMPLATES.letter.find(t => t.id === template);
      if (letterTemplate) {
        const Component = letterTemplate.component;
        return <Component {...templateData} />;
      }
    }

    // Für Gutschriften/Kredite (Creditnote)
    if (documentType === 'Creditnote') {
      const creditTemplate = NEW_TEMPLATES.credit.find(t => t.id === template);
      if (creditTemplate) {
        const Component = creditTemplate.component;
        return <Component {...templateData} />;
      }
      // Kein Fallback mehr – alte Templates entfernt
    }
    // Keine zweite Fallback-Behandlung mehr für Invoice-Typen

    // Für Lieferscheine (Packinglist)
    if (documentType === 'Packinglist') {
      const deliveryTemplate = NEW_TEMPLATES.delivery.find(t => t.id === template);
      if (deliveryTemplate) {
        const Component = deliveryTemplate.component;
        return <Component {...templateData} />;
      }
    }

    return null;
  };

  // Filtere Templates basierend auf Dokumenttyp
  const getAvailableTemplates = () => {
    // Für Rechnungen und Mahnungen (neue professionelle Templates)
    if (['Invoice', 'Invoicereminder'].includes(documentType)) {
      return NEW_TEMPLATES.invoice.map(t => ({ id: t.id, name: t.name }));
    }

    // Für Angebote (neue Template-Struktur)
    if (documentType === 'Order') {
      return NEW_TEMPLATES.quote.map(t => ({ id: t.id, name: t.name }));
    }

    // Für Auftragsbestätigungen (neue Template-Struktur)
    if (documentType === 'Contractnote') {
      return NEW_TEMPLATES.order.map(t => ({ id: t.id, name: t.name }));
    }

    // Für Briefe (neue Template-Struktur)
    if (documentType === 'Letter') {
      return NEW_TEMPLATES.letter.map(t => ({ id: t.id, name: t.name }));
    }

    // Für Gutschriften (neue Template-Struktur)
    if (documentType === 'Creditnote') {
      return NEW_TEMPLATES.credit.map(t => ({ id: t.id, name: t.name }));
    }

    // Für Lieferscheine (neue Template-Struktur)
    if (documentType === 'Packinglist') {
      return NEW_TEMPLATES.delivery.map(t => ({ id: t.id, name: t.name }));
    }

    // Fallback: nimm das erste Invoice-Template
    return [NEW_TEMPLATES.invoice[0]];
  };

  const availableTemplates = getAvailableTemplates();

  return (
    <div className={`w-full ${className}`}>
      {/* Haupt-Layout: Links Große Vorschau, Rechts Template-Galerie */}
      <div className="flex gap-8">
        {/* LINKS: Große Template-Vorschau - 75% der Breite */}
        {/* LINKS: Große Template-Vorschau - bleibt fest beim Scrollen */}
        <div className="flex-1 sticky top-0 self-start" style={{ flexBasis: '80%' }}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-800">
                  Vorschau: {availableTemplates.find(t => t.id === selectedTemplate)?.name}
                </h3>
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {selectedTemplate}
                </Badge>
              </div>
            </div>

            {/* Große Template-Vorschau mit Scroll */}
            <div className="p-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white max-h-[900px] overflow-y-auto">
                <div className="transform scale-90 origin-top-left w-[111%]">
                  {renderTemplateComponent(selectedTemplate)}
                </div>
              </div>
            </div>
          </div>
        </div>{' '}
        {/* RECHTS: Template-Galerie - Sticky beim Seiten-Scroll */}
        <div className="w-72 flex-shrink-0">
          <div className="space-y-2 pt-3">
            {availableTemplates.map((template, index) => (
              <div
                key={template.id}
                className={`relative border-2 rounded-lg p-2 cursor-pointer transition-all hover:shadow-lg hover:scale-105 sticky ${
                  selectedTemplate === template.id
                    ? 'border-[#14ad9f] bg-[#14ad9f]/5 shadow-lg scale-105'
                    : 'border-gray-200 hover:border-gray-300 bg-white shadow-sm'
                }`}
                style={{ top: `${index * 20 + 20}px` }}
                onClick={() => handleTemplateSelect(template.id)}
              >
                {/* Template Mini-Vorschau */}
                <div className="bg-white rounded border mb-2 h-80 relative overflow-hidden">
                  {/* Live Mini-Template-Vorschau - besser sichtbar */}
                  <div className="absolute top-1 left-1 right-1 bottom-1">
                    <div
                      className="transform scale-[0.25] origin-top-left pointer-events-none"
                      style={{ width: '400%', height: '400%' }}
                    >
                      {renderTemplateComponent(template.id)}
                    </div>
                  </div>
                </div>

                {/* Template Info - kompakt */}
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <h4 className="font-medium text-xs text-gray-900 truncate">{template.name}</h4>
                    {selectedTemplate === template.id && (
                      <Check className="h-3 w-3 text-[#14ad9f] ml-1 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreview;
