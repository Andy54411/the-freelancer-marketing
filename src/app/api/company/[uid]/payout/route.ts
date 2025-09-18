import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Admin approval utilities
const BLOCKED_ACTIONS = {
  PAYOUT_REQUEST: 'payout_request',
};

// Dynamic Firebase imports to prevent build-time issues
let db: any;

async function getFirebaseServices(companyId: string) {
  if (!db) {
    try {
      // DIRECT Firebase initialization without JSON imports
      const firebaseAdmin = await import('firebase-admin');

      // Check if app is already initialized
      let app;
      try {
        app = firebaseAdmin.app();
      } catch (appError) {
        if (
          process.env.FIREBASE_PROJECT_ID &&
          process.env.FIREBASE_PRIVATE_KEY &&
          process.env.FIREBASE_CLIENT_EMAIL
        ) {
          app = firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
          });
        } else if (process.env.FIREBASE_PROJECT_ID) {
          app = firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.applicationDefault(),
            projectId: process.env.FIREBASE_PROJECT_ID,
          });
        } else {
          throw new Error('No Firebase configuration found');
        }
      }

      db = firebaseAdmin.firestore(app);
    } catch (error) {
      throw error;
    }
  }
  return { db };
}

// Mock admin approval check for now
async function checkAdminApproval(uid: string) {
  return { isApproved: true };
}

