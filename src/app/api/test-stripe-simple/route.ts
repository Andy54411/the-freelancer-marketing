import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('[TEST] Simple test endpoint started');

  const { searchParams } = new URL(request.url);
  const firebaseUserId = searchParams.get('firebaseUserId');

  if (!firebaseUserId) {
    return NextResponse.json({ error: 'firebaseUserId Parameter erforderlich.' }, { status: 400 });
  }

  try {
    // Test 1: Check environment variables
    const envCheck = {
      hasFirebaseServiceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };

    console.log('[TEST] Environment check:', envCheck);

    // Test 2: Try to initialize Firebase without Firestore operations
    let firebaseTest = 'not_attempted';
    try {
      const { getApps } = await import('firebase-admin/app');
      firebaseTest = `apps_count_${getApps().length}`;
    } catch (e) {
      firebaseTest = `error_${(e as Error).message}`;
    }

    // Test 3: Simple Stripe initialization (without API calls)
    let stripeTest = 'not_attempted';
    try {
      if (process.env.STRIPE_SECRET_KEY) {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2024-06-20',
        });
        stripeTest = 'initialized_successfully';
      } else {
        stripeTest = 'no_secret_key';
      }
    } catch (e) {
      stripeTest = `error_${(e as Error).message}`;
    }

    return NextResponse.json({
      success: true,
      firebaseUserId,
      envCheck,
      firebaseTest,
      stripeTest,
      message: 'Simple test completed successfully',
    });
  } catch (error) {
    console.error('[TEST] Error in simple test:', error);
    return NextResponse.json(
      {
        error: 'Test failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
