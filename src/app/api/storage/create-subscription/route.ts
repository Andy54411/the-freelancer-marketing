// src/app/api/storage/create-subscription/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { admin } from '@/firebase/server';

function getStripeInstance() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret) {
    return null;
  }

  return new Stripe(stripeSecret, {
    apiVersion: '2024-06-20',
  });
}

interface StorageSubscriptionRequest {
  priceId: string;
  planId: string;
  storage: number;
  companyId: string;
  successUrl: string;
  cancelUrl: string;
}

export async function POST(request: NextRequest) {
  const stripe = getStripeInstance();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Storage Subscription Service nicht verfügbar' },
      { status: 500 }
    );
  }

  try {
    const body: StorageSubscriptionRequest = await request.json();

    const { priceId, planId, storage, companyId, successUrl, cancelUrl } = body;

    // Validation
    if (!priceId || !planId || !storage || !companyId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Fehlende Parameter für Storage Subscription' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer for company
    let stripeCustomerId: string;
    const db = admin.firestore();
    const companyRef = db.collection('companies').doc(companyId);
    const companyDoc = await companyRef.get();

    if (companyDoc.exists && companyDoc.data()?.stripeCustomerId) {
      stripeCustomerId = companyDoc.data()!.stripeCustomerId;
    } else {
      // Create new Stripe customer for company
      const customer = await stripe.customers.create({
        metadata: {
          companyId,
          type: 'storage_subscription',
        },
      });
      stripeCustomerId = customer.id;

      // Save Stripe customer ID to Firestore
      await companyRef.set(
        {
          stripeCustomerId: customer.id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    // Create Checkout Session for Subscription
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card', 'sepa_debit'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        companyId,
        planId,
        storage: storage.toString(),
        type: 'storage_subscription',
      },
      subscription_data: {
        metadata: {
          companyId,
          planId,
          storage: storage.toString(),
          type: 'storage_subscription',
        },
      },
      billing_address_collection: 'required',
      locale: 'de',
      allow_promotion_codes: true,
    });

    // Log subscription attempt to Firestore
    const subscriptionLogRef = db
      .collection('companies')
      .doc(companyId)
      .collection('storage_subscriptions')
      .doc(session.id);

    await subscriptionLogRef.set({
      sessionId: session.id,
      stripeCustomerId,
      planId,
      storage,
      priceId,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Storage subscription error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        details: error,
      },
      { status: 500 }
    );
  }
}
