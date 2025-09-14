'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { FileText, Check, Search, Eye, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Import moderne Template-Thumbnail Lösung
// import SmartTemplateThumb from '@/components/templates/SmartTemplateThumb';
import DocumentPreviewFrame from '@/components/templates/preview/DocumentPreviewFrame';

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

// Einfache, funktionierende Template-Thumbnail Komponente
const TemplateThumb: React.FC<{
  templateId: string;
  children: React.ReactNode;
  className?: string;
}> = ({ templateId, children, className = '' }) => {
  return (
    <div
      className={`relative overflow-hidden bg-white border rounded-md aspect-[210/297] shadow-sm ${className}`}
    >
      <div className="absolute inset-0 overflow-hidden">
        {children ? (
          <div
            className="absolute origin-top-left"
            style={{
              transform: 'scale(0.35)',
              width: '286%',
              height: '286%',
              top: '10%',
              left: '0',
            }}
          >
            {children}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <div className="text-xs text-gray-500">Template {templateId}</div>
              <div className="text-xs text-red-500">Nicht geladen</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Optimized Modal Preview using existing infrastructure
const TemplateModalPreview: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <DocumentPreviewFrame scale={0.75} maxHeight={600} padding={16}>
      {children}
    </DocumentPreviewFrame>
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

  // Fallback Template das immer funktioniert
  const getFallbackTemplate = (templateId: string) => {
    return (
      <div className="w-full min-h-[1100px] bg-white p-8 text-sm" style={{ width: '800px' }}>
        <div className="max-w-none">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">RECHNUNG</h1>
              <div className="text-lg">Rechnungsnummer: 2024-001</div>
              <div>Datum: 13.09.2024</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-xl mb-2">Ihre Firma GmbH</div>
              <div>Musterstraße 123</div>
              <div>12345 Musterstadt</div>
              <div className="mt-2">+49 123 456789</div>
              <div>info@ihrefirma.de</div>
            </div>
          </div>

          {/* Kunde */}
          <div className="mb-8">
            <h3 className="font-bold mb-3 text-sm uppercase">Rechnungsempfänger</h3>
            <div className="border-l-4 border-gray-800 pl-4">
              <div className="font-bold">Musterkunde GmbH</div>
              <div>Kundenstraße 456</div>
              <div>67890 Kundenstadt</div>
            </div>
          </div>

          {/* Positionen */}
          <table className="w-full border-collapse border border-gray-300 mb-8">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-3 text-left">Position</th>
                <th className="border border-gray-300 p-3 text-left">Beschreibung</th>
                <th className="border border-gray-300 p-3 text-center">Menge</th>
                <th className="border border-gray-300 p-3 text-right">Einzelpreis</th>
                <th className="border border-gray-300 p-3 text-right">Gesamtpreis</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-3 text-center">1</td>
                <td className="border border-gray-300 p-3">Webentwicklung Dienstleistung</td>
                <td className="border border-gray-300 p-3 text-center">10 Stunden</td>
                <td className="border border-gray-300 p-3 text-right">85,00 €</td>
                <td className="border border-gray-300 p-3 text-right font-bold">850,00 €</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 p-3 text-center">2</td>
                <td className="border border-gray-300 p-3">Design & Konzeption</td>
                <td className="border border-gray-300 p-3 text-center">5 Stunden</td>
                <td className="border border-gray-300 p-3 text-right">75,00 €</td>
                <td className="border border-gray-300 p-3 text-right font-bold">375,00 €</td>
              </tr>
            </tbody>
          </table>

          {/* Summen */}
          <div className="flex justify-end mb-8">
            <div className="w-80">
              <div className="border border-gray-300 bg-white">
                <div className="border-b border-gray-200 p-3 flex justify-between">
                  <span>Zwischensumme:</span>
                  <span className="font-bold">1.225,00 €</span>
                </div>
                <div className="border-b border-gray-200 p-3 flex justify-between">
                  <span>Umsatzsteuer (19%):</span>
                  <span className="font-bold">232,75 €</span>
                </div>
                <div className="p-4 flex justify-between bg-gray-50">
                  <span className="text-lg font-bold">Gesamtbetrag:</span>
                  <span className="text-xl font-bold">1.457,75 €</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-gray-900 pt-6 text-xs text-gray-600">
            <div className="grid grid-cols-3 gap-8">
              <div>
                <div className="font-bold mb-2 uppercase">Zahlungsbedingungen</div>
                <div>14 Tage netto</div>
              </div>
              <div>
                <div className="font-bold mb-2 uppercase">Bankverbindung</div>
                <div>IBAN: DE89 1234 5678 9012 3456 78</div>
                <div>BIC: DEUTDEFF123</div>
              </div>
              <div>
                <div className="font-bold mb-2 uppercase">Steuerdaten</div>
                <div>USt-IdNr.: DE123456789</div>
                <div>Steuernr.: 123/456/78901</div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <span className="text-blue-600">Template: {templateId}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Beispieldaten für Delivery Notes
  const getDeliveryNoteData = () => {
    return {
      documentNumber: 'LS-2024-001',
      date: '13.09.2024',
      customerName: 'Musterkunde GmbH',
      customer: {
        name: 'Musterkunde GmbH',
        address: {
          street: 'Kundenstraße 456',
          zipCode: '67890',
          city: 'Kundenstadt',
        },
      },
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
    };
  };

  const renderTemplateComponent = (template: string) => {
    console.log('🔧 Rendering template:', template, 'for documentType:', documentType);

    const templateData = getSampleTemplateData();

    // Für Rechnungstypen (Invoice)
    if (documentType === 'Invoice') {
      const invoiceTemplate = NEW_TEMPLATES.invoice.find(t => t.id === template);
      console.log('🔧 Found invoice template:', invoiceTemplate?.id);
      if (invoiceTemplate) {
        const Component = invoiceTemplate.component;
        const sampleData = getNewInvoiceTemplateData();
        const { companySettings } = getSampleTemplateData();
        console.log('🔧 Rendering Invoice Component');
        try {
          return (
            <Component
              data={sampleData}
              companySettings={companySettings}
              customizations={{ showLogo: true, logoUrl: companySettings?.logoUrl }}
            />
          );
        } catch (error) {
          console.error('❌ Template Component Error:', error);
          return getFallbackTemplate(template);
        }
      }
      console.log('⚠️ No invoice template found for:', template);
      return getFallbackTemplate(template);
    }

    // Für Mahnungen (Invoicereminder)
    if (documentType === 'Invoicereminder') {
      const reminderTemplate = NEW_TEMPLATES.reminder.find(t => t.id === template);
      if (reminderTemplate) {
        try {
          const Component = reminderTemplate.component as React.ComponentType<any>;
          const sampleReminder = getSampleReminderData();
          return <Component data={sampleReminder} preview />;
        } catch (error) {
          console.error('❌ Reminder Template Error:', error);
          return getFallbackTemplate(template);
        }
      }
    }

    // Für Angebote (Order)
    if (documentType === 'Order') {
      const quoteTemplate = NEW_TEMPLATES.quote.find(t => t.id === template);
      if (quoteTemplate) {
        try {
          const Component = quoteTemplate.component;
          return <Component {...templateData} />;
        } catch (error) {
          console.error('❌ Quote Template Error:', error);
          return getFallbackTemplate(template);
        }
      }
    }

    // Für Auftragsbestätigungen (Contractnote)
    if (documentType === 'Contractnote') {
      const orderTemplate = NEW_TEMPLATES.order.find(t => t.id === template);
      if (orderTemplate) {
        try {
          const Component = orderTemplate.component;
          return <Component {...templateData} />;
        } catch (error) {
          console.error('❌ Order Template Error:', error);
          return getFallbackTemplate(template);
        }
      }
    }

    // Für Briefe (Letter)
    if (documentType === 'Letter') {
      const letterTemplate = NEW_TEMPLATES.letter.find(t => t.id === template);
      if (letterTemplate) {
        try {
          const Component = letterTemplate.component;
          return <Component {...templateData} />;
        } catch (error) {
          console.error('❌ Letter Template Error:', error);
          return getFallbackTemplate(template);
        }
      }
    }

    // Für Gutschriften (Creditnote)
    if (documentType === 'Creditnote') {
      const creditTemplate = NEW_TEMPLATES.credit.find(t => t.id === template);
      if (creditTemplate) {
        try {
          const Component = creditTemplate.component;
          return <Component {...templateData} />;
        } catch (error) {
          console.error('❌ Credit Template Error:', error);
          return getFallbackTemplate(template);
        }
      }
    }

    // Für Lieferscheine (Packinglist)
    if (documentType === 'Packinglist') {
      const deliveryTemplate = NEW_TEMPLATES.delivery.find(t => t.id === template);
      if (deliveryTemplate) {
        try {
          const Component = deliveryTemplate.component;
          const deliveryData = getDeliveryNoteData();
          const companyData = {
            companyName: 'Muster GmbH',
            address: {
              street: 'Lange Str. 2',
              zipCode: '10245',
              city: 'Berlin',
              country: 'Deutschland',
            },
            email: 'info@musterfirma.de',
            phone: '+49 30 12345678',
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
        } catch (error) {
          console.error('❌ Delivery Template Error:', error);
          return getFallbackTemplate(template);
        }
      }
    }

    // Fallback wenn kein Template gefunden wurde
    console.log('⚠️ No template found for:', template, 'documentType:', documentType);
    return getFallbackTemplate(template);
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
    return [NEW_TEMPLATES.invoice[0]].map(t => ({ id: t.id, name: t.name }));
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
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="grid grid-cols-2 gap-4">
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
                      className="w-full text-left p-4"
                      onClick={() => handleTemplateSelect(tpl.id)}
                    >
                      <TemplateThumb templateId={tpl.id} className="h-56 mb-3">
                        {(() => {
                          const component = renderTemplateComponent(tpl.id);
                          console.log('🔧 Rendered component for', tpl.id, ':', !!component);
                          return component;
                        })()}
                      </TemplateThumb>
                      <div className="px-2">
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="text-sm font-medium text-gray-900 truncate"
                            title={tpl.name}
                          >
                            {tpl.name}
                          </span>
                          {isActive && <Check className="h-4 w-4 text-gray-800" />}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{tpl.id}</div>
                      </div>
                    </button>

                    {/* Hover-Actions */}
                    <div className="pointer-events-none absolute inset-0 hidden items-center justify-center gap-3 rounded-lg bg-white/70 backdrop-blur-sm group-hover:flex">
                      <div className="pointer-events-auto flex gap-3">
                        <Button
                          size="default"
                          variant="outline"
                          onClick={() => handleTemplateSelect(tpl.id)}
                        >
                          Auswählen
                        </Button>
                        <Button
                          size="default"
                          onClick={() => handlePreviewClick(tpl.id)}
                          className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                        >
                          <Eye className="h-4 w-4 mr-2" />
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
            <TemplateModalPreview>
              {modalTemplateId && renderTemplateComponent(modalTemplateId)}
            </TemplateModalPreview>
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
