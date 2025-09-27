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
      ],
    };
  }

  // Local development
  return {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
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

    // Rechnung laden
    const invoiceDoc = await db!
      .collection('companies')
      .doc(companyId)
      .collection('invoices')
      .doc(invoiceId)
      .get();
    if (!invoiceDoc.exists) {
      return NextResponse.json({ error: 'Rechnung nicht gefunden' }, { status: 404 });
    }

    const invoice = { id: invoiceDoc.id, ...invoiceDoc.data() } as InvoiceData;

    // PDF generieren
    const puppeteerInstance = await getPuppeteer();
    const browser = await puppeteerInstance.launch(getBrowserConfig());
    const page = await browser.newPage();

    try {
      // HTML für die Rechnung generieren
      const invoiceUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://taskilo.de'}/print/invoice/${invoice.id}?companyId=${companyId}`;

      await page.goto(invoiceUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // PDF generieren
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      });

      // PDF in Firebase Storage speichern
      if (!storage) {
        throw new Error('Firebase Storage nicht verfügbar');
      }
      const bucket = storage.bucket('tilvo-f142f.firebasestorage.app');

      const fileName = `invoices/${companyId}/${invoice.id}.pdf`;
      const file = bucket.file(fileName);

      await file.save(pdfBuffer, {
        metadata: {
          contentType: 'application/pdf',
          metadata: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber || invoice.number,
            companyId: companyId,
            createdAt: new Date().toISOString(),
          },
        },
        public: false, // Private, nur über signed URLs zugänglich
      });

      // PDF-Pfad in der Rechnung speichern
      const pdfPath = `gs://${bucket.name}/${fileName}`;
      await db!
        .collection('companies')
        .doc(companyId)
        .collection('invoices')
        .doc(invoiceId)
        .update({
          pdfPath: pdfPath,
          pdfGeneratedAt: new Date(),
        });

      await browser.close();

      return NextResponse.json({
        success: true,
        pdfPath: pdfPath,
        fileName: fileName,
        message: 'PDF erfolgreich generiert und gespeichert',
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error: any) {
    console.error('Fehler beim Generieren des PDF:', error);
    return NextResponse.json(
      {
        error: error.message || 'Unbekannter Fehler beim Generieren des PDFs',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
