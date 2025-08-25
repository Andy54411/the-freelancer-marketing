import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/firebase/server';

// Fast cache for balance data
const balanceCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Connection pools
let stripeInstance: Stripe | null = null;

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

async function handleBalanceRequest(firebaseUserId: string) {

  // Check cache first
  const cacheKey = `balance_${firebaseUserId}`;
  const cached = balanceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {

    return NextResponse.json(cached.data);
  }

  // Timeout wrapper for all operations
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Total timeout after 12 seconds')), 12000);
  });

  try {
    const result = await Promise.race([
      executeBalanceCheck(firebaseUserId, cacheKey),
      timeoutPromise,
    ]);

    return result;
  } catch (error: any) {

    // Return expired cache if available
    if (cached) {

      return NextResponse.json({ ...cached.data, source: 'expired_cache' });
    }

    // Final fallback
    return NextResponse.json({
      available: 0,
      pending: 0,
      source: 'error_fallback',
      error: error.message,
    });
  }
}

async function executeBalanceCheck(firebaseUserId: string, cacheKey: string) {
  // Fast Firebase lookup with timeout
  const firebaseTimeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Firebase timeout')), 6000);
  });

  // Try users collection first, then stripe_accounts as fallback
  let stripeAccountId = null;

  try {
    const userDoc = await Promise.race([
      db.collection('users').doc(firebaseUserId).get(),
      firebaseTimeout,
    ]);

    if (userDoc?.exists) {
      const userData = userDoc.data();
      stripeAccountId = userData?.stripeAccountId;

    }
  } catch (error) {

  }

  // Fallback: try stripe_accounts collection
  if (!stripeAccountId) {
    try {
      const doc = await Promise.race([
        db.collection('stripe_accounts').doc(firebaseUserId).get(),
        firebaseTimeout,
      ]);

      if (doc?.exists) {
        const data = doc.data();
        stripeAccountId = data?.stripeAccountId;

      }
    } catch (error) {

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

  const balance = (await Promise.race([
    stripe.balance.retrieve({ stripeAccount: stripeAccountId }),
    stripeTimeout,
  ])) as Stripe.Balance;

  const response = {
    available: balance.available?.[0]?.amount || 0,
    pending: balance.pending?.[0]?.amount || 0,
    currency: balance.available?.[0]?.currency || 'eur',
    source: 'stripe_api',
  };

  // Cache successful result
  balanceCache.set(cacheKey, { data: response, timestamp: Date.now() });

  return NextResponse.json(response);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const firebaseUserId = searchParams.get('firebaseUserId');

    if (!firebaseUserId) {
      return NextResponse.json({ error: 'Missing firebaseUserId parameter' }, { status: 400 });
    }

    return await handleBalanceRequest(firebaseUserId);
  } catch (error: any) {

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

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
