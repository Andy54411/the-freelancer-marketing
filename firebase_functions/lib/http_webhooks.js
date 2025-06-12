"use strict";
// Dies ist der korrekte Code für die Datei: firebase_functions/src/http_webhooks.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhookHandler = void 0;
// Angepasste Imports für eine Firebase Cloud Function (v2)
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const stripe_1 = __importDefault(require("stripe"));
// WICHTIG: FieldValue und Timestamp jetzt direkt aus helpers.ts importieren!
// Der 'admin'-Import ist hier NICHT MEHR NÖTIG, da FieldValue und Timestamp von helpers kommen.
const helpers_1 = require("./helpers");
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
                            paidAt: helpers_1.FieldValue.serverTimestamp(), // <-- KORREKT: FieldValue direkt nutzen
                            customerFirebaseUid: firebaseUserId,
                            tempJobDraftRefId: tempJobDraftId,
                            totalPriceInCents: paymentIntentSucceeded.amount,
                            createdAt: new helpers_1.Timestamp(// <-- KORREKT: Timestamp direkt nutzen
                            tempJobDraftData.createdAt?._seconds || Math.floor(Date.now() / 1000), tempJobDraftData.createdAt?._nanoseconds || 0),
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
            // NEUER CASE FÜR setup_intent.succeeded
            case 'setup_intent.succeeded': {
                const setupIntent = event.data.object;
                v2_1.logger.info(`[stripeWebhookHandler] SetupIntent ${setupIntent.id} succeeded. PaymentMethod: ${setupIntent.payment_method}`);
                if (!setupIntent.customer) {
                    v2_1.logger.error("[stripeWebhookHandler] setup_intent.succeeded ohne Customer ID. Überspringe.");
                    break; // Wichtig: Nicht mit Fehler antworten, aber Verarbeitung abbrechen.
                }
                try {
                    // Holen Sie die PaymentMethod Details von Stripe
                    const paymentMethod = await localStripe.paymentMethods.retrieve(setupIntent.payment_method);
                    v2_1.logger.info(`[stripeWebhookHandler] PaymentMethod Details abgerufen: ${paymentMethod.id}, Typ: ${paymentMethod.type}`);
                    // Finden Sie den Firebase User basierend auf der Stripe Customer ID
                    // (Annahme: Sie haben metadata.firebaseUID im Stripe Customer gesetzt, wie in getOrCreateStripeCustomer)
                    const customer = await localStripe.customers.retrieve(setupIntent.customer);
                    const firebaseUid = customer.metadata?.firebaseUID;
                    if (!firebaseUid) {
                        v2_1.logger.error(`[stripeWebhookHandler] Firebase UID nicht in Stripe Customer Metadata für ${setupIntent.customer} gefunden. Kann PaymentMethod nicht zuordnen.`);
                        break;
                    }
                    const userDocRef = helpers_1.db.collection('users').doc(firebaseUid);
                    // Optional: Prüfen Sie, ob die PaymentMethod bereits existiert, um Duplikate zu vermeiden
                    const userDoc = await userDocRef.get();
                    const existingSavedPaymentMethods = userDoc.data()?.savedPaymentMethods || [];
                    const isDuplicate = existingSavedPaymentMethods.some((pm) => pm.id === paymentMethod.id);
                    if (isDuplicate) {
                        v2_1.logger.info(`[stripeWebhookHandler] PaymentMethod ${paymentMethod.id} ist bereits für Nutzer ${firebaseUid} gespeichert. Überspringe Hinzufügen.`);
                        break;
                    }
                    // Erstellen Sie ein Objekt mit den relevanten PaymentMethod Details für Firestore
                    const newSavedPaymentMethod = {
                        id: paymentMethod.id,
                        type: paymentMethod.type,
                        created: paymentMethod.created,
                        // Kunden-ID von Stripe, nicht Firebase UID
                        customer: paymentMethod.customer,
                        // Rechnungsdetails (können optional gespeichert werden)
                        billing_details: {
                            address: paymentMethod.billing_details.address,
                            email: paymentMethod.billing_details.email,
                            name: paymentMethod.billing_details.name,
                            phone: paymentMethod.billing_details.phone,
                        },
                        // Spezifische Details für Kreditkarten
                        card: paymentMethod.card ? {
                            brand: paymentMethod.card.brand,
                            last4: paymentMethod.card.last4,
                            exp_month: paymentMethod.card.exp_month,
                            exp_year: paymentMethod.card.exp_year,
                            funding: paymentMethod.card.funding,
                        } : undefined,
                        // Spezifische Details für SEPA-Lastschrift
                        sepa_debit: paymentMethod.sepa_debit ? {
                            bank_code: paymentMethod.sepa_debit.bank_code,
                            country: paymentMethod.sepa_debit.country,
                            last4: paymentMethod.sepa_debit.last4,
                        } : undefined,
                        // Könnte auch ein Feld für isDefault hinzufügen, wenn gewünscht
                        // isDefault: true, // Logik hierfür hinzufügen, wenn nur eine Standard-Methode erlaubt ist
                    };
                    // Fügen Sie die neue Zahlungsmethode zum 'savedPaymentMethods'-Array des Benutzers hinzu
                    await userDocRef.update({
                        savedPaymentMethods: helpers_1.FieldValue.arrayUnion(newSavedPaymentMethod)
                    });
                    v2_1.logger.info(`[stripeWebhookHandler] PaymentMethod ${paymentMethod.id} für Nutzer ${firebaseUid} in Firestore gespeichert.`);
                }
                catch (error) {
                    v2_1.logger.error(`[stripeWebhookHandler] Fehler beim Verarbeiten von setup_intent.succeeded für ${setupIntent.id}:`, error);
                    // Im Falle eines Fehlers hier nicht den 200 OK Status senden, damit Stripe den Webhook wiederholt.
                    // Oder senden Sie 200, aber loggen den Fehler detailliert.
                    response.status(500).send(`Webhook Error: Failed to process setup_intent.succeeded - ${error instanceof Error ? error.message : 'Unknown error'}`);
                    return;
                }
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
            // Fallback für unhandled events
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