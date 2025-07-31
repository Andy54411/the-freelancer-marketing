// src/app/api/create-b2b-payment-intent/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';

// Stripe initialization
function getStripeInstance() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret) {
    console.error(
      'FATAL_ERROR: Die Umgebungsvariable STRIPE_SECRET_KEY ist nicht gesetzt für die API Route /api/create-b2b-payment-intent.'
    );
    return null;
  }

  return new Stripe(stripeSecret, {
    apiVersion: '2024-06-20',
  });
}

export async function POST(request: NextRequest) {
  console.log('[API /create-b2b-payment-intent] B2B Payment Intent Anfrage empfangen.');

  const stripe = getStripeInstance();
  if (!stripe) {
    console.error(
      '[API /create-b2b-payment-intent] Stripe wurde nicht initialisiert, da STRIPE_SECRET_KEY fehlt.'
    );
    return NextResponse.json(
      { error: 'Stripe-Konfiguration auf dem Server fehlt.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    console.log(
      '[API /create-b2b-payment-intent] B2B Request Body empfangen:',
      JSON.stringify(body, null, 2)
    );

    const {
      projectId,
      projectTitle,
      projectDescription,
      amount, // Gesamtbetrag in Cents
      currency = 'eur',
      paymentType, // 'project_deposit', 'milestone', 'final_payment'
      providerStripeAccountId, // Der Provider's Stripe Connect Account
      customerFirebaseId,
      providerFirebaseId,
      paymentTermsDays = 30,
      billingDetails,
    } = body;

    // B2B-spezifische Validierung
    if (!projectId || typeof projectId !== 'string') {
      console.error('[API /create-b2b-payment-intent] Validierungsfehler: Ungültige Projekt-ID.', {
        projectId,
      });
      return NextResponse.json({ error: 'Ungültige Projekt-ID.' }, { status: 400 });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      console.error('[API /create-b2b-payment-intent] Validierungsfehler: Ungültiger Betrag.', {
        amount,
      });
      return NextResponse.json(
        { error: 'Ungültiger Betrag. Muss eine positive Zahl sein.' },
        { status: 400 }
      );
    }

    if (
      !providerStripeAccountId ||
      typeof providerStripeAccountId !== 'string' ||
      !providerStripeAccountId.startsWith('acct_')
    ) {
      console.error(
        '[API /create-b2b-payment-intent] Validierungsfehler: Ungültige Provider Stripe Account ID.',
        { providerStripeAccountId }
      );
      return NextResponse.json(
        { error: 'Ungültige Provider Stripe Account ID. Muss mit "acct_" beginnen.' },
        { status: 400 }
      );
    }

    if (!billingDetails?.companyName || !billingDetails?.address) {
      console.error(
        '[API /create-b2b-payment-intent] Validierungsfehler: Unvollständige B2B Rechnungsdetails.',
        { billingDetails }
      );
      return NextResponse.json(
        { error: 'Vollständige B2B Rechnungsdetails sind erforderlich.' },
        { status: 400 }
      );
    }

    // B2B Platform Fee berechnen (z.B. 5% für B2B)
    const platformFeePercent = 0.05; // 5% für B2B
    const platformFeeAmount = Math.round(amount * platformFeePercent);
    const applicationFeeAmount = platformFeeAmount;

    console.log('[API /create-b2b-payment-intent] B2B Platform Fee berechnet:', {
      amount,
      platformFeePercent,
      platformFeeAmount,
      applicationFeeAmount,
    });

    // B2B Payment Intent erstellen mit Stripe Connect
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency,

        // B2B Connect Setup
        application_fee_amount: applicationFeeAmount,

        // B2B Metadata
        metadata: {
          type: 'b2b_payment',
          projectId,
          projectTitle,
          projectDescription,
          paymentType,
          customerFirebaseId,
          providerFirebaseId,
          paymentTermsDays: paymentTermsDays.toString(),
          platformFeeAmount: platformFeeAmount.toString(),
        },

        // B2B Beschreibung
        description: `B2B ${paymentType}: ${projectTitle}`,

        // Payment Method Optionen für B2B
        payment_method_types: ['card', 'sepa_debit'], // B2B unterstützt auch SEPA

        // B2B Setup für zukünftige Zahlungen
        setup_future_usage: 'on_session', // Für wiederkehrende B2B Zahlungen

        // B2B Rechnungsstellung
        receipt_email: billingDetails.email,
        shipping: billingDetails.companyName
          ? {
              name: billingDetails.companyName,
              address: {
                line1: billingDetails.address.line1,
                line2: billingDetails.address.line2,
                city: billingDetails.address.city,
                postal_code: billingDetails.address.postal_code,
                country: billingDetails.address.country,
              },
            }
          : undefined,
      },
      {
        stripeAccount: providerStripeAccountId, // Payment an Provider's Connect Account
      }
    );

    console.log('[API /create-b2b-payment-intent] B2B Payment Intent erfolgreich erstellt:', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      applicationFeeAmount: paymentIntent.application_fee_amount,
      stripeAccount: providerStripeAccountId,
    });

    // B2B Success Response
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      projectId,
      amount,
      applicationFeeAmount,
      providerStripeAccountId,
      paymentType,
      success: true,
      message: 'B2B Payment Intent erfolgreich erstellt',
    });
  } catch (error: any) {
    console.error('[API /create-b2b-payment-intent] Fehler bei B2B Payment Intent Erstellung:', {
      error: error.message,
      stack: error.stack,
      stripeErrorCode: error.code,
      stripeErrorType: error.type,
    });

    // B2B-spezifische Fehlerbehandlung
    if (error.type === 'StripeInvalidRequestError') {
      if (error.message.includes('application_fee_amount')) {
        return NextResponse.json(
          { error: 'B2B Platform Fee Konfigurationsfehler. Bitte kontaktieren Sie den Support.' },
          { status: 400 }
        );
      }
      if (error.message.includes('account')) {
        return NextResponse.json(
          {
            error: 'Provider Stripe Account nicht verfügbar. Bitte versuchen Sie es später erneut.',
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'B2B Payment Intent konnte nicht erstellt werden.',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
