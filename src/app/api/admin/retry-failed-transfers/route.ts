// src/app/api/admin/retry-failed-transfers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db, admin } from '@/firebase/server';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    })
  : null;

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { success: false, error: 'Stripe nicht konfiguriert' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { transferIds } = body;

    if (!transferIds || !Array.isArray(transferIds)) {
      return NextResponse.json(
        { success: false, error: 'transferIds array required' },
        { status: 400 }
      );
    }

    const results: Array<{
      transferId: string;
      success: boolean;
      error?: string;
      message?: string;
      newTransferId?: string;
      amount?: number;
      orderId?: string;
    }> = [];

    for (const transferId of transferIds) {
      try {
        // Lade failed transfer data
        const failedTransferDoc = await db.collection('failedTransfers').doc(transferId).get();

        if (!failedTransferDoc.exists) {
          results.push({
            transferId,
            success: false,
            error: 'Failed transfer not found',
          });
          continue;
        }

        const failedTransferData = failedTransferDoc.data()!;

        // Überprüfe, ob bereits erfolgreich
        if (failedTransferData.status === 'completed') {
          results.push({
            transferId,
            success: true,
            message: 'Already completed',
          });
          continue;
        }

        // Versuche Transfer erneut
        const transfer = await stripe.transfers.create({
          amount: failedTransferData.amount,
          currency: 'eur',
          destination: failedTransferData.providerStripeAccountId,
          description: `Retry: Zusätzliche Arbeitsstunden für Auftrag ${failedTransferData.orderId}`,
          metadata: {
            type: 'additional_hours_platform_hold_retry',
            orderId: failedTransferData.orderId,
            paymentIntentId: failedTransferData.paymentIntentId,
            originalFailedTransferId: transferId,
          },
        });

        // Update failed transfer status
        await db
          .collection('failedTransfers')
          .doc(transferId)
          .update({
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            successfulTransferId: transfer.id,
            retryCount: (failedTransferData.retryCount || 0) + 1,
          });

        // Update company document
        const companyRef = db
          .collection('companies')
          .where('anbieterStripeAccountId', '==', failedTransferData.providerStripeAccountId)
          .limit(1);
        const companySnapshot = await companyRef.get();

        if (!companySnapshot.empty) {
          const companyDoc = companySnapshot.docs[0];
          await companyDoc.ref.update({
            lastTransferId: transfer.id,
            lastTransferAt: admin.firestore.FieldValue.serverTimestamp(),
            lastTransferAmount: failedTransferData.amount,
            lastTransferOrderId: failedTransferData.orderId,
          });
        }

        results.push({
          transferId,
          success: true,
          newTransferId: transfer.id,
          amount: failedTransferData.amount,
          orderId: failedTransferData.orderId,
        });

        console.log(
          `[RETRY SUCCESS] Failed transfer ${transferId} successfully retried as ${transfer.id}`
        );
      } catch (error) {
        console.error(`[RETRY ERROR] Failed to retry transfer ${transferId}:`, error);

        // Update retry count
        try {
          const failedTransferDoc = await db.collection('failedTransfers').doc(transferId).get();
          if (failedTransferDoc.exists) {
            const currentRetryCount = failedTransferDoc.data()?.retryCount || 0;
            await db
              .collection('failedTransfers')
              .doc(transferId)
              .update({
                retryCount: currentRetryCount + 1,
                lastRetryAt: admin.firestore.FieldValue.serverTimestamp(),
                lastRetryError: error instanceof Error ? error.message : 'Unknown error',
              });
          }
        } catch (updateError) {
          console.error(`[RETRY ERROR] Failed to update retry count:`, updateError);
        }

        results.push({
          transferId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      totalProcessed: transferIds.length,
      successCount: results.filter(r => r.success).length,
      errorCount: results.filter(r => !r.success).length,
    });
  } catch (error) {
    console.error('[RETRY ERROR] General error retrying failed transfers:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending_retry';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Lade failed transfers
    let query = db.collection('failedTransfers').where('status', '==', status);

    if (limit > 0) {
      query = query.limit(limit);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();

    const failedTransfers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
      lastRetryAt: doc.data().lastRetryAt?.toDate?.()?.toISOString(),
      completedAt: doc.data().completedAt?.toDate?.()?.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      failedTransfers,
      total: failedTransfers.length,
    });
  } catch (error) {
    console.error('[FAILED TRANSFERS] Error fetching failed transfers:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
