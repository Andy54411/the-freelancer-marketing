// src/app/api/stripe-webhooks.ts
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';

// --- NEUE IMPORTE FÜR FIREBASE ADMIN SDK ---
import * as admin from 'firebase-admin';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
    initializeApp();
}
const db = getFirestore(); // Firestore-Instanz

export const config = {
    api: {
        bodyParser: false,
    },
};

const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
    // ANGEPASST: Eine gültige, datumsbasierte API-Version verwenden
    apiVersion: '2025-05-28.basil',
    typescript: true,
}) : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    console.log(`[WEBHOOK LOG] /api/stripe-webhooks aufgerufen, Methode: ${req.method}`);

    if (!stripe) {
        console.error('[WEBHOOK ERROR] Stripe wurde nicht initialisiert, da STRIPE_SECRET_KEY fehlt.');
        return res.status(500).send('Webhook Error: Server configuration error (Stripe key missing).');
    }
    if (!webhookSecret) {
        console.error('[WEBHOOK ERROR] Stripe webhook secret ist nicht auf dem Server konfiguriert.');
        return res.status(500).send('Webhook Error: Server configuration error (webhook secret missing).');
    }

    if (req.method === 'POST') {
        const buf = await buffer(req);
        const sig = req.headers['stripe-signature'];

        if (!sig) {
            console.error('[WEBHOOK ERROR] Missing stripe-signature header');
            return res.status(400).send('Webhook Error: Missing stripe-signature header');
        }

        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
            console.log(`[WEBHOOK LOG] Event erfolgreich konstruiert: ${event.id}, Typ: ${event.type}`);
        } catch (err: unknown) {
            let message = 'Fehler bei der Webhook-Signaturverifizierung.';
            if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
                message = `⚠️  Webhook signature verification failed: ${err.message}`;
            } else if (err instanceof Error) {
                message = `⚠️  Webhook error: ${err.message}`;
            } else {
                message = '⚠️  Unknown error during webhook signature verification.';
            }
            console.error(`[WEBHOOK ERROR] ${message}`, err);
            return res.status(400).send(message);
        }

        const eventType: string = event.type;

        switch (eventType) {
            case 'payment_intent.succeeded': {
                const paymentIntentSucceeded = event.data.object as Stripe.PaymentIntent;
                console.log(`[WEBHOOK LOG] PaymentIntent ${paymentIntentSucceeded.id} was successful!`);

                const tempJobDraftId = paymentIntentSucceeded.metadata?.tempJobDraftId;
                const firebaseUserId = paymentIntentSucceeded.metadata?.firebaseUserId;

                if (!tempJobDraftId || !firebaseUserId) {
                    console.error(`[WEBHOOK ERROR] WICHTIG: Fehlende Metadaten im PI ${paymentIntentSucceeded.id}.`);
                    return res.status(200).json({ received: true, message: 'Missing metadata, handled with error logging' });
                }

                console.log(`[WEBHOOK LOG] Verarbeite erfolgreichen PaymentIntent ${paymentIntentSucceeded.id} für Job ${tempJobDraftId}`);

                try {
                    const tempJobDraftRef = db.collection('temporaryJobDrafts').doc(tempJobDraftId);
                    const auftragCollectionRef = db.collection('auftraege');

                    await db.runTransaction(async (transaction) => {
                        const tempJobDraftSnapshot = await transaction.get(tempJobDraftRef);

                        if (tempJobDraftSnapshot.data()?.status === 'converted') {
                            console.log(`[WEBHOOK LOG] Job-Entwurf ${tempJobDraftId} wurde bereits konvertiert. Überspringe Verarbeitung.`);
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
                            // Hinzufügen der Gesamtsumme aus dem Payment Intent
                            totalPriceInCents: paymentIntentSucceeded.amount,
                            // Sicherstellen, dass createdAt ein gültiger Timestamp ist
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

                        console.log(`[WEBHOOK TRANSACTION] Auftrag ${newAuftragRef.id} erstellt und Entwurf ${tempJobDraftId} aktualisiert.`);
                    });
                } catch (dbError: any) {
                    console.error(`[WEBHOOK ERROR] Fehler bei der Job-Konvertierung (Draft ${tempJobDraftId} zu Auftrag):`, dbError);
                    return res.status(200).json({ received: true, message: `Job conversion failed: ${dbError.message}` });
                }
                break;
            }

            case 'payment_intent.payment_failed': {
                const paymentIntentFailed = event.data.object as Stripe.PaymentIntent;
                console.log(`[WEBHOOK LOG] PaymentIntent ${paymentIntentFailed.id} failed. Reason: ${paymentIntentFailed.last_payment_error?.message}`);
                break;
            }

            case 'payment_intent.created': {
                const paymentIntentCreated = event.data.object as Stripe.PaymentIntent;
                console.log(`[WEBHOOK LOG] PaymentIntent ${paymentIntentCreated.id} created.`);
                break;
            }

            case 'payment_intent.processing': {
                const paymentIntentProcessing = event.data.object as Stripe.PaymentIntent;
                console.log(`[WEBHOOK LOG] PaymentIntent ${paymentIntentProcessing.id} is processing.`);
                break;
            }

            case 'charge.succeeded': {
                const chargeSucceeded = event.data.object as Stripe.Charge;
                console.log(`[WEBHOOK LOG] Charge ${chargeSucceeded.id} for PaymentIntent ${chargeSucceeded.payment_intent} succeeded.`);
                break;
            }

            case 'charge.updated': {
                const chargeUpdated = event.data.object as Stripe.Charge;
                console.log(`[WEBHOOK LOG] Charge ${chargeUpdated.id} updated.`);
                break;
            }

            case 'account.updated': {
                const accountUpdated = event.data.object as Stripe.Account;
                console.log(`[WEBHOOK LOG] Connected account ${accountUpdated.id} updated. Charges: ${accountUpdated.charges_enabled}, Payouts: ${accountUpdated.payouts_enabled}`);
                break;
            }

            case 'transfer.created': {
                const transferCreated = event.data.object as Stripe.Transfer;
                console.log(`[WEBHOOK LOG] Transfer ${transferCreated.id} to ${transferCreated.destination} - Event: ${eventType}`);
                break;
            }

            case 'transfer.paid': {
                const transferPaid = event.data.object as Stripe.Transfer;
                console.log(`[WEBHOOK LOG] Transfer ${transferPaid.id} to ${transferPaid.destination} - Event: ${eventType}`);
                break;
            }

            case 'transfer.failed': {
                const transferFailed = event.data.object as Stripe.Transfer;
                console.log(`[WEBHOOK LOG] Transfer ${transferFailed.id} to ${transferFailed.destination} - Event: ${eventType}`);
                break;
            }

            case 'payout.paid': {
                const payoutPaid = event.data.object as Stripe.Payout;
                console.log(`[WEBHOOK LOG] Payout ${payoutPaid.id} to ${payoutPaid.destination} - Event: ${eventType}`);
                break;
            }

            case 'payout.failed': {
                const payoutFailed = event.data.object as Stripe.Payout;
                console.log(`[WEBHOOK LOG] Payout ${payoutFailed.id} to ${payoutFailed.destination} - Event: ${eventType}`);
                break;
            }

            default:
                console.log(`[WEBHOOK LOG] Unhandled event type ${eventType}. Data:`, JSON.stringify(event.data.object, null, 2));
        }

        console.log(`[WEBHOOK LOG] Sending 200 OK for event ${event.id}`);
        res.status(200).json({ received: true });
    } else {
        console.warn(`[WEBHOOK WARN] Methode ${req.method} nicht erlaubt für /api/stripe-webhooks.`);
        res.setHeader('Allow', 'POST');
        res.status(405).end('Method Not Allowed');
    }
}