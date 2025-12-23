import { NextRequest, NextResponse } from 'next/server';
import { getOrderService } from '@/services/order';
import { getRevolutPaymentService } from '@/services/payment';

// Revolut Webhook Handler
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('revolut-signature');
    const body = await request.text();

    // Verify webhook signature
    const paymentService = getRevolutPaymentService();
    if (signature && !paymentService.verifyWebhook(body, signature)) {
      return NextResponse.json(
        { success: false, error: 'Ungültige Signatur' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);
    const { orderId, status } = paymentService.processWebhook(payload);

    if (status === 'paid') {
      const orderService = getOrderService();
      await orderService.handlePaymentSuccess(orderId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: 'Webhook-Verarbeitung fehlgeschlagen', details: message },
      { status: 500 }
    );
  }
}
