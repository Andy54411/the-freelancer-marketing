import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: NextRequest) {
  try {
    const { companyId } = await request.json();

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID ist erforderlich' }, { status: 400 });
    }

    // Get company document
    const companyRef = db.collection('companies').doc(companyId);
    const companySnap = await companyRef.get();

    if (!companySnap.exists) {
      return NextResponse.json({ error: 'Firma nicht gefunden' }, { status: 404 });
    }

    const companyData = companySnap.data();

    // Check if consent was given
    if (!companyData?.storageCancellation?.consentGiven) {
      return NextResponse.json({ error: 'Einwilligung zur Kündigung fehlt' }, { status: 400 });
    }

    // Get Stripe subscription ID
    const subscriptionId = companyData?.stripeSubscriptionId;

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Kein aktives Abonnement gefunden' }, { status: 404 });
    }

    // Cancel subscription at period end (user keeps access until end of billing cycle)
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    // Update company document
    await companyRef.update({
      subscriptionStatus: 'canceling',
      canceledAt: new Date(),
      cancelAtPeriodEnd: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Abonnement erfolgreich gekündigt',
      endsAt: subscription.current_period_end,
    });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);

    return NextResponse.json(
      { error: error.message || 'Fehler beim Kündigen des Abonnements' },
      { status: 500 }
    );
  }
}
