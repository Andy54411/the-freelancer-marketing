import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin only if environment variables are available
let db: any = null;

if (!getApps().length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    
    if (serviceAccountKey && projectId) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      if (serviceAccount.project_id) {
        initializeApp({
          credential: cert(serviceAccount),
          projectId: projectId,
        });
        db = getFirestore();
      }
    }
  } catch (error) {
    console.warn("Firebase Admin initialization skipped during build:", error);
  }
} else {
  db = getFirestore();
}

const stripeSecret = process.env.STRIPE_SECRET_KEY;

if (!stripeSecret) {
  console.error("FATAL_ERROR: Die Umgebungsvariable STRIPE_SECRET_KEY ist nicht gesetzt für die API Route /api/get-stripe-balance.");
}

const stripe = stripeSecret ? new Stripe(stripeSecret, {
  apiVersion: '2024-06-20',
}) : null;

// Gemeinsame Logik für GET und POST
async function handleBalanceRequest(firebaseUserId: string) {
  console.log("[API /get-stripe-balance] Processing request for user:", firebaseUserId);

  // Debugging der Umgebungsvariablen
  console.log("[API /get-stripe-balance] Environment check:", {
    hasStripeSecret: !!stripeSecret,
    hasFirebaseDb: !!db,
    nodeEnv: process.env.NODE_ENV,
    hasFirebaseServiceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID
  });

  if (!stripe) {
    console.error("[API /get-stripe-balance] Stripe wurde nicht initialisiert, da STRIPE_SECRET_KEY fehlt.");
    return NextResponse.json({ 
      error: 'Stripe-Konfiguration auf dem Server fehlt.',
      debug: {
        hasStripeSecret: !!stripeSecret,
        env: process.env.NODE_ENV
      }
    }, { status: 500 });
  }

  if (!db) {
    console.error("[API /get-stripe-balance] Firebase wurde nicht initialisiert.");
    return NextResponse.json({ 
      error: 'Firebase-Konfiguration auf dem Server fehlt.',
      debug: {
        hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
        hasProjectId: !!process.env.FIREBASE_PROJECT_ID
      }
    }, { status: 500 });
  }

  if (!firebaseUserId || typeof firebaseUserId !== 'string') {
    console.error("[API /get-stripe-balance] Validierungsfehler: Ungültige Firebase User ID.", { firebaseUserId });
    return NextResponse.json({ 
      error: 'Ungültige Firebase User ID.',
      received: firebaseUserId,
      type: typeof firebaseUserId
    }, { status: 400 });
  }

  try {
    // Hole die Stripe Account ID aus der Firestore
    // Versuche zuerst die companies Collection, dann die users Collection
    let userDoc;
    let stripeAccountId;
    
    try {
      // Versuche zuerst companies collection
      const companyDocRef = db.collection('companies').doc(firebaseUserId);
      const companyDoc = await companyDocRef.get();
      
      if (companyDoc.exists) {
        const companyData = companyDoc.data();
        stripeAccountId = companyData?.stripeAccountId;
        userDoc = companyDoc;
      }
      
      // Falls nicht in companies gefunden, versuche users collection
      if (!stripeAccountId) {
        const userDocRef = db.collection('users').doc(firebaseUserId);
        userDoc = await userDocRef.get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          stripeAccountId = userData?.stripeAccountId;
        }
      }
    } catch (firestoreError) {
      console.error("[API /get-stripe-balance] Fehler beim Zugriff auf Firestore:", firestoreError);
      return NextResponse.json({ error: 'Datenbankfehler beim Abrufen der Benutzerdaten.' }, { status: 500 });
    }
    
    if (!userDoc || !userDoc.exists) {
      console.error("[API /get-stripe-balance] Benutzer nicht gefunden in Firestore.", { firebaseUserId });
      return NextResponse.json({ error: 'Benutzer nicht gefunden.' }, { status: 404 });
    }

    if (!stripeAccountId || !stripeAccountId.startsWith('acct_')) {
      console.warn("[API /get-stripe-balance] Keine gültige Stripe Account ID gefunden - Benutzer wahrscheinlich noch nicht vollständig registriert.", { stripeAccountId });
      
      // Für Benutzer ohne vollständige Stripe-Registrierung geben wir 0 Balance zurück
      return NextResponse.json({
        available: 0,
        pending: 0,
        currency: 'eur',
        stripeAccountId: null,
        message: 'Stripe-Konto noch nicht vollständig eingerichtet'
      });
    }

    console.log("[API /get-stripe-balance] Rufe Stripe Balance ab für Account:", stripeAccountId);

    // Hole das Guthaben vom Stripe Connected Account
    if (!stripe) {
      throw new Error('Stripe client is not initialized');
    }
    
    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeAccountId
    });

    // Berechne verfügbares und ausstehendes Guthaben in EUR
    const eurBalanceAvailable = balance.available.find(b => b.currency === 'eur');
    const eurBalancePending = balance.pending.find(b => b.currency === 'eur');

    const availableAmount = eurBalanceAvailable ? eurBalanceAvailable.amount : 0;
    const pendingAmount = eurBalancePending ? eurBalancePending.amount : 0;

    console.log("[API /get-stripe-balance] Balance abgerufen:", {
      available: availableAmount,
      pending: pendingAmount,
      currency: 'eur'
    });

    return NextResponse.json({
      available: availableAmount, // Amount in cents
      pending: pendingAmount,     // Amount in cents
      currency: 'eur',
      stripeAccountId: stripeAccountId
    });

  } catch (error) {
    console.error("[API /get-stripe-balance] Fehler beim Abrufen des Guthabens:", error);
    
    let errorMessage = 'Interner Serverfehler beim Abrufen des Guthabens.';
    let statusCode = 500;
    
    if (error instanceof Stripe.errors.StripeError) {
      console.error("[API /get-stripe-balance] Stripe Error Details:", {
        type: error.type,
        code: error.code,
        decline_code: error.decline_code,
        message: error.message
      });
      
      if (error.type === 'StripePermissionError') {
        errorMessage = 'Keine Berechtigung für dieses Stripe-Konto.';
        statusCode = 403;
      } else if (error.type === 'StripeInvalidRequestError') {
        errorMessage = 'Ungültige Anfrage an Stripe.';
        statusCode = 400;
      } else {
        errorMessage = `Stripe Fehler: ${error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({
      error: errorMessage,
    }, { status: statusCode });
  }
}

export async function GET(request: NextRequest) {
  console.log("[API /get-stripe-balance] GET Anfrage empfangen.");
  
  const { searchParams } = new URL(request.url);
  const firebaseUserId = searchParams.get('firebaseUserId');
  
  if (!firebaseUserId) {
    return NextResponse.json({ error: 'firebaseUserId Parameter erforderlich.' }, { status: 400 });
  }
  
  return handleBalanceRequest(firebaseUserId);
}

export async function POST(request: NextRequest) {
  console.log("[API /get-stripe-balance] POST Anfrage empfangen.");

  try {
    let body;
    try {
      body = await request.json();
      console.log("[API /get-stripe-balance] Request body parsed:", body);
    } catch (parseError) {
      console.error("[API /get-stripe-balance] Fehler beim Parsen des Request Body:", parseError);
      return NextResponse.json({ error: 'Ungültiger Request Body - JSON erwartet.' }, { status: 400 });
    }
    
    const { firebaseUserId } = body;

    return handleBalanceRequest(firebaseUserId);
  } catch (error) {
    console.error("[API /get-stripe-balance] Fehler beim Verarbeiten der POST-Anfrage:", error);
    return NextResponse.json({ error: 'Fehler beim Verarbeiten der Anfrage.' }, { status: 500 });
  }
}