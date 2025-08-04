import { NextRequest, NextResponse } from 'next/server';
import { InvoiceData } from '@/types/invoiceTypes';

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

export async function POST(request: NextRequest) {
  let browser = null;
  const isVercel = process.env.VERCEL === '1';
  const isProduction = process.env.NODE_ENV === 'production';

  try {
    console.log('🚀 Starte React-basierte PDF-Generation...', { isVercel, isProduction });

    const { invoiceData } = await request.json();

    if (!invoiceData || !invoiceData.id) {
      console.error('❌ Keine gültigen Rechnungsdaten erhalten');
      return NextResponse.json({ error: 'Rechnungsdaten oder ID fehlen' }, { status: 400 });
    }

    console.log('📄 Rechnungsdaten erhalten:', {
      id: invoiceData.id,
      number: invoiceData.invoiceNumber || invoiceData.number,
      companyName: invoiceData.companyName,
      companyId: invoiceData.companyId,
      template: invoiceData.template,
    });

    // Konstruiere URL zur React-basierten Print-Seite
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://taskilo.de';
    const printUrl = `${baseUrl}/print/invoice/${invoiceData.id}`;

    console.log('🖨️ Navigiere zur React Print-Seite:', printUrl);

    // Puppeteer nur in Development versuchen
    if (!isVercel && !isProduction) {
      console.log('🔍 Versuche Puppeteer für PDF-Generation (Development)...');

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

        console.log('🖨️ Generiere PDF von React-Seite...');

        // PDF-Generierung mit professionellen Einstellungen
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

        await (browser as any).close();

        console.log('✅ PDF erfolgreich generiert! Größe:', pdfBuffer.length, 'bytes');

        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Rechnung_${invoiceData.invoiceNumber || invoiceData.number || 'invoice'}.pdf"`,
            'Content-Length': pdfBuffer.length.toString(),
          },
        });
      } catch (puppeteerError) {
        console.warn('⚠️ Puppeteer-PDF-Generation fehlgeschlagen:', puppeteerError.message);
        if (browser) {
          try {
            await (browser as any).close();
          } catch (closeError) {
            console.error('❌ Fehler beim Schließen des Browsers:', closeError);
          }
        }
      }
    }

    // Fallback: Redirect zur Print-Seite für Browser-basierte PDF-Generierung
    console.log('🔄 Verwende Browser-Fallback - Redirect zur Print-Seite');

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
    console.error('❌ Fehler bei PDF-Generation:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      environment: { isVercel, isProduction },
    });

    // Browser schließen bei Fehler
    if (browser) {
      try {
        await (browser as any).close();
        console.log('🧹 Browser nach Fehler geschlossen');
      } catch (closeError) {
        console.error('❌ Fehler beim Schließen des Browsers:', closeError.message);
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
      console.error('❌ Auch Fallback-Response fehlgeschlagen:', fallbackError);
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
