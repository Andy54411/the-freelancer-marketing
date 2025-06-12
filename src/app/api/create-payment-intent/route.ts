// src/app/api/create-payment-intent/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';

const stripeSecret = process.env.STRIPE_SECRET_KEY;


if (!stripeSecret) {
  console.error("FATAL_ERROR: Die Umgebungsvariable STRIPE_SECRET_KEY ist nicht gesetzt für die API Route /api/create-payment-intent.");
}

const stripe = stripeSecret ? new Stripe(stripeSecret, {
  apiVersion: '2025-05-28.basil', // KORRIGIERT: Passend zur Stripe-Typdefinition
}) : null;

// HINWEIS: Das lokale Interface LocalPaymentMethodDataCard kann jetzt entfernt werden,
// da wir es durch die 'as any' Assertion umgehen.
// interface LocalPaymentMethodDataCard {
//   type: 'card';
//   billing_details?: Stripe.PaymentMethodCreateParams.BillingDetails;
// }


export async function POST(request: NextRequest) {
  if (!stripe) {
    console.error("[API /create-payment-intent] Stripe wurde nicht initialisiert, da STRIPE_SECRET_KEY fehlt.");
    return NextResponse.json({ error: 'Stripe-Konfiguration auf dem Server fehlt.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    console.log("[API /create-payment-intent] Request Body empfangen:", body);

    const {
      amount,
      currency = 'eur',
      connectedAccountId,
      platformFee,
      taskId,
      firebaseUserId,
      stripeCustomerId,
      paymentMethodId,
      confirmPaymentMethod = true,
      billingDetails,
    } = body;

    console.log("[API /create-payment-intent] Stripe-Key beginnt mit:", stripeSecret?.slice(0, 10));
    console.log("[API /create-payment-intent] ConnectedAccountId aus Request Body:", connectedAccountId);

    // Validierung der empfangenen Daten
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Ungültiger Betrag. Muss eine positive Zahl sein.' }, { status: 400 });
    }
    if (typeof currency !== 'string' || currency.length !== 3) {
      return NextResponse.json({ error: 'Ungültige Währung.' }, { status: 400 });
    }
    if (!connectedAccountId || typeof connectedAccountId !== 'string' || !connectedAccountId.startsWith('acct_')) {
      return NextResponse.json({ error: 'Ungültige Connected Account ID. Muss mit "acct_" beginnen.' }, { status: 400 });
    }
    if (typeof platformFee !== 'number' || platformFee < 0 || platformFee >= amount) {
      return NextResponse.json({ error: 'Ungültige Plattformgebühr. Muss eine positive Zahl sein und kleiner als der Gesamtbetrag.' }, { status: 400 });
    }
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({ error: 'Ungültige Task-ID (tempJobDraftId).' }, { status: 400 });
    }
    if (!firebaseUserId || typeof firebaseUserId !== 'string') {
      return NextResponse.json({ error: 'Ungültige Firebase User ID.' }, { status: 400 });
    }
    if (!stripeCustomerId || typeof stripeCustomerId !== 'string' || !stripeCustomerId.startsWith('cus_')) {
      return NextResponse.json({ error: 'Ungültige Stripe Customer ID. Muss mit "cus_" beginnen.' }, { status: 400 });
    }

    if (paymentMethodId && (typeof paymentMethodId !== 'string' || !paymentMethodId.startsWith('pm_'))) {
      return NextResponse.json({ error: 'Ungültige PaymentMethod ID. Muss mit "pm_" beginnen.' }, { status: 400 });
    }

    console.log("[API /create-payment-intent] DEBUG ConnectedAccountId für Stripe (aus Request Body):", `"${connectedAccountId}"`, "Länge:", connectedAccountId.length);

    // --- WARTE-LOGIK FÜR CONNECTED ACCOUNT READINESS (unverändert) ---
    let currentConnectedAccount: Stripe.Account | null = null;
    let attempts = 0;
    const maxAttempts = 15;
    const delayMs = 2000;

    while (attempts < maxAttempts && currentConnectedAccount === null) {
      try {
        currentConnectedAccount = await stripe.accounts.retrieve(connectedAccountId);

        console.log(`[API /create-payment-intent] Versuch ${attempts + 1}/${maxAttempts}. Readiness für ${connectedAccountId}:`,
          `charges_enabled: ${currentConnectedAccount.charges_enabled},`,
          `payouts_enabled: ${currentConnectedAccount.payouts_enabled}`
        );

        if (currentConnectedAccount.charges_enabled && currentConnectedAccount.payouts_enabled) {
          console.log(`[API /create-payment-intent] Connected Account ${connectedAccountId} ist bereit (charges_enabled & payouts_enabled sind true).`);
          break;
        } else {
          await new Promise(resolve => setTimeout(resolve, delayMs));
          attempts++;
        }
      } catch (retrieveError: unknown) {
        let errorMessage = "Unbekannter Fehler beim Abrufen des Connected Accounts.";
        if (retrieveError instanceof Stripe.errors.StripeError) {
          errorMessage = retrieveError.message;
          console.warn(`[API /create-payment-intent] Stripe Fehler beim Abrufen des Connected Accounts ${connectedAccountId} (Versuch ${attempts + 1}):`, errorMessage, retrieveError.type, retrieveError.code);
          if (retrieveError.type === 'StripeInvalidRequestError' && retrieveError.code === 'resource_missing') {
            console.error(`[API /create-payment-intent] Ressource nicht gefunden (Connected Account existiert nicht oder Zugriff verweigert). Beende Warteversuche.`);
            currentConnectedAccount = null;
            break;
          }
          if (retrieveError.type === 'StripeAuthenticationError') {
            console.error(`[API /create-payment-intent] Authentifizierungsfehler mit Stripe API Key. Beende Warteversuche.`);
            currentConnectedAccount = null;
            break;
          }
        } else if (retrieveError instanceof Error) {
          errorMessage = retrieveError.message;
          console.warn(`[API /create-payment-intent] Allgemeiner Fehler beim Abrufen des Connected Accounts ${connectedAccountId} (Versuch ${attempts + 1}):`, errorMessage);
        } else {
          console.warn(`[API /create-payment-intent] Unbekannter Fehler-Typ beim Abrufen des Connected Accounts ${connectedAccountId} (Versuch ${attempts + 1}):`, retrieveError);
        }

        await new Promise(resolve => setTimeout(resolve, delayMs));
        attempts++;
      }
    }

    if (!currentConnectedAccount ||
      !currentConnectedAccount.charges_enabled ||
      !currentConnectedAccount.payouts_enabled) {

      let reason = "ist nicht bereit für Zahlungen oder Auszahlungen.";
      if (currentConnectedAccount) {
        reason = `hat nicht die nötigen Berechtigungen (charges_enabled: ${currentConnectedAccount.charges_enabled}, payouts_enabled: ${currentConnectedAccount.payouts_enabled}).`;
      } else if (currentConnectedAccount === null) {
        reason = `Konto konnte nicht abgerufen werden (möglicherweise nicht existent oder Zugriffsproblem).`;
      }

      console.error(`[API /create-payment-intent] Connected Account ${connectedAccountId} ${reason}`);
      return NextResponse.json({
        error: `Zahlung nicht möglich. Das Anbieter-Konto (${connectedAccountId}) ${reason}`,
        details: 'connected_account_not_ready',
        stripeErrorType: 'api_error'
      }, { status: 500 });
    }
    // --- ENDE DER WARTE-LOGIK ---

    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: amount,
      currency: currency,
      customer: stripeCustomerId,
      application_fee_amount: platformFee,
      transfer_data: {
        destination: connectedAccountId,
      },
      confirm: confirmPaymentMethod,
      setup_future_usage: 'off_session',
      payment_method: paymentMethodId || undefined,
      // FEHLER BEHOBEN: Casting zu 'any'
      payment_method_data: billingDetails ? ({
        type: 'card',
        billing_details: billingDetails
      } as any) : undefined, // 
      metadata: {
        tempJobDraftId: taskId,
        firebaseUserId: firebaseUserId
      }
    };

    console.log("[API /create-payment-intent] Erstelle PaymentIntent mit Parametern:", JSON.stringify(paymentIntentParams, null, 2));
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
    console.log("[API /create-payment-intent] PaymentIntent erstellt:", paymentIntent.id);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error: unknown) {
    let errorMessage = 'Interner Serverfehler beim Erstellen des PaymentIntents.';
    let stripeErrorCode: string | null = null;
    let stripeErrorType: string | null = null;
    let rawErrorDetails: Stripe.StripeRawError | null = null;

    if (error instanceof Stripe.errors.StripeError) {
      console.error("[API /create-payment-intent] StripeError:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      errorMessage = `Stripe Fehler: ${error.message}`;
      stripeErrorCode = error.code || null;
      stripeErrorType = error.type;
      const raw = error.raw as Stripe.StripeRawError;
      if (raw && typeof raw.type === 'string') {
        rawErrorDetails = raw;
      }
    } else if (error instanceof Error) {
      console.error("[API /create-payment-intent] Generic Error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      errorMessage = error.message;
    } else {
      console.error("[API /create-payment-intent] Unknown Error:", JSON.stringify(error, null, 2));
    }

    return NextResponse.json({
      error: errorMessage,
      details: stripeErrorCode,
      stripeErrorType: stripeErrorType,
      raw: rawErrorDetails
    }, { status: 500 });
  }
}