function createApprovalErrorResponse(result: any) {
  return { error: 'Admin approval required' };
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

interface PayoutRequest {
  amount?: number; // Optional: specific amount, otherwise all available
  description?: string;
}

/**
 * POST: Company requests manual payout from held funds
 * Money is already in connected account as "held funds", just needs payout to bank
 */
export async function POST(request: NextRequest, { params }: { params: { uid: string } }) {
  try {
    const resolvedParams = await params;
    const { db: adminDb } = await getFirebaseServices(resolvedParams.uid);

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const { uid } = resolvedParams;
    const body: PayoutRequest = await request.json();

    // Check admin approval
    const approvalResult = await checkAdminApproval(uid);
    if (!approvalResult.isApproved) {
      return NextResponse.json(
        {
          ...createApprovalErrorResponse(approvalResult),
          blockedAction: BLOCKED_ACTIONS.PAYOUT_REQUEST,
        },
        { status: 403 }
      );
    }

    let totalAvailableAmount = 0;
    const orderIds: string[] = [];
    const quotePaymentIds: string[] = [];

    // 1. Find completed orders ready for payout
    const ordersRef = adminDb.collection('auftraege');
    const completedOrdersQuery = ordersRef
      .where('selectedAnbieterId', '==', uid)
      .where('status', '==', 'ABGESCHLOSSEN')
      .where('payoutStatus', '==', 'available_for_payout');

    const completedOrdersSnap = await completedOrdersQuery.get();

    completedOrdersSnap.forEach(doc => {
      const orderData = doc.data();
      const platformFee =
        orderData.sellerCommissionInCents || orderData.applicationFeeAmountFromStripe || 0;
      const netAmount = orderData.totalAmountPaidByBuyer - platformFee;

      // Include additional hours amount
      const additionalHoursAmount = orderData.additionalHoursPayoutAmount || 0;

      totalAvailableAmount += netAmount + additionalHoursAmount;
      orderIds.push(doc.id);
    });

    // 2. Find quote payments ready for payout
    const quotesRef = adminDb.collection('companies').doc(uid).collection('quotes');
    const quotesQuery = quotesRef.where('status', '==', 'contacts_exchanged');
    const quotesSnap = await quotesQuery.get();

    const quoteProvisionTransfers: Array<{
      quoteId: string;
      proposalId: string;
      provisionAmount: number;
      netAmount: number;
    }> = [];

    for (const quoteDoc of quotesSnap.docs) {
      const quoteData = quoteDoc.data();
      const proposalsRef = quoteDoc.ref.collection('proposals');
      const proposalsQuery = proposalsRef
        .where('providerId', '==', uid)
        .where('paymentComplete', '==', true);
      const proposalsSnap = await proposalsQuery.get();

      proposalsSnap.forEach(proposalDoc => {
        const proposalData = proposalDoc.data();

        if (
          proposalData.payoutStatus === 'payout_requested' ||
          proposalData.payoutStatus === 'completed'
        ) {
          return;
        }

        const totalAmount = proposalData.totalAmount || 0;
        const platformFeePercent = 0.05; // 5% Platform Fee
        const platformFeeAmount = Math.round(totalAmount * 100 * platformFeePercent);
        const netAmount = totalAmount * 100 - platformFeeAmount;

        if (netAmount > 0) {
          totalAvailableAmount += netAmount;
          quotePaymentIds.push(`quote_${quoteDoc.id}`);

          quoteProvisionTransfers.push({
            quoteId: quoteDoc.id,
            proposalId: proposalDoc.id,
            provisionAmount: platformFeeAmount,
            netAmount: netAmount,
          });
        }
      });
    }

    if (totalAvailableAmount <= 0) {
      return NextResponse.json(
        { error: 'No completed orders or quote payments available for payout' },
        { status: 400 }
      );
    }

    // 3. Validate payout amount
    const payoutAmount = body.amount
      ? Math.min(body.amount * 100, totalAvailableAmount)
      : totalAvailableAmount;

    if (payoutAmount <= 0) {
      return NextResponse.json({ error: 'No valid amount available for payout' }, { status: 400 });
    }

    // 4. Get company Stripe account info
    const companyRef = adminDb.collection('companies').doc(uid);
    const companySnap = await companyRef.get();

    if (!companySnap.exists) {
      return NextResponse.json(
        { error: 'Company not found in companies collection' },
        { status: 404 }
      );
    }

    const companyData = companySnap.data();
    const stripeAccountId = companyData?.stripeAccountId;

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: 'No Stripe account configured for this company' },
        { status: 400 }
      );
    }

    // 5. Create Stripe Payout from held funds in connected account
    // Note: Money is already in connected account as "held funds" from original payment
    let stripePayoutId: string | undefined;

    try {
      const payout = await stripe.payouts.create(
        {
          amount: payoutAmount,
          currency: 'eur',
          method: 'standard',
          statement_descriptor: 'Taskilo Auszahlung',
          description:
            body.description ||
            `Auszahlung für ${orderIds.length} Aufträge und ${quotePaymentIds.length} Quote Payments`,
          metadata: {
            companyId: uid,
            orderIds: orderIds.join(','),
            quotePaymentIds: quotePaymentIds.join(','),
            totalOrders: orderIds.length.toString(),
            totalQuotePayments: quotePaymentIds.length.toString(),
            requestedAt: new Date().toISOString(),
            releaseType: 'held_funds_release',
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

    // 6. Update order status to "payout_requested"
    const batch = adminDb.batch();

    completedOrdersSnap.forEach(doc => {
      batch.update(doc.ref, {
        payoutStatus: 'payout_requested',
        payoutRequestedAt: new Date(),
        stripePayoutId: stripePayoutId,
        updatedAt: new Date(),
      });
    });

    // Update quote proposals
    for (const transfer of quoteProvisionTransfers) {
      const quoteRef = adminDb
        .collection('companies')
        .doc(uid)
        .collection('quotes')
        .doc(transfer.quoteId);
      const proposalRef = quoteRef.collection('proposals').doc(transfer.proposalId);

      batch.update(proposalRef, {
        payoutStatus: 'payout_requested',
        payoutRequestedAt: new Date(),
        stripePayoutId: stripePayoutId,
        updatedAt: new Date(),
      });
    }

    await batch.commit();

    // 7. Create payout log
    const totalProvisionAmount = quoteProvisionTransfers.reduce(
      (sum, transfer) => sum + transfer.provisionAmount,
      0
    );

    const payoutLogRef = adminDb.collection('payout_logs').doc();
    await payoutLogRef.set({
      companyId: uid,
      stripePayoutId: stripePayoutId,
      amount: payoutAmount,
      currency: 'EUR',
      orderIds: orderIds,
      quotePaymentIds: quotePaymentIds,
      orderCount: orderIds.length,
      quotePaymentCount: quotePaymentIds.length,
      totalProvisionAmount: totalProvisionAmount,
      provisionTransfers: quoteProvisionTransfers,
      requestedAt: new Date(),
      status: 'requested',
      method: 'bank_transfer',
      releaseType: 'held_funds_release',
      description:
        body.description ||
        `Auszahlung für ${orderIds.length} Aufträge und ${quotePaymentIds.length} Quote Payments`,
    });

    return NextResponse.json({
      success: true,
      message: 'Payout request processed successfully - held funds released',
      payout: {
        id: stripePayoutId,
        amount: payoutAmount / 100,
        currency: 'EUR',
        orderCount: orderIds.length,
        quotePaymentCount: quotePaymentIds.length,
        totalProvisionTransferred: totalProvisionAmount / 100,
        estimatedArrival: '1-2 Werktage',
        status: 'requested',
        method: 'bank_transfer',
        releaseType: 'held_funds_release',
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
 * Shows database calculations + Stripe balance
 */
export async function GET(request: NextRequest, { params }: { params: { uid: string } }) {
  try {
    const resolvedParams = await params;
    const { db: adminDb } = await getFirebaseServices(resolvedParams.uid);

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const { uid } = resolvedParams;

    // 1. Get company Stripe account info
    const companyRef = adminDb.collection('companies').doc(uid);
    const companySnap = await companyRef.get();

    if (!companySnap.exists) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const companyData = companySnap.data();
    const stripeAccountId = companyData?.stripeAccountId;

    if (!stripeAccountId) {
      return NextResponse.json({ error: 'No Stripe account configured' }, { status: 400 });
    }

    // 2. Calculate database amounts (what should be available)
    let databaseAvailableAmount = 0;
    const orders: any[] = [];

    // Regular orders
    const ordersRef = adminDb.collection('auftraege');
    const completedOrdersQuery = ordersRef
      .where('selectedAnbieterId', '==', uid)
      .where('status', '==', 'ABGESCHLOSSEN')
      .where('payoutStatus', '==', 'available_for_payout')
      .limit(10);

    const completedOrdersSnap = await completedOrdersQuery.get();

    completedOrdersSnap.forEach(doc => {
      const orderData = doc.data();
      const platformFee =
        orderData.sellerCommissionInCents || orderData.applicationFeeAmountFromStripe || 0;
      const netAmount = orderData.totalAmountPaidByBuyer - platformFee;
      const additionalHoursAmount = orderData.additionalHoursPayoutAmount || 0;
      const totalAmount = netAmount + additionalHoursAmount;

      databaseAvailableAmount += totalAmount;

      orders.push({
        id: doc.id,
        type: 'regular_order',
        amount: totalAmount / 100,
        completedAt: orderData.completedAt,
        projectTitle: orderData.projectTitle || orderData.description,
        status: orderData.payoutStatus || 'completed',
      });
    });

    // 3. Get Stripe balance for comparison
    let stripeBalance;
    try {
      stripeBalance = await stripe.balance.retrieve({
        stripeAccount: stripeAccountId,
      });
    } catch (stripeError: any) {
      return NextResponse.json(
        { error: 'Failed to get Stripe balance', details: stripeError.message },
        { status: 500 }
      );
    }

    const availableBalanceEur = stripeBalance.available.find(balance => balance.currency === 'eur');
    const pendingBalanceEur = stripeBalance.pending.find(balance => balance.currency === 'eur');

    const stripeAvailableAmount = availableBalanceEur ? availableBalanceEur.amount / 100 : 0;
    const stripePendingAmount = pendingBalanceEur ? pendingBalanceEur.amount / 100 : 0;

    return NextResponse.json({
      // Database calculations (what should be available based on completed orders)
      databaseAvailableAmount: databaseAvailableAmount / 100,
      orderCount: completedOrdersSnap.size,
      orders: orders,

      // Actual Stripe balance (may be different due to held funds, etc.)
      stripeBalance: {
        available: stripeAvailableAmount,
        pending: stripePendingAmount,
        lastUpdated: new Date().toISOString(),
      },

      // Display the database amount as primary (held funds scenario)
      availableAmount: databaseAvailableAmount / 100, // Show database calculation
      pendingAmount: stripePendingAmount,
      currency: 'EUR',

      breakdown: {
        message: 'Available amount based on completed orders (held funds release system)',
        note: 'Money is held in Stripe Connect account until both parties confirm completion',
        databaseCalculation: databaseAvailableAmount / 100,
        stripeAvailable: stripeAvailableAmount,
        difference: databaseAvailableAmount / 100 - stripeAvailableAmount,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get available payout amount', details: error.message },
      { status: 500 }
    );
  }
}
