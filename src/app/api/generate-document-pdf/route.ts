import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';

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

    console.log(`🎨 Generating PDF from HTML content with template: ${template}`);

    // ✅ Launch Playwright to convert HTML to PDF
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set A4 viewport
    await page.setViewportSize({ width: 794, height: 1123 });
    
    // Set the HTML content directly (already rendered React templates!)
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    // Convert to Base64
    const pdfBase64 = pdfBuffer.toString('base64');
    
    console.log(`✅ PDF generated successfully`);
    
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