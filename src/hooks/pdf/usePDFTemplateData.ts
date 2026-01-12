'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { InvoiceData, TaxRuleType } from '@/types/invoiceTypes';
import { formatDate } from '@/lib/utils';
import { DocumentType, detectDocumentType, getDocumentTypeConfig } from '@/lib/document-utils';
import { replacePlaceholders, type PlaceholderData } from '@/utils/placeholderSystem';
import { translateStandardFooterText } from '@/hooks/pdf/useDocumentTranslation';

// Hilfsfunktion zur Pruefung ob eine Steuerregel keine Steuer berechnet
function isTaxExemptRule(taxRule: string | undefined): boolean {
  if (!taxRule) return false;
  
  // Reverse Charge Regeln
  if (taxRule.includes('REVERSE')) return true;
  if (taxRule === TaxRuleType.DE_REVERSE_13B) return true;
  if (taxRule === TaxRuleType.EU_REVERSE_18B) return true;
  
  // Steuerfreie Regeln
  if (taxRule === TaxRuleType.DE_EXEMPT_4_USTG) return true;
  if (taxRule === TaxRuleType.EU_INTRACOMMUNITY_SUPPLY) return true;
  if (taxRule === TaxRuleType.NON_EU_EXPORT) return true;
  if (taxRule === TaxRuleType.NON_EU_OUT_OF_SCOPE) return true;
  
  return false;
}

// Hook zum Laden der Kundennummer basierend auf Kundenname
export function useCustomerNumber(companyId: string, customerName: string): string {
  const [customerNumber, setCustomerNumber] = useState('');

  useEffect(() => {
    if (!companyId || !customerName) {
      setCustomerNumber('');
      return;
    }

    const loadCustomerNumber = async () => {
      try {
        // Versuche zuerst die Subcollection Struktur (nur falls authentifiziert)
        if (companyId && customerName) {
          const customersQuery = query(
            collection(db, 'companies', companyId, 'customers'),
            where('name', '==', customerName),
            limit(1)
          );

          const querySnapshot = await getDocs(customersQuery);

          if (!querySnapshot.empty) {
            const customerDoc = querySnapshot.docs[0];
            const customerData = customerDoc.data();
            setCustomerNumber(customerData.customerNumber || '');
            return;
          }
        }
        
        // Fallback: Generiere Kundennummer aus dem Namen (ohne DB-Zugriff)
        const nameWords = customerName.split(' ').filter((word) => word.length > 0);
        let fallbackNumber = '';

        if (nameWords.length === 1) {
          fallbackNumber = `${nameWords[0].substring(0, 4).toUpperCase()}-001`;
        } else {
          const initials = nameWords.map((word) => word.charAt(0).toUpperCase()).join('');
          fallbackNumber = `${initials}-001`;
        }

        setCustomerNumber(fallbackNumber);
      } catch {
        // Stiller Fallback bei Fehlern - keine Console-Error-Ausgabe
        const nameWords = customerName.split(' ').filter((word) => word.length > 0);
        const initials = nameWords
          .map((word) => word.charAt(0).toUpperCase())
          .join('')
          .substring(0, 4);
        setCustomerNumber(`${initials}-001`);
      }
    };

    loadCustomerNumber();
  }, [companyId, customerName]);

  return customerNumber;
}

export interface DocumentSettings {
  language: string;
  showQRCode: boolean;
  showEPCQRCode: boolean;
  showCustomerNumber: boolean;
  showContactPerson: boolean;
  showVATPerPosition: boolean;
  showArticleNumber: boolean;
  showFoldLines: boolean;
  showPageNumbers: boolean;
  showFooter: boolean;
  showWatermark: boolean;
  qrCodeUrl?: string; // QR-Code URL für die Anzeige im Template
  epcQrCodeUrl?: string; // EPC QR-Code URL für SEPA-Überweisungen (Girocode)
}

export interface PDFTemplateProps {
  document: InvoiceData | any; // Flexibel für verschiedene Datentypen
  template: string;
  color: string;
  logoUrl?: string | null;
  logoSize?: number;
  documentType: DocumentType;
  pageMode?: 'single' | 'multi';
  documentSettings?: DocumentSettings;
  userData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    uid?: string;
  };
}

export interface ParsedAddress {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface ProcessedPDFData {
  // Document labels
  documentLabel: string;

  // Calculated values
  realItems: any[];
  vatRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;

  // Formatted dates
  formattedInvoiceDate: string;
  formattedDueDate: string;

  // Company data
  companyAddressParsed: ParsedAddress;
  customerAddressParsed: ParsedAddress;

  // Original data for fallback
  originalDocument: any;

