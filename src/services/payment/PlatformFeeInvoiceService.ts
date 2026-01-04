/**
 * PlatformFeeInvoiceService - Generiert PDF-Rechnungen für Platform-Gebühren
 * 
 * Nach erfolgreicher Auszahlung wird eine Rechnung für die Platform-Gebühr
 * an den Provider per E-Mail gesendet.
 */

import jsPDF from 'jspdf';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

// Taskilo Firmendaten
const TASKILO_COMPANY = {
  name: 'The Freelancer Marketing Ltd.',
  street: 'Sinasi Bei, 69 KINGS RESORT BLOCK C, Flat/Office A2',
  zipCity: '8015 Paphos, Cyprus',
  country: 'Cyprus',
  registrationNumber: 'HE 458650',
  vatNumber: 'CY60058879W',
  email: 'payment@taskilo.de',
  website: 'www.taskilo.de',
  ceo: 'Andy Staudinger',
  registry: 'Companies Registration Office Cyprus',
};

// Logo als Base64 laden
function getLogoBase64(): string | null {
  try {
    // Verwende das transparente PNG-Logo
    const logoPath = path.join(process.cwd(), 'public', 'images', 'taskilo-logo-transparent.png');
    const logoBuffer = fs.readFileSync(logoPath);
    return logoBuffer.toString('base64');
  } catch {
    return null;
  }
}

export interface PlatformFeeInvoiceData {
  // Provider-Daten
  providerId: string;
  providerName: string;
  providerStreet: string;
  providerZipCity: string;
  providerCountry?: string;
  providerVatId?: string;
  providerEmail: string;
  
  // Auszahlungs-Daten
  payoutId: string;
  escrowIds: string[];
  orderIds: string[];
  
  // Beträge (in EUR)
  grossAmount: number;        // Bruttobetrag (was der Kunde gezahlt hat)
  platformFeeAmount: number;  // Platform-Gebühr
  platformFeePercent: number; // Platform-Gebühr Prozentsatz
  expressFeeAmount?: number;  // Express-Gebühr (optional)
  expressFeePercent?: number; // Express-Gebühr Prozentsatz (optional)
  netPayoutAmount: number;    // Auszahlungsbetrag an Provider
  
  // Datum
  payoutDate: Date;
}

export interface PlatformFeeInvoice {
  id: string;
  invoiceNumber: string;
  providerId: string;
  payoutId: string;
  grossAmount: number;
  platformFeeAmount: number;
  platformFeePercent: number;
  expressFeeAmount?: number;
  expressFeePercent?: number;
  netPayoutAmount: number;
  createdAt: FieldValue;
  pdfBase64?: string;
  emailSent: boolean;
  emailSentAt?: FieldValue;
}

export class PlatformFeeInvoiceService {
  private static COLLECTION = 'platformFeeInvoices';
  
