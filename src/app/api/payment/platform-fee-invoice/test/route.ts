/**
 * Test Route für Platform Fee Invoice
 * 
 * Sendet eine Test-Rechnung an eine angegebene E-Mail-Adresse
 */

import { NextRequest, NextResponse } from 'next/server';
import { PlatformFeeInvoiceService, type PlatformFeeInvoiceData } from '@/services/payment/PlatformFeeInvoiceService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email is required',
      }, { status: 400 });
    }

    // Test-Daten
    const testInvoiceData: PlatformFeeInvoiceData = {
      providerId: 'TEST-PROVIDER-123',
      providerName: 'Test Dienstleister GmbH',
      providerStreet: 'Musterstraße 123',
      providerZipCity: '10115 Berlin',
      providerCountry: 'Deutschland',
      providerVatId: 'DE123456789',
      providerEmail: email,
      payoutId: `TEST-PAYOUT-${Date.now()}`,
      escrowIds: ['escrow_test_1', 'escrow_test_2'],
      orderIds: ['order_abc123', 'order_def456'],
      grossAmount: 1000.00, // 1000 EUR Brutto
      platformFeeAmount: 150.00, // 15% = 150 EUR Platform-Gebühr
      platformFeePercent: 15,
      netPayoutAmount: 850.00, // 850 EUR Auszahlung
      payoutDate: new Date(),
    };

    // Rechnung erstellen (ohne in Firestore zu speichern für Test)
    const invoiceNumber = `TF-TEST-${Date.now()}`;
    const pdfBase64 = PlatformFeeInvoiceService.generatePDF(testInvoiceData, invoiceNumber);

    // Test-Invoice Objekt für E-Mail
    const testInvoice = {
      id: `test_${Date.now()}`,
      invoiceNumber,
      providerId: testInvoiceData.providerId,
      payoutId: testInvoiceData.payoutId,
      grossAmount: testInvoiceData.grossAmount,
      platformFeeAmount: testInvoiceData.platformFeeAmount,
      platformFeePercent: testInvoiceData.platformFeePercent,
      netPayoutAmount: testInvoiceData.netPayoutAmount,
      pdfBase64,
      emailSent: false,
    };

    // E-Mail senden
    const emailSent = await PlatformFeeInvoiceService.sendInvoiceEmail(
      testInvoice as unknown as Parameters<typeof PlatformFeeInvoiceService.sendInvoiceEmail>[0],
      email,
      testInvoiceData.providerName
    );

    return NextResponse.json({
      success: true,
      message: emailSent 
        ? `Test-Rechnung erfolgreich an ${email} gesendet!`
        : 'PDF generiert, aber E-Mail-Versand fehlgeschlagen',
      invoice: {
        invoiceNumber,
        platformFeeAmount: testInvoiceData.platformFeeAmount,
        netPayoutAmount: testInvoiceData.netPayoutAmount,
      },
      emailSent,
    });
  } catch (error) {
    console.error('[Test Platform Fee Invoice] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create test invoice',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
