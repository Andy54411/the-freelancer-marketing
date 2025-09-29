import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/firebase/server';
import { InvoicePDFTemplate } from '@/services/pdf/InvoicePDFTemplate';

/**
 * API Route für eigenständige PDF-Template Generation
 * 
 * KEIN HTML, KEIN BROWSER, KEIN PUPPETEER!
 * Workflow:
 * 1. Invoice-Daten empfangen
 * 2. PDF direkt mit jsPDF erstellen
 * 3. PDF in Firebase Storage speichern
 * 4. Download-URL zurückgeben
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[PDF-API] Dedicated PDF template generation request received');
    const body = await request.json();
    const { invoiceData } = body;
    
    if (!invoiceData) {
      return NextResponse.json({ 
        error: 'invoiceData is required for PDF template generation' 
      }, { status: 400 });
    }

    console.log('[PDF-API] Generating PDF with dedicated PDF template (NO HTML/BROWSER) for invoice:', invoiceData.documentNumber);

    // PDF mit eigenständigem PDF-Template generieren (KEIN HTML/BROWSER!)
    const pdfBuffer = await InvoicePDFTemplate.generateInvoicePDF(invoiceData);

    // PDF in Firebase Storage speichern
    if (!storage) {
      throw new Error('Firebase Storage ist nicht verfügbar');
    }

    const fileName = `invoice-${invoiceData.documentNumber}-${Date.now()}.pdf`;
    const filePath = `invoices/${invoiceData.companyId || 'default'}/${fileName}`;
    
    const storageRef = storage.bucket().file(filePath);
    await storageRef.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        customMetadata: {
          invoiceId: invoiceData.id || 'unknown',
          documentNumber: invoiceData.documentNumber,
          generatedAt: new Date().toISOString(),
          method: 'dedicated-pdf-template',
        },
      },
    });

    // Download-URL generieren (24 Stunden gültig)
    const [downloadUrl] = await storageRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000, // 24 Stunden
    });

    console.log('[PDF-API] Dedicated PDF template generated and stored successfully');

    return NextResponse.json({
      success: true,
      pdfPath: `gs://${storage!.bucket().name}/${filePath}`,
      pdfUrl: downloadUrl,
      method: 'dedicated-pdf-template',
      fileName,
      documentNumber: invoiceData.documentNumber,
    });

  } catch (error) {
    console.error('[PDF-API] Dedicated PDF template generation failed:', error);
    
    return NextResponse.json({
      error: 'Failed to generate PDF',
      details: error.message,
      method: 'dedicated-pdf-template',
    }, { status: 500 });
  }
}