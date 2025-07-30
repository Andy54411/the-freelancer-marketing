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

    // Hole Stripe Events - ALLE Payment-relevanten Events
    console.log(`[Payments] Loading Stripe events from timestamp: ${created}`);

    const events = await stripe.events.list({
      limit: limitParam * 2, // Mehr Events laden für bessere Filterung
      created: { gte: created },
      types: [
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'payment_intent.requires_action',
        'payment_intent.created',
        'payment_intent.canceled',
        'charge.succeeded',
        'charge.failed',
        'charge.pending',
        'checkout.session.completed',
        'invoice.payment_succeeded',
        'invoice.payment_failed',
        'transfer.created',
        'transfer.paid',
        'payout.created',
        'payout.paid',
        'payout.failed',
      ],
    });

    console.log(`[Payments] Found ${events.data.length} Stripe events`);

    // Zusätzlich direkt Payment Intents, Charges und Transfers laden
    const [paymentIntents, charges, transfers] = await Promise.all([
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
    ]);

    console.log(
      `[Payments] Direct API calls found: ${paymentIntents.data.length} PIs, ${charges.data.length} charges, ${transfers.data.length} transfers`
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
            status = obj.status;
            amount = obj.amount || 0;
            currency = obj.currency || 'eur';
            description = obj.description;
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
            },
            orderId: metadata.orderId,
            customerId: metadata.customerId || metadata.userId || obj.customer,
            providerId: metadata.providerId || metadata.companyId || obj.destination,
            error: obj.last_payment_error?.message || obj.failure_message,
            webhookStatus:
              item.source === 'event' && item.data.pending_webhooks > 0 ? 'pending' : 'delivered',
            rawStripeData: {
              object_id: obj.id,
              object_type: eventType,
              source: item.source,
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
