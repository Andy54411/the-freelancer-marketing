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
 * DEBUG: Analysiert Zahlungen für einen spezifischen Auftrag
 */
export const debugOrderPaymentsHTTP = onRequest(
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
            const { orderId } = request.body;
            
            if (!orderId) {
                response.status(400).json({ error: 'orderId ist erforderlich' });
                return;
            }

            const db = getDb();
            
            // Order laden
            const orderDoc = await db.collection('auftraege').doc(orderId).get();
            if (!orderDoc.exists) {
                response.status(404).json({ error: 'Auftrag nicht gefunden' });
                return;
            }
            
            const orderData = orderDoc.data();
            
            // Alle Zahlungen für diesen Auftrag suchen
            const paymentsQuery = await db.collection('payments')
                .where('orderId', '==', orderId)
                .get();
            
            const payments = paymentsQuery.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Array<{id: string; amount?: number; [key: string]: any}>;
            
            // Escrow Payments suchen
            const escrowQuery = await db.collection('escrowPayments')
                .where('orderId', '==', orderId) 
                .get();
            
            const escrowPayments = escrowQuery.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Array<{id: string; amount?: number; [key: string]: any}>;
            
            // Time Tracking laden
            const timeTrackingDoc = await db.collection('time_tracking').doc(orderId).get();
            const timeTrackingData = timeTrackingDoc.exists ? timeTrackingDoc.data() : null;

            const debugInfo = {
                orderId,
                orderStatus: orderData?.status,
                orderTotalPrice: orderData?.totalPrice,
                orderPlannedHours: orderData?.plannedHours,
                orderHourlyRate: orderData?.hourlyRate,
                payments: payments,
                escrowPayments: escrowPayments,
                timeTracking: timeTrackingData,
                paymentsCount: payments.length,
                escrowCount: escrowPayments.length,
                totalPaymentAmount: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
                totalEscrowAmount: escrowPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
            };

            logger.info('DEBUG Order Payments:', { orderId, debugInfo });
            response.status(200).json(debugInfo);

        } catch (error) {
            logger.error('Debug Order Payments Error:', error);
            response.status(500).json({ error: 'Interner Serverfehler' });
        }
    }
);

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

