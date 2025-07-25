// /Users/andystaudinger/Tasko/firebase_functions/src/callable_timeTracking.ts

import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getDb, getStripeInstance } from "./helpers";
import { defineSecret } from "firebase-functions/params";
import { FieldValue } from "firebase-admin/firestore";

const STRIPE_SECRET_KEY_TIME = defineSecret("STRIPE_SECRET_KEY");

interface InitializeTimeTrackingPayload {
    orderId: string;
    originalPlannedHours: number;
    hourlyRate: number; // In Euro
}

interface LogTimeEntryPayload {
    orderId: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:MM
    endTime?: string; // HH:MM
    hours: number;
    description: string;
    category: 'original' | 'additional';
    isBreakTime?: boolean;
    breakMinutes?: number;
    notes?: string;
}

interface SubmitForApprovalPayload {
    orderId: string;
    entryIds: string[];
    providerMessage?: string;
}

interface ProcessApprovalPayload {
    approvalRequestId: string;
    decision: 'approved' | 'rejected' | 'partially_approved';
    approvedEntryIds?: string[];
    customerFeedback?: string;
}

interface BillAdditionalHoursPayload {
    orderId: string;
    approvedEntryIds: string[];
}

const allowedOrigins = [
    "http://localhost:3000", 
    "http://localhost:3001", 
    "http://localhost:3002",
    "https://tilvo-f142f.web.app", 
    "http://localhost:5002",
    "https://tasko-rho.vercel.app",
    "https://tasko-zh8k.vercel.app",
    "https://tasko-live.vercel.app",
    "https://taskilo.de",
    "http://taskilo.de"
];

/**
 * Initialisiert Time Tracking für einen aktiven Auftrag
 */
export const initializeTimeTracking = onCall(
    { 
        cors: allowedOrigins,
        region: "europe-west1"
    },
    async (request: CallableRequest<InitializeTimeTrackingPayload>) => {
        logger.info(`[initializeTimeTracking] Called for order: ${request.data.orderId}`);
        
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }

        const { orderId, originalPlannedHours, hourlyRate } = request.data;
        const providerId = request.auth.uid;

        if (!orderId || !originalPlannedHours || !hourlyRate) {
            throw new HttpsError('invalid-argument', 'Missing required parameters.');
        }

        const db = getDb();

        try {
            // Prüfe ob Auftrag existiert und User berechtigt ist
            const orderRef = db.collection('auftraege').doc(orderId);
            const orderDoc = await orderRef.get();
            
            if (!orderDoc.exists) {
                throw new HttpsError('not-found', 'Order not found.');
            }

            const orderData = orderDoc.data();
            if (orderData?.selectedAnbieterId !== providerId) {
                throw new HttpsError('permission-denied', 'Not authorized for this order.');
            }

            // Erstelle Order Time Tracking
            const orderTimeTracking = {
                orderId,
                providerId,
                customerId: orderData.customerFirebaseUid || orderData.kundeId,
                originalPlannedHours,
                totalLoggedHours: 0,
                totalApprovedHours: 0,
                totalBilledHours: 0,
                hourlyRate: Math.round(hourlyRate * 100), // Convert to cents
                status: 'active',
                createdAt: FieldValue.serverTimestamp(),
                lastUpdated: FieldValue.serverTimestamp(),
            };

            await db.collection('orderTimeTracking').doc(orderId).set(orderTimeTracking);

            logger.info(`[initializeTimeTracking] Successfully initialized for order: ${orderId}`);
            return { success: true, message: 'Time tracking initialized successfully.' };

        } catch (error: any) {
            logger.error(`[initializeTimeTracking] Error:`, error);
            if (error instanceof HttpsError) throw error;
            throw new HttpsError('internal', 'Failed to initialize time tracking.', error.message);
        }
    }
);

/**
 * Loggt eine neue Zeiteintragung
 */
