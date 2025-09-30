import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';

export async function POST(request: NextRequest) {
  let browser;
  
  try {
    const { htmlContent, template } = await request.json();

    if (!htmlContent) {
      return NextResponse.json(
        { error: 'HTML content is required' },
        { status: 400 }
      );
    }

    // Launch Playwright to convert HTML to PDF
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set A4 viewport
    await page.setViewportSize({ width: 794, height: 1123 });
    
    // Generate PDF twice - once for page 1, once for page 2
    const pdfBuffers: Buffer[] = [];
    
    // Page 1: Hide everything after page-break
    const page1Html = `
      <html>
        <head>
          <style>
            @page { size: A4; margin: 0; }
            html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; overflow: hidden; }
            .page-break { display: none !important; }
            .page-break ~ * { display: none !important; }
          </style>
        </head>
        <body>${htmlContent}</body>
      </html>
    `;
    
    await page.setContent(page1Html, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    
    const page1Buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      displayHeaderFooter: false,
      scale: 1.0
    });
    pdfBuffers.push(page1Buffer);
    
    // Page 2: Hide everything before page-break
    const page2Html = `
      <html>
        <head>
          <style>
            @page { size: A4; margin: 0; }
            html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; overflow: hidden; }
            .pdf-page { display: none !important; }
            .page-break { display: none !important; }
            .page-break ~ * { display: block !important; }
          </style>
        </head>
        <body>${htmlContent}</body>
      </html>
    `;
    
    await page.setContent(page2Html, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    
    const page2Buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      displayHeaderFooter: false,
      scale: 1.0
    });
    pdfBuffers.push(page2Buffer);
    
    // Merge PDFs in correct order: Page 1 first, then Page 2
    const finalPdf = await PDFDocument.create();
    
    // Add page 1
    const page1Pdf = await PDFDocument.load(pdfBuffers[0]);
    const page1Pages = await finalPdf.copyPages(page1Pdf, page1Pdf.getPageIndices());
    page1Pages.forEach((page) => finalPdf.addPage(page));
    
    // Add page 2
    const page2Pdf = await PDFDocument.load(pdfBuffers[1]);
    const page2Pages = await finalPdf.copyPages(page2Pdf, page2Pdf.getPageIndices());
    page2Pages.forEach((page) => finalPdf.addPage(page));
    
    const pdfBuffer = Buffer.from(await finalPdf.save());

    // Convert to Base64
    const pdfBase64 = pdfBuffer.toString('base64');
    
    return NextResponse.json({ 
      pdfBase64,
      success: true 
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}