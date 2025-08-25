import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

/**
 * LEGACY ORDER RELEASE: Für Aufträge vor dem Platform-Hold-System
 * Diese API behandelt alte Aufträge, die vor der Escrow-Implementierung erstellt wurden
 */
export async function POST(request: NextRequest) {
  try {

    const body = await request.json();
    const { orderId, forceRelease = false } = body;

    // Validierung
    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId ist erforderlich.' },
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
    const timeTracking = orderData?.timeTracking;

    if (!timeTracking) {
      return NextResponse.json({ error: 'Zeiterfassung nicht gefunden.' }, { status: 404 });
    }

    // Prüfe ob Auftrag abgeschlossen ist
    if (orderData.status !== 'ABGESCHLOSSEN' && !forceRelease) {
      return NextResponse.json(
        { error: 'Auftrag muss abgeschlossen sein für Legacy-Release.' },
        { status: 400 }
      );
    }

    // Hole Provider Stripe Account ID
    const providerId = orderData.providerId;
    if (!providerId) {
      return NextResponse.json({ error: 'Provider ID nicht gefunden.' }, { status: 404 });
    }

    const providerDoc = await db.collection('users').doc(providerId).get();
    if (!providerDoc.exists) {
      return NextResponse.json({ error: 'Provider nicht gefunden.' }, { status: 404 });
    }

    const providerData = providerDoc.data();
    const providerStripeAccountId = providerData?.stripeAccountId;

    if (!providerStripeAccountId) {
      return NextResponse.json(
        { error: 'Provider hat kein Stripe Connect Account.' },
        { status: 400 }
      );
    }

    // Analysiere TimeEntries für bezahlte aber nicht transferierte Stunden
    const timeEntries = timeTracking.timeEntries || [];
    const pendingTransfers: Array<{
      entryId: string;
      paymentIntentId?: string;
      hours: number;
      amount: number;
      status: string;
    }> = [];

    let totalPendingAmount = 0;

    // Finde alle bezahlten zusätzlichen Stunden ohne Transfer
    timeEntries.forEach((entry: any) => {
      if (
        entry.category === 'additional' &&
        (entry.status === 'billing_pending' ||
         entry.status === 'customer_approved' ||
         entry.billingStatus === 'paid' ||
         entry.paymentIntentId) && // Hat PaymentIntent = wurde bezahlt
        !entry.transferId && // Aber noch nicht transferiert
        !entry.transferredAt
      ) {
        const hours = entry.hours || 0;
        const rate = entry.hourlyRate || orderData.hourlyRate || 0;
        const amount = Math.round(hours * rate * 100); // In Cent

        pendingTransfers.push({
          entryId: entry.id || Math.random().toString(),
          paymentIntentId: entry.paymentIntentId,
          hours,
          amount,
          status: entry.status
        });

        totalPendingAmount += amount;
      }
    });

    if (pendingTransfers.length === 0) {
      return NextResponse.json({
        message: 'Keine ausstehenden Transfers für diesen Legacy-Auftrag gefunden.',
        orderId,
        status: 'no_pending_transfers'
      });
    }

    // Erstelle einen einzigen Transfer für alle ausstehenden Beträge
    const completedTransfers: Array<{
      entryId: string;
      transferId: string;
      amount: number;
    }> = [];
    const failedTransfers: Array<{
      entryId: string;
      error: string;
    }> = [];

    try {
      if (totalPendingAmount > 0) {

        // Erstelle Transfer vom Platform Account zum Provider Account
        const transfer = await stripe.transfers.create({
          amount: totalPendingAmount,
          currency: 'eur',
          destination: providerStripeAccountId,
          metadata: {
            orderId,
            type: 'legacy_order_release',
            entryCount: pendingTransfers.length.toString(),
            entryIds: pendingTransfers.map(t => t.entryId).join(','),
            originalOrderDate: orderData.createdAt || 'unknown',
            legacyFix: 'true'
          },
          description: `Legacy-Freigabe für Auftrag ${orderId} - ${pendingTransfers.length} Einträge (${(totalPendingAmount / 100).toFixed(2)} EUR)`,
        });

        // Markiere alle Einträge als transferiert
        pendingTransfers.forEach(pendingTransfer => {
          completedTransfers.push({
            entryId: pendingTransfer.entryId,
            transferId: transfer.id,
            amount: pendingTransfer.amount
          });
        });
      }
    } catch (error: any) {

      pendingTransfers.forEach(pendingTransfer => {
        failedTransfers.push({
          entryId: pendingTransfer.entryId,
          error: error.message
        });
      });
    }

    // Update TimeEntries mit Transfer-Informationen
    if (completedTransfers.length > 0) {
      const updatedTimeEntries = timeEntries.map((entry: any) => {
        const completedTransfer = completedTransfers.find(t => t.entryId === entry.id);

        if (completedTransfer) {
          return {
            ...entry,
            status: 'transferred',
            billingStatus: 'transferred',
            transferId: completedTransfer.transferId,
            transferredAt: new Date().toISOString(),
            legacyTransfer: true,
            transferNote: 'Legacy order transfer - manual release'
          };
        }
        return entry;
      });

      // Update Firestore
      await orderRef.update({
        'timeTracking.timeEntries': updatedTimeEntries,
        'timeTracking.legacyReleaseCompleted': true,
        'timeTracking.legacyReleaseAt': new Date().toISOString(),
        'timeTracking.lastUpdated': new Date().toISOString()
      });

    }

    const response = {
      success: true,
      orderId,
      message: 'Legacy order release completed',
      totalAmount: totalPendingAmount,
      completedTransfers: completedTransfers.length,
      failedTransfers: failedTransfers.length,
      transfers: completedTransfers,
      errors: failedTransfers
    };

    return NextResponse.json(response);

  } catch (error) {

    return NextResponse.json(
      { error: 'Unerwarteter Fehler bei Legacy-Order-Release.' },
      { status: 500 }
    );
  }
}