export const logTimeEntry = onCall(
    { 
        cors: allowedOrigins,
        region: "europe-west1"
    },
    async (request: CallableRequest<LogTimeEntryPayload>) => {
        logger.info(`[logTimeEntry] Called for order: ${request.data.orderId}`);
        
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }

        const { orderId, ...entryData } = request.data;
        const providerId = request.auth.uid;

        const db = getDb();

        try {
            // Prüfe Berechtigung
            const trackingDoc = await db.collection('orderTimeTracking').doc(orderId).get();
            if (!trackingDoc.exists) {
                throw new HttpsError('not-found', 'Time tracking not found for this order.');
            }

            const trackingData = trackingDoc.data();
            if (trackingData?.providerId !== providerId) {
                throw new HttpsError('permission-denied', 'Not authorized for this order.');
            }

            // Erstelle Time Entry
            const timeEntry: any = {
                orderId,
                providerId,
                customerId: trackingData.customerId,
                ...entryData,
                status: 'logged',
                createdAt: FieldValue.serverTimestamp(),
            };

            // Berechne billableAmount für zusätzliche Stunden
            if (entryData.category === 'additional') {
                timeEntry.billableAmount = Math.round(entryData.hours * trackingData.hourlyRate);
            }

            const entryRef = await db.collection('timeEntries').add(timeEntry);

            // Aktualisiere Order Time Tracking Statistiken
            await updateOrderTimeTrackingStats(orderId);

            logger.info(`[logTimeEntry] Successfully logged entry: ${entryRef.id}`);
            return { success: true, entryId: entryRef.id, message: 'Time entry logged successfully.' };

        } catch (error: any) {
            logger.error(`[logTimeEntry] Error:`, error);
            if (error instanceof HttpsError) throw error;
            throw new HttpsError('internal', 'Failed to log time entry.', error.message);
        }
    }
);

/**
 * Reicht Zeiteinträge zur Kundenfreigabe ein
 */
export const submitForCustomerApproval = onCall(
    { 
        cors: allowedOrigins,
        region: "europe-west1"
    },
    async (request: CallableRequest<SubmitForApprovalPayload>) => {
        logger.info(`[submitForCustomerApproval] Called for order: ${request.data.orderId}`);
        
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }

        const { orderId, entryIds, providerMessage } = request.data;
        const providerId = request.auth.uid;

        if (!orderId || !entryIds || entryIds.length === 0) {
            throw new HttpsError('invalid-argument', 'Missing required parameters.');
        }

        const db = getDb();

        try {
            const batch = db.batch();

            // Hole alle Einträge und prüfe Berechtigung
            const entries: any[] = [];
            for (const entryId of entryIds) {
                const entryDoc = await db.collection('timeEntries').doc(entryId).get();
                if (entryDoc.exists) {
                    const entryData = entryDoc.data();
                    if (entryData?.providerId !== providerId) {
                        throw new HttpsError('permission-denied', `Not authorized for entry: ${entryId}`);
                    }
                    if (entryData?.status !== 'logged') {
                        throw new HttpsError('failed-precondition', `Entry ${entryId} is not in logged state.`);
                    }
                    entries.push({ id: entryId, ...entryData });
                }
            }

            if (entries.length === 0) {
                throw new HttpsError('not-found', 'No valid entries found.');
            }

            const customerId = entries[0].customerId;
            const totalHours = entries.reduce((sum: number, entry: any) => sum + entry.hours, 0);
            
            // Berechne Gesamtbetrag (nur zusätzliche Stunden)
            const additionalEntries = entries.filter((entry: any) => entry.category === 'additional');
            const totalAmount = additionalEntries.reduce((sum: number, entry: any) => sum + (entry.billableAmount || 0), 0);

            // Erstelle Approval Request
            const approvalRequest = {
                orderId,
                providerId,
                customerId,
                timeEntryIds: entryIds,
                totalHours,
                totalAmount,
                submittedAt: FieldValue.serverTimestamp(),
                status: 'pending',
                providerMessage: providerMessage || null,
            };

            const approvalRef = await db.collection('customerApprovalRequests').add(approvalRequest);

            // Aktualisiere Einträge auf "submitted"
            for (const entry of entries) {
                batch.update(db.collection('timeEntries').doc(entry.id), {
                    status: 'submitted',
                    submittedAt: FieldValue.serverTimestamp(),
                });
            }

            // Aktualisiere Order Time Tracking
            batch.update(db.collection('orderTimeTracking').doc(orderId), {
                status: 'submitted_for_approval',
                lastUpdated: FieldValue.serverTimestamp(),
            });

            await batch.commit();

            logger.info(`[submitForCustomerApproval] Successfully submitted: ${approvalRef.id}`);
            return { success: true, approvalRequestId: approvalRef.id, message: 'Submitted for customer approval.' };

        } catch (error: any) {
            logger.error(`[submitForCustomerApproval] Error:`, error);
            if (error instanceof HttpsError) throw error;
            throw new HttpsError('internal', 'Failed to submit for approval.', error.message);
        }
    }
);

