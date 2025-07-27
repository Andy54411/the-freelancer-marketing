// API Route für die Abrechnung zusätzlicher Stunden über Stripe
import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/firebase/server';

// Stripe initialization
function getStripeInstance() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret) {
    console.error(
      'FATAL_ERROR: Die Umgebungsvariable STRIPE_SECRET_KEY ist nicht gesetzt für die API Route /api/bill-additional-hours.'
    );
    return null;
  }

  return new Stripe(stripeSecret, {
    apiVersion: '2024-06-20',
  });
}

export async function POST(request: NextRequest) {
  console.log('[API /bill-additional-hours] POST Anfrage empfangen.');

  const stripe = getStripeInstance();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe-Konfiguration auf dem Server fehlt.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    console.log(
      '[API /bill-additional-hours] Request Body empfangen:',
      JSON.stringify(body, null, 2)
    );

    const {
      orderId,
      approvedEntryIds,
      customerStripeId,
      providerStripeAccountId: initialProviderStripeAccountId,
    } = body;

    // Validierung
    if (
      !orderId ||
      !approvedEntryIds ||
      !Array.isArray(approvedEntryIds) ||
      approvedEntryIds.length === 0
    ) {
      return NextResponse.json(
        { error: 'Ungültige Parameter: orderId und approvedEntryIds sind erforderlich.' },
        { status: 400 }
      );
    }

    if (!customerStripeId || !customerStripeId.startsWith('cus_')) {
      return NextResponse.json({ error: 'Ungültige Kunde Stripe ID.' }, { status: 400 });
    }

    // Hole Auftragsdaten aus Firebase
    const orderDoc = await db.collection('auftraege').doc(orderId).get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Auftrag nicht gefunden.' }, { status: 404 });
    }

    const orderData = orderDoc.data();

    if (!orderData) {
      return NextResponse.json({ error: 'Auftragsdaten nicht verfügbar.' }, { status: 404 });
    }

    if (!orderData.timeTracking) {
      return NextResponse.json(
        { error: 'Keine Zeiterfassung für diesen Auftrag gefunden.' },
        { status: 404 }
      );
    }

    // Provider Stripe Account ID validieren und ggf. Fallback verwenden
    let providerStripeAccountId = initialProviderStripeAccountId;

    if (!providerStripeAccountId || !providerStripeAccountId.startsWith('acct_')) {
      console.log(
        '[API /bill-additional-hours] Invalid provider Stripe Account ID, checking for fallback...'
      );

      // Versuche Fallback aus users collection zu holen
      try {
        const userDoc = await db.collection('users').doc(orderData.selectedAnbieterId).get();

        if (userDoc.exists) {
          const userData = userDoc.data();
          const fallbackStripeAccountId = userData?.stripeAccountId;

          if (fallbackStripeAccountId && fallbackStripeAccountId.startsWith('acct_')) {
            console.log(
              '[API /bill-additional-hours] Found fallback Stripe Account ID:',
              fallbackStripeAccountId
            );

            // Migriere die ID zur companies collection (Server-Side)
            try {
              await db.collection('companies').doc(orderData.selectedAnbieterId).update({
                stripeConnectAccountId: fallbackStripeAccountId,
                migratedFromUsers: true,
                migratedAt: new Date(),
              });
              console.log(
                '[API /bill-additional-hours] Successfully migrated Stripe Account ID to companies collection'
              );
            } catch (migrationError) {
              console.warn(
                '[API /bill-additional-hours] Could not migrate Stripe Account ID (non-critical):',
                migrationError
              );
            }

            // Verwende Fallback für diese Anfrage
            providerStripeAccountId = fallbackStripeAccountId;
          } else {
            return NextResponse.json(
              {
                error:
                  'Provider hat keine gültige Stripe Account ID (weder in companies noch in users collection).',
              },
              { status: 400 }
            );
          }
        } else {
          return NextResponse.json(
            {
              error: 'Provider-Benutzer nicht gefunden.',
            },
            { status: 404 }
          );
        }
      } catch (fallbackError) {
        console.error(
          '[API /bill-additional-hours] Error checking fallback Stripe Account ID:',
          fallbackError
        );
        return NextResponse.json(
          {
            error: 'Fehler beim Prüfen der Provider Stripe-Konfiguration.',
          },
          { status: 500 }
        );
      }
    }

    // Finde genehmigte zusätzliche Zeiteinträge (customer_approved ODER billing_pending)
    const approvedEntries = orderData.timeTracking.timeEntries.filter(
      (entry: any) =>
        approvedEntryIds.includes(entry.id) &&
        entry.category === 'additional' &&
        (entry.status === 'customer_approved' || entry.status === 'billing_pending')
    );

    if (approvedEntries.length === 0) {
      return NextResponse.json(
        { error: 'Keine genehmigten zusätzlichen Stunden gefunden.' },
        { status: 404 }
      );
    }

    // Berechne Gesamtbetrag
    const totalAmount = approvedEntries.reduce(
      (sum: number, entry: any) => sum + (entry.billableAmount || 0),
      0
    );

    if (totalAmount <= 0) {
      return NextResponse.json(
        { error: 'Kein abrechnungsfähiger Betrag gefunden.' },
        { status: 400 }
      );
    }

    console.log(`[API /bill-additional-hours] Erstelle PaymentIntent für ${totalAmount} Cents`);

    // Berechne Plattformgebühr (4.5% - wird bei Auszahlung an Company abgezogen)
    const platformFee = Math.round(totalAmount * 0.045);

    // Company erhält den Betrag minus Plattformgebühr
    const companyAmount = totalAmount - platformFee;

    // PLATFORM HOLD SYSTEM: Echtes Escrow-System
    // Geld wird SOFORT eingezogen und auf unserem Platform Account gehalten
    // Transfer an Provider erfolgt erst nach Projektabschluss via separaten API-Call
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'eur',
      customer: customerStripeId,
      // KRITISCH: KEIN transfer_data und KEINE application_fee_amount!
      // Geld bleibt komplett auf Platform Account bis zur manuellen Transfer-Freigabe
      confirm: false,
      capture_method: 'automatic', // Sofortige Einziehung = sicheres Geld
      setup_future_usage: 'off_session',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: {
        orderId,
        type: 'additional_hours_platform_hold',
        entryIds: approvedEntryIds.join(','),
        providerStripeAccountId, // Für späteren Transfer
        totalHours: approvedEntries
          .reduce((sum: number, entry: any) => sum + entry.hours, 0)
          .toString(),
        originalOrderAmount: orderData.jobCalculatedPriceInCents?.toString() || '0',
        additionalAmount: totalAmount.toString(),
        platformFee: platformFee.toString(),
        companyReceives: companyAmount.toString(),
        platformHoldEnabled: 'true',
      },
      description: `Zusätzliche Arbeitsstunden (Platform Hold) für Auftrag ${orderId}`,
    });

    console.log(
      '[API /bill-additional-hours] Platform Hold PaymentIntent erfolgreich erstellt:',
      paymentIntent.id
    );

    return NextResponse.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      customerPays: totalAmount, // Kunde zahlt vollen Betrag
      companyReceives: companyAmount, // Company erhält Betrag minus Plattformgebühr
      platformFee: platformFee,
      additionalHours: approvedEntries.reduce((sum: number, entry: any) => sum + entry.hours, 0),
      platformHoldEnabled: true,
      message:
        'Platform Hold PaymentIntent für zusätzliche Stunden erfolgreich erstellt. Geld wird nach Projektabschluss übertragen.',
    });
  } catch (error: unknown) {
    let errorMessage =
      'Interner Serverfehler beim Erstellen des PaymentIntents für zusätzliche Stunden.';
    let stripeErrorCode: string | null = null;
    let stripeErrorType: string | null = null;

    if (error instanceof Stripe.errors.StripeError) {
      console.error(
        '[API /bill-additional-hours] StripeError:',
        JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      );
      errorMessage = `Stripe Fehler: ${error.message}`;
      stripeErrorCode = error.code || null;
      stripeErrorType = error.type;
    } else if (error instanceof Error) {
      console.error(
        '[API /bill-additional-hours] Allgemeiner Fehler:',
        JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      );
      errorMessage = error.message;
    } else {
      console.error(
        '[API /bill-additional-hours] Unbekannter Fehler:',
        JSON.stringify(error, null, 2)
      );
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: stripeErrorCode,
        stripeErrorType: stripeErrorType,
      },
      { status: 500 }
    );
  }
}
