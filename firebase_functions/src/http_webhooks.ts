// /Users/andystaudinger/Tilvo/functions/src/http_webhooks.ts

import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import Stripe from 'stripe';
import { getDb, getStripeInstance, getStripeWebhookSecret, FieldValue, Timestamp } from './helpers';

interface SavedAddress {
    id: string;
    name: string;
    line1: string;
    line2?: string;
    city: string;
    postal_code: string;
    country: string;
    isDefault: boolean;
    type?: 'billing' | 'shipping' | 'other';
    savedAt?: FieldValue | Timestamp;
}

export const stripeWebhookHandler = onRequest(async (request, response) => {
    logger.info(`[stripeWebhookHandler] Webhook aufgerufen, Methode: ${request.method}, URL: ${request.url}`);
    const db = getDb();
    const localStripe = getStripeInstance();
    const webhookSecret = getStripeWebhookSecret();

    if (request.method === 'POST') {
        const buf = request.rawBody;
        const sig = request.headers['stripe-signature'];

        if (!sig) {
            logger.error('[stripeWebhookHandler] Missing stripe-signature header');
            response.status(400).send('Webhook Error: Missing stripe-signature header');
            return;
        }

        let event: Stripe.Event;

        try {
            event = localStripe.webhooks.constructEvent(buf, sig, webhookSecret);
            logger.info(`[stripeWebhookHandler] Event erfolgreich konstruiert: ${event.id}, Typ: ${event.type}`);
            logger.info(`[stripeWebhookHandler] Event Data Object (partial): ${JSON.stringify(event.data.object).substring(0, 200)}...`); // Loggt die ersten 200 Zeichen des Event-Objekts
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

        switch (eventType) {
            case 'payment_intent.succeeded': {
                const paymentIntentSucceeded = event.data.object as Stripe.PaymentIntent;
                logger.info(`[stripeWebhookHandler] PaymentIntent ${paymentIntentSucceeded.id} was successful!`);

                const tempJobDraftId = paymentIntentSucceeded.metadata?.tempJobDraftId;
                const firebaseUserId = paymentIntentSucceeded.metadata?.firebaseUserId;

                logger.info(`[stripeWebhookHandler] PI Metadata: tempJobDraftId=${tempJobDraftId}, firebaseUserId=${firebaseUserId}`);

                if (!tempJobDraftId || !firebaseUserId) {
                    logger.error(`[stripeWebhookHandler] WICHTIG: Fehlende Metadaten im PI ${paymentIntentSucceeded.id}. tempJobDraftId oder firebaseUserId ist null/undefined.`);
                    response.status(200).json({ received: true, message: 'Missing metadata, handled with error logging' });
                    return;
                }

                logger.info(`[stripeWebhookHandler] Verarbeite erfolgreichen PaymentIntent ${paymentIntentSucceeded.id} für Job-Entwurf ${tempJobDraftId} von Nutzer ${firebaseUserId}`);

                try {
                    const tempJobDraftRef = db.collection('temporaryJobDrafts').doc(tempJobDraftId);
                    const auftragCollectionRef = db.collection('auftraege');
                    const userDocRef = db.collection('users').doc(firebaseUserId);

                    logger.info(`[stripeWebhookHandler] Starte Firestore-Transaktion für Job ${tempJobDraftId}...`);
                    await db.runTransaction(async (transaction) => {
                        logger.info(`[stripeWebhookHandler] Transaktion: Lade temporären Job-Entwurf ${tempJobDraftId} und Nutzer ${firebaseUserId}...`);
                        const tempJobDraftSnapshot = await transaction.get(tempJobDraftRef);
                        const userDocSnapshot = await transaction.get(userDocRef);

                        if (tempJobDraftSnapshot.data()?.status === 'converted') {
                            logger.info(`[stripeWebhookHandler] Transaktion: Job-Entwurf ${tempJobDraftId} wurde bereits konvertiert. Überspringe Verarbeitung.`);
                            return; // Transaktion beenden
                        }

                        if (!tempJobDraftSnapshot.exists) {
                            throw new Error(`Transaktion: Temporärer Job-Entwurf ${tempJobDraftId} nicht gefunden.`);
                        }
                        logger.info(`[stripeWebhookHandler] Transaktion: Job-Entwurf ${tempJobDraftId} gefunden.`);


                        const tempJobDraftData = tempJobDraftSnapshot.data()!;
                        const userData = userDocSnapshot.data() as {
                            savedAddresses?: SavedAddress[];
                            firstName?: string; // Hinzugefügt für den Fallback
                            lastName?: string;  // Hinzugefügt für den Fallback
                        } | undefined;

                        // Sicherstellen, dass createdAt ein gültiger Timestamp ist, da es aus Firestore kommt
                        const createdAtTimestamp = tempJobDraftData.createdAt instanceof Timestamp
                            ? tempJobDraftData.createdAt
                            : new Timestamp(
                                Math.floor(Date.now() / 1000), // Fallback zu aktueller Zeit, falls ungültig
                                0
                            );

                        const auftragData = {
                            ...tempJobDraftData, // Übernahme aller Daten aus dem Entwurf
                            status: 'bezahlt', // Status auf bezahlt setzen
                            paidAt: FieldValue.serverTimestamp(), // Zeitpunkt der Zahlung
                            customerFirebaseUid: firebaseUserId, // Sicherstellen, dass die UID konsistent ist
                            tempJobDraftRefId: tempJobDraftId, // Referenz zum ursprünglichen Entwurf
                            totalPriceInCents: paymentIntentSucceeded.amount, // Exakter Betrag von Stripe
                            createdAt: createdAtTimestamp, // Behalte den ursprünglichen Erstellungszeitstempel
                            paymentMethodId: paymentIntentSucceeded.payment_method || null, // Zahlungsmethode ID von Stripe
                            stripeCustomerId: paymentIntentSucceeded.customer || null, // Stripe Customer ID
                        };

                        logger.info(`[stripeWebhookHandler] Transaktion: Daten für neuen Auftrag vorbereitet. Status: ${auftragData.status}`);
                        // Logge auftragData nur teilweise oder als JSON.stringify, um sensitive Daten zu vermeiden
                        logger.info(`[stripeWebhookHandler] Transaktion: Auftragsdaten (teilweise): tempJobDraftRefId=${auftragData.tempJobDraftRefId}, customerFirebaseUid=${auftragData.customerFirebaseUid}`);


                        const newAuftragRef = auftragCollectionRef.doc(); // Neue leere Doc-Referenz
                        transaction.set(newAuftragRef, auftragData); // Neuen Auftrag erstellen
                        logger.info(`[stripeWebhookHandler] Transaktion: Neuer Auftrag ${newAuftragRef.id} wird gesetzt.`);

                        transaction.update(tempJobDraftRef, {
                            status: 'converted', // Status des Entwurfs auf konvertiert setzen
                            convertedToOrderId: newAuftragRef.id, // Referenz zum neuen Auftrag
                        });
                        logger.info(`[stripeWebhookHandler] Transaktion: Temporärer Entwurf ${tempJobDraftId} wird als 'converted' aktualisiert.`);

                        // Speicherung der Rechnungsadresse (falls vorhanden und nicht dupliziert)
                        if (paymentIntentSucceeded.payment_method) {
                            try {
                                logger.info(`[stripeWebhookHandler] Transaktion: Versuche, PaymentMethod ${paymentIntentSucceeded.payment_method} abzurufen.`);
                                const paymentMethod = await localStripe.paymentMethods.retrieve(paymentIntentSucceeded.payment_method as string);
                                const billingDetails = paymentMethod.billing_details;

                                logger.info(`[stripeWebhookHandler] Transaktion: PaymentMethod abgerufen. Billing Details Name: ${billingDetails?.name || 'N/A'}`);

                                if (billingDetails && billingDetails.address && billingDetails.address.line1 && billingDetails.address.postal_code && billingDetails.address.city && billingDetails.address.country) {
                                    const newAddress: SavedAddress = {
                                        id: `addr_${paymentMethod.id}`,
                                        name: billingDetails.name || `Rechnungsadresse ${billingDetails.address.postal_code}`,
                                        line1: billingDetails.address.line1,
                                        line2: billingDetails.address.line2 || undefined,
                                        city: billingDetails.address.city,
                                        postal_code: billingDetails.address.postal_code,
                                        country: billingDetails.address.country,
                                        type: 'billing',
                                        isDefault: true,
                                        savedAt: FieldValue.serverTimestamp(),
                                    };

                                    const existingAddresses: SavedAddress[] = (userData?.savedAddresses || []).map(addr => ({ ...addr, isDefault: false })); // Alle anderen auf isDefault=false setzen

                                    const isDuplicateAddress = existingAddresses.some(existingAddr =>
                                        existingAddr.line1 === newAddress.line1 &&
                                        existingAddr.postal_code === newAddress.postal_code &&
                                        existingAddr.city === newAddress.city &&
                                        existingAddr.country === newAddress.country
                                    );

                                    if (!isDuplicateAddress) {
                                        const updatedAddresses = [...existingAddresses, newAddress];
                                        transaction.update(userDocRef, { savedAddresses: updatedAddresses });
                                        logger.info(`[stripeWebhookHandler] Transaktion: Rechnungsadresse ${newAddress.id} für Nutzer ${firebaseUserId} wird zur Speicherung im Array markiert.`);

                                        // NEU: Aktualisiere auch die Felder auf oberster Ebene, wenn dies die Standard-Rechnungsadresse ist
                                        // und der Nutzer noch keine primären Adressdaten hat oder diese aktualisiert werden sollen.
                                        // Diese Logik kann angepasst werden, je nachdem, wann diese Felder überschrieben werden sollen.
                                        // Hier als Beispiel: Wenn newAddress.isDefault ist, aktualisiere die Hauptfelder.
                                        if (newAddress.isDefault) {
                                            const nameParts = newAddress.name.split(' ');
                                            const firstName = nameParts.shift() || '';
                                            const lastName = nameParts.join(' ') || '';

                                            transaction.update(userDocRef, {
                                                // Verwende die Namen aus der Adresse, wenn vorhanden, sonst Fallback
                                                firstName: firstName || userData?.firstName || '', // userData?.firstName wäre ein Fallback, falls schon vorhanden
                                                lastName: lastName || userData?.lastName || '',   // userData?.lastName wäre ein Fallback
                                                addressLine1: newAddress.line1,
                                                addressLine2: newAddress.line2 || null, // Stelle sicher, dass undefined zu null wird für Firestore
                                                city: newAddress.city,
                                                postalCode: newAddress.postal_code, // Beachte die Feldnamen-Konvention
                                                country: newAddress.country,
                                            });
                                            logger.info(`[stripeWebhookHandler] Transaktion: Primäre Adressfelder für Nutzer ${firebaseUserId} mit Daten aus Rechnungsadresse ${newAddress.id} aktualisiert.`);
                                        }
                                    } else {
                                        logger.info(`[stripeWebhookHandler] Transaktion: Rechnungsadresse für Nutzer ${firebaseUserId} bereits vorhanden. Überspringe Speicherung.`);
                                    }
                                } else {
                                    logger.warn(`[stripeWebhookHandler] Transaktion: Unvollständige Rechnungsadresse in PaymentMethod ${paymentMethod.id} für Nutzer ${firebaseUserId}. Überspringe Speicherung.`);
                                }
                            } catch (pmError: any) {
                                logger.error(`[stripeWebhookHandler] Transaktion: Fehler beim Abrufen/Speichern der Rechnungsadresse für PaymentIntent ${paymentIntentSucceeded.id}:`, pmError);
                                // Dies ist kein kritischer Fehler für den Auftrag, Transaktion sollte fortgesetzt werden.
                            }
                        }
                    }); // Ende der Transaktion
                    logger.info(`[stripeWebhookHandler] Transaktion für Job ${tempJobDraftId} erfolgreich abgeschlossen.`);

                } catch (dbError: any) {
                    logger.error(`[stripeWebhookHandler] Schwerwiegender Fehler bei der Job-Konvertierung (Draft ${tempJobDraftId} zu Auftrag) oder Transaktion fehlgeschlagen:`, dbError);
                    response.status(500).json({ received: true, message: `Job conversion failed: ${dbError.message}` }); // 500er Status für Stripe
                    return;
                }
                break;
            }

            case 'payment_intent.payment_failed': {
                const paymentIntentFailed = event.data.object as Stripe.PaymentIntent;
                logger.info(`[stripeWebhookHandler] PaymentIntent ${paymentIntentFailed.id} failed. Reason: ${paymentIntentFailed.last_payment_error?.message}`);
                // Hier könnten Sie Logik hinzufügen, um den temporären Job-Entwurf zu aktualisieren (z.B. Status 'Zahlung fehlgeschlagen')
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

            case 'setup_intent.succeeded': {
                const setupIntent = event.data.object as Stripe.SetupIntent;
                logger.info(`[stripeWebhookHandler] SetupIntent ${setupIntent.id} succeeded. PaymentMethod: ${setupIntent.payment_method}`);

                if (!setupIntent.customer) {
                    logger.error("[stripeWebhookHandler] setup_intent.succeeded ohne Customer ID. Überspringe.");
                    break;
                }

                try {
                    const paymentMethod = await localStripe.paymentMethods.retrieve(setupIntent.payment_method as string);
                    logger.info(`[stripeWebhookHandler] PaymentMethod Details abgerufen: ${paymentMethod.id}, Typ: ${paymentMethod.type}`);

                    const customer = await localStripe.customers.retrieve(setupIntent.customer as string);
                    const firebaseUid = (customer as Stripe.Customer).metadata?.firebaseUID;

                    if (!firebaseUid) {
                        logger.error(`[stripeWebhookHandler] Firebase UID nicht in Stripe Customer Metadata für ${setupIntent.customer} gefunden. Kann PaymentMethod nicht zuordnen.`);
                        break;
                    }

                    const userDocRef = db.collection('users').doc(firebaseUid);
                    const userDoc = await userDocRef.get();
                    const existingSavedPaymentMethods: any[] = userDoc.data()?.savedPaymentMethods || [];

                    const isDuplicate = existingSavedPaymentMethods.some((pm: any) => pm.id === paymentMethod.id);

                    if (isDuplicate) {
                        logger.info(`[stripeWebhookHandler] PaymentMethod ${paymentMethod.id} ist bereits für Nutzer ${firebaseUid} gespeichert. Überspringe Hinzufügen.`);
                        break;
                    }

                    const newSavedPaymentMethod = {
                        id: paymentMethod.id,
                        type: paymentMethod.type,
                        created: paymentMethod.created,
                        customer: paymentMethod.customer,
                        billing_details: {
                            address: paymentMethod.billing_details.address,
                            email: paymentMethod.billing_details.email,
                            name: paymentMethod.billing_details.name,
                            phone: paymentMethod.billing_details.phone,
                        },
                        card: paymentMethod.card ? {
                            brand: paymentMethod.card.brand,
                            last4: paymentMethod.card.last4,
                            exp_month: paymentMethod.card.exp_month,
                            exp_year: paymentMethod.card.exp_year,
                            funding: paymentMethod.card.funding,
                        } : undefined,
                        sepa_debit: paymentMethod.sepa_debit ? {
                            bank_code: paymentMethod.sepa_debit.bank_code,
                            country: paymentMethod.sepa_debit.country,
                            last4: paymentMethod.sepa_debit.last4,
                        } : undefined,
                        isDefault: existingSavedPaymentMethods.length === 0,
                    };

                    await userDocRef.update({
                        savedPaymentMethods: FieldValue.arrayUnion(newSavedPaymentMethod)
                    });
                    logger.info(`[stripeWebhookHandler] PaymentMethod ${paymentMethod.id} für Nutzer ${firebaseUid} in Firestore gespeichert.`);

                } catch (error) {
                    logger.error(`[stripeWebhookHandler] Fehler beim Verarbeiten von setup_intent.succeeded für ${setupIntent.id}:`, error);
                    response.status(500).send(`Webhook Error: Failed to process setup_intent.succeeded - ${error instanceof Error ? error.message : 'Unknown error'}`);
                    return;
                }
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
