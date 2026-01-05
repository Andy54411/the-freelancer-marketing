/**
 * Test-Route für Marktplatz-Veröffentlichungsgebühr-Rechnungen
 * 
 * Sendet eine Test-Rechnung zur Überprüfung
 */

import { NextRequest, NextResponse } from 'next/server';
import { MarketplacePublishingFeeInvoiceService } from '@/services/payment/MarketplacePublishingFeeInvoiceService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'E-Mail-Adresse erforderlich',
      }, { status: 400 });
    }
    
    // Test-Daten für die Rechnung
    const testData = {
      customerId: 'test_customer_001',
      customerName: 'Test Kunde',
      customerEmail: email,
      customerStreet: 'Musterstraße 123',
      customerZipCity: '12345 Musterstadt',
      customerCountry: 'Deutschland',
      projectId: 'test_project_001',
      projectTitle: 'Test-Projekt: Website-Entwicklung',
      category: 'Webentwicklung',
      subcategory: 'Frontend',
      publishingFeeId: 'test_fee_001',
      revolutOrderId: 'test_revolut_001',
      paymentDate: new Date(),
    };
    
    const result = await MarketplacePublishingFeeInvoiceService.createAndSendInvoice(testData);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test-Rechnung wurde an ${email} gesendet`,
        invoice: {
          id: result.invoice?.id,
          invoiceNumber: result.invoice?.invoiceNumber,
          amount: result.invoice?.amount,
          emailSent: result.invoice?.emailSent,
          pdfUrl: result.invoice?.pdfUrl,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
