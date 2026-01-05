/**
 * MarketplacePublishingFeeInvoiceService - Generiert Rechnungen für Marktplatz-Veröffentlichungsgebühren
 * 
 * Nach erfolgreicher Zahlung der 3,75 EUR Veröffentlichungsgebühr wird eine Rechnung
 * an den Kunden per E-Mail gesendet.
 */

import jsPDF from 'jspdf';
import * as fs from 'fs';
import * as path from 'path';
import { db, admin } from '@/firebase/server';
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

// Veröffentlichungsgebühr
const PUBLISHING_FEE_EUR = 3.75;
const PUBLISHING_FEE_CENTS = 375;

// Logo als Base64 laden
function getLogoBase64(): string | null {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'images', 'taskilo-logo-transparent.png');
    const logoBuffer = fs.readFileSync(logoPath);
    return logoBuffer.toString('base64');
  } catch {
    return null;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export interface PublishingFeeInvoiceData {
  // Kunden-Daten
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerStreet?: string;
  customerZipCity?: string;
  customerCountry?: string;
  
  // Projekt-Daten
  projectId: string;
  projectTitle: string;
  category: string;
  subcategory?: string;
  
  // Zahlung
  publishingFeeId: string;
  revolutOrderId?: string;
  paymentDate: Date;
}

export interface PublishingFeeInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  projectId: string;
  projectTitle: string;
  publishingFeeId: string;
  amount: number;
  amountCents: number;
  createdAt: FieldValue;
  pdfUrl?: string;
  pdfStoragePath?: string;
  emailSent: boolean;
  emailSentAt?: FieldValue;
}

export class MarketplacePublishingFeeInvoiceService {
  private static COLLECTION = 'marketplace_publishing_fee_invoices';
  