// HTTP version of getUserOrders to handle CORS properly
export const getUserOrdersHTTP = onRequest(
    { cors: true, region: 'europe-west1', timeoutSeconds: 180 },
    async (request, response) => {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            response.set('Access-Control-Allow-Origin', '*');
            response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
            response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            response.set('Access-Control-Max-Age', '3600');
            response.status(204).send('');
            return;
        }

        // Set CORS headers for actual request
        response.set('Access-Control-Allow-Origin', '*');
        response.set('Access-Control-Allow-Methods', 'POST');
        response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (request.method !== 'POST') {
            response.status(405).json({ error: 'Method not allowed' });
            return;
        }

        try {
            // Verify authentication
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                response.status(401).json({ error: 'Unauthorized: No valid token provided' });
                return;
            }

            const idToken = authHeader.split('Bearer ')[1];
            const decodedToken = await getAuth().verifyIdToken(idToken);
            const userId = decodedToken.uid;

            // Get request data
            const { userType, limit = 20, lastOrderId } = request.body;

            const db = getDb();
            let ordersQuery: any;

            if (userType === 'customer') {
                ordersQuery = db.collection('auftraege').where('customerFirebaseUid', '==', userId);
            } else if (userType === 'provider') {
                ordersQuery = db.collection('auftraege').where('selectedAnbieterId', '==', userId);
            } else {
                response.status(400).json({ error: 'Invalid userType. Must be either "customer" or "provider".' });
                return;
            }

            ordersQuery = ordersQuery.orderBy('createdAt', 'desc').limit(limit);

            if (lastOrderId) {
                const lastOrderDoc = await db.collection('orders').doc(lastOrderId).get();
                if (lastOrderDoc.exists) {
                    ordersQuery = ordersQuery.startAfter(lastOrderDoc);
                }
            }

            const ordersSnapshot = await ordersQuery.get();
            const orders = [];

            for (const orderDoc of ordersSnapshot.docs) {
                const orderData = orderDoc.data();

                // Get user data
                let userData = null;
                if (userType === 'customer' && orderData.selectedAnbieterId) {
                    const userDoc = await db.collection('users').doc(orderData.selectedAnbieterId).get();
                    if (userDoc.exists) {
                        const data = userDoc.data();
                        userData = {
                            uid: userDoc.id,
                            firstName: data?.firstName || '',
                            lastName: data?.lastName || '',
                            profilePicture: data?.profilePicture || null,
                            companyName: data?.companyName || null,
                            rating: data?.rating || null,
                            reviewCount: data?.reviewCount || 0,
                        };
                    }
                } else if (userType === 'provider' && orderData.customerFirebaseUid) {
                    const userDoc = await db.collection('users').doc(orderData.customerFirebaseUid).get();
                    if (userDoc.exists) {
                        const data = userDoc.data();
                        userData = {
                            uid: userDoc.id,
                            firstName: data?.firstName || '',
                            lastName: data?.lastName || '',
                            profilePicture: data?.profilePicture || null,
                        };
                    }
                }

                // Get category data - use selectedCategory and selectedSubcategory from order data
                let categoryData = null;
                if (orderData.selectedCategory) {
                    categoryData = {
                        id: orderData.selectedCategory,
                        name: orderData.selectedSubcategory || orderData.selectedCategory,
                        category: orderData.selectedCategory,
                        subcategory: orderData.selectedSubcategory,
                        icon: null,
                    };
                }

                orders.push({
                    id: orderDoc.id,
                    ...orderData,
                    user: userData,
                    category: categoryData,
                });
            }

            response.status(200).json({
                success: true,
                orders: orders,
                hasMore: ordersSnapshot.size === limit
            });

        } catch (error: any) {
            console.error('Error in getUserOrdersHTTP:', error);
            if (error.code === 'auth/id-token-expired') {
                response.status(401).json({ error: 'Token expired' });
            } else if (error.code === 'auth/invalid-id-token') {
                response.status(401).json({ error: 'Invalid token' });
            } else {
                response.status(500).json({ error: 'Internal server error' });
            }
        }
    }
);

/**
 * HTTP Version: Schließt einen aktiven Auftrag ab.
 * Ändert den Status von 'AKTIV' zu 'ABGESCHLOSSEN' und gibt Geld über das Treuhand-System frei.
 */
