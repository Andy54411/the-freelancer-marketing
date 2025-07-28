// src/app/api/fix-time-tracking-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'orderId required' }, { status: 400 });
    }

    console.log(`[FIX-TIME-TRACKING] Fixing status for order ${orderId}`);

    const orderRef = db.collection('auftraege').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderDoc.data()!;
    const timeTracking = orderData.timeTracking;

    if (!timeTracking) {
      return NextResponse.json({ error: 'No timeTracking found' }, { status: 404 });
    }

    // Check if billingData.status is completed
    const billingCompleted = timeTracking.billingData?.status === 'completed';

    // Check if all additional timeEntries are transferred
    const timeEntries = timeTracking.timeEntries || [];
    const additionalEntries = timeEntries.filter((entry: any) => entry.category === 'additional');
    const allAdditionalTransferred =
      additionalEntries.length === 0 ||
      additionalEntries.every((entry: any) => entry.status === 'transferred');

    console.log(`[FIX-TIME-TRACKING] Order ${orderId} analysis:`, {
      currentStatus: timeTracking.status,
      billingCompleted,
      totalEntries: timeEntries.length,
      additionalEntries: additionalEntries.length,
      allAdditionalTransferred,
    });

    // If billing is completed and all additional entries are transferred, update main status
    if (billingCompleted && allAdditionalTransferred && timeTracking.status !== 'completed') {
      await orderRef.update({
        'timeTracking.status': 'completed',
        'timeTracking.lastUpdated': new Date(),
        lastUpdated: new Date(),
      });

      console.log(
        `[FIX-TIME-TRACKING] Successfully updated status to 'completed' for order ${orderId}`
      );

      return NextResponse.json({
        success: true,
        message: `Order ${orderId} timeTracking status updated to 'completed'`,
        previousStatus: timeTracking.status,
        newStatus: 'completed',
        billingCompleted,
        allAdditionalTransferred,
      });
    }

    return NextResponse.json({
      success: false,
      message: 'No status update needed',
      currentStatus: timeTracking.status,
      billingCompleted,
      allAdditionalTransferred,
      reason: !billingCompleted
        ? 'Billing not completed'
        : !allAdditionalTransferred
          ? 'Not all additional entries transferred'
          : 'Status already correct',
    });
  } catch (error) {
    console.error('[FIX-TIME-TRACKING ERROR]', error);
    return NextResponse.json(
      {
        error: 'Failed to fix time tracking status',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
