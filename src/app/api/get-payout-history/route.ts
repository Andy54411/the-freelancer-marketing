import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/firebase/server';

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

  try {
    const body = await request.json();
    const { firebaseUserId } = body;

    if (!firebaseUserId || typeof firebaseUserId !== 'string') {
      return NextResponse.json({ error: 'Ungültige Benutzer-ID.' }, { status: 400 });
    }

    // Get Stripe Account ID from Firestore
    let stripeAccountId: string | null = null;

    // Try users collection first
    const userDoc = await db.collection('users').doc(firebaseUserId).get();
    if (userDoc.exists) {
      stripeAccountId = (userDoc.data() as any)?.stripeAccountId;
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
