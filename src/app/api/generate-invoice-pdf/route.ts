import { NextRequest, NextResponse } from 'next/server';
import { InvoiceData } from '@/types/invoiceTypes';
import { generateInvoiceHTML, type InvoiceTemplate } from '@/lib/invoice-templates';
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
      companyId: invoiceData.companyId,
      template: invoiceData.template,
    });

    // Template aus Datenbank laden
    console.log('🔍 Versuche Template zu laden für CompanyId:', invoiceData.companyId);
    const template = invoiceData.template || (await getUserTemplate(invoiceData.companyId || ''));
    console.log(
      '🎨 Verwende Template:',
      template,
      'aus:',
      invoiceData.template ? 'invoiceData' : 'database'
    );

    // Sofortiger HTML-Fallback in Production für Stabilität
    if (isVercel || isProduction) {
      console.log('🔄 Verwende HTML-Fallback für Production-Umgebung');

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

    // Generate professional HTML content with template
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
    try {
      const { invoiceData } = await request.json();
      if (invoiceData) {
        // Template aus Datenbank laden
        console.log(
          '🔍 Versuche Template zu laden für CompanyId (Error fallback):',
          invoiceData.companyId
        );
        const template =
          invoiceData.template || (await getUserTemplate(invoiceData.companyId || ''));
        console.log(
          '🎨 Verwende Template (Error fallback):',
          template,
          'aus:',
          invoiceData.template ? 'invoiceData' : 'database'
        );

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
    } catch (fallbackError) {
      console.error('❌ Auch HTML-Fallback fehlgeschlagen:', fallbackError);
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
