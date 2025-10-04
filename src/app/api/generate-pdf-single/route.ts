import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';

export async function POST(request: NextRequest) {
  try {
    const { htmlContent } = await request.json();

    if (!htmlContent) {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 });
    }

    console.log('🚀 Starting SINGLE PAGE PDF generation...');

    // DEBUG: Check which template is being used (moderne Template-Namen)
    if (htmlContent.includes('TEMPLATE_NEUTRAL')) {
      console.log('📄 TEMPLATE: TEMPLATE_NEUTRAL detected in HTML');
    } else if (htmlContent.includes('TEMPLATE_STANDARD')) {
      console.log('📄 TEMPLATE: TEMPLATE_STANDARD detected in HTML');
    } else if (htmlContent.includes('TEMPLATE_ELEGANT')) {
      console.log('📄 TEMPLATE: TEMPLATE_ELEGANT detected in HTML');
    } else if (htmlContent.includes('TEMPLATE_TECHNICAL')) {
      console.log('📄 TEMPLATE: TEMPLATE_TECHNICAL detected in HTML');
    } else if (htmlContent.includes('TEMPLATE_GEOMETRIC')) {
      console.log('📄 TEMPLATE: TEMPLATE_GEOMETRIC detected in HTML');
    } else if (htmlContent.includes('TEMPLATE_DYNAMIC')) {
      // TEMPLATE_DYNAMIC detected
    } else if (htmlContent.includes('NeutralTemplate')) {
      // Legacy NeutralTemplate detected
    } else if (htmlContent.includes('ProfessionalTemplate')) {
      // Legacy ProfessionalTemplate detected
    }





    // BRUTAL CSS REMOVAL - remove ALL page breaks
    const cleanHtml = htmlContent
      .replace(/page-break-before[^;}]*[;}]/g, '')
      .replace(/page-break-after[^;}]*[;}]/g, '')
      .replace(/break-before[^;}]*[;}]/g, '')
      .replace(/break-after[^;}]*[;}]/g, '')
      .replace(/@page[^}]*}/g, '')
      .replace(/\.page-break[^}]*}/g, '');

    console.log('🧹 Removed all page-break CSS from HTML');

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    await page.setContent(cleanHtml, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Force single page CSS
    await page.addStyleTag({
      content: `
        * { 
          page-break-before: avoid !important;
          page-break-after: avoid !important;
          break-before: avoid !important;
          break-after: avoid !important;
        }
        @page { size: A4; margin: 0; }
      `,
    });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });

    await browser.close();

    const pdfBase64 = Buffer.from(pdf).toString('base64');

    console.log('✅ SINGLE PAGE PDF generated');

    return NextResponse.json({
      pdfBase64,
      success: true,
      pageMode: 'single',
    });
  } catch (error) {
    console.error('❌ Single page PDF generation error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Single page PDF generation failed',
        success: false,
      },
      { status: 500 }
    );
  }
}
