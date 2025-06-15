"use strict";
// http_webhooks.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhookHandler = void 0;
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const stripe_1 = __importDefault(require("stripe"));
const helpers_1 = require("./helpers");
exports.stripeWebhookHandler = (0, https_1.onRequest)(async (request, response) => {
    v2_1.logger.info(`[stripeWebhookHandler] Webhook aufgerufen, Methode: ${request.method}, URL: ${request.url}`);
    const db = (0, helpers_1.getDb)();
    const localStripe = (0, helpers_1.getStripeInstance)();
    const webhookSecret = (0, helpers_1.getStripeWebhookSecret)();
    if (request.method === 'POST') {
        const buf = request.rawBody;
        const sig = request.headers['stripe-signature'];
        if (!sig) {
            v2_1.logger.error('[stripeWebhookHandler] Missing stripe-signature header');
            response.status(400).send('Webhook Error: Missing stripe-signature header');
            return;
        }
        let event;
        try {
            event = localStripe.webhooks.constructEvent(buf, sig, webhookSecret);
            v2_1.logger.info(`[stripeWebhookHandler] Event erfolgreich konstruiert: ${event.id}, Typ: ${event.type}`);
            // Logge nur einen kleinen Teil des Objekts, um sensible Daten zu vermeiden, falls das Objekt sehr groß ist
            if (event.data?.object && typeof event.data.object === 'object') {
                const partialObject = Object.keys(event.data.object).slice(0, 5).reduce((obj, key) => {
                    // @ts-ignore
                    obj[key] = event.data.object[key];
                    return obj;
                }, {});
                v2_1.logger.info(`[stripeWebhookHandler] Event Data Object (Anfang): ${JSON.stringify(partialObject)}...`);
            }
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
        switch (eventType) {
            case 'payment_intent.succeeded': {
                const paymentIntentSucceeded = event.data.object;
                v2_1.logger.info(`[stripeWebhookHandler] PaymentIntent ${paymentIntentSucceeded.id} was successful!`);
                const tempJobDraftId = paymentIntentSucceeded.metadata?.tempJobDraftId;
                const firebaseUserId = paymentIntentSucceeded.metadata?.firebaseUserId;
                v2_1.logger.info(`[stripeWebhookHandler] PI Metadata: tempJobDraftId=${tempJobDraftId}, firebaseUserId=${firebaseUserId}`);
                if (!tempJobDraftId || !firebaseUserId) {
                    v2_1.logger.error(`[stripeWebhookHandler] WICHTIG: Fehlende Metadaten im PI ${paymentIntentSucceeded.id}. tempJobDraftId oder firebaseUserId ist null/undefined.`);
                    response.status(200).json({ received: true, message: 'Missing metadata, handled with error logging' });
                    return;
                }
                v2_1.logger.info(`[stripeWebhookHandler] Verarbeite erfolgreichen PaymentIntent ${paymentIntentSucceeded.id} für Job-Entwurf ${tempJobDraftId} von Nutzer ${firebaseUserId}`);
                try {
                    const tempJobDraftRef = db.collection('temporaryJobDrafts').doc(tempJobDraftId);
                    const auftragCollectionRef = db.collection('auftraege');
                    const userDocRef = db.collection('users').doc(firebaseUserId);
                    v2_1.logger.info(`[stripeWebhookHandler] Starte Firestore-Transaktion für Job ${tempJobDraftId}...`);
                    await db.runTransaction(async (transaction) => {
                        v2_1.logger.info(`[stripeWebhookHandler] Transaktion: Lade temporären Job-Entwurf ${tempJobDraftId} und Nutzer ${firebaseUserId}...`);
                        const tempJobDraftSnapshot = await transaction.get(tempJobDraftRef);
                        const userDocSnapshot = await transaction.get(userDocRef);
                        if (tempJobDraftSnapshot.data()?.status === 'converted') {
                            v2_1.logger.info(`[stripeWebhookHandler] Transaktion: Job-Entwurf ${tempJobDraftId} wurde bereits konvertiert. Überspringe Verarbeitung.`);
                            return;
                        }
                        if (!tempJobDraftSnapshot.exists) {
                            throw new Error(`Transaktion: Temporärer Job-Entwurf ${tempJobDraftId} nicht gefunden.`);
                        }
                        v2_1.logger.info(`[stripeWebhookHandler] Transaktion: Job-Entwurf ${tempJobDraftId} gefunden.`);
                        const tempJobDraftData = tempJobDraftSnapshot.data();
                        const userData = userDocSnapshot.data();
                        const createdAtTimestamp = tempJobDraftData.createdAt instanceof helpers_1.Timestamp
                            ? tempJobDraftData.createdAt
                            : new helpers_1.Timestamp(Math.floor(Date.now() / 1000), 0);
                        // Berechnung für die Clearing-Periode (z.B. 14 Tage)
                        const clearingPeriodDays = 14;
                        const paidAtDate = new Date(); // Zeitpunkt der erfolgreichen Zahlung
                        const clearingEndsDate = new Date(paidAtDate.getTime() + clearingPeriodDays * 24 * 60 * 60 * 1000);
                        const clearingPeriodEndsAtTimestamp = helpers_1.Timestamp.fromDate(clearingEndsDate);
                        const auftragData = {
                            ...tempJobDraftData,
                            status: 'zahlung_erhalten_clearing', // Neuer Status für die Clearing-Periode
                            paidAt: helpers_1.FieldValue.serverTimestamp(),
                            customerFirebaseUid: firebaseUserId,
                            tempJobDraftRefId: tempJobDraftId,
                            // Detaillierte Preiskomponenten aus Metadaten
                            originalJobPriceInCents: paymentIntentSucceeded.metadata?.originalJobPriceInCents ? parseInt(paymentIntentSucceeded.metadata.originalJobPriceInCents) : 0,
                            buyerServiceFeeInCents: paymentIntentSucceeded.metadata?.buyerServiceFeeInCents ? parseInt(paymentIntentSucceeded.metadata.buyerServiceFeeInCents) : 0,
                            sellerCommissionInCents: paymentIntentSucceeded.metadata?.sellerCommissionInCents ? parseInt(paymentIntentSucceeded.metadata.sellerCommissionInCents) : 0,
                            totalPlatformFeeInCents: paymentIntentSucceeded.metadata?.totalPlatformFeeInCents ? parseInt(paymentIntentSucceeded.metadata.totalPlatformFeeInCents) : (paymentIntentSucceeded.application_fee_amount || 0),
                            totalAmountPaidByBuyer: paymentIntentSucceeded.amount, // Gesamtbetrag, den der Käufer gezahlt hat
                            applicationFeeAmountFromStripe: paymentIntentSucceeded.application_fee_amount || 0, // Direkter Wert von Stripe
                            createdAt: createdAtTimestamp,
                            paymentMethodId: typeof paymentIntentSucceeded.payment_method === 'string'
                                ? paymentIntentSucceeded.payment_method
                                : (paymentIntentSucceeded.payment_method && typeof paymentIntentSucceeded.payment_method === 'object' && 'id' in paymentIntentSucceeded.payment_method ? paymentIntentSucceeded.payment_method.id : null),
                            stripeCustomerId: typeof paymentIntentSucceeded.customer === 'string'
                                ? paymentIntentSucceeded.customer
                                : (paymentIntentSucceeded.customer && typeof paymentIntentSucceeded.customer === 'object' && 'id' in paymentIntentSucceeded.customer ? paymentIntentSucceeded.customer.id : null),
                            // Neue Felder für Clearing und Genehmigung
                            clearingPeriodEndsAt: clearingPeriodEndsAtTimestamp,
                            buyerApprovedAt: null, // Wird später gesetzt
                        };
                        v2_1.logger.info(`[stripeWebhookHandler] Transaktion: Daten für neuen Auftrag vorbereitet. Status: ${auftragData.status}`);
                        const newAuftragRef = auftragCollectionRef.doc();
                        transaction.set(newAuftragRef, auftragData);
                        v2_1.logger.info(`[stripeWebhookHandler] Transaktion: Neuer Auftrag ${newAuftragRef.id} wird gesetzt.`);
                        transaction.update(tempJobDraftRef, {
                            status: 'converted',
                            convertedToOrderId: newAuftragRef.id,
                        });
                        v2_1.logger.info(`[stripeWebhookHandler] Transaktion: Temporärer Entwurf ${tempJobDraftId} wird als 'converted' aktualisiert.`);
                        if (paymentIntentSucceeded.payment_method) {
                            try {
                                let paymentMethodIdToRetrieve = null;
                                if (typeof paymentIntentSucceeded.payment_method === 'string') {
                                    paymentMethodIdToRetrieve = paymentIntentSucceeded.payment_method;
                                }
                                else if (paymentIntentSucceeded.payment_method && typeof paymentIntentSucceeded.payment_method === 'object' && 'id' in paymentIntentSucceeded.payment_method) {
                                    // Es ist ein expandiertes PaymentMethod Objekt
                                    paymentMethodIdToRetrieve = paymentIntentSucceeded.payment_method.id;
                                }
                                if (!paymentMethodIdToRetrieve) {
                                    v2_1.logger.warn(`[stripeWebhookHandler] Transaktion: Konnte keine PaymentMethod ID aus PaymentIntent ${paymentIntentSucceeded.id} extrahieren.`);
                                    // Frühzeitiger Ausstieg aus diesem try-Block, da keine PM ID vorhanden ist
                                    throw new Error("Keine PaymentMethod ID zum Abrufen vorhanden."); // Wird im catch unten behandelt oder man loggt nur und fährt fort
                                }
                                v2_1.logger.info(`[stripeWebhookHandler] Transaktion: Versuche, PaymentMethod ${paymentMethodIdToRetrieve} abzurufen.`);
                                const paymentMethod = await localStripe.paymentMethods.retrieve(paymentMethodIdToRetrieve);
                                const billingDetails = paymentMethod.billing_details;
                                v2_1.logger.info(`[stripeWebhookHandler] Transaktion: PaymentMethod ${paymentMethod.id} abgerufen. Billing Details Name: ${billingDetails?.name || 'N/A'}`);
                                if (billingDetails && billingDetails.address && billingDetails.address.line1 && billingDetails.address.postal_code && billingDetails.address.city && billingDetails.address.country) {
                                    const newBillingAddress = {
                                        id: `addr_${paymentMethod.id}`,
                                        name: billingDetails.name || `Rechnungsadresse ${billingDetails.address.postal_code}`,
                                        line1: billingDetails.address.line1,
                                        line2: billingDetails.address.line2 || undefined,
                                        city: billingDetails.address.city,
                                        postal_code: billingDetails.address.postal_code,
                                        country: billingDetails.address.country,
                                        type: 'billing',
                                        isDefault: true,
                                        savedAt: helpers_1.FieldValue.serverTimestamp(),
                                    };
                                    let existingAddresses = userData?.savedAddresses || [];
                                    const isDuplicateAddress = existingAddresses.some(existingAddr => existingAddr.line1 === newBillingAddress.line1 &&
                                        existingAddr.postal_code === newBillingAddress.postal_code &&
                                        existingAddr.city === newBillingAddress.city &&
                                        existingAddr.country === newBillingAddress.country &&
                                        existingAddr.name === newBillingAddress.name);
                                    if (!isDuplicateAddress) {
                                        existingAddresses = existingAddresses.map(addr => ({ ...addr, isDefault: false }));
                                        const updatedAddresses = [...existingAddresses, newBillingAddress];
                                        transaction.update(userDocRef, { savedAddresses: updatedAddresses });
                                        v2_1.logger.info(`[stripeWebhookHandler] Transaktion: Rechnungsadresse ${newBillingAddress.id} für Nutzer ${firebaseUserId} wird zur Speicherung im Array markiert.`);
                                        if (newBillingAddress.isDefault) {
                                            const nameParts = newBillingAddress.name.split(' ');
                                            const firstName = nameParts.shift() || '';
                                            const lastName = nameParts.join(' ') || '';
                                            const userProfileUpdate = {
                                                firstName: firstName || userData?.firstName || '',
                                                lastName: lastName || userData?.lastName || '',
                                                personalStreet: newBillingAddress.line1,
                                                personalCity: newBillingAddress.city,
                                                personalPostalCode: newBillingAddress.postal_code,
                                                personalCountry: newBillingAddress.country,
                                            };
                                            if (!userProfileUpdate.firstName && !userData?.firstName)
                                                delete userProfileUpdate.firstName;
                                            if (!userProfileUpdate.lastName && !userData?.lastName)
                                                delete userProfileUpdate.lastName;
                                            transaction.update(userDocRef, userProfileUpdate);
                                            v2_1.logger.info(`[stripeWebhookHandler] Transaktion: Primäre Adressfelder für Nutzer ${firebaseUserId} mit Daten aus Rechnungsadresse ${newBillingAddress.id} aktualisiert.`);
                                        }
                                    }
                                    else {
                                        v2_1.logger.info(`[stripeWebhookHandler] Transaktion: Rechnungsadresse für Nutzer ${firebaseUserId} bereits vorhanden. Überspringe Speicherung.`);
                                    }
                                }
                                else {
                                    v2_1.logger.warn(`[stripeWebhookHandler] Transaktion: Unvollständige Rechnungsadresse in PaymentMethod ${paymentMethod.id} für Nutzer ${firebaseUserId}. Überspringe Speicherung.`);
                                }
                            }
                            catch (pmError) {
                                v2_1.logger.error(`[stripeWebhookHandler] Transaktion: Fehler beim Abrufen/Speichern der Rechnungsadresse für PaymentIntent ${paymentIntentSucceeded.id}:`, pmError);
                            }
                        }
                    });
                    v2_1.logger.info(`[stripeWebhookHandler] Transaktion für Job ${tempJobDraftId} erfolgreich abgeschlossen.`);
                }
                catch (dbError) {
                    v2_1.logger.error(`[stripeWebhookHandler] Schwerwiegender Fehler bei der Job-Konvertierung (Draft ${tempJobDraftId} zu Auftrag) oder Transaktion fehlgeschlagen:`, dbError);
                    response.status(500).json({ received: true, message: `Job conversion failed: ${dbError.message}` });
                    return;
                }
                break;
            }
            // ... (andere payment_intent cases) ...
            case 'setup_intent.succeeded': {
                const setupIntent = event.data.object;
                // SEHR WICHTIGES LOGGING HIER AM ANFANG DES BLOCKS:
                v2_1.logger.info(`[stripeWebhookHandler] VERARBEITE setup_intent.succeeded: ${setupIntent.id}. PaymentMethod ID: ${setupIntent.payment_method}, Customer ID: ${setupIntent.customer}`);
                if (!setupIntent.customer) {
                    v2_1.logger.error("[stripeWebhookHandler] setup_intent.succeeded ohne Customer ID. Überspringe.");
                    break;
                }
                if (!setupIntent.payment_method) {
                    v2_1.logger.error(`[stripeWebhookHandler] setup_intent.succeeded ${setupIntent.id} ohne payment_method ID. Überspringe.`);
                    break;
                }
                try {
                    const paymentMethodId = typeof setupIntent.payment_method === 'string' ? setupIntent.payment_method : setupIntent.payment_method?.id;
                    if (!paymentMethodId) {
                        v2_1.logger.error(`[stripeWebhookHandler] Konnte keine gültige PaymentMethod ID aus SetupIntent ${setupIntent.id} extrahieren.`);
                        break;
                    }
                    const paymentMethod = await localStripe.paymentMethods.retrieve(paymentMethodId);
                    v2_1.logger.info(`[stripeWebhookHandler] PaymentMethod Details für ${paymentMethodId} abgerufen: Typ ${paymentMethod.type}`);
                    const customerObject = await localStripe.customers.retrieve(setupIntent.customer);
                    if (customerObject.deleted) {
                        v2_1.logger.error(`[stripeWebhookHandler] Stripe Customer ${setupIntent.customer} ist gelöscht. Kann PaymentMethod nicht zuordnen.`);
                        break;
                    }
                    // An dieser Stelle ist sicher, dass customerObject ein Stripe.Customer ist
                    const customer = customerObject;
                    v2_1.logger.info(`[stripeWebhookHandler] Stripe Customer Objekt für ${setupIntent.customer} abgerufen. Metadata:`, customer.metadata);
                    const firebaseUid = customer.metadata?.firebaseUID;
                    v2_1.logger.info(`[stripeWebhookHandler] Extrahierte firebaseUID aus Customer Metadata: ${firebaseUid}`);
                    if (!firebaseUid) {
                        v2_1.logger.error(`[stripeWebhookHandler] Firebase UID nicht in Stripe Customer Metadata für ${setupIntent.customer} gefunden. Kann PaymentMethod nicht zuordnen.`);
                        break;
                    }
                    const userDocRef = db.collection('users').doc(firebaseUid);
                    const userDoc = await userDocRef.get();
                    const existingData = userDoc.data();
                    let existingSavedPaymentMethods = existingData?.savedPaymentMethods || [];
                    const isDuplicate = existingSavedPaymentMethods.some((pm) => pm.id === paymentMethod.id);
                    if (isDuplicate) {
                        v2_1.logger.info(`[stripeWebhookHandler] PaymentMethod ${paymentMethod.id} ist bereits für Nutzer ${firebaseUid} gespeichert. Überspringe Hinzufügen.`);
                        break;
                    }
                    // Alle existierenden Methoden auf isDefault: false setzen, da die neue Standard wird
                    if (existingSavedPaymentMethods.length > 0) {
                        existingSavedPaymentMethods = existingSavedPaymentMethods.map(pm => ({ ...pm, isDefault: false }));
                    }
                    const newSavedPaymentMethodData = {
                        id: paymentMethod.id,
                        type: paymentMethod.type,
                        created: paymentMethod.created,
                        customer: paymentMethod.customer, // Kann Stripe Customer ID oder erweitertes Objekt sein
                        billing_details: paymentMethod.billing_details,
                        isDefault: true, // Die neu hinzugefügte Methode wird Standard
                    };
                    if (paymentMethod.card) {
                        newSavedPaymentMethodData.card = {
                            brand: paymentMethod.card.brand,
                            last4: paymentMethod.card.last4,
                            exp_month: paymentMethod.card.exp_month,
                            exp_year: paymentMethod.card.exp_year,
                            funding: paymentMethod.card.funding,
                        };
                    }
                    // Wenn es keine SEPA-Details gibt, füge das Feld 'sepa_debit' gar nicht erst hinzu
                    // oder setze es explizit auf null, wenn dein Interface es als optional mit null erlaubt.
                    // Für die aktuelle Fehlermeldung ist es am sichersten, es wegzulassen, wenn es undefined ist.
                    if (paymentMethod.sepa_debit) {
                        newSavedPaymentMethodData.sepa_debit = {
                            bank_code: paymentMethod.sepa_debit.bank_code,
                            country: paymentMethod.sepa_debit.country,
                            last4: paymentMethod.sepa_debit.last4,
                        };
                    }
                    // Das Objekt newSavedPaymentMethodData enthält jetzt nur die Felder, die tatsächlich Werte haben.
                    // 'undefined' Felder wurden nicht hinzugefügt.
                    const newSavedPaymentMethodForDb = newSavedPaymentMethodData; // Typ-Assertion
                    const updatedPaymentMethods = [...existingSavedPaymentMethods, newSavedPaymentMethodForDb];
                    await userDocRef.update({
                        savedPaymentMethods: updatedPaymentMethods
                    });
                    v2_1.logger.info(`[stripeWebhookHandler] ERFOLG: PaymentMethod ${paymentMethod.id} für Nutzer ${firebaseUid} in Firestore gespeichert und als Standard gesetzt.`);
                }
                catch (error) {
                    v2_1.logger.error(`[stripeWebhookHandler] FEHLER beim Verarbeiten von setup_intent.succeeded für ${setupIntent.id}:`, error);
                    // Sende trotzdem 200 OK an Stripe, um Wiederholungsversuche zu vermeiden, aber logge den Fehler.
                    // response.status(500).send(`Webhook Error: Failed to process setup_intent.succeeded - ${error instanceof Error ? error.message : 'Unknown error'}`);
                    // return; // Für Debugging kann ein 500er hilfreich sein, für Produktion eher 200 + Logging
                }
                break;
            }
            case 'account.updated': {
                const account = event.data.object;
                v2_1.logger.info(`[stripeWebhookHandler] Account ${account.id} wurde aktualisiert.`);
                v2_1.logger.info(`  Charges enabled: ${account.charges_enabled}, Payouts enabled: ${account.payouts_enabled}, Details submitted: ${account.details_submitted}`);
                // Finde den Benutzer in Firestore anhand der Stripe Account ID und aktualisiere seinen Status
                if (account.id) {
                    try {
                        const usersRef = db.collection('users');
                        const querySnapshot = await usersRef.where('stripeAccountId', '==', account.id).limit(1).get();
                        if (!querySnapshot.empty) {
                            const userDoc = querySnapshot.docs[0];
                            await userDoc.ref.update({
                                stripeChargesEnabled: account.charges_enabled,
                                stripePayoutsEnabled: account.payouts_enabled,
                                stripeDetailsSubmitted: account.details_submitted,
                                stripeAccountStatusUpdatedAt: helpers_1.FieldValue.serverTimestamp(),
                            });
                            v2_1.logger.info(`[stripeWebhookHandler] Firestore-Benutzer ${userDoc.id} (Stripe Acc: ${account.id}) aktualisiert mit neuem Account-Status.`);
                        }
                        else {
                            v2_1.logger.warn(`[stripeWebhookHandler] Kein Benutzer in Firestore gefunden für Stripe Account ID: ${account.id}`);
                        }
                    }
                    catch (dbError) {
                        v2_1.logger.error(`[stripeWebhookHandler] Fehler beim Aktualisieren des Benutzerstatus in Firestore für Account ${account.id}:`, dbError);
                        // Sende trotzdem 200 OK, um Wiederholungen zu vermeiden, aber logge den Fehler.
                    }
                }
                break;
            }
            case 'capability.updated':
            case 'account.external_account.created':
            case 'person.created':
            case 'account.application.authorized': {
                v2_1.logger.info(`[stripeWebhookHandler] Event ${eventType} empfangen und zur Kenntnis genommen. Aktuell keine spezifische Aktion implementiert.`);
                // Hier könnten Sie spezifische Logik für diese Events hinzufügen, falls erforderlich.
                // Zum Beispiel: Loggen der Capability-Änderungen, oder Notiz über neue Bankkonten.
                // logger.debug(`[stripeWebhookHandler] Event Data für ${eventType}:`, event.data.object);
                break;
            }
            default:
                v2_1.logger.info(`[stripeWebhookHandler] Unbehandelter Event-Typ ${eventType}.`);
            // logger.debug(`[stripeWebhookHandler] Daten für unbehandelten Event-Typ ${eventType}:`, event.data.object);
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