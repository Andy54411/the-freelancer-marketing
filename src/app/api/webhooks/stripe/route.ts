import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db as adminDb } from '@/firebase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      // Balance Updates
      case 'balance.available':
        await handleBalanceUpdate(event.data.object as Stripe.Balance);
        break;

      // Payout Events
      case 'payout.created':
      case 'payout.updated':
      case 'payout.paid':
      case 'payout.failed':
        await handlePayoutEvent(event.data.object as Stripe.Payout, event.type);
        break;

      // Transfer Events (für Connected Accounts)
      case 'transfer.created':
      case 'transfer.updated':
        await handleTransferEvent(event.data.object as Stripe.Transfer, event.type);
        break;

      // Application Fee Events
      case 'application_fee.created':
        await handleApplicationFeeEvent(event.data.object as Stripe.ApplicationFee);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleBalanceUpdate(balance: Stripe.Balance) {
  console.log('🔄 Balance update received:', balance);

  // Update cached balance in Firestore
  const balanceDoc = adminDb.collection('stripe_cache').doc('platform_balance');
  await balanceDoc.set(
    {
      available: balance.available,
      pending: balance.pending,
      connect_reserved: balance.connect_reserved || [],
      instant_available: balance.instant_available || [],
      updated_at: new Date(),
      last_webhook_event: 'balance.available',
    },
    { merge: true }
  );
}

async function handlePayoutEvent(payout: Stripe.Payout, eventType: string) {
  console.log(`💰 Payout event: ${eventType}`, payout.id);

  // Update payout in Firestore
  const payoutDoc = adminDb.collection('stripe_payouts').doc(payout.id);
  await payoutDoc.set(
    {
      id: payout.id,
      amount: payout.amount,
      currency: payout.currency,
      status: payout.status,
      arrival_date: payout.arrival_date,
      method: payout.method,
      type: payout.type,
      description: payout.description,
      destination: payout.destination,
      created: payout.created,
      updated_at: new Date(),
      event_type: eventType,
    },
    { merge: true }
  );

  // Trigger real-time update für alle betroffenen Connected Accounts
  await triggerRealtimeUpdate('payout_updated', { payoutId: payout.id, status: payout.status });
}

async function handleTransferEvent(transfer: Stripe.Transfer, eventType: string) {
  console.log(`🔄 Transfer event: ${eventType}`, transfer.id);

  // Update transfer in Firestore
  const transferDoc = adminDb.collection('stripe_transfers').doc(transfer.id);
  await transferDoc.set(
    {
      id: transfer.id,
      amount: transfer.amount,
      currency: transfer.currency,
      destination: transfer.destination,
      created: transfer.created,
      description: transfer.description,
      metadata: transfer.metadata,
      updated_at: new Date(),
      event_type: eventType,
    },
    { merge: true }
  );
}

async function handleApplicationFeeEvent(fee: Stripe.ApplicationFee) {
  console.log('💼 Application fee created:', fee.id);

  // Update fee in Firestore
  const feeDoc = adminDb.collection('stripe_fees').doc(fee.id);
  await feeDoc.set(
    {
      id: fee.id,
      amount: fee.amount,
      currency: fee.currency,
      created: fee.created,
      charge: fee.charge,
      account: fee.account,
      updated_at: new Date(),
    },
    { merge: true }
  );
}

async function triggerRealtimeUpdate(eventType: string, data: any) {
  // Trigger real-time updates via Firestore
  const realtimeDoc = adminDb.collection('realtime_events').doc();
  await realtimeDoc.set({
    event_type: eventType,
    data,
    timestamp: new Date(),
    processed: false,
  });
}
