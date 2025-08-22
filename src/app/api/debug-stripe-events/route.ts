import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    })
  : null;

export async function GET(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe nicht konfiguriert' }, { status: 500 });
  }

  try {
    console.log('[DEBUG] Stripe Events werden abgerufen...');

    const events = await stripe.events.list({
      limit: 20,
      types: ['payment_intent.succeeded'],
      created: {
        gte: Math.floor(Date.now() / 1000) - 24 * 60 * 60,
      },
    });

    console.log(`[DEBUG] ${events.data.length} payment_intent.succeeded Events gefunden`);

    const eventDetails = events.data.map(event => {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      return {
        eventId: event.id,
        paymentIntentId: paymentIntent.id,
        created: new Date(event.created * 1000).toISOString(),
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        metadata: paymentIntent.metadata,
        hasRequiredMetadata: !!(
          paymentIntent.metadata?.tempJobDraftId && paymentIntent.metadata?.firebaseUserId
        ),
      };
    });

    return NextResponse.json({
      success: true,
      totalEvents: events.data.length,
      events: eventDetails,
      debugInfo: {
        timestamp: new Date().toISOString(),
        stripeConnected: !!stripe,
        environment: process.env.NODE_ENV,
      },
    });
  } catch (error: any) {
    console.error('[DEBUG ERROR]', error);
    return NextResponse.json(
      {
        error: 'Fehler beim Abrufen der Stripe Events',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
