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

    // 2. Suche in Stripe nach PaymentIntent oder anderen Objekten
    if (paymentIntentId) {
      try {
        // Erkenne verschiedene Stripe-Objekt-Typen basierend auf Präfix
        if (paymentIntentId.startsWith('pi_')) {
          // PaymentIntent
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          debugInfo.results.paymentIntent = {
            id: paymentIntent.id,
            type: 'PaymentIntent',
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            metadata: paymentIntent.metadata,
            created: new Date(paymentIntent.created * 1000).toISOString(),
          };
        } else if (paymentIntentId.startsWith('py_')) {
          // PaymentMethod
          const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntentId);
          debugInfo.results.paymentIntent = {
            id: paymentMethod.id,
            type: 'PaymentMethod',
            type_detail: paymentMethod.type,
            created: new Date(paymentMethod.created * 1000).toISOString(),
            metadata: paymentMethod.metadata,
            customer: paymentMethod.customer,
          };
        } else if (paymentIntentId.startsWith('ch_')) {
          // Charge
          const charge = await stripe.charges.retrieve(paymentIntentId);
          debugInfo.results.paymentIntent = {
            id: charge.id,
            type: 'Charge',
            status: charge.status,
            amount: charge.amount,
            currency: charge.currency,
            metadata: charge.metadata,
            created: new Date(charge.created * 1000).toISOString(),
            payment_intent: charge.payment_intent,
          };
        } else if (paymentIntentId.startsWith('in_')) {
          // Invoice
          const invoice = await stripe.invoices.retrieve(paymentIntentId);
          debugInfo.results.paymentIntent = {
            id: invoice.id,
            type: 'Invoice',
            status: invoice.status,
            amount_due: invoice.amount_due,
            currency: invoice.currency,
            metadata: invoice.metadata,
            created: new Date(invoice.created * 1000).toISOString(),
          };
        } else {
          // Fallback: Versuche als PaymentIntent
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          debugInfo.results.paymentIntent = {
            id: paymentIntent.id,
            type: 'PaymentIntent (fallback)',
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            metadata: paymentIntent.metadata,
            created: new Date(paymentIntent.created * 1000).toISOString(),
          };
        }
      } catch (error) {
        debugInfo.results.paymentIntent = {
          error: error instanceof Error ? error.message : 'Stripe object not found',
          searchedId: paymentIntentId,
          detectedType: paymentIntentId.startsWith('pi_')
            ? 'PaymentIntent'
            : paymentIntentId.startsWith('py_')
              ? 'PaymentMethod'
              : paymentIntentId.startsWith('ch_')
                ? 'Charge'
                : paymentIntentId.startsWith('in_')
                  ? 'Invoice'
                  : 'Unknown',
        };
      }
    }

    // 3. Suche nach Transfers für diesen PaymentIntent oder Account
    try {
      let allTransfers: any[] = [];

      if (connectAccountId) {
        // Suche nach Transfers zu diesem Connect Account
        const transfersToAccount = await stripe.transfers.list({
          limit: 100,
          destination: connectAccountId,
        });
        allTransfers = transfersToAccount.data;
      } else if (paymentIntentId) {
        // Da wir nicht direkt nach PaymentIntent filtern können,
        // laden wir alle letzten Transfers und filtern clientseitig
        const recentTransfers = await stripe.transfers.list({
          limit: 100,
        });

        // Erweiterte Filterlogik für verschiedene Stripe-Objekt-Typen
        allTransfers = recentTransfers.data.filter(transfer => {
          // Direkte ID-Übereinstimmung
          if (
            transfer.metadata?.paymentIntentId === paymentIntentId ||
            transfer.metadata?.payment_intent_id === paymentIntentId ||
            transfer.metadata?.paymentMethod === paymentIntentId ||
            transfer.metadata?.chargeId === paymentIntentId ||
            transfer.metadata?.invoiceId === paymentIntentId
          ) {
            return true;
          }

          // Beschreibung enthält die ID
          if (transfer.description?.includes(paymentIntentId)) {
            return true;
          }

          // Source Transaction Übereinstimmung
          if (transfer.source_transaction === paymentIntentId) {
            return true;
          }

          // Für PaymentMethod (py_): Suche nach entsprechenden PaymentIntents
          if (paymentIntentId.startsWith('py_')) {
            // Könnte in anderen Metadaten-Feldern gespeichert sein
            return Object.values(transfer.metadata || {}).some(
              value => typeof value === 'string' && value.includes(paymentIntentId)
            );
          }

          return false;
        });
      } else {
        // Fallback: Lade letzte Transfers
        const recentTransfers = await stripe.transfers.list({
          limit: 20,
        });
        allTransfers = recentTransfers.data;
      }

      debugInfo.results.transfers = {
        found: allTransfers.length,
        transfers: allTransfers.map(transfer => ({
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
      let failedTransfersSnapshot;
      let searchStrategy = '';

      if (orderId) {
        failedTransfersSnapshot = await db
          .collection('failedTransfers')
          .where('orderId', '==', orderId)
          .get();
        searchStrategy = 'orderId';
      } else if (paymentIntentId) {
        // Primäre Suche nach paymentIntentId
        failedTransfersSnapshot = await db
          .collection('failedTransfers')
          .where('paymentIntentId', '==', paymentIntentId)
          .get();
        searchStrategy = 'paymentIntentId';

        // Falls keine Ergebnisse und es ist ein PaymentMethod (py_), erweiterte Suche
        if (failedTransfersSnapshot.empty && paymentIntentId.startsWith('py_')) {
          // Suche in allen Failed Transfers nach diesem PaymentMethod in anderen Feldern
          const allFailedTransfers = await db.collection('failedTransfers').limit(100).get();

          const matchingDocs = allFailedTransfers.docs.filter(doc => {
            const data = doc.data();
            return JSON.stringify(data).includes(paymentIntentId);
          });

          failedTransfersSnapshot = {
            docs: matchingDocs,
            size: matchingDocs.length,
            empty: matchingDocs.length === 0,
          } as any;
          searchStrategy = 'paymentMethod (extended search)';
        }
      } else if (connectAccountId) {
        failedTransfersSnapshot = await db
          .collection('failedTransfers')
          .where('providerStripeAccountId', '==', connectAccountId)
          .get();
        searchStrategy = 'connectAccountId';
      } else {
        failedTransfersSnapshot = await db.collection('failedTransfers').limit(10).get();
        searchStrategy = 'recent (limit 10)';
      }

      debugInfo.results.failedTransfers = {
        found: failedTransfersSnapshot.size,
        searchStrategy: searchStrategy,
        transfers: failedTransfersSnapshot.docs.map((doc: any) => ({
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
