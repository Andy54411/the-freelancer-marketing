// src/app/api/admin/debug-transfers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/firebase/server';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    })
  : null;

export async function GET(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { success: false, error: 'Stripe nicht konfiguriert' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const paymentIntentId = searchParams.get('paymentIntentId');
    const connectAccountId = searchParams.get('connectAccountId');

    if (!orderId && !paymentIntentId && !connectAccountId) {
      return NextResponse.json(
        { success: false, error: 'orderId, paymentIntentId, or connectAccountId required' },
        { status: 400 }
      );
    }

    const debugInfo: any = {
      searchCriteria: { orderId, paymentIntentId, connectAccountId },
      results: {},
    };

    // 1. Suche in Firestore nach dem Auftrag
    if (orderId) {
      try {
        const orderDoc = await db.collection('auftraege').doc(orderId).get();
        if (orderDoc.exists) {
          const orderData = orderDoc.data()!;
          debugInfo.results.orderData = {
            exists: true,
            status: orderData.status,
            timeTracking: orderData.timeTracking,
            paymentIntentId: orderData.paymentIntentId,
          };
        } else {
          debugInfo.results.orderData = { exists: false };
        }
      } catch (error) {
        debugInfo.results.orderData = {
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // 2. Suche in Stripe nach PaymentIntent
    if (paymentIntentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        debugInfo.results.paymentIntent = {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata,
          created: new Date(paymentIntent.created * 1000).toISOString(),
        };
      } catch (error) {
        debugInfo.results.paymentIntent = {
          error: error instanceof Error ? error.message : 'PaymentIntent not found',
        };
      }
    }

    // 3. Suche nach Transfers für diesen PaymentIntent oder Account
    try {
      const transfersQuery: any = {};

      if (paymentIntentId) {
        transfersQuery['metadata.paymentIntentId'] = paymentIntentId;
      }

      if (connectAccountId) {
        transfersQuery.destination = connectAccountId;
      }

      const transfers = await stripe.transfers.list({
        limit: 100,
        ...transfersQuery,
      });

      debugInfo.results.transfers = {
        found: transfers.data.length,
        transfers: transfers.data.map(transfer => ({
          id: transfer.id,
          amount: transfer.amount,
          currency: transfer.currency,
          destination: transfer.destination,
          created: new Date(transfer.created * 1000).toISOString(),
          description: transfer.description,
          metadata: transfer.metadata,
        })),
      };
    } catch (error) {
      debugInfo.results.transfers = {
        error: error instanceof Error ? error.message : 'Failed to fetch transfers',
      };
    }

    // 4. Suche nach Connect Account Details
    if (connectAccountId) {
      try {
        const account = await stripe.accounts.retrieve(connectAccountId);
        debugInfo.results.connectAccount = {
          id: account.id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          country: account.country,
          default_currency: account.default_currency,
          type: account.type,
        };
      } catch (error) {
        debugInfo.results.connectAccount = {
          error: error instanceof Error ? error.message : 'Connect account not found',
        };
      }
    }

    // 5. Suche nach failed transfers
    try {
      let failedTransfersQuery;

      if (orderId) {
        failedTransfersQuery = db.collection('failedTransfers').where('orderId', '==', orderId);
      } else if (paymentIntentId) {
        failedTransfersQuery = db
          .collection('failedTransfers')
          .where('paymentIntentId', '==', paymentIntentId);
      } else if (connectAccountId) {
        failedTransfersQuery = db
          .collection('failedTransfers')
          .where('providerStripeAccountId', '==', connectAccountId);
      } else {
        failedTransfersQuery = db.collection('failedTransfers').limit(10);
      }

      const failedTransfersSnapshot = await failedTransfersQuery.get();
      debugInfo.results.failedTransfers = {
        found: failedTransfersSnapshot.size,
        transfers: failedTransfersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
          lastRetryAt: doc.data().lastRetryAt?.toDate?.()?.toISOString(),
          completedAt: doc.data().completedAt?.toDate?.()?.toISOString(),
        })),
      };
    } catch (error) {
      debugInfo.results.failedTransfers = {
        error: error instanceof Error ? error.message : 'Failed to fetch failed transfers',
      };
    }

    // 6. Suche nach Company info
    if (connectAccountId) {
      try {
        const companySnapshot = await db
          .collection('companies')
          .where('anbieterStripeAccountId', '==', connectAccountId)
          .limit(1)
          .get();

        if (!companySnapshot.empty) {
          const companyData = companySnapshot.docs[0].data();
          debugInfo.results.company = {
            id: companySnapshot.docs[0].id,
            anbieterStripeAccountId: companyData.anbieterStripeAccountId,
            platformHoldBalance: companyData.platformHoldBalance,
            lastTransferId: companyData.lastTransferId,
            lastTransferAt: companyData.lastTransferAt?.toDate?.()?.toISOString(),
            lastTransferAmount: companyData.lastTransferAmount,
            lastTransferOrderId: companyData.lastTransferOrderId,
          };
        } else {
          debugInfo.results.company = { found: false };
        }
      } catch (error) {
        debugInfo.results.company = {
          error: error instanceof Error ? error.message : 'Failed to fetch company',
        };
      }
    }

    return NextResponse.json({
      success: true,
      debug: debugInfo,
    });
  } catch (error) {
    console.error('[DEBUG TRANSFERS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