/**
 * Verarbeitet Kundenfreigabe
 */
export const processCustomerApproval = onCall(
    { 
        cors: allowedOrigins,
        region: "europe-west1"
    },
    async (request: CallableRequest<ProcessApprovalPayload>) => {
        logger.info(`[processCustomerApproval] Called for request: ${request.data.approvalRequestId}`);
        
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }

        const { approvalRequestId, decision, approvedEntryIds, customerFeedback } = request.data;
        const customerId = request.auth.uid;

        const db = getDb();

        try {
            const batch = db.batch();
            
            // Hole Approval Request
            const approvalRef = db.collection('customerApprovalRequests').doc(approvalRequestId);
            const approvalDoc = await approvalRef.get();

            if (!approvalDoc.exists) {
                throw new HttpsError('not-found', 'Approval request not found.');
            }

            const approvalData = approvalDoc.data();
            if (approvalData?.customerId !== customerId) {
                throw new HttpsError('permission-denied', 'Not authorized to process this approval.');
            }

            // Aktualisiere Approval Request
            batch.update(approvalRef, {
                status: decision,
                customerFeedback: customerFeedback || null,
                approvedEntryIds: approvedEntryIds || null,
                customerResponseAt: FieldValue.serverTimestamp(),
            });

            // Aktualisiere Time Entries basierend auf Entscheidung
            const entryIds = approvalData.timeEntryIds || [];
            for (const entryId of entryIds) {
                let newStatus: string;
                
                if (decision === 'approved') {
                    newStatus = 'customer_approved';
                } else if (decision === 'rejected') {
                    newStatus = 'customer_rejected';
                } else {
                    // partially_approved
                    newStatus = approvedEntryIds?.includes(entryId) ? 'customer_approved' : 'customer_rejected';
                }

                batch.update(db.collection('timeEntries').doc(entryId), {
                    status: newStatus,
                    customerResponseAt: FieldValue.serverTimestamp(),
                });
            }

            // Aktualisiere Order Time Tracking
            const orderId = approvalData.orderId;
            let orderStatus: string;
            
            if (decision === 'approved') {
                orderStatus = 'fully_approved';
            } else if (decision === 'rejected') {
                orderStatus = 'active'; // Zurück zu aktiv
            } else {
                orderStatus = 'partially_approved';
            }

            batch.update(db.collection('orderTimeTracking').doc(orderId), {
                status: orderStatus,
                customerFeedback: customerFeedback || null,
                lastUpdated: FieldValue.serverTimestamp(),
            });

            await batch.commit();

            // Aktualisiere Statistiken
            await updateOrderTimeTrackingStats(orderId);

            logger.info(`[processCustomerApproval] Successfully processed: ${approvalRequestId}`);
            return { success: true, message: 'Customer approval processed successfully.' };

        } catch (error: any) {
            logger.error(`[processCustomerApproval] Error:`, error);
            if (error instanceof HttpsError) throw error;
            throw new HttpsError('internal', 'Failed to process customer approval.', error.message);
        }
    }
);

/**
 * Rechnet genehmigte zusätzliche Stunden ab
 */
