import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { DeliveryNoteService } from '@/services/deliveryNoteService';

export async function POST(request: NextRequest) {
  try {
    const { deliveryNoteId } = await request.json();

    if (!deliveryNoteId) {
      return NextResponse.json({ error: 'Lieferschein-ID ist erforderlich' }, { status: 400 });
    }

    // 1. Lieferschein-Daten laden
    const deliveryNote = await DeliveryNoteService.getDeliveryNote(deliveryNoteId);
    if (!deliveryNote) {
      return NextResponse.json({ error: 'Lieferschein nicht gefunden' }, { status: 404 });
    }

    // 2. Template laden (preferredInvoiceTemplate aus formData oder default)
    const template = deliveryNote.template || 'german-standard';

    // 3. PDF generieren mit Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      // HTML für Lieferschein generieren
      const html = generateDeliveryNoteHTML(deliveryNote, template);

      await page.setContent(html, { waitUntil: 'networkidle0' });

      // PDF generieren
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
        printBackground: true,
      });

      return new NextResponse(Buffer.from(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Lieferschein-${deliveryNote.deliveryNoteNumber}.pdf"`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('Fehler bei PDF-Generierung:', error);
    return NextResponse.json({ error: 'PDF konnte nicht generiert werden' }, { status: 500 });
  }
}

function generateDeliveryNoteHTML(deliveryNote: any, template: string): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  // Taskilo-konforme Styles
  const styles = `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
        background: #fff;
      }
      
      .header {
        border-bottom: 3px solid #14ad9f;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      
      .company-info {
        display: flex;
        justify-content: space-between;
        align-items: start;
      }
      
      .company-details h1 {
        color: #14ad9f;
        font-size: 28px;
        margin-bottom: 10px;
      }
      
      .document-title {
        text-align: right;
      }
      
      .document-title h2 {
        font-size: 36px;
        color: #333;
        margin-bottom: 10px;
      }
      
      .customer-section {
        background: #f8fafc;
        padding: 20px;
        border-radius: 8px;
        margin: 20px 0;
      }
      
      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      
      .items-table th {
        background: #14ad9f;
        color: white;
        padding: 12px;
        text-align: left;
        font-weight: 600;
      }
      
      .items-table td {
        padding: 10px 12px;
        border-bottom: 1px solid #eee;
      }
      
      .items-table tr:nth-child(even) {
        background: #f9f9f9;
      }
      
      .totals {
        margin-top: 20px;
        text-align: right;
      }
      
      .total-line {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #eee;
      }
      
      .total-final {
        font-size: 18px;
        font-weight: bold;
        background: #14ad9f;
        color: white;
        padding: 12px;
        border-radius: 4px;
      }
      
      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #eee;
        font-size: 12px;
        color: #666;
      }
      
      .taskilo-accent {
        color: #14ad9f;
      }
    </style>
  `;

  // Template-spezifisches HTML
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Lieferschein ${deliveryNote.deliveryNoteNumber}</title>
      ${styles}
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <div class="company-details">
            <h1>Taskilo</h1>
            <p>Musterstraße 123</p>
            <p>12345 Musterstadt</p>
            <p>Deutschland</p>
            <p class="taskilo-accent">info@taskilo.de</p>
          </div>
          <div class="document-title">
            <h2>LIEFERSCHEIN</h2>
            <p><strong>Nr:</strong> ${deliveryNote.deliveryNoteNumber}</p>
            <p><strong>Datum:</strong> ${formatDate(deliveryNote.date)}</p>
            <p><strong>Lieferdatum:</strong> ${formatDate(deliveryNote.deliveryDate)}</p>
          </div>
        </div>
      </div>

      <div class="customer-section">
        <h3>Lieferadresse:</h3>
        <div style="margin-top: 10px;">
          <strong>${deliveryNote.customerName}</strong><br>
          ${deliveryNote.customerAddress.replace(/\n/g, '<br>')}
          ${deliveryNote.customerEmail ? `<br><span class="taskilo-accent">${deliveryNote.customerEmail}</span>` : ''}
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>Pos.</th>
            <th>Beschreibung</th>
            <th style="text-align: right;">Menge</th>
            <th style="text-align: right;">Einheit</th>
            ${deliveryNote.showPrices ? '<th style="text-align: right;">Einzelpreis</th><th style="text-align: right;">Gesamt</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${deliveryNote.items
            .map(
              (item: any, index: number) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.description}</td>
              <td style="text-align: right;">${item.quantity}</td>
              <td style="text-align: right;">${item.unit}</td>
              ${
                deliveryNote.showPrices && item.unitPrice
                  ? `<td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
                 <td style="text-align: right;">${formatCurrency(item.total || item.quantity * item.unitPrice)}</td>`
                  : ''
              }
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      ${
        deliveryNote.showPrices && deliveryNote.total
          ? `
        <div class="totals" style="width: 300px; margin-left: auto;">
          ${
            deliveryNote.subtotal
              ? `
            <div class="total-line">
              <span>Zwischensumme:</span>
              <span>${formatCurrency(deliveryNote.subtotal)}</span>
            </div>
          `
              : ''
          }
          ${
            deliveryNote.tax
              ? `
            <div class="total-line">
              <span>MwSt. (${deliveryNote.vatRate || 19}%):</span>
              <span>${formatCurrency(deliveryNote.tax)}</span>
            </div>
          `
              : ''
          }
          <div class="total-final">
            <span>Gesamtwert:</span>
            <span>${formatCurrency(deliveryNote.total)}</span>
          </div>
        </div>
      `
          : ''
      }

      ${
        deliveryNote.notes
          ? `
        <div style="margin-top: 30px;">
          <h3>Bemerkungen:</h3>
          <p style="margin-top: 10px; padding: 15px; background: #f8fafc; border-radius: 4px;">
            ${deliveryNote.notes}
          </p>
        </div>
      `
          : ''
      }

      <div class="footer">
        <div style="display: flex; justify-content: space-between;">
          <div>
            <strong>Vielen Dank für Ihr Vertrauen!</strong><br>
            Taskilo - Ihre digitale Lösung
          </div>
          <div style="text-align: right;">
            <strong>Kontakt:</strong><br>
            E-Mail: info@taskilo.de<br>
            Web: www.taskilo.de
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #14ad9f;">
          <em>Dieser Lieferschein wurde automatisch erstellt und ist ohne Unterschrift gültig.</em>
        </div>
      </div>
    </body>
    </html>
  `;
}
