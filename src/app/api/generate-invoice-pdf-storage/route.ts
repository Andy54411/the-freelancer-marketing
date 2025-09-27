import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/firebase/server';
import { db } from '@/firebase/server';
import { InvoiceData } from '@/types/invoiceTypes';

// Dynamic import for Puppeteer
let puppeteer: any = null;
let puppeteerCore: any = null;

async function getPuppeteer() {
  if (!puppeteer && !puppeteerCore) {
    try {
      puppeteer = await import('puppeteer');
      return puppeteer.default || puppeteer;
    } catch (error) {
      try {
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
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
      ],
    };
  }

  // Local development
  return {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
    ],
  };
}

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, companyId } = await request.json();

    if (!invoiceId || !companyId) {
      return NextResponse.json(
        { error: 'invoiceId und companyId sind erforderlich' },
        { status: 400 }
      );
    }

    // Rechnung aus Firestore laden
    const invoiceRef = db!
      .collection('companies')
      .doc(companyId)
      .collection('invoices')
      .doc(invoiceId);
    const invoiceSnap = await invoiceRef.get();

    if (!invoiceSnap.exists) {
      return NextResponse.json({ error: 'Rechnung nicht gefunden' }, { status: 404 });
    }

    const invoiceData = invoiceSnap.data() as InvoiceData;

    // Puppeteer für PDF-Generierung verwenden
    const puppeteerInstance = await getPuppeteer();
    const browser = await puppeteerInstance.launch(getBrowserConfig());
    const page = await browser.newPage();

    try {
      // Print-Seite laden mit besseren Einstellungen für clientseitiges JavaScript
      const printUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/print/invoice/${invoiceId}?companyId=${companyId}`;
      console.log('Loading print URL:', printUrl);

      await page.setViewport({ width: 1200, height: 1600 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      );

      await page.goto(printUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Warte auf das Template-Element
      await page.waitForSelector('[data-template-renderer]', {
        timeout: 15000,
      });

      // Zusätzliche Wartezeit für JavaScript-Execution und Rendering
      await page.waitForTimeout(3000);

      // Überprüfe, ob das Template geladen wurde und Inhalt hat
      const templateExists = await page.$('[data-template-renderer]');
      if (!templateExists) {
        throw new Error('Template-Element nicht gefunden - Seite hat sich nicht richtig geladen');
      }

      // Überprüfe, ob das Template Inhalt hat
      const templateContent = await page.$eval(
        '[data-template-renderer]',
        el => el.textContent?.length || 0
      );
      if (templateContent < 100) {
        console.warn('Template scheint wenig Inhalt zu haben:', templateContent);
        // Zusätzliche Wartezeit für langsames Rendering
        await page.waitForTimeout(2000);
      }

      // PDF generieren - nur den Template-Inhalt
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '15mm',
          bottom: '10mm',
          left: '15mm',
        },
        preferCSSPageSize: false,
        displayHeaderFooter: false,
        // Wichtig: Nur den sichtbaren Bereich des Templates erfassen
        pageRanges: '1',
      });

      // PDF in Firebase Storage speichern
      const bucket = storage!.bucket();
      const fileName = `invoices/${companyId}/${invoiceId}.pdf`;
      const file = bucket.file(fileName);

      await file.save(pdfBuffer, {
        metadata: {
          contentType: 'application/pdf',
          metadata: {
            invoiceId,
            companyId,
            createdAt: new Date().toISOString(),
          },
        },
      });

      // PDF-URL generieren
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 Tage
      });

      // PDF-Pfad in der Rechnung aktualisieren
      await invoiceRef.update({
        pdfPath: `gs://${bucket.name}/${fileName}`,
        pdfUrl: url,
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        pdfPath: `gs://${bucket.name}/${fileName}`,
        pdfUrl: url,
      });
    } finally {
      await page.close();
      await browser.close();
    }
  } catch (error) {
    console.error('Fehler bei der PDF-Generierung:', error);
    return NextResponse.json(
      { error: `PDF-Generierung fehlgeschlagen: ${error}` },
      { status: 500 }
    );
  }
}
