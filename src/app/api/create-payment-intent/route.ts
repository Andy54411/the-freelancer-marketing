// src/app/api/create-payment-intent/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';

// Stripe initialization moved to runtime to avoid build-time errors
function getStripeInstance() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret) {

    return null;
  }

  return new Stripe(stripeSecret, {
    apiVersion: '2024-06-20', // Stelle sicher, dass dies die aktuelle Stripe API Version ist
  });
}

export async function POST(request: NextRequest) {
  // DEBUGGING: Logge den Beginn der Anfrage

  const stripe = getStripeInstance();
  if (!stripe) {

    return NextResponse.json(
      { error: 'Stripe-Konfiguration auf dem Server fehlt.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    // ANPASSUNG: jobPriceInCents statt platformFee erhalten
    const {
      amount, // Dies ist der vom Frontend übermittelte Gesamtbetrag (totalAmountPayableInCents)
      jobPriceInCents, // NEU: Der Basispreis des Dienstleisters vom Frontend
      currency = 'eur',
      connectedAccountId,
      taskId,
      firebaseUserId,
      stripeCustomerId,
      billingDetails, // Rechnungsdetails, falls für zukünftige Nutzung gespeichert werden
    } = body;

     // NEU: Log

    // Validierung der empfangenen Daten mit detaillierteren Logs
    // ANPASSUNG: amount wird nun später gegen backend-berechneten Wert validiert
    if (typeof amount !== 'number' || amount <= 0) {

      return NextResponse.json(
        { error: 'Ungültiger Betrag (amount). Muss eine positive Zahl sein.' },
        { status: 400 }
      );
    }
    // NEU: Validierung für jobPriceInCents
    if (typeof jobPriceInCents !== 'number' || jobPriceInCents <= 0) {

      return NextResponse.json(
        { error: 'Ungültiger Basispreis. Muss eine positive Zahl sein.' },
        { status: 400 }
      );
    }
    if (typeof currency !== 'string' || currency.length !== 3) {

      return NextResponse.json({ error: 'Ungültige Währung.' }, { status: 400 });
    }
    if (
      !connectedAccountId ||
      typeof connectedAccountId !== 'string' ||
      !connectedAccountId.startsWith('acct_')
    ) {

      return NextResponse.json(
        { error: 'Ungültige Connected Account ID. Muss mit "acct_" beginnen.' },
        { status: 400 }
      );
    }
    // ANPASSUNG: Entfernung der Validierung für `platformFee`, da sie nicht mehr direkt empfangen wird.
    if (!taskId || typeof taskId !== 'string') {

      return NextResponse.json({ error: 'Ungültige Task-ID (tempJobDraftId).' }, { status: 400 });
    }
    if (!firebaseUserId || typeof firebaseUserId !== 'string') {

      return NextResponse.json({ error: 'Ungültige Firebase User ID.' }, { status: 400 });
    }
    if (
      !stripeCustomerId ||
      typeof stripeCustomerId !== 'string' ||
      !stripeCustomerId.startsWith('cus_')
    ) {

      return NextResponse.json(
        { error: 'Ungültige Stripe Customer ID. Muss mit "cus_" beginnen.' },
        { status: 400 }
      );
    }
    // NEU: Validierung für billingDetails
    if (
      !billingDetails ||
      !billingDetails.address?.line1 ||
      !billingDetails.address?.postal_code ||
      !billingDetails.address?.city ||
      !billingDetails.address?.country
    ) {

      return NextResponse.json(
        { error: 'Vollständige Rechnungsadresse ist erforderlich.' },
        { status: 400 }
      );
    }

    // --- WARTE-LOGIK FÜR CONNECTED ACCOUNT READINESS (unverändert) ---
    let currentConnectedAccount: Stripe.Account | null = null;
    let attempts = 0;
    const maxAttempts = 15;
    const delayMs = 2000;

    while (attempts < maxAttempts && currentConnectedAccount === null) {
      try {
        currentConnectedAccount = await stripe.accounts.retrieve(connectedAccountId);

        if (currentConnectedAccount.charges_enabled && currentConnectedAccount.payouts_enabled) {

          break;
        } else {

          await new Promise(resolve => setTimeout(resolve, delayMs));
          attempts++;
        }
      } catch (retrieveError: unknown) {
        let errorMessage = 'Unbekannter Fehler beim Abrufen des Connected Accounts.';
        if (retrieveError instanceof Stripe.errors.StripeError) {
          errorMessage = retrieveError.message;

          if (
            retrieveError.type === 'StripeInvalidRequestError' &&
            retrieveError.code === 'resource_missing'
          ) {

            currentConnectedAccount = null;
            break;
          }
          if (retrieveError.type === 'StripeAuthenticationError') {

            currentConnectedAccount = null;
            break;
          }
        } else if (retrieveError instanceof Error) {
          errorMessage = retrieveError.message;

        } else {

        }

        await new Promise(resolve => setTimeout(resolve, delayMs));
        attempts++;
      }
    }

    if (
      !currentConnectedAccount ||
      !currentConnectedAccount.charges_enabled ||
      !currentConnectedAccount.payouts_enabled
    ) {
      let reason = 'ist nicht bereit für Zahlungen oder Auszahlungen.';
      if (currentConnectedAccount) {
        reason = `hat nicht die nötigen Berechtigungen (charges_enabled: ${currentConnectedAccount.charges_enabled}, payouts_enabled: ${currentConnectedAccount.payouts_enabled}).`;
      } else if (currentConnectedAccount === null) {
        reason = `Konto konnte nicht abgerufen werden (möglicherweise nicht existent oder Zugriffsproblem).`;
      }

      return NextResponse.json(
        {
          error: `Zahlung nicht möglich. Das Anbieter-Konto (${connectedAccountId}) ${reason}`,
          details: 'connected_account_not_ready',
          stripeErrorType: 'api_error',
        },
        { status: 500 }
      );
    }
    // --- ENDE DER WARTE-LOGIK ---

    // ANPASSUNG: Neue Gebührenlogik, bei der die Gebühr vom Dienstleister getragen wird.
    const SELLER_SERVICE_FEE_RATE = 0.045; // 4.5% Servicegebühr, die vom Verkäufer (Dienstleister) getragen wird.

    // Der Gesamtbetrag, den der Käufer zahlt, ist jetzt einfach der jobPriceInCents.
    const totalAmountToChargeBuyer = jobPriceInCents;

    // WICHTIGE VALIDIERUNG: Der vom Frontend gesendete Betrag MUSS dem Basispreis entsprechen.
    if (amount !== totalAmountToChargeBuyer) {

      return NextResponse.json(
        { error: 'Fehler bei der Betragsüberprüfung. Bitte versuchen Sie es erneut.' },
        { status: 400 }
      );
    }

    // Die Plattformgebühr (application_fee_amount) ist nun die Gebühr, die vom Verkäufer abgezogen wird.
    const totalApplicationFee = Math.round(jobPriceInCents * SELLER_SERVICE_FEE_RATE);

    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: totalAmountToChargeBuyer, // Der Gesamtbetrag, den der Käufer zahlt
      currency: currency,
      customer: stripeCustomerId,
      application_fee_amount: totalApplicationFee, // Die Gesamtgebühr für eure Plattform
      // ✅ CONTROLLED PAYOUT: Keine transfer_data = Geld bleibt auf Platform für manuelle Auszahlung
      // ENTFERNT: transfer_data für kontrollierte Payouts
      confirm: false, // PaymentIntent wird NICHT sofort bestätigt
      setup_future_usage: 'off_session', // Karte für zukünftige Zahlungen speichern
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // Verhindert Weiterleitungen
      },
      metadata: {
        tempJobDraftId: taskId,
        firebaseUserId: firebaseUserId,
        // NEU: Detaillierte Preiskomponenten in den Metadaten speichern
        originalJobPriceInCents: jobPriceInCents.toString(),
        buyerServiceFeeInCents: '0', // Käufer zahlt keine Gebühr mehr
        sellerCommissionInCents: totalApplicationFee.toString(), // Die Gebühr des Verkäufers
        totalPlatformFeeInCents: totalApplicationFee.toString(),
        // Optional: Weitere billingDetails hier hinzufügen, wenn sie für Webhooks relevant sind
        // billingName: billingDetails?.name,
        // billingEmail: billingDetails?.email,
        // billingPostalCode: billingDetails?.address?.postal_code,
      },
    };

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

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

      errorMessage = `Stripe Fehler: ${error.message}`;
      stripeErrorCode = error.code || null;
      stripeErrorType = error.type;
      const raw = error.raw as Stripe.StripeRawError;
      if (raw && typeof raw.type === 'string') {
        rawErrorDetails = raw;
      }
    } else if (error instanceof Error) {

      errorMessage = error.message;
    } else {

    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: stripeErrorCode,
        stripeErrorType: stripeErrorType,
        raw: rawErrorDetails,
      },
      { status: 500 }
    );
  }
}