  /**
   * Generiert die nächste fortlaufende Rechnungsnummer
   */
  static async getNextInvoiceNumber(): Promise<string> {
    if (!db) throw new Error('Firebase db not initialized');
    
    const year = new Date().getFullYear();
    const prefix = `TF-${year}-`;
    
    // Hole die letzte Rechnungsnummer für dieses Jahr
    const lastInvoice = await db
      .collection(this.COLLECTION)
      .where('invoiceNumber', '>=', prefix)
      .where('invoiceNumber', '<', `TF-${year + 1}-`)
      .orderBy('invoiceNumber', 'desc')
      .limit(1)
      .get();
    
    let nextNumber = 1;
    if (!lastInvoice.empty) {
      const lastNum = lastInvoice.docs[0].data().invoiceNumber;
      const match = lastNum.match(/TF-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  }
  
  /**
   * Generiert die PDF-Rechnung
   */
  static generatePDF(data: PlatformFeeInvoiceData, invoiceNumber: string): string {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 15;
    
    // Logo - größer und besser sichtbar
    const logoBase64 = getLogoBase64();
    if (logoBase64) {
      try {
        // PNG-Logo mit besserer Auflösung
        doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', margin, yPos, 55, 20);
      } catch {
        // Fallback: Text-Logo
        doc.setFontSize(20);
        doc.setTextColor(20, 173, 159);
        doc.setFont('helvetica', 'bold');
        doc.text('TASKILO', margin, yPos + 12);
      }
    } else {
      // Fallback: Text-Logo
      doc.setFontSize(20);
      doc.setTextColor(20, 173, 159);
      doc.setFont('helvetica', 'bold');
      doc.text('TASKILO', margin, yPos + 12);
    }
    
    // Taskilo Absender (rechts oben)
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    const rightCol = pageWidth - margin;
    doc.text(TASKILO_COMPANY.name, rightCol, yPos + 2, { align: 'right' });
    doc.text(TASKILO_COMPANY.street, rightCol, yPos + 6, { align: 'right' });
    doc.text(TASKILO_COMPANY.zipCity, rightCol, yPos + 10, { align: 'right' });
    doc.text(`Reg.-Nr.: ${TASKILO_COMPANY.registrationNumber}`, rightCol, yPos + 14, { align: 'right' });
    doc.text(`USt-IdNr.: ${TASKILO_COMPANY.vatNumber}`, rightCol, yPos + 18, { align: 'right' });
    
    yPos += 40;
    
    // Empfänger-Adresse
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(data.providerName, margin, yPos);
    doc.text(data.providerStreet, margin, yPos + 5);
    doc.text(data.providerZipCity, margin, yPos + 10);
    if (data.providerCountry) {
      doc.text(data.providerCountry, margin, yPos + 15);
    }
    if (data.providerVatId) {
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`USt-IdNr.: ${data.providerVatId}`, margin, yPos + 20);
    }
    
    yPos += 35;
    
    // Titel
    doc.setFontSize(18);
    doc.setTextColor(20, 173, 159); // Taskilo Teal
    doc.setFont('helvetica', 'bold');
    doc.text('Rechnung Platform-Gebühr', margin, yPos);
    
    yPos += 12;
    
    // Rechnungsdetails
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    const invoiceDate = data.payoutDate.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    
    doc.text(`Rechnungsnummer: ${invoiceNumber}`, margin, yPos);
    doc.text(`Rechnungsdatum: ${invoiceDate}`, pageWidth - margin - 60, yPos);
    
    yPos += 5;
    doc.text(`Auszahlungs-ID: ${data.payoutId}`, margin, yPos);
    
    yPos += 15;
    
    // Einleitung
    doc.setFontSize(10);
    doc.text('Sehr geehrte Damen und Herren,', margin, yPos);
    yPos += 7;
    doc.text('hiermit stellen wir Ihnen die Platform-Gebühr für die erfolgte Auszahlung in Rechnung:', margin, yPos);
    
    yPos += 15;
    
    // Tabelle Header - angepasste Spaltenbreiten für A4
    const tableWidth = pageWidth - 2 * margin;
    const colDesc = margin + 2;
    const colQty = margin + 90;
    const colPrice = margin + 115;
    const colAmount = pageWidth - margin - 2;
    
    doc.setFillColor(20, 173, 159); // Taskilo Teal
    doc.rect(margin, yPos, tableWidth, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Beschreibung', colDesc, yPos + 5.5);
    doc.text('Menge', colQty, yPos + 5.5);
    doc.text('Preis', colPrice, yPos + 5.5);
    doc.text('Betrag', colAmount, yPos + 5.5, { align: 'right' });
    
    yPos += 10;
    
    // Tabelle Zeilen
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    // Zeile 1: Platform-Gebühr
    const description = `Taskilo Platform-Gebühr (${data.platformFeePercent}%)`;
    const quantity = `${data.escrowIds.length} Auftrag${data.escrowIds.length > 1 ? 'e' : ''}`;
    
    doc.setFillColor(248, 248, 248);
    doc.rect(margin, yPos, tableWidth, 8, 'F');
    
    doc.text(description, colDesc, yPos + 5.5);
    doc.text(quantity, colQty, yPos + 5.5);
    doc.text(`${data.platformFeePercent}%`, colPrice, yPos + 5.5);
    doc.text(formatCurrency(data.platformFeeAmount), colAmount, yPos + 5.5, { align: 'right' });
    
    yPos += 12;
    
    // Hinweiszeile
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Basierend auf Brutto-Auftragswert: ${formatCurrency(data.grossAmount)}`, colDesc, yPos);
    
    yPos += 15;
    
    // Summen - vollständige Aufschlüsselung
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    // Linie
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 7;
    
    // Auszahlungsbetrag (Brutto)
    doc.text('Auszahlungsbetrag:', rightCol - 55, yPos);
    doc.text(formatCurrency(data.grossAmount), rightCol, yPos, { align: 'right' });
    
    yPos += 6;
    
    // Platform-Gebühr (Abzug)
    doc.setTextColor(180, 0, 0);
    doc.text(`- Platform-Gebühr (${data.platformFeePercent}%):`, rightCol - 55, yPos);
    doc.text(`- ${formatCurrency(data.platformFeeAmount)}`, rightCol, yPos, { align: 'right' });
    
    // Express-Gebühr (falls vorhanden)
    if (data.expressFeeAmount && data.expressFeeAmount > 0) {
      yPos += 6;
      doc.text(`- Express-Gebühr (${data.expressFeePercent || 4.5}%):`, rightCol - 55, yPos);
      doc.text(`- ${formatCurrency(data.expressFeeAmount)}`, rightCol, yPos, { align: 'right' });
    }
    
    yPos += 3;
    
    // Trennlinie
    doc.setDrawColor(200, 200, 200);
    doc.line(rightCol - 55, yPos, rightCol, yPos);
    
    yPos += 6;
    
    // Netto Gesamt (Auszahlung)
    doc.setFontSize(12);
    doc.setTextColor(20, 173, 159); // Taskilo Teal
    doc.setFont('helvetica', 'bold');
    doc.text('Netto Gesamt:', rightCol - 55, yPos);
    doc.text(formatCurrency(data.netPayoutAmount), rightCol, yPos, { align: 'right' });
    
    yPos += 8;
    
    // MwSt Hinweis (zypriotisches Unternehmen)
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    const taxNote1 = 'Gemäß Art. 196 der Richtlinie 2006/112/EG ist der Leistungs-';
    const taxNote2 = 'empfänger steuerpflichtig (Reverse-Charge-Verfahren).';
    doc.text(taxNote1, rightCol, yPos, { align: 'right' });
    yPos += 3;
    doc.text(taxNote2, rightCol, yPos, { align: 'right' });
    
    yPos += 15;
    
    // Hinweis
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('Die Platform-Gebühr wurde bereits bei der Auszahlung einbehalten. Es ist keine weitere Zahlung erforderlich.', margin, yPos);
    
    yPos += 10;
    
    // Auftrags-IDs
    if (data.orderIds.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Auftrags-IDs: ${data.orderIds.slice(0, 5).join(', ')}${data.orderIds.length > 5 ? '...' : ''}`, margin, yPos);
    }
    
    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 25;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(TASKILO_COMPANY.name, margin, footerY + 5);
    doc.text(TASKILO_COMPANY.street, margin, footerY + 9);
    doc.text(TASKILO_COMPANY.zipCity, margin, footerY + 13);
    
    doc.text(`Reg.-Nr.: ${TASKILO_COMPANY.registrationNumber}`, pageWidth / 2, footerY + 5, { align: 'center' });
    doc.text(`USt-IdNr.: ${TASKILO_COMPANY.vatNumber}`, pageWidth / 2, footerY + 9, { align: 'center' });
    doc.text(`Geschäftsführer: ${TASKILO_COMPANY.ceo}`, pageWidth / 2, footerY + 13, { align: 'center' });
    
    doc.text(`E-Mail: ${TASKILO_COMPANY.email}`, pageWidth - margin, footerY + 5, { align: 'right' });
    doc.text(`Web: ${TASKILO_COMPANY.website}`, pageWidth - margin, footerY + 9, { align: 'right' });
    doc.text(`Registergericht: ${TASKILO_COMPANY.registry}`, pageWidth - margin, footerY + 13, { align: 'right' });
    
    // Seitenzahl
    doc.text(`Seite 1 von 1`, pageWidth / 2, footerY + 18, { align: 'center' });
    
    // PDF als Base64 zurückgeben
    return doc.output('datauristring').split(',')[1];
  }
  
