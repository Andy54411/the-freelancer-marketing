import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

const WEBMAIL_PLANS = {
  domain: {
    name: 'Taskilo Eigene Domain',
    priceMonthly: 199, // in cents (1.99€)
    priceYearly: 1999, // in cents (19.99€)
    features: ['FreeMail inklusive', 'Eigene Domain', '100 E-Mail-Adressen'],
  },
  pro: {
    name: 'Taskilo ProMail',
    priceMonthly: 299, // in cents
    priceYearly: 2999, // in cents
    features: ['10 GB E-Mail', '25 GB Cloud', 'Werbefrei'],
  },
  business: {
    name: 'Taskilo BusinessMail',
    priceMonthly: 499, // in cents
    priceYearly: 4999, // in cents
    features: ['50 GB E-Mail', '100 GB Cloud', 'Eigene Domain'],
  },
};

const CheckoutRequestSchema = z.object({
  planId: z.enum(['domain', 'pro', 'business']),
  billingCycle: z.enum(['monthly', 'yearly']),
  email: z.string().email(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  domain: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CheckoutRequestSchema.parse(body);

    const plan = WEBMAIL_PLANS[validatedData.planId];
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Ungültiger Tarif' },
        { status: 400 }
      );
    }

    const priceInCents = validatedData.billingCycle === 'monthly' 
      ? plan.priceMonthly 
      : plan.priceYearly;

    const interval = validatedData.billingCycle === 'monthly' ? 'month' : 'year';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'sepa_debit'],
      mode: 'subscription',
      customer_email: validatedData.email,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: plan.name,
              description: plan.features.join(', '),
              metadata: {
                planId: validatedData.planId,
                type: 'webmail_subscription',
              },
            },
            unit_amount: priceInCents,
            recurring: {
              interval: interval,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        planId: validatedData.planId,
        billingCycle: validatedData.billingCycle,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        domain: validatedData.domain || '',
        type: 'webmail_subscription',
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://taskilo.de'}/webmail/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://taskilo.de'}/webmail/pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      locale: 'de',
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ungueltige Eingabedaten',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fehler beim Erstellen der Checkout-Session',
        details: message,
      },
      { status: 500 }
    );
  }
}
