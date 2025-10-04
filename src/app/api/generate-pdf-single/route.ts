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
      console.log('📄 TEMPLATE: TEMPLATE_DYNAMIC detected in HTML');
    } else if (htmlContent.includes('NeutralTemplate')) {
      console.log('📄 TEMPLATE: Legacy NeutralTemplate detected in HTML');
    } else if (htmlContent.includes('ProfessionalTemplate')) {
      console.log('📄 TEMPLATE: Legacy ProfessionalTemplate detected in HTML');
    } else {
      console.log('❓ TEMPLATE: Unknown template or no template identifier found');
      console.log('🔍 HTML Preview (first 200 chars):', htmlContent.substring(0, 200));
    }

    // 🔍 DEBUG: Check footer styling in HTML
    const footerMatches = htmlContent.match(/paddingTop.*?2px/g);
    const inlineStyleMatches = htmlContent.match(/marginTop.*?2px/g);

    console.log('🎯 FOOTER STYLING DEBUG:', {
      hasPaddingTop2px: !!footerMatches,
      footerMatches: footerMatches?.slice(0, 3),
      hasMarginTop2px: !!inlineStyleMatches,
      inlineStyleMatches: inlineStyleMatches?.slice(0, 3),
      htmlLength: htmlContent.length,
    });

    // DEBUG: Check for page-break CSS in received HTML
    const hasPageBreaks = htmlContent.match(/(page-break-|break-)/g);
    if (hasPageBreaks) {
      console.log('⚠️ PAGE BREAKS FOUND in HTML:', hasPageBreaks.length, 'instances');
      console.log('🔍 Page break examples:', hasPageBreaks.slice(0, 5));
    } else {
      console.log('✅ NO PAGE BREAKS found in HTML');
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
