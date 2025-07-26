// /Users/andystaudinger/Tasko/src/app/api/release-platform-funds/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

/**
 * PLATFORM FUNDS RELEASE: Überträgt gehaltene Gelder an die Firma
 * Diese Route wird aufgerufen, wenn beide Parteien das Projekt als erledigt markiert haben.
 * Ersetzt das alte "Escrow-System" durch echte Platform-to-Provider Transfers.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API /release-platform-funds] Starting platform funds release...');

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
      console.error('[API /release-platform-funds] Firebase init error:', error);
      return NextResponse.json({ error: 'Firebase initialization failed' }, { status: 500 });
    }

    const body = await request.json();
    const { orderId, paymentIntentIds } = body;

    console.log('[API /release-platform-funds] Request data:', {
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
            'Platform-Freigabe nicht möglich. Beide Parteien müssen das Projekt als erledigt markieren.',
          customerComplete: projectCompletion?.customerMarkedComplete || false,
          providerComplete: projectCompletion?.providerMarkedComplete || false,
        },
        { status: 400 }
      );
    }

    // Prüfe ob Platform-Freigabe bereits durchgeführt wurde
    if (projectCompletion.platformReleaseInitiated) {
      return NextResponse.json(
        { error: 'Platform-Freigabe wurde bereits durchgeführt.' },
        { status: 400 }
      );
    }

    const completedTransfers: Array<{
      paymentIntentId: string;
      transferId: string;
      amount: number;
      status: string;
    }> = [];
    const failedTransfers: Array<{
      paymentIntentId: string;
      error: string;
    }> = [];

    // Gehe durch alle PaymentIntents und erstelle Transfers an Provider
    for (const paymentIntentId of paymentIntentIds) {
      try {
        console.log(`[API /release-platform-funds] Processing PaymentIntent: ${paymentIntentId}`);

        // Hole PaymentIntent Details um Provider Account ID zu bekommen
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        const providerStripeAccountId = paymentIntent.metadata?.providerStripeAccountId;
        const companyReceives = parseInt(paymentIntent.metadata?.companyReceives || '0');

        if (!providerStripeAccountId) {
          throw new Error('Provider Stripe Account ID not found in PaymentIntent metadata');
        }

        if (companyReceives <= 0) {
          throw new Error('Invalid company amount in PaymentIntent metadata');
        }

        console.log(
          `[API /release-platform-funds] Creating transfer: ${companyReceives} cents to ${providerStripeAccountId}`
        );

        // Erstelle Transfer vom Platform Account zum Provider Account
        const transfer = await stripe.transfers.create({
          amount: companyReceives,
          currency: 'eur',
          destination: providerStripeAccountId,
          metadata: {
            orderId,
            paymentIntentId,
            type: 'platform_funds_release',
            originalAmount: paymentIntent.metadata?.additionalAmount || '0',
            platformFee: paymentIntent.metadata?.platformFee || '0',
          },
          description: `Platform-Freigabe für Auftrag ${orderId} - zusätzliche Stunden`,
        });

        console.log(`[API /release-platform-funds] Successfully created transfer: ${transfer.id}`);

        completedTransfers.push({
          paymentIntentId,
          transferId: transfer.id,
          amount: companyReceives,
          status: 'completed', // Transfers sind normalerweise sofort completed
        });
      } catch (error: any) {
        console.error(`[API /release-platform-funds] Error processing ${paymentIntentId}:`, error);

        failedTransfers.push({
          paymentIntentId,
          error: error.message,
        });
      }
    }

    // Update TimeEntries status von 'platform_held' zu 'platform_released'
    const updatedTimeEntries = orderData.timeTracking.timeEntries.map((entry: any) => {
      if (
        entry.platformHoldStatus === 'held' &&
        completedTransfers.some(
          transfer => transfer.paymentIntentId === entry.platformHoldPaymentIntentId
        )
      ) {
        const transfer = completedTransfers.find(
          t => t.paymentIntentId === entry.platformHoldPaymentIntentId
        );
        return {
          ...entry,
          status: 'platform_released',
          platformHoldStatus: 'transferred',
          transferId: transfer?.transferId,
          transferredAt: new Date(),
        };
      }
      return entry;
    });

    // Update PlatformHoldPaymentIntents status (falls trackiert)
    const updatedPlatformHoldPaymentIntents = (
      orderData.timeTracking.platformHoldPaymentIntents || []
    ).map((holdPI: any) => {
      const transfer = completedTransfers.find(t => t.paymentIntentId === holdPI.id);
      if (transfer) {
        return {
          ...holdPI,
          status: 'transferred',
          transferId: transfer.transferId,
          transferredAt: new Date(),
        };
      }
      return holdPI;
    });

    // Update ProjectCompletionStatus
    const updatedProjectCompletion = {
      ...projectCompletion,
      platformReleaseInitiated: true,
      platformReleaseAt: new Date(),
    };

    // Update Auftrag
    await orderRef.update({
      'timeTracking.timeEntries': updatedTimeEntries,
      'timeTracking.platformHoldPaymentIntents': updatedPlatformHoldPaymentIntents,
      'timeTracking.projectCompletionStatus': updatedProjectCompletion,
      'timeTracking.status': 'completed',
      'timeTracking.lastUpdated': new Date(),
    });

    console.log(
      `[API /release-platform-funds] Successfully completed ${completedTransfers.length} transfers`
    );

    return NextResponse.json({
      success: true,
      completedTransfers,
      failedTransfers,
      totalTransferred: completedTransfers.reduce((sum, transfer) => sum + transfer.amount, 0),
      message: `${completedTransfers.length} Transfers erfolgreich durchgeführt. Gelder wurden an die Firma ausgezahlt.`,
    });
  } catch (error: unknown) {
    let errorMessage = 'Interner Serverfehler beim Freigeben der Platform-Gelder.';

    if (error instanceof Stripe.errors.StripeError) {
      console.error(
        '[API /release-platform-funds] StripeError:',
        JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      );
      errorMessage = `Stripe Platform-Freigabe Fehler: ${error.message}`;
    } else if (error instanceof Error) {
      console.error('[API /release-platform-funds] Error:', error.message);
      errorMessage = `Platform-Freigabe Fehler: ${error.message}`;
    } else {
      console.error('[API /release-platform-funds] Unknown error:', error);
    }

    return NextResponse.json(
      {
        error: errorMessage,
        timestamp: new Date().toISOString(),
        endpoint: '/api/release-platform-funds',
      },
      { status: 500 }
    );
  }
}
