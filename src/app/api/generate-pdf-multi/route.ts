import { NextRequest, NextResponse } from 'next/server';
// import { chromium } from 'playwright';
// Using Puppeteer as primary PDF engine
import puppeteer from 'puppeteer';

export async function POST(request: NextRequest) {
  try {
    const { htmlContent } = await request.json();

    if (!htmlContent) {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 });
    }

    console.log('🚀 Starting MULTI PAGE PDF generation with IMPROVED ENGINE...');

    // Using Puppeteer PDF engine instead of Playwright
    console.log('🔧 Using PUPPETEER PDF engine...');

    // Launch Puppeteer browser - BETTER PDF ENGINE
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-background-timer-throttling',
      ],
    });

    const page = await browser.newPage();

    // Set A4 viewport for consistent rendering
    await page.setViewport({ width: 794, height: 1123 }); // A4 in pixels at 96 DPI

    // ADD better CSS for Puppeteer page handling + PROPER WHITE BACKGROUND
    const enhancedHtml = htmlContent.replace(
      '<style',
      `<style>
        @media print {
          .page-break { page-break-before: always !important; }
          body { margin: 0 !important; padding: 0 !important; background: white !important; }
          html { background: white !important; }
          @page { background: white !important; }
        }
      </style>
      <style`
    );

    console.log('🧹 Cleaned HTML from page breaks');

    // Set content and wait for full load
    await page.setContent(enhancedHtml, {
      waitUntil: 'networkidle0',
      timeout: 45000,
    });

    // Wait for all assets to be fully loaded
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate PDF with Puppeteer - FORCE PROPER PAGINATION
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: false,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });

    await browser.close();

    // Convert to base64
    const pdfBase64 = Buffer.from(pdf).toString('base64');

    console.log('✅ MULTI PAGE PDF generated successfully, size:', pdf.length, 'bytes');

    return NextResponse.json({
      pdfBase64,
      success: true,
      pageMode: 'multi',
    });
  } catch (error) {
    console.error('❌ Multi page PDF generation error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Multi page PDF generation failed',
        success: false,
      },
      { status: 500 }
    );
  }
}