export const completeOrderHTTP = onRequest(
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
        // CORS handling - Dynamisch basierend auf Origin für completeOrderHTTP
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
        
        const origin = request.headers.origin;
        if (allowedOrigins.includes(origin || '')) {
            response.set('Access-Control-Allow-Origin', origin);
        } else {
            response.set('Access-Control-Allow-Origin', 'https://taskilo.de');
        }
        
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
            // Token validieren
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                response.status(401).json({ error: 'Authorization header missing or invalid' });
                return;
            }

            const idToken = authHeader.split('Bearer ')[1];
            const decodedToken = await getAuth().verifyIdToken(idToken);
            const providerId = decodedToken.uid;

            // Request body validieren
            const { orderId, completionNote } = request.body as {
                orderId: string;
                completionNote?: string;
            };

            if (!orderId) {
                response.status(400).json({ error: 'orderId is required' });
                return;
            }

            logger.info(`Completing order ${orderId} by provider ${providerId}`);

            const db = getDb();
            const orderRef = db.collection('auftraege').doc(orderId);
            const orderDoc = await orderRef.get();

            if (!orderDoc.exists) {
                response.status(404).json({ error: 'Order not found' });
                return;
            }

            const orderData = orderDoc.data()!;

            // Prüfen ob der Benutzer der Anbieter ist
            if (orderData.selectedAnbieterId !== providerId) {
                response.status(403).json({ error: 'You are not authorized to complete this order' });
                return;
            }

            // Prüfen ob der Auftrag aktuell aktiv ist
            if (orderData.status !== 'AKTIV') {
                response.status(400).json({ 
                    error: `Order cannot be completed. Current status: ${orderData.status}. Only AKTIV orders can be completed.` 
                });
                return;
            }

            // Auftrag als "vom Provider abgeschlossen" markieren - wartet auf Kundenbestätigung
            await orderRef.update({
                status: 'PROVIDER_COMPLETED',
                providerCompletedAt: FieldValue.serverTimestamp(),
                completedBy: providerId,
                completionNote: completionNote || 'Auftrag wurde vom Anbieter als abgeschlossen markiert.',
                lastUpdated: FieldValue.serverTimestamp(),
                awaitingCustomerConfirmation: true
            });

            // Zusätzliche Aktionen nach Auftragabschluss:
            
            // 1. Time Tracking finalisieren (nur wenn vorhanden)
            const timeTrackingRef = db.collection('orderTimeTracking').doc(orderId);
            const timeTrackingDoc = await timeTrackingRef.get();
            
            if (timeTrackingDoc.exists) {
                await timeTrackingRef.update({
                    status: 'completed',
                    completedAt: FieldValue.serverTimestamp(),
                    lastUpdated: FieldValue.serverTimestamp()
                });
            }

            // 2. Bewertungssystem aktivieren - Beide Parteien können jetzt bewerten
            const reviewsCollectionRef = db.collection('orderReviews').doc(orderId);
            await reviewsCollectionRef.set({
                orderId,
                providerId,
                customerId: orderData.customerFirebaseUid || orderData.kundeId,
                providerCompletedAt: FieldValue.serverTimestamp(),
                reviewsEnabled: true,
                customerReviewSubmitted: false,
                providerReviewSubmitted: false,
                customerConfirmationPending: true,
                escrowReleased: false,
                createdAt: FieldValue.serverTimestamp()
            }, { merge: true });

            // 3. Treuhand-System - Markiere als "warten auf Kundenbestätigung"
            const escrowRef = db.collection('escrowPayments').doc(orderId);
            await escrowRef.set({
                orderId,
                providerId,
                customerId: orderData.customerFirebaseUid || orderData.kundeId,
                amount: orderData.jobCalculatedPriceInCents || orderData.totalAmountPaidByBuyer || 0,
                status: 'awaiting_customer_confirmation',
                providerCompletedAt: FieldValue.serverTimestamp(),
                awaitingCustomerConfirmation: true,
                payoutScheduled: false,
                createdAt: FieldValue.serverTimestamp()
            }, { merge: true });

            // 4. Benachrichtigungen erstellen
            const notificationsRef = db.collection('notifications');
            
            // Benachrichtigung für Kunde - Bestätigung erforderlich
            await notificationsRef.add({
                userId: orderData.customerFirebaseUid || orderData.kundeId,
                type: 'order_awaiting_confirmation',
                title: 'Auftrag wartet auf Ihre Bestätigung',
                message: `Ihr Anbieter hat den Auftrag als abgeschlossen markiert. Bitte bestätigen Sie den Abschluss und bewerten Sie den Service.`,
                orderId,
                read: false,
                actionRequired: true,
                createdAt: FieldValue.serverTimestamp()
            });

            // Benachrichtigung für Provider - Status Update
            await notificationsRef.add({
                userId: providerId,
                type: 'order_provider_completed',
                title: 'Auftrag als erledigt markiert',
                message: `Sie haben den Auftrag als abgeschlossen markiert. Die Auszahlung erfolgt nach Kundenbestätigung und Bewertung.`,
                orderId,
                read: false,
                createdAt: FieldValue.serverTimestamp()
            });

            // 5. Analytics/Tracking Event
            await db.collection('analytics').add({
                event: 'order_provider_completed',
                orderId,
                providerId,
                customerId: orderData.customerFirebaseUid || orderData.kundeId,
                orderValue: orderData.jobCalculatedPriceInCents || 0,
                category: orderData.selectedCategory,
                subcategory: orderData.selectedSubcategory,
                providerCompletionDate: FieldValue.serverTimestamp(),
                awaitingCustomerConfirmation: true,
                createdAt: FieldValue.serverTimestamp()
            });

            logger.info(`Order ${orderId} marked as completed by provider ${providerId}, awaiting customer confirmation`);

            response.status(200).json({
                success: true,
                message: 'Order marked as completed, awaiting customer confirmation',
                orderId: orderId,
                status: 'PROVIDER_COMPLETED',
                awaitingCustomerConfirmation: true,
                providerCompletedAt: new Date().toISOString()
            });

        } catch (error: any) {
            logger.error('Error in completeOrderHTTP:', error);
            
            if (error.code === 'auth/id-token-expired') {
                response.status(401).json({ error: 'Token expired' });
            } else if (error.code === 'auth/invalid-id-token') {
                response.status(401).json({ error: 'Invalid token' });
            } else {
                response.status(500).json({ 
                    error: 'Internal server error',
                    details: error.message 
                });
            }
        }
    }
);

