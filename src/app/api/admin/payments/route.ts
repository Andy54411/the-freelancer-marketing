// src/app/api/admin/payments/route.ts
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
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const dateFilter = searchParams.get('date') || '24h';
    const statusFilter = searchParams.get('status') || 'all';
    const searchTerm = searchParams.get('search') || '';
    const limitParam = parseInt(searchParams.get('limit') || '100');

    // Berechne Zeitraum
    const now = new Date();
    let created: number;

    switch (dateFilter) {
      case '1h':
        created = Math.floor((now.getTime() - 60 * 60 * 1000) / 1000);
        break;
      case '24h':
        created = Math.floor((now.getTime() - 24 * 60 * 60 * 1000) / 1000);
        break;
      case '7d':
        created = Math.floor((now.getTime() - 7 * 24 * 60 * 60 * 1000) / 1000);
        break;
      case '30d':
        created = Math.floor((now.getTime() - 30 * 24 * 60 * 60 * 1000) / 1000);
        break;
      default:
        created = Math.floor((now.getTime() - 24 * 60 * 60 * 1000) / 1000);
    }

    // Hole ALLE Stripe Events - ohne Type-Filter für vollständige Sichtbarkeit
    console.log(`[Payments] Loading ALL Stripe events from timestamp: ${created}`);

    // 1. Lade erst alle verbundenen Konten (Stripe Connect)
    console.log(`[Payments] Loading connected accounts...`);
    const connectedAccounts = await stripe.accounts.list({
      limit: 100, // Alle verbundenen Konten laden
    });

    console.log(`[Payments] Found ${connectedAccounts.data.length} connected accounts`);

    // 2. Lade Daten vom Hauptkonto
    const mainAccountData = await Promise.all([
      // Events vom Hauptkonto
      stripe.events.list({
        limit: limitParam * 2,
        created: { gte: created },
      }),
      // Alle anderen Objekte vom Hauptkonto
      stripe.paymentIntents.list({
        limit: limitParam,
        created: { gte: created },
      }),
      stripe.charges.list({
        limit: limitParam,
        created: { gte: created },
      }),
      stripe.transfers.list({
        limit: limitParam,
        created: { gte: created },
      }),
      stripe.payouts.list({
        limit: limitParam,
        created: { gte: created },
      }),
      stripe.invoices.list({
        limit: limitParam,
        created: { gte: created },
      }),
      stripe.subscriptions.list({
        limit: limitParam,
        created: { gte: created },
      }),
      stripe.balanceTransactions.list({
        limit: limitParam,
        created: { gte: created },
      }),
      stripe.customers.list({
        limit: limitParam,
        created: { gte: created },
      }),
      stripe.setupIntents.list({
        limit: limitParam,
        created: { gte: created },
      }),
      stripe.refunds.list({
        limit: limitParam,
        created: { gte: created },
      }),
      stripe.disputes.list({
        limit: limitParam,
        created: { gte: created },
      }),
      stripe.applicationFees.list({
        limit: limitParam,
        created: { gte: created },
      }),
    ]);

    // 3. Lade Daten von ALLEN verbundenen Konten
    const connectedAccountsData = await Promise.all(
      connectedAccounts.data.map(async account => {
        try {
          console.log(`[Payments] Loading data from connected account: ${account.id}`);

          const accountData = await Promise.all([
            // Events für verbundenes Konto
            stripe.events.list(
              {
                limit: Math.floor(limitParam / Math.max(connectedAccounts.data.length, 1)),
                created: { gte: created },
              },
              {
                stripeAccount: account.id,
              }
            ),
            // Payment Intents für verbundenes Konto
            stripe.paymentIntents.list(
              {
                limit: Math.floor(limitParam / Math.max(connectedAccounts.data.length, 1)),
                created: { gte: created },
              },
              {
                stripeAccount: account.id,
              }
            ),
            // Charges für verbundenes Konto
            stripe.charges.list(
              {
                limit: Math.floor(limitParam / Math.max(connectedAccounts.data.length, 1)),
                created: { gte: created },
              },
              {
                stripeAccount: account.id,
              }
            ),
            // Transfers für verbundenes Konto
            stripe.transfers.list(
              {
                limit: Math.floor(limitParam / Math.max(connectedAccounts.data.length, 1)),
                created: { gte: created },
              },
              {
                stripeAccount: account.id,
              }
            ),
            // Payouts für verbundenes Konto
            stripe.payouts.list(
              {
                limit: Math.floor(limitParam / Math.max(connectedAccounts.data.length, 1)),
                created: { gte: created },
              },
              {
                stripeAccount: account.id,
              }
            ),
            // Balance Transactions für verbundenes Konto
            stripe.balanceTransactions.list(
              {
                limit: Math.floor(limitParam / Math.max(connectedAccounts.data.length, 1)),
                created: { gte: created },
              },
              {
                stripeAccount: account.id,
              }
            ),
          ]);

          return {
            accountId: account.id,
            accountInfo: account,
            data: accountData,
          };
        } catch (error) {
          console.error(`Error loading data from account ${account.id}:`, error);
          return {
            accountId: account.id,
            accountInfo: account,
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    // Extrahiere die Daten vom Hauptkonto
    const [
      events,
      paymentIntents,
      charges,
      transfers,
      payouts,
      invoices,
      subscriptions,
      balanceTransactions,
      customers,
      setupIntents,
      refunds,
      disputes,
      applicationFees,
    ] = mainAccountData;

    console.log(
      `[Payments] Main account data loaded:
      - ${events.data.length} Events
      - ${paymentIntents.data.length} Payment Intents
      - ${charges.data.length} Charges
      - ${transfers.data.length} Transfers  
      - ${payouts.data.length} Payouts
      - ${invoices.data.length} Invoices
      - ${subscriptions.data.length} Subscriptions
      - ${balanceTransactions.data.length} Balance Transactions
      - ${customers.data.length} Customers
      - ${setupIntents.data.length} Setup Intents
      - ${refunds.data.length} Refunds
      - ${disputes.data.length} Disputes
      - ${applicationFees.data.length} Application Fees`
    );

    // Kombiniere alle Daten (Hauptkonto + verbundene Konten)
    const allAccountsData = {
      events: [events],
      paymentIntents: [paymentIntents],
      charges: [charges],
      transfers: [transfers],
      payouts: [payouts],
      balanceTransactions: [balanceTransactions],
    };

    // Füge Daten aller verbundenen Konten hinzu
    connectedAccountsData.forEach(accountData => {
      if (accountData.data) {
        const [
          accountEvents,
          accountPaymentIntents,
          accountCharges,
          accountTransfers,
          accountPayouts,
          accountBalanceTransactions,
        ] = accountData.data;

        allAccountsData.events.push(accountEvents);
        allAccountsData.paymentIntents.push(accountPaymentIntents);
        allAccountsData.charges.push(accountCharges);
        allAccountsData.transfers.push(accountTransfers);
        allAccountsData.payouts.push(accountPayouts);
        allAccountsData.balanceTransactions.push(accountBalanceTransactions);

        console.log(
          `[Payments] Connected account ${accountData.accountId} data:
          - ${accountEvents.data.length} Events
          - ${accountPaymentIntents.data.length} Payment Intents
          - ${accountCharges.data.length} Charges
          - ${accountTransfers.data.length} Transfers
          - ${accountPayouts.data.length} Payouts
          - ${accountBalanceTransactions.data.length} Balance Transactions`
        );
      }
    });

    // Filtere und formatiere Events aus ALLEN Konten
    const allStripeData = new Map();

    // Verarbeite Events von allen Konten
    allAccountsData.events.forEach((eventsList, accountIndex) => {
      const accountId =
        accountIndex === 0 ? 'main' : connectedAccountsData[accountIndex - 1]?.accountId;

      eventsList.data.forEach(event => {
        const key = `event_${event.id}_${accountId}`;
        if (!allStripeData.has(key)) {
          allStripeData.set(key, {
            source: 'event',
            data: event,
            accountId: accountId,
            accountType: accountIndex === 0 ? 'main' : 'connected',
          });
        }
      });
    });

    // Verarbeite Payment Intents von allen Konten
    allAccountsData.paymentIntents.forEach((piList, accountIndex) => {
      const accountId =
        accountIndex === 0 ? 'main' : connectedAccountsData[accountIndex - 1]?.accountId;

      piList.data.forEach(pi => {
        const key = `pi_${pi.id}_${accountId}`;
        if (!allStripeData.has(key)) {
          allStripeData.set(key, {
            source: 'payment_intent',
            data: pi,
            accountId: accountId,
            accountType: accountIndex === 0 ? 'main' : 'connected',
          });
        }
      });
    });

    // Verarbeite Charges von allen Konten
    allAccountsData.charges.forEach((chargesList, accountIndex) => {
      const accountId =
        accountIndex === 0 ? 'main' : connectedAccountsData[accountIndex - 1]?.accountId;

      chargesList.data.forEach(charge => {
        const key = `ch_${charge.id}_${accountId}`;
        if (!allStripeData.has(key)) {
          allStripeData.set(key, {
            source: 'charge',
            data: charge,
            accountId: accountId,
            accountType: accountIndex === 0 ? 'main' : 'connected',
          });
        }
      });
    });

    // Verarbeite Transfers von allen Konten
    allAccountsData.transfers.forEach((transfersList, accountIndex) => {
      const accountId =
        accountIndex === 0 ? 'main' : connectedAccountsData[accountIndex - 1]?.accountId;

      transfersList.data.forEach(transfer => {
        const key = `tr_${transfer.id}_${accountId}`;
        if (!allStripeData.has(key)) {
          allStripeData.set(key, {
            source: 'transfer',
            data: transfer,
            accountId: accountId,
            accountType: accountIndex === 0 ? 'main' : 'connected',
          });
        }
      });
    });

    // Verarbeite Payouts von allen Konten
    allAccountsData.payouts.forEach((payoutsList, accountIndex) => {
      const accountId =
        accountIndex === 0 ? 'main' : connectedAccountsData[accountIndex - 1]?.accountId;

      payoutsList.data.forEach(payout => {
        const key = `po_${payout.id}_${accountId}`;
        if (!allStripeData.has(key)) {
          allStripeData.set(key, {
            source: 'payout',
            data: payout,
            accountId: accountId,
            accountType: accountIndex === 0 ? 'main' : 'connected',
          });
        }
      });
    });

    // Verarbeite Balance Transactions von allen Konten
    allAccountsData.balanceTransactions.forEach((btList, accountIndex) => {
      const accountId =
        accountIndex === 0 ? 'main' : connectedAccountsData[accountIndex - 1]?.accountId;

      btList.data.forEach(bt => {
        const key = `bt_${bt.id}_${accountId}`;
        if (!allStripeData.has(key)) {
          allStripeData.set(key, {
            source: 'balance_transaction',
            data: bt,
            accountId: accountId,
            accountType: accountIndex === 0 ? 'main' : 'connected',
          });
        }
      });
    });

    // Verarbeite Hauptkonto-spezifische Objekte (nur vom Hauptkonto verfügbar)
    invoices.data.forEach(invoice => {
      const key = `in_${invoice.id}_main`;
      if (!allStripeData.has(key)) {
        allStripeData.set(key, {
          source: 'invoice',
          data: invoice,
          accountId: 'main',
          accountType: 'main',
        });
      }
    });

    subscriptions.data.forEach(sub => {
      const key = `sub_${sub.id}_main`;
      if (!allStripeData.has(key)) {
        allStripeData.set(key, {
          source: 'subscription',
          data: sub,
          accountId: 'main',
          accountType: 'main',
        });
      }
    });

    customers.data.forEach(customer => {
      const key = `cus_${customer.id}_main`;
      if (!allStripeData.has(key)) {
        allStripeData.set(key, {
          source: 'customer',
          data: customer,
          accountId: 'main',
          accountType: 'main',
        });
      }
    });

    setupIntents.data.forEach(si => {
      const key = `si_${si.id}_main`;
      if (!allStripeData.has(key)) {
        allStripeData.set(key, {
          source: 'setup_intent',
          data: si,
          accountId: 'main',
          accountType: 'main',
        });
      }
    });

    refunds.data.forEach(refund => {
      const key = `re_${refund.id}_main`;
      if (!allStripeData.has(key)) {
        allStripeData.set(key, {
          source: 'refund',
          data: refund,
          accountId: 'main',
          accountType: 'main',
        });
      }
    });

    disputes.data.forEach(dispute => {
      const key = `dp_${dispute.id}_main`;
      if (!allStripeData.has(key)) {
        allStripeData.set(key, {
          source: 'dispute',
          data: dispute,
          accountId: 'main',
          accountType: 'main',
        });
      }
    });

    applicationFees.data.forEach(fee => {
      const key = `fee_${fee.id}_main`;
      if (!allStripeData.has(key)) {
        allStripeData.set(key, {
          source: 'application_fee',
          data: fee,
          accountId: 'main',
          accountType: 'main',
        });
      }
    });

    console.log(`[Payments] Total unique Stripe objects: ${allStripeData.size}`);

    const paymentEvents = await Promise.all(
      Array.from(allStripeData.values())
        .filter(item => {
          // Anwenden von Status- und Suchfiltern
          let obj, eventType, status;

          if (item.source === 'event') {
            obj = item.data.data.object;
            eventType = item.data.type;
            status = obj.status;
          } else {
            obj = item.data;
            eventType = item.source;
            status = obj.status;
          }

          // Status-Filter
          if (statusFilter !== 'all') {
            if (statusFilter === 'succeeded' && !['succeeded', 'paid'].includes(status)) {
              return false;
            }
            if (statusFilter === 'failed' && status !== 'failed') {
              return false;
            }
            if (
              statusFilter === 'pending' &&
              !['pending', 'requires_action', 'processing'].includes(status)
            ) {
              return false;
            }
          }

          // Such-Filter
          if (searchTerm) {
            const metadata = obj.metadata || {};
            const searchableText = [
              item.data.id,
              obj.id,
              metadata.orderId,
              metadata.customerId,
              metadata.providerId,
              obj.description,
              eventType,
            ]
              .join(' ')
              .toLowerCase();

            if (!searchableText.includes(searchTerm.toLowerCase())) {
              return false;
            }
          }

          return true;
        })
        .map(async item => {
          let obj, eventType, status, created, amount, currency, description;

          if (item.source === 'event') {
            const event = item.data;
            obj = event.data.object;
            eventType = event.type;
            created = event.created;
            status = obj.status;
            amount = obj.amount || obj.amount_total || 0;
            currency = obj.currency || 'eur';
            description = obj.description;
          } else {
            obj = item.data;
            eventType = item.source;
            created = obj.created;

            // Erweiterte Statuslogik für alle Objekttypen
            switch (item.source) {
              case 'customer':
                status = obj.delinquent ? 'failed' : 'succeeded';
                amount = 0;
                currency = 'eur';
                description = `Customer: ${obj.name || obj.email || obj.id}`;
                break;
              case 'subscription':
                status = obj.status;
                amount = obj.current_period_end
                  ? (obj.current_period_end - obj.current_period_start) * 100
                  : 0;
                currency = obj.currency || 'eur';
                description = `Subscription: ${obj.nickname || obj.id}`;
                break;
              case 'invoice':
                status = obj.status;
                amount = obj.amount_due || obj.total || 0;
                currency = obj.currency || 'eur';
                description = `Invoice: ${obj.number || obj.id}`;
                break;
              case 'payout':
                status = obj.status;
                amount = obj.amount || 0;
                currency = obj.currency || 'eur';
                description = `Payout to ${obj.destination || 'bank account'}`;
                break;
              case 'balance_transaction':
                status = obj.status || 'succeeded';
                amount = obj.amount || 0;
                currency = obj.currency || 'eur';
                description = `${obj.type}: ${obj.description || obj.id}`;
                break;
              case 'refund':
                status = obj.status;
                amount = -(obj.amount || 0); // Negative für Rückerstattungen
                currency = obj.currency || 'eur';
                description = `Refund: ${obj.reason || obj.id}`;
                break;
              case 'dispute':
                status = obj.status;
                amount = -(obj.amount || 0); // Negative für Streitfälle
                currency = obj.currency || 'eur';
                description = `Dispute: ${obj.reason || obj.id}`;
                break;
              case 'application_fee':
                status = obj.refunded ? 'refunded' : 'succeeded';
                amount = obj.amount || 0;
                currency = obj.currency || 'eur';
                description = `Application Fee: ${obj.id}`;
                break;
              case 'setup_intent':
                status = obj.status;
                amount = 0;
                currency = obj.currency || 'eur';
                description = `Setup Intent: ${obj.usage || obj.id}`;
                break;
              default:
                status = obj.status || 'unknown';
                amount = obj.amount || 0;
                currency = obj.currency || 'eur';
                description = obj.description || `${eventType} - ${obj.id}`;
            }
          }

          const metadata = obj.metadata || {};

          // Zusätzliche Daten aus Firebase laden falls vorhanden
          let orderData: Record<string, unknown> | null = null;

          if (metadata.orderId) {
            try {
              const orderRef = db.collection('auftraege').doc(metadata.orderId);
              const orderSnap = await orderRef.get();
              if (orderSnap.exists) {
                orderData = (orderSnap.data() as Record<string, unknown>) || null;
              }
            } catch (error) {
              console.error('Error loading order data:', error);
            }
          }

          // Status mapping für einheitliche Anzeige
          let normalizedStatus: 'succeeded' | 'failed' | 'pending' | 'requires_action' = 'pending';
          if (['succeeded', 'paid', 'completed'].includes(status)) {
            normalizedStatus = 'succeeded';
          } else if (['failed', 'canceled', 'cancelled'].includes(status)) {
            normalizedStatus = 'failed';
          } else if (['requires_action', 'requires_payment_method'].includes(status)) {
            normalizedStatus = 'requires_action';
          } else {
            normalizedStatus = 'pending';
          }

          return {
            id: item.data.id,
            type: eventType,
            created: new Date(created * 1000).toISOString(),
            status: normalizedStatus,
            amount: amount || 0,
            currency: currency.toUpperCase(),
            description: description || metadata.description || `${eventType} - ${obj.id}`,
            metadata: {
              ...metadata,
              ...(orderData && { orderTitle: orderData.titel }),
              stripeObjectId: obj.id,
              stripeObjectType: eventType,
              // Erweiterte Metadaten je nach Objekttyp
              ...(item.source === 'customer' && {
                customerEmail: obj.email,
                customerName: obj.name,
                customerPhone: obj.phone,
                delinquent: obj.delinquent,
              }),
              ...(item.source === 'subscription' && {
                subscriptionInterval: obj.items?.data?.[0]?.price?.recurring?.interval,
                subscriptionTrialEnd: obj.trial_end,
                subscriptionCurrentPeriodEnd: obj.current_period_end,
              }),
              ...(item.source === 'invoice' && {
                invoiceNumber: obj.number,
                invoiceDueDate: obj.due_date,
                invoiceAmountPaid: obj.amount_paid,
              }),
              ...(item.source === 'dispute' && {
                disputeReason: obj.reason,
                disputeStatus: obj.status,
                disputeEvidence: obj.evidence_details?.summary,
              }),
            },
            orderId: metadata.orderId,
            customerId:
              metadata.customerId ||
              metadata.userId ||
              obj.customer ||
              (typeof obj.customer === 'string' ? obj.customer : obj.customer?.id),
            providerId:
              metadata.providerId ||
              metadata.companyId ||
              obj.destination ||
              (typeof obj.destination === 'string' ? obj.destination : obj.destination?.id),
            error:
              obj.last_payment_error?.message ||
              obj.failure_message ||
              obj.failure_reason ||
              obj.cancellation_reason,
            webhookStatus:
              item.source === 'event' && item.data.pending_webhooks > 0 ? 'pending' : 'delivered',
            // Stripe Connect Account Information
            stripeAccount: {
              id: item.accountId,
              type: item.accountType,
              isConnectedAccount: item.accountType === 'connected',
            },
            rawStripeData: {
              object_id: obj.id,
              object_type: eventType,
              source: item.source,
              account_id: item.accountId,
              account_type: item.accountType,
              // Vollständige Stripe-Objektdaten für Debugging
              full_object: obj,
            },
          };
        })
    );

    // Sortiere nach Datum (neueste zuerst)
    const sortedEvents = paymentEvents.sort(
      (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
    );

    return NextResponse.json({
      events: sortedEvents,
      total: sortedEvents.length,
      dateRange: {
        from: new Date(created * 1000).toISOString(),
        to: now.toISOString(),
      },
      filters: {
        date: dateFilter,
        status: statusFilter,
        search: searchTerm,
      },
      // Vollständige Stripe-Datenquellenübersicht mit Connect-Support
      stripeDataSources: {
        mainAccount: {
          events: events.data.length,
          paymentIntents: paymentIntents.data.length,
          charges: charges.data.length,
          transfers: transfers.data.length,
          payouts: payouts.data.length,
          invoices: invoices.data.length,
          subscriptions: subscriptions.data.length,
          balanceTransactions: balanceTransactions.data.length,
          customers: customers.data.length,
          setupIntents: setupIntents.data.length,
          refunds: refunds.data.length,
          disputes: disputes.data.length,
          applicationFees: applicationFees.data.length,
        },
        connectedAccounts: {
          total: connectedAccounts.data.length,
          accounts: connectedAccountsData.map(account => ({
            id: account.accountId,
            type: account.accountInfo.type,
            country: account.accountInfo.country,
            business_type: account.accountInfo.business_type,
            charges_enabled: account.accountInfo.charges_enabled,
            payouts_enabled: account.accountInfo.payouts_enabled,
            hasData: !!account.data,
            error: account.error,
            dataLoaded: account.data
              ? {
                events: account.data[0]?.data?.length || 0,
                paymentIntents: account.data[1]?.data?.length || 0,
                charges: account.data[2]?.data?.length || 0,
                transfers: account.data[3]?.data?.length || 0,
                payouts: account.data[4]?.data?.length || 0,
                balanceTransactions: account.data[5]?.data?.length || 0,
              }
              : null,
          })),
        },
        totalUniqueObjects: allStripeData.size,
        completeCoverage: true,
        connectEnabled: true,
        note: 'Diese API zeigt ALLE verfügbaren Stripe-Daten - Hauptkonto + ALLE verbundenen Konten (Stripe Connect)',
      },
    });
  } catch (error) {
    console.error('Error fetching payment data:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch payment data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