  /**
   * Erstellt und speichert eine Platform-Gebühr-Rechnung
   */
  static async createInvoice(data: PlatformFeeInvoiceData): Promise<PlatformFeeInvoice> {
    const invoiceNumber = await this.getNextInvoiceNumber();
    const invoiceId = `pf_invoice_${data.payoutId}_${Date.now()}`;
    
    // PDF generieren
    const pdfBase64 = this.generatePDF(data, invoiceNumber);
    
    // Basis-Invoice erstellen (ohne optionale Felder die undefined sein koennten)
    const invoice: PlatformFeeInvoice = {
      id: invoiceId,
      invoiceNumber,
      providerId: data.providerId,
      payoutId: data.payoutId,
      grossAmount: data.grossAmount,
      platformFeeAmount: data.platformFeeAmount,
      platformFeePercent: data.platformFeePercent,
      netPayoutAmount: data.netPayoutAmount,
      createdAt: FieldValue.serverTimestamp(),
      pdfBase64,
      emailSent: false,
    };
    
    // Optionale Express-Fee Felder nur hinzufuegen wenn definiert
    if (data.expressFeeAmount !== undefined) {
      invoice.expressFeeAmount = data.expressFeeAmount;
    }
    if (data.expressFeePercent !== undefined) {
      invoice.expressFeePercent = data.expressFeePercent;
    }
    
    // In Firestore speichern
    if (!db) throw new Error('Firebase db not initialized');
    await db.collection(this.COLLECTION).doc(invoiceId).set(invoice);
    
    return invoice;
  }
  
