// /Users/andystaudinger/Tasko/src/app/api/escrow-additional-hours/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

/**
 * ESCROW-SYSTEM: Autorisiert PaymentIntent für zusätzliche Stunden
 * Das Geld wird vom Kunden autorisiert/gehalten, aber NICHT sofort an die Firma ausgezahlt.
 * Auszahlung erfolgt erst nach beidseitiger Projektabnahme.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API /escrow-additional-hours] Starting escrow authorization...');

    // Initialize Firebase Admin - Simple direct initialization
    let db: any;
    try {
      if (getApps().length === 0) {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (serviceAccountKey && serviceAccountKey !== 'undefined') {
          const serviceAccount = JSON.parse(serviceAccountKey);
          const projectId = serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID;

          if (projectId) {
            initializeApp({
              credential: cert(serviceAccount),
              projectId: projectId,
            });
          }
        }
      }
      db = getFirestore();
    } catch (error) {
      console.error('[API /escrow-additional-hours] Firebase init error:', error);
      return NextResponse.json({ error: 'Firebase initialization failed' }, { status: 500 });
    }

    const body = await request.json();
    const { orderId, approvedEntryIds, customerStripeId, providerStripeAccountId } = body;

    console.log('[API /escrow-additional-hours] Request data:', {
      orderId,
      approvedEntryIds,
      customerStripeId: customerStripeId ? '***' : 'missing',
      providerStripeAccountId: providerStripeAccountId ? '***' : 'missing',
    });

    // Validierung
    if (
      !orderId ||
      !approvedEntryIds ||
      !Array.isArray(approvedEntryIds) ||
      approvedEntryIds.length === 0
    ) {
      return NextResponse.json(
        {
          error: 'Fehlende oder ungültige Parameter: orderId, approvedEntryIds sind erforderlich.',
        },
        { status: 400 }
      );
    }

    if (!customerStripeId || !providerStripeAccountId) {
      return NextResponse.json(
        { error: 'Stripe Customer ID und Provider Connect Account ID sind erforderlich.' },
        { status: 400 }
      );
    }

    // Hole Auftragsdaten
    const orderRef = db.collection('auftraege').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Auftrag nicht gefunden.' }, { status: 404 });
    }

    const orderData = orderDoc.data();
    if (!orderData?.timeTracking) {
      return NextResponse.json({ error: 'Zeiterfassung nicht gefunden.' }, { status: 404 });
    }

    // Finde genehmigte zusätzliche Zeiteinträge
    const approvedEntries = orderData.timeTracking.timeEntries.filter(
      (entry: any) =>
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
      (sum: number, entry: any) => sum + (entry.billableAmount || 0),
      0
    );

    if (totalAmount <= 0) {
      return NextResponse.json(
        { error: 'Kein abrechnungsfähiger Betrag gefunden.' },
        { status: 400 }
      );
    }

    console.log(
      `[API /escrow-additional-hours] Erstelle ESCROW PaymentIntent für ${totalAmount} Cents`
    );

    // Berechne Plattformgebühr (4.5% - wird bei Auszahlung an Company abgezogen)
    const platformFee = Math.round(totalAmount * 0.045);
    const companyAmount = totalAmount - platformFee;

    // ESCROW: Erstelle PaymentIntent mit capture_method: 'manual'
    // Dies autorisiert das Geld, zieht es aber NICHT sofort ein
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'eur',
      customer: customerStripeId,
      capture_method: 'manual', // KRITISCH: Geld wird nur autorisiert, nicht eingezogen
      application_fee_amount: platformFee,
      transfer_data: {
        destination: providerStripeAccountId,
        amount: companyAmount,
      },
      confirm: false,
      setup_future_usage: 'off_session',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: {
        orderId,
        type: 'escrow_additional_hours',
        escrow: 'true',
        entryIds: approvedEntryIds.join(','),
        totalHours: approvedEntries
          .reduce((sum: number, entry: any) => sum + entry.hours, 0)
          .toString(),
        originalOrderAmount: orderData.jobCalculatedPriceInCents?.toString() || '0',
        additionalAmount: totalAmount.toString(),
        platformFee: platformFee.toString(),
        companyReceives: companyAmount.toString(),
      },
      description: `ESCROW: Zusätzliche Arbeitsstunden für Auftrag ${orderId} (Freigabe nach Projektabnahme)`,
    });

    console.log(
      '[API /escrow-additional-hours] ESCROW PaymentIntent erfolgreich erstellt:',
      paymentIntent.id
    );

    return NextResponse.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      customerPays: totalAmount,
      companyReceives: companyAmount,
      platformFee: platformFee,
      additionalHours: approvedEntries.reduce((sum: number, entry: any) => sum + entry.hours, 0),
      escrowStatus: 'authorized', // Geld ist autorisiert/gehalten
      message: 'ESCROW PaymentIntent erstellt. Geld wird nach Projektabnahme freigegeben.',
    });
  } catch (error: unknown) {
    let errorMessage = 'Interner Serverfehler beim Erstellen des ESCROW PaymentIntents.';
    let stripeErrorCode: string | null = null;
    let stripeErrorType: string | null = null;

    if (error instanceof Stripe.errors.StripeError) {
      console.error(
        '[API /escrow-additional-hours] StripeError:',
        JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      );
      errorMessage = `Stripe ESCROW Fehler: ${error.message}`;
      stripeErrorCode = error.code || null;
      stripeErrorType = error.type || null;
    } else if (error instanceof Error) {
      console.error('[API /escrow-additional-hours] Error:', error.message);
      errorMessage = `ESCROW Fehler: ${error.message}`;
    } else {
      console.error('[API /escrow-additional-hours] Unknown error:', error);
    }

    return NextResponse.json(
      {
        error: errorMessage,
        stripeErrorCode,
        stripeErrorType,
        timestamp: new Date().toISOString(),
        endpoint: '/api/escrow-additional-hours',
      },
      { status: 500 }
    );
  }
}
