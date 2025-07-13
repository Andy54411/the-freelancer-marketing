import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Fast cache for balance data
const balanceCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Connection pools
let stripeInstance: Stripe | null = null;
let db: any = null;

// Pre-initialize Stripe
function getStripeInstance() {
  if (!stripeInstance) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripeInstance = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
      timeout: 8000, // 8 second timeout
      maxNetworkRetries: 0, // No retries for faster fails
    });
  }
  return stripeInstance;
}

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountKey) {
      console.error("[Firebase Init] Missing service account key");
      return null;
    }

    const serviceAccount = JSON.parse(serviceAccountKey);
    // Extract project_id from service account instead of requiring separate env var
    const projectId = serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID;
    
    if (!projectId) {
      console.error("[Firebase Init] No project_id found in service account or FIREBASE_PROJECT_ID env var");
      return null;
    }

    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: projectId,
    });

    console.log("[Firebase Init] Successfully initialized with project:", projectId);
    return getFirestore(app);
  } catch (error) {
    console.error("[Firebase Init] Error:", error);
    return null;
  }
}

// Initialize on module load
try {
  db = initializeFirebaseAdmin();
} catch (error) {
  console.warn("Firebase initialization failed:", error);
}

async function handleBalanceRequest(firebaseUserId: string) {
  console.log("[BALANCE-API] Request for user:", firebaseUserId);

  // Check cache first
  const cacheKey = `balance_${firebaseUserId}`;
  const cached = balanceCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log("[BALANCE-API] Cache hit");
    return NextResponse.json(cached.data);
  }

  // Timeout wrapper for all operations
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Total timeout after 12 seconds')), 12000);
  });

  try {
    const result = await Promise.race([
      executeBalanceCheck(firebaseUserId, cacheKey),
      timeoutPromise
    ]);

    return result;
  } catch (error: any) {
    console.error("[BALANCE-API] Error:", error.message);
    
    // Return expired cache if available
    if (cached) {
      console.log("[BALANCE-API] Using expired cache");
      return NextResponse.json({ ...cached.data, source: 'expired_cache' });
    }
    
    // Final fallback
    return NextResponse.json({ 
      available: 0, 
      pending: 0, 
      source: 'error_fallback',
      error: error.message 
    });
  }
}

async function executeBalanceCheck(firebaseUserId: string, cacheKey: string) {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  // Fast Firebase lookup with timeout
  const firebaseTimeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Firebase timeout')), 6000);
  });

  // Try users collection first, then stripe_accounts as fallback
  let stripeAccountId = null;
  
  try {
    const userDoc = await Promise.race([
      db.collection('users').doc(firebaseUserId).get(),
      firebaseTimeout
    ]);
    
    if (userDoc?.exists) {
      const userData = userDoc.data();
      stripeAccountId = userData?.stripeAccountId;
      console.log("[BALANCE-API] Found stripeAccountId in users:", stripeAccountId);
    }
  } catch (error) {
    console.log("[BALANCE-API] Error accessing users collection:", error);
  }

  // Fallback: try stripe_accounts collection
  if (!stripeAccountId) {
    try {
      const doc = await Promise.race([
        db.collection('stripe_accounts').doc(firebaseUserId).get(),
        firebaseTimeout
      ]);

      if (doc?.exists) {
        const data = doc.data();
        stripeAccountId = data?.stripeAccountId;
        console.log("[BALANCE-API] Found stripeAccountId in stripe_accounts:", stripeAccountId);
      }
    } catch (error) {
      console.log("[BALANCE-API] Error accessing stripe_accounts collection:", error);
    }
  }

  if (!stripeAccountId) {
    const fallback = { available: 0, pending: 0, source: 'no_account' };
    balanceCache.set(cacheKey, { data: fallback, timestamp: Date.now() });
    return NextResponse.json(fallback);
  }

  // Fast Stripe API call
  const stripe = getStripeInstance();
  const stripeTimeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Stripe timeout')), 8000);
  });

  const balance = await Promise.race([
    stripe.balance.retrieve({ stripeAccount: stripeAccountId }),
    stripeTimeout
  ]) as Stripe.Balance;

  const response = {
    available: balance.available?.[0]?.amount || 0,
    pending: balance.pending?.[0]?.amount || 0,
    currency: balance.available?.[0]?.currency || 'eur',
    source: 'stripe_api'
  };

  // Cache successful result
  balanceCache.set(cacheKey, { data: response, timestamp: Date.now() });
  console.log("[BALANCE-API] Success:", response);
  
  return NextResponse.json(response);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const firebaseUserId = searchParams.get('firebaseUserId');

    if (!firebaseUserId) {
      return NextResponse.json(
        { error: 'Missing firebaseUserId parameter' },
        { status: 400 }
      );
    }

    return await handleBalanceRequest(firebaseUserId);
  } catch (error: any) {
    console.error("[BALANCE-API] GET Error:", error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firebaseUserId } = body;

    if (!firebaseUserId) {
      return NextResponse.json(
        { error: 'Missing firebaseUserId in request body' },
        { status: 400 }
      );
    }

    return await handleBalanceRequest(firebaseUserId);
  } catch (error: any) {
    console.error("[BALANCE-API] POST Error:", error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}