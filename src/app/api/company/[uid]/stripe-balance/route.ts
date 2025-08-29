import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Dynamic Firebase imports to prevent build-time issues
let db: any;

async function getFirebaseServices() {
  if (!db) {
    try {
      console.log('Initializing Firebase for Stripe Balance API...');

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
        console.log('Initializing new Firebase app...');

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
          throw new Error('No Firebase configuration found');
        }
      }

      db = firebaseAdmin.firestore(app);
      console.log('Firebase Firestore initialized successfully for Stripe Balance API');
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw error;
    }
  }
  return { db };
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// Cache duration: 3 minutes (balance data changes frequently)
const CACHE_DURATION = 3 * 60 * 1000;

export async function GET(request: NextRequest, context: { params: Promise<{ uid: string }> }) {
  try {
    const params = await context.params;
    const { uid } = params;
    const forceRefresh = request.nextUrl.searchParams.get('force') === 'true';

    if (!uid) {
      return NextResponse.json({ error: 'Fehlende Company UID' }, { status: 400 });
    }

    console.log(`Processing stripe balance request for company ${uid}`);

    // Get Firebase services with robust error handling
    const { db } = await getFirebaseServices();

    // Hole Company-Daten
    const companyDoc = await db.collection('companies').doc(uid).get();

    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Company nicht gefunden' }, { status: 404 });
    }

    const companyData = companyDoc.data();

    // Try multiple possible locations for the Stripe account ID
    const connectedAccountId =
      companyData?.stripe?.connectedAccountId ||
      companyData?.stripeAccountId ||
      companyData?.connectedAccountId ||
      companyData?.stripe?.accountId;

    console.log('🔍 Debug Stripe Account:', {
      uid,
      hasCompanyData: !!companyData,
      stripeObject: companyData?.stripe,
      stripeAccountId: companyData?.stripeAccountId,
      connectedAccountId: companyData?.connectedAccountId,
      finalAccountId: connectedAccountId,
    });

    if (!connectedAccountId) {
      return NextResponse.json(
        {
          error: 'Kein Stripe Connected Account gefunden',
          debug: {
            availableKeys: companyData ? Object.keys(companyData) : [],
            stripeKeys: companyData?.stripe ? Object.keys(companyData.stripe) : [],
          },
        },
        { status: 400 }
      );
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cacheDoc = await db
        .collection('stripe_cache')
        .doc(`balance_${connectedAccountId}`)
        .get();

      if (cacheDoc.exists) {
        const cachedData = cacheDoc.data();
        if (cachedData && cachedData.updated_at) {
          const cacheAge = Date.now() - cachedData.updated_at.toMillis();

          if (cacheAge < CACHE_DURATION) {
            console.log('🎯 Returning cached balance for', connectedAccountId);
            return NextResponse.json({
              success: true,
              balance: cachedData.balance,
              cached: true,
              cache_age_seconds: Math.round(cacheAge / 1000),
            });
          }
        }
      }
    }

    console.log('🔄 Fetching fresh balance from Stripe for', connectedAccountId);

    // Hole aktuellen Stripe Balance
    const balance = await stripe.balance.retrieve({
      stripeAccount: connectedAccountId,
    });

    // Formatiere Response
    const balanceData = {
      available: balance.available.map(item => ({
        amount: item.amount,
        currency: item.currency,
        amountEuro: item.amount / 100,
      })),
      pending: balance.pending.map(item => ({
        amount: item.amount,
        currency: item.currency,
        amountEuro: item.amount / 100,
      })),
      connectReserved:
        balance.connect_reserved?.map(item => ({
          amount: item.amount,
          currency: item.currency,
          amountEuro: item.amount / 100,
        })) || [],
      instantAvailable:
        balance.instant_available?.map(item => ({
          amount: item.amount,
          currency: item.currency,
          amountEuro: item.amount / 100,
        })) || [],
      connectedAccountId,
      timestamp: new Date().toISOString(),
    };

    // Cache the result
    await db.collection('stripe_cache').doc(`balance_${connectedAccountId}`).set({
      balance: balanceData,
      updated_at: new Date(),
      stripe_account_id: connectedAccountId,
    });

    return NextResponse.json({
      success: true,
      balance: balanceData,
      cached: false,
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Stripe Balance:', error);

    // Return specific error information
    if (error instanceof Error) {
      if (error.message.includes('No such account')) {
        return NextResponse.json(
          { error: 'Stripe Account nicht gefunden oder nicht verbunden' },
          { status: 404 }
        );
      }

      if (error.message.includes('permission')) {
        return NextResponse.json(
          { error: 'Keine Berechtigung für diesen Stripe Account' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Fehler beim Abrufen des Kontostand',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