  // Settings
  language: string;
  isSmallBusiness: boolean;

  // Template texts (processed with placeholders)
  processedHeaderText: string;
  processedFooterText: string;
  processedHeadTextHtml: string;

  // All other fields from document
  [key: string]: any;

  // Company details
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  companyTaxNumber: string;
  companyVatId: string;

  // Customer details
  customerName: string;
  customerAddress: string;
  customerEmail: string;
  customerOrderNumber?: string; // Referenznummer / Bestellnummer des Kunden
  customerVatId?: string; // USt-IdNr. des Kunden
  customerPhone?: string; // Telefon des Kunden

  // Invoice details
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  title?: string; // Betreff für Stornorechnungen

  // Items
  items: any[];

  // Text content
  description: any;
  headerText: any;
  footerText: any;
  headTextHtml: any;
  introText: any;
  notes: any;
  hinweise: any;
  additionalNotes: any;
  conclusionText: any;
  paymentTerms: any;
  deliveryDate: any;
  servicePeriod: any;
  internalContactPerson: any;
  contactPersonName: any;

  // Tax settings
  priceInput: string;
  taxRuleType: string;

  // Bank details
  bankDetails: any;
}

function parseAddress(address: string | {street?: string;city?: string;postalCode?: string;country?: string;} | null): ParsedAddress {
  if (!address) {
    return { street: '', city: '', postalCode: '', country: '' };
  }

  // Wenn address bereits ein Objekt ist, direkt verwenden
  if (typeof address === 'object' && address !== null) {
    return {
      street: address.street || '',
      city: address.city || '',
      postalCode: address.postalCode || '',
      country: address.country || ''
    };
  }

  // Wenn address ein String ist, wie bisher parsen
  const lines = address.
  split('\n').
  map((line) => line.trim()).
  filter((line) => line);

  if (lines.length === 0) {
    return { street: '', city: '', postalCode: '', country: '' };
  }

  // Einfache Parsing-Logik
  const street = lines[0] || '';
  const cityLine = lines[1] || '';
  const country = lines[2] || '';

  // PLZ und Stadt aus der zweiten Zeile extrahieren
  const cityMatch = cityLine.match(/^(\d+)\s+(.+)$/);
  const postalCode = cityMatch ? cityMatch[1] : '';
  const city = cityMatch ? cityMatch[2] : cityLine;

  return { street, city, postalCode, country };
}

export function usePDFTemplateData(props: PDFTemplateProps): ProcessedPDFData {
  const { document: documentData, logoUrl, logoSize, documentSettings, userData } = props;
  const language = documentSettings?.language || (documentData as any).language || 'de';

  // 🔥 Kundendaten-Anreicherung mit Firestore - DEFENSIVE PROGRAMMIERUNG
  const companyId = documentData && typeof documentData === 'object' ? 
    ((documentData as any).companyId || '') : '';
  const customerName = documentData?.customerName || 'Kunde';
  const enrichedCustomerNumber = useCustomerNumber(companyId, customerName);

  return useMemo(() => {
    // Dokumenttyp erkennen - props.documentType hat Vorrang
    const detectedType = props.documentType || detectDocumentType(documentData);
    const _documentTypeConfig = getDocumentTypeConfig(detectedType);

    // Steuerregel aus Dokument extrahieren
    const taxRule = (documentData as any).taxRule || (documentData as any).taxRuleType;
    const isTaxExempt = isTaxExemptRule(taxRule);

    // Items verarbeiten
    const realItems = documentData.items || [];
    // Bei steuerfreien Regeln (Reverse Charge, etc.) ist der Steuersatz effektiv 0
    const vatRate = isTaxExempt ? 0 : (documentData.vatRate || (documentData as any).taxRate || 19);

    // Beträge berechnen
    let subtotal = 0;
    let taxAmount = 0;

    realItems.forEach((item: any) => {
      // Verwende unitPrice (nicht price) und berücksichtige discountPercent
      const unitPrice = item.unitPrice || item.price || 0;
      const quantity = item.quantity || 0;
      const discountPercent = item.discountPercent || 0;
      
      // Berechne Gesamtpreis: (Menge × Einzelpreis) × (1 - Rabatt/100)
      const itemTotal = quantity * unitPrice * (1 - discountPercent / 100);
      subtotal += itemTotal;
    });

    // Steuer nur berechnen wenn NICHT Kleinunternehmer UND NICHT steuerbefreit (Reverse Charge, etc.)
    if (!documentData.isSmallBusiness && !isTaxExempt) {
      taxAmount = subtotal * (vatRate / 100);
    }

    const total = subtotal + taxAmount;

    // Dokument-Label basierend auf Dokumenttyp und Sprache
    const getDocumentLabel = () => {
      const detectedType = props.documentType || detectDocumentType(documentData);

      if (language === 'en') {
        switch (detectedType) {
          case 'quote':
            return 'Quote';
          case 'invoice':
            return 'Invoice';
          case 'reminder':
            return 'Reminder';
          case 'credit-note':
            return 'Credit Note';
          case 'cancellation':
            return 'Cancellation';
          default:
            return 'Document';
        }
      } else {
        // Deutsch (Standard)
        switch (detectedType) {
          case 'quote':
            return 'Angebot';
          case 'invoice':
            return 'Rechnung';
          case 'reminder':
            return 'Mahnung';
          case 'credit-note':
            return 'Gutschrift';
          case 'cancellation':
            return 'Stornorechnung';
          default:
            return 'Dokument';
        }
      }
    };

    const documentLabel = getDocumentLabel();

    // Datumsformatierung mit korrigierter formatDate Funktion
    const formattedInvoiceDate = formatDate(
      documentData.date || documentData.issueDate || (documentData as any).invoiceDate || ''
    );
    const formattedDueDate = formatDate(
      documentData.dueDate || (documentData as any).validUntil || ''
    );

    // Benutzerfreundlichere Bezeichnungen



    const companyName = documentData.companyName || 'Ihr Unternehmen';

    const customerName = documentData.customerName || 'Kunde';
    const invoiceNumber =
    documentData.invoiceNumber ||
    documentData.number ||
    documentData.documentNumber ||
    (documentData as any).title ||
    'INV-001';
    const invoiceDate = formatDate(
      documentData.date || documentData.issueDate || (documentData as any).invoiceDate || ''
    );
    const dueDate = formatDate(documentData.dueDate || (documentData as any).validUntil || '');
    const sequentialNumber = (documentData as any).sequentialNumber || '';

    // Kundendaten
    const customerAddress = documentData.customerAddress || '';
    const customerEmail = documentData.customerEmail || '';
    const customerPhone = (documentData as any).customerPhone || '';
    const customerNumber = enrichedCustomerNumber || (documentData as any).customerNumber || ''; // 🔥 Angereicherte Kundennummer mit Firestore-Fallback
    // customerOrderNumber kann als "customerOrderNumber" oder "reference" übergeben werden
    const customerOrderNumber = (documentData as any).customerOrderNumber || (documentData as any).reference || '';
    const customerFirstName = (documentData as any).customerFirstName || '';
    const customerLastName = (documentData as any).customerLastName || '';
    const customerTaxNumber = (documentData as any).customerTaxNumber || '';
    const customerVatId = (documentData as any).customerVatId || '';

    // Firmendaten
    const companyAddress = documentData.companyAddress || '';
    const companyEmail = documentData.companyEmail || '';
    const companyPhone = documentData.companyPhone || '';
    const companyWebsite = documentData.companyWebsite || '';
    const companyVatId = documentData.companyVatId || '';
    const companyTaxNumber = documentData.companyTaxNumber || '';
    const _companyRegister = (documentData as any).companyRegister || '';

    // Textinhalte
    const headTextHtml = (documentData as any).headTextHtml;
    const description = documentData.description;
    const introText = (documentData as any).introText;
    const headerText = (documentData as any).headerText;
    
    // Footer-Text (bereits mit Platzhaltern aus Datenbank) + Übersetzung
    let footerText = (documentData as any).footerText || '';
    // Übersetze Standard-Footer-Text basierend auf Sprache
    footerText = translateStandardFooterText(footerText, language);
    
    const notes = (documentData as any).notes;
    const hinweise = (documentData as any).hinweise;
    const additionalNotes = (documentData as any).additionalNotes;
    const conclusionText = (documentData as any).conclusionText;
    const paymentTerms = documentData.paymentTerms || (documentData as any).paymentTerms;
    const deliveryDate = (documentData as any).deliveryDate;
    const servicePeriod = (documentData as any).servicePeriod;
    const internalContactPerson = (documentData as any).internalContactPerson;
    const contactPersonName = (documentData as any).contactPersonName;

    // Steuereinstellungen
    const isSmallBusiness = documentData.isSmallBusiness || false;
    const priceInput = (documentData as any).priceInput || 'netto';
    const taxRuleType = (documentData as any).taxRuleType || '';

    // Adress-Parsing
    const companyAddressParsed = parseAddress(companyAddress);
    const customerAddressParsed = parseAddress(customerAddress);

    // 🆕 Platzhalter-Daten erstellen und Texte verarbeiten - ALLE verfügbaren Platzhalter
    const placeholderData: PlaceholderData = {
      // Firmen-Informationen
      companyName,
      companyStreet: companyAddressParsed.street,
      companyCity: companyAddressParsed.city,
      companyPostalCode: companyAddressParsed.postalCode,
      companyCountry: companyAddressParsed.country,
      companyPhone,
      companyEmail,
      companyWebsite,
      companyTaxNumber,
      companyVatId,
      companyRegistrationNumber:
      (documentData as any).companyRegister ||
      (documentData as any).companyRegistrationNumber ||
      '',
      companyIban: (documentData as any).companyIban || '',
      companyBic: (documentData as any).companyBic || '',
      companyFax: (documentData as any).companyFax || '',

      // Kunden-Informationen (vollständig)
      customerName,
      customerEmail,
      customerAddress:
      customerAddress || (// Original falls vorhanden
      customerAddressParsed.street // Ansonsten aus parsed zusammenbauen
      ? `${customerAddressParsed.street}\n${customerAddressParsed.postalCode} ${customerAddressParsed.city}\n${customerAddressParsed.country}`.trim() :
      ''), // Leer lassen wenn keine Daten
      customerStreet: customerAddressParsed.street,
      customerCity: customerAddressParsed.city,
      customerPostalCode: customerAddressParsed.postalCode,
      customerCountry: customerAddressParsed.country,
      customerPhone,
      customerNumber,
      customerOrderNumber,
      customerFirstName,
      customerLastName,
      customerTaxNumber,
      customerVatId,

      // Dokument-Informationen
      documentNumber: invoiceNumber,
      invoiceNumber: invoiceNumber, // Für RECHNUNGSNUMMER
      quoteNumber: (documentData as any).quoteNumber || invoiceNumber,
      documentDate:
      invoiceDate ||
      formatDate((documentData as any).date || (documentData as any).createdAt || ''), // Für RECHNUNGSDATUM
      dueDate: dueDate, // Nur wenn vorhanden
      validUntil:
      dueDate ||
      formatDate((documentData as any).validUntil || (documentData as any).expiryDate || ''), // Für GUELTIG_BIS
      expiryDate:
      formatDate((documentData as any).expiryDate || '') ||
      dueDate ||
      formatDate((documentData as any).validUntil || ''),
      serviceDate:
      formatDate(
        (documentData as any).serviceDate ||
        (documentData as any).performanceDate ||
        (documentData as any).deliveryDate ||
        ''
      ) ||
      invoiceDate ||
      '', // Für LEISTUNGSDATUM
      servicePeriod: (documentData as any).servicePeriod || '',

      // Beträge (auch wenn 0, damit Platzhalter ersetzt werden)
      totalAmount: total, // Für GESAMTBETRAG
      subtotalAmount: subtotal, // Für NETTOBETRAG
      taxAmount: taxAmount,
      netAmount: subtotal,

      // Zahlungskonditionen
      paymentTerms: paymentTerms || (documentData as any).paymentTerms || '', // Nur wenn vorhanden
      skontoText: (documentData as any).skontoText || '',

      // Kontaktperson - Prioritätsbasierte Fallback-Logik
      internalContactPerson:
      userData?.firstName && userData?.lastName ?
      `${userData.firstName} ${userData.lastName}` :
      (documentData as any).internalContactPerson ||
      (documentData as any).contactPerson ||
      '',

      contactPersonName: (documentData as any).contactPersonName || '',

      // User-spezifische Daten
      firstName: userData?.firstName || '',
      lastName: userData?.lastName || '',
      userEmail: userData?.email || '',
      userPhone: userData?.phone || '',

      // Template-Texte
      headerText: (documentData as any).headerText || '',
      footerText: (documentData as any).footerText || '',
      introText: (documentData as any).introText || (documentData as any).description || '',
      closingText: (documentData as any).closingText || '',

      // Gültigkeitsdatum
      // Gültigkeit (bereits oben mit besseren Fallbacks definiert)

      // Kleine Unternehmer Regelung
      isSmallBusiness: isSmallBusiness,

      // Erweiterte Firmen-Daten (companyFax und companyRegister bereits oben definiert)

      // Erweiterte Kunden-Daten
      customerCompany: (documentData as any).customerCompany || customerName,
      customerFax: (documentData as any).customerFax || '',
      customerWebsite: (documentData as any).customerWebsite || '',
      customerRegister: (documentData as any).customerRegister || '',

      // Erweiterte Beträge und Finanzen
      discountAmount: (documentData as any).discountAmount || 0,
      discountPercentage: (documentData as any).discountPercentage || 0,
      orderNumber:
      (documentData as any).orderNumber || (documentData as any).purchaseOrderNumber || '',
      currency: (documentData as any).currency || 'EUR',

      // Steuersatz
      vatRate: vatRate,

      // Projekt-Informationen
      projectTitle: (documentData as any).projectTitle || (documentData as any).title || '',
      projectDescription:
      (documentData as any).projectDescription || (documentData as any).description || '',

      // Bank-Daten aus document übernehmen (für Fallback-Zugriff)
      bankDetails: (documentData as any).bankDetails,
      step4: (documentData as any).step4,
      step3: (documentData as any).step3,

      // Projekt-Informationen bereits oben definiert

      // Aktuelle Zeit-Informationen (für Datumsplatzhalter)
      currentDate: new Date().toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US'),
      currentYear: new Date().getFullYear().toString(),
      currentMonth: new Date().toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
        month: 'long'
      })
    };

    // Platzhalter in Texten ersetzen mit Sprach-Support
    const docLanguage = language || 'de'; // Verwende bereits vorhandene language Variable
    const processedHeaderText = replacePlaceholders(headerText, placeholderData, docLanguage);
    const processedFooterText = replacePlaceholders(footerText, placeholderData, docLanguage);
    const processedHeadTextHtml = replacePlaceholders(headTextHtml, placeholderData, docLanguage);

    return {
      documentLabel,
      realItems,
      vatRate,
      subtotal,
      taxAmount,
      total,
      formattedInvoiceDate,
      formattedDueDate,
      companyAddressParsed,
      customerAddressParsed,
      originalDocument: documentData,
      language,
      isSmallBusiness,
      processedHeaderText,
      processedFooterText,
      processedHeadTextHtml,

      // Direct fields
      companyName,
      companyAddress,
      companyPhone,
      companyEmail,
      companyWebsite,
      companyTaxNumber,
      companyVatId,
      customerName,
      customerAddress,
      customerEmail,
      customerNumber, // Kundennummer aus Dokument oder Datenbank
      companyId: (documentData as any).companyId || '', // Company ID für useCustomerNumber Hook
      invoiceNumber,
      invoiceDate,
      dueDate,
      validUntil: dueDate, // Für Template-Kompatibilität - bereits formatiert
      date: invoiceDate, // Für Template-Kompatibilität - bereits formatiert
      sequentialNumber,
      title: (documentData as any).title || '', // Betreff für Stornorechnungen
      originalInvoiceNumber: (documentData as any).originalInvoiceNumber || '', // Original-Rechnungsnummer bei Storno
      stornoNumber: (documentData as any).stornoNumber || '', // Storno-Nummer
      
      // Kunden-Zusatzdaten
      customerOrderNumber, // Referenznummer / Bestellnummer des Kunden
      customerVatId, // USt-IdNr. des Kunden
      customerPhone, // Telefon des Kunden

      items: realItems,
      description,
      headerText,
      footerText,
      headTextHtml,
      introText,
      notes,
      hinweise,
      additionalNotes,
      conclusionText,
      paymentTerms,
      deliveryDate,
      servicePeriod,
      internalContactPerson,
      contactPersonName,
      priceInput,
      taxRuleType,
      bankDetails: (documentData as any).bankDetails,

      // Fehlende Eigenschaften aus Screenshots (nur neue)
      taxRule: (documentData as any).taxRule || '',
      showNet: (documentData as any).showNet || false,
      taxGrouped: (documentData as any).taxGrouped || false,
      skontoEnabled: (documentData as any).skontoEnabled || false,
      skontoDays: (documentData as any).skontoDays || 0,
      skontoPercentage: (documentData as any).skontoPercentage || 0,
      skontoText: (documentData as any).skontoText || '',
      eInvoice: (documentData as any).eInvoice || false,
      eInvoiceData: (documentData as any).eInvoiceData || {},
      status: (documentData as any).status || 'draft',
      currency: (documentData as any).currency || 'EUR',
      createdBy: (documentData as any).createdBy || '',
      deliveryTerms: (documentData as any).deliveryTerms || '',
      companyLogo: (() => {
        const resolvedLogo =
        (documentData as any).companyLogo ||
        logoUrl ||
        (documentData as any).profilePictureURL ||
        (documentData as any).profilePictureFirebaseUrl ||
        '';

        return resolvedLogo;
      })(),
      logoSize: logoSize || 80,

      // QR-Code URLs aus documentSettings
      qrCodeUrl: documentSettings?.qrCodeUrl,
      epcQrCodeUrl: documentSettings?.epcQrCodeUrl
    };
  }, [documentData, logoUrl, logoSize, documentSettings, userData]);
}