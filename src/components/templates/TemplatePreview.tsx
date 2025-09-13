'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { FileText, Check, Search, Eye, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  TechInnovationDeliveryTemplate,
  BusinessStandardDeliveryTemplate,
} from '@/components/templates/delivery-note-templates';

// Reminder (Mahnung) Templates
import { REMINDER_TEMPLATES } from '@/components/templates/reminder-templates';

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
  // Neutrale, dezente Kennzeichnung ohne kräftige Farben
  const typeMap = {
    Invoice: { label: 'Rechnung', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    Invoicereminder: { label: 'Mahnung', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    Order: { label: 'Angebot', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    Contractnote: { label: 'Auftragsbestätigung', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    Packinglist: { label: 'Lieferschein', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    Letter: { label: 'Brief', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    Creditnote: { label: 'Gutschrift', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  };

  return typeMap[type as keyof typeof typeMap] || typeMap.Invoice;
};

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

// SPEZIFISCHE Mock-Daten für BusinessStandardDeliveryTemplate (basierend auf der PDF-Vorlage)
const getBusinessStandardDeliveryData = (): any => {
  return {
    documentNumber: '1011',
    date: '13.09.2024',
    customerName: 'Habermann & Söhne',
    customerAddress: {
      street: 'Schnurlos-Straße 81',
      zipCode: '34131',
      city: 'Kassel',
      country: 'Deutschland',
    },
    customerNumber: '1008',
    orderNumber: '19658',
    items: [
      {
        description: 'B-3025, Farbe Grün',
        details: 'Musterartikel',
        quantity: 1.0,
        unit: 'Stk.',
        sku: 'B-3025-078',
      },
      {
        description: 'B-0050, Farbe Blau',
        details: 'Musterartikel ABC',
        quantity: 2.0,
        unit: 'Stk.',
        sku: 'B-0050-050',
      },
      {
        description: 'A-0086, Antik-Look',
        details: 'Musterartikel',
        quantity: 1.0,
        unit: 'Stk.',
        sku: 'A-0086-007',
      },
      {
        description: 'Versand und Verpackung',
        quantity: 1.0,
        unit: 'Stk.',
        sku: 'V-13kg',
      },
    ],
  };
};

// Beispieldaten für Mahnungen (Reminder)
const getSampleReminderData = () => {
  return {
    companyLogo: '/images/Gemini_Generated_Image_pqjk64pqjk64pqjk.jpeg',
    companyName: 'Ihre Firma GmbH',
    companyAddress: 'Musterstraße 123',
    companyCity: 'Musterstadt',
    companyZip: '12345',
    companyCountry: 'Deutschland',
    companyEmail: 'info@ihrefirma.de',
    companyPhone: '+49 123 456789',
    companyWebsite: 'www.ihrefirma.de',
    bankDetails: {
      accountHolder: 'Ihre Firma GmbH',
      bankName: 'Musterbank AG',
      iban: 'DE89 3704 0044 0532 0130 00',
      bic: 'COBADEFFXXX',
    },
    customerName: 'Musterkunde GmbH',
    customerAddress: 'Kundenstraße 456',
    customerCity: 'Kundenstadt',
    customerZip: '67890',
    customerCountry: 'Deutschland',
    reminderNumber: 'MN-2025-001',
    reminderDate: '13.09.2025',
    originalInvoiceNumber: 'RE-2025-014',
    originalInvoiceDate: '15.08.2025',
    dueDate: '29.08.2025',
    // Leistungsangaben für rechtssichere Darstellung
    servicePeriodFrom: '01.08.2025',
    servicePeriodTo: '15.08.2025',
    reminderLevel: 1 as const,
    items: [
      {
        description: 'Offener Posten aus Rechnung RE-2025-014',
        quantity: 1,
        price: 1225.0,
        total: 1225.0,
      },
    ],
    subtotal: 1225.0,
    taxRate: 19,
    taxAmount: 232.75,
    reminderFee: 5.0,
    total: 1462.75,
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
      id: 'tech-innovation-delivery',
      name: 'Tech Innovation',
      component: TechInnovationDeliveryTemplate,
    },
    {
      id: 'business-standard-delivery',
      name: 'Business Standard (DIN-orientiert)',
      component: BusinessStandardDeliveryTemplate,
    },
  ],
  reminder: REMINDER_TEMPLATES.map(t => ({ id: t.id, name: t.name, component: t.component })),
};

// Eigene, neue Wrapper für Miniatur- und Großvorschau (keine Wiederverwendung der alten Frames)
const PaperThumb: React.FC<{ children: React.ReactNode; scale?: number; className?: string }> = ({
  children,
  scale = 0.18,
  className = '',
}) => {
  return (
    <div
      className={`relative overflow-hidden bg-white border rounded-md aspect-[210/297] ${className}`}
    >
      <div className="absolute inset-[6px]">
        <div
          className="origin-top-left"
          style={{
            transform: `scale(${scale})`,
            width: `${Math.round(100 / scale)}%`,
            height: `${Math.round(100 / scale)}%`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

const PaperPreview: React.FC<{ children: React.ReactNode; scale?: number; maxHeight?: number }> = ({
  children,
  scale = 0.85,
  maxHeight = 740,
}) => {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="overflow-auto" style={{ maxHeight }}>
        <div className="flex justify-center">
          <div className="origin-top" style={{ transform: `scale(${scale})` }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  documentType,
  templateId,
  className = '',
  onTemplateSelect,
}) => {
  const docInfo = getDocumentTypeInfo(documentType);

  // Prüft, ob eine Template-ID für den aktuellen Dokumenttyp existiert
  const isTemplateValidForType = (
    tplId: string | undefined,
    type: TemplatePreviewProps['documentType']
  ) => {
    if (!tplId) return false;
    switch (type) {
      case 'Invoice':
        return NEW_TEMPLATES.invoice.some(t => t.id === tplId);
      case 'Invoicereminder':
        return NEW_TEMPLATES.reminder.some(t => t.id === tplId);
      case 'Order':
        return NEW_TEMPLATES.quote.some(t => t.id === tplId);
      case 'Contractnote':
        return NEW_TEMPLATES.order.some(t => t.id === tplId);
      case 'Letter':
        return NEW_TEMPLATES.letter.some(t => t.id === tplId);
      case 'Creditnote':
        return NEW_TEMPLATES.credit.some(t => t.id === tplId);
      case 'Packinglist':
        return NEW_TEMPLATES.delivery.some(t => t.id === tplId);
      default:
        return false;
    }
  };

  // Bestimme den Standard-Template basierend auf Dokumenttyp
  const getDefaultTemplate = () => {
    // Nutze nur eine externe Template-ID, wenn sie zum Dokumenttyp passt
    if (templateId && isTemplateValidForType(templateId, documentType)) return templateId;

    switch (documentType) {
      case 'Invoice':
        return 'professional-business';
      case 'Invoicereminder':
        return 'professional-reminder';
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
  const [query, setQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [modalTemplateId, setModalTemplateId] = useState<string>('');

  // Wenn sich der Dokumenttyp oder das vorgewählte Template ändert,
  // setze die lokale Auswahl auf einen passenden Default.
  useEffect(() => {
    setSelectedTemplate(getDefaultTemplate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentType, templateId]);

  const handleTemplateSelect = (newTemplateId: string) => {
    setSelectedTemplate(newTemplateId);
    onTemplateSelect?.(newTemplateId);
  };

  const handlePreviewClick = (templateId: string) => {
    setModalTemplateId(templateId);
    setShowPreviewModal(true);
  };

  const renderTemplateComponent = (template: string) => {
    const templateData = getSampleTemplateData();

    // Für Rechnungstypen (Invoice)
    if (documentType === 'Invoice') {
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

    // Für Mahnungen (Invoicereminder)
    if (documentType === 'Invoicereminder') {
      const reminderTemplate = NEW_TEMPLATES.reminder.find(t => t.id === template);
      if (reminderTemplate) {
        const Component = reminderTemplate.component as React.ComponentType<any>;
        const sampleReminder = getSampleReminderData();
        return <Component data={sampleReminder} preview />;
      }
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
        // Spezifische Mock-Daten für ALLE Delivery Templates
        const deliveryData = getBusinessStandardDeliveryData();
        const companyData = {
          companyName: 'Muster GmbH',
          address: {
            street: 'Lange Str. 2',
            zipCode: '10245',
            city: 'Berlin',
            country: 'Deutschland',
          },
          management: 'Max Mustermann',
          commercialRegister: 'AG Berlin HRB 123456',
          vatId: 'DE216398573',
          bankDetails: {
            bankName: 'Sparkasse Berlin',
            iban: 'DE10 25 25 25 500 600 26 02',
            bic: 'HERAKLES02',
          },
        };
        return (
          <Component
            data={deliveryData}
            companySettings={companyData}
            customizations={templateData.customizations}
          />
        );
      }
    }

    return null;
  };

  // Filtere Templates basierend auf Dokumenttyp
  const getAvailableTemplates = () => {
    // Für Rechnungen (neue professionelle Templates)
    if (documentType === 'Invoice') {
      return NEW_TEMPLATES.invoice.map(t => ({ id: t.id, name: t.name }));
    }

    // Für Mahnungen (Reminder)
    if (documentType === 'Invoicereminder') {
      return NEW_TEMPLATES.reminder.map(t => ({ id: t.id, name: t.name }));
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
  const filteredTemplates = useMemo(() => {
    const base = !query.trim()
      ? availableTemplates
      : availableTemplates.filter(t => {
          const q = query.toLowerCase();
          return t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
        });
    return [...base].sort((a, b) =>
      sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
  }, [availableTemplates, query, sortAsc]);

  return (
    <div className={`w-full ${className}`}>
      {/* Kopfzeile */}
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {docInfo.label}
          </Badge>
          <span className="text-sm text-muted-foreground">{filteredTemplates.length} Vorlagen</span>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Vorlagen suchen..."
              className="pl-8"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortAsc(s => !s)}
            aria-label="Sortieren"
          >
            {sortAsc ? 'A→Z' : 'Z→A'}
          </Button>
        </div>
      </div>

      {/* Template-Galerie ohne Preview */}
      <div className="max-w-4xl">
        {/* Template-Galerie */}
        <div className="min-w-0">
          <div className="rounded-xl border border-gray-200 bg-white p-2">
            <div className="grid grid-cols-3 gap-2">
              {filteredTemplates.map(tpl => {
                const isActive = selectedTemplate === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    className={`group relative rounded-lg border transition-all ${
                      isActive
                        ? 'border-gray-800 bg-gray-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-left p-2"
                      onClick={() => handleTemplateSelect(tpl.id)}
                    >
                      <PaperThumb className="h-32 mb-2">
                        {renderTemplateComponent(tpl.id)}
                      </PaperThumb>
                      <div className="px-1">
                        <div className="flex items-center gap-1 truncate">
                          <span
                            className="text-[10px] font-medium text-gray-900 truncate"
                            title={tpl.name}
                          >
                            {tpl.name}
                          </span>
                          {isActive && <Check className="h-3 w-3 text-gray-800" />}
                        </div>
                        <div className="text-[9px] text-gray-500 truncate">{tpl.id}</div>
                      </div>
                    </button>

                    {/* Hover-Actions */}
                    <div className="pointer-events-none absolute inset-2 hidden items-center justify-center gap-2 rounded-lg bg-white/60 backdrop-blur-sm group-hover:flex">
                      <div className="pointer-events-auto flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTemplateSelect(tpl.id)}
                        >
                          Auswählen
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handlePreviewClick(tpl.id)}
                          className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Vorschau
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredTemplates.length === 0 && (
                <div className="col-span-full">
                  <div className="border rounded-lg p-6 text-center text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <div className="text-sm">Keine Vorlagen gefunden</div>
                    <div className="text-xs">Suche anpassen oder Filter löschen.</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              Template Vorschau: {availableTemplates.find(t => t.id === modalTemplateId)?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto bg-gray-50 p-4 rounded-lg min-h-0">
            <div className="bg-white shadow-lg mx-auto" style={{ width: 'fit-content' }}>
              {modalTemplateId && renderTemplateComponent(modalTemplateId)}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
              Schließen
            </Button>
            <Button
              onClick={() => {
                handleTemplateSelect(modalTemplateId);
                setShowPreviewModal(false);
              }}
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              Template verwenden
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplatePreview;
