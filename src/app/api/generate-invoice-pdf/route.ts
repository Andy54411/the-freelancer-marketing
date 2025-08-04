import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { InvoiceData } from '@/types/invoiceTypes';

export async function POST(request: NextRequest) {
  try {
    const { invoiceData } = await request.json();

    if (!invoiceData) {
      return NextResponse.json({ error: 'Rechnungsdaten fehlen' }, { status: 400 });
    }

    console.log('🎯 Starte PDF-Generation mit Puppeteer...');

    // Launch Puppeteer with optimized settings
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ],
    });

    const page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2,
    });

    // Generate professional HTML content
    const htmlContent = generateInvoiceHTML(invoiceData);

    // Set content and wait for network idle
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Generate PDF with professional settings
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
      preferCSSPageSize: true,
    });

    await browser.close();

    console.log('✅ PDF erfolgreich generiert!');

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Rechnung_${invoiceData.invoiceNumber || invoiceData.number || 'invoice'}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('❌ Fehler bei PDF-Generation:', error);
    return NextResponse.json(
      { error: 'Fehler bei der PDF-Generierung', details: error.message },
      { status: 500 }
    );
  }
}

function generateInvoiceHTML(invoice: InvoiceData): string {
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rechnung ${invoice.invoiceNumber || invoice.number}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          background: white;
          font-size: 14px;
        }
        
        .invoice-container {
          max-width: 210mm;
          margin: 0 auto;
          padding: 20mm 15mm;
          background: white;
          min-height: 100vh;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid #14ad9f;
        }
        
        .company-info h1 {
          font-size: 28px;
          font-weight: 700;
          color: #14ad9f;
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }
        
        .company-details {
          color: #6b7280;
          line-height: 1.5;
          font-size: 13px;
        }
        
        .invoice-meta {
          text-align: right;
        }
        
        .invoice-title {
          font-size: 32px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 8px;
          letter-spacing: -0.8px;
        }
        
        .invoice-number {
          font-size: 18px;
          font-weight: 600;
          color: #14ad9f;
          margin-bottom: 16px;
        }
        
        .invoice-dates {
          color: #6b7280;
          font-size: 13px;
          line-height: 1.6;
        }
        
        .customer-section {
          background: #f8fafc;
          padding: 24px;
          border-radius: 12px;
          border-left: 4px solid #14ad9f;
          margin: 32px 0;
        }
        
        .customer-section h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 12px;
        }
        
        .customer-details {
          color: #374151;
          line-height: 1.6;
        }
        
        .customer-name {
          font-weight: 600;
          font-size: 15px;
          color: #1f2937;
          margin-bottom: 8px;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 32px 0;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .items-table th {
          background: #14ad9f;
          color: white;
          padding: 16px 12px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        
        .items-table th:last-child,
        .items-table td:last-child {
          text-align: right;
        }
        
        .items-table td {
          padding: 16px 12px;
          border-bottom: 1px solid #e5e7eb;
          color: #374151;
        }
        
        .items-table tr:last-child td {
          border-bottom: none;
        }
        
        .items-table .quantity,
        .items-table .price {
          text-align: center;
          font-weight: 500;
        }
        
        .items-table .amount {
          font-weight: 600;
          color: #1f2937;
        }
        
        .totals-section {
          margin-top: 32px;
          display: flex;
          justify-content: flex-end;
        }
        
        .totals-table {
          min-width: 320px;
          border-collapse: collapse;
        }
        
        .totals-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .totals-table .label {
          text-align: right;
          color: #6b7280;
          font-weight: 500;
        }
        
        .totals-table .value {
          text-align: right;
          font-weight: 600;
          min-width: 120px;
        }
        
        .totals-table .total-row td {
          border-top: 2px solid #14ad9f;
          border-bottom: 2px solid #14ad9f;
          background: #f0fdfa;
          color: #14ad9f;
          font-size: 18px;
          font-weight: 700;
          padding: 16px;
        }
        
        .notes-section {
          margin-top: 40px;
          padding: 24px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }
        
        .notes-section h4 {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 12px;
        }
        
        .notes-content {
          color: #6b7280;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        
        .footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #9ca3af;
          font-size: 12px;
        }
        
        .footer-message {
          font-style: italic;
          color: #14ad9f;
          font-weight: 500;
        }
        
        .currency {
          font-variant-numeric: tabular-nums;
        }
        
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .invoice-container {
            padding: 0;
            margin: 0;
            max-width: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Header -->
        <div class="header">
          <div class="company-info">
            <h1>${invoice.companyName || 'Ihr Unternehmen'}</h1>
            <div class="company-details">
              ${(invoice.companyAddress || '').replace(/\n/g, '<br>')}<br>
              ${invoice.companyEmail || ''}<br>
              ${invoice.companyPhone || ''}
              ${invoice.companyVatId ? `<br>USt-IdNr.: ${invoice.companyVatId}` : ''}
            </div>
          </div>
          
          <div class="invoice-meta">
            <div class="invoice-title">RECHNUNG</div>
            <div class="invoice-number">${invoice.invoiceNumber || invoice.number || 'R-' + invoice.id?.substring(0, 8)}</div>
            <div class="invoice-dates">
              <strong>Datum:</strong> ${new Date(invoice.date || invoice.issueDate).toLocaleDateString('de-DE')}<br>
              <strong>Fällig:</strong> ${new Date(invoice.dueDate).toLocaleDateString('de-DE')}
            </div>
          </div>
        </div>

        <!-- Customer Section -->
        <div class="customer-section">
          <h3>Rechnungsempfänger</h3>
          <div class="customer-details">
            <div class="customer-name">${invoice.customerName}</div>
            <div>${invoice.customerEmail}</div>
            <div>${(invoice.customerAddress || '').replace(/\n/g, '<br>')}</div>
          </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 50%">Beschreibung</th>
              <th style="width: 15%">Menge</th>
              <th style="width: 20%">Einzelpreis</th>
              <th style="width: 15%">Gesamtpreis</th>
            </tr>
          </thead>
          <tbody>
            ${(invoice.items || [])
              .map(
                item => `
              <tr>
                <td>${item.description}</td>
                <td class="quantity">${item.quantity}</td>
                <td class="price currency">${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(item.unitPrice)}</td>
                <td class="amount currency">${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(item.total)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <!-- Totals Section -->
        <div class="totals-section">
          <table class="totals-table">
            <tr>
              <td class="label">Zwischensumme:</td>
              <td class="value currency">${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(invoice.amount)}</td>
            </tr>
            <tr>
              <td class="label">MwSt. (${invoice.vatRate || 19}%):</td>
              <td class="value currency">${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(invoice.tax)}</td>
            </tr>
            <tr class="total-row">
              <td class="label">Gesamtbetrag:</td>
              <td class="value currency">${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(invoice.total)}</td>
            </tr>
          </table>
        </div>

        ${
          invoice.notes
            ? `
        <!-- Notes Section -->
        <div class="notes-section">
          <h4>Anmerkungen</h4>
          <div class="notes-content">${invoice.notes.replace(/\n/g, '<br>')}</div>
        </div>
        `
            : ''
        }

        <!-- Footer -->
        <div class="footer">
          <div class="footer-message">Vielen Dank für Ihr Vertrauen!</div>
          <div style="margin-top: 8px;">
            Erstellt mit Taskilo • ${new Date().toLocaleDateString('de-DE')}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
