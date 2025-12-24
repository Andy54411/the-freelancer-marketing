/**
 * Webmail Invoice PDF Service
 * 
 * Generiert professionelle PDF-Rechnungen für Webmail-Abonnements
 * mit korrekten Firmendaten (The Freelancer Marketing Ltd.)
 */

import jsPDF from 'jspdf';
import * as fs from 'fs';
import * as path from 'path';

// Taskilo Firmendaten aus Impressum
export const TASKILO_COMPANY = {
  name: 'The Freelancer Marketing Ltd.',
  street: 'Sinasi Bei, 69 KINGS RESORT BLOCK C, Flat/Office A2',
  zipCity: '8015 Paphos, Cyprus',
  registrationNumber: 'HE 458650',
  vatNumber: 'CY60058879W',
  email: 'billing@taskilo.de',
  website: 'www.taskilo.de',
  ceo: 'Andy Staudinger',
  registry: 'Companies Registration Office Cyprus',
  bankName: 'Revolut Bank',
  iban: 'LT70 3250 0247 2086 9498',
  bic: 'REVOLT21',
};

export interface WebmailInvoiceData {
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  customerAddress?: {
    street?: string;
    zipCode?: string;
    city?: string;
  };
  periodStart: Date | string;
  periodEnd: Date | string;
  issueDate: Date | string;
  dueDate: Date | string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  isPaid?: boolean;
  paidAt?: Date | string;
}

export class WebmailInvoicePdfService {
  private static instance: WebmailInvoicePdfService;
  private logoBase64: string | null = null;

  private constructor() {
    this.loadLogo();
  }

  public static getInstance(): WebmailInvoicePdfService {
    if (!WebmailInvoicePdfService.instance) {
      WebmailInvoicePdfService.instance = new WebmailInvoicePdfService();
    }
    return WebmailInvoicePdfService.instance;
  }

  private loadLogo(): void {
    try {
      const logoPath = path.join(process.cwd(), 'public', 'images', 'Gemini_Generated_Image_pqjk64pqjk64pqjk.jpeg');
      const logoBuffer = fs.readFileSync(logoPath);
      this.logoBase64 = logoBuffer.toString('base64');
    } catch {
      this.logoBase64 = null;
    }
  }

