// src/app/api/fix-payment-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/firebase/server';

export async function POST(req: NextRequest) {
  try {
    const { paymentIntentId, orderId } = await req.json();

    if (!paymentIntentId || !orderId) {
      return NextResponse.json({ error: 'paymentIntentId and orderId required' }, { status: 400 });
    }

    console.log(`[FIX PAYMENT] Processing payment ${paymentIntentId} for order ${orderId}`);

    // Get the order
    const orderRef = db.collection('auftraege').doc(orderId);
    const orderSnapshot = await orderRef.get();

    if (!orderSnapshot.exists) {
      return NextResponse.json({ error: `Order ${orderId} not found` }, { status: 404 });
    }

    const orderData = orderSnapshot.data()!;
    const timeEntriesRef = orderRef.collection('timeEntries');

    // Find all time entries with this payment intent that are still billing_pending
    const timeEntriesSnapshot = await timeEntriesRef
      .where('paymentIntentId', '==', paymentIntentId)
      .where('status', '==', 'billing_pending')
      .get();

    if (timeEntriesSnapshot.empty) {
      return NextResponse.json({
        message: 'No time entries found to fix',
        paymentIntentId,
        orderId,
      });
    }

    const updates: Array<{ id: string; oldStatus: any; newStatus: string }> = [];
    const entryIds: string[] = [];

    // Batch update all time entries
    const batch = db.batch();

    timeEntriesSnapshot.forEach(doc => {
      const entryRef = doc.ref;
      entryIds.push(doc.id);

      batch.update(entryRef, {
        status: 'transferred',
        billingStatus: 'transferred',
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        fixedAt: admin.firestore.FieldValue.serverTimestamp(),
        fixedBy: 'automatic_correction',
      });

      updates.push({
        id: doc.id,
        oldStatus: doc.data().status,
        newStatus: 'transferred',
      });
    });

    // Update timeTracking status
    const timeTrackingData = orderData.timeTracking || {};
    if (timeTrackingData.status === 'billing_pending') {
      batch.update(orderRef, {
        'timeTracking.status': 'transferred',
        'timeTracking.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
        'timeTracking.fixedAt': admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Execute batch
    await batch.commit();

    console.log(`[FIX PAYMENT] Updated ${updates.length} time entries to transferred`);

    return NextResponse.json({
      success: true,
      message: `Fixed ${updates.length} time entries`,
      paymentIntentId,
      orderId,
      updatedEntries: updates,
      entryIds: entryIds,
    });
  } catch (error: unknown) {
    console.error('[FIX PAYMENT ERROR]', error);
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('orderId');
  const paymentIntentId = searchParams.get('paymentIntentId');

  if (!orderId) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 });
  }

  try {
    const orderRef = db.collection('auftraege').doc(orderId);
    const timeEntriesSnapshot = await orderRef.collection('timeEntries').get();

    const entries = timeEntriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<{ id: string; status?: string; paymentIntentId?: string; [key: string]: any }>;

    const pendingEntries = entries.filter(
      e =>
        e.status === 'billing_pending' &&
        (!paymentIntentId || e.paymentIntentId === paymentIntentId)
    );

    return NextResponse.json({
      orderId,
      totalEntries: entries.length,
      pendingEntries: pendingEntries.length,
      entries: pendingEntries,
    });
  } catch (error: unknown) {
    console.error('[FIX PAYMENT CHECK ERROR]', error);
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
