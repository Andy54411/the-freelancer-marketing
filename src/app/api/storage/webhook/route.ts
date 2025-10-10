// src/app/api/storage/webhook/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { admin } from '@/firebase/server';

function getStripeInstance() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret) {
    return null;
  }

  return new Stripe(stripeSecret, {
    apiVersion: '2024-06-20',
  });
}

export async function POST(request: NextRequest) {
  const stripe = getStripeInstance();
  if (!stripe) {
    return NextResponse.json({ error: 'Storage Webhook Service nicht verfügbar' }, { status: 500 });
  }

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: `Webhook Error: ${err instanceof Error ? err.message : 'Unknown'}` },
      { status: 400 }
    );
  }

  try {
    const db = admin.firestore();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.metadata?.type === 'storage_subscription') {
          const companyId = session.metadata.companyId;
          const customerId = session.metadata.customerId || null;
          const planId = session.metadata.planId;
          const storage = parseInt(session.metadata.storage);

          // Update storage limit in Firestore
          if (customerId) {
            // Storage for specific customer
            const customerRef = db
              .collection('companies')
              .doc(companyId)
              .collection('customers')
              .doc(customerId);
            await customerRef.update({
              storageLimit: storage,
              storagePlanId: planId,
              stripeSubscriptionId: session.subscription,
              subscriptionStatus: 'active',
              subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else {
            // Storage for company
            const companyRef = db.collection('companies').doc(companyId);
            await companyRef.update({
              storageLimit: storage,
              storagePlanId: planId,
              stripeSubscriptionId: session.subscription,
              subscriptionStatus: 'active',
              subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }

          // Update subscription log
          const subscriptionLogRef = db
            .collection('companies')
            .doc(companyId)
            .collection('storage_subscriptions')
            .doc(session.id);

          await subscriptionLogRef.update({
            status: 'active',
            subscriptionId: session.subscription,
            activatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`✅ Storage subscription activated for company ${companyId}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        if (subscription.metadata?.companyId) {
          const companyId = subscription.metadata.companyId;
          const customerId = subscription.metadata.customerId || null;
          const status = subscription.status;

          const updateData: any = {
            subscriptionStatus: status,
            subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          if (customerId) {
            const customerRef = db
              .collection('companies')
              .doc(companyId)
              .collection('customers')
              .doc(customerId);
            await customerRef.update(updateData);
          } else {
            const companyRef = db.collection('companies').doc(companyId);
            await companyRef.update(updateData);
          }

          console.log(`✅ Storage subscription updated: ${status} for company ${companyId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        if (subscription.metadata?.companyId) {
          const companyId = subscription.metadata.companyId;
          const customerId = subscription.metadata.customerId || null;

          // CHECK: Cancellation consent must exist
          const companyRef = db.collection('companies').doc(companyId);
          const companyDoc = await companyRef.get();

          if (!companyDoc.exists) {
            console.error(`❌ Company ${companyId} not found for cancellation`);
            break;
          }

          const companyData = companyDoc.data();
          const consent = companyData?.storageCancellation;

          if (!consent?.consentGiven) {
            console.error(`❌ No cancellation consent found for company ${companyId}`);
            // Don't process cancellation without consent
            break;
          }

          const usage = companyData?.usage || {};
          const currentUsage = (usage.storageUsed || 0) + (usage.firestoreUsed || 0);
          const freeLimit = 500 * 1024 * 1024; // 500 MB

          // Reset to Free plan (500 MB)
          const updateData: any = {
            storageLimit: freeLimit,
            storagePlanId: 'free',
            stripeSubscriptionId: null,
            subscriptionStatus: 'canceled',
            subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            canceledAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          // If over limit: Block uploads and downloads
          if (currentUsage > freeLimit) {
            updateData['storage.uploadsBlocked'] = true;
            updateData['storage.downloadsBlocked'] = true;
            updateData['storage.blockReason'] = 'over_limit_after_cancellation';
            updateData['storage.blockedAt'] = admin.firestore.FieldValue.serverTimestamp();

            // Schedule data deletion in 30 days
            const deletionDate = new Date();
            deletionDate.setDate(deletionDate.getDate() + 30);
            updateData['storage.scheduledDeletionDate'] =
              admin.firestore.Timestamp.fromDate(deletionDate);

            console.log(
              `⚠️ Company ${companyId} over limit (${currentUsage} / ${freeLimit}). Uploads/Downloads blocked. Deletion scheduled for ${deletionDate.toISOString()}`
            );

            // Send warning email
            try {
              const { StorageEmailService } = await import('@/services/storageEmailService');
              await StorageEmailService.sendCancellationWarningEmail(
                {
                  email: companyData.email || companyData.contactEmail,
                  companyName: companyData.companyName || 'Ihr Unternehmen',
                  companyId: companyId,
                },
                currentUsage,
                deletionDate
              );
            } catch (emailError) {
              console.error('Error sending cancellation warning email:', emailError);
            }
          }

          if (customerId) {
            const customerRef = db
              .collection('companies')
              .doc(companyId)
              .collection('customers')
              .doc(customerId);
            await customerRef.update(updateData);
          } else {
            await companyRef.update(updateData);
          }

          console.log(
            `✅ Storage subscription canceled for company ${companyId}, reset to 500MB free plan`
          );
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
