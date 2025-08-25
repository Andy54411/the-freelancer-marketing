// src/app/api/check-webhook-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(req: NextRequest) {
  try {
    const { paymentIntentId } = await req.json();

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'PaymentIntent ID required' }, { status: 400 });
    }

    // Retrieve PaymentIntent details
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Check for related events
    const events = await stripe.events.list({
      type: 'payment_intent.succeeded',
      limit: 10,
    });

    const relatedEvent = events.data.find(event => {
      const pi = event.data.object as Stripe.PaymentIntent;
      return pi.id === paymentIntentId;
    });

    if (relatedEvent) {

    } else {

    }

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        status: paymentIntent.status,
        created: new Date(paymentIntent.created * 1000).toISOString(),
        metadata: paymentIntent.metadata,
      },
      webhookEvent: relatedEvent
        ? {
            id: relatedEvent.id,
            type: relatedEvent.type,
            created: new Date(relatedEvent.created * 1000).toISOString(),
            livemode: relatedEvent.livemode,
          }
        : null,
      diagnosis: relatedEvent
        ? 'Webhook event exists - check webhook processing logs'
        : 'No webhook event found - Stripe might not have sent webhook',
    });
  } catch (error: any) {

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
