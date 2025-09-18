import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';

// Dynamic Firebase imports to prevent build-time issues
let db: any;

async function getFirebaseServices() {
  if (!db) {
    try {
      // Try existing server config first
      try {
        const firebaseServer = await import('@/firebase/server');
        db = firebaseServer.db;
        if (db) {
          return { db };
        }
      } catch (importError) {}

      // Fallback to direct initialization
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
          throw new Error('No Firebase configuration available');
        }
      }

      db = firebaseAdmin.firestore();

      return { db };
    } catch (error: any) {
      throw error;
    }
  }
  return { db };
}

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret
  ? new Stripe(stripeSecret, {
      apiVersion: '2024-06-20',
    })
  : null;

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe-Konfiguration fehlt.' }, { status: 500 });
  }

  try {
    // Use improved Firebase initialization
    const { db } = await getFirebaseServices();

    // Check if Firebase is properly initialized
    if (!db) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const body = await request.json();
    const { firebaseUserId } = body;

    if (!firebaseUserId || typeof firebaseUserId !== 'string') {
      return NextResponse.json({ error: 'Ungültige Benutzer-ID.' }, { status: 400 });
    }

    // Get Stripe Account ID from Firestore - try COMPANIES collection first
    let stripeAccountId: string | null = null;

    const companyDoc = await db!.collection('companies').doc(firebaseUserId).get();
    if (companyDoc.exists) {
      stripeAccountId = (companyDoc.data() as any)?.stripeAccountId;
    }

    // Fallback: Try users collection
    if (!stripeAccountId) {
      const userDoc = await db!.collection('users').doc(firebaseUserId).get();
      if (userDoc.exists) {
        stripeAccountId = (userDoc.data() as any)?.stripeAccountId;
      }
    }

    if (!stripeAccountId || !stripeAccountId.startsWith('acct_')) {
      return NextResponse.json({ error: 'Kein gültiges Stripe-Konto gefunden.' }, { status: 404 });
    }

    // Fetch payouts from Stripe
    const payouts = await stripe.payouts.list(
      {
        limit: 100, // Get last 100 payouts
      },
      {
        stripeAccount: stripeAccountId,
      }
    );

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
  } catch (error: any) {
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
