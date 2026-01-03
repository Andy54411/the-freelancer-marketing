/**
 * Revolut Storage Subscription Webhook Handler
 * 
 * Verarbeitet Subscription-Events für Storage-Abonnements:
 * - ORDER_COMPLETED: Setup-Zahlung erfolgreich, Storage aktivieren
 * - SUBSCRIPTION_PAYMENT_COMPLETED: Monatliche Zahlung erfolgreich
 * - SUBSCRIPTION_PAYMENT_FAILED: Zahlung fehlgeschlagen
 * - SUBSCRIPTION_CANCELLED: Abo gekündigt
 * - SUBSCRIPTION_RENEWED: Abo automatisch verlängert
 */

import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/firebase/server';
import { z } from 'zod';
import crypto from 'crypto';

const REVOLUT_WEBHOOK_SECRET = process.env.REVOLUT_BUSINESS_WEBHOOK_SECRET;

/**
 * Verifiziert die Webhook-Signatur von Revolut
 * 
 * Signatur-Format laut Revolut Docs (v2):
 * - Header: Revolut-Signature mit Format "v1=<hex_signature>"
 * - Timestamp: Revolut-Request-Timestamp (UNIX timestamp in ms)
 * - Payload to sign: "v1.{timestamp}.{raw_payload}"
 * - HMAC-SHA256 mit dem Signing Secret
 */
function verifyWebhookSignature(
  payload: string, 
  signatureHeader: string | null,
  timestampHeader: string | null
): boolean {
  if (!REVOLUT_WEBHOOK_SECRET || !signatureHeader) {
    return process.env.NODE_ENV !== 'production';
  }

  try {
    // Extrahiere alle Signaturen (können mehrere sein, komma-getrennt)
    const signatures = signatureHeader.split(',').map(s => s.trim());
    
    // Timestamp für die Signatur-Berechnung
    const timestamp = timestampHeader || '';
    
    // Payload to sign: "v1.{timestamp}.{raw_payload}"
    const payloadToSign = `v1.${timestamp}.${payload}`;
    
    // Berechne erwartete Signatur
    const expectedSignature = 'v1=' + crypto
      .createHmac('sha256', REVOLUT_WEBHOOK_SECRET)
      .update(payloadToSign)
      .digest('hex');
    
    // Prüfe ob eine der Signaturen übereinstimmt
    for (const sig of signatures) {
      try {
        if (crypto.timingSafeEqual(
          Buffer.from(sig),
          Buffer.from(expectedSignature)
        )) {
          return true;
        }
      } catch {
        continue;
      }
    }
    
    return false;
  } catch {
    return false;
  }
}

const RevolutWebhookSchema = z.object({
  event: z.string(),
  order_id: z.string().optional(),
  subscription_id: z.string().optional(),
  external_reference: z.string().optional(),
  timestamp: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('revolut-signature');
    const timestamp = request.headers.get('revolut-request-timestamp');

    // Verify signature in production
    if (process.env.REVOLUT_ENVIRONMENT === 'production') {
      if (!verifyWebhookSignature(payload, signature, timestamp)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const body = JSON.parse(payload);
    const validation = RevolutWebhookSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    const { event, order_id, subscription_id, external_reference } = validation.data;
    const db = admin.firestore();

    // Helper: Find subscription by local ID or Revolut subscription ID
    async function findSubscription(localId?: string, revolutId?: string) {
      if (localId) {
        const snapshot = await db.collectionGroup('storage_subscriptions')
          .where('localId', '==', localId)
          .limit(1)
          .get();
        if (!snapshot.empty) return snapshot.docs[0];
      }
      
      if (revolutId) {
        const snapshot = await db.collectionGroup('storage_subscriptions')
          .where('revolutSubscriptionId', '==', revolutId)
          .limit(1)
          .get();
        if (!snapshot.empty) return snapshot.docs[0];
      }

      // Fallback: Search by setup order ID
      if (order_id) {
        const snapshot = await db.collectionGroup('storage_subscriptions')
          .where('setupOrderId', '==', order_id)
          .limit(1)
          .get();
        if (!snapshot.empty) return snapshot.docs[0];
      }

      return null;
    }

    switch (event) {
      case 'ORDER_COMPLETED': {
        // Setup Order abgeschlossen - Abo aktivieren
        const subscriptionDoc = await findSubscription(external_reference, subscription_id);
        
        if (!subscriptionDoc) {
          return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
        }

        const subscriptionData = subscriptionDoc.data();
        const pathParts = subscriptionDoc.ref.path.split('/');
        const companyId = pathParts[1];

        // Update subscription status
        await subscriptionDoc.ref.update({
          status: 'active',
          activatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastPaymentAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update company storage limit
        const companyRef = db.collection('companies').doc(companyId);
        await companyRef.update({
          storageLimit: subscriptionData.storage,
          storagePlanId: subscriptionData.planId,
          storagePlanName: subscriptionData.planName,
          revolutStorageSubscriptionId: subscriptionData.revolutSubscriptionId,
          storageSubscriptionStatus: 'active',
          storageSubscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          pendingStorageSubscription: admin.firestore.FieldValue.delete(),
        });

        break;
      }

      case 'SUBSCRIPTION_PAYMENT_COMPLETED': {
        // Monatliche Zahlung erfolgreich
        const subscriptionDoc = await findSubscription(external_reference, subscription_id);
        
        if (subscriptionDoc) {
          await subscriptionDoc.ref.update({
            lastPaymentAt: admin.firestore.FieldValue.serverTimestamp(),
            paymentCount: admin.firestore.FieldValue.increment(1),
          });
        }
        break;
      }

      case 'SUBSCRIPTION_PAYMENT_FAILED': {
        // Zahlung fehlgeschlagen
        const subscriptionDoc = await findSubscription(external_reference, subscription_id);
        
        if (subscriptionDoc) {
          const pathParts = subscriptionDoc.ref.path.split('/');
          const companyId = pathParts[1];

          await subscriptionDoc.ref.update({
            status: 'payment_failed',
            lastPaymentFailedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Company benachrichtigen
          await db.collection('companies').doc(companyId).update({
            storageSubscriptionStatus: 'payment_failed',
          });
        }
        break;
      }

      case 'SUBSCRIPTION_CANCELLED': {
        // Abo gekündigt
        const subscriptionDoc = await findSubscription(external_reference, subscription_id);
        
        if (subscriptionDoc) {
          const subscriptionData = subscriptionDoc.data();
          const pathParts = subscriptionDoc.ref.path.split('/');
          const companyId = pathParts[1];

          await subscriptionDoc.ref.update({
            status: 'cancelled',
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Storage auf Basis-Limit zurücksetzen
          await db.collection('companies').doc(companyId).update({
            storageLimit: 2 * 1024 * 1024 * 1024, // 2 GB Basis
            storagePlanId: 'free',
            storagePlanName: 'Basis',
            storageSubscriptionStatus: 'cancelled',
            previousStoragePlan: subscriptionData.planId,
          });
        }
        break;
      }

      case 'SUBSCRIPTION_RENEWED': {
        // Abo automatisch verlängert
        const subscriptionDoc = await findSubscription(external_reference, subscription_id);
        
        if (subscriptionDoc) {
          await subscriptionDoc.ref.update({
            renewedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active',
          });
        }
        break;
      }

      default:
        // Unbekanntes Event - ignorieren
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