  /**
   * Generiert die nächste fortlaufende Rechnungsnummer
   */
  static async getNextInvoiceNumber(): Promise<string> {
    if (!db) throw new Error('Firebase db not initialized');
    
    const year = new Date().getFullYear();
    const prefix = `MP-${year}-`;
    
    // Hole die letzte Rechnungsnummer für dieses Jahr
    const lastInvoice = await db
      .collection(this.COLLECTION)
      .where('invoiceNumber', '>=', prefix)
      .where('invoiceNumber', '<', `MP-${year + 1}-`)
      .orderBy('invoiceNumber', 'desc')
      .limit(1)
      .get();
    
    let nextNumber = 1;
    if (!lastInvoice.empty) {
      const lastNum = lastInvoice.docs[0].data().invoiceNumber;
      const match = lastNum.match(/MP-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  }
  
  /**
   * Generiert die PDF-Rechnung
   */
  static async generatePDF(data: PublishingFeeInvoiceData, invoiceNumber: string): Promise<Buffer> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const pageWidth = 210;
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let yPos = 20;
    
    // Logo
    const logoBase64 = getLogoBase64();
    if (logoBase64) {
      try {
        doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', margin, yPos, 50, 15);
      } catch {
        // Logo konnte nicht geladen werden
      }
    }
    
    // Firmenname falls kein Logo
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 173, 159); // Taskilo Teal
    if (!logoBase64) {
      doc.text('Taskilo', margin, yPos + 10);
    }
    
    yPos = 50;
    
    // Rechnungstitel
    doc.setFontSize(24);
    doc.setTextColor(51, 51, 51);
    doc.text('RECHNUNG', pageWidth - margin, yPos, { align: 'right' });
    
    yPos = 60;
    
    // Rechnungsdetails rechts
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(102, 102, 102);
    doc.text(`Rechnungsnummer: ${invoiceNumber}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 5;
    doc.text(`Rechnungsdatum: ${formatDate(data.paymentDate)}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 5;
    doc.text(`Projekt-ID: ${data.projectId}`, pageWidth - margin, yPos, { align: 'right' });
    
    yPos = 80;
    
    // Absender (klein)
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`${TASKILO_COMPANY.name} | ${TASKILO_COMPANY.street} | ${TASKILO_COMPANY.zipCity}`, margin, yPos);
    
    yPos = 90;
    
    // Empfänger
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text(data.customerName, margin, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    if (data.customerStreet) {
      doc.text(data.customerStreet, margin, yPos);
      yPos += 5;
    }
    if (data.customerZipCity) {
      doc.text(data.customerZipCity, margin, yPos);
      yPos += 5;
    }
    if (data.customerCountry) {
      doc.text(data.customerCountry, margin, yPos);
      yPos += 5;
    }
    doc.text(data.customerEmail, margin, yPos);
    
    yPos = 130;
    
    // Betreff
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Marktplatz-Veröffentlichungsgebühr', margin, yPos);
    
    yPos += 10;
    
    // Beschreibungstext
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const description = `Vielen Dank für die Veröffentlichung Ihres Projekts "${data.projectTitle}" im Taskilo Marktplatz.`;
    const splitDesc = doc.splitTextToSize(description, contentWidth);
    doc.text(splitDesc, margin, yPos);
    yPos += splitDesc.length * 5 + 10;
    
    // Tabelle Header
    doc.setFillColor(20, 173, 159);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Beschreibung', margin + 3, yPos + 5.5);
    doc.text('Kategorie', margin + 100, yPos + 5.5);
    doc.text('Betrag', pageWidth - margin - 3, yPos + 5.5, { align: 'right' });
    
    yPos += 8;
    
    // Tabellenzeile
    doc.setFillColor(249, 249, 249);
    doc.rect(margin, yPos, contentWidth, 12, 'F');
    doc.setTextColor(51, 51, 51);
    doc.setFont('helvetica', 'normal');
    doc.text('Veröffentlichungsgebühr Marktplatz', margin + 3, yPos + 7);
    doc.text(data.category + (data.subcategory ? ` / ${data.subcategory}` : ''), margin + 100, yPos + 7);
    doc.text(formatCurrency(PUBLISHING_FEE_EUR), pageWidth - margin - 3, yPos + 7, { align: 'right' });
    
    yPos += 12;
    
    // Trennlinie
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    
    yPos += 8;
    
    // Summe
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Gesamtbetrag:', margin + 100, yPos);
    doc.setTextColor(20, 173, 159);
    doc.text(formatCurrency(PUBLISHING_FEE_EUR), pageWidth - margin - 3, yPos, { align: 'right' });
    
    yPos += 15;
    
    // Steuerhinweis
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text('Gemäß Art. 196 MwSt-Richtlinie 2006/112/EG geht die Steuerschuldnerschaft', margin, yPos);
    yPos += 4;
    doc.text('auf den Leistungsempfänger über (Reverse-Charge-Verfahren).', margin, yPos);
    
    yPos += 15;
    
    // Zahlungshinweis
    doc.setFontSize(10);
    doc.setTextColor(51, 51, 51);
    doc.text('Diese Rechnung wurde bereits beglichen. Es ist keine weitere Zahlung erforderlich.', margin, yPos);
    
    // Footer Trennlinie
    const footerY = 265;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    
    // Footer
    const footerTextY = footerY + 8;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    
    // Linke Spalte: Firma und Adresse (zweizeilig)
    doc.text(TASKILO_COMPANY.name, margin, footerTextY);
    doc.text('Sinasi Bei, 69 KINGS RESORT BLOCK C', margin, footerTextY + 4);
    doc.text('Flat/Office A2, 8015 Paphos, Cyprus', margin, footerTextY + 8);
    
    // Mitte: Registrierungsdaten
    doc.text(`Reg.-Nr.: ${TASKILO_COMPANY.registrationNumber}`, pageWidth / 2, footerTextY, { align: 'center' });
    doc.text(`USt-IdNr.: ${TASKILO_COMPANY.vatNumber}`, pageWidth / 2, footerTextY + 4, { align: 'center' });
    doc.text(`Geschäftsführer: ${TASKILO_COMPANY.ceo}`, pageWidth / 2, footerTextY + 8, { align: 'center' });
    
    // Rechte Spalte: Kontakt
    doc.text(TASKILO_COMPANY.email, pageWidth - margin, footerTextY, { align: 'right' });
    doc.text(TASKILO_COMPANY.website, pageWidth - margin, footerTextY + 4, { align: 'right' });
    
    // PDF als Buffer zurückgeben
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    return pdfBuffer;
  }
  
  /**
   * Erstellt und speichert die Rechnung in Firebase
   */
  static async createInvoice(data: PublishingFeeInvoiceData): Promise<PublishingFeeInvoice> {
    if (!db || !admin) throw new Error('Firebase not initialized');
    
    const invoiceNumber = await this.getNextInvoiceNumber();
    const pdfBuffer = await this.generatePDF(data, invoiceNumber);
    
    // PDF in Firebase Storage speichern
    const bucket = admin.storage().bucket();
    const pdfPath = `invoices/marketplace/${data.customerId}/${invoiceNumber}.pdf`;
    const file = bucket.file(pdfPath);
    
    await file.save(pdfBuffer, {
      contentType: 'application/pdf',
      metadata: {
        customMetadata: {
          invoiceNumber,
          customerId: data.customerId,
          projectId: data.projectId,
        },
      },
    });
    
    // Signierte URL generieren (gültig für 1 Jahr)
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });
    
