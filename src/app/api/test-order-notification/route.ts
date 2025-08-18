import { NextRequest, NextResponse } from 'next/server';
import { OrderNotificationService } from '@/lib/order-notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type = 'new_order', userUid, orderId, customerUid, providerUid, orderData } = body;

    if (!userUid) {
      return NextResponse.json({ success: false, error: 'userUid erforderlich' }, { status: 400 });
    }

    console.log('[API /test-order-notification] Erstelle Test-Order-Notification:', {
      type,
      userUid,
      orderId: orderId || 'test-order-' + Date.now(),
    });

    switch (type) {
      case 'test':
        // Einfache Test-Notification
        await OrderNotificationService.createTestOrderNotification(
          userUid,
          orderId || 'test-order-' + Date.now()
        );
        break;

      case 'new_order':
        // Vollständige Auftragsbuchungs-Notifications
        if (!customerUid || !providerUid || !orderData) {
          return NextResponse.json(
            {
              success: false,
              error: 'customerUid, providerUid und orderData erforderlich für new_order',
            },
            { status: 400 }
          );
        }

        await OrderNotificationService.createNewOrderNotifications(
          orderId || 'order-' + Date.now(),
          customerUid,
          providerUid,
          {
            customerName: orderData.customerName || 'Test Kunde',
            providerName: orderData.providerName || 'Test Anbieter',
            subcategory: orderData.subcategory || 'Mietkoch',
            category: orderData.category || 'Hotel & Gastronomie',
            amount: orderData.amount || 150,
            dateFrom: orderData.dateFrom || new Date().toISOString().split('T')[0],
            dateTo: orderData.dateTo,
          }
        );
        break;

      case 'status_change':
        // Status-Änderungs-Notification
        const { status, targetUserUid } = body;
        if (!status || !targetUserUid) {
          return NextResponse.json(
            { success: false, error: 'status und targetUserUid erforderlich für status_change' },
            { status: 400 }
          );
        }

        await OrderNotificationService.createOrderStatusNotification(
          orderId || 'order-' + Date.now(),
          targetUserUid,
          status,
          {
            customerName: orderData?.customerName || 'Test Kunde',
            providerName: orderData?.providerName || 'Test Anbieter',
            subcategory: orderData?.subcategory || 'Mietkoch',
            amount: orderData?.amount || 150,
          }
        );
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unbekannter Notification-Typ: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `${type} Order-Notification erfolgreich erstellt`,
      userUid,
      orderId: orderId || 'test-order-' + Date.now(),
      type,
    });
  } catch (error) {
    console.error('[API /test-order-notification] Fehler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
