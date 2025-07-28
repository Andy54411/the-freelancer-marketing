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

    // Check if billingData.status is completed OR payment_received (for old payments without transfer events)
    const billingCompleted =
      timeTracking.billingData?.status === 'completed' ||
      timeTracking.billingData?.status === 'payment_received';

    // Check if all additional timeEntries are transferred
    const timeEntries = timeTracking.timeEntries || [];
    const additionalEntries = timeEntries.filter((entry: any) => entry.category === 'additional');
    const allAdditionalTransferred =
      additionalEntries.length === 0 ||
      additionalEntries.every((entry: any) => entry.status === 'transferred');

    console.log(`[FIX-TIME-TRACKING] Order ${orderId} analysis:`, {
      currentStatus: timeTracking.status,
      billingDataStatus: timeTracking.billingData?.status,
      billingCompleted,
      totalEntries: timeEntries.length,
      additionalEntries: additionalEntries.length,
      allAdditionalTransferred,
      billingData: timeTracking.billingData,
    });

    // If billing is completed/payment_received and all additional entries are transferred, update main status
    if (billingCompleted && allAdditionalTransferred && timeTracking.status !== 'completed') {
      // Also update billingData to completed if it was payment_received
      const updateData: any = {
        'timeTracking.status': 'completed',
        'timeTracking.lastUpdated': new Date(),
        lastUpdated: new Date(),
      };

      if (timeTracking.billingData?.status === 'payment_received') {
        updateData['timeTracking.billingData.status'] = 'completed';
        updateData['timeTracking.billingData.completedAt'] = new Date();
      }

      await orderRef.update(updateData);

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
        billingUpdated: timeTracking.billingData?.status === 'payment_received',
      });
    }

    return NextResponse.json({
      success: false,
      message: 'No status update needed',
      currentStatus: timeTracking.status,
      billingCompleted,
      allAdditionalTransferred,
      reason: !billingCompleted
        ? 'Billing not completed and not payment_received'
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
