/**
 * Stripe Webhook Configuration für Real-time Updates
 * Utility functions für Stripe Webhook Management
 */

import Stripe from 'stripe';

interface WebhookConfig {
  url: string;
  events: Stripe.WebhookEndpointCreateParams.EnabledEvent[];
  description: string;
}

interface WebhookResult {
  url: string;
  status: 'exists' | 'created';
  id: string;
  secret?: string;
}

const REQUIRED_WEBHOOKS: WebhookConfig[] = [
  {
    url: '/api/webhooks/stripe',
    events: [
      'balance.available',
      'payout.created',
      'payout.updated',
      'payout.paid',
      'payout.failed',
      'transfer.created',
      'transfer.updated',
      'application_fee.created',
      'charge.succeeded',
      'payment_intent.succeeded',
    ] as Stripe.WebhookEndpointCreateParams.EnabledEvent[],
    description: 'Taskilo Payout & Balance Updates',
  },
];

/**
 * Setup Stripe Webhooks for Real-time Updates
 */
export async function setupStripeWebhooks(
  baseUrl: string,
  stripeSecretKey: string
): Promise<{
  success: boolean;
  webhooks: WebhookResult[];
  message: string;
}> {
  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });

    // Get existing webhooks
    const existingWebhooks = await stripe.webhookEndpoints.list();

    const results: WebhookResult[] = [];

    for (const config of REQUIRED_WEBHOOKS) {
      const fullUrl = `${baseUrl}${config.url}`;

      // Check if webhook already exists
      const existing = existingWebhooks.data.find(
        wh =>
          wh.url === fullUrl &&
          wh.enabled_events.every(event => config.events.includes(event as any))
      );

      if (existing) {
        results.push({
          url: fullUrl,
          status: 'exists',
          id: existing.id,
        });
        continue;
      }

      // Create new webhook
      const webhook = await stripe.webhookEndpoints.create({
        url: fullUrl,
        enabled_events: config.events,
        description: config.description,
        api_version: '2024-06-20',
      });

      results.push({
        url: fullUrl,
        status: 'created',
        id: webhook.id,
        secret: webhook.secret,
      });
    }

    return {
      success: true,
      webhooks: results,
      message: `Successfully configured ${results.length} webhooks`,
    };
  } catch (error: any) {
    throw new Error(`Webhook setup failed: ${error.message}`);
  }
}

/**
 * Test Webhook Connectivity
 */
export async function testWebhookConnectivity(stripeSecretKey: string): Promise<{
  success: boolean;
  test_charge_id?: string;
  message: string;
}> {
  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });

    // Create a test event to verify webhook connectivity
    const testCharge = await stripe.charges.create({
      amount: 100, // 1 EUR
      currency: 'eur',
      source: 'tok_visa', // Test token
      description: 'Webhook connectivity test',
      metadata: {
        test: 'webhook_connectivity',
        timestamp: Date.now().toString(),
      },
    });

    return {
      success: true,
      test_charge_id: testCharge.id,
      message: 'Webhook test charge created successfully',
    };
  } catch (error: any) {
    throw new Error(`Webhook test failed: ${error.message}`);
  }
}
