// http_webhooks.ts

import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import Stripe from 'stripe'; // Keep Stripe import
import { getDb, getStripeInstance, FieldValue, Timestamp } from './helpers'; // Removed getStripeWebhookSecret
import { defineSecret } from 'firebase-functions/params';

// Parameter zentral definieren
const STRIPE_SECRET_KEY_WEBHOOKS = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET_PARAM = defineSecret("STRIPE_WEBHOOK_SECRET");

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

// Definiere den Typ für gespeicherte Zahlungsmethoden, wie er in Firestore erwartet wird
interface SavedPaymentMethodForFirestore {
    id: string;
    type: string;
    created: number;
    customer: string | Stripe.Customer | Stripe.DeletedCustomer | null;
    billing_details: Stripe.PaymentMethod.BillingDetails;
    card?: {
        brand: string | null;
        last4: string | null;
        exp_month: number | null;
        exp_year: number | null;
        funding: string | null;
    };
    sepa_debit?: {
        bank_code: string | null;
        country: string | null;
        last4: string | null;
    };
    isDefault: boolean;
}

// Helper to safely extract ID from Stripe objects (which can be string or expanded object)
function getStripeId(property: string | { id: string } | null | undefined): string | null {
    if (!property) return null;
    if (typeof property === 'string') return property;
    return property.id;
}

