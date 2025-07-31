// src/app/api/test-b2b-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Creating B2B Test Payment for Webhook Testing...');

    // Erstelle PaymentIntent mit B2B Metadaten (EXAKT wie die echte B2B API)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 75000, // €750.00
      currency: 'eur',
      payment_method: 'pm_card_visa', // Test Karte
      confirm: true,
      return_url: 'https://taskilo.de/test-return',

      // B2B-specific metadata (EXAKT wie in create-project-payment/route.ts)
      metadata: {
        paymentType: 'b2b_project', // KRITISCH: Das ist der Schlüssel für Webhook Detection!
        projectId: 'test_project_' + Date.now(),
        projectTitle: 'Test B2B Service Buchung für Webhook',
        projectDescription: 'Webhook Test für B2B Order Creation in auftraege collection',
        customerFirebaseId: 'test_customer_webhook_' + Date.now(),
        providerFirebaseId: 'test_provider_webhook_' + Date.now(),

        // B2B Payment Details (wie in echter API)
        platformFeeAmount: '3750', // 5% von 75000
        grossAmount: '75000',
        providerAmount: '71250',
        platformFeeRate: '0.05',
        paymentCategory: 'project_deposit',

        // B2B Billing Details
        invoiceNumber: 'TEST-B2B-' + Date.now(),
        billingCompanyName: 'Taskilo Test GmbH',
        vatNumber: 'DE123456789',
        taxRate: '0.19',
        paymentTermsDays: '30',
      },

      description: 'B2B Test Payment für Webhook Order Creation Testing',
    });

    console.log('✅ B2B Test Payment created successfully!');
    console.log('PaymentIntent ID:', paymentIntent.id);
    console.log('Amount:', paymentIntent.amount / 100, 'EUR');
    console.log('Status:', paymentIntent.status);
    console.log('Metadata paymentType:', paymentIntent.metadata.paymentType);

    return NextResponse.json({
      success: true,
      message: 'B2B Test Payment created successfully',
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      status: paymentIntent.status,
      metadata: paymentIntent.metadata,
      note: 'Webhook should be triggered automatically. Check auftraege collection for new B2B order.',
      expectedWebhookEvent: 'payment_intent.succeeded',
      expectedWebhookAction: 'Create B2B order in auftraege collection',
    });
  } catch (error: any) {
    console.error('❌ Error creating B2B test payment:', error.message);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create B2B test payment',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
