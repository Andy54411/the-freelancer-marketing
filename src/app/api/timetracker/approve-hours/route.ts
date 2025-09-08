// /Users/andystaudinger/Tasko/src/app/api/timetracker/approve-hours/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/firebase/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Authentifizierung prüfen
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decodedToken.uid;

    // 2. Request Body parsen
    const { orderId, timeEntryIds, paymentMethod } = await request.json();

    if (!orderId || !timeEntryIds || !Array.isArray(timeEntryIds)) {
      return NextResponse.json(
        {
          error: 'Missing required fields: orderId, timeEntryIds',
        },
        { status: 400 }
      );
    }

    // 3. Auftrag und TimeTracking Daten laden
    const orderRef = db.collection('auftraege').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderSnap.data();

    // 4. Berechtigung prüfen - nur Kunde kann freigeben
    if (orderData?.customerFirebaseUid !== userId) {
      return NextResponse.json(
        {
          error: 'Only the customer can approve hours',
        },
        { status: 403 }
      );
    }

    // 5. TimeEntries validieren und berechnen
    const timeTracking = orderData?.timeTracking;
    if (!timeTracking?.timeEntries) {
      return NextResponse.json(
        {
          error: 'No time entries found',
        },
        { status: 404 }
      );
    }

    let totalHoursToApprove = 0;
    let totalAmountToPay = 0;
    const entriesToUpdate: any[] = [];

    for (const entryId of timeEntryIds) {
      const entry = timeTracking.timeEntries.find((e: any) => e.id === entryId);
      if (!entry) {
        return NextResponse.json(
          {
            error: `Time entry ${entryId} not found`,
          },
          { status: 404 }
        );
      }

      if (entry.status !== 'logged') {
        return NextResponse.json(
          {
            error: `Time entry ${entryId} is not in 'logged' status`,
          },
          { status: 400 }
        );
      }

      totalHoursToApprove += entry.hours;

      // Berechne Betrag für zusätzliche Stunden
      if (entry.category === 'additional') {
        const hourlyRate = timeTracking.hourlyRate || 3500; // Default 35€/h in Cents
        totalAmountToPay += entry.hours * hourlyRate;
      }

      entriesToUpdate.push({
        ...entry,
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: userId,
      });
    }

    // 6. Payment Intent für zusätzliche Stunden erstellen (falls nötig)
    const paymentIntentId = null;
    if (totalAmountToPay > 0) {
      // TODO: Implementiere Stripe Payment Intent Creation
      // Für jetzt simulieren wir es
      console.log(`💰 Payment Intent needed for €${totalAmountToPay / 100}`);
    }

    // 7. TimeEntries als approved markieren
    const updatedTimeEntries = timeTracking.timeEntries.map((entry: any) => {
      const updatedEntry = entriesToUpdate.find(e => e.id === entry.id);
      return updatedEntry || entry;
    });

    // 8. Firestore Update
    const updateData: any = {
      'timeTracking.timeEntries': updatedTimeEntries,
      'timeTracking.totalApprovedHours':
        (timeTracking.totalApprovedHours || 0) + totalHoursToApprove,
      'timeTracking.lastUpdated': new Date(),
    };

    if (paymentIntentId) {
      updateData['timeTracking.additionalPaymentIntentId'] = paymentIntentId;
    }

    await orderRef.update(updateData);

    // 9. Approval Request erstellen für Protokollierung
    const approvalData = {
      orderId,
      approvedBy: userId,
      approvedAt: new Date(),
      timeEntryIds,
      totalHours: totalHoursToApprove,
      totalAmount: totalAmountToPay,
      paymentIntentId,
      status: totalAmountToPay > 0 ? 'payment_required' : 'completed',
    };

    await db.collection('auftraege').doc(orderId).collection('approvalRequests').add(approvalData);

    return NextResponse.json({
      success: true,
      message: `${totalHoursToApprove}h successfully approved`,
      totalHours: totalHoursToApprove,
      totalAmount: totalAmountToPay,
      paymentRequired: totalAmountToPay > 0,
      paymentIntentId,
    });
  } catch (error) {
    console.error('❌ TimeTracker approval error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
