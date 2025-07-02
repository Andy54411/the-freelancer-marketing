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

/**
 * Akzeptiert einen bezahlten Auftrag.
 * Ändert den Status von 'zahlung_erhalten_clearing' zu 'AKTIV'.
 */
export const acceptOrder = onCall(
    { cors: corsOptions },
    async (request: CallableRequest<OrderActionPayload>) => {
        logger.info(`[acceptOrder] Called for order: ${request.data.orderId}`);
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }

        const { orderId } = request.data;
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
                if (orderData?.selectedAnbieterId !== request.auth?.uid) {
                    throw new HttpsError('permission-denied', 'You are not authorized to accept this order.');
                }

                if (orderData?.status !== 'zahlung_erhalten_clearing') {
                    throw new HttpsError('failed-precondition', `Order cannot be accepted in its current state: ${orderData?.status}.`);
                }

                transaction.update(orderRef, {
                    status: 'AKTIV',
                    lastUpdatedAt: FieldValue.serverTimestamp()
                });
            });

            logger.info(`[acceptOrder] Order ${orderId} successfully accepted.`);
            return { success: true, message: 'Auftrag erfolgreich angenommen.' };

        } catch (error: any) {
            logger.error(`[acceptOrder] Transaction failed for order ${orderId}:`, error);
            if (error instanceof HttpsError) throw error;
            throw new HttpsError('internal', 'An error occurred while accepting the order.', error.message);
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
            if (orderData?.selectedAnbieterId !== request.auth?.uid) {
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