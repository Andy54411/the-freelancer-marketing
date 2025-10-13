/**
 * PDF Generation Service für Email-Anhänge
 *
 * Generiert PDFs on-demand aus Firestore-Dokumenten (Invoices, Quotes)
 * mit Session-Caching für Performance-Optimierung.
 *
 * @module pdfGenerationService
 */

import { db } from '@/firebase/clients';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { InvoiceData } from '@/types/invoiceTypes';

interface PDFGenerationOptions {
  companyId: string;
  documentId: string;
  documentType: 'invoice' | 'quote';
  template?: string;
  color?: string;
  logoUrl?: string | null;
  logoSize?: number;
}

interface CompanySettings {
  name: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  email?: string;
  phone?: string;
  website?: string;
  taxNumber?: string;
  vatId?: string;
  iban?: string;
  bic?: string;
  bank?: string;
  accountHolder?: string;
  preferredInvoiceTemplate?: string;
  brandColor?: string;
  logoUrl?: string;
  logoSize?: number;
  footerText?: string;
  kleinunternehmer?: 'ja' | 'nein';
  registrationNumber?: string;
  legalForm?: string;
  districtCourt?: string;
  // Tax Rules
  defaultTaxRate?: string;
  taxMethod?: string;
  priceInput?: string;
  accountingSystem?: string;
}

/**
 * PDF Generation Service
 *
 * Bietet Funktionen zur On-Demand-Generierung von PDFs aus Firestore-Dokumenten.
 * Verwendet ReactDOMServer für Server-Side-Rendering und Playwright für PDF-Konvertierung.
 */
export class PDFGenerationService {
  /**
   * Generiert PDF aus einer Rechnung
   *
   * @param companyId - Firmen-ID
   * @param invoiceId - Rechnungs-ID
   * @param options - Optionale Einstellungen (Template, Farbe, Logo)
   * @returns Promise<File> - PDF als File-Objekt
   */
  static async generatePDFFromInvoice(
    companyId: string,
    invoiceId: string,
    options?: Partial<PDFGenerationOptions>
  ): Promise<File> {
    return this.generatePDF({
      companyId,
      documentId: invoiceId,
      documentType: 'invoice',
      ...options,
    });
  }

  /**
   * Generiert PDF aus einem Angebot
   *
   * @param companyId - Firmen-ID
   * @param quoteId - Angebots-ID
   * @param options - Optionale Einstellungen (Template, Farbe, Logo)
   * @returns Promise<File> - PDF als File-Objekt
   */
  static async generatePDFFromQuote(
    companyId: string,
    quoteId: string,
    options?: Partial<PDFGenerationOptions>
  ): Promise<File> {
    return this.generatePDF({
      companyId,
      documentId: quoteId,
      documentType: 'quote',
      ...options,
    });
  }

  /**
   * Interne Methode zur PDF-Generierung
   *
   * @private
   */
  private static async generatePDF(options: PDFGenerationOptions): Promise<File> {
    const { companyId, documentId, documentType, template, color, logoUrl, logoSize } = options;

    // 1. Lade Dokument aus Firestore
    const documentData = await this.loadDocument(companyId, documentId, documentType);

    // 2. Lade Company Settings
    const companySettings = await this.loadCompanySettings(companyId);

    // 3. Generiere HTML aus PDFTemplate
    const htmlContent = await this.renderPDFTemplate(
      documentData,
      companySettings,
      documentType,
      template || companySettings.preferredInvoiceTemplate || 'TEMPLATE_STANDARD',
      color || companySettings.brandColor || '#14b8a6',
      logoUrl !== undefined ? logoUrl : companySettings.logoUrl,
      logoSize !== undefined ? logoSize : companySettings.logoSize
    );

    // 4. Konvertiere HTML zu PDF via API
    const pdfBlob = await this.convertHTMLToPDF(htmlContent);

    // 5. Konvertiere Blob zu File mit korrektem Namen
    const fileName = this.generateFileName(documentData, documentType);
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

    return file;
  }

  /**
   * Lädt Dokument aus Firestore
   *
   * @private
   */
  private static async loadDocument(
    companyId: string,
    documentId: string,
    documentType: 'invoice' | 'quote'
  ): Promise<InvoiceData> {
    const collectionName = documentType === 'invoice' ? 'invoices' : 'quotes';
    const docRef = doc(db, 'companies', companyId, collectionName, documentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error(`${documentType} mit ID ${documentId} nicht gefunden`);
    }

    return { id: docSnap.id, ...docSnap.data() } as InvoiceData;
  }