    const invoiceId = `mp_invoice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const invoice: PublishingFeeInvoice = {
      id: invoiceId,
      invoiceNumber,
      customerId: data.customerId,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      projectId: data.projectId,
      projectTitle: data.projectTitle,
      publishingFeeId: data.publishingFeeId,
      amount: PUBLISHING_FEE_EUR,
      amountCents: PUBLISHING_FEE_CENTS,
      createdAt: FieldValue.serverTimestamp(),
      pdfUrl: signedUrl,
      pdfStoragePath: pdfPath,
      emailSent: false,
    };
    
    await db.collection(this.COLLECTION).doc(invoiceId).set(invoice);
    
    return invoice;
  }
  
  /**
   * Sendet die Rechnung per E-Mail
   */
  static async sendInvoiceEmail(invoice: PublishingFeeInvoice): Promise<boolean> {
    const WEBMAIL_API_URL = process.env.WEBMAIL_API_URL || 'https://mail.taskilo.de/webmail-api';
    const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY;
    const PAYMENT_EMAIL = 'payment@taskilo.de';
    
    if (!WEBMAIL_API_KEY) {
      console.error('[MarketplacePublishingFeeInvoice] Missing WEBMAIL_API_KEY');
      return false;
    }
    
    try {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #14ad9f 0%, #0d8a7d 100%); padding: 30px; color: white; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; background: #ffffff; }
    .project-box { background: #f8f9fa; border-left: 4px solid #14ad9f; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .amount-box { background: linear-gradient(135deg, #14ad9f 0%, #0d8a7d 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .amount { font-size: 32px; font-weight: bold; }
    .footer { background: #f5f5f5; padding: 20px; font-size: 12px; color: #666; text-align: center; border-radius: 0 0 8px 8px; }
    .btn { display: inline-block; background: #14ad9f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Rechnung - Marktplatz Veröffentlichung</h1>
  </div>
  <div class="content">
    <p>Guten Tag ${invoice.customerName},</p>
    
    <p>vielen Dank für Ihre Zahlung! Ihr Projekt wurde erfolgreich im Taskilo Marktplatz veröffentlicht.</p>
    
    <div class="project-box">
      <strong>Projekt:</strong> ${invoice.projectTitle}<br>
      <strong>Rechnungsnummer:</strong> ${invoice.invoiceNumber}
    </div>
    
    <div class="amount-box">
      <div style="font-size: 14px; opacity: 0.9;">Veröffentlichungsgebühr</div>
      <div class="amount">${formatCurrency(invoice.amount)}</div>
      <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">Bereits bezahlt</div>
    </div>
    
    <p><strong>Was passiert jetzt?</strong></p>
    <ul style="color: #555;">
      <li>Ihr Projekt ist jetzt für alle registrierten Dienstleister sichtbar</li>
      <li>Sie werden per E-Mail benachrichtigt, sobald Angebote eingehen</li>
      <li>Nach Annahme eines Angebots erfolgt die Zahlung sicher über unser Treuhand-System</li>
    </ul>
    
    <p>Die Rechnung im PDF-Format finden Sie im Anhang dieser E-Mail.</p>
    
    <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
    
    <p>Mit freundlichen Grüßen,<br>
    <strong>Ihr Taskilo Team</strong></p>
  </div>
  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 0;">
  <div class="footer">
    <p style="margin: 0 0 5px 0;">${TASKILO_COMPANY.name}</p>
    <p style="margin: 0 0 5px 0;">Sinasi Bei, 69 KINGS RESORT BLOCK C, Flat/Office A2</p>
    <p style="margin: 0 0 10px 0;">8015 Paphos, Cyprus</p>
    <p style="margin: 0 0 5px 0;">Reg.-Nr.: ${TASKILO_COMPANY.registrationNumber} | USt-IdNr.: ${TASKILO_COMPANY.vatNumber}</p>
    <p style="margin: 0;">E-Mail: ${TASKILO_COMPANY.email} | Web: ${TASKILO_COMPANY.website}</p>
  </div>
</body>
</html>
      `.trim();
      
      // PDF aus Storage laden
      let pdfBase64: string | undefined;
      if (invoice.pdfStoragePath && admin) {
        try {
          const bucket = admin.storage().bucket();
          const file = bucket.file(invoice.pdfStoragePath);
          const [buffer] = await file.download();
          pdfBase64 = buffer.toString('base64');
        } catch (downloadError) {
          console.error('[MarketplacePublishingFeeInvoice] Failed to download PDF:', downloadError);
        }
      }
      
      const response = await fetch(`${WEBMAIL_API_URL}/api/send/master`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WEBMAIL_API_KEY,
        },
        body: JSON.stringify({
          email: PAYMENT_EMAIL,
          to: invoice.customerEmail,
          subject: `Ihre Rechnung ${invoice.invoiceNumber} - Taskilo Marktplatz`,
          html: emailHtml,
          attachments: pdfBase64 ? [
            {
              filename: `Rechnung_${invoice.invoiceNumber}.pdf`,
              content: pdfBase64,
              encoding: 'base64',
              contentType: 'application/pdf',
            },
          ] : [],
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[MarketplacePublishingFeeInvoice] Email send failed:', errorText);
        return false;
      }
      
      // Status aktualisieren
      if (db) {
        await db.collection(this.COLLECTION).doc(invoice.id).update({
          emailSent: true,
          emailSentAt: FieldValue.serverTimestamp(),
        });
      }
      
      return true;
    } catch (error) {
      console.error('[MarketplacePublishingFeeInvoice] Error sending email:', error);
      return false;
    }
  }
  
  /**
   * Erstellt und sendet die Rechnung in einem Schritt
   */
  static async createAndSendInvoice(data: PublishingFeeInvoiceData): Promise<{ success: boolean; invoice?: PublishingFeeInvoice; error?: string }> {
    try {
      const invoice = await this.createInvoice(data);
      const emailSent = await this.sendInvoiceEmail(invoice);
      
      return {
        success: true,
        invoice: { ...invoice, emailSent },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      };
    }
  }
}