  /**
   * Sendet die Rechnung per E-Mail über den Webmailer
   */
  static async sendInvoiceEmail(invoice: PlatformFeeInvoice, providerEmail: string, providerName: string): Promise<boolean> {
    const WEBMAIL_API_URL = process.env.WEBMAIL_API_URL || 'https://mail.taskilo.de/webmail-api';
    const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY;
    const PAYMENT_EMAIL = 'payment@taskilo.de';
    
    if (!WEBMAIL_API_KEY) {
      console.error('[PlatformFeeInvoice] Missing WEBMAIL_API_KEY');
      return false;
    }
    
    try {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: linear-gradient(135deg, #14ad9f 0%, #0d8a7d 100%); padding: 20px; color: white; }
    .content { padding: 30px; }
    .footer { background: #f5f5f5; padding: 20px; font-size: 12px; color: #666; }
    .amount { font-size: 24px; font-weight: bold; color: #14ad9f; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">Taskilo Platform-Gebühr Rechnung</h1>
  </div>
  <div class="content">
    <p>Guten Tag ${providerName},</p>
    
    <p>anbei erhalten Sie Ihre Rechnung für die Platform-Gebühr zur erfolgten Auszahlung.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Rechnungsnummer:</strong></td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${invoice.invoiceNumber}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Platform-Gebühr:</strong></td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${formatCurrency(invoice.platformFeeAmount)} (${invoice.platformFeePercent}%)</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Ihr Auszahlungsbetrag:</strong></td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;"><span class="amount">${formatCurrency(invoice.netPayoutAmount)}</span></td>
      </tr>
    </table>
    
    <p>Die Platform-Gebühr wurde bereits bei der Auszahlung einbehalten. Es ist keine weitere Zahlung erforderlich.</p>
    
    <p>Diese Rechnung dient als Beleg für Ihre Buchhaltung.</p>
    
    <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
    
    <p>Mit freundlichen Grüßen,<br>
    <strong>Ihr Taskilo Team</strong></p>
  </div>
  <div class="footer">
    <p>${TASKILO_COMPANY.name} | ${TASKILO_COMPANY.street} | ${TASKILO_COMPANY.zipCity}</p>
    <p>Reg.-Nr.: ${TASKILO_COMPANY.registrationNumber} | USt-IdNr.: ${TASKILO_COMPANY.vatNumber}</p>
    <p>E-Mail: ${TASKILO_COMPANY.email} | Web: ${TASKILO_COMPANY.website}</p>
  </div>
</body>
</html>
      `.trim();
      
      // Verwende Master-Route (kein Passwort erforderlich für @taskilo.de E-Mails)
      const response = await fetch(`${WEBMAIL_API_URL}/api/send/master`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WEBMAIL_API_KEY,
        },
        body: JSON.stringify({
          email: PAYMENT_EMAIL,
          to: providerEmail,
          subject: `Taskilo Platform-Gebühr Rechnung ${invoice.invoiceNumber}`,
          html: emailHtml,
          attachments: [
            {
              filename: `Rechnung_${invoice.invoiceNumber}.pdf`,
              content: invoice.pdfBase64,
              encoding: 'base64',
              contentType: 'application/pdf',
            },
          ],
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PlatformFeeInvoice] Email send failed:', errorText);
        return false;
      }
      
      // E-Mail-Status aktualisieren (nur für echte Invoices, nicht Test-Invoices)
      if (db && !invoice.id.startsWith('test_')) {
        await db.collection(this.COLLECTION).doc(invoice.id).update({
          emailSent: true,
          emailSentAt: FieldValue.serverTimestamp(),
        });
      }
      
      return true;
    } catch (error) {
      console.error('[PlatformFeeInvoice] Email send error:', error);
      return false;
    }
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}