export const billApprovedAdditionalHours = onCall(
    { 
        cors: allowedOrigins,
        region: "europe-west1",
        secrets: [STRIPE_SECRET_KEY_TIME]
    },
    async (request: CallableRequest<BillAdditionalHoursPayload>) => {
        logger.info(`[billApprovedAdditionalHours] Called for order: ${request.data.orderId}`);
        
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }

        const { orderId, approvedEntryIds } = request.data;
        const providerId = request.auth.uid;

        const db = getDb();
        const stripe = getStripeInstance(STRIPE_SECRET_KEY_TIME.value());

        try {
            // Prüfe Berechtigung
            const trackingDoc = await db.collection('orderTimeTracking').doc(orderId).get();
            if (!trackingDoc.exists) {
                throw new HttpsError('not-found', 'Time tracking not found.');
            }

            const trackingData = trackingDoc.data();
            if (trackingData?.providerId !== providerId) {
                throw new HttpsError('permission-denied', 'Not authorized for this order.');
            }

            // Hole genehmigte Einträge
            const approvedEntries: any[] = [];
            let totalAmount = 0;

            for (const entryId of approvedEntryIds) {
                const entryDoc = await db.collection('timeEntries').doc(entryId).get();
                if (entryDoc.exists) {
                    const entryData = entryDoc.data();
                    if (entryData?.status === 'customer_approved' && entryData?.category === 'additional') {
                        approvedEntries.push({ id: entryId, ...entryData });
                        totalAmount += entryData.billableAmount || 0;
                    }
                }
            }

            if (approvedEntries.length === 0 || totalAmount <= 0) {
                throw new HttpsError('failed-precondition', 'No billable approved entries found.');
            }

            // Hole Kundendaten für Stripe
            const orderDoc = await db.collection('auftraege').doc(orderId).get();
            const orderData = orderDoc.data();
            const customerId = orderData?.customerFirebaseUid;
            
            if (!customerId) {
                throw new HttpsError('failed-precondition', 'Customer ID not found.');
            }

            const customerDoc = await db.collection('users').doc(customerId).get();
            const customerData = customerDoc.data();
            const stripeCustomerId = customerData?.stripeCustomerId;

            if (!stripeCustomerId) {
                throw new HttpsError('failed-precondition', 'Customer Stripe ID not found.');
            }

            // Erstelle Payment Intent für zusätzliche Stunden
            const paymentIntent = await stripe.paymentIntents.create({
                amount: totalAmount,
                currency: 'eur',
                customer: stripeCustomerId,
                application_fee_amount: Math.round(totalAmount * 0.045), // 4.5% Platform Fee
                transfer_data: {
                    destination: trackingData.providerStripeAccountId, // Provider's Stripe Account
                },
                metadata: {
                    orderId,
                    type: 'additional_hours',
                    entryIds: approvedEntryIds.join(','),
                    providerId,
                    customerId,
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            // Markiere Einträge als "billed"
            const batch = db.batch();
            
            for (const entry of approvedEntries) {
                batch.update(db.collection('timeEntries').doc(entry.id), {
                    status: 'billed',
                    paymentIntentId: paymentIntent.id,
                    billedAt: FieldValue.serverTimestamp(),
                });
            }

            // Aktualisiere Order Time Tracking
            batch.update(db.collection('orderTimeTracking').doc(orderId), {
                status: 'completed',
                lastUpdated: FieldValue.serverTimestamp(),
            });

            await batch.commit();

            logger.info(`[billApprovedAdditionalHours] Successfully created payment intent: ${paymentIntent.id}`);
            return { 
                success: true, 
                paymentIntentId: paymentIntent.id,
                clientSecret: paymentIntent.client_secret,
                amount: totalAmount,
                message: 'Payment intent created for additional hours.' 
            };

        } catch (error: any) {
            logger.error(`[billApprovedAdditionalHours] Error:`, error);
            if (error instanceof HttpsError) throw error;
            throw new HttpsError('internal', 'Failed to bill additional hours.', error.message);
        }
    }
);

/**
 * Aktualisiert Order Time Tracking Statistiken
 */
async function updateOrderTimeTrackingStats(orderId: string): Promise<void> {
    const db = getDb();

    try {
        // Hole alle Time Entries für den Auftrag
        const entriesSnapshot = await db.collection('timeEntries')
            .where('orderId', '==', orderId)
            .get();

        let totalLoggedHours = 0;
        let totalApprovedHours = 0;
        let totalBilledHours = 0;

        entriesSnapshot.docs.forEach(doc => {
            const entry = doc.data();
            totalLoggedHours += entry.hours || 0;

            if (entry.status === 'customer_approved' || entry.status === 'billed') {
                totalApprovedHours += entry.hours || 0;
            }

            if (entry.status === 'billed') {
                totalBilledHours += entry.hours || 0;
            }
        });

        // Aktualisiere Order Time Tracking
        await db.collection('orderTimeTracking').doc(orderId).update({
            totalLoggedHours,
            totalApprovedHours,
            totalBilledHours,
            lastUpdated: FieldValue.serverTimestamp(),
        });

        logger.info(`[updateOrderTimeTrackingStats] Updated stats for order: ${orderId}`);
    } catch (error) {
        logger.error(`[updateOrderTimeTrackingStats] Error:`, error);
    }
}
