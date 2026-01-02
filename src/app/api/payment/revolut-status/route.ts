/**
 * Revolut Order Status Check
 * 
 * Prüft den Status einer Revolut Order
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth, authErrorResponse } from '@/lib/apiAuth';

const REVOLUT_CONFIG = {
  apiKey: process.env.REVOLUT_MERCHANT_API_KEY,
  isProduction: process.env.REVOLUT_ENVIRONMENT === 'production',
  get baseUrl() {
    return this.isProduction
      ? 'https://merchant.revolut.com/api/1.0'
      : 'https://sandbox-merchant.revolut.com/api/1.0';
  },
};

export async function GET(request: NextRequest) {
  try {
    // Authentifizierung prüfen
    const authResult = await verifyApiAuth(request);
    if (!authResult.success) {
      return authErrorResponse(authResult);
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'orderId required' },
        { status: 400 }
      );
    }

    if (!REVOLUT_CONFIG.apiKey) {
      return NextResponse.json(
        { success: false, error: 'Revolut API not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${REVOLUT_CONFIG.baseUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${REVOLUT_CONFIG.apiKey}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Order not found: ${response.status}` },
        { status: 404 }
      );
    }

    const order = await response.json();

    console.log('[Revolut Status] Order state:', order.state, 'isPaid:', order.state === 'COMPLETED');

    return NextResponse.json({
      success: true,
      state: order.state,
      isPaid: order.state === 'COMPLETED',
      order: {
        id: order.id,
        state: order.state,
        amount: order.order_amount?.value,
        currency: order.order_amount?.currency,
        completedAt: order.completed_at,
      },
    });
  } catch (error) {
    console.error('[Revolut Status] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
