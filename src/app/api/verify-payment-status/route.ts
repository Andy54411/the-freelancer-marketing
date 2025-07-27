// src/app/api/verify-payment-status/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';

// Stripe initialization moved to runtime to avoid build-time errors
function getStripeInstance() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret) {
    console.error(
      'FATAL_ERROR: Die Umgebungsvariable STRIPE_SECRET_KEY ist nicht gesetzt für die API Route /api/verify-payment-status.'
    );
    return null;
  }

  return new Stripe(stripeSecret, {
    apiVersion: '2024-06-20', // Deine spezifische API-Version, die du auch in create-payment-intent verwendest
  });
}

export async function POST(request: NextRequest) {
  const stripe = getStripeInstance();

  // Überprüfe, ob Stripe korrekt initialisiert wurde
  if (!stripe) {
    console.error(
      '[API /verify-payment-status] Stripe wurde nicht initialisiert, da STRIPE_SECRET_KEY fehlt oder ungültig ist.'
    );
    return NextResponse.json(
      { error: 'Stripe-Konfiguration auf dem Server fehlt oder ist fehlerhaft.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { paymentIntentId, orderId } = body;

    if (!paymentIntentId) {
      console.log('[API /verify-payment-status] Warnung: PaymentIntent ID fehlt in der Anfrage.');
      return NextResponse.json({ error: 'PaymentIntent ID fehlt.' }, { status: 400 });
    }

    console.log(
      `[API /verify-payment-status] Verifying PaymentIntent ${paymentIntentId} for order ${orderId}...`
    );

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    console.log(
      `[API /verify-payment-status] Status für ${paymentIntentId} ist: ${paymentIntent.status}`
    );

    // Prüfe zusätzlich die Metadaten um sicherzustellen, dass es zum richtigen Auftrag gehört
    const isValidOrder = !orderId || paymentIntent.metadata?.orderId === orderId;

    const verified = paymentIntent.status === 'succeeded' && isValidOrder;

    // Gib den Status und Verifikationsergebnis zurück
    return NextResponse.json({
      verified,
      status: paymentIntent.status,
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      orderId: paymentIntent.metadata?.orderId,
      validOrder: isValidOrder,
    });
  } catch (error: unknown) {
    let errorMessage = 'Fehler beim Abrufen des Zahlungsstatus.';
    let errorDetails = 'Unbekannter Fehler';

    if (error instanceof Error) {
      console.error(
        `[API /verify-payment-status] Fehler beim Verifying PaymentIntent:`,
        error.message
      );
      errorDetails = error.message;
    } else {
      console.error(
        `[API /verify-payment-status] Unbekannter Fehler beim Verifying PaymentIntent:`,
        error
      );
    }

    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = `Stripe API Fehler: ${error.message}`;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        verified: false,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const stripe = getStripeInstance();
  // Überprüfe, ob Stripe korrekt initialisiert wurde
  if (!stripe) {
    console.error(
      '[API /verify-payment-status] Stripe wurde nicht initialisiert, da STRIPE_SECRET_KEY fehlt oder ungültig ist.'
    );
    return NextResponse.json(
      { error: 'Stripe-Konfiguration auf dem Server fehlt oder ist fehlerhaft.' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const paymentIntentId = searchParams.get('paymentIntentId');

  if (!paymentIntentId) {
    console.log('[API /verify-payment-status] Warnung: PaymentIntent ID fehlt in der Anfrage.');
    return NextResponse.json({ error: 'PaymentIntent ID fehlt.' }, { status: 400 });
  }

  try {
    console.log(`[API /verify-payment-status] Rufe PaymentIntent ${paymentIntentId} ab...`);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log(
      `[API /verify-payment-status] Status für ${paymentIntentId} ist: ${paymentIntent.status}`
    );

    // Gib den Status und ggf. weitere benötigte Infos zurück
    return NextResponse.json({
      status: paymentIntent.status,
      id: paymentIntent.id,
      // Du könntest hier auch z.B. paymentIntent.metadata.tempJobDraftId zurückgeben,
      // um im Frontend sicherzustellen, dass es der richtige PI für den Job ist.
      // Die jobReference ist aber schon im Frontend durch die URL bekannt.
    });
  } catch (error: unknown) {
    let errorMessage = 'Fehler beim Abrufen des Zahlungsstatus.';
    let errorDetails = 'Unbekannter Fehler'; // Fallback für errorDetails

    if (error instanceof Error) {
      console.error(
        `[API /verify-payment-status] Fehler beim Abrufen des PaymentIntent ${paymentIntentId}:`,
        error.message
      );
      errorDetails = error.message; // errorDetails mit der tatsächlichen Fehlermeldung setzen
    } else {
      console.error(
        `[API /verify-payment-status] Unbekannter Fehler beim Abrufen des PaymentIntent ${paymentIntentId}:`,
        error
      );
    }

    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = `Stripe API Fehler: ${error.message}`;
    }
    return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: 500 });
  }
}
