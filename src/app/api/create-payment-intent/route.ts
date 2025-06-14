// src/app/api/create-payment-intent/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';

const stripeSecret = process.env.STRIPE_SECRET_KEY;

if (!stripeSecret) {
  console.error("FATAL_ERROR: Die Umgebungsvariable STRIPE_SECRET_KEY ist nicht gesetzt für die API Route /api/create-payment-intent.");
}

const stripe = stripeSecret ? new Stripe(stripeSecret, {
  apiVersion: '2024-06-20', // Stelle sicher, dass dies die aktuelle Stripe API Version ist
}) : null;

export async function POST(request: NextRequest) {
  // DEBUGGING: Logge den Beginn der Anfrage
  console.log("[API /create-payment-intent] POST Anfrage empfangen.");

  if (!stripe) {
    console.error("[API /create-payment-intent] Stripe wurde nicht initialisiert, da STRIPE_SECRET_KEY fehlt.");
    return NextResponse.json({ error: 'Stripe-Konfiguration auf dem Server fehlt.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    console.log("[API /create-payment-intent] Request Body empfangen:", JSON.stringify(body, null, 2));

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

    console.log("[API /create-payment-intent] Stripe-Key beginnt mit:", stripeSecret?.slice(0, 10));
    console.log("[API /create-payment-intent] ConnectedAccountId aus Request Body:", connectedAccountId);
    console.log("[API /create-payment-intent] JobPriceInCents aus Request Body:", jobPriceInCents); // NEU: Log

    // Validierung der empfangenen Daten mit detaillierteren Logs
    // ANPASSUNG: amount wird nun später gegen backend-berechneten Wert validiert
    if (typeof amount !== 'number' || amount <= 0) {
      console.error("[API /create-payment-intent] Validierungsfehler: Ungültiger oder fehlender Betrag (amount).", { amount });
      return NextResponse.json({ error: 'Ungültiger Betrag (amount). Muss eine positive Zahl sein.' }, { status: 400 });
    }
    // NEU: Validierung für jobPriceInCents
    if (typeof jobPriceInCents !== 'number' || jobPriceInCents <= 0) {
      console.error("[API /create-payment-intent] Validierungsfehler: Ungültiger oder fehlender Basispreis (jobPriceInCents).", { jobPriceInCents });
      return NextResponse.json({ error: 'Ungültiger Basispreis. Muss eine positive Zahl sein.' }, { status: 400 });
    }
    if (typeof currency !== 'string' || currency.length !== 3) {
      console.error("[API /create-payment-intent] Validierungsfehler: Ungültige Währung.", { currency });
      return NextResponse.json({ error: 'Ungültige Währung.' }, { status: 400 });
    }
    if (!connectedAccountId || typeof connectedAccountId !== 'string' || !connectedAccountId.startsWith('acct_')) {
      console.error("[API /create-payment-intent] Validierungsfehler: Ungültige Connected Account ID.", { connectedAccountId });
      return NextResponse.json({ error: 'Ungültige Connected Account ID. Muss mit "acct_" beginnen.' }, { status: 400 });
    }
    // ANPASSUNG: Entfernung der Validierung für `platformFee`, da sie nicht mehr direkt empfangen wird.
    if (!taskId || typeof taskId !== 'string') {
      console.error("[API /create-payment-intent] Validierungsfehler: Ungültige Task-ID (tempJobDraftId).", { taskId });
      return NextResponse.json({ error: 'Ungültige Task-ID (tempJobDraftId).' }, { status: 400 });
    }
    if (!firebaseUserId || typeof firebaseUserId !== 'string') {
      console.error("[API /create-payment-intent] Validierungsfehler: Ungültige Firebase User ID.", { firebaseUserId });
      return NextResponse.json({ error: 'Ungültige Firebase User ID.' }, { status: 400 });
    }
    if (!stripeCustomerId || typeof stripeCustomerId !== 'string' || !stripeCustomerId.startsWith('cus_')) {
      console.error("[API /create-payment-intent] Validierungsfehler: Ungültige Stripe Customer ID.", { stripeCustomerId });
      return NextResponse.json({ error: 'Ungültige Stripe Customer ID. Muss mit "cus_" beginnen.' }, { status: 400 });
    }
    // NEU: Validierung für billingDetails
    if (!billingDetails || !billingDetails.address?.line1 || !billingDetails.address?.postal_code || !billingDetails.address?.city || !billingDetails.address?.country) {
      console.error("[API /create-payment-intent] Validierungsfehler: Unvollständige Rechnungsadresse.", { billingDetails });
      return NextResponse.json({ error: 'Vollständige Rechnungsadresse ist erforderlich.' }, { status: 400 });
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
          console.log(`[API /create-payment-intent] Connected Account ${connectedAccountId} ist noch nicht bereit. Warte ${delayMs / 1000} Sekunden.`);
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

    // ANPASSUNG: Gebührenlogik im Backend neu berechnen und validieren
    const SELLER_COMMISSION_RATE = 0.125; // 12.5% Provision für Verkäufer
    const BUYER_SERVICE_FEE_RATE = 0.045; // 4.5% Servicegebühr für Käufer

    const calculatedBuyerServiceFee = Math.round(jobPriceInCents * BUYER_SERVICE_FEE_RATE);
    const totalAmountToChargeBuyer = jobPriceInCents + calculatedBuyerServiceFee;

    // WICHTIGE VALIDIERUNG: Prüfen, ob der vom Frontend gesendete `amount` mit dem Backend-berechneten `totalAmountToChargeBuyer` übereinstimmt
    if (amount !== totalAmountToChargeBuyer) {
      console.error(`[API /create-payment-intent] BETRAGS-INKONSISTENZ: Frontend amount (${amount}) stimmt nicht mit Backend calculated amount (${totalAmountToChargeBuyer}) überein.`);
      return NextResponse.json({ error: 'Fehler bei der Betragsüberprüfung. Bitte versuchen Sie es erneut.' }, { status: 400 });
    }

    const platformCommissionFromSeller = Math.round(jobPriceInCents * SELLER_COMMISSION_RATE);
    const totalApplicationFee = platformCommissionFromSeller + calculatedBuyerServiceFee;

    console.log(`[API /create-payment-intent] Backend-Berechnungen:`);
    console.log(`  Basispreis (jobPriceInCents): ${jobPriceInCents} Cents`);
    console.log(`  Käufer-Servicegebühr (calculatedBuyerServiceFee): ${calculatedBuyerServiceFee} Cents`);
    console.log(`  Gesamtbetrag für Käufer (totalAmountToChargeBuyer): ${totalAmountToChargeBuyer} Cents`);
    console.log(`  Verkäufer-Provision (platformCommissionFromSeller): ${platformCommissionFromSeller} Cents`);
    console.log(`  Gesamt-Plattformgebühr (totalApplicationFee): ${totalApplicationFee} Cents`);


    console.log(`[API /create-payment-intent] Konfiguriere PaymentIntent für Client-seitige Bestätigung (keine Weiterleitungen).`);

    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: totalAmountToChargeBuyer, // Der Gesamtbetrag, den der Käufer zahlt
      currency: currency,
      customer: stripeCustomerId,
      application_fee_amount: totalApplicationFee, // Die Gesamtgebühr für eure Plattform
      transfer_data: {
        destination: connectedAccountId, // Der Restbetrag geht an den Dienstleister
      },
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
        originalJobPriceInCents: jobPriceInCents.toString(), // Als String speichern, da Metadaten Strings sind
        buyerServiceFeeInCents: calculatedBuyerServiceFee.toString(),
        sellerCommissionInCents: platformCommissionFromSeller.toString(),
        totalPlatformFeeInCents: totalApplicationFee.toString(),
        // Optional: Weitere billingDetails hier hinzufügen, wenn sie für Webhooks relevant sind
        // billingName: billingDetails?.name,
        // billingEmail: billingDetails?.email,
        // billingPostalCode: billingDetails?.address?.postal_code,
      }
    };

    console.log("[API /create-payment-intent] Erstelle PaymentIntent mit Parametern:", JSON.stringify(paymentIntentParams, null, 2));
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
    console.log("[API /create-payment-intent] PaymentIntent erfolgreich erstellt:", paymentIntent.id);

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
      console.error("[API /create-payment-intent] StripeError im Catch-Block:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      errorMessage = `Stripe Fehler: ${error.message}`;
      stripeErrorCode = error.code || null;
      stripeErrorType = error.type;
      const raw = error.raw as Stripe.StripeRawError;
      if (raw && typeof raw.type === 'string') {
        rawErrorDetails = raw;
      }
    } else if (error instanceof Error) {
      console.error("[API /create-payment-intent] Allgemeiner Fehler im Catch-Block:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      errorMessage = error.message;
    } else {
      console.error("[API /create-payment-intent] Unbekannter Fehler im Catch-Block:", JSON.stringify(error, null, 2));
    }

    return NextResponse.json({
      error: errorMessage,
      details: stripeErrorCode,
      stripeErrorType: stripeErrorType,
      raw: rawErrorDetails
    }, { status: 500 });
  }
}