  private formatDate(dateInput: Date | string): string {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  /**
   * Generiert eine PDF-Rechnung und gibt sie als Buffer zurück
   */
  public generatePdf(invoice: WebmailInvoiceData): Buffer {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    let y = 20;

    // Header - Weißer Hintergrund mit Logo
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 50, 'F');

    // Logo einfügen (links)
    if (this.logoBase64) {
      try {
        doc.addImage(`data:image/jpeg;base64,${this.logoBase64}`, 'JPEG', 15, 8, 35, 35);
      } catch {
        // Fallback: Text-Logo wenn Bild nicht funktioniert
        doc.setFillColor(20, 173, 159);
        doc.rect(15, 12, 25, 4, 'F');
        doc.rect(25.5, 12, 4, 25, 'F');
      }
    }

    // Rechnungsnummer rechts
    doc.setTextColor(20, 173, 159);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RECHNUNG', 190, 20, { align: 'right' });
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(invoice.invoiceNumber, 190, 28, { align: 'right' });

    // Bezahlt-Stempel wenn Rechnung bezahlt
    if (invoice.isPaid) {
      doc.setTextColor(20, 173, 159);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('BEZAHLT', 190, 36, { align: 'right' });
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
    }

    // Trennlinie unter Header
    doc.setDrawColor(20, 173, 159);
    doc.setLineWidth(0.5);
    doc.line(15, 48, 195, 48);

    y = 58;

    // Absender (echte Firmendaten)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${TASKILO_COMPANY.name} | ${TASKILO_COMPANY.street} | ${TASKILO_COMPANY.zipCity}`, 20, y);

    y += 10;

    // Empfänger
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.customerName, 20, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    if (invoice.customerAddress?.street) {
      doc.text(invoice.customerAddress.street, 20, y);
      y += 5;
    }
    if (invoice.customerAddress?.zipCode || invoice.customerAddress?.city) {
      doc.text(`${invoice.customerAddress?.zipCode || ''} ${invoice.customerAddress?.city || ''}`.trim(), 20, y);
    }
    // E-Mail als Fallback wenn keine Adresse
    if (!invoice.customerAddress?.street && !invoice.customerAddress?.city) {
      doc.text(invoice.customerEmail, 20, y);
    }

    // Rechnungsdetails rechts
    const rightX = 115;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Rechnungsdatum:', rightX, 65);
    doc.text(this.formatDate(invoice.issueDate), 190, 65, { align: 'right' });
    doc.text('Fällig am:', rightX, 72);
    doc.text(this.formatDate(invoice.dueDate), 190, 72, { align: 'right' });
    doc.text('Zeitraum:', rightX, 79);
    doc.text(`${this.formatDate(invoice.periodStart)} - ${this.formatDate(invoice.periodEnd)}`, 190, 79, { align: 'right' });

    y = 105;

    // Tabellen-Header
    doc.setFillColor(248, 249, 250);
    doc.rect(20, y - 6, 170, 10, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Beschreibung', 22, y);
    doc.text('Menge', 120, y, { align: 'center' });
    doc.text('Einzelpreis', 145, y, { align: 'right' });
    doc.text('Gesamt', 188, y, { align: 'right' });

    y += 10;

    // Positionen
    doc.setFont('helvetica', 'normal');
    for (const item of invoice.items) {
      doc.text(item.description, 22, y);
      doc.text(item.quantity.toString(), 120, y, { align: 'center' });
      doc.text(this.formatCurrency(item.unitPrice), 145, y, { align: 'right' });
      doc.text(this.formatCurrency(item.total), 188, y, { align: 'right' });
      y += 8;
    }

    // Linie
    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(120, y, 190, y);
    y += 8;

    // Zwischensumme
    doc.setFontSize(9);
    doc.text('Zwischensumme:', 140, y);
    doc.text(this.formatCurrency(invoice.subtotal), 188, y, { align: 'right' });
    y += 6;

    // MwSt - nur anzeigen wenn > 0
    if (invoice.taxRate > 0) {
      doc.text(`MwSt. (${invoice.taxRate}%):`, 140, y);
      doc.text(this.formatCurrency(invoice.taxAmount), 188, y, { align: 'right' });
      y += 8;
    }

    // Gesamtbetrag
    doc.setFillColor(20, 173, 159); // Teal
    doc.rect(135, y - 5, 55, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Gesamtbetrag:', 138, y + 2);
    doc.text(this.formatCurrency(invoice.total), 188, y + 2, { align: 'right' });

    y += 25;

    // Zahlungshinweise - Automatische Abbuchung
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Zahlungsinformationen', 20, y);
    y += 8;

    // Hinweis auf automatische Abbuchung
    doc.setFillColor(240, 253, 250); // Teal-50 Hintergrund
    doc.roundedRect(20, y - 3, 170, 18, 2, 2, 'F');
    doc.setDrawColor(20, 173, 159);
    doc.roundedRect(20, y - 3, 170, 18, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(20, 173, 159);
    doc.text('Automatische Abbuchung via Revolut', 25, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8);
    doc.text('Der Betrag wird automatisch zum 1. des Monats von Ihrem Konto abgebucht.', 25, y + 10);

    y += 22;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    const paymentInfo = [
      'Bei Fragen zur Abbuchung kontaktieren Sie uns unter billing@taskilo.de',
      '',
      'Bankverbindung für manuelle Zahlungen:',
      `Kontoinhaber: ${TASKILO_COMPANY.name}`,
      `Bank: ${TASKILO_COMPANY.bankName}`,
      `IBAN: ${TASKILO_COMPANY.iban}`,
      `BIC: ${TASKILO_COMPANY.bic}`,
      `Verwendungszweck: ${invoice.invoiceNumber}`,
    ];

    for (const line of paymentInfo) {
      doc.text(line, 20, y);
      y += 5;
    }

    y += 8;

    // Hinweis für zypriotisches Unternehmen
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Leistungserbringer ist ein in Zypern ansässiges Unternehmen. Reverse-Charge-Verfahren', 20, y);
    doc.text('kann bei EU-Geschäftskunden anwendbar sein.', 20, y + 4);

    // Trennlinie UNTER dem Hinweistext
    doc.setDrawColor(20, 173, 159);
    doc.setLineWidth(0.3);
    doc.line(15, y + 12, 195, y + 12);

    // Footer mit echten Firmendaten
    const footerY = 278;

    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);

    // Linke Spalte - Firma
    doc.setFont('helvetica', 'bold');
    doc.text(TASKILO_COMPANY.name, 15, footerY);
    doc.setFont('helvetica', 'normal');
    doc.text(`CEO: ${TASKILO_COMPANY.ceo}`, 15, footerY + 4);
    doc.text(TASKILO_COMPANY.street, 15, footerY + 8);
    doc.text(TASKILO_COMPANY.zipCity, 15, footerY + 12);

    // Mittlere Spalte - Kontakt
    doc.text(`Web: ${TASKILO_COMPANY.website}`, 90, footerY);
    doc.text(`E-Mail: ${TASKILO_COMPANY.email}`, 90, footerY + 4);
    doc.text('Support: support@taskilo.de', 90, footerY + 8);

    // Rechte Spalte - Registrierung
    doc.text(`Reg.-Nr.: ${TASKILO_COMPANY.registrationNumber}`, 150, footerY);
    doc.text(`VAT: ${TASKILO_COMPANY.vatNumber}`, 150, footerY + 4);
    doc.text(TASKILO_COMPANY.registry, 150, footerY + 8);

    // PDF als Buffer
    const pdfOutput = doc.output('arraybuffer');
    return Buffer.from(pdfOutput);
  }

  /**
   * Generiert eine PDF-Rechnung und gibt sie als Base64-String zurück
   * (für E-Mail-Anhänge)
   */
  public generatePdfBase64(invoice: WebmailInvoiceData): string {
    const buffer = this.generatePdf(invoice);
    return buffer.toString('base64');
  }

  /**
   * Erstellt Invoice-Daten aus einer Webmail-Subscription
   */
  public createInvoiceDataFromSubscription(
    subscription: {
      customerName: string;
      customerEmail: string;
      amount: number;
      planName?: string;
    },
    invoiceNumber: string,
    periodStart: Date,
    periodEnd: Date
  ): WebmailInvoiceData {
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // 14 Tage Zahlungsziel

    const planName = subscription.planName || 'Taskilo Webmail';

    return {
      invoiceNumber,
      customerName: subscription.customerName,
      customerEmail: subscription.customerEmail,
      periodStart,
      periodEnd,
      issueDate,
      dueDate,
      items: [
        {
          description: `${planName} - Monatliches Abonnement`,
          quantity: 1,
          unitPrice: subscription.amount,
          total: subscription.amount,
        },
      ],
      subtotal: subscription.amount,
      taxRate: 0, // Zypriotisches Unternehmen - keine deutsche MwSt
      taxAmount: 0,
      total: subscription.amount,
      isPaid: true, // Revolut-Abos sind vorausbezahlt
    };
  }
}
