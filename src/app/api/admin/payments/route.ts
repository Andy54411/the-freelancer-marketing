// src/app/api/admin/payments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/firebase/server';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

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

    // Hole Stripe Events
    const events = await stripe.events.list({
      limit: limitParam,
      created: { gte: created },
      ...(statusFilter !== 'all' && {
        types: [
          'payment_intent.succeeded',
          'payment_intent.payment_failed',
          'payment_intent.requires_action',
          'payment_intent.created',
        ],
      }),
    });

    // Filtere und formatiere Events
    const paymentEvents = await Promise.all(
      events.data
        .filter(event => {
          // Filter nach Event-Typ
          const isPaymentEvent = [
            'payment_intent.succeeded',
            'payment_intent.payment_failed',
            'payment_intent.requires_action',
            'payment_intent.created',
            'checkout.session.completed',
            'invoice.payment_succeeded',
            'invoice.payment_failed',
          ].includes(event.type);

          if (!isPaymentEvent) return false;

          // Status-Filter
          if (statusFilter !== 'all') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            if (statusFilter === 'succeeded' && event.type !== 'payment_intent.succeeded') {
              return false;
            }
            if (statusFilter === 'failed' && event.type !== 'payment_intent.payment_failed') {
              return false;
            }
            if (
              statusFilter === 'pending' &&
              !['payment_intent.requires_action', 'payment_intent.created'].includes(event.type)
            ) {
              return false;
            }
          }

          // Such-Filter
          if (searchTerm) {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            const metadata = paymentIntent.metadata || {};
            const searchableText = [
              event.id,
              paymentIntent.id,
              metadata.orderId,
              metadata.customerId,
              metadata.providerId,
              paymentIntent.description,
            ]
              .join(' ')
              .toLowerCase();

            if (!searchableText.includes(searchTerm.toLowerCase())) {
              return false;
            }
          }

          return true;
        })
        .map(async event => {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const metadata = paymentIntent.metadata || {};

          // Zusätzliche Daten aus Firebase laden falls vorhanden
          let orderData: any = null;
          const customerData: any = null;
          const providerData: any = null;

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

          // Status mapping
          let status: 'succeeded' | 'failed' | 'pending' | 'requires_action' = 'pending';
          switch (event.type) {
            case 'payment_intent.succeeded':
              status = 'succeeded';
              break;
            case 'payment_intent.payment_failed':
              status = 'failed';
              break;
            case 'payment_intent.requires_action':
              status = 'requires_action';
              break;
            default:
              status = 'pending';
          }

          return {
            id: event.id,
            type: event.type,
            created: new Date(event.created * 1000).toISOString(),
            status,
            amount: paymentIntent.amount || 0,
            currency: paymentIntent.currency || 'eur',
            description: paymentIntent.description || metadata.description,
            metadata: {
              ...metadata,
              ...(orderData && { orderTitle: orderData.titel }),
              stripePaymentIntentId: paymentIntent.id,
            },
            orderId: metadata.orderId,
            customerId: metadata.customerId || metadata.userId,
            providerId: metadata.providerId || metadata.companyId,
            error: paymentIntent.last_payment_error?.message,
            webhookStatus: event.pending_webhooks > 0 ? 'pending' : 'delivered',
            rawStripeData: {
              payment_intent_id: paymentIntent.id,
              client_secret: paymentIntent.client_secret,
              confirmation_method: paymentIntent.confirmation_method,
              payment_method_types: paymentIntent.payment_method_types,
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
