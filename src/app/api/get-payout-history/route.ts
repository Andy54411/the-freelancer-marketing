import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin
let db: any = null;

try {
  if (!getApps().length) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    let projectId = process.env.FIREBASE_PROJECT_ID;

    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);

      if (!projectId && serviceAccount.project_id) {
        projectId = serviceAccount.project_id;
      }

      if (serviceAccount.project_id && projectId) {
        initializeApp({
          credential: cert(serviceAccount),
          projectId: projectId,
        });
        db = getFirestore();
        console.log('[API /get-payout-history] Firebase Admin initialized successfully');
      }
    }
  } else {
    db = getFirestore();
  }
} catch (error) {
  console.error('[API /get-payout-history] Firebase Admin initialization failed:', error);
}

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret
  ? new Stripe(stripeSecret, {
      apiVersion: '2024-06-20',
    })
  : null;

export async function POST(request: NextRequest) {
  console.log('[API /get-payout-history] POST request received');

  if (!stripe) {
    console.error('[API /get-payout-history] Stripe not initialized');
    return NextResponse.json({ error: 'Stripe-Konfiguration fehlt.' }, { status: 500 });
  }

  if (!db) {
    console.error('[API /get-payout-history] Firebase not initialized');
    return NextResponse.json({ error: 'Firebase-Konfiguration fehlt.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { firebaseUserId } = body;

    if (!firebaseUserId || typeof firebaseUserId !== 'string') {
      return NextResponse.json({ error: 'Ungültige Benutzer-ID.' }, { status: 400 });
    }

    // Get Stripe Account ID from Firestore
    let stripeAccountId = null;

    // Try users collection first
    const userDoc = await db.collection('users').doc(firebaseUserId).get();
    if (userDoc.exists) {
      stripeAccountId = userDoc.data()?.stripeAccountId;
    }

    // Fallback to companies collection
    if (!stripeAccountId) {
      const companyDoc = await db.collection('companies').doc(firebaseUserId).get();
      if (companyDoc.exists) {
        stripeAccountId = companyDoc.data()?.stripeAccountId;
      }
    }

    if (!stripeAccountId || !stripeAccountId.startsWith('acct_')) {
      console.error('[API /get-payout-history] No valid Stripe account found');
      return NextResponse.json({ error: 'Kein gültiges Stripe-Konto gefunden.' }, { status: 404 });
    }

    console.log('[API /get-payout-history] Fetching payouts for account:', stripeAccountId);

    // Fetch payouts from Stripe
    const payouts = await stripe.payouts.list(
      {
        limit: 100, // Get last 100 payouts
      },
      {
        stripeAccount: stripeAccountId,
      }
    );

    console.log('[API /get-payout-history] Found payouts:', payouts.data.length);

    // Calculate summary
    const summary = {
      totalPayouts: payouts.data.length,
      totalAmount: payouts.data.reduce((sum, payout) => sum + payout.amount, 0),
      pendingAmount: payouts.data
        .filter(payout => payout.status === 'pending' || payout.status === 'in_transit')
        .reduce((sum, payout) => sum + payout.amount, 0),
      lastPayout: payouts.data.length > 0 ? payouts.data[0] : null,
    };

    return NextResponse.json({
      payouts: payouts.data,
      summary: summary,
      success: true,
    });
  } catch (error) {
    console.error('[API /get-payout-history] Error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        {
          error: `Stripe Fehler: ${error.message}`,
          code: error.code,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Fehler beim Laden der Auszahlungshistorie',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
