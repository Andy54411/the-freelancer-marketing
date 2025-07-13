import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Simple in-memory cache for balance data (5 minutes TTL)
const balanceCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Initialize Firebase Admin - robust production version
let db: any = null;

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    // Firebase already initialized
    return getFirestore();
  }

  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    let projectId = process.env.FIREBASE_PROJECT_ID;

    console.log("[Firebase Init] Environment check:", {
      hasServiceAccountKey: !!serviceAccountKey,
      hasProjectId: !!projectId,
      nodeEnv: process.env.NODE_ENV
    });

    if (!serviceAccountKey) {
      console.error("[Firebase Init] Missing FIREBASE_SERVICE_ACCOUNT_KEY");
      return null;
    }

    const serviceAccount = JSON.parse(serviceAccountKey);

    // Fallback: Verwende project_id aus dem Service Account, falls FIREBASE_PROJECT_ID nicht gesetzt ist
    if (!projectId && serviceAccount.project_id) {
      projectId = serviceAccount.project_id;
      console.log("[Firebase Init] Using project_id from service account:", projectId);
    }

    if (!projectId) {
      console.error("[Firebase Init] No project ID available");
      return null;
    }

    console.log("[Firebase Init] Service account parsed successfully, project:", serviceAccount.project_id);

    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: projectId,
    });

    console.log("[Firebase Init] Firebase Admin initialized successfully");
    return getFirestore(app);

  } catch (error) {
    console.error("[Firebase Init] Initialization failed:", error);
    return null;
  }
}

// Initialize on module load
try {
  db = initializeFirebaseAdmin();
} catch (error) {
  console.warn("Firebase Admin initialization skipped during build:", error);
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

  // Check cache first
  const cacheKey = `balance_${firebaseUserId}`;
  const cached = balanceCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log("[API /get-stripe-balance] Returning cached result for user:", firebaseUserId);
    return NextResponse.json(cached.data);
  }

  // Ausführliches Debugging der Umgebung
  console.log("[API /get-stripe-balance] Detailed Environment check:", {
    hasStripeSecret: !!stripeSecret,
    hasFirebaseDb: !!db,
    nodeEnv: process.env.NODE_ENV,
    hasFirebaseServiceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
    serviceAccountKeyLength: process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length || 0,
    projectIdValue: process.env.FIREBASE_PROJECT_ID,
    firebaseAppsLength: getApps().length
  });

  // Versuche Firebase erneut zu initialisieren, falls es beim ersten Mal fehlgeschlagen ist
  if (!db) {
    console.log("[API /get-stripe-balance] Attempting to re-initialize Firebase...");
    db = initializeFirebaseAdmin();
  }

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
        hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
        serviceAccountKeyLength: process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length || 0,
        projectIdValue: process.env.FIREBASE_PROJECT_ID,
        firebaseAppsLength: getApps().length
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

    // Hole das Guthaben vom Stripe Connected Account mit Timeout
    if (!stripe) {
      throw new Error('Stripe client is not initialized');
    }

    // Implementiere einen Timeout für die Stripe API-Anfrage
    const balancePromise = stripe.balance.retrieve({
      stripeAccount: stripeAccountId
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Stripe API timeout')), 25000); // 25 Sekunden Timeout
    });

    const balance = await Promise.race([balancePromise, timeoutPromise]) as Stripe.Balance;

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

    const responseData = {
      available: availableAmount, // Amount in cents
      pending: pendingAmount,     // Amount in cents
      currency: 'eur',
      stripeAccountId: stripeAccountId
    };

    // Cache the successful response
    balanceCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("[API /get-stripe-balance] Fehler beim Abrufen des Guthabens:", error);

    let errorMessage = 'Interner Serverfehler beim Abrufen des Guthabens.';
    let statusCode = 500;

    // Spezielle Behandlung für Timeout-Fehler
    if (error instanceof Error && error.message === 'Stripe API timeout') {
      errorMessage = 'Stripe API Timeout - Bitte versuchen Sie es später erneut.';
      statusCode = 504;
    } else if (error instanceof Stripe.errors.StripeError) {
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
      } else if (error.type === 'StripeConnectionError') {
        errorMessage = 'Verbindungsfehler zu Stripe - Bitte versuchen Sie es später erneut.';
        statusCode = 502;
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