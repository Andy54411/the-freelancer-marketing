'use client';

import React from 'react';
import {
  ProfessionalBusinessTemplate,
  CorporateClassicTemplate,
  ExecutivePremiumTemplate,
  MinimalistElegantTemplate,
  CreativeModernTemplate,
  TechStartupTemplate,
} from '@/components/templates/invoice-templates';
import { InvoiceData } from '@/types/invoiceTypes';
import { TaxRuleType } from '@/types/taxRules';

/**
 * Gibt den deutschen Text für eine Steuerregel zurück
 */
function getTaxRuleLabel(taxRule: string): string {
  switch (taxRule) {
    case 'DE_TAXABLE':
      return 'Steuerpflichtiger Umsatz (Regelsteuersatz 19 %, § 1 Abs. 1 Nr. 1 i.V.m. § 12 Abs. 1 UStG)';
    case 'DE_REDUCED':
      return 'Steuerpflichtiger Umsatz (ermäßigter Steuersatz 7 %, § 1 Abs. 1 Nr. 1 i.V.m. § 12 Abs. 2 UStG)';
    case 'DE_EXEMPT':
      return 'Steuerfreier Umsatz (§ 4 UStG)';
    case 'DE_SMALL_BUSINESS':
      return 'Umsatzsteuerbefreit nach § 19 UStG (Kleinunternehmerregelung)';
    case 'DE_REVERSE_CHARGE':
      return 'Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG)';
    case 'DE_INTRACOMMUNITY':
      return 'Innergemeinschaftliche Lieferung (§ 4 Nr. 1b UStG)';
    case 'DE_EXPORT':
      return 'Ausfuhrlieferung (§ 4 Nr. 1a UStG)';
    default:
      return taxRule;
  }
}

type TemplateType =
  | 'professional-business'
  | 'corporate-classic'
  | 'executive-premium'
  | 'minimalist-elegant'
  | 'creative-modern'
  | 'tech-startup';

interface TemplateItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  discountPercent: number;
  discount: number;
}

interface LivePreviewProps {
  invoiceData: Partial<InvoiceData>;
  template?: TemplateType;
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

export function LivePreview({
  invoiceData,
  companySettings,
  template = 'professional-business',
}: LivePreviewProps) {
  // WICHTIG: Template Debug Info
  console.log(
    '%c🔍 TEMPLATE DEBUG INFO 🔍',
    'background: #ff0000; color: white; font-size: 20px; padding: 10px;'
  );
  console.log(
    '%c⬇️ AUSGEWÄHLTES TEMPLATE ⬇️',
    'color: #14ad9f; font-size: 16px; font-weight: bold;'
  );
  console.table({
    selectedTemplate: template,
    hasInvoiceData: !!invoiceData,
    hasCompanySettings: !!companySettings,
    invoiceNumber: invoiceData?.invoiceNumber,
    companyWebsite: companySettings?.companyWebsite || 'NICHT VORHANDEN',
  });
  const TemplateMap = {
    'professional-business': ProfessionalBusinessTemplate,
    'corporate-classic': CorporateClassicTemplate,
    'executive-premium': ExecutivePremiumTemplate,
    'minimalist-elegant': MinimalistElegantTemplate,
    'creative-modern': CreativeModernTemplate,
    'tech-startup': TechStartupTemplate,
  } as const;

  // WICHTIG: Verfügbare Templates Debug Info
  console.log(
    '%c📄 VERFÜGBARE TEMPLATES 📄',
    'background: #14ad9f; color: white; font-size: 16px; padding: 5px;'
  );
  console.table(
    Object.keys(TemplateMap).map(key => ({
      templateName: key,
      isAvailable: true,
    }))
  );

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
    companyPhone: (companySettings?.companyPhone || '+49 123 456789').replace(
      /(\+49)(\d{4})(\d{3})(\d{3})/,
      '$1 $2 $3 $4'
    ),
    companyWebsite: companySettings?.companyWebsite || '',
    companyLogo: companySettings?.companyLogo || companySettings?.profilePictureURL || '',
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
    skontoDays: invoiceData.skontoEnabled ? invoiceData.skontoDays || 0 : 0,
    skontoPercentage: invoiceData.skontoEnabled ? invoiceData.skontoPercentage || 0 : 0,
    skontoText: invoiceData.skontoEnabled ? invoiceData.skontoText || '' : '',
    notes: invoiceData.notes || '',
    taxRuleType: invoiceData.taxRuleType || TaxRuleType.DE_TAXABLE,
    taxRuleLabel: getTaxRuleLabel(invoiceData.taxRuleType || TaxRuleType.DE_TAXABLE),
  } as any;

