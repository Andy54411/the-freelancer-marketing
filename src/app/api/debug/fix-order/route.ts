/**
 * Fix Order User ID API - One time fix
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const { orderId, correctUserId, updatePrice, priceInCents } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'orderId required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (correctUserId) {
      updateData.kundeId = correctUserId;
      updateData.customerFirebaseUid = correctUserId;
    }

    if (updatePrice && priceInCents) {
      updateData.jobCalculatedPriceInCents = priceInCents;
      updateData.totalPriceInCents = priceInCents;
      updateData.price = priceInCents / 100;
      updateData.totalAmount = priceInCents / 100;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No updates specified' }, { status: 400 });
    }

    // Update the order
    const orderRef = db.collection('auftraege').doc(orderId);
    await orderRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Order updated',
      orderId,
      updates: updateData,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
