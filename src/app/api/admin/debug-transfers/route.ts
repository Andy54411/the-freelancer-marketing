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

    // 2. Suche in Stripe nach PaymentIntent oder anderen Objekten (auch in Connect Accounts)
    if (paymentIntentId) {
      try {
        let stripeObjectFound = false;

        // Zuerst versuchen wir es auf dem Haupt-Account
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
              account: 'main',
            };
            stripeObjectFound = true;
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
              account: 'main',
            };
            stripeObjectFound = true;
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
              account: 'main',
            };
            stripeObjectFound = true;
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
              account: 'main',
            };
            stripeObjectFound = true;
          }
        } catch (mainError) {
          console.log('Object not found on main account, trying connect accounts...');
        }

        // Falls nicht auf Haupt-Account gefunden, durchsuche Connect Accounts
        if (!stripeObjectFound) {
          // Lade alle Connect Accounts
          const connectAccounts = await stripe.accounts.list({ limit: 100 });

          for (const account of connectAccounts.data) {
            try {
              if (paymentIntentId.startsWith('pi_')) {
                // PaymentIntent auf Connect Account
                const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
                  stripeAccount: account.id,
                });
                debugInfo.results.paymentIntent = {
                  id: paymentIntent.id,
                  type: 'PaymentIntent',
                  status: paymentIntent.status,
                  amount: paymentIntent.amount,
                  currency: paymentIntent.currency,
                  metadata: paymentIntent.metadata,
                  created: new Date(paymentIntent.created * 1000).toISOString(),
                  account: account.id,
                  account_email: account.email,
                };
                stripeObjectFound = true;
                break;
              } else if (paymentIntentId.startsWith('py_')) {
                // PaymentMethod auf Connect Account
                const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntentId, {
                  stripeAccount: account.id,
                });
                debugInfo.results.paymentIntent = {
                  id: paymentMethod.id,
                  type: 'PaymentMethod',
                  type_detail: paymentMethod.type,
                  created: new Date(paymentMethod.created * 1000).toISOString(),
                  metadata: paymentMethod.metadata,
                  customer: paymentMethod.customer,
                  account: account.id,
                  account_email: account.email,
                };
                stripeObjectFound = true;
                break;
              } else if (paymentIntentId.startsWith('ch_')) {
                // Charge auf Connect Account
                const charge = await stripe.charges.retrieve(paymentIntentId, {
                  stripeAccount: account.id,
                });
                debugInfo.results.paymentIntent = {
                  id: charge.id,
                  type: 'Charge',
                  status: charge.status,
                  amount: charge.amount,
                  currency: charge.currency,
                  metadata: charge.metadata,
                  created: new Date(charge.created * 1000).toISOString(),
                  payment_intent: charge.payment_intent,
                  account: account.id,
                  account_email: account.email,
                };
                stripeObjectFound = true;
                break;
              }
            } catch (connectError) {
              // Objekt nicht auf diesem Connect Account gefunden, weiter probieren
              continue;
            }
          }
        }

        // Falls immer noch nicht gefunden
        if (!stripeObjectFound) {
          debugInfo.results.paymentIntent = {
            error: 'Object not found on main account or any connect accounts',
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
            searchedAccounts: 'main + all connect accounts',
          };
        }
      } catch (error) {
        debugInfo.results.paymentIntent = {
          error: error instanceof Error ? error.message : 'Error searching for Stripe object',
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

    // 3. Suche nach Transfers für diesen PaymentIntent oder Account (auch aus Connect Accounts)
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
        // Erweiterte Suche: Haupt-Account und alle Connect Accounts
        const recentTransfers = await stripe.transfers.list({
          limit: 100,
        });

        // Basis-Filter für Haupt-Account-Transfers
        const filteredTransfers = recentTransfers.data.filter(transfer => {
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

        allTransfers = filteredTransfers;

        // Falls wir das PaymentMethod/PaymentIntent auf einem Connect Account gefunden haben,
        // suche auch nach Transfers von diesem Account
        if (
          debugInfo.results.paymentIntent?.account &&
          debugInfo.results.paymentIntent.account !== 'main'
        ) {
          try {
            const connectAccountTransfers = await stripe.transfers.list(
              {
                limit: 100,
              },
              {
                stripeAccount: debugInfo.results.paymentIntent.account,
              }
            );

            // Filtere Connect Account Transfers
            const connectFilteredTransfers = connectAccountTransfers.data.filter(transfer => {
              return (
                transfer.metadata?.paymentIntentId === paymentIntentId ||
                transfer.metadata?.payment_intent_id === paymentIntentId ||
                transfer.metadata?.paymentMethod === paymentIntentId ||
                transfer.metadata?.chargeId === paymentIntentId ||
                transfer.description?.includes(paymentIntentId) ||
                transfer.source_transaction === paymentIntentId ||
                Object.values(transfer.metadata || {}).some(
                  value => typeof value === 'string' && value.includes(paymentIntentId)
                )
              );
            });

            // Füge Connect Account Transfers hinzu (mit Kennzeichnung)
            const markedConnectTransfers = connectFilteredTransfers.map(transfer => ({
              ...transfer,
              _sourceAccount: debugInfo.results.paymentIntent?.account,
              _isConnectAccountTransfer: true,
            }));

            allTransfers = [...allTransfers, ...markedConnectTransfers];
          } catch (connectTransferError) {
            console.log('Could not fetch transfers from connect account:', connectTransferError);
          }
        }
      } else {
        // Fallback: Lade letzte Transfers
        const recentTransfers = await stripe.transfers.list({
          limit: 20,
        });
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
          source_transaction: transfer.source_transaction,
          _sourceAccount: transfer._sourceAccount || 'main',
          _isConnectAccountTransfer: transfer._isConnectAccountTransfer || false,
        })),
      };
    } catch (error) {
      debugInfo.results.transfers = {
        error: error instanceof Error ? error.message : 'Error fetching transfers',
      };
    }

    // 4. Connect Account Info
    if (connectAccountId) {
      try {
        const account = await stripe.accounts.retrieve(connectAccountId);
        debugInfo.results.connectAccount = {
          id: account.id,
          type: account.type,
          email: account.email,
          country: account.country,
          details_submitted: account.details_submitted,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
        };
      } catch (error) {
        debugInfo.results.connectAccount = {
          error: error instanceof Error ? error.message : 'Connect account not found',
        };
      }
    }

    // 5. Falls orderId vorhanden, suche in Firestore nach verwandten Transfer-Objekten
    try {
      if (orderId) {
        // Suche nach Transfers in der transfers Collection
        const transferSnapshot = await db
          .collection('transfers')
          .where('orderId', '==', orderId)
          .get();

        const transferDocs = transferSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Suche nach Payments/Invoices in der payments Collection
        const paymentSnapshot = await db
          .collection('payments')
          .where('orderId', '==', orderId)
          .get();

        const paymentDocs = paymentSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        debugInfo.results.firestoreData = {
          transfers: transferDocs,
          payments: paymentDocs,
        };
      }
    } catch (error) {
      debugInfo.results.firestoreData = {
        error: error instanceof Error ? error.message : 'Error searching Firestore',
      };
    }

    // 6. Versuche fehlgeschlagene Transfers zu finden
    try {
      const failedTransfers = await stripe.transfers.list({
        limit: 50,
      });

      // Filtere fehlgeschlagene Transfers
      const failed = failedTransfers.data.filter(transfer => {
        // Check for failure indicators
        return (
          transfer.metadata?.status === 'failed' ||
          transfer.metadata?.error ||
          transfer.description?.toLowerCase().includes('failed') ||
          transfer.description?.toLowerCase().includes('error')
        );
      });

      debugInfo.results.failedTransfers = {
        found: failed.length,
        transfers: failed.map(transfer => ({
          id: transfer.id,
          amount: transfer.amount,
          destination: transfer.destination,
          created: new Date(transfer.created * 1000).toISOString(),
          description: transfer.description,
          metadata: transfer.metadata,
        })),
      };
    } catch (error) {
      debugInfo.results.failedTransfers = {
        error: error instanceof Error ? error.message : 'Error fetching failed transfers',
      };
    }

    return NextResponse.json({
      success: true,
      debug: debugInfo,
    });
  } catch (error) {
    console.error('Debug transfers error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
