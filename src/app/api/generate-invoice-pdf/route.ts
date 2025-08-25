import { NextRequest, NextResponse } from 'next/server';
import { InvoiceData } from '@/types/invoiceTypes';

// Dynamic import for Puppeteer to handle server environment
let puppeteer: any = null;
let puppeteerCore: any = null;

async function getPuppeteer() {
  if (!puppeteer && !puppeteerCore) {
    try {
      // Try puppeteer first (includes Chrome)

      puppeteer = await import('puppeteer');

      return puppeteer.default || puppeteer;
    } catch (error) {

      try {
        // Fallback to puppeteer-core
        puppeteerCore = await import('puppeteer-core');

        return puppeteerCore.default || puppeteerCore;
      } catch (coreError) {

        throw new Error('PDF-Engine nicht verfügbar');
      }
    }
  }
  return puppeteer ? puppeteer.default || puppeteer : puppeteerCore.default || puppeteerCore;
}

function getBrowserConfig() {
  const isVercel = process.env.VERCEL === '1';
  const isProduction = process.env.NODE_ENV === 'production';

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

export async function POST(request: NextRequest) {
  let browser = null;
  const isVercel = process.env.VERCEL === '1';
  const isProduction = process.env.NODE_ENV === 'production';

  try {

    const { invoiceData } = await request.json();

    if (!invoiceData || !invoiceData.id) {

      return NextResponse.json({ error: 'Rechnungsdaten oder ID fehlen' }, { status: 400 });
    }

    // Konstruiere URL zur React-basierten Print-Seite
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://taskilo.de';
    const printUrl = `${baseUrl}/print/invoice/${invoiceData.id}`;

    // Puppeteer nur in Development versuchen
    if (!isVercel && !isProduction) {

      try {
        const puppeteerLib = await getPuppeteer();
        const browserConfig = getBrowserConfig();

        browser = await puppeteerLib.launch(browserConfig);
        if (!browser) {
          throw new Error('Browser konnte nicht gestartet werden');
        }

        const page = await (browser as any).newPage();

        // Viewport für A4-optimierte Darstellung
        await page.setViewport({
          width: 794, // A4 Breite in px bei 96 DPI (210mm)
          height: 1123, // A4 Höhe in px bei 96 DPI (297mm)
          deviceScaleFactor: 1,
        });

        // Navigiere zur React Print-Seite
        await page.goto(printUrl, {
          waitUntil: ['load', 'networkidle0'],
          timeout: 30000,
        });

        // PDF-Generierung mit professionellen Einstellungen
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          displayHeaderFooter: false, // Keine Browser-Header/Footer
          margin: {
            top: '20mm',
            right: '15mm',
            bottom: '20mm',
            left: '15mm',
          },
          preferCSSPageSize: true,
          timeout: 30000,
        });

        await (browser as any).close();

        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Rechnung_${invoiceData.invoiceNumber || invoiceData.number || 'invoice'}.pdf"`,
            'Content-Length': pdfBuffer.length.toString(),
          },
        });
      } catch (puppeteerError) {

        if (browser) {
          try {
            await (browser as any).close();
          } catch (closeError) {

          }
        }
      }
    }

    // Fallback: Redirect zur Print-Seite für Browser-basierte PDF-Generierung

    return NextResponse.json(
      {
        success: true,
        printUrl: printUrl,
        message: 'Rechnung für Druck vorbereitet',
        useClientPrint: true,
      },
      { status: 200 }
    );
  } catch (error) {

    // Browser schließen bei Fehler
    if (browser) {
      try {
        await (browser as any).close();

      } catch (closeError) {

      }
    }

    // Fallback: Immer Print-URL zurückgeben
    try {
      const { invoiceData } = await request.json();
      if (invoiceData && invoiceData.id) {
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000';
        const printUrl = `${baseUrl}/print/invoice/${invoiceData.id}`;

        return NextResponse.json(
          {
            success: true,
            printUrl: printUrl,
            message: 'Fallback: Browser-Druck verfügbar',
            useClientPrint: true,
            error: error.message,
          },
          { status: 200 }
        );
      }
    } catch (fallbackError) {

    }

    return NextResponse.json(
      {
        error: 'PDF-Service temporär nicht verfügbar',
        details: error.message,
        fallback: true,
        environment: { isVercel, isProduction },
      },
      { status: 503 }
    );
  }
}
