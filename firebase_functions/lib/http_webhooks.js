"use strict";
// Dies ist der korrekte Code für die Datei: firebase_functions/src/http_webhooks.ts
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
exports.stripeWebhookHandler = void 0;
// Angepasste Imports für eine Firebase Cloud Function (v2)
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const stripe_1 = __importDefault(require("stripe"));
// Wir nutzen konsequent die zentralen Helfer aus helpers.ts
const helpers_1 = require("./helpers");
const admin = __importStar(require("firebase-admin")); // Behalten für admin.firestore.Timestamp
// KEINE globalen Initialisierungen mehr hier. Das behebt den Deployment-Fehler.
// Die Funktion wird als Firebase onRequest-Handler exportiert
exports.stripeWebhookHandler = (0, https_1.onRequest)(async (request, response) => {
    v2_1.logger.info(`[stripeWebhookHandler] Webhook aufgerufen, Methode: ${request.method}`);
    // Die Stripe-Instanz und das Secret werden hier sicher innerhalb der Funktion geladen
    const localStripe = (0, helpers_1.getStripeInstance)();
    const webhookSecret = (0, helpers_1.getStripeWebhookSecret)();
    if (request.method === 'POST') {
        // Der Request-Body wird bei Firebase Functions direkt über request.rawBody gelesen
        const buf = request.rawBody;
        const sig = request.headers['stripe-signature'];
        if (!sig) {
            v2_1.logger.error('[stripeWebhookHandler] Missing stripe-signature header');
            response.status(400).send('Webhook Error: Missing stripe-signature header');
            return;
        }
        let event;
        try {
            // Die verifizierte Stripe-Instanz und das Secret werden hier verwendet
            event = localStripe.webhooks.constructEvent(buf, sig, webhookSecret);
            v2_1.logger.info(`[stripeWebhookHandler] Event erfolgreich konstruiert: ${event.id}, Typ: ${event.type}`);
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
            v2_1.logger.error(`[stripeWebhookHandler] ${message}`, err);
            response.status(400).send(message);
            return;
        }
        const eventType = event.type;
        // Ihre vollständige switch-Logik, 1-zu-1 übernommen und an die Firebase-Umgebung angepasst
        switch (eventType) {
            case 'payment_intent.succeeded': {
                const paymentIntentSucceeded = event.data.object;
                v2_1.logger.info(`[stripeWebhookHandler] PaymentIntent ${paymentIntentSucceeded.id} was successful!`);
                const tempJobDraftId = paymentIntentSucceeded.metadata?.tempJobDraftId;
                const firebaseUserId = paymentIntentSucceeded.metadata?.firebaseUserId;
                if (!tempJobDraftId || !firebaseUserId) {
                    v2_1.logger.error(`[stripeWebhookHandler] WICHTIG: Fehlende Metadaten im PI ${paymentIntentSucceeded.id}.`);
                    response.status(200).json({ received: true, message: 'Missing metadata, handled with error logging' });
                    return;
                }
                v2_1.logger.info(`[stripeWebhookHandler] Verarbeite erfolgreichen PaymentIntent ${paymentIntentSucceeded.id} für Job ${tempJobDraftId}`);
                try {
                    const tempJobDraftRef = helpers_1.db.collection('temporaryJobDrafts').doc(tempJobDraftId);
                    const auftragCollectionRef = helpers_1.db.collection('auftraege');
                    await helpers_1.db.runTransaction(async (transaction) => {
                        const tempJobDraftSnapshot = await transaction.get(tempJobDraftRef);
                        if (tempJobDraftSnapshot.data()?.status === 'converted') {
                            v2_1.logger.info(`[stripeWebhookHandler] Job-Entwurf ${tempJobDraftId} wurde bereits konvertiert. Überspringe Verarbeitung.`);
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
                            totalPriceInCents: paymentIntentSucceeded.amount,
                            createdAt: new admin.firestore.Timestamp(tempJobDraftData.createdAt?._seconds || Math.floor(Date.now() / 1000), tempJobDraftData.createdAt?._nanoseconds || 0),
                        };
                        const newAuftragRef = auftragCollectionRef.doc();
                        transaction.set(newAuftragRef, auftragData);
                        transaction.update(tempJobDraftRef, {
                            status: 'converted',
                            convertedToOrderId: newAuftragRef.id,
                        });
                        v2_1.logger.info(`[stripeWebhookHandler] Auftrag ${newAuftragRef.id} erstellt und Entwurf ${tempJobDraftId} aktualisiert.`);
                    });
                }
                catch (dbError) {
                    v2_1.logger.error(`[stripeWebhookHandler] Fehler bei der Job-Konvertierung (Draft ${tempJobDraftId} zu Auftrag):`, dbError);
                    response.status(200).json({ received: true, message: `Job conversion failed: ${dbError.message}` });
                    return;
                }
                break;
            }
            case 'payment_intent.payment_failed': {
                const paymentIntentFailed = event.data.object;
                v2_1.logger.info(`[stripeWebhookHandler] PaymentIntent ${paymentIntentFailed.id} failed. Reason: ${paymentIntentFailed.last_payment_error?.message}`);
                break;
            }
            case 'payment_intent.created': {
                const paymentIntentCreated = event.data.object;
                v2_1.logger.info(`[stripeWebhookHandler] PaymentIntent ${paymentIntentCreated.id} created.`);
                break;
            }
            case 'payment_intent.processing': {
                const paymentIntentProcessing = event.data.object;
                v2_1.logger.info(`[stripeWebhookHandler] PaymentIntent ${paymentIntentProcessing.id} is processing.`);
                break;
            }
            case 'charge.succeeded': {
                const chargeSucceeded = event.data.object;
                v2_1.logger.info(`[stripeWebhookHandler] Charge ${chargeSucceeded.id} for PaymentIntent ${chargeSucceeded.payment_intent} succeeded.`);
                break;
            }
            case 'charge.updated': {
                const chargeUpdated = event.data.object;
                v2_1.logger.info(`[stripeWebhookHandler] Charge ${chargeUpdated.id} updated.`);
                break;
            }
            case 'account.updated': {
                const accountUpdated = event.data.object;
                v2_1.logger.info(`[stripeWebhookHandler] Connected account ${accountUpdated.id} updated. Charges: ${accountUpdated.charges_enabled}, Payouts: ${accountUpdated.payouts_enabled}`);
                break;
            }
            case 'transfer.created': {
                const transferCreated = event.data.object;
                v2_1.logger.info(`[stripeWebhookHandler] Transfer ${transferCreated.id} to ${transferCreated.destination} - Event: ${eventType}`);
                break;
            }
            case 'transfer.paid': {
                const transferPaid = event.data.object;
                v2_1.logger.info(`[stripeWebhookHandler] Transfer ${transferPaid.id} to ${transferPaid.destination} - Event: ${eventType}`);
                break;
            }
            case 'transfer.failed': {
                const transferFailed = event.data.object;
                v2_1.logger.info(`[stripeWebhookHandler] Transfer ${transferFailed.id} to ${transferFailed.destination} - Event: ${eventType}`);
                break;
            }
            case 'payout.paid': {
                const payoutPaid = event.data.object;
                v2_1.logger.info(`[stripeWebhookHandler] Payout ${payoutPaid.id} to ${payoutPaid.destination} - Event: ${eventType}`);
                break;
            }
            case 'payout.failed': {
                const payoutFailed = event.data.object;
                v2_1.logger.info(`[stripeWebhookHandler] Payout ${payoutFailed.id} to ${payoutFailed.destination} - Event: ${eventType}`);
                break;
            }
            default:
                v2_1.logger.info(`[stripeWebhookHandler] Unhandled event type ${eventType}. Data:`, JSON.stringify(event.data.object, null, 2));
        }
        v2_1.logger.info(`[stripeWebhookHandler] Sending 200 OK for event ${event.id}`);
        response.status(200).json({ received: true });
    }
    else {
        v2_1.logger.warn(`[stripeWebhookHandler] Methode ${request.method} nicht erlaubt.`);
        response.setHeader('Allow', 'POST');
        response.status(405).end('Method Not Allowed');
    }
});
//# sourceMappingURL=http_webhooks.js.map