"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = handler;
const stripe_1 = __importDefault(require("stripe"));
const micro_1 = require("micro");
// --- NEUE IMPORTE FÜR FIREBASE ADMIN SDK ---
const admin = __importStar(require("firebase-admin"));
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
// --- ENDE NEUE IMPORTE ---
// Initialisiere Firebase Admin nur einmal
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)(); // Firestore-Instanz
exports.config = {
    api: {
        bodyParser: false,
    },
};
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = stripeSecretKey ? new stripe_1.default(stripeSecretKey, {
    // ANGEPASST: Eine gültige, datumsbasierte API-Version verwenden
    apiVersion: '2025-05-28.basil',
    typescript: true,
}) : null;
async function handler(req, res) {
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
        const buf = await (0, micro_1.buffer)(req);
        const sig = req.headers['stripe-signature'];
        if (!sig) {
            console.error('[WEBHOOK ERROR] Missing stripe-signature header');
            return res.status(400).send('Webhook Error: Missing stripe-signature header');
        }
        let event;
        try {
            event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
            console.log(`[WEBHOOK LOG] Event erfolgreich konstruiert: ${event.id}, Typ: ${event.type}`);
        }
        catch (err) {
            let message = 'Fehler bei der Webhook-Signaturverifizierung.';
            if (err instanceof stripe_1.default.errors.StripeSignatureVerificationError) {
                message = `⚠️  Webhook signature verification failed: ${err.message}`;
            }
            else if (err instanceof Error) {
                message = `⚠️  Webhook error: ${err.message}`;
            }
            else {
                message = '⚠️  Unknown error during webhook signature verification.';
            }
            console.error(`[WEBHOOK ERROR] ${message}`, err);
            return res.status(400).send(message);
        }
        const eventType = event.type;
        switch (eventType) {
            case 'payment_intent.succeeded': {
                const paymentIntentSucceeded = event.data.object;
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
                        const tempJobDraftData = tempJobDraftSnapshot.data();
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
                            createdAt: new admin.firestore.Timestamp(tempJobDraftData.createdAt?._seconds || Math.floor(Date.now() / 1000), tempJobDraftData.createdAt?._nanoseconds || 0),
                        };
                        const newAuftragRef = auftragCollectionRef.doc();
                        transaction.set(newAuftragRef, auftragData);
                        transaction.update(tempJobDraftRef, {
                            status: 'converted',
                            convertedToOrderId: newAuftragRef.id,
                        });
                        console.log(`[WEBHOOK TRANSACTION] Auftrag ${newAuftragRef.id} erstellt und Entwurf ${tempJobDraftId} aktualisiert.`);
                    });
                }
                catch (dbError) {
                    console.error(`[WEBHOOK ERROR] Fehler bei der Job-Konvertierung (Draft ${tempJobDraftId} zu Auftrag):`, dbError);
                    return res.status(200).json({ received: true, message: `Job conversion failed: ${dbError.message}` });
                }
                break;
            }
            case 'payment_intent.payment_failed': {
                const paymentIntentFailed = event.data.object;
                console.log(`[WEBHOOK LOG] PaymentIntent ${paymentIntentFailed.id} failed. Reason: ${paymentIntentFailed.last_payment_error?.message}`);
                break;
            }
            case 'payment_intent.created': {
                const paymentIntentCreated = event.data.object;
                console.log(`[WEBHOOK LOG] PaymentIntent ${paymentIntentCreated.id} created.`);
                break;
            }
            case 'payment_intent.processing': {
                const paymentIntentProcessing = event.data.object;
                console.log(`[WEBHOOK LOG] PaymentIntent ${paymentIntentProcessing.id} is processing.`);
                break;
            }
            case 'charge.succeeded': {
                const chargeSucceeded = event.data.object;
                console.log(`[WEBHOOK LOG] Charge ${chargeSucceeded.id} for PaymentIntent ${chargeSucceeded.payment_intent} succeeded.`);
                break;
            }
            case 'charge.updated': {
                const chargeUpdated = event.data.object;
                console.log(`[WEBHOOK LOG] Charge ${chargeUpdated.id} updated.`);
                break;
            }
            case 'account.updated': {
                const accountUpdated = event.data.object;
                console.log(`[WEBHOOK LOG] Connected account ${accountUpdated.id} updated. Charges: ${accountUpdated.charges_enabled}, Payouts: ${accountUpdated.payouts_enabled}`);
                break;
            }
            case 'transfer.created': {
                const transferCreated = event.data.object;
                console.log(`[WEBHOOK LOG] Transfer ${transferCreated.id} to ${transferCreated.destination} - Event: ${eventType}`);
                break;
            }
            case 'transfer.paid': {
                const transferPaid = event.data.object;
                console.log(`[WEBHOOK LOG] Transfer ${transferPaid.id} to ${transferPaid.destination} - Event: ${eventType}`);
                break;
            }
            case 'transfer.failed': {
                const transferFailed = event.data.object;
                console.log(`[WEBHOOK LOG] Transfer ${transferFailed.id} to ${transferFailed.destination} - Event: ${eventType}`);
                break;
            }
            case 'payout.paid': {
                const payoutPaid = event.data.object;
                console.log(`[WEBHOOK LOG] Payout ${payoutPaid.id} to ${payoutPaid.destination} - Event: ${eventType}`);
                break;
            }
            case 'payout.failed': {
                const payoutFailed = event.data.object;
                console.log(`[WEBHOOK LOG] Payout ${payoutFailed.id} to ${payoutFailed.destination} - Event: ${eventType}`);
                break;
            }
            default:
                console.log(`[WEBHOOK LOG] Unhandled event type ${eventType}. Data:`, JSON.stringify(event.data.object, null, 2));
        }
        console.log(`[WEBHOOK LOG] Sending 200 OK for event ${event.id}`);
        res.status(200).json({ received: true });
    }
    else {
        console.warn(`[WEBHOOK WARN] Methode ${req.method} nicht erlaubt für /api/stripe-webhooks.`);
        res.setHeader('Allow', 'POST');
        res.status(405).end('Method Not Allowed');
    }
}