  // Wenn das Template nicht in der Map ist, verwende das Professional Business Template als Fallback
  const SelectedTemplate = TemplateMap[template] || TemplateMap['professional-business'];

  // Log Warnung wenn Fallback verwendet wird
  if (!TemplateMap[template]) {
    console.warn(
      `Template ${template} nicht gefunden, verwende Standard-Template (Professional Business)`
    );
  }

  const templateData = {
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
          (previewData.customerAddress || '').split('\n')[1]?.split(' ').slice(1).join(' ') || '',
        country: 'Deutschland',
      },
    },
    company: {
      name: previewData.companyName,
      email: previewData.companyEmail,
      phone: previewData.companyPhone || '',
      website: previewData.companyWebsite || '',
      address: {
        street: (previewData.companyAddress || '').split('\n')[0] || '',
        zipCode: (previewData.companyAddress || '').split('\n')[1]?.split(' ')[0] || '',
        city:
          (previewData.companyAddress || '').split('\n')[1]?.split(' ').slice(1).join(' ') || '',
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
  };

  // Hole die Template-Komponente
  const TemplateComponent = TemplateMap[template];

  // WICHTIG: Template Rendering Debug Info
  console.log(
    '%c🖨️ TEMPLATE WIRD GERENDERT 🖨️',
    'background: #ff6b00; color: white; font-size: 16px; padding: 5px;'
  );
  console.group('Template Details');
  console.log('%cTemplate Name:', 'color: #ff6b00; font-weight: bold;', template);
  console.log('%cKomponente existiert:', 'color: #ff6b00; font-weight: bold;', !!TemplateComponent);
  console.log('%cTemplate Daten:', 'color: #ff6b00; font-weight: bold;');
  console.table({
    invoiceNumber: previewData.invoiceNumber,
    customerName: previewData.customerName,
    total: previewData.total,
    templateStatus: Object.prototype.hasOwnProperty.call(TemplateMap, template)
      ? '✅ GELADEN'
      : '❌ FEHLT',
  });
  console.groupEnd();

  return (
    <div className="relative w-full h-full overflow-hidden bg-white">
      <div className="absolute inset-[4px]">
        <div
          className="transform origin-top-left pointer-events-none"
          style={{
            scale: 0.22,
            width: '210mm',
            height: '297mm',
          }}
        >
          <SelectedTemplate
            preview={true}
            data={{
              documentNumber: templateData.documentNumber || '',
              date: templateData.date || '',
              dueDate: templateData.dueDate || '',
              customer: {
                name: templateData.customer?.name || '',
                email: templateData.customer?.email || '',
                address: {
                  street: templateData.customer?.address?.street || '',
                  zipCode: templateData.customer?.address?.zipCode || '',
                  city: templateData.customer?.address?.city || '',
                  country: templateData.customer?.address?.country || '',
                },
              },
              company: templateData.company || {
                name: '',
                email: '',
                phone: '',
                website: '',
                address: {
                  street: '',
                  zipCode: '',
                  city: '',
                  country: '',
                },
                taxNumber: '',
                vatId: '',
                bankDetails: {
                  iban: '',
                  bic: '',
                  accountHolder: '',
                },
              },
              items: (templateData.items || []).map(item => {
                const templateItem: TemplateItem = {
                  description: item.description || '',
                  quantity: item.quantity || 0,
                  unit: item.unit || 'Stk.',
                  unitPrice: item.unitPrice || 0,
                  total: item.total || 0,
                  discountPercent: (item as any).discountPercent || 0,
                  discount: (item as any).discount || 0,
                };
                return templateItem;
              }),
              subtotal: templateData.subtotal || 0,
              taxRate: templateData.taxRate || 0,
              taxAmount: templateData.taxAmount || 0,
              total: templateData.total || 0,
              notes: templateData.notes || '',
              paymentTerms: templateData.paymentTerms || '',
              status: templateData.status || 'draft',
              isSmallBusiness: templateData.isSmallBusiness || false,
            }}
          />
        </div>
      </div>
    </div>
  );
}
