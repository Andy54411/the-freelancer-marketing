import { NextRequest, NextResponse } from 'next/server';
import { getOrderService } from '@/services/order';

// Get order status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const orderService = getOrderService();
    const order = await orderService.getOrder(orderId);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Bestellung nicht gefunden' },
        { status: 404 }
      );
    }

    // Return safe order data (no sensitive contact info)
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        type: order.type,
        domain: order.domain,
        email: order.email,
        priceGross: order.priceGross,
        vatAmount: order.vatAmount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        completedAt: order.completedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: 'Fehler beim Abrufen der Bestellung', details: message },
      { status: 500 }
    );
  }
}
