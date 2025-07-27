// src/app/api/stripe-logs/route.ts
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
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type') || 'all'; // 'all', 'webhooks', 'payments', 'errors'

    // Get recent events
    const events = await stripe.events.list({
      limit: limit,
      ...(type !== 'all' && type === 'webhooks' && { type: 'payment_intent.succeeded' }),
    });

    // Get webhook endpoints to check configuration
    const webhookEndpoints = await stripe.webhookEndpoints.list();

    // Get payment methods configuration for domain verification info
    let paymentMethodsConfig;
    try {
      // Try to get payment method domain info (requires specific permissions)
      paymentMethodsConfig = await stripe.paymentMethodConfigurations.list({ limit: 5 });
    } catch (error) {
      paymentMethodsConfig = { data: [] };
    }

    // Check for recent webhook delivery attempts
    const recentWebhookAttempts = events.data.filter(
      event =>
        event.type.includes('payment_intent') ||
        event.type.includes('checkout') ||
        event.type === 'invoice.payment_succeeded'
    );

    // Format the response
    const logs = {
      timestamp: new Date().toISOString(),
      webhook_endpoints: webhookEndpoints.data.map(endpoint => ({
        id: endpoint.id,
        url: endpoint.url,
        status: endpoint.status,
        enabled_events: endpoint.enabled_events,
        created: new Date(endpoint.created * 1000).toISOString(),
      })),
      domain_verification: {
        note: 'Domain verification needed for Apple Pay and other payment methods',
        status: 'Check Stripe Dashboard > Settings > Payment methods > Apple Pay',
        detected_issue: 'apple_pay not enabled due to domain verification',
        action_required: 'Register and verify taskilo.de domain in Stripe Dashboard',
      },
      payment_methods_config:
        paymentMethodsConfig.data.length > 0
          ? paymentMethodsConfig.data
          : 'No payment method configurations found',
      recent_events: events.data.map(event => ({
        id: event.id,
        type: event.type,
        created: new Date(event.created * 1000).toISOString(),
        data: {
          object_id: 'id' in event.data.object ? event.data.object.id : 'N/A',
          ...(event.type === 'payment_intent.succeeded' && {
            amount: (event.data.object as Stripe.PaymentIntent).amount,
            currency: (event.data.object as Stripe.PaymentIntent).currency,
            status: (event.data.object as Stripe.PaymentIntent).status,
            metadata: (event.data.object as Stripe.PaymentIntent).metadata,
          }),
        },
        request: event.request
          ? {
              id: event.request.id,
              idempotency_key: event.request.idempotency_key,
            }
          : null,
      })),
      summary: {
        total_events: events.data.length,
        payment_intent_succeeded: events.data.filter(e => e.type === 'payment_intent.succeeded')
          .length,
        additional_hours_payments: events.data.filter(
          e =>
            e.type === 'payment_intent.succeeded' &&
            (e.data.object as Stripe.PaymentIntent).metadata?.type ===
              'additional_hours_platform_hold'
        ).length,
        recent_webhook_attempts: recentWebhookAttempts.length,
        webhook_endpoints_count: webhookEndpoints.data.length,
        active_webhooks: webhookEndpoints.data.filter(w => w.status === 'enabled').length,
        domain_verification_needed: true,
        apple_pay_disabled: 'Domain not verified for Apple Pay',
      },
    };

    return NextResponse.json(logs);
  } catch (error: unknown) {
    let errorMessage = 'Fehler beim Abrufen der Stripe-Logs';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error('[STRIPE LOGS ERROR]', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
