// /Users/andystaudinger/Tasko/src/app/api/release-platform-funds/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
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
    const body = await request.json();
    const { orderId, paymentIntentIds } = body;

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
    const orderRef = db!.collection('auftraege').doc(orderId);
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

        completedTransfers.push({
          paymentIntentId,
          transferId: transfer.id,
          amount: companyReceives,
          status: 'completed', // Transfers sind normalerweise sofort completed
        });
      } catch (error: any) {
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
      errorMessage = `Stripe Platform-Freigabe Fehler: ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage = `Platform-Freigabe Fehler: ${error.message}`;
    } else {
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
