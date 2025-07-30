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

    const events = await stripe.events.list({
      limit: limitParam * 3, // Mehr Events laden für bessere Abdeckung
      created: { gte: created },
      // Kein types-Filter = ALLE Event-Typen werden geladen
    });

    console.log(`[Payments] Found ${events.data.length} Stripe events`);

    // Zusätzlich direkt ALLE verfügbaren Stripe-Objekte laden
    const [
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
    ] = await Promise.all([
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

    console.log(
      `[Payments] Complete Stripe data loaded:
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

    // Filtere und formatiere Events
    const allStripeData = new Map();

    // Verarbeite Events
    events.data.forEach(event => {
      const key = `event_${event.id}`;
      if (!allStripeData.has(key)) {
        allStripeData.set(key, {
          source: 'event',
          data: event,
        });
      }
    });

    // Verarbeite Payment Intents
    paymentIntents.data.forEach(pi => {
      const key = `pi_${pi.id}`;
      if (!allStripeData.has(key)) {
        allStripeData.set(key, {
          source: 'payment_intent',
          data: pi,
        });
      }
    });

    // Verarbeite Charges
    charges.data.forEach(charge => {
      const key = `ch_${charge.id}`;
      if (!allStripeData.has(key)) {
        allStripeData.set(key, {
          source: 'charge',
          data: charge,
        });
      }
    });

    // Verarbeite Transfers
    transfers.data.forEach(transfer => {
      const key = `tr_${transfer.id}`;
      if (!allStripeData.has(key)) {
        allStripeData.set(key, {
          source: 'transfer',
          data: transfer,
        });
      }
    });

    // Verarbeite Payouts
    payouts.data.forEach(payout => {
      const key = `po_${payout.id}`;
      if (!allStripeData.has(key)) {
        allStripeData.set(key, {
          source: 'payout',
          data: payout,
        });
      }
    });

    // Verarbeite Invoices
    invoices.data.forEach(invoice => {
      const key = `in_${invoice.id}`;
      if (!allStripeData.has(key)) {
        allStripeData.set(key, {
          source: 'invoice',
          data: invoice,
        });
      }
    });

    // Verarbeite Subscriptions
    subscriptions.data.forEach(sub => {
      const key = `sub_${sub.id}`;
      if (!allStripeData.has(key)) {
        allStripeData.set(key, {
          source: 'subscription',
          data: sub,
        });
      }
    });

    // Verarbeite Balance Transactions
    balanceTransactions.data.forEach(bt => {
      const key = `bt_${bt.id}`;
      if (!allStripeData.has(key)) {
        allStripeData.set(key, {
          source: 'balance_transaction',
          data: bt,
        });
      }
    });

    // Verarbeite Customers
    customers.data.forEach(customer => {
      const key = `cus_${customer.id}`;
      if (!allStripeData.has(key)) {
        allStripeData.set(key, {
          source: 'customer',
          data: customer,
        });
      }
    });

    // Verarbeite Setup Intents
    setupIntents.data.forEach(si => {
      const key = `si_${si.id}`;
      if (!allStripeData.has(key)) {
        allStripeData.set(key, {
          source: 'setup_intent',
          data: si,
        });
      }
    });

    // Verarbeite Refunds
    refunds.data.forEach(refund => {
      const key = `re_${refund.id}`;
      if (!allStripeData.has(key)) {
        allStripeData.set(key, {
          source: 'refund',
          data: refund,
        });
      }
    });

    // Verarbeite Disputes
    disputes.data.forEach(dispute => {
      const key = `dp_${dispute.id}`;
      if (!allStripeData.has(key)) {
        allStripeData.set(key, {
          source: 'dispute',
          data: dispute,
        });
      }
    });

    // Verarbeite Application Fees
    applicationFees.data.forEach(fee => {
      const key = `fee_${fee.id}`;
      if (!allStripeData.has(key)) {
        allStripeData.set(key, {
          source: 'application_fee',
          data: fee,
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
                orderData = orderSnap.data();
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
            rawStripeData: {
              object_id: obj.id,
              object_type: eventType,
              source: item.source,
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
      // Vollständige Stripe-Datenquellenübersicht
      stripeDataSources: {
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
        totalUniqueObjects: allStripeData.size,
        completeCoverage: true,
        note: 'Diese API zeigt ALLE verfügbaren Stripe-Daten - Events, Objekte, Transaktionen, Kunden, etc.',
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
