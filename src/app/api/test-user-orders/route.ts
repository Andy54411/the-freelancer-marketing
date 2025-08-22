import { NextResponse } from 'next/server';
import { db } from '../../../firebase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId ist erforderlich',
        },
        { status: 400 }
      );
    }

    console.log('[test-user-orders] Suche nach Orders für User:', userId);

    // Suche in auftraege Collection nach kundeId
    const ordersSnapshot = await db.collection('auftraege').where('kundeId', '==', userId).get();

    const orders: any[] = [];
    ordersSnapshot.forEach(doc => {
      orders.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    console.log('[test-user-orders] Gefunden:', orders.length, 'Orders');

    return NextResponse.json({
      success: true,
      userId: userId,
      ordersCount: orders.length,
      orders: orders,
      message: `${orders.length} Orders für User ${userId} gefunden`,
    });
  } catch (error) {
    console.error('[test-user-orders] Fehler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
