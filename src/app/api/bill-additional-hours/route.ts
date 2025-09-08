// API Route für die Abrechnung zusätzlicher Stunden über Stripe
import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/firebase/server';

// Stripe initialization
function getStripeInstance() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret) {
    console.error('❌ STRIPE_SECRET_KEY ist nicht in den Umgebungsvariablen definiert');
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

    const { orderId, approvedEntryIds } = body;

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

    console.log('📋 Processing bill-additional-hours for:', { orderId, approvedEntryIds });

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

    // Customer Stripe ID aus dem Order-Dokument laden
    const customerStripeId = orderData.stripeCustomerId;
    if (!customerStripeId || !customerStripeId.startsWith('cus_')) {
      return NextResponse.json({ error: 'Ungültige Kunde Stripe ID.' }, { status: 400 });
    }

    // Provider Stripe Account ID aus dem Order-Dokument laden
    let providerStripeAccountId = orderData.anbieterStripeAccountId;

    // Fallback: Versuche Provider-ID aus companies collection zu holen
    if (!providerStripeAccountId || !providerStripeAccountId.startsWith('acct_')) {
      console.log('⚠️ Keine Provider Stripe Account ID im Order, versuche Fallback...');

      try {
        const providerDoc = await db
          .collection('companies')
          .doc(orderData.selectedAnbieterId)
          .get();
        const providerData = providerDoc.data();
        const fallbackStripeAccountId =
          providerData?.stripeConnectAccountId || providerData?.stripeAccountId;

        if (fallbackStripeAccountId && fallbackStripeAccountId.startsWith('acct_')) {
          providerStripeAccountId = fallbackStripeAccountId;
          console.log('✅ Fallback Provider Stripe Account ID gefunden:', providerStripeAccountId);
        } else {
          console.error('❌ Keine gültige Provider Stripe Account ID gefunden');
          return NextResponse.json(
            { error: 'Provider-Benutzer nicht gefunden oder Stripe Connect nicht eingerichtet.' },
            { status: 404 }
          );
        }
      } catch (fallbackError) {
        console.error('❌ Fehler beim Laden der Provider-Daten:', fallbackError);
        return NextResponse.json(
          { error: 'Fehler beim Prüfen der Provider Stripe-Konfiguration.' },
          { status: 500 }
        );
      }
    }

    // Finde genehmigte zusätzliche Zeiteinträge (customer_approved)
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
        entry.status === 'customer_approved'
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

    // Berechne Plattformgebühr (4.5% - wird bei Auszahlung an Company abgezogen)
    const platformFee = Math.round(totalAmount * 0.045);

    // Company erhält den Betrag minus Plattformgebühr
    const companyAmount = totalAmount - platformFee;

    console.log('💰 Payment Details:', {
      totalAmount,
      platformFee,
      companyAmount,
      approvedEntries: approvedEntries.length,
    });

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
        type: 'mobile_hourly_payment', // Neuer Typ für mobile hourly payments
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

    console.log('✅ PaymentIntent created:', paymentIntent.id);

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
      orderId: orderId,
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
      console.error('❌ Stripe Error:', error);
      errorMessage = `Stripe Fehler: ${error.message}`;
      stripeErrorCode = error.code || null;
      stripeErrorType = error.type;
    } else if (error instanceof Error) {
      console.error('❌ General Error:', error);
      errorMessage = error.message;
    } else {
      console.error('❌ Unknown Error:', error);
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
