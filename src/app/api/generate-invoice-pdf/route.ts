import { NextRequest, NextResponse } from 'next/server';
import { InvoiceData } from '@/types/invoiceTypes';
import { InvoiceTemplate } from '@/components/finance/InvoiceTemplates';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';

// Dynamic import for Puppeteer to handle server environment
let puppeteer: any = null;
let puppeteerCore: any = null;

async function getPuppeteer() {
  if (!puppeteer && !puppeteerCore) {
    try {
      // Try puppeteer first (includes Chrome)
      console.log('🔍 Versuche Puppeteer zu laden...');
      puppeteer = await import('puppeteer');
      console.log('✅ Puppeteer erfolgreich geladen');
      return puppeteer.default || puppeteer;
    } catch (error) {
      console.warn('⚠️ Puppeteer nicht verfügbar, versuche puppeteer-core:', error.message);
      try {
        // Fallback to puppeteer-core
        puppeteerCore = await import('puppeteer-core');
        console.log('✅ Puppeteer-core erfolgreich geladen');
        return puppeteerCore.default || puppeteerCore;
      } catch (coreError) {
        console.error('❌ Weder Puppeteer noch Puppeteer-core verfügbar:', coreError.message);
        throw new Error('PDF-Engine nicht verfügbar');
      }
    }
  }
  return puppeteer ? puppeteer.default || puppeteer : puppeteerCore.default || puppeteerCore;
}

function getBrowserConfig() {
  const isVercel = process.env.VERCEL === '1';
  const isProduction = process.env.NODE_ENV === 'production';

  console.log('🔧 Umgebung:', { isVercel, isProduction });

  if (isVercel || isProduction) {
    // Vercel/Production configuration mit Chrome detection
    return {
      headless: true,
      executablePath: process.env.CHROME_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-blink-features=AutomationControlled',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',
        '--run-all-compositor-stages-before-draw',
        '--disable-background-media-playback',
        '--disable-background-sync',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--ignore-ssl-errors',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
        '--ignore-ssl-errors-spki-list',
        '--disable-gpu',
        '--single-process',
        '--no-zygote',
      ],
      defaultViewport: {
        width: 1200,
        height: 800,
        deviceScaleFactor: 1,
      },
      timeout: 30000,
    };
  } else {
    // Local development configuration
    return {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      timeout: 30000,
    };
  }
}

// Get user's preferred template from database
async function getUserTemplate(companyId: string): Promise<InvoiceTemplate> {
  try {
    console.log('🎨 Lade Benutzer-Template für Company:', companyId);
    const userDoc = await getDoc(doc(db, 'users', companyId));

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const preferredTemplate = userData.preferredInvoiceTemplate as InvoiceTemplate;
      console.log('✅ Gefundenes Template:', preferredTemplate);
      return preferredTemplate || 'minimal';
    }

    console.log('⚠️ Kein Benutzer gefunden, verwende Standard-Template');
    return 'minimal';
  } catch (error) {
    console.error('❌ Fehler beim Laden des Templates:', error);
    return 'minimal';
  }
}

function generateInvoiceHTML(invoice: InvoiceData, template: InvoiceTemplate = 'minimal'): string {
  console.log('🎨 Generiere HTML mit Template:', template);

  // Template-spezifische HTML-Generierung
  switch (template) {
    case 'minimal':
      return generateMinimalHTML(invoice);
    case 'classic':
      return generateClassicHTML(invoice);
    case 'modern':
      return generateModernHTML(invoice);
    case 'corporate':
      return generateCorporateHTML(invoice);
    case 'creative':
      return generateCreativeHTML(invoice);
    case 'german-standard':
      return generateGermanStandardHTML(invoice);
    default:
      return generateMinimalHTML(invoice);
  }
}