  /**
   * Lädt Company Settings aus Firestore
   *
   * @private
   */
  private static async loadCompanySettings(companyId: string): Promise<CompanySettings> {
    const companyRef = doc(db, 'companies', companyId);
    const companySnap = await getDoc(companyRef);

    if (!companySnap.exists()) {
      throw new Error(`Company mit ID ${companyId} nicht gefunden`);
    }

    const data = companySnap.data();

    // Vollständige Company Settings mit allen Feldern
    return {
      name: data.companyName || '',
      street: data.companyStreet || '',
      postalCode: data.companyPostalCode || '',
      city: data.companyCity || '',
      country: data.companyCountry || '',
      houseNumber: data.companyHouseNumber || '',
      email: data.email || data.contactEmail || '',
      phone: data.phoneNumber || data.companyPhoneNumber || '',
      website: data.website || data.companyWebsite || '',
      taxNumber: data.taxNumber || '',
      vatId: data.vatId || '',
      iban: data.bankDetails?.iban || data.iban || '',
      bic: data.bankDetails?.bic || data.bic || '',
      bank: data.bankDetails?.bankName || data.bankName || '',
      accountHolder: data.bankDetails?.accountHolder || data.accountHolder || '',
      preferredInvoiceTemplate: data.preferredInvoiceTemplate || 'TEMPLATE_STANDARD',
      brandColor: data.color || '#14b8a6',
      logoUrl: data.profilePictureURL || data.profilePictureFirebaseUrl || data.logoUrl || null,
      logoSize: data.logoSize || 50,
      footerText: data.footerText || '',
      kleinunternehmer: data.kleinunternehmer || 'nein',
      registrationNumber: data.companyRegister || data.registrationNumber || '',
      legalForm: data.legalForm || '',
      districtCourt: data.districtCourt || '',
      // Tax Rules
      defaultTaxRate: data.defaultTaxRate || data.taxRate || '19',
      taxMethod: data.taxMethod || 'soll',
      priceInput: data.priceInput || 'netto',
      accountingSystem: data.accountingSystem || 'skr03',
    } as CompanySettings;
  }