export const stripeWebhookHandler = onRequest(
    // The region is now inherited from the global options in index.ts (europe-west1).
    // This ensures consistency and simplifies local testing URLs.
    {
        secrets: [STRIPE_SECRET_KEY_WEBHOOKS, STRIPE_WEBHOOK_SECRET_PARAM],
    },
    async (request, response) => {
        logger.info(`[stripeWebhookHandler] Webhook aufgerufen, Methode: ${request.method}, URL: ${request.url}`);
        // Die Logik für den Emulator-Modus wird von defineSecret gehandhabt
        const stripeKey = STRIPE_SECRET_KEY_WEBHOOKS.value();
        const db = getDb();
        const localStripe = getStripeInstance(stripeKey);
        const webhookSecret = STRIPE_WEBHOOK_SECRET_PARAM.value();

        const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

        if (request.method === 'POST') {
            let buf = request.rawBody;
            if (!buf && request.body) {
                buf = Buffer.from(typeof request.body === 'string' ? request.body : JSON.stringify(request.body));
            }
            const sigHeader = request.headers['stripe-signature'];
            const sig = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader; // Stripe erwartet string

            let event: Stripe.Event;

            try {
                if (isEmulator) {
                    event = request.body as Stripe.Event;
                    logger.warn('[stripeWebhookHandler] ⚠️  Emulator-Modus: Stripe-Signaturprüfung wird übersprungen!');
                } else {
                    // Im Live-Betrieb müssen der Body-Buffer und die Signatur vorhanden sein.
                    // Diese Prüfungen beheben den TypeScript-Fehler, da sie den Typ für `buf` und `sig` eingrenzen.
                    if (!buf) {
                        throw new Error('Request body is missing or could not be read.');
                    }
                    if (!sig) {
                        throw new Error('Stripe signature header is missing.');
                    }
                    if (!webhookSecret) {
                        throw new Error('Stripe Webhook Secret is not defined.');
                    }
                    event = localStripe.webhooks.constructEvent(buf, sig, webhookSecret);
                }
                logger.info(`[stripeWebhookHandler] Event erfolgreich konstruiert: ${event.id}, Typ: ${event.type}`);
                // Logge nur einen kleinen Teil des Objekts, um sensible Daten zu vermeiden, falls das Objekt sehr groß ist
                if (event.data?.object && typeof event.data.object === 'object') {
                    const partialObject = Object.keys(event.data.object).slice(0, 5).reduce((obj, key) => {
                        // @ts-ignore
                        obj[key] = event.data.object[key];
                        return obj;
                    }, {} as any);
                    logger.info(`[stripeWebhookHandler] Event Data Object (Anfang): ${JSON.stringify(partialObject)}...`);
                }

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

                    const paymentType = paymentIntentSucceeded.metadata?.type;

                    // Handle additional hours payments
                    if (paymentType === 'additional_hours_platform_hold') {
                        logger.info(`[stripeWebhookHandler] Processing additional hours payment: ${paymentIntentSucceeded.id}`);

                        const orderId = paymentIntentSucceeded.metadata?.orderId;
                        const entryIds = paymentIntentSucceeded.metadata?.entryIds;

                        if (!orderId || !entryIds) {
                            logger.error(`[stripeWebhookHandler] Fehlende Metadaten für zusätzliche Stunden im PI ${paymentIntentSucceeded.id}. orderId: ${orderId}, entryIds: ${entryIds}`);
                            response.status(200).json({ received: true, message: 'Wichtige Metadaten (orderId oder entryIds) für zusätzliche Stunden fehlen.' });
                            return;
                        }

                        try {
                            const entryIdsList = entryIds.split(',');
                            const orderRef = db.collection('auftraege').doc(orderId);

                            await db.runTransaction(async (transaction) => {
                                const orderSnapshot = await transaction.get(orderRef);

                                if (!orderSnapshot.exists) {
                                    throw new Error(`Auftrag ${orderId} nicht gefunden.`);
                                }

                                const orderData = orderSnapshot.data()!;

                                // WICHTIG: TimeEntries sind im timeTracking.timeEntries Array gespeichert!
                                const timeEntries = orderData.timeTracking?.timeEntries || [];
                                let updatedCount = 0;

                                const updatedTimeEntries = timeEntries.map((entry: any) => {
                                    // Check if this entry is in the entryIds list and has billing_pending status
                                    // (regardless of whether paymentIntentId is already set - handle retry scenario)
                                    if (entryIdsList.includes(entry.id) && entry.status === 'billing_pending') {
                                        updatedCount++;
                                        logger.info(`[stripeWebhookHandler] TimeEntry ${entry.id} marked as transferred`);
                                        return {
                                            ...entry,
                                            status: 'transferred',
                                            billingStatus: 'transferred',
                                            paidAt: FieldValue.serverTimestamp(),
                                            transferredAt: FieldValue.serverTimestamp(),
                                            paymentIntentId: paymentIntentSucceeded.id,
                                        };
                                    }
                                    return entry;
                                });

                                // Update the order document with the fixed time entries and billing data
                                transaction.update(orderRef, {
                                    'timeTracking.timeEntries': updatedTimeEntries,
                                    'timeTracking.status': 'completed',
                                    'timeTracking.billingData.status': 'completed',
                                    'timeTracking.billingData.completedAt': FieldValue.serverTimestamp(),
                                    'timeTracking.lastUpdated': FieldValue.serverTimestamp(),
                                });

                                logger.info(`[stripeWebhookHandler] Updated ${updatedCount} time entries to transferred status`);

                                // Create Stripe Transfer to Connected Account
                                const providerStripeAccountId = paymentIntentSucceeded.metadata?.providerStripeAccountId;
                                const companyReceives = paymentIntentSucceeded.metadata?.companyReceives;

                                if (providerStripeAccountId && companyReceives) {
                                    try {
                                        // Create transfer to connected account
                                        const stripe = getStripeInstance(STRIPE_SECRET_KEY_WEBHOOKS.value());
                                        const transferAmount = parseInt(companyReceives, 10);

                                        const transfer = await stripe.transfers.create({
                                            amount: transferAmount,
                                            currency: 'eur',
                                            destination: providerStripeAccountId,
                                            description: `Zusätzliche Stunden für Auftrag ${orderId}`,
                                            metadata: {
                                                orderId: orderId,
                                                entryIds: entryIds,
                                                paymentIntentId: paymentIntentSucceeded.id,
                                                type: 'additional_hours_transfer'
                                            }
                                        });

                                        logger.info(`[stripeWebhookHandler] Stripe Transfer created: ${transfer.id} for ${transferAmount} cents to ${providerStripeAccountId}`);

                                        // Update time entries with transfer information
                                        const finalTimeEntries = updatedTimeEntries.map((entry: any) => {
                                            if (entryIdsList.includes(entry.id)) {
                                                return {
                                                    ...entry,
                                                    transferId: transfer.id,
                                                    transferNote: `Transfer to connected account: ${transfer.id}`
                                                };
                                            }
                                            return entry;
                                        });

                                        // Final update with transfer information
                                        transaction.update(orderRef, {
                                            'timeTracking.timeEntries': finalTimeEntries,
                                        });

                                    } catch (transferError: any) {
                                        logger.error(`[stripeWebhookHandler] Transfer failed to ${providerStripeAccountId}:`, transferError);
                                        // Still mark as transferred in database since payment succeeded
                                        // Manual intervention may be needed for the transfer
                                    }
                                }
                            });

                            logger.info(`[stripeWebhookHandler] Additional hours payment processed successfully for order ${orderId}`);
                            response.status(200).json({ received: true, message: 'Additional hours payment processed successfully' });
                            return;
                        } catch (dbError: any) {
                            logger.error(`[stripeWebhookHandler] Schwerwiegender Fehler bei der Verarbeitung zusätzlicher Stunden für PI ${paymentIntentSucceeded.id}:`, dbError);
                            response.status(500).json({ received: true, message: `Additional hours payment failed: ${dbError.message}` });
                            return;
                        }
                    }

                    // Handle regular job payments
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
                                return;
                            }

                            if (!tempJobDraftSnapshot.exists) {
                                throw new Error(`Transaktion: Temporärer Job-Entwurf ${tempJobDraftId} nicht gefunden.`);
                            }
                            logger.info(`[stripeWebhookHandler] Transaktion: Job-Entwurf ${tempJobDraftId} gefunden.`);


                            const tempJobDraftData = tempJobDraftSnapshot.data()!;
                            const userData = userDocSnapshot.data() as {
                                savedAddresses?: SavedAddress[];
                                firstName?: string;
                                lastName?: string;
                                personalStreet?: string;
                                personalCity?: string;
                                personalPostalCode?: string;
                                personalCountry?: string;
                            } | undefined;

                            // Berechnung für die Clearing-Periode (z.B. 14 Tage)
                            const clearingPeriodDays = 14;
                            const paidAtDate = new Date(); // Zeitpunkt der erfolgreichen Zahlung
                            const clearingEndsDate = new Date(paidAtDate.getTime() + clearingPeriodDays * 24 * 60 * 60 * 1000);
                            const clearingPeriodEndsAtTimestamp = Timestamp.fromDate(clearingEndsDate);

                            // KRITISCHE KORREKTUR: Berechne jobTotalCalculatedHours neu für Multi-Tag Aufträge
                            let correctedJobTotalCalculatedHours = tempJobDraftData.jobTotalCalculatedHours;

                            // Prüfe, ob es ein Multi-Tag Auftrag ist und korrigiere die Stunden
                            if (tempJobDraftData.jobDateFrom && tempJobDraftData.jobDateTo) {
                                const startDate = new Date(tempJobDraftData.jobDateFrom);
                                const endDate = new Date(tempJobDraftData.jobDateTo);

                                if (startDate.getTime() !== endDate.getTime()) {
                                    // Multi-Tag Auftrag: Berechne Tage und multipliziere
                                    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                                    // Extrahiere Stunden pro Tag aus jobDurationString
                                    const durationMatch = tempJobDraftData.jobDurationString?.match(/(\d+(\.\d+)?)/);
                                    const hoursPerDay = durationMatch ? parseFloat(durationMatch[1]) : 8; // Fallback auf 8 Stunden

                                    correctedJobTotalCalculatedHours = hoursPerDay * daysDiff;
                                    logger.info(`[stripeWebhookHandler] Multi-Tag Auftrag korrigiert: ${daysDiff} Tage × ${hoursPerDay}h = ${correctedJobTotalCalculatedHours}h`);
                                }
                            }

                            const auftragData = {
                                ...tempJobDraftData,
                                jobTotalCalculatedHours: correctedJobTotalCalculatedHours, // KORRIGIERTE Stunden verwenden
                                status: 'zahlung_erhalten_clearing', // Neuer Status für die Clearing-Periode
                                paymentIntentId: paymentIntentSucceeded.id, // WICHTIG: Speichern für eventuelle Rückerstattungen
                                paidAt: FieldValue.serverTimestamp(),
                                customerFirebaseUid: firebaseUserId,
                                tempJobDraftRefId: tempJobDraftId,
                                // Detaillierte Preiskomponenten aus Metadaten
                                originalJobPriceInCents: paymentIntentSucceeded.metadata?.originalJobPriceInCents ? parseInt(paymentIntentSucceeded.metadata.originalJobPriceInCents) : 0,
                                buyerServiceFeeInCents: paymentIntentSucceeded.metadata?.buyerServiceFeeInCents ? parseInt(paymentIntentSucceeded.metadata.buyerServiceFeeInCents) : 0,
                                sellerCommissionInCents: paymentIntentSucceeded.metadata?.sellerCommissionInCents ? parseInt(paymentIntentSucceeded.metadata.sellerCommissionInCents) : 0,
                                totalPlatformFeeInCents: paymentIntentSucceeded.metadata?.totalPlatformFeeInCents ? parseInt(paymentIntentSucceeded.metadata.totalPlatformFeeInCents) : (paymentIntentSucceeded.application_fee_amount || 0),
                                totalAmountPaidByBuyer: paymentIntentSucceeded.amount, // Gesamtbetrag, den der Käufer gezahlt hat
                                applicationFeeAmountFromStripe: paymentIntentSucceeded.application_fee_amount || 0, // Direkter Wert von Stripe
                                paymentMethodId: getStripeId(paymentIntentSucceeded.payment_method),
                                stripeCustomerId: getStripeId(paymentIntentSucceeded.customer),
                                // Neue Felder für Clearing und Genehmigung
                                clearingPeriodEndsAt: clearingPeriodEndsAtTimestamp,
                                buyerApprovedAt: null, // Wird später gesetzt
                            };

                            logger.info(`[stripeWebhookHandler] Transaktion: Daten für neuen Auftrag vorbereitet. Status: ${auftragData.status}`);
                            const newAuftragRef = auftragCollectionRef.doc();
                            transaction.set(newAuftragRef, auftragData);
                            logger.info(`[stripeWebhookHandler] Transaktion: Neuer Auftrag ${newAuftragRef.id} wird gesetzt.`);

                            transaction.update(tempJobDraftRef, {
                                status: 'converted',
                                convertedToOrderId: newAuftragRef.id,
                            });
                            logger.info(`[stripeWebhookHandler] Transaktion: Temporärer Entwurf ${tempJobDraftId} wird als 'converted' aktualisiert.`);

                            if (paymentIntentSucceeded.payment_method) {
                                try {
                                    const paymentMethodIdToRetrieve = getStripeId(paymentIntentSucceeded.payment_method);

                                    if (!paymentMethodIdToRetrieve) {
                                        logger.warn(`[stripeWebhookHandler] Transaktion: Konnte keine PaymentMethod ID aus PaymentIntent ${paymentIntentSucceeded.id} extrahieren.`);
                                        // Frühzeitiger Ausstieg aus diesem try-Block, da keine PM ID vorhanden ist
                                        throw new Error("Keine PaymentMethod ID zum Abrufen vorhanden."); // Wird im catch unten behandelt oder man loggt nur und fährt fort
                                    }
                                    logger.info(`[stripeWebhookHandler] Transaktion: Versuche, PaymentMethod ${paymentMethodIdToRetrieve} abzurufen.`);
                                    const paymentMethod = await localStripe.paymentMethods.retrieve(paymentMethodIdToRetrieve);
                                    const billingDetails = paymentMethod.billing_details;

                                    logger.info(`[stripeWebhookHandler] Transaktion: PaymentMethod ${paymentMethod.id} abgerufen. Billing Details Name: ${billingDetails?.name || 'N/A'}`);

                                    if (billingDetails && billingDetails.address && billingDetails.address.line1 && billingDetails.address.postal_code && billingDetails.address.city && billingDetails.address.country) {
                                        const newBillingAddress: SavedAddress = {
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

                                        let existingAddresses: SavedAddress[] = userData?.savedAddresses || [];
                                        const isDuplicateAddress = existingAddresses.some(existingAddr =>
                                            existingAddr.line1 === newBillingAddress.line1 &&
                                            existingAddr.postal_code === newBillingAddress.postal_code &&
                                            existingAddr.city === newBillingAddress.city &&
                                            existingAddr.country === newBillingAddress.country &&
                                            existingAddr.name === newBillingAddress.name
                                        );

                                        if (!isDuplicateAddress) {
                                            existingAddresses = existingAddresses.map(addr => ({ ...addr, isDefault: false }));
                                            const updatedAddresses = [...existingAddresses, newBillingAddress];
                                            transaction.update(userDocRef, { savedAddresses: updatedAddresses });
                                            logger.info(`[stripeWebhookHandler] Transaktion: Rechnungsadresse ${newBillingAddress.id} für Nutzer ${firebaseUserId} wird zur Speicherung im Array markiert.`);

                                            if (newBillingAddress.isDefault) {
                                                const userProfileUpdate: { [key: string]: any } = {};
                                                const nameParts = newBillingAddress.name.split(' ');
                                                const firstNameFromAddress = nameParts.shift() || '';
                                                const lastNameFromAddress = nameParts.join(' ') || '';

                                                // Aktualisiere den Namen nur, wenn er im Profil noch nicht gesetzt ist.
                                                if (!userData?.firstName && firstNameFromAddress) {
                                                    userProfileUpdate.firstName = firstNameFromAddress;
                                                }
                                                if (!userData?.lastName && lastNameFromAddress) {
                                                    userProfileUpdate.lastName = lastNameFromAddress;
                                                }
                                                // Aktualisiere immer die Adressfelder von der neuen Standard-Rechnungsadresse.
                                                userProfileUpdate.personalStreet = newBillingAddress.line1;
                                                userProfileUpdate.personalCity = newBillingAddress.city;
                                                userProfileUpdate.personalPostalCode = newBillingAddress.postal_code;
                                                userProfileUpdate.personalCountry = newBillingAddress.country;

                                                transaction.update(userDocRef, userProfileUpdate);
                                                logger.info(`[stripeWebhookHandler] Transaktion: Primäre Adress- und Profildetails für Nutzer ${firebaseUserId} mit Daten aus Rechnungsadresse ${newBillingAddress.id} aktualisiert.`);
                                            }
                                        } else {
                                            logger.info(`[stripeWebhookHandler] Transaktion: Rechnungsadresse für Nutzer ${firebaseUserId} bereits vorhanden. Überspringe Speicherung.`);
                                        }
                                    } else {
                                        logger.warn(`[stripeWebhookHandler] Transaktion: Unvollständige Rechnungsadresse in PaymentMethod ${paymentMethod.id} für Nutzer ${firebaseUserId}. Überspringe Speicherung.`);
                                    }
                                } catch (pmError: any) {
                                    logger.error(`[stripeWebhookHandler] Transaktion: Fehler beim Abrufen/Speichern der Rechnungsadresse für PaymentIntent ${paymentIntentSucceeded.id}:`, pmError);
                                }
                            }
                        });
                        logger.info(`[stripeWebhookHandler] Transaktion für Job ${tempJobDraftId} erfolgreich abgeschlossen.`);
                    } catch (dbError: any) {
                        logger.error(`[stripeWebhookHandler] Schwerwiegender Fehler bei der Job-Konvertierung (Draft ${tempJobDraftId} zu Auftrag) oder Transaktion fehlgeschlagen:`, dbError);
                        response.status(500).json({ received: true, message: `Job conversion failed: ${dbError.message}` });
                        return;
                    }
                    break;
                }

                // ... (andere payment_intent cases) ...

                case 'setup_intent.succeeded': {
                    const setupIntent = event.data.object as Stripe.SetupIntent;
                    // SEHR WICHTIGES LOGGING HIER AM ANFANG DES BLOCKS:
                    logger.info(`[stripeWebhookHandler] VERARBEITE setup_intent.succeeded: ${setupIntent.id}. PaymentMethod ID: ${setupIntent.payment_method}, Customer ID: ${setupIntent.customer}`);

                    if (!setupIntent.customer) {
                        logger.error("[stripeWebhookHandler] setup_intent.succeeded ohne Customer ID. Überspringe.");
                        break;
                    }
                    if (!setupIntent.payment_method) {
                        logger.error(`[stripeWebhookHandler] setup_intent.succeeded ${setupIntent.id} ohne payment_method ID. Überspringe.`);
                        break;
                    }

                    try {
                        const paymentMethodId = typeof setupIntent.payment_method === 'string' ? setupIntent.payment_method : setupIntent.payment_method?.id;
                        if (!paymentMethodId) {
                            logger.error(`[stripeWebhookHandler] Konnte keine gültige PaymentMethod ID aus SetupIntent ${setupIntent.id} extrahieren.`);
                            break;
                        }

                        const paymentMethod = await localStripe.paymentMethods.retrieve(paymentMethodId);
                        logger.info(`[stripeWebhookHandler] PaymentMethod Details für ${paymentMethodId} abgerufen: Typ ${paymentMethod.type}`);

                        const customerObject = await localStripe.customers.retrieve(setupIntent.customer as string);

                        if (customerObject.deleted) {
                            logger.error(`[stripeWebhookHandler] Stripe Customer ${setupIntent.customer as string} ist gelöscht. Kann PaymentMethod nicht zuordnen.`);
                            break;
                        }
                        // An dieser Stelle ist sicher, dass customerObject ein Stripe.Customer ist
                        const customer = customerObject as Stripe.Customer;

                        logger.info(`[stripeWebhookHandler] Stripe Customer Objekt für ${setupIntent.customer as string} abgerufen. Metadata:`, customer.metadata);
                        const firebaseUid = customer.metadata?.firebaseUID;
                        logger.info(`[stripeWebhookHandler] Extrahierte firebaseUID aus Customer Metadata: ${firebaseUid}`);

                        if (!firebaseUid) {
                            logger.error(`[stripeWebhookHandler] Firebase UID nicht in Stripe Customer Metadata für ${setupIntent.customer} gefunden. Kann PaymentMethod nicht zuordnen.`);
                            break;
                        }

                        const userDocRef = db.collection('users').doc(firebaseUid);
                        const userDoc = await userDocRef.get();
                        const existingData = userDoc.data();
                        let existingSavedPaymentMethods: SavedPaymentMethodForFirestore[] = (existingData?.savedPaymentMethods as SavedPaymentMethodForFirestore[]) || [];

                        const isDuplicate = existingSavedPaymentMethods.some((pm) => pm.id === paymentMethod.id);

                        if (isDuplicate) {
                            logger.info(`[stripeWebhookHandler] PaymentMethod ${paymentMethod.id} ist bereits für Nutzer ${firebaseUid} gespeichert. Überspringe Hinzufügen.`);
                            break;
                        }

                        // Alle existierenden Methoden auf isDefault: false setzen, da die neue Standard wird
                        if (existingSavedPaymentMethods.length > 0) {
                            existingSavedPaymentMethods = existingSavedPaymentMethods.map(pm => ({ ...pm, isDefault: false }));
                        }

                        const newSavedPaymentMethodData: Partial<SavedPaymentMethodForFirestore> = { // Mache es Partial, um optionale Felder zu behandeln
                            id: paymentMethod.id,
                            type: paymentMethod.type,
                            created: paymentMethod.created,
                            customer: paymentMethod.customer, // Kann Stripe Customer ID oder erweitertes Objekt sein
                            billing_details: paymentMethod.billing_details,
                            isDefault: true, // Die neu hinzugefügte Methode wird Standard
                        };

                        if (paymentMethod.card) {
                            newSavedPaymentMethodData.card = { // Stelle sicher, dass alle Felder hier definiert sind oder null, falls optional
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
                            newSavedPaymentMethodData.sepa_debit = { // Stelle sicher, dass alle Felder hier definiert sind oder null
                                bank_code: paymentMethod.sepa_debit.bank_code,
                                country: paymentMethod.sepa_debit.country,
                                last4: paymentMethod.sepa_debit.last4,
                            };
                        }

                        // Das Objekt newSavedPaymentMethodData enthält jetzt nur die Felder, die tatsächlich Werte haben.
                        // 'undefined' Felder wurden nicht hinzugefügt.
                        const newSavedPaymentMethodForDb = newSavedPaymentMethodData as SavedPaymentMethodForFirestore; // Typ-Assertion

                        const updatedPaymentMethods = [...existingSavedPaymentMethods, newSavedPaymentMethodForDb];

                        await userDocRef.update({
                            savedPaymentMethods: updatedPaymentMethods
                        });
                        logger.info(`[stripeWebhookHandler] ERFOLG: PaymentMethod ${paymentMethod.id} für Nutzer ${firebaseUid} in Firestore gespeichert und als Standard gesetzt.`);

                    } catch (error) {
                        logger.error(`[stripeWebhookHandler] FEHLER beim Verarbeiten von setup_intent.succeeded für ${setupIntent.id}:`, error);
                        // Sende trotzdem 200 OK an Stripe, um Wiederholungsversuche zu vermeiden, aber logge den Fehler.
                        // response.status(500).send(`Webhook Error: Failed to process setup_intent.succeeded - ${error instanceof Error ? error.message : 'Unknown error'}`);
                        // return; // Für Debugging kann ein 500er hilfreich sein, für Produktion eher 200 + Logging
                    }
                    break;
                }

                case 'account.updated': {
                    const account = event.data.object as Stripe.Account;
                    logger.info(`[stripeWebhookHandler] Account ${account.id} wurde aktualisiert.`);
                    logger.info(`  Charges enabled: ${account.charges_enabled}, Payouts enabled: ${account.payouts_enabled}, Details submitted: ${account.details_submitted}`);

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
                                    stripeAccountStatusUpdatedAt: FieldValue.serverTimestamp(),
                                });
                                logger.info(`[stripeWebhookHandler] Firestore-Benutzer ${userDoc.id} (Stripe Acc: ${account.id}) aktualisiert mit neuem Account-Status.`);
                            } else {
                                logger.warn(`[stripeWebhookHandler] Kein Benutzer in Firestore gefunden für Stripe Account ID: ${account.id}`);
                            }
                        } catch (dbError: any) {
                            logger.error(`[stripeWebhookHandler] Fehler beim Aktualisieren des Benutzerstatus in Firestore für Account ${account.id}:`, dbError);
                            // Sende trotzdem 200 OK, um Wiederholungen zu vermeiden, aber logge den Fehler.
                        }
                    }
                    break;
                }

                case 'capability.updated':
                case 'account.external_account.created':
                case 'person.created':
                case 'account.application.authorized': {
                    logger.info(`[stripeWebhookHandler] Event ${eventType} empfangen und zur Kenntnis genommen. Aktuell keine spezifische Aktion implementiert.`);
                    // Hier könnten Sie spezifische Logik für diese Events hinzufügen, falls erforderlich.
                    // Zum Beispiel: Loggen der Capability-Änderungen, oder Notiz über neue Bankkonten.
                    // logger.debug(`[stripeWebhookHandler] Event Data für ${eventType}:`, event.data.object);
                    break;
                }

                default:
                    logger.info(`[stripeWebhookHandler] Unbehandelter Event-Typ ${eventType}.`);
                // logger.debug(`[stripeWebhookHandler] Daten für unbehandelten Event-Typ ${eventType}:`, event.data.object);
            }

            logger.info(`[stripeWebhookHandler] Sending 200 OK for event ${event.id}`);
            response.status(200).json({ received: true });
        } else {
            logger.warn(`[stripeWebhookHandler] Methode ${request.method} nicht erlaubt.`);
            response.setHeader('Allow', 'POST');
            response.status(405).end('Method Not Allowed');
        }
    });
