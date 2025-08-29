import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Dynamic Firebase imports to prevent build-time issues
let db: any;

async function getFirebaseServices() {
  if (!db) {
    try {
      console.log('Initializing Firebase for Payout API - NO JSON FILES...');

      // DIRECT Firebase initialization without JSON imports
      const firebaseAdmin = await import('firebase-admin');

      // Check if app is already initialized
      let app;
      try {
        app = firebaseAdmin.app();
        console.log('Using existing Firebase app');
      } catch (appError) {
        console.log('Initializing new Firebase app for Payout...');

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
          console.log('Initialized with service account credentials');
        } else if (process.env.FIREBASE_PROJECT_ID) {
          app = firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.applicationDefault(),
            projectId: process.env.FIREBASE_PROJECT_ID,
          });
          console.log('Initialized with application default credentials');
        } else {
          throw new Error('No Firebase configuration available');
        }
      }

      db = firebaseAdmin.firestore();
      console.log('Firebase Firestore initialized successfully for Payout API');
      return { db };
    } catch (error: any) {
      console.error('Firebase initialization failed:', error);
      throw error;
    }
  }
  return { db };
}

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
    // Fix Next.js warning
    const resolvedParams = await params;

    // Use improved Firebase initialization
    const { db: adminDb } = await getFirebaseServices();

    // Check if Firebase is properly initialized
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const { uid } = resolvedParams;
    const body: PayoutRequest = await request.json();

    let totalAvailableAmount = 0;
    const orderIds: string[] = [];
    const quotePaymentIds: string[] = [];

    // 1. NORMALE AUFTRÄGE: Prüfe alle abgeschlossenen Orders für diese Company
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

      // ✅ ZUSÄTZLICH: Additional Hours berücksichtigen
      const additionalHoursAmount = orderData.additionalHoursPayoutAmount || 0;

      totalAvailableAmount += netAmount + additionalHoursAmount;
      orderIds.push(doc.id);
    });

    // 2. QUOTE PAYMENTS: Suche nach Quote Payments die auszahlungsbereit sind
    const quotesRef = adminDb.collection('quotes');
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

      // Prüfe ob Quote Proposals hat
      const proposalsRef = quoteDoc.ref.collection('proposals');
      const proposalsQuery = proposalsRef
        .where('providerId', '==', uid)
        .where('paymentComplete', '==', true);
      const proposalsSnap = await proposalsQuery.get();

      proposalsSnap.forEach(proposalDoc => {
        const proposalData = proposalDoc.data();

        // Prüfe ob bereits ausgezahlt wurde
        if (
          proposalData.payoutStatus === 'payout_requested' ||
          proposalData.payoutStatus === 'completed'
        ) {
          return;
        }

        // Berechne Auszahlungsbetrag und Provision (wie bei regulären Aufträgen)
        const totalAmount = proposalData.totalAmount || 0;
        const platformFeePercent = 0.05; // 5% Platform Fee
        const platformFeeAmount = Math.round(totalAmount * 100 * platformFeePercent);
        const netAmount = totalAmount * 100 - platformFeeAmount;

        if (netAmount > 0) {
          totalAvailableAmount += netAmount;
          quotePaymentIds.push(`quote_${quoteDoc.id}`);

          // Merke die Provision für spätere Übertragung auf Hauptkonto
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

    // 3. Validiere Auszahlungsbetrag
    const payoutAmount = body.amount
      ? Math.min(body.amount * 100, totalAvailableAmount)
      : totalAvailableAmount;

    if (payoutAmount <= 0) {
      return NextResponse.json({ error: 'No valid amount available for payout' }, { status: 400 });
    }

    // 4. Hole Company Stripe Account Info aus companies collection
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
            body.description ||
            `Auszahlung für ${orderIds.length} Aufträge und ${quotePaymentIds.length} Quote Payments`,
          metadata: {
            companyId: uid,
            orderIds: orderIds.join(','),
            quotePaymentIds: quotePaymentIds.join(','),
            totalOrders: orderIds.length.toString(),
            totalQuotePayments: quotePaymentIds.length.toString(),
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

    // 6. Update Order Status zu "payout_requested" + Quote Proposals
    const batch = adminDb.batch();

    // Reguläre Aufträge
    completedOrdersSnap.forEach(doc => {
      batch.update(doc.ref, {
        payoutStatus: 'payout_requested',
        payoutRequestedAt: new Date(),
        stripePayoutId: stripePayoutId,
        updatedAt: new Date(),
      });
    });

    // Quote Proposals Status Update + Provision Transfer
    for (const transfer of quoteProvisionTransfers) {
      const quoteRef = adminDb.collection('quotes').doc(transfer.quoteId);
      const proposalRef = quoteRef.collection('proposals').doc(transfer.proposalId);

      // Update Proposal Status
      batch.update(proposalRef, {
        payoutStatus: 'payout_requested',
        payoutRequestedAt: new Date(),
        stripePayoutId: stripePayoutId,
        updatedAt: new Date(),
      });

      // 🏦 PROVISION TRANSFER: Übertrage Platform Fee auf Hauptkonto
      try {
        const platformAccountId = process.env.STRIPE_PLATFORM_ACCOUNT_ID || 'acct_main_platform';

        await stripe.transfers.create({
          amount: transfer.provisionAmount,
          currency: 'eur',
          destination: platformAccountId,
          description: `Platform Fee für Quote ${transfer.quoteId}`,
          metadata: {
            quoteId: transfer.quoteId,
            proposalId: transfer.proposalId,
            companyId: uid,
            type: 'platform_fee_quote',
          },
        });

        console.log(
          `✅ Provision übertragen für Quote ${transfer.quoteId}: €${transfer.provisionAmount / 100}`
        );
      } catch (transferError: any) {
        console.error(
          `❌ Provision Transfer Fehler für Quote ${transfer.quoteId}:`,
          transferError.message
        );
      }
    }

    await batch.commit();

    // 7. Erstelle umfassendes Payout-Log
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
      description:
        body.description ||
        `Auszahlung für ${orderIds.length} Aufträge und ${quotePaymentIds.length} Quote Payments`,
    });

    return NextResponse.json({
      success: true,
      message: 'Payout request processed successfully',
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
 * GET: Get available payout amount for company from Stripe Balance
 */
export async function GET(request: NextRequest, { params }: { params: { uid: string } }) {
  try {
    // Fix Next.js warning
    const resolvedParams = await params;
    console.log('🔍 Payout GET: Starting for uid:', resolvedParams?.uid);

    // Use improved Firebase initialization
    const { db: adminDb } = await getFirebaseServices();
    console.log('🔍 Payout GET: Firebase services obtained, db available:', !!adminDb);

    // Check if Firebase is properly initialized
    if (!adminDb) {
      console.log('❌ Payout GET: Firebase not available');
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const { uid } = resolvedParams;
    console.log('🔍 Payout GET: Processing for uid:', uid);

    // 1. Hole Company Stripe Account Info
    console.log('🔍 Payout GET: Fetching company data...');
    const companyRef = adminDb.collection('companies').doc(uid);
    const companySnap = await companyRef.get();
    console.log('🔍 Payout GET: Company exists:', companySnap.exists);

    if (!companySnap.exists) {
      console.log('❌ Payout GET: Company not found');
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const companyData = companySnap.data();
    const stripeAccountId = companyData?.stripeAccountId;
    console.log('🔍 Payout GET: Stripe Account ID:', stripeAccountId);

    if (!stripeAccountId) {
      console.log('❌ Payout GET: No Stripe account configured');
      return NextResponse.json({ error: 'No Stripe account configured' }, { status: 400 });
    }

    // 2. Hole tatsächliches Stripe Balance
    let stripeBalance;
    try {
      stripeBalance = await stripe.balance.retrieve({
        stripeAccount: stripeAccountId,
      });
    } catch (stripeError: any) {
      console.error('Stripe Balance Error:', stripeError);
      return NextResponse.json(
        { error: 'Failed to get Stripe balance', details: stripeError.message },
        { status: 500 }
      );
    }

    // 3. Extrahiere verfügbares Guthaben (EUR)
    const availableBalanceEur = stripeBalance.available.find(balance => balance.currency === 'eur');
    const pendingBalanceEur = stripeBalance.pending.find(balance => balance.currency === 'eur');

    const availableAmount = availableBalanceEur ? availableBalanceEur.amount / 100 : 0;
    const pendingAmount = pendingBalanceEur ? pendingBalanceEur.amount / 100 : 0;

    // 4. Hole trotzdem abgeschlossene Aufträge für die Liste (informativ)
    const orders: any[] = [];
    let orderCount = 0;

    // Normale Aufträge für Info
    try {
      const ordersRef = adminDb.collection('auftraege');
      const completedOrdersQuery = ordersRef
        .where('selectedAnbieterId', '==', uid)
        .where('status', '==', 'ABGESCHLOSSEN')
        .limit(10); // Nur die letzten 10 für Display

      const completedOrdersSnap = await completedOrdersQuery.get();
      orderCount += completedOrdersSnap.size;

      completedOrdersSnap.forEach(doc => {
        const orderData = doc.data();
        const platformFee =
          orderData.sellerCommissionInCents || orderData.applicationFeeAmountFromStripe || 0;
        const netAmount = orderData.totalAmountPaidByBuyer - platformFee;

        orders.push({
          id: doc.id,
          type: 'regular_order',
          amount: netAmount / 100,
          completedAt: orderData.completedAt,
          projectTitle: orderData.projectTitle || orderData.description,
          status: orderData.payoutStatus || 'completed',
        });
      });
    } catch (error) {
      console.log('Error fetching orders for display:', error);
    }

    // Quote Payments für Info
    try {
      const quotesRef = adminDb.collection('quotes');
      const quotesQuery = quotesRef.where('status', '==', 'contacts_exchanged').limit(5);
      const quotesSnap = await quotesQuery.get();

      for (const quoteDoc of quotesSnap.docs) {
        const quoteData = quoteDoc.data();

        const proposalsRef = quoteDoc.ref.collection('proposals');
        const proposalsQuery = proposalsRef
          .where('providerId', '==', uid)
          .where('paymentComplete', '==', true);
        const proposalsSnap = await proposalsQuery.get();

        proposalsSnap.forEach(proposalDoc => {
          const proposalData = proposalDoc.data();
          const totalAmount = proposalData.totalAmount || 0;
          const platformFeePercent = 0.05;
          const netAmount = totalAmount * (1 - platformFeePercent);

          orders.push({
            id: `quote_${quoteDoc.id}`,
            type: 'quote_payment',
            quoteId: quoteDoc.id,
            proposalId: proposalDoc.id,
            amount: netAmount,
            completedAt: proposalData.contactExchangeAt || proposalData.acceptedAt,
            projectTitle: quoteData.title || 'Quote Payment',
            status: proposalData.payoutStatus || 'completed',
          });
        });
      }
    } catch (error) {
      console.log('Error fetching quotes for display:', error);
    }

    return NextResponse.json({
      availableAmount: availableAmount, // Tatsächliches Stripe-Guthaben
      pendingAmount: pendingAmount,
      currency: 'EUR',
      orderCount: orderCount,
      orders: orders.slice(0, 10), // Nur die letzten 10 anzeigen
      stripeBalance: {
        available: availableAmount,
        pending: pendingAmount,
        lastUpdated: new Date().toISOString(),
      },
      breakdown: {
        message: 'Amounts based on actual Stripe balance, not database calculations',
        regularOrders: orders.filter(o => o.type === 'regular_order').length,
        quotePayments: orders.filter(o => o.type === 'quote_payment').length,
      },
    });
  } catch (error: any) {
    console.error('❌ Payout GET Error:', error);
    console.error('❌ Payout GET Stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to get available payout amount', details: error.message },
      { status: 500 }
    );
  }
}
