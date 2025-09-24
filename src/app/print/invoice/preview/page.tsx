'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { InvoiceTemplateRenderer, DEFAULT_INVOICE_TEMPLATE } from '@/components/finance/InvoiceTemplates';
import type { InvoiceData } from '@/types/invoiceTypes';
import { TaxRuleType, TaxRuleCategory } from '@/types/taxRules';

function PrintInvoicePreview() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState<InvoiceData | null>(null);
  const [rawData, setRawData] = useState<any>(null);
  
  // Flags für Steuerberechnung
  const isReverseCharge = useMemo(() => 
    rawData?.taxRule === 'DE_REVERSE_13B' || rawData?.taxRule === 'EU_REVERSE_CHARGE',
    [rawData?.taxRule]
  );
  
  const hideVatLine = useMemo(() => 
    rawData?.taxRule === 'DE_REVERSE_13B' || 
    rawData?.taxRule === 'EU_REVERSE_CHARGE' || 
    rawData?.taxRule === 'DE_NOTAXABLE',
    [rawData?.taxRule]
  );

  const auto = useMemo(() => searchParams?.get('auto') === '1', [searchParams]);

  // Markiere den Body, damit nur der Print-Container sichtbar ist
  useEffect(() => {
    document.body.classList.add('print-page');
    return () => {
      document.body.classList.remove('print-page');
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        // Payload-Parameter verarbeiten
        const payloadParam = searchParams?.get('payload');
        if (payloadParam) {
          try {
            const b64 = decodeURIComponent(payloadParam);
            // UTF-8-sicheres Base64-Decoding
            const binary = atob(b64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const json = new TextDecoder().decode(bytes);
            const decoded = JSON.parse(json);
            
            // Debug-Ausgaben entfernt
            
            // Hilfsfunktion für sichere Datumskonvertierung
            const safeDate = (dateValue: any): string => {
              if (!dateValue) return new Date().toISOString();
              const date = new Date(dateValue);
              return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
            };
            
            // Konvertiere Preview-Daten zu InvoiceData-Format
            const invoiceData: InvoiceData = {
              id: 'preview',
              number: decoded.invoiceNumber || 'Vorschau',
              invoiceNumber: decoded.invoiceNumber || 'Vorschau',
              sequentialNumber: 1,
              date: safeDate(decoded.date),
              issueDate: safeDate(decoded.date),
              dueDate: safeDate(decoded.validUntil),
              customerName: decoded.customerName || 'Kunde',
              customerEmail: decoded.customerEmail || '',
              customerAddress: decoded.customerAddress || '',
              description: decoded.headTextHtml || decoded.description || '', // 🔧 KORRIGIERT: Verwende verarbeiteten headTextHtml
              companyId: 'preview',
              companyName: decoded.companyName || 'Ihr Unternehmen',
              companyAddress: decoded.companyAddress || '',
              companyEmail: decoded.companyEmail || '',
              companyPhone: decoded.companyPhone || '',
              companyWebsite: decoded.companyWebsite || '',
              companyLogo: decoded.companyLogo || '',
              companyVatId: decoded.companyVatId || '',
              companyTaxNumber: decoded.companyTaxNumber || '',
              items: decoded.items || [],
              amount: decoded.subtotal || 0,
              tax: decoded.tax || 0,
              total: decoded.total || 0,
              status: 'draft',
              notes: '', // 🔧 WICHTIG: Leere notes, damit Footer-Text NICHT im Template-Footer erscheint
              vatRate: decoded.vatRate || 19,
              isSmallBusiness: decoded.isSmallBusiness || false,
              priceInput: 'netto',
              createdAt: new Date(),
              year: new Date().getFullYear(),
              isStorno: false,
              taxRuleType: decoded.taxRule || TaxRuleType.DE_TAXABLE,
              taxRuleCategory: TaxRuleCategory.DOMESTIC,
              paymentTerms: decoded.paymentTerms || '',
              bankDetails: {
                iban: decoded.bankDetails?.iban || decoded.step4?.iban || '',
                bic: decoded.bankDetails?.bic || decoded.step4?.bic || '',
                bankName: decoded.bankDetails?.bankName || decoded.step4?.bankName || '',
                accountHolder: decoded.bankDetails?.accountHolder || decoded.step4?.accountHolder || decoded.companyName || 'Ihr Unternehmen'
              },
            };
            
            // Speichere auch die rohen Daten für Template-Verwendung
            setRawData(decoded);
            setPreviewData(invoiceData);
            setLoading(false);
            return;
          } catch (error) {
            console.error('Fehler beim Verarbeiten der Payload:', error);
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden der Rechnungs-Vorschau:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [searchParams]);

  useEffect(() => {
    if (!loading && auto && previewData) {
      // Warte kurz, bis Bilder/Fonts geladen sind
      const t = setTimeout(() => {
        try {
          window.print();
        } catch (error) {
          console.error('Drucken fehlgeschlagen:', error);
        }
      }, 500);
      return () => clearTimeout(t);
    }
  }, [loading, auto, previewData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
          <p className="mt-2 text-gray-600">Rechnung wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!previewData) {
    return <div className="p-6">Rechnungs-Vorschau nicht verfügbar</div>;
  }

  // Transformiere die Daten für das Template - Vollständige Template-Kompatibilität basierend auf der Create-Page-Analyse
  // --- Erweiterte und robuste Übergabe aller relevanten Felder für die Print-Vorschau ---
  const templateData = {
    // === KERN-RECHNUNGSDATEN ===
    id: previewData.id,
    number: previewData.invoiceNumber,
    invoiceNumber: previewData.invoiceNumber,
    documentNumber: previewData.invoiceNumber,
    sequentialNumber: previewData.sequentialNumber,
    title: rawData?.title || previewData.invoiceNumber,

    // === DATUMS-INFORMATIONEN ===
    date: previewData.date,
    issueDate: previewData.issueDate,
    dueDate: previewData.dueDate,
    validUntil: previewData.dueDate,
    invoiceDate: previewData.date,
    serviceDate: rawData?.serviceDate || rawData?.deliveryDate || previewData.date,
    servicePeriod: rawData?.servicePeriod || rawData?.serviceDate || previewData.date,
    deliveryDate: rawData?.deliveryDate || previewData.date,

    // === KUNDEN-INFORMATIONEN ===
    customerName: previewData.customerName,
    customerEmail: previewData.customerEmail,
    customerPhone: rawData?.customerPhone || '',
    customerAddress: previewData.customerAddress,
    customerOrderNumber: rawData?.customerOrderNumber || '',
    customerNumber: rawData?.customerNumber || '',
    customer: {
      id: rawData?.customerId || '',
      customerNumber: rawData?.customerNumber || '',
      name: previewData.customerName,
      email: previewData.customerEmail,
      phone: rawData?.customerPhone || '',
      orderNumber: rawData?.customerOrderNumber || '',
      address: (() => {
        const addressLines = (previewData.customerAddress || '').split('\n').filter(line => line.trim());
        const street = addressLines[0] || '';
        const cityLine = addressLines[1] || '';
        const zipCode = cityLine.split(' ')[0] || '';
        const city = cityLine.split(' ').slice(1).join(' ') || '';
        const country = addressLines[2] || 'Deutschland';
        return {
          street,
          zipCode,
          city,
          country,
          fullAddress: previewData.customerAddress,
          addressLine1: street,
          addressLine2: `${zipCode} ${city}`,
          addressLine3: country
        };
      })(),
      vatId: rawData?.customerVatId || '',
      taxNumber: rawData?.customerTaxNumber || '',
      contactPerson: rawData?.contactPersonName || '',
      postalCode: (() => {
        const addressLines = (previewData.customerAddress || '').split('\n');
        return addressLines[1]?.split(' ')[0] || '';
      })(),
      vatValidated: rawData?.customerVatValidated || false,
    },

    // === FIRMEN-INFORMATIONEN ===
    companyId: previewData.companyId,
    companyName: previewData.companyName,
    companyAddress: previewData.companyAddress,
    companyEmail: previewData.companyEmail,
    companyPhone: previewData.companyPhone,
    companyWebsite: previewData.companyWebsite,
    companyLogo: previewData.companyLogo,
    profilePictureURL: previewData.companyLogo,
    companyVatId: previewData.companyVatId,
    companyTaxNumber: previewData.companyTaxNumber,
    companyRegister: rawData?.companyRegister || rawData?.registrationNumber || '',
    company: {
      id: previewData.companyId,
      name: previewData.companyName,
      email: previewData.companyEmail,
      phone: previewData.companyPhone,
      website: previewData.companyWebsite,
      logo: previewData.companyLogo,
      profilePictureURL: previewData.companyLogo,
      address: (() => {
        const addressLines = (previewData.companyAddress || '').split('\n').filter(line => line.trim());
        const street = addressLines[0] || '';
        const cityLine = addressLines[1] || '';
        const zipCode = cityLine.split(' ')[0] || '';
        const city = cityLine.split(' ').slice(1).join(' ') || '';
        const country = addressLines[2] || 'Deutschland';
        return {
          street,
          zipCode,
          city,
          country,
          fullAddress: previewData.companyAddress,
          addressLine1: street,
          addressLine2: `${zipCode} ${city}`,
          addressLine3: country
        };
      })(),
      taxNumber: previewData.companyTaxNumber,
      vatId: previewData.companyVatId,
      registrationNumber: rawData?.companyRegister || rawData?.registrationNumber || '',
      registrationCourt: rawData?.registrationCourt || '',
      bankDetails: previewData.bankDetails || {
        iban: '',
        bic: '',
        bankName: '',
        accountHolder: previewData.companyName
      },
      ceo: rawData?.ceo || rawData?.companyOwner || '',
      contactEmail: previewData.companyEmail,
      companyPhoneNumber: previewData.companyPhone,
      companyStreet: (() => {
        const addressLines = (previewData.companyAddress || '').split('\n');
        return addressLines[0] || '';
      })(),
      companyPostalCode: (() => {
        const addressLines = (previewData.companyAddress || '').split('\n');
        return addressLines[1]?.split(' ')[0] || '';
      })(),
      companyCity: (() => {
        const addressLines = (previewData.companyAddress || '').split('\n');
        return addressLines[1]?.split(' ').slice(1).join(' ') || '';
      })(),
      companyCountry: (() => {
        const addressLines = (previewData.companyAddress || '').split('\n');
        return addressLines[2] || 'Deutschland';
      })(),
      kleinunternehmer: previewData.isSmallBusiness ? 'ja' : 'nein',
      ust: previewData.isSmallBusiness ? 'kleinunternehmer' : 'steuerpflichtig',
      // paymentTerms und taxRule werden NICHT übergeben!
    },

    // === POSITIONS/ITEMS ===
    items: (previewData.items || []).map((item, index) => ({
      ...item,
      position: index + 1,
      unit: (item as any).unit || 'Stk',
      netPrice: item.unitPrice || 0,
      sellingPrice: item.unitPrice || 0,
      grossPrice: (item.unitPrice || 0) * (1 + (previewData.vatRate || 19) / 100),
      tax: ((item.total || 0) * (previewData.vatRate || 19)) / 100,
      discount: (item as any).discountPercent || 0,
      discountPercent: (item as any).discountPercent || 0,
      discountAmount: ((item.unitPrice || 0) * (item.quantity || 1) * ((item as any).discountPercent || 0)) / 100,
      category: (item as any).category || 'Service',
      sku: (item as any).sku || '',
      weight: (item as any).weight || '',
      dimensions: (item as any).dimensions || '',
      inventoryItemId: (item as any).inventoryItemId || '',
      name: item.description,
      sellingNet: item.unitPrice || 0,
      sellingGross: (item.unitPrice || 0) * (1 + (previewData.vatRate || 19) / 100),
      taxRate: (item as any).taxRate || previewData.vatRate || 19,
    })),

    // === FINANZIELLE DATEN ===
    amount: previewData.amount,
    subtotal: previewData.amount,
    tax: previewData.tax,
    taxAmount: previewData.tax,
    total: previewData.total,
    totalAmount: previewData.total,
    vatRate: previewData.vatRate,
    taxRate: previewData.vatRate,
  currency: rawData?.currency || 'EUR',

    // === ZAHLUNGS- UND GESCHÄFTSBEDINGUNGEN ===
    paymentTerms: rawData?.paymentTerms || previewData.paymentTerms || '',
    deliveryTerms: rawData?.deliveryTerms || '',
    paymentMethod: rawData?.paymentMethod || '',
    bankDetails: {
      iban: rawData?.bankDetails?.iban || rawData?.step4?.iban || '',
      bic: rawData?.bankDetails?.bic || rawData?.step4?.bic || '',
      bankName: rawData?.bankDetails?.bankName || rawData?.step4?.bankName || '',
      accountHolder: rawData?.bankDetails?.accountHolder || rawData?.step4?.accountHolder || rawData?.companyName || ''
    },

    // === SKONTO-SYSTEM ===
    skontoEnabled: rawData?.skontoEnabled || false,
    skontoDays: rawData?.skontoDays || 0,
    skontoPercentage: rawData?.skontoPercentage || 0,
    skontoText: rawData?.skontoText || '',

    // === TEXTFELDER UND BESCHREIBUNGEN ===
    description: (() => {
      let desc = (rawData?.headTextHtml || previewData.description || '');
      // Fester Standardtext wie gewünscht, wenn leer oder nur Platzhalter
      const isDefault = !desc || /\[%[A-Z_]+%\]/.test(desc);
      if (isDefault) {
        desc = `Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihren Auftrag und das damit verbundene Vertrauen!\nHiermit stelle ich Ihnen die folgenden Leistungen in Rechnung:`;
      }
      // Entferne alle Varianten von Zahlungsbedingung/USt-Regel (auch mit HTML, Bold, Whitespaces, Zeilenumbrüchen)
      desc = desc.replace(/<[^>]*>?/gm, tag => tag.match(/<\/?(b|strong|span|div|p)[^>]*>/i) ? tag : ''); // Erlaube nur bestimmte Tags
      desc = desc.replace(/\s*Zahlungsbedingung\s*:?[^\n<]*((<br\s*\/?>)|\n|$)/gim, '');
      desc = desc.replace(/\s*USt[-_ ]?Regel\s*:?[^\n<]*((<br\s*\/?>)|\n|$)/gim, '');
      desc = desc.replace(/\s*Steuerregel\s*:?[^\n<]*((<br\s*\/?>)|\n|$)/gim, '');
      // Entferne leere Zeilen
      desc = desc.replace(/^(\s|<br\s*\/?>)+$/gim, '');
      return desc.trim();
    })(),
    notes: '',
    headTextHtml: rawData?.headTextHtml || '',
    footerText: '',
    headerText: rawData?.headTextHtml || '',
    footerNotes: '',
    internalNotes: rawData?.internalNotes || '',
    introText: rawData?.headTextHtml || '',
    conclusionText: rawData?.footerText || '',
    hinweise: rawData?.footerText || '',
    additionalNotes: rawData?.footerText || '',
    paymentNotes: rawData?.footerText || '',
    legalNotes: rawData?.footerText || '',

    // === KONTAKT UND REFERENZEN ===
    contactPersonName: rawData?.contactPersonName || rawData?.internalContactPerson || '',
    internalContactPerson: rawData?.internalContactPerson || rawData?.contactPersonName || '',
    reference: rawData?.reference || rawData?.customerOrderNumber || '',
    orderNumber: rawData?.customerOrderNumber || rawData?.reference || '',
    projectNumber: rawData?.projectNumber || '',

    // === STATUS UND METADATEN ===
    status: previewData.status,
    year: previewData.year,
    createdAt: previewData.createdAt,
    isStorno: previewData.isStorno,
    priceInput: previewData.priceInput,

    // === STEUER- UND COMPLIANCE-FELDER ===
    isSmallBusiness: typeof rawData?.isSmallBusiness !== 'undefined' ? rawData.isSmallBusiness : previewData.isSmallBusiness,
    reverseCharge: typeof rawData?.reverseCharge !== 'undefined' ? rawData.reverseCharge : false,
    taxRule: rawData?.taxRule || 'DE_TAXABLE',
    taxRuleLabel: rawData?.taxRuleLabel || '',
    // Steuerregel-Text für die Anzeige
    taxRuleText: (() => {
      const rule = rawData?.taxRule || 'DE_TAXABLE';
      switch (rule) {
        case 'DE_TAXABLE':
          return 'Der Steuerbetrag in Höhe von €' + (previewData.tax || 0).toFixed(2) + ' entspricht 19% gemäß §12 Abs. 1 UStG.';
        case 'DE_REDUCED':
          return 'Der Steuerbetrag in Höhe von €' + (previewData.tax || 0).toFixed(2) + ' entspricht 7% gemäß §12 Abs. 2 UStG.';
        case 'DE_NOTAXABLE':
          return 'Gemäß §19 UStG wird keine Umsatzsteuer berechnet.';
        case 'EU_REVERSE_CHARGE':
          return 'Steuerschuldnerschaft des Leistungsempfängers nach §13b UStG (Reverse Charge)';
        case 'EU_OSS':
          return 'Diese Leistung wird im Rahmen des EU One Stop Shop (OSS) nach §18j UStG versteuert.';
        case 'NON_EU':
          return 'Der Leistungsort liegt außerhalb der EU. Diese Leistung unterliegt nicht der deutschen Umsatzsteuer.';
        default:
          return '';
      }
    })(),

    // === E-RECHNUNG UND COMPLIANCE ===
    eInvoiceEnabled: rawData?.eInvoiceEnabled || false,
    complianceErrors: rawData?.complianceErrors || [],
    invalidFields: rawData?.invalidFields || [],

    // === KONTAKTTYP UND ADRESS-ZUSÄTZE ===
    contactType: rawData?.contactType || 'organisation',
    showAddressAddition: rawData?.showAddressAddition || false,

    // === LIEFERDATUM-SYSTEM ===
    deliveryDateType: rawData?.deliveryDateType || 'single',
    deliveryDateRange: rawData?.deliveryDateRange || {},

    // === NUMMERNKREIS-SYSTEM ===
    numberingFormat: rawData?.numberingFormat || 'RE-%NUMBER',
    nextNumber: rawData?.nextNumber || 1000,

    // === TEMPLATE-AUSWAHL ===
    // Immer CorporateClassicTemplate verwenden
    selectedTemplate: 'corporate-classic',
    templateId: 'corporate-classic',

    // === ERWEITERTE TEMPLATE-FELDER ===
    projectName: rawData?.projectName || '',
    departmentName: rawData?.departmentName || '',
    costCenter: rawData?.costCenter || '',
    executiveSummary: rawData?.executiveSummary || '',
    strategicNotes: rawData?.strategicNotes || '',
    designNotes: rawData?.designNotes || '',
    creativeDirection: rawData?.creativeDirection || '',
    technicalSpecs: rawData?.technicalSpecs || '',
    systemRequirements: rawData?.systemRequirements || '',

    // === WÄHRUNGS- UND LOKALISIERUNGSFELDER ===
    language: 'de',
    locale: 'de-DE',
    timezone: 'Europe/Berlin',

    // === BRANDING UND DESIGN ===
    brandColor: rawData?.brandColor || '#14ad9f',
    accentColor: rawData?.accentColor || '#14ad9f',
    logoPosition: rawData?.logoPosition || 'top-right',

    // === PREISANZEIGE-OPTIONEN ===
    showNet: rawData?.showNet !== false,
    showGross: rawData?.showGross === true,

    // === ERWEITERTE GESCHÄFTSFELDER ===
    industryType: rawData?.industryType || '',
    businessType: rawData?.businessType || 'B2B',
    marketSegment: rawData?.marketSegment || '',

    // === ZUSÄTZLICHE FELDER AUS CREATE-PAGE ===
    textTemplates: rawData?.textTemplates || [],
    selectedHeadTemplate: rawData?.selectedHeadTemplate || '',
    selectedFooterTemplate: rawData?.selectedFooterTemplate || '',

    // UI-Status Felder
    showDetailedOptions: rawData?.showDetailedOptions || false,
    taxDEOpen: rawData?.taxDEOpen !== false,
    taxEUOpen: rawData?.taxEUOpen || false,
    taxNonEUOpen: rawData?.taxNonEUOpen || false,

    // E-Mail Versand Felder
    emailTo: rawData?.emailTo || previewData.customerEmail || '',
    emailSubject: rawData?.emailSubject || `Rechnung ${previewData.invoiceNumber}`,
    emailBody: rawData?.emailBody || '',

    // Inventar-Bezug
    inventoryItems: rawData?.inventoryItems || [],

    // === QUALITÄTSSICHERUNG UND VALIDIERUNG ===
    validationStatus: 'validated',
    dataCompleteness: 'complete',
    templateCompatibility: 'full',

    // === LEGACY-FELDER FÜR RÜCKWÄRTSKOMPATIBILITÄT ===
    quoteNumber: previewData.invoiceNumber,
    quoteDate: previewData.date,
    customerCompany: previewData.customerName,
    companyOwner: rawData?.companyOwner || '',

    // === ZUSÄTZLICHE ALIAS-FELDER ===
    documentType: 'invoice',
    documentTypeLabel: 'Rechnung',
    netAmount: previewData.amount,
    grossAmount: previewData.total,

    // === BERECHNETE FELDER ===
    itemCount: (previewData.items || []).length,
    hasItems: (previewData.items || []).length > 0,
    hasDiscount: (previewData.items || []).some(item => ((item as any).discountPercent || 0) > 0),
    hasMultipleItems: (previewData.items || []).length > 1,

    // === FORMATIERTE DATUMSFELDER ===
    formattedDate: new Date(previewData.date).toLocaleDateString('de-DE'),
    formattedDueDate: new Date(previewData.dueDate).toLocaleDateString('de-DE'),
    formattedServiceDate: rawData?.serviceDate ? new Date(rawData.serviceDate).toLocaleDateString('de-DE') : '',

    // === STEUERBERECHNUNG DETAILS ===
    taxCalculation: {
      subtotal: previewData.amount,
      taxRate: previewData.vatRate,
      taxAmount: previewData.tax,
      total: previewData.total,
      isSmallBusiness: typeof rawData?.isSmallBusiness !== 'undefined' ? rawData.isSmallBusiness : previewData.isSmallBusiness,
      currency: rawData?.currency || 'EUR',
      reverseCharge: isReverseCharge,
      hideVatLine: hideVatLine,
      // Den Steuerregel-Text direkt hier berechnen
      taxRuleText: (() => {
        const rule = rawData?.taxRule || 'DE_TAXABLE';
        switch (rule) {
          case 'DE_TAXABLE':
            return 'Der Steuerbetrag in Höhe von €' + (previewData.tax || 0).toFixed(2) + ' entspricht 19% gemäß §12 Abs. 1 UStG.';
          case 'DE_REDUCED':
            return 'Der Steuerbetrag in Höhe von €' + (previewData.tax || 0).toFixed(2) + ' entspricht 7% gemäß §12 Abs. 2 UStG.';
          case 'DE_NOTAXABLE':
            return 'Gemäß §19 UStG wird keine Umsatzsteuer berechnet.';
          case 'DE_REVERSE_13B':
            return 'Steuerschuldnerschaft des Leistungsempfängers nach §13b UStG. Es wird keine Umsatzsteuer ausgewiesen.';
          case 'EU_REVERSE_CHARGE':
            return 'Steuerschuldnerschaft des Leistungsempfängers nach §13b UStG (Reverse Charge)';
          case 'EU_OSS':
            return 'Diese Leistung wird im Rahmen des EU One Stop Shop (OSS) nach §18j UStG versteuert.';
          case 'NON_EU':
            return 'Der Leistungsort liegt außerhalb der EU. Diese Leistung unterliegt nicht der deutschen Umsatzsteuer.';
          default:
            return '';
        }
      })()
    }
  };

  // Debug-Ausgaben entfernt

  return (
    <>
      {/* Print-spezifische CSS-Optimierungen */}
      <style jsx global>{`
        @page {
          size: A4;
          margin: 0;
        }
        @media print {
          html, body {
            width: 21cm;
            height: 29.7cm;
          }
        }
        body.print-page {
          margin: 0 !important;
          padding: 0 !important;
          background-color: #fff !important;
          font-family:
            'Inter',
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;
          line-height: 1.4;
          font-size: 14px;
          width: 21cm;
          min-height: 29.7cm;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body.print-page * {
          visibility: hidden !important;
        }

        body.print-page .invoice-print-content,
        body.print-page .invoice-print-content * {
          visibility: visible !important;
        }

        body.print-page > *:not(.invoice-print-content) {
          display: none !important;
        }

        .invoice-print-content {
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        .invoice-print-content * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        .bg-\\[\\#14ad9f\\] {
          background-color: #14ad9f !important;
        }
        .text-\\[\\#14ad9f\\] {
          color: #14ad9f !important;
        }
      `}</style>

      {/* NUR dieser Container wird gedruckt */}
      {/* Debug-Informationen */}
      <div className="debug-info" style={{ display: 'none' }}>
        <pre>{JSON.stringify({ rawData, templateData }, null, 2)}</pre>
      </div>

      {/* Debug-Ausgabe */}
      {process.env.NODE_ENV === 'development' && (
        <script dangerouslySetInnerHTML={{
          __html: `
            console.log('🔍 Preview Data:', ${JSON.stringify({
              template: rawData?.selectedTemplate || DEFAULT_INVOICE_TEMPLATE,
              company: templateData?.company,
              items: templateData?.items?.length,
              customizations: {
                showLogo: true,
                logoUrl: templateData?.companyLogo
              }
            })});
          `
        }} />
      )}

      <div className="invoice-print-content">
        <InvoiceTemplateRenderer
          template="professional-business"
          data={{
            ...templateData,
            company: {
              name: templateData.companyName,
              email: templateData.companyEmail,
              phone: templateData.companyPhone,
              website: templateData.companyWebsite,
              vatId: templateData.companyVatId,
              taxNumber: templateData.companyTaxNumber,
              logo: templateData.companyLogo,
              address: {
                street: templateData.companyAddress?.split('\n')[0] || '',
                zipCode: templateData.companyAddress?.split('\n')[1]?.split(' ')[0] || '',
                city: templateData.companyAddress?.split('\n')[1]?.split(' ').slice(1).join(' ') || '',
                country: templateData.companyAddress?.split('\n')[2] || 'DE'
              },
              bankDetails: {
                iban: templateData.bankDetails?.iban || '',
                bic: templateData.bankDetails?.bic || '',
                bankName: templateData.bankDetails?.bankName || '',
                accountHolder: templateData.bankDetails?.accountHolder || templateData.companyName
              }
            },
            documentNumber: templateData.invoiceNumber,
            date: templateData.date,
            serviceDate: templateData.serviceDate || templateData.date,
            servicePeriod: templateData.servicePeriod,
            reference: templateData.reference,
            currency: templateData.currency || 'EUR',
            items: templateData.items.map((item: any, index: number) => ({
              ...item,
              position: index + 1
            }))
          }}
          companySettings={{
            companyName: templateData.companyName,
            companyAddress: templateData.companyAddress,
            companyEmail: templateData.companyEmail,
            companyPhone: templateData.companyPhone,
            companyWebsite: templateData.companyWebsite,
            companyVatId: templateData.companyVatId,
            companyTaxNumber: templateData.companyTaxNumber,
            companyLogo: templateData.companyLogo,
            logoUrl: templateData.companyLogo,
            iban: templateData.bankDetails?.iban,
            bic: templateData.bankDetails?.bic,
            bankName: templateData.bankDetails?.bankName,
            accountHolder: templateData.bankDetails?.accountHolder
          }}
          customizations={{
            showLogo: true,
            logoUrl: templateData.companyLogo
          }}
        />
      </div>
    </>
  );
}

// Haupt-Komponente mit Suspense-Boundary
export default function PrintInvoicePreviewPage() {
  return (
    <Suspense fallback={<div>Lade...</div>}>
      <PrintInvoicePreview />
    </Suspense>
  );
}