// src/app/api/create-b2b-payment-intent/route.ts
// KONSISTENT: Verwendet jetzt Destination Charges wie B2C
import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';

// Stripe initialization
function getStripeInstance() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret) {
    return null;
  }

  return new Stripe(stripeSecret, {
    apiVersion: '2024-06-20',
  });
}

export async function POST(request: NextRequest) {
  const stripe = getStripeInstance();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe-Konfiguration auf dem Server fehlt.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

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
      stripeCustomerId, // Stripe Customer ID des Kaeufers
      paymentTermsDays = 30,
      billingDetails,
    } = body;

    // B2B-spezifische Validierung
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'Ungueltige Projekt-ID.' }, { status: 400 });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Ungueltiger Betrag. Muss eine positive Zahl sein.' },
        { status: 400 }
      );
    }

    if (
      !providerStripeAccountId ||
      typeof providerStripeAccountId !== 'string' ||
      !providerStripeAccountId.startsWith('acct_')
    ) {
      return NextResponse.json(
        { error: 'Ungueltige Provider Stripe Account ID. Muss mit "acct_" beginnen.' },
        { status: 400 }
      );
    }

    if (!billingDetails?.companyName || !billingDetails?.address) {
      return NextResponse.json(
        { error: 'Vollstaendige B2B Rechnungsdetails sind erforderlich.' },
        { status: 400 }
      );
    }

    // Pruefe Connected Account Status
    try {
      const connectedAccount = await stripe.accounts.retrieve(providerStripeAccountId);
      if (!connectedAccount.charges_enabled) {
        return NextResponse.json(
          { error: 'Der Anbieter hat sein Zahlungskonto nicht vollstaendig eingerichtet.' },
          { status: 400 }
        );
      }
    } catch (accountError) {
      if (accountError instanceof Stripe.errors.StripeError) {
        if (accountError.code === 'account_invalid' || accountError.statusCode === 403) {
          return NextResponse.json(
            { 
              error: 'Der Anbieter hat sein Zahlungskonto nicht korrekt verbunden.',
              code: 'CONNECTED_ACCOUNT_INVALID'
            },
            { status: 400 }
          );
        }
      }
      throw accountError;
    }

    // B2B Platform Fee berechnen (3.5% fuer B2B - niedriger als B2C)
    const SELLER_SERVICE_FEE_RATE = 0.035; // 3.5% fuer B2B
    const platformFeeAmount = Math.round(amount * SELLER_SERVICE_FEE_RATE);
    const amountForProvider = amount - platformFeeAmount;

    // B2B Payment Intent erstellen mit DESTINATION CHARGES (konsistent mit B2C)
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: amount,
      currency: currency,
      // Customer auf Platform-Account (nicht auf Connected Account)
      ...(stripeCustomerId && { customer: stripeCustomerId }),
      // DESTINATION CHARGES: Zahlung geht ueber Platform, dann Transfer an Provider
      transfer_data: {
        destination: providerStripeAccountId,
        amount: amountForProvider, // Betrag nach Abzug Platform Fee
      },
      confirm: false,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      // B2B Metadata
      metadata: {
        type: 'b2b_payment',
        customerType: 'business',
        projectId,
        projectTitle: projectTitle || '',
        projectDescription: projectDescription || '',
        paymentType: paymentType || 'project_payment',
        customerFirebaseId: customerFirebaseId || '',
        providerFirebaseId: providerFirebaseId || '',
        paymentTermsDays: paymentTermsDays.toString(),
        platformFeeAmount: platformFeeAmount.toString(),
        platformFeeRate: SELLER_SERVICE_FEE_RATE.toString(),
        amountForProvider: amountForProvider.toString(),
        clearingPeriodDays: '7', // B2B: 7 Tage Clearing
      },
      // B2B Beschreibung
      description: `B2B ${paymentType || 'Zahlung'}: ${projectTitle || projectId}`,
      // B2B Rechnungsstellung
      receipt_email: billingDetails.email,
    };

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    // B2B Success Response
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      projectId,
      amount,
      platformFeeAmount,
      amountForProvider,
      providerStripeAccountId,
      paymentType,
      success: true,
      message: 'B2B Payment Intent erfolgreich erstellt',
    });
  } catch (error: unknown) {
    // B2B-spezifische Fehlerbehandlung
    if (error instanceof Stripe.errors.StripeError) {
      if (error.type === 'StripeInvalidRequestError') {
        if (error.message.includes('transfer_data')) {
          return NextResponse.json(
            { error: 'B2B Platform Fee Konfigurationsfehler. Bitte kontaktieren Sie den Support.' },
            { status: 400 }
          );
        }
        if (error.message.includes('account')) {
          return NextResponse.json(
            {
              error: 'Provider Stripe Account nicht verfuegbar. Bitte versuchen Sie es spaeter erneut.',
            },
            { status: 400 }
          );
        }
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      {
        error: 'B2B Payment Intent konnte nicht erstellt werden.',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
