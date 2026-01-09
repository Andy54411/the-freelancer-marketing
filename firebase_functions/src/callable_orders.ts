// /Users/andystaudinger/Tasko/firebase_functions/src/callable_orders.ts
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getDb } from "./helpers";
// STRIPE ENTFERNT (Januar 2026) - Zahlungen laufen über Revolut/Escrow
// import { defineSecret } from "firebase-functions/params";
import { FieldValue } from "firebase-admin/firestore";

// STRIPE ENTFERNT (Januar 2026)
// const STRIPE_SECRET_KEY_ORDERS = defineSecret("STRIPE_SECRET_KEY");

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
    {
        cors: [
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
        ],
        region: "europe-west1"
    },
    async (request: CallableRequest<OrderActionPayload>) => {
        logger.info(`[acceptOrder] Called for order: ${request.data.orderId}`);
        logger.info(`[acceptOrder] Auth context:`, {
            hasAuth: !!request.auth,
            uid: request.auth?.uid,
            token: request.auth?.token ? 'present' : 'missing'
        });

        if (!request.auth) {
            logger.error('[acceptOrder] Authentication missing');
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

                // Initialisiere Time Tracking für den aktiven Auftrag
                // Berechne die tatsächlichen Gesamtstunden basierend auf den Daten
                const dateFrom = orderToAcceptData?.jobDateFrom;
                const dateTo = orderToAcceptData?.jobDateTo;
                const hoursPerDay = parseFloat(String(orderToAcceptData?.jobDurationString || 8)); // Stunden pro Tag aus jobDurationString

                let totalDays = 1; // Mindestens 1 Tag
                let originalPlannedHours: number;

                if (dateFrom && dateTo && dateFrom !== dateTo) {
                    // Mehrtägiger Auftrag: Berechne Anzahl Tage
                    const startDate = new Date(dateFrom);
                    const endDate = new Date(dateTo);
                    totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    originalPlannedHours = totalDays * hoursPerDay; // Tage × Stunden pro Tag

                    console.log(`Mehrtägiger Auftrag: ${totalDays} Tage × ${hoursPerDay}h = ${originalPlannedHours}h`);
                } else {
                    // Eintägiger Auftrag: Verwende jobTotalCalculatedHours oder hoursPerDay
                    originalPlannedHours = orderToAcceptData?.jobTotalCalculatedHours || hoursPerDay;

                    console.log(`Eintägiger Auftrag: ${originalPlannedHours}h`);
                }

                const totalPriceInCents = orderToAcceptData?.jobCalculatedPriceInCents || 0;
                const hourlyRateInCents = originalPlannedHours > 0 ? Math.round(totalPriceInCents / originalPlannedHours) : 5000; // Berechne Stundensatz in Cent

                console.log(`Berechnung: ${totalPriceInCents}¢ ÷ ${originalPlannedHours}h = ${hourlyRateInCents}¢/h (${(hourlyRateInCents / 100).toFixed(2)}€/h)`);

                const orderTimeTracking = {
                    orderId,
                    providerId: providerUid,
                    customerId: orderToAcceptData.customerFirebaseUid || orderToAcceptData.kundeId,
                    originalPlannedHours,
                    totalLoggedHours: 0,
                    totalApprovedHours: 0,
                    totalBilledHours: 0,
                    hourlyRate: hourlyRateInCents, // Bereits in Cent
                    status: 'active',
                    createdAt: FieldValue.serverTimestamp(),
                    lastUpdated: FieldValue.serverTimestamp(),
                };

                transaction.set(db.collection('orderTimeTracking').doc(orderId), orderTimeTracking);

                // NEU: Schalte den zugehörigen Chat frei.
                // set mit merge:true erstellt das Dokument, falls es nicht existiert,
                // und aktualisiert es, falls es existiert.
                transaction.set(chatDocRef, {
                    isLocked: false, // Chat explizit freischalten
                    lastUpdated: FieldValue.serverTimestamp(),
                    participants: [customerId, providerId].filter(Boolean), // FIX: participants statt users für Firestore Rules
                    users: [customerId, providerId].filter(Boolean) // Behalte users für Backward-Kompatibilität
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
 * HINWEIS: Stripe wurde entfernt (Januar 2026) - Rückerstattungen laufen über Revolut/Escrow
 * Ändert den Status zu 'abgelehnt_vom_anbieter'.
 */
export const rejectOrder = onCall(
    {
        cors: [
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
        ],
        region: "europe-west1"
    },
    async (request: CallableRequest<RejectOrderPayload>) => {
        logger.info(`[rejectOrder] Called for order: ${request.data.orderId}`);
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }

        const { orderId, reason } = request.data;
        const providerUid = request.auth.uid;
        if (!orderId || !reason) {
            throw new HttpsError('invalid-argument', 'The function must be called with an "orderId" and a "reason".');
        }

        const db = getDb();
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

            // STRIPE ENTFERNT - Rückerstattung erfolgt über Revolut/Escrow System
            // Hier wird nur der Status aktualisiert, die Rückerstattung wird manuell oder über Escrow abgewickelt
            logger.info(`[rejectOrder] Marking order as rejected (Refund via Revolut/Escrow)`);

            // Get a reference to the chat document
            const chatDocRef = db.collection('chats').doc(orderId);
            const batch = db.batch();

            // Update the order document - ohne Stripe refundId
            batch.update(orderRef, {
                status: 'abgelehnt_vom_anbieter',
                rejectionReason: reason,
                refundMethod: 'REVOLUT_ESCROW', // Neue Methode statt Stripe
                lastUpdatedAt: FieldValue.serverTimestamp()
            });

            const customerId = orderData?.customerFirebaseUid || orderData?.kundeId;
            const providerId = orderData?.selectedAnbieterId;

            // Lock the corresponding chat
            batch.set(chatDocRef, {
                isLocked: true,
                lastUpdated: FieldValue.serverTimestamp(),
                users: [customerId, providerId].filter(Boolean)
            }, { merge: true });

            await batch.commit();

            logger.info(`[rejectOrder] Order ${orderId} successfully rejected. Refund will be processed via Revolut/Escrow.`);
            return { 
                success: true, 
                message: 'Auftrag erfolgreich abgelehnt. Rückerstattung wird über Revolut/Escrow abgewickelt.',
                refundMethod: 'REVOLUT_ESCROW'
            };
        } catch (error: unknown) {
            logger.error(`[rejectOrder] Failed for order ${orderId}:`, error);
            if (error instanceof HttpsError) throw error;
            const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
            throw new HttpsError('internal', `Fehler beim Ablehnen des Auftrags: ${errorMessage}`);
        }
    }
);