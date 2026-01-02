/**
 * Debug API to check orders in Firestore
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'bBQ4WUMQ4LX29mSxnGQmEWstnrI1';

    if (!db) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    // Get all recent auftraege
    const allOrdersSnap = await db.collection('auftraege').limit(10).get();
    const allOrders = allOrdersSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        kundeId: data.kundeId,
        customerFirebaseUid: data.customerFirebaseUid,
        status: data.status,
        unterkategorie: data.unterkategorie,
        selectedSubcategory: data.selectedSubcategory,
        // Preis-Felder
        totalAmountPaidByBuyer: data.totalAmountPaidByBuyer,
        totalPriceInCents: data.totalPriceInCents,
        jobCalculatedPriceInCents: data.jobCalculatedPriceInCents,
        price: data.price,
        totalAmount: data.totalAmount,
        preis: data.preis,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        paidAt: data.paidAt?.toDate?.() || data.paidAt,
      };
    });

    // Get orders for specific user
    const userOrders1Snap = await db.collection('auftraege')
      .where('kundeId', '==', userId)
      .get();
    const userOrders2Snap = await db.collection('auftraege')
      .where('customerFirebaseUid', '==', userId)
      .get();

    const userOrders = [...userOrders1Snap.docs, ...userOrders2Snap.docs].map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      paidAt: doc.data().paidAt?.toDate?.() || doc.data().paidAt,
    }));

    // Remove duplicates
    const uniqueUserOrders = Array.from(
      new Map(userOrders.map(o => [o.id, o])).values()
    );

    return NextResponse.json({
      success: true,
      userId,
      totalOrdersInDb: allOrdersSnap.size,
      allOrders,
      userOrdersCount: uniqueUserOrders.length,
      userOrders: uniqueUserOrders,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