  /**
   * Rendert PDFTemplate zu HTML (Server-Side)
   *
   * @private
   */
  private static async renderPDFTemplate(
    documentData: InvoiceData,
    companySettings: CompanySettings,
    documentType: 'invoice' | 'quote',
    template: string,
    color: string,
    logoUrl: string | null | undefined,
    logoSize: number | undefined
  ): Promise<string> {
    // Dynamischer Import für Server-Side Rendering
    const ReactDOMServer = (await import('react-dom/server')).default;
    const React = (await import('react')).default;
    const PDFTemplate = (await import('@/components/finance/PDFTemplates')).default;

    // 🔥 CRITICAL: Merge Company-Daten ins Document für PDF-Generierung
    // Dies stellt sicher, dass ALLE Company-Daten (auch aus step3/step4/bankDetails) verfügbar sind
    const enrichedDocument = {
      ...documentData,
      // Company Basis-Daten
      companyName: documentData.companyName || companySettings.name,
      companyAddress:
        documentData.companyAddress ||
        `${companySettings.street} ${companySettings.houseNumber}\n${companySettings.postalCode} ${companySettings.city}\n${companySettings.country}`.trim(),
      companyStreet: documentData.companyStreet || companySettings.street,
      companyHouseNumber: documentData.companyHouseNumber || companySettings.houseNumber,
      companyPostalCode: documentData.companyPostalCode || companySettings.postalCode,
      companyCity: documentData.companyCity || companySettings.city,
      companyCountry: documentData.companyCountry || companySettings.country,
      companyPhone: documentData.companyPhone || companySettings.phone,
      companyEmail: documentData.companyEmail || companySettings.email,
      companyWebsite: documentData.companyWebsite || companySettings.website,
      companyTaxNumber: documentData.companyTaxNumber || companySettings.taxNumber,
      companyVatId: documentData.companyVatId || companySettings.vatId,

      // Bank-Daten (für Platzhalter-System)
      companyIban: documentData.companyIban || companySettings.iban,
      companyBic: documentData.companyBic || companySettings.bic,
      bankDetails: documentData.bankDetails || {
        iban: companySettings.iban,
        bic: companySettings.bic,
        bankName: companySettings.bank,
        accountHolder: companySettings.accountHolder,
      },

      // Registrierungsdaten
      companyRegister: documentData.companyRegister || companySettings.registrationNumber,
      companyRegistrationNumber:
        documentData.companyRegistrationNumber || companySettings.registrationNumber,
      legalForm: documentData.legalForm || companySettings.legalForm,
      districtCourt: documentData.districtCourt || companySettings.districtCourt,

      // Kleinunternehmer-Status
      isSmallBusiness:
        documentData.isSmallBusiness !== undefined
          ? documentData.isSmallBusiness
          : companySettings.kleinunternehmer === 'ja',

      // 🔥 Tax Rules & Accounting
      taxRate:
        documentData.taxRate || documentData.vatRate || companySettings.defaultTaxRate || '19',
      vatRate:
        documentData.vatRate || documentData.taxRate || companySettings.defaultTaxRate || '19',
      taxMethod: documentData.taxMethod || companySettings.taxMethod || 'soll',
      priceInput: documentData.priceInput || companySettings.priceInput || 'netto',
      accountingSystem:
        documentData.accountingSystem || companySettings.accountingSystem || 'skr03',
    };

    // Template Props vorbereiten
    const templateProps = {
      document: enrichedDocument, // 🔥 Verwende enrichedDocument statt documentData
      template: template,
      color: color,
      logoUrl: logoUrl || null,
      logoSize: logoSize || 50,
      documentType: (documentType === 'invoice' ? 'invoice' : 'quote') as 'invoice' | 'quote',
      pageMode: 'single' as const,
      documentSettings: {
        language: 'de',
        showQRCode: false,
        showEPCQRCode: false,
        showCustomerNumber: true,
        showContactPerson: true,
        showVATPerPosition: false,
        showArticleNumber: false,
        showFoldLines: true,
        showPageNumbers: false,
        showFooter: true,
        showWatermark: false,
      },
      companyId: documentData.companyId || companySettings.name || '',
    };

    // Render Template zu HTML
    const templateElement = React.createElement(PDFTemplate, templateProps);
    const templateHtml = ReactDOMServer.renderToString(templateElement);

    // Hole alle Styles vom Client (wenn im Browser)
    let allStyles = '';
    if (typeof window !== 'undefined') {
      const styleTags = document.querySelectorAll('style');
      styleTags.forEach(styleElement => {
        if (styleElement.textContent) {
          allStyles += styleElement.textContent + '\n\n';
        }
      });

      const linkTags = document.querySelectorAll('link[rel="stylesheet"]');
      linkTags.forEach(linkElement => {
        try {
          const link = linkElement as HTMLLinkElement;
          if (link.sheet && link.sheet.cssRules) {
            let css = '';
            for (let i = 0; i < link.sheet.cssRules.length; i++) {
              css += link.sheet.cssRules[i].cssText + '\n';
            }
            allStyles += css + '\n\n';
          }
        } catch (e) {
          // Ignoriere CORS-Fehler
        }
      });
    }

    // Erstelle komplettes HTML-Dokument
    const completeHtml = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <style>
    /* ALL APP STYLES */
    ${allStyles}
    
    /* PDF SPECIFIC */
    @page { size: A4; margin: 0; }
    html, body { 
      margin: 0 !important; 
      padding: 0 !important; 
      width: 210mm; 
      background: white;
      font-family: system-ui, -apple-system, sans-serif;
    }
    * { 
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  </style>
</head>
<body>
  ${templateHtml}
</body>
</html>`;

    return completeHtml;
  }

  /**
   * Konvertiert HTML zu PDF via API
   *
   * @private
   */
  private static async convertHTMLToPDF(htmlContent: string): Promise<Blob> {
    const response = await fetch('/api/generate-pdf-single', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        htmlContent: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'PDF-Generierung fehlgeschlagen');
    }

    const result = await response.json();

    if (!result.success || !result.pdfBase64) {
      throw new Error('PDF-Generation returned empty result');
    }

    // Konvertiere base64 zu Blob
    const byteCharacters = atob(result.pdfBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });

    return blob;
  }

  /**
   * Generiert Dateinamen für PDF
   *
   * @private
   */
  private static generateFileName(
    documentData: InvoiceData,
    documentType: 'invoice' | 'quote'
  ): string {
    const number =
      documentData.invoiceNumber ||
      (documentData as any).quoteNumber ||
      documentData.number ||
      'UNKNOWN';
    const prefix = documentType === 'invoice' ? 'Rechnung' : 'Angebot';
    const customerName = documentData.customerName || 'Kunde';

    // Sanitize filename (remove invalid characters)
    const sanitized = `${prefix}_${number}_${customerName}`
      .replace(/[^a-zA-Z0-9äöüÄÖÜß\-_]/g, '_')
      .replace(/_+/g, '_');

    return `${sanitized}.pdf`;
  }
}