/**
 * HTTP Version: Kunde bestätigt den Abschluss eines Auftrags und gibt Geld zur Auszahlung frei.
 * Erfordert eine Bewertung vom Kunden bevor die finale Freigabe erfolgt.
 */
export const confirmOrderCompletionHTTP = onRequest(
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
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            response.set('Access-Control-Allow-Origin', '*');
            response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
            response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            response.set('Access-Control-Max-Age', '3600');
            response.status(204).send('');
            return;
        }

        // Set CORS headers for actual request
        response.set('Access-Control-Allow-Origin', '*');
        response.set('Access-Control-Allow-Methods', 'POST');
        response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (request.method !== 'POST') {
            response.status(405).json({ error: 'Method not allowed' });
            return;
        }

        try {
            // Verify authentication
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                response.status(401).json({ error: 'Unauthorized: No valid token provided' });
                return;
            }

            const idToken = authHeader.split('Bearer ')[1];
            const decodedToken = await getAuth().verifyIdToken(idToken);
            const customerId = decodedToken.uid;

            const { 
                orderId, 
                confirmationNote,
                rating,
                reviewText
            }: {
                orderId: string;
                confirmationNote?: string;
                rating: number;
                reviewText: string;
            } = request.body;

            if (!orderId) {
                response.status(400).json({ error: 'orderId is required' });
                return;
            }

            if (!rating || rating < 1 || rating > 5) {
                response.status(400).json({ error: 'Rating between 1-5 is required' });
                return;
            }

            if (!reviewText || reviewText.trim().length < 10) {
                response.status(400).json({ error: 'Review text with at least 10 characters is required' });
                return;
            }

            logger.info(`Customer ${customerId} confirming completion of order ${orderId} with rating ${rating}`);

            const db = getDb();
            const orderRef = db.collection('auftraege').doc(orderId);
            const orderDoc = await orderRef.get();

            if (!orderDoc.exists) {
                response.status(404).json({ error: 'Order not found' });
                return;
            }

            const orderData = orderDoc.data()!;

            // Prüfen ob der Benutzer der Kunde ist
            if (orderData.customerFirebaseUid !== customerId && orderData.kundeId !== customerId) {
                response.status(403).json({ error: 'You are not authorized to confirm this order' });
                return;
            }

            // Prüfen ob der Auftrag vom Provider als abgeschlossen markiert wurde
            if (orderData.status !== 'PROVIDER_COMPLETED') {
                response.status(400).json({ 
                    error: `Order cannot be confirmed. Current status: ${orderData.status}. Only PROVIDER_COMPLETED orders can be confirmed.` 
                });
                return;
            }

            // Auftrag final als abgeschlossen markieren
            await orderRef.update({
                status: 'ABGESCHLOSSEN',
                customerConfirmedAt: FieldValue.serverTimestamp(),
                confirmedBy: customerId,
                confirmationNote: confirmationNote || 'Auftrag wurde vom Kunden bestätigt.',
                finalCompletedAt: FieldValue.serverTimestamp(),
                lastUpdated: FieldValue.serverTimestamp(),
                awaitingCustomerConfirmation: false
            });

            // Kundenbewertung speichern
            const reviewRef = db.collection('reviews').doc();
            await reviewRef.set({
                orderId,
                providerId: orderData.selectedAnbieterId,
                customerId,
                rating,
                reviewText: reviewText.trim(),
                reviewType: 'customer_to_provider',
                createdAt: FieldValue.serverTimestamp(),
                isVisible: true,
                isVerified: true
            });

            // Order Reviews Status aktualisieren
            const orderReviewsRef = db.collection('orderReviews').doc(orderId);
            await orderReviewsRef.update({
                customerReviewSubmitted: true,
                customerRating: rating,
                customerReviewText: reviewText.trim(),
                customerConfirmationPending: false,
                finalCompletedAt: FieldValue.serverTimestamp()
            });

            // Treuhand-System - Geld zur Auszahlung freigeben
            const escrowRef = db.collection('escrowPayments').doc(orderId);
            await escrowRef.update({
                status: 'ready_for_payout',
                customerConfirmedAt: FieldValue.serverTimestamp(),
                readyForPayoutAt: FieldValue.serverTimestamp(),
                awaitingCustomerConfirmation: false,
                customerRating: rating,
                escrowReleased: true
            });

            // Benachrichtigungen
            const notificationsRef = db.collection('notifications');
            
            // Benachrichtigung für Provider - Auszahlung bereit
            await notificationsRef.add({
                userId: orderData.selectedAnbieterId,
                type: 'order_final_completed',
                title: 'Guthaben verfügbar - Auszahlung möglich',
                message: `Der Kunde hat den Auftrag bestätigt und bewertet. Das Geld ist jetzt in Ihrem Stripe-Guthaben verfügbar und kann über den "Auszahlen" Button abgerufen werden.`,
                orderId,
                read: false,
                createdAt: FieldValue.serverTimestamp()
            });

            // Platform-Funds Release: Übertrage gehaltene Gelder an Provider
            let platformFundsReleased = false;
            try {
                if (orderData.timeTracking && orderData.timeTracking.timeEntries) {
                    // Finde alle Platform Hold PaymentIntents
                    const platformHoldPaymentIntents = orderData.timeTracking.timeEntries
                        .filter((entry: any) => entry.platformHoldStatus === 'held' && entry.platformHoldPaymentIntentId)
                        .map((entry: any) => entry.platformHoldPaymentIntentId)
                        .filter((id: string, index: number, arr: string[]) => arr.indexOf(id) === index); // Remove duplicates

                    if (platformHoldPaymentIntents.length > 0) {
                        logger.info(`Order ${orderId}: Releasing platform funds for ${platformHoldPaymentIntents.length} PaymentIntents`);
                        
                        // HTTP Call zu unserer eigenen Platform-Funds-Release API
                        const releaseResponse = await fetch('https://taskilo.de/api/release-platform-funds', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                orderId,
                                paymentIntentIds: platformHoldPaymentIntents
                            })
                        });

                        if (releaseResponse.ok) {
                            const releaseData = await releaseResponse.json();
                            platformFundsReleased = true;
                            logger.info(`Order ${orderId}: Platform funds successfully released. Transferred: ${releaseData.totalTransferred / 100}€`);
                        } else {
                            const errorData = await releaseResponse.json();
                            logger.error(`Order ${orderId}: Failed to release platform funds:`, errorData.error);
                        }
                    }
                }
            } catch (platformError) {
                logger.error(`Order ${orderId}: Error during platform funds release:`, platformError);
                // Continue execution - don't fail order completion because of platform funds issue
            }

            // Analytics Event
            await db.collection('analytics').add({
                event: 'order_final_completed',
                orderId,
                providerId: orderData.selectedAnbieterId,
                customerId,
                customerRating: rating,
                orderValue: orderData.jobCalculatedPriceInCents || 0,
                category: orderData.selectedCategory,
                subcategory: orderData.selectedSubcategory,
                finalCompletionDate: FieldValue.serverTimestamp(),
                platformFundsReleased,
                createdAt: FieldValue.serverTimestamp()
            });

            logger.info(`Order ${orderId} finally completed by customer ${customerId} with rating ${rating}. Platform funds released: ${platformFundsReleased}`);

            response.status(200).json({
                success: true,
                message: 'Order completion confirmed and money released for payout',
                orderId: orderId,
                status: 'ABGESCHLOSSEN',
                rating: rating,
                escrowReleased: true,
                platformFundsReleased,
                finalCompletedAt: new Date().toISOString()
            });

        } catch (error: any) {
            logger.error('Error in confirmOrderCompletionHTTP:', error);
            
            if (error.code === 'auth/id-token-expired') {
                response.status(401).json({ error: 'Token expired' });
            } else if (error.code === 'auth/invalid-id-token') {
                response.status(401).json({ error: 'Invalid token' });
            } else {
                response.status(500).json({ 
                    error: 'Internal server error',
                    details: error.message 
                });
            }
        }
    }
);
