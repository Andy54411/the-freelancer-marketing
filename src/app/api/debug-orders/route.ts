import { NextResponse } from 'next/server';
import { db } from '../../../firebase/server';

export async function GET() {
  try {
    console.log('[debug-orders] Prüfe auftraege Collection...');

    const auftraegeSnapshot = await db.collection('auftraege').limit(10).get();
    const auftraege: any[] = [];
    auftraegeSnapshot.forEach(doc => {
      auftraege.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    console.log('[debug-orders] Prüfe orders Collection...');

    const ordersSnapshot = await db.collection('orders').limit(10).get();
    const orders: any[] = [];
    ordersSnapshot.forEach(doc => {
      orders.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return NextResponse.json({
      success: true,
      auftraege: {
        count: auftraege.length,
        data: auftraege,
      },
      orders: {
        count: orders.length,
        data: orders,
      },
    });
  } catch (error) {
    console.error('[debug-orders] Fehler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
