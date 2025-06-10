// Dies ist der korrekte Code für die Datei: firebase_functions/src/http_webhooks.ts

// Angepasste Imports für eine Firebase Cloud Function (v2)
import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import Stripe from 'stripe';

// Wir nutzen konsequent die zentralen Helfer aus helpers.ts
import { db, getStripeInstance, getStripeWebhookSecret } from './helpers';
import { FieldValue } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin'; // Behalten für admin.firestore.Timestamp

// KEINE globalen Initialisierungen mehr hier. Das behebt den Deployment-Fehler.

// Die Funktion wird als Firebase onRequest-Handler exportiert
export const stripeWebhookHandler = onRequest(async (request, response) => {
    logger.info(`[stripeWebhookHandler] Webhook aufgerufen, Methode: ${request.method}`);

    // Die Stripe-Instanz und das Secret werden hier sicher innerhalb der Funktion geladen
    const localStripe = getStripeInstance();
    const webhookSecret = getStripeWebhookSecret();

    if (request.method === 'POST') {
        // Der Request-Body wird bei Firebase Functions direkt über request.rawBody gelesen
        const buf = request.rawBody;
        const sig = request.headers['stripe-signature'];

        if (!sig) {
            logger.error('[stripeWebhookHandler] Missing stripe-signature header');
            response.status(400).send('Webhook Error: Missing stripe-signature header');
            return;
        }

        let event: Stripe.Event;

        try {
            // Die verifizierte Stripe-Instanz und das Secret werden hier verwendet
            event = localStripe.webhooks.constructEvent(buf, sig, webhookSecret);
            logger.info(`[stripeWebhookHandler] Event erfolgreich konstruiert: ${event.id}, Typ: ${event.type}`);
        } catch (err: unknown) {
            let message = 'Fehler bei der Webhook-Signaturverifizierung.';
            if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
                message = `⚠️  Webhook signature verification failed: ${err.message}`;
            } else if (err instanceof Error) {
                message = `⚠️  Webhook error: ${err.message}`;
            } else {
                message = '⚠️  Unknown error during webhook signature verification.';
            }
            logger.error(`[stripeWebhookHandler] ${message}`, err);
            response.status(400).send(message);
            return;
        }

        const eventType: string = event.type;

        // Ihre vollständige switch-Logik, 1-zu-1 übernommen und an die Firebase-Umgebung angepasst
        switch (eventType) {
            case 'payment_intent.succeeded': {
                const paymentIntentSucceeded = event.data.object as Stripe.PaymentIntent;
                logger.info(`[stripeWebhookHandler] PaymentIntent ${paymentIntentSucceeded.id} was successful!`);

                const tempJobDraftId = paymentIntentSucceeded.metadata?.tempJobDraftId;
                const firebaseUserId = paymentIntentSucceeded.metadata?.firebaseUserId;

                if (!tempJobDraftId || !firebaseUserId) {
                    logger.error(`[stripeWebhookHandler] WICHTIG: Fehlende Metadaten im PI ${paymentIntentSucceeded.id}.`);
                    response.status(200).json({ received: true, message: 'Missing metadata, handled with error logging' });
                    return;
                }

                logger.info(`[stripeWebhookHandler] Verarbeite erfolgreichen PaymentIntent ${paymentIntentSucceeded.id} für Job ${tempJobDraftId}`);

                try {
                    const tempJobDraftRef = db.collection('temporaryJobDrafts').doc(tempJobDraftId);
                    const auftragCollectionRef = db.collection('auftraege');

                    await db.runTransaction(async (transaction) => {
                        const tempJobDraftSnapshot = await transaction.get(tempJobDraftRef);

                        if (tempJobDraftSnapshot.data()?.status === 'converted') {
                            logger.info(`[stripeWebhookHandler] Job-Entwurf ${tempJobDraftId} wurde bereits konvertiert. Überspringe Verarbeitung.`);
                            return;
                        }

                        if (!tempJobDraftSnapshot.exists) {
                            throw new Error(`Temporärer Job-Entwurf ${tempJobDraftId} nicht gefunden.`);
                        }

                        const tempJobDraftData = tempJobDraftSnapshot.data()!;

                        const auftragData = {
                            ...tempJobDraftData,
                            status: 'bezahlt',
                            paymentIntentId: paymentIntentSucceeded.id,
                            paidAt: admin.firestore.FieldValue.serverTimestamp(),
                            customerFirebaseUid: firebaseUserId,
                            tempJobDraftRefId: tempJobDraftId,
                            totalPriceInCents: paymentIntentSucceeded.amount,
                            createdAt: new admin.firestore.Timestamp(
                                tempJobDraftData.createdAt?._seconds || Math.floor(Date.now() / 1000),
                                tempJobDraftData.createdAt?._nanoseconds || 0
                            ),
                        };

                        const newAuftragRef = auftragCollectionRef.doc();
                        transaction.set(newAuftragRef, auftragData);
                        transaction.update(tempJobDraftRef, {
                            status: 'converted',
                            convertedToOrderId: newAuftragRef.id,
                        });
                        logger.info(`[stripeWebhookHandler] Auftrag ${newAuftragRef.id} erstellt und Entwurf ${tempJobDraftId} aktualisiert.`);
                    });
                } catch (dbError: any) {
                    logger.error(`[stripeWebhookHandler] Fehler bei der Job-Konvertierung (Draft ${tempJobDraftId} zu Auftrag):`, dbError);
                    response.status(200).json({ received: true, message: `Job conversion failed: ${dbError.message}` });
                    return;
                }
                break;
            }

            case 'payment_intent.payment_failed': {
                const paymentIntentFailed = event.data.object as Stripe.PaymentIntent;
                logger.info(`[stripeWebhookHandler] PaymentIntent ${paymentIntentFailed.id} failed. Reason: ${paymentIntentFailed.last_payment_error?.message}`);
                break;
            }

            case 'payment_intent.created': {
                const paymentIntentCreated = event.data.object as Stripe.PaymentIntent;
                logger.info(`[stripeWebhookHandler] PaymentIntent ${paymentIntentCreated.id} created.`);
                break;
            }

            case 'payment_intent.processing': {
                const paymentIntentProcessing = event.data.object as Stripe.PaymentIntent;
                logger.info(`[stripeWebhookHandler] PaymentIntent ${paymentIntentProcessing.id} is processing.`);
                break;
            }

            case 'charge.succeeded': {
                const chargeSucceeded = event.data.object as Stripe.Charge;
                logger.info(`[stripeWebhookHandler] Charge ${chargeSucceeded.id} for PaymentIntent ${chargeSucceeded.payment_intent} succeeded.`);
                break;
            }

            case 'charge.updated': {
                const chargeUpdated = event.data.object as Stripe.Charge;
                logger.info(`[stripeWebhookHandler] Charge ${chargeUpdated.id} updated.`);
                break;
            }

            case 'account.updated': {
                const accountUpdated = event.data.object as Stripe.Account;
                logger.info(`[stripeWebhookHandler] Connected account ${accountUpdated.id} updated. Charges: ${accountUpdated.charges_enabled}, Payouts: ${accountUpdated.payouts_enabled}`);
                break;
            }

            case 'transfer.created': {
                const transferCreated = event.data.object as Stripe.Transfer;
                logger.info(`[stripeWebhookHandler] Transfer ${transferCreated.id} to ${transferCreated.destination} - Event: ${eventType}`);
                break;
            }

            case 'transfer.paid': {
                const transferPaid = event.data.object as Stripe.Transfer;
                logger.info(`[stripeWebhookHandler] Transfer ${transferPaid.id} to ${transferPaid.destination} - Event: ${eventType}`);
                break;
            }

            case 'transfer.failed': {
                const transferFailed = event.data.object as Stripe.Transfer;
                logger.info(`[stripeWebhookHandler] Transfer ${transferFailed.id} to ${transferFailed.destination} - Event: ${eventType}`);
                break;
            }

            case 'payout.paid': {
                const payoutPaid = event.data.object as Stripe.Payout;
                logger.info(`[stripeWebhookHandler] Payout ${payoutPaid.id} to ${payoutPaid.destination} - Event: ${eventType}`);
                break;
            }

            case 'payout.failed': {
                const payoutFailed = event.data.object as Stripe.Payout;
                logger.info(`[stripeWebhookHandler] Payout ${payoutFailed.id} to ${payoutFailed.destination} - Event: ${eventType}`);
                break;
            }

            default:
                logger.info(`[stripeWebhookHandler] Unhandled event type ${eventType}. Data:`, JSON.stringify(event.data.object, null, 2));
        }

        logger.info(`[stripeWebhookHandler] Sending 200 OK for event ${event.id}`);
        response.status(200).json({ received: true });
    } else {
        logger.warn(`[stripeWebhookHandler] Methode ${request.method} nicht erlaubt.`);
        response.setHeader('Allow', 'POST');
        response.status(405).end('Method Not Allowed');
    }
});