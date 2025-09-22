'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { InvoiceTemplateRenderer, DEFAULT_INVOICE_TEMPLATE } from '@/components/finance/InvoiceTemplates';
import type { InvoiceData } from '@/types/invoiceTypes';

export default function PrintInvoicePreviewPage() {
  const searchParams = useSearchParams();
  const [previewData, setPreviewData] = useState<InvoiceData | null>(null);
  const [rawData, setRawData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
            
            // 🔍 DEBUG: Zeige alle empfangenen Daten
            console.log('=== PRINT PREVIEW DEBUG ===');
            console.log('Empfangene Raw-Daten:', decoded);
            console.log('Alle Felder im Decoded-Objekt:', Object.keys(decoded));
            console.log('Kundendaten:', {
              customerName: decoded.customerName,
              customerEmail: decoded.customerEmail,
              customerAddress: decoded.customerAddress,
              customerOrderNumber: decoded.customerOrderNumber
            });
            console.log('Rechnungsinfo:', {
              invoiceNumber: decoded.invoiceNumber,
              date: decoded.date,
              validUntil: decoded.validUntil,
              deliveryDate: decoded.deliveryDate,
              serviceDate: decoded.serviceDate,
              servicePeriod: decoded.servicePeriod
            });
            console.log('Firmendaten:', {
              companyName: decoded.companyName,
              companyAddress: decoded.companyAddress,
              companyEmail: decoded.companyEmail,
              companyPhone: decoded.companyPhone,
              companyVatId: decoded.companyVatId,
              companyTaxNumber: decoded.companyTaxNumber
            });
            console.log('Positionen:', decoded.items);
            console.log('Finanzielle Daten:', {
              subtotal: decoded.subtotal,
              tax: decoded.tax,
              total: decoded.total,
              vatRate: decoded.vatRate
            });
            console.log('Texte:', {
              headTextHtml: decoded.headTextHtml,
              notes: decoded.notes,
              footerText: decoded.footerText,
              paymentTerms: decoded.paymentTerms,
              description: decoded.description
            });
            console.log('🔧 TEMPLATE-STRUKTUR VALIDIERUNG:');
            console.log('1️⃣ HEADER-TEXT (vor Rechnung):', {
              'rawData.headTextHtml': decoded.headTextHtml,
              'Länge': (decoded.headTextHtml || '').length,
              'Hat Platzhalter': (decoded.headTextHtml || '').includes('[%'),
              'Wird als description gesetzt': !!decoded.headTextHtml
            });
            console.log('2️⃣ RECHNUNGS-TABELLE: [IMMER VORHANDEN]');
            console.log('3️⃣ FOOTER-TEXT (Hinweise nach Rechnung):', {
              'rawData.footerText': decoded.footerText,
              'Länge': (decoded.footerText || '').length,
              'Hat Platzhalter': (decoded.footerText || '').includes('[%'),
              'Wird als hinweise gesetzt': !!decoded.footerText
            });
            console.log('Platzhalter-Status:', {
              headTextHasPlaceholders: (decoded.headTextHtml || '').includes('[%'),
              footerTextHasPlaceholders: (decoded.footerText || '').includes('[%'),
              shouldUseProcessedTexts: true
            });
            console.log('Kontakt und Zusatzfelder:', {
              contactPersonName: decoded.contactPersonName,
              internalContactPerson: decoded.internalContactPerson,
              deliveryTerms: decoded.deliveryTerms,
              taxRule: decoded.taxRule,
              reference: decoded.reference
            });
            console.log('=== END DEBUG ===');
            
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
              paymentTerms: decoded.paymentTerms || '',
              bankDetails: decoded.bankDetails || {
                iban: '',
                bic: '',
                accountHolder: decoded.companyName || 'Ihr Unternehmen'
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
    bankDetails: rawData?.bankDetails || previewData.bankDetails || {
      iban: '',
      bic: '',
      bankName: '',
      accountHolder: previewData.companyName
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
    selectedTemplate: rawData?.selectedTemplate || 'professional-business',
    templateId: rawData?.selectedTemplate || 'professional-business',

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
  currency: rawData?.currency || 'EUR'
    }
  };

  // Debug: Template-Daten ausgeben
  console.log('=== FINALE TEMPLATE-STRUKTUR ÜBERPRÜFUNG ===');
  console.log('� TEMPLATE AUFBAU (Sollte sein: Header → Tabelle → Footer)');
  console.log('1️⃣ HEADER-BEREICH:', {
    'templateData.description': templateData.description,
    'templateData.introText': templateData.introText,
    'templateData.headerText': templateData.headerText,
    'header_ist_vorhanden': !!(templateData.description || templateData.introText),
    'header_länge': (templateData.description || '').length
  });
  console.log('2️⃣ RECHNUNGS-TABELLE: [Automatisch durch InvoiceTemplateRenderer]');
  console.log('3️⃣ HINWEISE-BEREICH (nach Tabelle):', {
    'templateData.hinweise': templateData.hinweise,
    'templateData.additionalNotes': templateData.additionalNotes,
    'templateData.paymentNotes': templateData.paymentNotes,
    'templateData.conclusionText': templateData.conclusionText,
    'hinweise_ist_vorhanden': !!(templateData.hinweise || templateData.additionalNotes),
    'hinweise_länge': (templateData.hinweise || '').length
  });
  console.log('❌ TEMPLATE-FOOTER (muss KOMPLETT LEER sein):');
  console.log('   - templateData.notes:', `"${templateData.notes}"`);
  console.log('   - templateData.footerText:', `"${templateData.footerText}"`);
  console.log('   - templateData.footerNotes:', `"${templateData.footerNotes}"`);
  console.log('   - previewData.notes:', `"${previewData.notes}"`);
  console.log('   ✅ Alle sollten leer sein, damit Footer-Text nicht im Template-Footer erscheint!');
  console.log('📊 TEMPLATE DATA COMPLETE:', JSON.stringify(templateData, null, 2));
  console.log('=== END TEMPLATE STRUKTUR DEBUG ===');

  return (
    <>
      {/* Print-spezifische CSS-Optimierungen */}
      <style jsx global>{`
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
      <div className="invoice-print-content">
        <InvoiceTemplateRenderer
          template={DEFAULT_INVOICE_TEMPLATE}
          data={templateData}
          preview={false}
        />
      </div>
    </>
  );
}