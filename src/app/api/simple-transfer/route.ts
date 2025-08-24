import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

/**
 * SIMPLE TRANSFER: Hole Account ID und führe sofortigen Transfer aus
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firebaseUserId, amount } = body;

    if (!firebaseUserId || !amount) {
      return NextResponse.json(
        { error: 'firebaseUserId und amount sind erforderlich.' },
        { status: 400 }
      );
    }

    console.log('[SIMPLE-TRANSFER] Starting transfer for user:', firebaseUserId);

    // 1. Hole Stripe Account ID (wie request-payout API)
    let stripeAccountId: string | null = null;

    // Zuerst users collection
    const userDoc = await db.collection('users').doc(firebaseUserId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      stripeAccountId = userData?.stripeAccountId;
      console.log('[SIMPLE-TRANSFER] Found in users:', stripeAccountId);
    }

        // Fallback: users collection
    if (!stripeAccountId || !stripeAccountId.startsWith('acct_')) {
      const companyDoc = await db.collection('users').doc(firebaseUserId).get();
      if (companyDoc.exists) {
        const companyData = companyDoc.data();
        stripeAccountId = companyData?.stripeAccountId;
        console.log('[SIMPLE-TRANSFER] Found in companies:', stripeAccountId);
      }
    }

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: 'Keine Stripe Account ID gefunden für User.' },
        { status: 404 }
      );
    }

    // 2. Erstelle Transfer
    console.log(`[SIMPLE-TRANSFER] Creating transfer: ${amount} cents to ${stripeAccountId}`);

    const transfer = await stripe.transfers.create({
      amount: amount,
      currency: 'eur',
      destination: stripeAccountId,
      metadata: {
        firebaseUserId,
        type: 'simple_emergency_transfer',
        reason: 'Manual transfer for stuck pending balance',
        transferDate: new Date().toISOString()
      },
      description: `Emergency Transfer für User ${firebaseUserId} - €${(amount / 100).toFixed(2)}`,
    });

    console.log(`[SIMPLE-TRANSFER] Transfer successful: ${transfer.id}`);

    return NextResponse.json({
      success: true,
      transferId: transfer.id,
      amount: amount,
      amountEur: (amount / 100).toFixed(2),
      stripeAccountId,
      firebaseUserId,
      created: transfer.created,
      description: transfer.description,
      message: 'Transfer erfolgreich ausgeführt!'
    });

  } catch (error: any) {
    console.error('[SIMPLE-TRANSFER] Error:', error);
    return NextResponse.json(
      { 
        error: 'Transfer fehlgeschlagen',
        details: error.message,
        code: error.code
      },
      { status: 500 }
    );
  }
}
