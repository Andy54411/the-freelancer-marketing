import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb } from '@/firebase/server';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

interface PayoutRequest {
  amount?: number; // Optional: specific amount, otherwise all available
  description?: string;
}

/**
 * POST: Company requests manual payout
 * Validates all completed orders and initiates bank transfer
 */
export async function POST(request: NextRequest, { params }: { params: { uid: string } }) {
  try {
    const { uid } = params;
    const body: PayoutRequest = await request.json();

    // 1. Prüfe alle abgeschlossenen Orders für diese Company
    const ordersRef = adminDb.collection('auftraege');
    const completedOrdersQuery = ordersRef
      .where('selectedAnbieterId', '==', uid)
      .where('status', '==', 'ABGESCHLOSSEN')
      .where('payoutStatus', '==', 'available_for_payout');

    const completedOrdersSnap = await completedOrdersQuery.get();

    if (completedOrdersSnap.empty) {
      return NextResponse.json(
        { error: 'No completed orders available for payout' },
        { status: 400 }
      );
    }

    // 2. Berechne verfügbaren Betrag
    let totalAvailableAmount = 0;
    const orderIds: string[] = [];

    completedOrdersSnap.forEach(doc => {
      const orderData = doc.data();
      const platformFee =
        orderData.sellerCommissionInCents || orderData.applicationFeeAmountFromStripe || 0;
      const netAmount = orderData.totalAmountPaidByBuyer - platformFee;

      // ✅ ZUSÄTZLICH: Additional Hours berücksichtigen
      const additionalHoursAmount = orderData.additionalHoursPayoutAmount || 0;

      totalAvailableAmount += netAmount + additionalHoursAmount;
      orderIds.push(doc.id);
    });

    // 3. Validiere Auszahlungsbetrag
    const payoutAmount = body.amount
      ? Math.min(body.amount * 100, totalAvailableAmount)
      : totalAvailableAmount;

    if (payoutAmount <= 0) {
      return NextResponse.json({ error: 'No valid amount available for payout' }, { status: 400 });
    }

    // 4. Hole Company Stripe Account Info aus users collection
    const companyRef = adminDb.collection('users').doc(uid);
    const companySnap = await companyRef.get();

    if (!companySnap.exists) {
      return NextResponse.json({ error: 'Company not found in users collection' }, { status: 404 });
    }

    const companyData = companySnap.data();
    const stripeAccountId = companyData?.stripeAccountId;

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: 'No Stripe account configured for this company' },
        { status: 400 }
      );
    }

    // 5. Erstelle Stripe Payout (Bank Transfer)
    let stripePayoutId: string | undefined;

    try {
      const payout = await stripe.payouts.create(
        {
          amount: payoutAmount,
          currency: 'eur',
          method: 'standard', // Bank transfer
          statement_descriptor: 'Taskilo Auszahlung',
          description:
            body.description || `Auszahlung für ${orderIds.length} abgeschlossene Aufträge`,
          metadata: {
            companyId: uid,
            orderIds: orderIds.join(','),
            orderCount: orderIds.length.toString(),
            requestedAt: new Date().toISOString(),
          },
        },
        {
          stripeAccount: stripeAccountId,
        }
      );

      stripePayoutId = payout.id;

    } catch (stripeError: any) {

      return NextResponse.json(
        {
          error: 'Payout failed',
          details: stripeError.message,
          code: stripeError.code,
        },
        { status: 400 }
      );
    }

    // 6. Update Order Status zu "payout_requested"
    const batch = adminDb.batch();

    completedOrdersSnap.forEach(doc => {
      batch.update(doc.ref, {
        payoutStatus: 'payout_requested',
        payoutRequestedAt: new Date(),
        stripePayoutId: stripePayoutId,
        updatedAt: new Date(),
      });
    });

    await batch.commit();

    // 7. Erstelle Payout-Log
    const payoutLogRef = adminDb.collection('payout_logs').doc();
    await payoutLogRef.set({
      companyId: uid,
      stripePayoutId: stripePayoutId,
      amount: payoutAmount,
      currency: 'EUR',
      orderIds: orderIds,
      orderCount: orderIds.length,
      requestedAt: new Date(),
      status: 'requested',
      method: 'bank_transfer',
      description: body.description || `Auszahlung für ${orderIds.length} abgeschlossene Aufträge`,
    });

    return NextResponse.json({
      success: true,
      message: 'Payout request processed successfully',
      payout: {
        id: stripePayoutId,
        amount: payoutAmount / 100,
        currency: 'EUR',
        orderCount: orderIds.length,
        estimatedArrival: '1-2 Werktage',
        status: 'requested',
        method: 'bank_transfer',
      },
    });
  } catch (error: any) {

    return NextResponse.json(
      { error: 'Failed to process payout request', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET: Get available payout amount for company
 */
export async function GET(request: NextRequest, { params }: { params: { uid: string } }) {
  try {
    const { uid } = params;

    // Hole alle abgeschlossenen Orders die zur Auszahlung bereit sind
    const ordersRef = adminDb.collection('auftraege');
    const availableOrdersQuery = ordersRef
      .where('selectedAnbieterId', '==', uid)
      .where('status', '==', 'ABGESCHLOSSEN')
      .where('payoutStatus', '==', 'available_for_payout');

    const availableOrdersSnap = await availableOrdersQuery.get();

    let totalAvailable = 0;
    const orders: any[] = [];

    availableOrdersSnap.forEach(doc => {
      const orderData = doc.data();
      const platformFee =
        orderData.sellerCommissionInCents || orderData.applicationFeeAmountFromStripe || 0;
      const netAmount = orderData.totalAmountPaidByBuyer - platformFee;

      // ✅ ZUSÄTZLICH: Additional Hours berücksichtigen
      const additionalHoursAmount = orderData.additionalHoursPayoutAmount || 0;
      const totalOrderAmount = netAmount + additionalHoursAmount;

      totalAvailable += totalOrderAmount;
      orders.push({
        id: doc.id,
        amount: totalOrderAmount / 100,
        baseAmount: netAmount / 100,
        additionalHoursAmount: additionalHoursAmount / 100,
        completedAt: orderData.completedAt,
        projectTitle: orderData.projectTitle || orderData.description,
      });
    });

    return NextResponse.json({
      availableAmount: totalAvailable / 100,
      currency: 'EUR',
      orderCount: orders.length,
      orders: orders,
    });
  } catch (error: any) {

    return NextResponse.json(
      { error: 'Failed to get available payout amount', details: error.message },
      { status: 500 }
    );
  }
}
