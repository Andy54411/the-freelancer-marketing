import { NextResponse } from 'next/server';
import { db } from '../../../firebase/server';

export async function GET() {
  try {
    const orderId = 'B0nzoSIx6S4gEpJKEi3C';

    console.log('[test-order-exists] Suche nach Order:', orderId);

    const orderDoc = await db.collection('auftraege').doc(orderId).get();

    if (orderDoc.exists) {
      const orderData = orderDoc.data();
      console.log('[test-order-exists] Order gefunden:', orderData);

      return NextResponse.json({
        success: true,
        orderExists: true,
        orderId: orderId,
        orderData: orderData,
        message: 'Order erfolgreich gefunden!',
      });
    } else {
      console.log('[test-order-exists] Order nicht gefunden:', orderId);

      return NextResponse.json({
        success: false,
        orderExists: false,
        orderId: orderId,
        message: 'Order nicht in der orders Collection gefunden',
      });
    }
  } catch (error) {
    console.error('[test-order-exists] Fehler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
