// /Users/andystaudinger/Tasko/firebase_functions/src/callable_orders.ts
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getDb, getStripeInstance, corsOptions } from "./helpers";
import { defineSecret } from "firebase-functions/params";
import { FieldValue } from "firebase-admin/firestore";

const STRIPE_SECRET_KEY_ORDERS = defineSecret("STRIPE_SECRET_KEY");

interface OrderActionPayload {
    orderId: string;
}

interface RejectOrderPayload extends OrderActionPayload {
    reason: string;
}

// Hilfsfunktion, um Datumsüberschneidungen zu prüfen.
// Eine Überschneidung findet statt, wenn ein Bereich beginnt, bevor der andere endet,
// UND endet, nachdem der andere begonnen hat.
const doRangesOverlap = (start1: Date, end1: Date, start2: Date, end2: Date): boolean => {
    return start1 < end2 && end1 > start2;
};

/**
 * Akzeptiert einen bezahlten Auftrag.
 * Ändert den Status von 'zahlung_erhalten_clearing' zu 'AKTIV'.
 */
export const acceptOrder = onCall(
    { cors: true },
    async (request: CallableRequest<OrderActionPayload>) => {
        logger.info(`[acceptOrder] Called for order: ${request.data.orderId}`);
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }

        const { orderId } = request.data;
        const providerUid = request.auth.uid; // Capture UID to use in transaction
        if (!orderId) {
            throw new HttpsError('invalid-argument', 'The function must be called with an "orderId".');
        }

        const db = getDb();
        const orderRef = db.collection('auftraege').doc(orderId);

        try {
            await db.runTransaction(async (transaction) => {
                const orderDoc = await transaction.get(orderRef);
                if (!orderDoc.exists) {
                    throw new HttpsError('not-found', 'Order not found.');
                }

                const orderData = orderDoc.data();
                if (orderData?.selectedAnbieterId !== providerUid) {
                    throw new HttpsError('permission-denied', 'You are not authorized to accept this order.');
                }

                const orderToAcceptData = orderData;
                if (orderToAcceptData?.status !== 'zahlung_erhalten_clearing') {
                    throw new HttpsError('failed-precondition', `Order cannot be accepted in its current state: ${orderToAcceptData?.status}.`);
                }

                // --- NEU: Logik zur Konfliktprüfung ---
                const newOrderStart = orderToAcceptData.jobDateFrom ? new Date(orderToAcceptData.jobDateFrom) : null;
                // Wenn kein Enddatum vorhanden ist, wird das Startdatum als Enddatum angenommen (z.B. für stundenbasierte Aufträge am selben Tag)
                const newOrderEnd = orderToAcceptData.jobDateTo ? new Date(orderToAcceptData.jobDateTo) : newOrderStart;

                // Nur prüfen, wenn der neue Auftrag Zeitdaten hat
                if (newOrderStart && newOrderEnd) {
                    const activeOrdersQuery = db.collection('auftraege').where('selectedAnbieterId', '==', providerUid).where('status', '==', 'AKTIV');
                    const activeOrdersSnapshot = await transaction.get(activeOrdersQuery);

                    for (const doc of activeOrdersSnapshot.docs) {
                        const activeOrder = doc.data();
                        const activeOrderStart = activeOrder.jobDateFrom ? new Date(activeOrder.jobDateFrom) : null;
                        const activeOrderEnd = activeOrder.jobDateTo ? new Date(activeOrder.jobDateTo) : activeOrderStart;

                        // Prüfe auf Überschneidung
                        if (activeOrderStart && activeOrderEnd && doRangesOverlap(newOrderStart, newOrderEnd, activeOrderStart, activeOrderEnd)) {
                            throw new HttpsError('failed-precondition', `Dieser Auftrag überschneidet sich mit einem bereits aktiven Auftrag (ID: ${doc.id}).`);
                        }
                    }
                } else {
                    logger.info(`Order ${orderId} has no job dates. Accepting without conflict check.`);
                }
                // --- ENDE: Logik zur Konfliktprüfung ---

                // NEU: Referenz auf das Chat-Dokument holen (ID ist identisch mit Auftrags-ID)
                const chatDocRef = db.collection('chats').doc(orderId);
                const customerId = orderToAcceptData?.customerFirebaseUid || orderToAcceptData?.kundeId;
                const providerId = orderToAcceptData?.selectedAnbieterId;

                // Aktualisiere den Auftragsstatus
                transaction.update(orderRef, {
                    status: 'AKTIV',
                    lastUpdatedAt: FieldValue.serverTimestamp()
                });

                // NEU: Schalte den zugehörigen Chat frei.
                // set mit merge:true erstellt das Dokument, falls es nicht existiert,
                // und aktualisiert es, falls es existiert.
                transaction.set(chatDocRef, {
                    isLocked: false, // Chat explizit freischalten
                    lastUpdated: FieldValue.serverTimestamp(),
                    users: [customerId, providerId].filter(Boolean) // Stellt sicher, dass die UIDs für Regeln/Abfragen vorhanden sind
                }, { merge: true });
            });

            logger.info(`[acceptOrder] Order ${orderId} successfully accepted and chat unlocked.`);
            return { success: true, message: 'Auftrag erfolgreich angenommen.' };

        } catch (error: any) {
            logger.error(`[acceptOrder] Transaction failed for order ${orderId}:`, error);
            if (error instanceof HttpsError) throw error;
            throw new HttpsError('internal', `An internal error occurred while accepting the order: ${error.message}`, {
                originalError: error.toString()
            });
        }
    }
);

