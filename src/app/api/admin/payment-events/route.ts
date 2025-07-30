// src/app/api/admin/payment-events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import Stripe from 'stripe';

interface PaymentEvent {
  id: string;
  timestamp: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  stripeId?: string;
  orderId?: string;
  customerId?: string;
  providerId?: string;
  metadata?: Record<string, unknown>;
}

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    })
  : null;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateFilter = searchParams.get('date') || '24h';
    const limitParam = parseInt(searchParams.get('limit') || '100');

    console.log(
      `[PaymentEvents] Loading payment events with filter: ${dateFilter}, limit: ${limitParam}`
    );

    // Berechne Zeitraum
    const now = new Date();
    let startTime: Date;

    switch (dateFilter) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const stripeStartTimestamp = Math.floor(startTime.getTime() / 1000);
    const paymentEvents: PaymentEvent[] = [];

    // 1. Lade ALLE Stripe Payment Events
    if (stripe) {
      try {
        console.log(`[PaymentEvents] Loading Stripe events from ${startTime.toISOString()}`);

        // Payment Intents
        const paymentIntents = await stripe.paymentIntents.list({
          limit: limitParam,
          created: { gte: stripeStartTimestamp },
        });

        console.log(`[PaymentEvents] Found ${paymentIntents.data.length} payment intents`);

        paymentIntents.data.forEach(pi => {
          paymentEvents.push({
            id: `pi_${pi.id}`,
            timestamp: new Date(pi.created * 1000).toISOString(),
            type: 'payment_intent',
            amount: pi.amount,
            currency: pi.currency.toUpperCase(),
            status: pi.status,
            description: pi.description || 'Payment Intent',
            stripeId: pi.id,
            orderId: pi.metadata?.orderId,
            customerId: typeof pi.customer === 'string' ? pi.customer : pi.metadata?.customerId,
            metadata: {
              ...pi.metadata,
              stripePaymentIntentId: pi.id,
              confirmation_method: pi.confirmation_method,
              payment_method_types: pi.payment_method_types,
            },
          });
        });

        // Charges
        const charges = await stripe.charges.list({
          limit: limitParam,
          created: { gte: stripeStartTimestamp },
        });

        console.log(`[PaymentEvents] Found ${charges.data.length} charges`);

        charges.data.forEach(charge => {
          paymentEvents.push({
            id: `ch_${charge.id}`,
            timestamp: new Date(charge.created * 1000).toISOString(),
            type: 'charge',
            amount: charge.amount,
            currency: charge.currency.toUpperCase(),
            status: charge.status,
            description: charge.description || 'Charge',
            stripeId: charge.id,
            orderId: charge.metadata?.orderId,
            customerId:
              typeof charge.customer === 'string' ? charge.customer : charge.metadata?.customerId,
            metadata: {
              ...charge.metadata,
              stripeChargeId: charge.id,
              payment_method: charge.payment_method,
              receipt_url: charge.receipt_url,
            },
          });
        });

        // Transfers (Platform Payouts)
        const transfers = await stripe.transfers.list({
          limit: limitParam,
          created: { gte: stripeStartTimestamp },
        });

        console.log(`[PaymentEvents] Found ${transfers.data.length} transfers`);

        transfers.data.forEach(transfer => {
          paymentEvents.push({
            id: `tr_${transfer.id}`,
            timestamp: new Date(transfer.created * 1000).toISOString(),
            type: 'transfer',
            amount: transfer.amount,
            currency: transfer.currency.toUpperCase(),
            status: 'succeeded', // Transfers are always succeeded when listed
            description: transfer.description || 'Platform Transfer',
            stripeId: transfer.id,
            providerId: typeof transfer.destination === 'string' ? transfer.destination : undefined,
            orderId: transfer.metadata?.orderId,
            metadata: {
              ...transfer.metadata,
              stripeTransferId: transfer.id,
              destination: transfer.destination,
              source_transaction: transfer.source_transaction,
            },
          });
        });

        // Invoices
        const invoices = await stripe.invoices.list({
          limit: limitParam,
          created: { gte: stripeStartTimestamp },
        });

        console.log(`[PaymentEvents] Found ${invoices.data.length} invoices`);

        invoices.data.forEach(invoice => {
          paymentEvents.push({
            id: `in_${invoice.id}`,
            timestamp: new Date(invoice.created * 1000).toISOString(),
            type: 'invoice',
            amount: invoice.amount_paid,
            currency: invoice.currency.toUpperCase(),
            status: invoice.status || 'unknown',
            description: invoice.description || `Invoice #${invoice.number}`,
            stripeId: invoice.id,
            customerId: typeof invoice.customer === 'string' ? invoice.customer : undefined,
            orderId: invoice.metadata?.orderId,
            metadata: {
              ...invoice.metadata,
              stripeInvoiceId: invoice.id,
              invoice_number: invoice.number,
              hosted_invoice_url: invoice.hosted_invoice_url,
            },
          });
        });

        // Balance Transactions (für detaillierte Fee-Informationen)
        const balanceTransactions = await stripe.balanceTransactions.list({
          limit: limitParam,
          created: { gte: stripeStartTimestamp },
        });

        console.log(
          `[PaymentEvents] Found ${balanceTransactions.data.length} balance transactions`
        );

        balanceTransactions.data.forEach(bt => {
          paymentEvents.push({
            id: `txn_${bt.id}`,
            timestamp: new Date(bt.created * 1000).toISOString(),
            type: 'balance_transaction',
            amount: bt.amount,
            currency: bt.currency.toUpperCase(),
            status: bt.status,
            description: bt.description || `${bt.type} - ${bt.source}`,
            stripeId: bt.id,
            metadata: {
              stripeBalanceTransactionId: bt.id,
              type: bt.type,
              source: bt.source,
              fee: bt.fee,
              fee_details: bt.fee_details,
              net: bt.net,
            },
          });
        });
      } catch (stripeError) {
        console.error('[PaymentEvents] Stripe API error:', stripeError);
      }
    }

    // 2. Lade Payment-Daten aus Firebase Aufträgen (zusätzlich zu Stripe)
    try {
      console.log('[PaymentEvents] Loading Firebase order data...');

      const ordersQuery = db
        .collection('auftraege')
        .where('lastUpdated', '>=', startTime)
        .limit(limitParam);

      const ordersSnapshot = await ordersQuery.get();
      console.log(`[PaymentEvents] Found ${ordersSnapshot.size} recent orders`);

      ordersSnapshot.forEach(doc => {
        const orderData = doc.data();

        // Haupt-Payment aus Auftrag
        if (orderData.gesamtpreis && orderData.gesamtpreis > 0) {
          paymentEvents.push({
            id: `order_${doc.id}`,
            timestamp:
              orderData.createdAt?.toDate()?.toISOString() ||
              orderData.lastUpdated.toDate().toISOString(),
            type: 'order_payment',
            amount: orderData.gesamtpreis * 100, // Convert to cents
            currency: 'EUR',
            status: orderData.paymentStatus || orderData.status || 'unknown',
            description: `Auftrag: ${orderData.serviceName || 'Service'}`,
            orderId: doc.id,
            customerId: orderData.kundenId,
            metadata: {
              orderTotal: orderData.gesamtpreis,
              serviceName: orderData.serviceName,
              providerId: orderData.anbieterId,
            },
          });
        }

        // Additional Hours Payments
        if (orderData.additionalHoursPayments && orderData.additionalHoursPayments.length > 0) {
          orderData.additionalHoursPayments.forEach(
            (payment: Record<string, unknown>, index: number) => {
              paymentEvents.push({
                id: `additional_${doc.id}_${index}`,
                timestamp:
                  (payment.timestamp as any)?.toDate()?.toISOString() ||
                  orderData.lastUpdated.toDate().toISOString(),
                type: 'additional_hours_payment',
                amount: ((payment.amount as number) || 0) * 100, // Convert to cents
                currency: 'EUR',
                status: (payment.status as string) || 'completed',
                description: `Zusätzliche Stunden: ${(payment.hours as number) || 0}h`,
                orderId: doc.id,
                customerId: orderData.kundenId,
                metadata: {
                  hours: payment.hours,
                  hourlyRate: payment.hourlyRate,
                  originalAmount: payment.amount,
                },
              });
            }
          );
        }

        // Platform Payouts
        if (orderData.platformPayouts && orderData.platformPayouts.length > 0) {
          orderData.platformPayouts.forEach((payout: Record<string, unknown>, index: number) => {
            paymentEvents.push({
              id: `payout_${doc.id}_${index}`,
              timestamp:
                (payout.timestamp as any)?.toDate()?.toISOString() ||
                orderData.lastUpdated.toDate().toISOString(),
              type: 'platform_payout',
              amount: ((payout.amount as number) || 0) * 100, // Convert to cents
              currency: 'EUR',
              status: (payout.status as string) || 'completed',
              description: `Platform Auszahlung an Provider`,
              orderId: doc.id,
              providerId: orderData.anbieterId,
              metadata: {
                payoutAmount: payout.amount,
                platformFee: payout.platformFee,
                stripeTransferId: payout.stripeTransferId,
              },
            });
          });
        }
      });
    } catch (error) {
      console.log('[PaymentEvents] Error fetching order payments:', error);
    }

    // Sortiere nach Timestamp (neueste zuerst)
    const sortedEvents = paymentEvents.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    console.log(`[PaymentEvents] Total events loaded: ${sortedEvents.length}`);

    // Berechne Zusammenfassung
    const summary = {
      totalEvents: sortedEvents.length,
      totalAmount: sortedEvents.reduce((sum, event) => sum + (event.amount || 0), 0) / 100,
      successfulPayments: sortedEvents.filter(
        e => e.status === 'succeeded' || e.status === 'completed' || e.status === 'paid'
      ).length,
      failedPayments: sortedEvents.filter(e => e.status === 'failed' || e.status === 'canceled')
        .length,
      pendingPayments: sortedEvents.filter(e => e.status === 'pending' || e.status === 'processing')
        .length,
      eventTypes: [...new Set(sortedEvents.map(e => e.type))],
    };

    return NextResponse.json({
      events: sortedEvents.slice(0, limitParam),
      summary,
      dateRange: {
        from: startTime.toISOString(),
        to: now.toISOString(),
      },
      filters: {
        date: dateFilter,
      },
    });
  } catch (error) {
    console.error('Error fetching payment events:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch payment events',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
