import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('[SIMPLE-BALANCE] Starting simple balance check');

  const { searchParams } = new URL(request.url);
  const firebaseUserId = searchParams.get('firebaseUserId');

  if (!firebaseUserId) {
    return NextResponse.json({ error: 'firebaseUserId Parameter erforderlich.' }, { status: 400 });
  }

  try {
    // Return mock data for now to test if the timeout issue is with our logic
    return NextResponse.json({
      success: true,
      available: 0,
      pending: 0,
      currency: 'eur',
      stripeAccountId: null,
      message: 'Mock response - Stripe-Konto noch nicht vollständig eingerichtet',
      userId: firebaseUserId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[SIMPLE-BALANCE] Error:', error);
    return NextResponse.json(
      {
        error: 'Test failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firebaseUserId } = body;

    if (!firebaseUserId) {
      return NextResponse.json({ error: 'firebaseUserId erforderlich.' }, { status: 400 });
    }

    // Return mock data for POST as well
    return NextResponse.json({
      success: true,
      available: 0,
      pending: 0,
      currency: 'eur',
      stripeAccountId: null,
      message: 'Mock response - Stripe-Konto noch nicht vollständig eingerichtet',
      userId: firebaseUserId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Request failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
