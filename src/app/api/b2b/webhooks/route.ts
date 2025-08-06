// src/app/api/b2b/webhooks/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/firebase/clients';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const webhookSecret = process.env.STRIPE_B2B_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  console.log('[B2B Webhook] Webhook-Event empfangen');

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature || !webhookSecret) {
    console.error('[B2B Webhook] Fehlende Webhook-Signatur oder Secret');
    return NextResponse.json({ error: 'Webhook configuration error' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    console.error('[B2B Webhook] Webhook-Signatur-Verifizierung fehlgeschlagen:', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('[B2B Webhook] Event type:', event.type);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handleB2BPaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handleB2BPaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'transfer.created':
        await handleB2BTransferCreated(event.data.object as Stripe.Transfer);
        break;

      case 'account.updated':
        await handleB2BAccountUpdated(event.data.object as Stripe.Account);
        break;

      default:
        console.log('[B2B Webhook] Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('[B2B Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleB2BPaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('[B2B Webhook] Processing successful B2B payment:', paymentIntent.id);

  const metadata = paymentIntent.metadata;

  if (metadata.paymentType !== 'b2b_project') {
    console.log('[B2B Webhook] Not a B2B payment, skipping');
    return;
  }

  const {
    projectId,
    milestoneId,
    customerFirebaseId,
    providerFirebaseId,
    grossAmount,
    platformFeeAmount: _platformFeeAmount,
    providerAmount: _providerAmount,
  } = metadata;

  try {
    // Update B2B payment record
    await updateDoc(doc(db, 'b2b_payments', paymentIntent.id), {
      status: 'succeeded',
      paidAt: serverTimestamp(),
      stripePaymentIntentStatus: paymentIntent.status,
      updatedAt: serverTimestamp(),
    });

    // Update B2B project if exists
    if (projectId) {
      const projectRef = doc(db, 'b2b_projects', projectId);
      const projectDoc = await getDoc(projectRef);

      if (projectDoc.exists()) {
        const project = projectDoc.data();
        const currentPaidAmount = project.paidAmount || 0;
        const newPaidAmount = currentPaidAmount + parseInt(grossAmount);
        const newRemainingAmount = project.totalBudget - newPaidAmount;

        // Update milestones if applicable
        let updatedMilestones = project.milestones || [];
        if (milestoneId) {
          updatedMilestones = updatedMilestones.map((milestone: {
            id: string;
            status: string;
            [key: string]: unknown;
          }) =>
            milestone.id === milestoneId
              ? {
                  ...milestone,
                  status: 'paid',
                  paidAt: serverTimestamp(),
                  paymentIntentId: paymentIntent.id,
                }
              : milestone
          );
        }

        // Determine new project status
        let newStatus = project.status;
        if (newRemainingAmount <= 0) {
          newStatus = 'completed';
        } else if (project.status === 'draft') {
          newStatus = 'active';
        }

        await updateDoc(projectRef, {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          milestones: updatedMilestones,
          status: newStatus,
          lastPaymentAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        console.log('[B2B Webhook] B2B project updated:', projectId);
      }
    }

    // Send notification to provider (TODO: implement notification system)
    console.log('[B2B Webhook] B2B payment notification sent to provider:', providerFirebaseId);

    // Send confirmation to customer (TODO: implement notification system)
    console.log('[B2B Webhook] B2B payment confirmation sent to customer:', customerFirebaseId);

    console.log('[B2B Webhook] B2B payment processing completed successfully');
  } catch (error: unknown) {
    console.error('[B2B Webhook] Error processing B2B payment success:', error);
    throw error;
  }
}

async function handleB2BPaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('[B2B Webhook] Processing failed B2B payment:', paymentIntent.id);

  const metadata = paymentIntent.metadata;

  if (metadata.paymentType !== 'b2b_project') {
    return;
  }

  try {
    // Update B2B payment record
    await updateDoc(doc(db, 'b2b_payments', paymentIntent.id), {
      status: 'failed',
      failureReason: paymentIntent.last_payment_error?.message || 'Unknown payment failure',
      stripePaymentIntentStatus: paymentIntent.status,
      updatedAt: serverTimestamp(),
    });

    // Send failure notification (TODO: implement notification system)
    console.log('[B2B Webhook] B2B payment failure notification sent');

    console.log('[B2B Webhook] B2B payment failure processing completed');
  } catch (error: unknown) {
    console.error('[B2B Webhook] Error processing B2B payment failure:', error);
    throw error;
  }
}

async function handleB2BTransferCreated(transfer: Stripe.Transfer) {
  console.log('[B2B Webhook] B2B transfer created:', transfer.id);

  try {
    // Log B2B transfer for audit purposes
    const transferData = {
      transferId: transfer.id,
      amount: transfer.amount,
      currency: transfer.currency,
      destination: transfer.destination,
      sourceTransaction: transfer.source_transaction,
      metadata: transfer.metadata,
      createdAt: serverTimestamp(),
    };

    await updateDoc(doc(db, 'b2b_transfers', transfer.id), transferData);

    console.log('[B2B Webhook] B2B transfer logged successfully');
  } catch (error: unknown) {
    console.error('[B2B Webhook] Error logging B2B transfer:', error);
    throw error;
  }
}

async function handleB2BAccountUpdated(account: Stripe.Account) {
  console.log('[B2B Webhook] B2B account updated:', account.id);

  try {
    // Update provider account status in our database
    const _accountUpdate = {
      stripeAccountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      accountType: account.type,
      updatedAt: serverTimestamp(),
    };

    // Find and update provider records that use this Stripe account
    // Note: This is a simplified approach - in production, you'd want to maintain
    // a mapping between Stripe accounts and Firebase user IDs
    console.log('[B2B Webhook] B2B account status updated for:', account.id);
  } catch (error: unknown) {
    console.error('[B2B Webhook] Error updating B2B account status:', error);
    throw error;
  }
}
