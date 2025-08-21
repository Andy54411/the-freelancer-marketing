import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * SIMPLE: Get Stripe Account ID direkt aus Firebase
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const firebaseUserId = searchParams.get('firebaseUserId');

    if (!firebaseUserId) {
      return NextResponse.json(
        { error: 'firebaseUserId ist erforderlich.' },
        { status: 400 }
      );
    }

    console.log('[GET-ACCOUNT-ID] Looking for user:', firebaseUserId);

    // Genau wie get-stripe-balance API - zuerst users collection
    let stripeAccountId = null;

    try {
      const userDoc = await db.collection('users').doc(firebaseUserId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        stripeAccountId = userData?.stripeAccountId;
        console.log('[GET-ACCOUNT-ID] Found in users:', stripeAccountId);
      }
    } catch (error) {
      console.log('[GET-ACCOUNT-ID] Error accessing users:', error);
    }

    // Fallback: stripe_accounts collection
    if (!stripeAccountId) {
      try {
        const doc = await db.collection('stripe_accounts').doc(firebaseUserId).get();
        if (doc.exists) {
          const data = doc.data();
          stripeAccountId = data?.stripeAccountId;
          console.log('[GET-ACCOUNT-ID] Found in stripe_accounts:', stripeAccountId);
        }
      } catch (error) {
        console.log('[GET-ACCOUNT-ID] Error accessing stripe_accounts:', error);
      }
    }

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: 'Stripe Account ID nicht gefunden.' },
        { status: 404 }
      );
    }

    const response = {
      firebaseUserId,
      stripeAccountId,
      found: true
    };

    console.log('[GET-ACCOUNT-ID] Success:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('[GET-ACCOUNT-ID] Error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Account ID.' },
      { status: 500 }
    );
  }
}
