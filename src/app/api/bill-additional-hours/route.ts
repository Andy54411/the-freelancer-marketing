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

            // Migriere die ID zur users collection (Server-Side)
            try {
              await db.collection('users').doc(orderData.selectedAnbieterId).update({
                stripeConnectAccountId: fallbackStripeAccountId,
                migratedFromUsers: true,
                migratedAt: new Date(),
              });
              console.log(
                '[API /bill-additional-hours] Successfully migrated Stripe Account ID to users collection'
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
      (entry: {
        id: string;
        category: string;
        status: string;
        billableAmount?: number;
        hours: number;
      }) =>
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
      (sum: number, entry: { billableAmount?: number }) => sum + (entry.billableAmount || 0),
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

    // IMPROVED SYSTEM: Direct Transfer mit Platform Fee
    // Kunde zahlt Gesamtbetrag, Provider erhält sofort den Betrag minus Platform Fee
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'eur',
      customer: customerStripeId,
      application_fee_amount: platformFee, // Platform behält nur die Gebühr
      transfer_data: {
        destination: providerStripeAccountId, // Provider erhält Geld sofort
      },
      confirm: false,
      capture_method: 'automatic',
      setup_future_usage: 'off_session',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: {
        orderId,
        type: 'additional_hours_direct_transfer', // Neuer Typ für direkten Transfer
        entryIds: approvedEntryIds.join(','),
        providerStripeAccountId,
        totalHours: approvedEntries
          .reduce((sum: number, entry: { hours: number }) => sum + entry.hours, 0)
          .toString(),
        originalOrderAmount: orderData.jobCalculatedPriceInCents?.toString() || '0',
        additionalAmount: totalAmount.toString(),
        platformFee: platformFee.toString(),
        companyReceives: companyAmount.toString(),
        transferType: 'direct', // Kennzeichnet direkten Transfer
      },
      description: `Zusätzliche Arbeitsstunden für Auftrag ${orderId} - Direktüberweisung`,
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
      additionalHours: approvedEntries.reduce(
        (sum: number, entry: { hours: number }) => sum + entry.hours,
        0
      ),
      transferType: 'direct', // Direkter Transfer statt Platform Hold
      message:
        'PaymentIntent für zusätzliche Stunden erfolgreich erstellt. Provider erhält Geld automatisch nach Zahlung.',
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
