// src/app/api/create-payment-intent/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';

// Stripe initialization moved to runtime to avoid build-time errors
function getStripeInstance() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret) {
    console.error('[PaymentIntent] STRIPE_SECRET_KEY nicht gesetzt');
    return null;
  }

  return new Stripe(stripeSecret, {
    apiVersion: '2024-06-20',
  });
}

export async function POST(request: NextRequest) {
  console.log('[PaymentIntent] Request gestartet');
  
  const stripe = getStripeInstance();
  if (!stripe) {
    console.error('[PaymentIntent] Stripe nicht initialisiert');
    return NextResponse.json(
      { error: 'Stripe-Konfiguration auf dem Server fehlt.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    console.log('[PaymentIntent] Request body:', JSON.stringify({
      amount: body.amount,
      jobPriceInCents: body.jobPriceInCents,
      connectedAccountId: body.connectedAccountId,
      taskId: body.taskId,
      hasStripeCustomerId: !!body.stripeCustomerId,
      hasBillingDetails: !!body.billingDetails,
    }));

    // ANPASSUNG: jobPriceInCents statt platformFee erhalten
    const {
      amount,
      jobPriceInCents,
      currency = 'eur',
      connectedAccountId,
      taskId,
      firebaseUserId,
      stripeCustomerId,
      billingDetails,
    } = body;

    // Validierung der empfangenen Daten
    if (typeof amount !== 'number' || amount <= 0) {
      console.error('[PaymentIntent] Ungueltiger amount:', amount);
      return NextResponse.json(
        { error: 'Ungueltiger Betrag (amount). Muss eine positive Zahl sein.' },
        { status: 400 }
      );
    }
    if (typeof jobPriceInCents !== 'number' || jobPriceInCents <= 0) {
      console.error('[PaymentIntent] Ungueltiger jobPriceInCents:', jobPriceInCents);
      return NextResponse.json(
        { error: 'Ungueltiger Basispreis. Muss eine positive Zahl sein.' },
        { status: 400 }
      );
    }
    if (typeof currency !== 'string' || currency.length !== 3) {
      console.error('[PaymentIntent] Ungueltige currency:', currency);
      return NextResponse.json({ error: 'Ungueltige Waehrung.' }, { status: 400 });
    }
    if (
      !connectedAccountId ||
      typeof connectedAccountId !== 'string' ||
      !connectedAccountId.startsWith('acct_')
    ) {
      console.error('[PaymentIntent] Ungueltige connectedAccountId:', connectedAccountId);
      return NextResponse.json(
        { error: 'Ungueltige Connected Account ID. Muss mit "acct_" beginnen.' },
        { status: 400 }
      );
    }
    if (!taskId || typeof taskId !== 'string') {
      console.error('[PaymentIntent] Ungueltige taskId:', taskId);
      return NextResponse.json({ error: 'Ungueltige Task-ID (tempJobDraftId).' }, { status: 400 });
    }
    if (!firebaseUserId || typeof firebaseUserId !== 'string') {
      console.error('[PaymentIntent] Ungueltige firebaseUserId:', firebaseUserId);
      return NextResponse.json({ error: 'Ungueltige Firebase User ID.' }, { status: 400 });
    }
    if (
      !stripeCustomerId ||
      typeof stripeCustomerId !== 'string' ||
      !stripeCustomerId.startsWith('cus_')
    ) {
      console.error('[PaymentIntent] Ungueltige stripeCustomerId:', stripeCustomerId);
      return NextResponse.json(
        { error: 'Ungueltige Stripe Customer ID. Muss mit "cus_" beginnen.' },
        { status: 400 }
      );
    }
    // Validierung fuer billingDetails
    if (
      !billingDetails ||
      !billingDetails.address?.line1 ||
      !billingDetails.address?.postal_code ||
      !billingDetails.address?.city ||
      !billingDetails.address?.country
    ) {
      console.error('[PaymentIntent] Ungueltige billingDetails:', JSON.stringify(billingDetails));
      return NextResponse.json(
        { error: 'Vollstaendige Rechnungsadresse ist erforderlich.' },
        { status: 400 }
      );
    }

    console.log('[PaymentIntent] Validierung erfolgreich, pruefe Connected Account:', connectedAccountId);

    // --- WARTE-LOGIK FUER CONNECTED ACCOUNT READINESS ---
    let currentConnectedAccount: Stripe.Account | null = null;
    let attempts = 0;
    const maxAttempts = 5; // Reduziert von 15 auf 5 fuer schnellere Fehlerantwort
    const delayMs = 1000; // Reduziert von 2000 auf 1000ms

    while (attempts < maxAttempts) {
      try {
        console.log(`[PaymentIntent] Account-Versuch ${attempts + 1}/${maxAttempts}`);
        currentConnectedAccount = await stripe.accounts.retrieve(connectedAccountId);

        if (currentConnectedAccount.charges_enabled && currentConnectedAccount.payouts_enabled) {
          console.log('[PaymentIntent] Connected Account bereit');
          break;
        } else {
          console.log(`[PaymentIntent] Account nicht bereit - charges: ${currentConnectedAccount.charges_enabled}, payouts: ${currentConnectedAccount.payouts_enabled}`);
          if (attempts < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
          attempts++;
        }
      } catch (retrieveError: unknown) {
        console.error('[PaymentIntent] Fehler beim Account-Abruf:', retrieveError);
        
        if (retrieveError instanceof Stripe.errors.StripeError) {
          // Connected Account hat Zugriff widerrufen oder existiert nicht
          if (
            retrieveError.type === 'StripePermissionError' ||
            retrieveError.code === 'account_invalid' ||
            retrieveError.statusCode === 403
          ) {
            console.error('[PaymentIntent] Connected Account ungueltig - Zugriff widerrufen oder nicht existent');
            return NextResponse.json(
              { 
                error: 'Der Anbieter hat sein Zahlungskonto nicht korrekt verbunden. Bitte kontaktieren Sie den Anbieter.',
                code: 'CONNECTED_ACCOUNT_INVALID',
                details: 'Der Anbieter muss sein Stripe-Konto erneut mit Taskilo verbinden.'
              },
              { status: 400 }
            );
          }

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
      let reason = 'ist nicht bereit fuer Zahlungen oder Auszahlungen.';
      if (currentConnectedAccount) {
        reason = `hat nicht die noetigen Berechtigungen (charges_enabled: ${currentConnectedAccount.charges_enabled}, payouts_enabled: ${currentConnectedAccount.payouts_enabled}).`;
      } else if (currentConnectedAccount === null) {
        reason = `Konto konnte nicht abgerufen werden (moeglicherweise nicht existent oder Zugriffsproblem).`;
      }
      
      console.error('[PaymentIntent] Connected Account nicht bereit:', reason);

      return NextResponse.json(
        {
          error: `Zahlung nicht moeglich. Das Anbieter-Konto (${connectedAccountId}) ${reason}`,
          details: 'connected_account_not_ready',
          stripeErrorType: 'api_error',
        },
        { status: 500 }
      );
    }
    // --- ENDE DER WARTE-LOGIK ---

    console.log('[PaymentIntent] Lade Job Draft:', taskId);

    // Lade temporaryJobDraft um customerType zu ermitteln
    const { db } = await import('@/firebase/server');

    if (!db) {
      console.error('[PaymentIntent] Firebase DB nicht verfuegbar');
      return NextResponse.json({ error: 'Server-Konfigurationsfehler' }, { status: 500 });
    }

    // Lade Job Draft fuer B2B/B2C Logik
    const jobDraftDoc = await db!.collection('temporaryJobDrafts').doc(taskId).get();
    if (!jobDraftDoc.exists) {
      console.error('[PaymentIntent] Job Draft nicht gefunden:', taskId);
      return NextResponse.json({ error: 'Job-Entwurf nicht gefunden' }, { status: 404 });
    }

    const jobDraftData = jobDraftDoc.data();
    console.log('[PaymentIntent] Job Draft geladen, customerType:', jobDraftData?.customerType);
    
    const customerType = jobDraftData?.customerType || 'private';
    const isB2B = customerType === 'business';
    const _isB2C = customerType === 'private';

    // B2B/B2C spezifische Gebuehrenlogik
    const SELLER_SERVICE_FEE_RATE = isB2B ? 0.035 : 0.045; // B2B: 3.5%, B2C: 4.5%

    // Der Gesamtbetrag, den der Kaeufer zahlt, ist jetzt einfach der jobPriceInCents.
    const totalAmountToChargeBuyer = jobPriceInCents;

    // WICHTIGE VALIDIERUNG: Der vom Frontend gesendete Betrag MUSS dem Basispreis entsprechen.
    if (amount !== totalAmountToChargeBuyer) {
      console.error('[PaymentIntent] Betrags-Mismatch:', { amount, totalAmountToChargeBuyer });
      return NextResponse.json(
        { error: 'Fehler bei der Betragsueberpruefung. Bitte versuchen Sie es erneut.' },
        { status: 400 }
      );
    }

    // Die Plattformgebuehr ist die Gebuehr, die vom Verkaeufer abgezogen wird.
    const totalApplicationFee = Math.round(jobPriceInCents * SELLER_SERVICE_FEE_RATE);

    // Fuer Stripe Connect verwenden wir destination charges
    const amountForProvider = jobPriceInCents - totalApplicationFee;

    console.log('[PaymentIntent] Erstelle PaymentIntent:', {
      amount: totalAmountToChargeBuyer,
      amountForProvider,
      totalApplicationFee,
      connectedAccountId,
    });

    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: totalAmountToChargeBuyer,
      currency: currency,
      customer: stripeCustomerId,
      transfer_data: {
        destination: connectedAccountId,
        amount: amountForProvider,
      },
      confirm: false,
      setup_future_usage: 'off_session',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: {
        tempJobDraftId: taskId,
        firebaseUserId: firebaseUserId,
        customerType: customerType,
        businessModel: jobDraftData?.businessModel || (isB2B ? 'project_based' : 'fixed_price'),
        originalJobPriceInCents: jobPriceInCents.toString(),
        buyerServiceFeeInCents: '0',
        sellerCommissionInCents: totalApplicationFee.toString(),
        sellerCommissionRate: SELLER_SERVICE_FEE_RATE.toString(),
        totalPlatformFeeInCents: totalApplicationFee.toString(),
        amountForProvider: amountForProvider.toString(),
        paymentTerms: jobDraftData?.paymentTerms || (isB2B ? 'net_14' : 'immediate'),
        invoiceRequired: jobDraftData?.invoiceRequired?.toString() || (isB2B ? 'true' : 'false'),
        taxHandling: jobDraftData?.taxHandling || (isB2B ? 'business' : 'consumer'),
        // billingPostalCode: billingDetails?.address?.postal_code,
      },
    };

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
    
    console.log('[PaymentIntent] Erfolgreich erstellt:', paymentIntent.id);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: unknown) {
    console.error('[PaymentIntent] Fehler:', error);
    
    let errorMessage = 'Interner Serverfehler beim Erstellen des PaymentIntents.';
    let stripeErrorCode: string | null = null;
    let stripeErrorType: string | null = null;
    let rawErrorDetails: Stripe.StripeRawError | null = null;

    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = `Stripe Fehler: ${error.message}`;
      stripeErrorCode = error.code || null;
      stripeErrorType = error.type;
      console.error('[PaymentIntent] Stripe Error Details:', {
        type: error.type,
        code: error.code,
        message: error.message,
      });
      const raw = error.raw as Stripe.StripeRawError;
      if (raw && typeof raw.type === 'string') {
        rawErrorDetails = raw;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
      console.error('[PaymentIntent] Error Message:', error.message);
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
