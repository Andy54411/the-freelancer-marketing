/**
 * Test Revolut Merchant API
 * NUR ZUM TESTEN - in Production entfernen
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRevolutPaymentService } from '@/services/payment';

export async function GET(_request: NextRequest) {
  const paymentService = getRevolutPaymentService();
  
  // Check if configured
  const isConfigured = paymentService.isConfigured();
  
  if (!isConfigured) {
    return NextResponse.json({
      success: false,
      error: 'Revolut Merchant API nicht konfiguriert',
      environment: process.env.REVOLUT_ENVIRONMENT,
      hasApiKey: Boolean(process.env.REVOLUT_MERCHANT_API_KEY),
      hasMerchantId: Boolean(process.env.REVOLUT_MERCHANT_ID),
    });
  }

  // Create test payment
  const testOrderId = `TEST-${Date.now()}`;
  
  const result = await paymentService.createPayment({
    orderId: testOrderId,
    amount: 1.00, // 1 EUR Test
    currency: 'EUR',
    description: 'Taskilo Test-Zahlung',
    customerEmail: 'test@taskilo.de',
    customerName: 'Test User',
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://taskilo.de'}/webmail/order/success?orderId=${testOrderId}`,
    cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://taskilo.de'}/webmail/order/cancel?orderId=${testOrderId}`,
  });

  return NextResponse.json({
    success: result.success,
    environment: process.env.REVOLUT_ENVIRONMENT,
    testOrderId,
    paymentId: result.paymentId,
    paymentUrl: result.paymentUrl,
    error: result.error,
  });
}
