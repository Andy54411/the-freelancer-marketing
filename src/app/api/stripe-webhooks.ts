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

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    })
  : null;

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
    } catch (err: unknown) {
      // err ist hier vom Typ unknown
      let errorMessage = 'Fehler bei der Webhook-Signaturverifizierung.';
      if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
        errorMessage = `⚠️  Webhook signature verification failed: ${err.message}`;
      } else if (err instanceof Error) {
        // Fallback für andere Fehler
        errorMessage = `⚠️  Webhook error: ${err.message}`;
      }
      console.error(`[WEBHOOK ERROR] ${errorMessage}`, err);
      return res.status(400).send(errorMessage);
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntentSucceeded = event.data.object as Stripe.PaymentIntent;
        console.log(`[WEBHOOK LOG] payment_intent.succeeded: ${paymentIntentSucceeded.id}`);

        const paymentType = paymentIntentSucceeded.metadata?.type;

        // Handle additional hours payments
        if (paymentType === 'additional_hours_platform_hold') {
          console.log(
            `[WEBHOOK LOG] Processing additional hours payment: ${paymentIntentSucceeded.id}`
          );

          const orderId = paymentIntentSucceeded.metadata?.orderId;
          const entryIds = paymentIntentSucceeded.metadata?.entryIds;

          if (!orderId || !entryIds) {
            console.error(
              `[WEBHOOK ERROR] Fehlende Metadaten für zusätzliche Stunden im PI ${paymentIntentSucceeded.id}. orderId: ${orderId}, entryIds: ${entryIds}`
            );
            return res.status(200).json({
              received: true,
              message: 'Wichtige Metadaten (orderId oder entryIds) für zusätzliche Stunden fehlen.',
            });
          }

          try {
            const entryIdsList = entryIds.split(',');
            const orderRef = db.collection('auftraege').doc(orderId);

            await db.runTransaction(async transaction => {
              const orderSnapshot = await transaction.get(orderRef);

              if (!orderSnapshot.exists) {
                throw new Error(`Auftrag ${orderId} nicht gefunden.`);
              }

              const orderData = orderSnapshot.data()!;

              // WICHTIG: TimeEntries sind im Array gespeichert, nicht als Subcollection!
              const timeEntries = orderData.timeEntries || [];
              let updatedCount = 0;

              const updatedTimeEntries = timeEntries.map((entry: any) => {
                // Check if this entry is in the entryIds list and has billing_pending status
                if (entryIdsList.includes(entry.id) && entry.status === 'billing_pending') {
                  updatedCount++;
                  console.log(`[WEBHOOK LOG] TimeEntry ${entry.id} marked as platform_held`);
                  return {
                    ...entry,
                    status: 'platform_held',
                    paidAt: admin.firestore.FieldValue.serverTimestamp(),
                    paymentIntentId: paymentIntentSucceeded.id,
                  };
                }
                return entry;
              });

              // Update the order document with the fixed time entries
              transaction.update(orderRef, {
                timeEntries: updatedTimeEntries,
                'timeTracking.status': 'completed',
                'timeTracking.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
              });

              console.log(
                `[WEBHOOK LOG] Updated ${updatedCount} time entries to platform_held status`
              );

              // Update company balance
              const providerStripeAccountId =
                paymentIntentSucceeded.metadata?.providerStripeAccountId;
              const companyReceives = paymentIntentSucceeded.metadata?.companyReceives;

              if (providerStripeAccountId && companyReceives) {
                const companyRef = db
                  .collection('companies')
                  .where('stripeAccountId', '==', providerStripeAccountId)
                  .limit(1);
                const companySnapshot = await companyRef.get();

                if (!companySnapshot.empty) {
                  const companyDoc = companySnapshot.docs[0];
                  const currentBalance = companyDoc.data().platformHoldBalance || 0;
                  const additionalAmount = parseInt(companyReceives, 10);

                  transaction.update(companyDoc.ref, {
                    platformHoldBalance: currentBalance + additionalAmount,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                  });

                  console.log(
                    `[WEBHOOK LOG] Company balance updated: +${additionalAmount} cents (Platform Hold)`
                  );

                  // Create audit trail
                  const auditRef = companyDoc.ref.collection('balanceHistory').doc();
                  transaction.set(auditRef, {
                    type: 'additional_hours_payment',
                    amount: additionalAmount,
                    paymentIntentId: paymentIntentSucceeded.id,
                    orderId: orderId,
                    entryIds: entryIdsList,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'platform_held',
                  });
                }
              }
            });

            console.log(
              `[WEBHOOK LOG] Additional hours payment processed successfully for order ${orderId}`
            );
          } catch (dbError: unknown) {
            let dbErrorMessage =
              'Unbekannter Datenbankfehler bei der Verarbeitung zusätzlicher Stunden.';
            if (dbError instanceof Error) {
              dbErrorMessage = dbError.message;
            }
            console.error(`[WEBHOOK ERROR] Fehler bei zusätzlichen Stunden:`, dbError);
            return res.status(200).json({
              received: true,
              message: `Additional hours processing failed: ${dbErrorMessage}`,
            });
          }
          break;
        }

        // Handle regular order payments
        const tempJobDraftId = paymentIntentSucceeded.metadata?.tempJobDraftId;
        const firebaseUserId = paymentIntentSucceeded.metadata?.firebaseUserId;

        if (!tempJobDraftId || !firebaseUserId) {
          console.error(
            `[WEBHOOK ERROR] Fehlende Metadaten im PI ${paymentIntentSucceeded.id}. tempJobDraftId: ${tempJobDraftId}, firebaseUserId: ${firebaseUserId}`
          );
          // Wichtig: Trotzdem 200 an Stripe senden, um Wiederholungen zu vermeiden, aber den Fehler loggen.
          return res.status(200).json({
            received: true,
            message: 'Wichtige Metadaten (tempJobDraftId oder firebaseUserId) fehlen.',
          });
        }

        try {
          const tempJobDraftRef = db.collection('temporaryJobDrafts').doc(tempJobDraftId);
          const auftragCollectionRef = db.collection('auftraege');

          await db.runTransaction(async transaction => {
            const tempJobDraftSnapshot = await transaction.get(tempJobDraftRef);

            if (tempJobDraftSnapshot.data()?.status === 'converted') {
              console.log(
                `[WEBHOOK LOG] Job-Entwurf ${tempJobDraftId} wurde bereits konvertiert. Überspringe.`
              );
              return;
            }
            if (!tempJobDraftSnapshot.exists) {
              throw new Error(`Temporärer Job-Entwurf ${tempJobDraftId} nicht gefunden.`);
            }

            const tempJobDraftData = tempJobDraftSnapshot.data()!; // Non-null assertion, da Existenz geprüft

            // Berechnung für die Clearing-Periode (z.B. 14 Tage)
            const clearingPeriodDays = 14;
            const paidAtDate = new Date(); // Zeitpunkt der erfolgreichen Zahlung
            const clearingEndsDate = new Date(
              paidAtDate.getTime() + clearingPeriodDays * 24 * 60 * 60 * 1000
            );
            const clearingPeriodEndsAtTimestamp =
              admin.firestore.Timestamp.fromDate(clearingEndsDate);

            // KRITISCHE KORREKTUR: Berechne jobTotalCalculatedHours neu für Multi-Tag Aufträge
            let correctedJobTotalCalculatedHours = tempJobDraftData.jobTotalCalculatedHours;

            // Prüfe, ob es ein Multi-Tag Auftrag ist und korrigiere die Stunden
            if (tempJobDraftData.jobDateFrom && tempJobDraftData.jobDateTo) {
              const startDate = new Date(tempJobDraftData.jobDateFrom);
              const endDate = new Date(tempJobDraftData.jobDateTo);

              if (startDate.getTime() !== endDate.getTime()) {
                // Multi-Tag Auftrag: Berechne Tage und multipliziere
                const daysDiff =
                  Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                // Extrahiere Stunden pro Tag aus jobDurationString
                const durationMatch = tempJobDraftData.jobDurationString?.match(/(\d+(\.\d+)?)/);
                const hoursPerDay = durationMatch ? parseFloat(durationMatch[1]) : 8; // Fallback auf 8 Stunden

                correctedJobTotalCalculatedHours = hoursPerDay * daysDiff;
                console.log(
                  `[WEBHOOK CORRECTION] Multi-Tag Auftrag korrigiert: ${daysDiff} Tage × ${hoursPerDay}h = ${correctedJobTotalCalculatedHours}h`
                );
              }
            }

            const auftragData = {
              ...tempJobDraftData,
              jobTotalCalculatedHours: correctedJobTotalCalculatedHours, // KORRIGIERTE Stunden verwenden
              status: 'zahlung_erhalten_clearing', // Neuer Status für die Clearing-Periode
              paymentIntentId: paymentIntentSucceeded.id,
              paidAt: admin.firestore.FieldValue.serverTimestamp(),
              customerFirebaseUid: firebaseUserId,
              tempJobDraftRefId: tempJobDraftId,
              // Detaillierte Preiskomponenten aus Metadaten (Strings in Zahlen umwandeln)
              originalJobPriceInCents: paymentIntentSucceeded.metadata?.originalJobPriceInCents
                ? parseInt(paymentIntentSucceeded.metadata.originalJobPriceInCents, 10)
                : 0,
              buyerServiceFeeInCents: paymentIntentSucceeded.metadata?.buyerServiceFeeInCents
                ? parseInt(paymentIntentSucceeded.metadata.buyerServiceFeeInCents, 10)
                : 0,
              sellerCommissionInCents: paymentIntentSucceeded.metadata?.sellerCommissionInCents
                ? parseInt(paymentIntentSucceeded.metadata.sellerCommissionInCents, 10)
                : 0,
              totalPlatformFeeInCents: paymentIntentSucceeded.metadata?.totalPlatformFeeInCents
                ? parseInt(paymentIntentSucceeded.metadata.totalPlatformFeeInCents, 10)
                : paymentIntentSucceeded.application_fee_amount || 0,
              totalAmountPaidByBuyer: paymentIntentSucceeded.amount, // Gesamtbetrag, den der Käufer gezahlt hat
              applicationFeeAmountFromStripe: paymentIntentSucceeded.application_fee_amount || 0, // Direkter Wert von Stripe
              // Stelle sicher, dass createdAt ein gültiger Timestamp ist
              createdAt: new admin.firestore.Timestamp(
                tempJobDraftData?.createdAt?._seconds || Math.floor(Date.now() / 1000),
                tempJobDraftData?.createdAt?._nanoseconds || 0
              ),
              paymentMethodId:
                typeof paymentIntentSucceeded.payment_method === 'string'
                  ? paymentIntentSucceeded.payment_method
                  : paymentIntentSucceeded.payment_method &&
                      typeof paymentIntentSucceeded.payment_method === 'object' &&
                      'id' in paymentIntentSucceeded.payment_method
                    ? (paymentIntentSucceeded.payment_method as Stripe.PaymentMethod).id
                    : null,
              stripeCustomerId:
                typeof paymentIntentSucceeded.customer === 'string'
                  ? paymentIntentSucceeded.customer
                  : paymentIntentSucceeded.customer &&
                      typeof paymentIntentSucceeded.customer === 'object' &&
                      'id' in paymentIntentSucceeded.customer
                    ? (paymentIntentSucceeded.customer as Stripe.Customer).id
                    : null,
              clearingPeriodEndsAt: clearingPeriodEndsAtTimestamp,
              buyerApprovedAt: null, // Wird später gesetzt
            };

            const newAuftragRef = auftragCollectionRef.doc();
            transaction.set(newAuftragRef, auftragData);

            transaction.update(tempJobDraftRef, {
              status: 'converted',
              convertedToOrderId: newAuftragRef.id,
            });
          });
          console.log(
            `[WEBHOOK LOG] Transaktion für Job ${tempJobDraftId} erfolgreich abgeschlossen.`
          );
        } catch (dbError: unknown) {
          // dbError ist hier vom Typ unknown
          let dbErrorMessage = 'Unbekannter Datenbankfehler bei der Job-Konvertierung.';
          if (dbError instanceof Error) {
            dbErrorMessage = dbError.message;
          }
          console.error(`[WEBHOOK ERROR] Fehler in der Transaktion:`, dbError);
          return res
            .status(200)
            .json({ received: true, message: `Job conversion failed: ${dbErrorMessage}` });
        }
        break;
      }
      // ... andere cases ...
      // Z.B. setup_intent.succeeded für das Speichern von Zahlungsmethoden
      // case 'setup_intent.succeeded': { ... }
      default:
        // Es ist wichtig, für unbehandelte Events trotzdem 200 OK zu senden,
        // damit Stripe nicht versucht, sie erneut zu senden.
        console.log(`[WEBHOOK LOG] Unbehandelter Event-Typ ${event.type}.`);
    }

    res.status(200).json({ received: true });
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}
