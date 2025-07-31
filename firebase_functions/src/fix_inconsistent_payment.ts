// Manual fix for order 4bMTQQzVWsHyKhkbkRRu
// This script fixes the inconsistent payment status between Stripe and Firestore

import { onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getDb, getStripeInstance, FieldValue } from './helpers';
import { defineSecret } from 'firebase-functions/params';

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");

export const fixInconsistentPayment = onCall({
    secrets: [STRIPE_SECRET_KEY],
    cors: true,
}, async (request) => {
    const { data } = request;
    const orderId = data.orderId;
    const entryId = data.entryId;
    const paymentIntentId = data.paymentIntentId;

    if (!orderId || !entryId || !paymentIntentId) {
        throw new Error('Missing required parameters: orderId, entryId, paymentIntentId');
    }

    logger.info(`[fixInconsistentPayment] Fixing inconsistent payment for order ${orderId}, entry ${entryId}, PI ${paymentIntentId}`);

    try {
        const db = getDb();
        const stripe = getStripeInstance(STRIPE_SECRET_KEY.value());

        // First, verify the Stripe payment intent
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            throw new Error(`Payment Intent ${paymentIntentId} is not succeeded. Status: ${paymentIntent.status}`);
        }

        logger.info(`[fixInconsistentPayment] Stripe PI ${paymentIntentId} verified as succeeded`);

        // Update Firestore
        const orderRef = db.collection('auftraege').doc(orderId);

        await db.runTransaction(async (transaction) => {
            const orderSnapshot = await transaction.get(orderRef);

            if (!orderSnapshot.exists) {
                throw new Error(`Order ${orderId} not found`);
            }

            const orderData = orderSnapshot.data()!;
            const timeEntries = orderData.timeTracking?.timeEntries || [];

            const updatedTimeEntries = timeEntries.map((entry: any) => {
                if (entry.id === entryId) {
                    logger.info(`[fixInconsistentPayment] Updating entry ${entryId} from ${entry.status} to transferred`);
                    return {
                        ...entry,
                        status: 'transferred',
                        billingStatus: 'transferred',
                        paidAt: new Date(paymentIntent.created * 1000).toISOString(),
                        transferredAt: new Date().toISOString(),
                        paymentIntentId: paymentIntentId,
                        transferNote: 'Manual fix: Payment succeeded in Stripe but not reflected in Firestore'
                    };
                }
                return entry;
            });

            // Update the order
            transaction.update(orderRef, {
                'timeTracking.timeEntries': updatedTimeEntries,
                'timeTracking.billingData.status': 'completed',
                'timeTracking.billingData.completedAt': FieldValue.serverTimestamp(),
                'timeTracking.lastUpdated': FieldValue.serverTimestamp(),
            });

            // Create Stripe Transfer to Connected Account (if metadata available)
            const providerStripeAccountId = paymentIntent.metadata?.providerStripeAccountId;
            const companyReceives = paymentIntent.metadata?.companyReceives;

            if (providerStripeAccountId && companyReceives) {
                try {
                    const transferAmount = parseInt(companyReceives, 10);

                    const transfer = await stripe.transfers.create({
                        amount: transferAmount,
                        currency: 'eur',
                        destination: providerStripeAccountId,
                        description: `Manual fix: Zusätzliche Stunden für Auftrag ${orderId}`,
                        metadata: {
                            orderId: orderId,
                            entryId: entryId,
                            paymentIntentId: paymentIntentId,
                            type: 'manual_fix_additional_hours_transfer'
                        }
                    });

                    logger.info(`[fixInconsistentPayment] Stripe Transfer created: ${transfer.id} for ${transferAmount} cents to ${providerStripeAccountId}`);

                    // Update with transfer info
                    const finalTimeEntries = updatedTimeEntries.map((entry: any) => {
                        if (entry.id === entryId) {
                            return {
                                ...entry,
                                transferId: transfer.id,
                                transferNote: `Manual fix transfer: ${transfer.id}`
                            };
                        }
                        return entry;
                    });

                    transaction.update(orderRef, {
                        'timeTracking.timeEntries': finalTimeEntries,
                    });

                } catch (transferError: any) {
                    logger.error(`[fixInconsistentPayment] Transfer failed:`, transferError);
                    // Continue without transfer - manual intervention needed
                }
            }
        });

        logger.info(`[fixInconsistentPayment] Successfully fixed inconsistent payment for ${orderId}/${entryId}`);

        return {
            success: true,
            message: `Payment status fixed for order ${orderId}, entry ${entryId}`,
            paymentIntentId: paymentIntentId,
            timestamp: new Date().toISOString()
        };

    } catch (error: any) {
        logger.error(`[fixInconsistentPayment] Failed to fix payment:`, error);
        throw new Error(`Failed to fix payment: ${error.message}`);
    }
});
