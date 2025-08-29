import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';

// Dynamic Firebase imports to prevent build-time issues
let db: any;

async function getFirebaseServices() {
  if (!db) {
    try {
      console.log('Initializing Firebase for Payout History API...');

      // Try existing server config first
      try {
        const firebaseServer = await import('@/firebase/server');
        db = firebaseServer.db;
        if (db) {
          console.log('Using existing Firebase server configuration');
          return { db };
        }
      } catch (importError) {
        console.log('Existing config not available:', importError.message);
      }

      // Fallback to direct initialization
      const firebaseAdmin = await import('firebase-admin');

      // Check if app is already initialized
      let app;
      try {
        app = firebaseAdmin.app();
        console.log('Using existing Firebase app');
      } catch (appError) {
        console.log('Initializing new Firebase app for Payout History...');

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
      console.log('Firebase Firestore initialized successfully for Payout History API');
      return { db };
    } catch (error: any) {
      console.error('Firebase initialization failed:', error);
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
    console.log('🔍 Payout History: Starting...');

    // Use improved Firebase initialization
    const { db } = await getFirebaseServices();
    console.log('🔍 Payout History: Firebase services obtained, db available:', !!db);

    // Check if Firebase is properly initialized
    if (!db) {
      console.log('❌ Payout History: Firebase not available');
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const body = await request.json();
    const { firebaseUserId } = body;
    console.log('🔍 Payout History: Processing for user:', firebaseUserId);

    if (!firebaseUserId || typeof firebaseUserId !== 'string') {
      return NextResponse.json({ error: 'Ungültige Benutzer-ID.' }, { status: 400 });
    }

    // Get Stripe Account ID from Firestore - try COMPANIES collection first
    let stripeAccountId: string | null = null;

    console.log('🔍 Payout History: Checking companies collection...');
    const companyDoc = await db.collection('companies').doc(firebaseUserId).get();
    if (companyDoc.exists) {
      stripeAccountId = (companyDoc.data() as any)?.stripeAccountId;
      console.log('🔍 Payout History: Found stripeAccountId in companies:', stripeAccountId);
    }

    // Fallback: Try users collection
    if (!stripeAccountId) {
      console.log('🔍 Payout History: Checking users collection...');
      const userDoc = await db.collection('users').doc(firebaseUserId).get();
      if (userDoc.exists) {
        stripeAccountId = (userDoc.data() as any)?.stripeAccountId;
        console.log('🔍 Payout History: Found stripeAccountId in users:', stripeAccountId);
      }
    }

    if (!stripeAccountId || !stripeAccountId.startsWith('acct_')) {
      console.log('❌ Payout History: No valid Stripe account found');
      return NextResponse.json({ error: 'Kein gültiges Stripe-Konto gefunden.' }, { status: 404 });
    }

    console.log('🔍 Payout History: Fetching Stripe payouts...');
    // Fetch payouts from Stripe
    const payouts = await stripe.payouts.list(
      {
        limit: 100, // Get last 100 payouts
      },
      {
        stripeAccount: stripeAccountId,
      }
    );
    console.log('🔍 Payout History: Found', payouts.data.length, 'payouts');

    // Calculate summary
    const summary = {
      totalPayouts: payouts.data.length,
      totalAmount: payouts.data.reduce((sum, payout) => sum + payout.amount, 0),
      pendingAmount: payouts.data
        .filter(payout => payout.status === 'pending' || payout.status === 'in_transit')
        .reduce((sum, payout) => sum + payout.amount, 0),
      lastPayout: payouts.data.length > 0 ? payouts.data[0] : null,
    };

    console.log('✅ Payout History: Success');
    return NextResponse.json({
      payouts: payouts.data,
      summary: summary,
      success: true,
    });
  } catch (error: any) {
    console.error('❌ Payout History Error:', error);
    console.error('❌ Payout History Stack:', error.stack);

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
