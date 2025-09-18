import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ error: 'Firebase not available' }, { status: 500 });
    }

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
    }

    // Update order to make it available for payout
    await db!.collection('auftraege').doc(orderId).update({
      status: 'ABGESCHLOSSEN',
      payoutStatus: 'available_for_payout',
      completedAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `Order ${orderId} updated to ABGESCHLOSSEN with payoutStatus: available_for_payout`,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to update order',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
