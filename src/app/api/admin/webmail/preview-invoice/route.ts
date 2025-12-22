/**
 * Admin API - Preview Webmail Invoice PDF
 * Generates a mock invoice PDF for preview purposes
 */

import { NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import * as fs from 'fs';
import * as path from 'path';

// Taskilo Firmendaten aus Impressum
const TASKILO_COMPANY = {
  name: 'The Freelancer Marketing Ltd.',
  street: 'Sinasi Bei, 69 KINGS RESORT BLOCK C, Flat/Office A2',
  zipCity: '8015 Paphos, Cyprus',
  registrationNumber: 'HE 458650',
  vatNumber: 'CY60058879W',
  email: 'billing@taskilo.de',
  website: 'www.taskilo.de',
  ceo: 'Andy Staudinger',
  registry: 'Companies Registration Office Cyprus',
};

// Logo als Base64 laden
function getLogoBase64(): string | null {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'images', 'Gemini_Generated_Image_pqjk64pqjk64pqjk.jpeg');
    const logoBuffer = fs.readFileSync(logoPath);
    return logoBuffer.toString('base64');
  } catch (error) {
    console.warn('Logo konnte nicht geladen werden:', error);
    return null;
  }
}

export async function GET() {
  try {
    // Mock-Daten fuer Vorschau-Rechnung
    const mockInvoice = {
      invoiceNumber: 'TWEB-2025-0001',
      customerName: 'Max Mustermann GmbH',
      customerEmail: 'buchhaltung@mustermann-gmbh.de',
      customerAddress: {
        street: 'Musterstrasse 123',
        zipCode: '10115',
        city: 'Berlin',
      },
      periodStart: '2025-01-01',
      periodEnd: '2025-01-31',
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      items: [
        {
          description: 'Taskilo Webmail Business - Monatliches Abonnement',
          quantity: 1,
          unitPrice: 9.99,
          total: 9.99,
        },
        {
          description: 'Zusätzliche E-Mail-Postfächer (3 Stück)',
          quantity: 3,
          unitPrice: 2.99,
          total: 8.97,
        },
        {
          description: 'Erweiterter Speicherplatz (10 GB)',
          quantity: 1,
          unitPrice: 4.99,
          total: 4.99,
        },
      ],
      subtotal: 23.95,
      taxRate: 0, // Zypriotisches Unternehmen - keine deutsche MwSt
      taxAmount: 0,
      total: 23.95,
    };

    // PDF generieren
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    let y = 20;

    // Logo laden und einbetten
    const logoBase64 = getLogoBase64();
    
    // Header - Weisser Hintergrund mit Logo
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 50, 'F');
    
    // Logo einfuegen (links)
    if (logoBase64) {
      try {
        doc.addImage(`data:image/jpeg;base64,${logoBase64}`, 'JPEG', 15, 8, 35, 35);
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
    doc.text(mockInvoice.invoiceNumber, 190, 28, { align: 'right' });
    
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

    // Empfaenger
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(mockInvoice.customerName, 20, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(mockInvoice.customerAddress.street, 20, y);
    y += 5;
    doc.text(`${mockInvoice.customerAddress.zipCode} ${mockInvoice.customerAddress.city}`, 20, y);

    // Rechnungsdetails rechts
    const rightX = 115;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Rechnungsdatum:', rightX, 65);
    doc.text(formatDate(mockInvoice.issueDate), 190, 65, { align: 'right' });
    doc.text('Fällig am:', rightX, 72);
    doc.text(formatDate(mockInvoice.dueDate), 190, 72, { align: 'right' });
    doc.text('Zeitraum:', rightX, 79);
    doc.text(`${formatDate(mockInvoice.periodStart)} - ${formatDate(mockInvoice.periodEnd)}`, 190, 79, { align: 'right' });

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
    for (const item of mockInvoice.items) {
      doc.text(item.description, 22, y);
      doc.text(item.quantity.toString(), 120, y, { align: 'center' });
      doc.text(formatCurrency(item.unitPrice), 145, y, { align: 'right' });
      doc.text(formatCurrency(item.total), 188, y, { align: 'right' });
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
    doc.text(formatCurrency(mockInvoice.subtotal), 188, y, { align: 'right' });
    y += 6;

    // MwSt - nur anzeigen wenn > 0
    if (mockInvoice.taxRate > 0) {
      doc.text(`MwSt. (${mockInvoice.taxRate}%):`, 140, y);
      doc.text(formatCurrency(mockInvoice.taxAmount), 188, y, { align: 'right' });
      y += 8;
    }

    // Gesamtbetrag
    doc.setFillColor(20, 173, 159); // Teal
    doc.rect(135, y - 5, 55, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Gesamtbetrag:', 138, y + 2);
    doc.text(formatCurrency(mockInvoice.total), 188, y + 2, { align: 'right' });

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
      'Bank: Revolut Bank',
      'IBAN: LT70 3250 0247 2086 9498',
      'BIC: REVOLT21',
      `Verwendungszweck: ${mockInvoice.invoiceNumber}`,
    ];

    for (const line of paymentInfo) {
      doc.text(line, 20, y);
      y += 5;
    }

    y += 8;

    // Hinweis fuer zypriotisches Unternehmen
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Leistungserbringer ist ein in Zypern ansässiges Unternehmen. Reverse-Charge-Verfahren', 20, y);
    doc.text('kann bei EU-Geschäftskunden anwendbar sein. Diese Rechnung ist eine Beispiel-Vorschau.', 20, y + 4);

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
    const pdfBuffer = Buffer.from(pdfOutput);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="webmail-rechnung-vorschau.pdf"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}