/**
 * Lehnt einen bezahlten Auftrag ab und erstattet dem Kunden den Betrag zurück.
 * Ändert den Status zu 'abgelehnt_vom_anbieter'.
 */
export const rejectOrder = onCall(
    { cors: corsOptions },
    async (request: CallableRequest<RejectOrderPayload>) => {
        logger.info(`[rejectOrder] Called for order: ${request.data.orderId}`);
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }

        const { orderId, reason } = request.data;
        const providerUid = request.auth.uid; // Capture UID
        if (!orderId || !reason) {
            throw new HttpsError('invalid-argument', 'The function must be called with an "orderId" and a "reason".');
        }

        const db = getDb();
        const stripeKey = STRIPE_SECRET_KEY_ORDERS.value();
        const stripe = getStripeInstance(stripeKey);
        const orderRef = db.collection('auftraege').doc(orderId);

        try {
            const orderDoc = await orderRef.get();
            if (!orderDoc.exists) {
                throw new HttpsError('not-found', 'Order not found.');
            }

            const orderData = orderDoc.data();
            if (orderData?.selectedAnbieterId !== providerUid) {
                throw new HttpsError('permission-denied', 'You are not authorized to reject this order.');
            }

            if (orderData?.status !== 'zahlung_erhalten_clearing') {
                throw new HttpsError('failed-precondition', `Order cannot be rejected in its current state: ${orderData?.status}.`);
            }

            const paymentIntentId = orderData?.paymentIntentId;
            if (!paymentIntentId) {
                throw new HttpsError('failed-precondition', 'Payment Intent ID is missing, cannot process refund.');
            }

            // Create a refund via Stripe
            logger.info(`[rejectOrder] Creating refund for Payment Intent: ${paymentIntentId}`);
            const refund = await stripe.refunds.create({
                payment_intent: paymentIntentId,
            });
            logger.info(`[rejectOrder] Stripe refund created: ${refund.id}`);

            // Get a reference to the chat document. The chat ID is the same as the order ID.
            const chatDocRef = db.collection('chats').doc(orderId);

            // Create a batch to update both documents atomically.
            const batch = db.batch();

            // Update the order document
            batch.update(orderRef, {
                status: 'abgelehnt_vom_anbieter',
                rejectionReason: reason,
                refundId: refund.id,
                lastUpdatedAt: FieldValue.serverTimestamp()
            });

            // WICHTIG: UIDs beider Teilnehmer aus dem Auftrag holen.
            const customerId = orderData?.customerFirebaseUid || orderData?.kundeId;
            const providerId = orderData?.selectedAnbieterId;

            // Lock the corresponding chat. Use set with merge to create the doc if it doesn't exist.
            batch.set(chatDocRef, {
                isLocked: true,
                lastUpdated: FieldValue.serverTimestamp(),
                users: [customerId, providerId].filter(Boolean) // Stellt sicher, dass die UIDs für die Sicherheitsregeln vorhanden sind.
            }, { merge: true });

            await batch.commit();

            logger.info(`[rejectOrder] Order ${orderId} successfully rejected, refunded, and chat locked.`);
            return { success: true, message: 'Auftrag erfolgreich abgelehnt und Rückerstattung eingeleitet.' };

        } catch (error: any) {
            logger.error(`[rejectOrder] Failed for order ${orderId}:`, error);
            if (error.type === 'StripeInvalidRequestError') {
                throw new HttpsError('internal', `Stripe error: ${error.message}`);
            }
            if (error instanceof HttpsError) throw error;
            throw new HttpsError('internal', 'An error occurred while rejecting the order.', error.message);
        }
    }
);