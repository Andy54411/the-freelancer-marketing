// /Users/andystaudinger/Tasko/firebase_functions/src/http_orders.ts
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getDb } from "./helpers";
import { FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

interface OrderActionPayload {
    orderId: string;
}

// Hilfsfunktion, um Datumsüberschneidungen zu prüfen.
const doRangesOverlap = (start1: Date, end1: Date, start2: Date, end2: Date): boolean => {
    return start1 < end2 && end1 > start2;
};

/**
 * HTTP Version: Akzeptiert einen bezahlten Auftrag.
 * Ändert den Status von 'zahlung_erhalten_clearing' zu 'AKTIV'.
 */
export const acceptOrderHTTP = onRequest(
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
    async (request, response) => {
        // CORS handling
        response.set('Access-Control-Allow-Origin', 'https://taskilo.de');
        response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        response.set('Access-Control-Allow-Credentials', 'true');

        if (request.method === 'OPTIONS') {
            response.status(200).send('');
            return;
        }

        if (request.method !== 'POST') {
            response.status(405).json({ error: 'Method not allowed' });
            return;
        }

        try {
            const authHeader = request.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                response.status(401).json({ error: 'Authorization header missing or invalid' });
                return;
            }

            const idToken = authHeader.split('Bearer ')[1];
            const auth = getAuth();
            const decodedToken = await auth.verifyIdToken(idToken);
            const providerUid = decodedToken.uid;

            const { orderId } = request.body as OrderActionPayload;
            
            logger.info(`[acceptOrderHTTP] Called for order: ${orderId} by user: ${providerUid}`);

            if (!orderId) {
                response.status(400).json({ error: 'orderId is required' });
                return;
            }

            const db = getDb();
            const orderRef = db.collection('auftraege').doc(orderId);

            await db.runTransaction(async (transaction) => {
                const orderDoc = await transaction.get(orderRef);
                if (!orderDoc.exists) {
                    throw new Error('Order not found');
                }

                const orderData = orderDoc.data();
                if (orderData?.selectedAnbieterId !== providerUid) {
                    throw new Error('You are not authorized to accept this order');
                }

                const orderToAcceptData = orderData;
                if (orderToAcceptData?.status !== 'zahlung_erhalten_clearing') {
                    throw new Error(`Order cannot be accepted in its current state: ${orderToAcceptData?.status}`);
                }

                // Konfliktprüfung
                const newOrderStart = orderToAcceptData.jobDateFrom ? new Date(orderToAcceptData.jobDateFrom) : null;
                const newOrderEnd = orderToAcceptData.jobDateTo ? new Date(orderToAcceptData.jobDateTo) : newOrderStart;

                if (newOrderStart && newOrderEnd) {
                    const activeOrdersQuery = db.collection('auftraege').where('selectedAnbieterId', '==', providerUid).where('status', '==', 'AKTIV');
                    const activeOrdersSnapshot = await transaction.get(activeOrdersQuery);

                    for (const doc of activeOrdersSnapshot.docs) {
                        const activeOrder = doc.data();
                        const activeOrderStart = activeOrder.jobDateFrom ? new Date(activeOrder.jobDateFrom) : null;
                        const activeOrderEnd = activeOrder.jobDateTo ? new Date(activeOrder.jobDateTo) : activeOrderStart;

                        if (activeOrderStart && activeOrderEnd && doRangesOverlap(newOrderStart, newOrderEnd, activeOrderStart, activeOrderEnd)) {
                            throw new Error(`Dieser Auftrag überschneidet sich mit einem bereits aktiven Auftrag (ID: ${doc.id})`);
                        }
                    }
                } else {
                    logger.info(`Order ${orderId} has no job dates. Accepting without conflict check.`);
                }

                const chatDocRef = db.collection('chats').doc(orderId);
                const customerId = orderToAcceptData?.customerFirebaseUid || orderToAcceptData?.kundeId;
                const providerId = orderToAcceptData?.selectedAnbieterId;

                // Aktualisiere den Auftragsstatus
                transaction.update(orderRef, {
                    status: 'AKTIV',
                    lastUpdatedAt: FieldValue.serverTimestamp()
                });

                // Chat freischalten
                transaction.set(chatDocRef, {
                    isLocked: false,
                    lastUpdated: FieldValue.serverTimestamp(),
                    users: [customerId, providerId].filter(Boolean)
                }, { merge: true });
            });

            logger.info(`[acceptOrderHTTP] Order ${orderId} successfully accepted and chat unlocked.`);
            response.status(200).json({ success: true, message: 'Auftrag erfolgreich angenommen.' });

        } catch (error: any) {
            logger.error(`[acceptOrderHTTP] Error:`, error);
            if (error.message.includes('not found')) {
                response.status(404).json({ error: error.message });
            } else if (error.message.includes('not authorized')) {
                response.status(403).json({ error: error.message });
            } else if (error.message.includes('cannot be accepted')) {
                response.status(400).json({ error: error.message });
            } else {
                response.status(500).json({ error: 'Internal server error' });
            }
        }
    }
);
