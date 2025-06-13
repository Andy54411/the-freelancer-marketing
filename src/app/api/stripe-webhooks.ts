// src/app/api/stripe-webhooks.ts
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';

import * as admin from 'firebase-admin';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
}) : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    if (!stripe || !webhookSecret) {
      return res.status(500).send('Server-Konfigurationsfehler.');
    }
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature']!;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err: unknown) { // err ist hier vom Typ unknown
      let errorMessage = 'Fehler bei der Webhook-Signaturverifizierung.';
      if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
        errorMessage = `⚠️  Webhook signature verification failed: ${err.message}`;
      } else if (err instanceof Error) { // Fallback für andere Fehler
        errorMessage = `⚠️  Webhook error: ${err.message}`;
      }
      console.error(`[WEBHOOK ERROR] ${errorMessage}`, err);
      return res.status(400).send(errorMessage);
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntentSucceeded = event.data.object as Stripe.PaymentIntent;
        const tempJobDraftId = paymentIntentSucceeded.metadata?.tempJobDraftId;

        if (!tempJobDraftId) {
          return res.status(200).json({ received: true, message: 'Metadata tempJobDraftId missing.' });
        }

        try {
          const tempJobDraftRef = db.collection('temporaryJobDrafts').doc(tempJobDraftId);
          const auftragCollectionRef = db.collection('auftraege');

          await db.runTransaction(async (transaction) => {
            const tempJobDraftSnapshot = await transaction.get(tempJobDraftRef);

            if (tempJobDraftSnapshot.data()?.status === 'converted') {
              return;
            }
            if (!tempJobDraftSnapshot.exists) {
              throw new Error(`Temporärer Job-Entwurf ${tempJobDraftId} nicht gefunden.`);
            }

            const tempJobDraftData = tempJobDraftSnapshot.data();
            const firebaseUserId = paymentIntentSucceeded.metadata?.firebaseUserId;

            const auftragData = {
              ...tempJobDraftData,
              status: 'bezahlt',
              paymentIntentId: paymentIntentSucceeded.id,
              paidAt: admin.firestore.FieldValue.serverTimestamp(),
              customerFirebaseUid: firebaseUserId,
              tempJobDraftRefId: tempJobDraftId,
              // =========================================================
              // FINALE KORREKTUR: Timestamp-Objekt explizit neu erstellen
              // =========================================================
              createdAt: new admin.firestore.Timestamp(
                tempJobDraftData?.createdAt?._seconds || Math.floor(Date.now() / 1000),
                tempJobDraftData?.createdAt?._nanoseconds || 0
              ),
            };

            const newAuftragRef = auftragCollectionRef.doc();
            transaction.set(newAuftragRef, auftragData);

            transaction.update(tempJobDraftRef, {
              status: 'converted',
              convertedToOrderId: newAuftragRef.id,
            });
          });
        } catch (dbError: unknown) { // dbError ist hier vom Typ unknown
          let dbErrorMessage = "Unbekannter Datenbankfehler bei der Job-Konvertierung.";
          if (dbError instanceof Error) {
            dbErrorMessage = dbError.message;
          }
          console.error(`[WEBHOOK ERROR] Fehler in der Transaktion:`, dbError);
          return res.status(200).json({ received: true, message: `Job conversion failed: ${dbErrorMessage}` });
        }
        break;
      }
      // ... andere cases ...
      default:
        console.log(`[WEBHOOK LOG] Unbehandelter Event-Typ ${event.type}.`);
    }

    res.status(200).json({ received: true });
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}