function generateMinimalHTML(invoice: InvoiceData): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rechnung ${invoice.invoiceNumber || invoice.number}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
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
          padding: 48px;
          background: white;
          min-height: 100vh;
        }
        
        /* Minimal header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 64px;
        }
        
        .company-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .company-logo {
          height: 48px;
          width: auto;
          object-fit: contain;
        }
        
        .company-name {
          font-size: 24px;
          font-weight: 400;
          color: #1f2937;
        }
        
        .invoice-meta {
          text-align: right;
        }
        
        .invoice-title {
          font-size: 48px;
          font-weight: 100;
          color: #9ca3af;
          margin-bottom: 16px;
          letter-spacing: -1px;
        }
        
        .invoice-details {
          font-size: 14px;
          color: #6b7280;
          line-height: 1.5;
        }
        
        /* Customer section - minimal */
        .customer-section {
          margin-bottom: 64px;
        }
        
        .customer-name {
          font-size: 18px;
          font-weight: 500;
          color: #1f2937;
          margin-bottom: 8px;
        }
        
        .customer-address {
          color: #6b7280;
          font-size: 14px;
          line-height: 1.8;
        }
        
        /* Items section - ultra minimal */
        .items-section {
          margin-bottom: 64px;
        }
        
        .items-border {
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 32px;
          margin-bottom: 32px;
        }
        
        .item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
        }
        
        .item-description {
          flex: 1;
        }
        
        .item-name {
          color: #1f2937;
          font-size: 14px;
        }
        
        .item-details {
          font-size: 12px;
          color: #6b7280;
          margin-top: 4px;
        }
        
        .item-total {
          color: #1f2937;
          font-weight: 500;
        }
        
        /* Minimal totals */
        .totals-section {
          max-width: 300px;
          margin-left: auto;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
        }
        
        .total-row.subtotal,
        .total-row.tax {
          color: #6b7280;
          font-size: 12px;
        }
        
        .total-row.final {
          font-size: 18px;
          font-weight: 500;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
          margin-top: 8px;
        }
        
        .small-business-note {
          font-size: 10px;
          color: #6b7280;
          font-style: italic;
          text-align: center;
          margin-top: 16px;
          line-height: 1.4;
        }
        
        /* Minimal footer */
        .footer {
          font-size: 10px;
          color: #9ca3af;
          text-align: center;
          margin-top: 64px;
          line-height: 1.6;
        }
        
        .due-date {
          margin-bottom: 24px;
          font-size: 12px;
        }
        
        .company-details {
          margin-bottom: 8px;
          font-weight: 500;
        }
        
        .company-address-footer {
          margin-bottom: 16px;
        }
        
        .company-contact {
          margin-bottom: 8px;
        }
        
        .company-legal {
          border-top: 1px solid #f3f4f6;
          padding-top: 16px;
          margin-top: 16px;
        }
        
        @media print {
          body { -webkit-print-color-adjust: exact; }
          .invoice-container { padding: 20mm 15mm; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Minimal header -->
        <div class="header">
          <div class="company-info">
            ${
              invoice.companyLogo
                ? `
              <img src="${invoice.companyLogo}" alt="${invoice.companyName} Logo" class="company-logo" />
            `
                : ''
            }
            <div class="company-name">${invoice.companyName}</div>
          </div>
          <div class="invoice-meta">
            <div class="invoice-title">RECHNUNG</div>
            <div class="invoice-details">
              <div>${invoice.invoiceNumber || invoice.number}</div>
              <div>${formatDate(invoice.issueDate)}</div>
            </div>
          </div>
        </div>

        <!-- Customer - minimal -->
        <div class="customer-section">
          <div class="customer-name">${invoice.customerName}</div>
          ${
            invoice.customerAddress
              ? `
            <div class="customer-address">
              ${invoice.customerAddress
                .split('\n')
                .map(line => `<div>${line}</div>`)
                .join('')}
            </div>
          `
              : ''
          }
        </div>

        <!-- Items - ultra minimal -->
        <div class="items-section">
          <div class="items-border">
            ${
              invoice.items && invoice.items.length > 0
                ? invoice.items
                    .map(
                      item => `
                <div class="item-row">
                  <div class="item-description">
                    <div class="item-name">${item.description}</div>
                    <div class="item-details">${item.quantity} × ${formatCurrency(item.unitPrice)}</div>
                  </div>
                  <div class="item-total">${formatCurrency(item.total)}</div>
                </div>
              `
                    )
                    .join('')
                : `
                <div class="item-row">
                  <div class="item-description">
                    <div class="item-name">${invoice.description}</div>
                  </div>
                  <div class="item-total">${formatCurrency(invoice.amount)}</div>
                </div>
              `
            }
          </div>

          <!-- Minimal totals -->
          <div class="totals-section">
            ${
              !invoice.isSmallBusiness
                ? `
              <div class="total-row subtotal">
                <span>Netto</span>
                <span>${formatCurrency(invoice.amount)}</span>
              </div>
              <div class="total-row tax">
                <span>MwSt. (${invoice.vatRate || 19}%)</span>
                <span>${formatCurrency(invoice.tax)}</span>
              </div>
              <div class="total-row final">
                <span>Gesamt</span>
                <span>${formatCurrency(invoice.total)}</span>
              </div>
            `
                : `
              <div class="total-row final">
                <span>Gesamt</span>
                <span>${formatCurrency(invoice.total)}</span>
              </div>
              <div class="small-business-note">
                <em>
                  Gemäß § 19 UStG wird keine Umsatzsteuer ausgewiesen.<br>
                  (Kleinunternehmerregelung)
                </em>
              </div>
            `
            }
          </div>
        </div>

        <!-- Minimal footer -->
        <div class="footer">
          <div class="due-date">Fällig bis ${formatDate(invoice.dueDate)}</div>
          <div class="company-details">${invoice.companyName}</div>
          <div class="company-address-footer">${invoice.companyAddress}</div>
          ${invoice.companyWebsite ? `<div class="company-contact">Web: ${invoice.companyWebsite}</div>` : ''}
          <div class="company-contact">${invoice.companyEmail}</div>
          ${invoice.companyPhone ? `<div class="company-contact">Tel: ${invoice.companyPhone}</div>` : ''}
          
          <div class="company-legal">
            ${invoice.companyVatId ? `<div>USt-IdNr.: ${invoice.companyVatId}</div>` : ''}
            ${invoice.companyTaxNumber ? `<div>Steuernummer: ${invoice.companyTaxNumber}</div>` : ''}
            ${
              invoice.companyRegister && invoice.districtCourt
                ? `
              <div>${invoice.companyRegister} ${invoice.districtCourt}</div>
            `
                : ''
            }
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Placeholder functions for other templates (können später implementiert werden)
function generateClassicHTML(invoice: InvoiceData): string {
  return generateMinimalHTML(invoice); // Fallback für jetzt
}

function generateModernHTML(invoice: InvoiceData): string {
  return generateMinimalHTML(invoice); // Fallback für jetzt
}

function generateCorporateHTML(invoice: InvoiceData): string {
  return generateMinimalHTML(invoice); // Fallback für jetzt
}

function generateCreativeHTML(invoice: InvoiceData): string {
  return generateMinimalHTML(invoice); // Fallback für jetzt
}

function generateGermanStandardHTML(invoice: InvoiceData): string {
  return generateMinimalHTML(invoice); // Fallback für jetzt
}

export async function POST(request: NextRequest) {
  let browser;
  const isVercel = process.env.VERCEL === '1';
  const isProduction = process.env.NODE_ENV === 'production';

  try {
    console.log('🎯 Starte PDF-Generation...', { isVercel, isProduction });

    const { invoiceData } = await request.json();

    if (!invoiceData) {
      console.error('❌ Keine Rechnungsdaten erhalten');
      return NextResponse.json({ error: 'Rechnungsdaten fehlen' }, { status: 400 });
    }

    console.log('📄 Rechnungsdaten erhalten:', {
      id: invoiceData.id,
      number: invoiceData.invoiceNumber || invoiceData.number,
      companyName: invoiceData.companyName,
    });

    // Sofortiger HTML-Fallback in Production für Stabilität
    if (isVercel || isProduction) {
      console.log('🔄 Verwende HTML-Fallback für Production-Umgebung');

      // Template aus Datenbank laden
      const template = invoiceData.template || (await getUserTemplate(invoiceData.companyId || ''));
      console.log('🎨 Verwende Template:', template);

      const htmlContent = generateInvoiceHTML(invoiceData, template);
      return new NextResponse(htmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-PDF-Fallback': 'true',
          'X-Production-Mode': 'true',
        },
      });
    }

    // Nur in Entwicklungsumgebung versuchen wir Puppeteer
    console.log('🔍 Prüfe Puppeteer-Verfügbarkeit (Development)...');
    let puppeteerLib;
    try {
      puppeteerLib = await getPuppeteer();
    } catch (puppeteerError) {
      console.warn('⚠️ Puppeteer nicht verfügbar, verwende HTML-Fallback:', puppeteerError.message);

      // Template aus Datenbank laden
      const template = invoiceData.template || (await getUserTemplate(invoiceData.companyId || ''));
      console.log('🎨 Verwende Template:', template);

      // Fallback: Sende HTML für Client-seitige PDF-Generierung
      const htmlContent = generateInvoiceHTML(invoiceData, template);
      return new NextResponse(htmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-PDF-Fallback': 'true',
          'X-Puppeteer-Error': 'unavailable',
        },
      });
    }

    // Launch Puppeteer nur in Development
    console.log('🚀 Starte Puppeteer Browser (Development)...');
    const browserConfig = getBrowserConfig();

    browser = await puppeteerLib.launch(browserConfig);

    console.log('📄 Erstelle neue Seite...');
    const page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 1.5,
    });

    console.log('🎨 Generiere HTML Content...');
    // Template aus Datenbank laden
    const template = invoiceData.template || (await getUserTemplate(invoiceData.companyId || ''));
    console.log('🎨 Verwende Template:', template);

    // Generate professional HTML content
    const htmlContent = generateInvoiceHTML(invoiceData, template);

    console.log('📝 Setze HTML Content...');
    // Set content and wait for network idle
    await page.setContent(htmlContent, {
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000,
    });

    console.log('🖨️ Generiere PDF...');
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
      timeout: 30000,
    });

    console.log('🧹 Schließe Browser...');
    await browser.close();

    console.log('✅ PDF erfolgreich generiert! Größe:', pdfBuffer.length, 'bytes');

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
    console.error('❌ Fehler bei PDF-Generation:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      environment: { isVercel, isProduction },
    });

    // Ensure browser is closed even on error
    if (browser) {
      try {
        await browser.close();
        console.log('🧹 Browser nach Fehler geschlossen');
      } catch (closeError) {
        console.error('❌ Fehler beim Schließen des Browsers:', closeError.message);
      }
    }

    // Bei jedem Fehler HTML-Fallback anbieten
    console.log('🔄 Verwende HTML-Fallback nach Fehler');
    const { invoiceData } = await request.json();
    if (invoiceData) {
      // Template aus Datenbank laden
      const template = invoiceData.template || (await getUserTemplate(invoiceData.companyId || ''));
      console.log('🎨 Verwende Template:', template);

      const htmlContent = generateInvoiceHTML(invoiceData, template);
      return new NextResponse(htmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-PDF-Fallback': 'true',
          'X-Error-Recovery': 'true',
          'X-Original-Error': error.message,
        },
      });
    }

    return NextResponse.json(
      {
        error: 'PDF-Service temporär nicht verfügbar',
        details: 'Verwende HTML-Fallback für PDF-Generierung',
        fallback: true,
        environment: { isVercel, isProduction },
      },
      { status: 503 }
    );
  }
}
