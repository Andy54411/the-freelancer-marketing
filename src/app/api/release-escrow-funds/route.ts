// /Users/andystaudinger/Tasko/src/app/api/release-escrow-funds/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

/**
 * ESCROW-FREIGABE: Gibt gehaltene Gelder an die Firma frei
 * Diese Route wird aufgerufen, wenn beide Parteien das Projekt als erledigt markiert haben.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API /release-escrow-funds] Starting escrow release...');

    // Initialize Firebase Admin
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
      console.error('[API /release-escrow-funds] Firebase init error:', error);
      return NextResponse.json({ error: 'Firebase initialization failed' }, { status: 500 });
    }

    const body = await request.json();
    const { orderId, paymentIntentIds } = body;

    console.log('[API /release-escrow-funds] Request data:', {
      orderId,
      paymentIntentIds,
    });

    // Validierung
    if (
      !orderId ||
      !paymentIntentIds ||
      !Array.isArray(paymentIntentIds) ||
      paymentIntentIds.length === 0
    ) {
      return NextResponse.json(
        {
          error: 'Fehlende oder ungültige Parameter: orderId, paymentIntentIds sind erforderlich.',
        },
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

    // Prüfe ob beide Parteien das Projekt als erledigt markiert haben
    const projectCompletion = orderData.timeTracking.projectCompletionStatus;
    if (!projectCompletion?.bothPartiesComplete) {
      return NextResponse.json(
        {
          error:
            'Escrow-Freigabe nicht möglich. Beide Parteien müssen das Projekt als erledigt markieren.',
          customerComplete: projectCompletion?.customerMarkedComplete || false,
          providerComplete: projectCompletion?.providerMarkedComplete || false,
        },
        { status: 400 }
      );
    }

    // Prüfe ob Escrow-Freigabe bereits durchgeführt wurde
    if (projectCompletion.escrowReleaseInitiated) {
      return NextResponse.json(
        { error: 'Escrow-Freigabe wurde bereits durchgeführt.' },
        { status: 400 }
      );
    }

    const releasedPaymentIntents: Array<{
      id: string;
      amount: number;
      status: string;
    }> = [];
    const failedReleases: Array<{
      id: string;
      error: string;
    }> = [];

    // Gehe durch alle PaymentIntents und gib sie frei
    for (const paymentIntentId of paymentIntentIds) {
      try {
        console.log(`[API /release-escrow-funds] Releasing PaymentIntent: ${paymentIntentId}`);

        // Capture den gehaltenen PaymentIntent (gibt das Geld frei)
        const capturedPaymentIntent = await stripe.paymentIntents.capture(paymentIntentId);

        console.log(`[API /release-escrow-funds] Successfully captured: ${paymentIntentId}`);

        releasedPaymentIntents.push({
          id: paymentIntentId,
          amount: capturedPaymentIntent.amount,
          status: capturedPaymentIntent.status,
        });
      } catch (error: any) {
        console.error(`[API /release-escrow-funds] Error capturing ${paymentIntentId}:`, error);

        failedReleases.push({
          id: paymentIntentId,
          error: error.message,
        });
      }
    }

    // Update TimeEntries status von 'escrow_authorized' zu 'escrow_released'
    const updatedTimeEntries = orderData.timeTracking.timeEntries.map((entry: any) => {
      if (
        entry.escrowStatus === 'authorized' &&
        releasedPaymentIntents.some(pi => pi.id === entry.escrowPaymentIntentId)
      ) {
        return {
          ...entry,
          status: 'escrow_released',
          escrowStatus: 'released',
          escrowReleasedAt: new Date(),
        };
      }
      return entry;
    });

    // Update EscrowPaymentIntents status
    const updatedEscrowPaymentIntents = (orderData.timeTracking.escrowPaymentIntents || []).map(
      (escrowPI: any) => {
        if (releasedPaymentIntents.some(pi => pi.id === escrowPI.id)) {
          return {
            ...escrowPI,
            status: 'released',
            releasedAt: new Date(),
          };
        }
        return escrowPI;
      }
    );

    // Update ProjectCompletionStatus
    const updatedProjectCompletion = {
      ...projectCompletion,
      escrowReleaseInitiated: true,
      escrowReleaseAt: new Date(),
    };

    // Update Auftrag
    await orderRef.update({
      'timeTracking.timeEntries': updatedTimeEntries,
      'timeTracking.escrowPaymentIntents': updatedEscrowPaymentIntents,
      'timeTracking.projectCompletionStatus': updatedProjectCompletion,
      'timeTracking.status': 'completed',
      'timeTracking.lastUpdated': new Date(),
    });

    console.log(
      `[API /release-escrow-funds] Successfully released ${releasedPaymentIntents.length} PaymentIntents`
    );

    return NextResponse.json({
      success: true,
      releasedPaymentIntents,
      failedReleases,
      totalReleased: releasedPaymentIntents.reduce((sum, pi) => sum + pi.amount, 0),
      message: `${releasedPaymentIntents.length} PaymentIntents erfolgreich freigegeben. Gelder wurden an die Firma ausgezahlt.`,
    });
  } catch (error: unknown) {
    let errorMessage = 'Interner Serverfehler beim Freigeben der Escrow-Gelder.';

    if (error instanceof Stripe.errors.StripeError) {
      console.error(
        '[API /release-escrow-funds] StripeError:',
        JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      );
      errorMessage = `Stripe Escrow-Freigabe Fehler: ${error.message}`;
    } else if (error instanceof Error) {
      console.error('[API /release-escrow-funds] Error:', error.message);
      errorMessage = `Escrow-Freigabe Fehler: ${error.message}`;
    } else {
      console.error('[API /release-escrow-funds] Unknown error:', error);
    }

    return NextResponse.json(
      {
        error: errorMessage,
        timestamp: new Date().toISOString(),
        endpoint: '/api/release-escrow-funds',
      },
      { status: 500 }
    );
  }
}
