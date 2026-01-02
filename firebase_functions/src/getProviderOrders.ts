import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getDb, getUserDisplayName, getAuthInstance } from "./helpers";
import { Timestamp } from "firebase-admin/firestore";
import { UNKNOWN_CUSTOMER_NAME } from "./constants";

const FIRESTORE_COLLECTIONS = {
    ORDERS: 'auftraege',
    USERS: 'users',
};

// This interface defines the structure of a single order returned to the client data table.
// It is aligned with the 'Order' type in the frontend components and provides all necessary fields.
interface ProviderOrderData {
    id: string;
    selectedSubcategory: string;
    customerName: string;
    customerAvatarUrl?: string;
    status: string;
    orderDate: Timestamp; // Use a consistent date field. It will be populated by paidAt or createdAt.
    totalAmountPaidByBuyer: number;
    uid: string; // The provider's UID (this company's UID)
    orderedBy: string; // The customer's UID
    projectId?: string;
    projectName?: string; // Mapped from projectId for frontend compatibility
    currency?: string;
    jobDateFrom?: string; // WICHTIG: Hinzugefügt für den Kalender
    jobDateTo?: string;   // WICHTIG: Hinzugefügt für den Kalender
}

export const getProviderOrders = onRequest(
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
        region: "europe-west1",
        timeoutSeconds: 60,
        memory: "512MiB",
        cpu: 0.5
    },
    async (request, response): Promise<void> => {
        // CORS handling
        response.set('Access-Control-Allow-Origin', 'https://taskilo.de');
        response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        response.set('Access-Control-Allow-Credentials', 'true');

        if (request.method === 'OPTIONS') {
            response.status(200).send('');
            return;
        }

        try {
            // 1. Authentication Check
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                logger.error("[getProviderOrders] Unauthenticated call - missing authorization header.");
                response.status(403).json({ error: 'Unauthorized: Missing authorization header' });
                return;
            }

            const idToken = authHeader.split('Bearer ')[1];
            let decodedToken;
            try {
                decodedToken = await getAuthInstance().verifyIdToken(idToken);
            } catch (error) {
                logger.error("[getProviderOrders] Token verification failed:", error);
                response.status(403).json({ error: 'Unauthorized: Invalid token' });
                return;
            }

            // 2. Input Validation - Check both query params and body
            let providerId: string | undefined;

            // Debug: Log request details
            logger.info(`[getProviderOrders] Request method: ${request.method}`);
            logger.info(`[getProviderOrders] Request headers:`, JSON.stringify(request.headers));
            logger.info(`[getProviderOrders] Request query:`, JSON.stringify(request.query));
            logger.info(`[getProviderOrders] Request body:`, JSON.stringify(request.body));

            // For GET requests, check query parameters
            if (request.method === 'GET') {
                providerId = request.query.providerId as string;
            }
            // For POST requests, check body
            else if (request.method === 'POST') {
                const bodyData = request.body;
                // Support both direct providerId and data.providerId (for compatibility with callable function structure)
                // Also support the wrapped format {"data": {"providerId": "..."}}
                providerId = bodyData?.providerId || bodyData?.data?.providerId;
            }

            if (!providerId) {
                logger.error("[getProviderOrders] Missing parameter: providerId.");
                logger.error(`[getProviderOrders] Available data - query: ${JSON.stringify(request.query)}, body: ${JSON.stringify(request.body)}`);
                response.status(400).json({ error: 'The function must be called with a "providerId" parameter.' });
                return;
            }

            logger.info(`[getProviderOrders] Called for provider: ${providerId}`);

            // 3. Authorization Check - Inhaber ODER Mitarbeiter dieser Company
            const isOwner = decodedToken.uid === providerId;
            const isEmployee = decodedToken.role === 'mitarbeiter' && decodedToken.companyId === providerId;
            
            if (!isOwner && !isEmployee) {
                logger.error(`[getProviderOrders] Security violation: User ${decodedToken.uid} (role: ${decodedToken.role}, companyId: ${decodedToken.companyId}) tried to access orders for provider ${providerId}.`);
                response.status(403).json({ error: 'You are not authorized to view these orders.' });
                return;
            }
            
            logger.info(`[getProviderOrders] Access granted - isOwner: ${isOwner}, isEmployee: ${isEmployee}`);

            const db = getDb();

            // 4. Fetch Data - WITHOUT CONVERTER to get RAW data
            const ordersCollection = db.collection(FIRESTORE_COLLECTIONS.ORDERS);
            // NO CONVERTER - get RAW data directly

            const ordersSnapshot = await ordersCollection
                .where('selectedAnbieterId', '==', providerId)
                .orderBy('createdAt', 'desc')
                .get();

            if (ordersSnapshot.empty) {
                logger.info(`[getProviderOrders] No orders found for provider ${providerId}.`);
                response.status(200).json({ orders: [] });
                return;
            }

            // CRITICAL DEBUG: Log every single document RAW
            logger.error(`[getProviderOrders] Found ${ordersSnapshot.docs.length} documents. Logging RAW data:`);
            ordersSnapshot.docs.forEach(doc => {
                const rawData = doc.data();
                logger.error(`[getProviderOrders] Document ${doc.id} RAW:`, JSON.stringify(rawData, null, 2));
            });

            // 5. Process Data & Batch Fetch Customer Details + TimeTracking Data
            const ordersFromDb = ordersSnapshot.docs.map(doc => {
                const rawData = doc.data();
                return {
                    id: doc.id,
                    ...rawData, // Use ALL raw data directly
                } as any; // Force any type to access all fields
            });

            const customerIds = [...new Set(ordersFromDb.map(order => order.customerFirebaseUid).filter(Boolean))];

            // Fetch customer details
            const customersMap = new Map<string, { name: string, avatarUrl?: string }>();
            if (customerIds.length > 0) {
                const customerDocRefs = customerIds.map(id => db.collection(FIRESTORE_COLLECTIONS.USERS).doc(id));
                const customerDocs = await db.getAll(...customerDocRefs);
                for (const customerDoc of customerDocs) {
                    if (customerDoc.exists) {
                        const customerData = customerDoc.data() || {};
                        const name = getUserDisplayName(customerData, UNKNOWN_CUSTOMER_NAME);
                        customersMap.set(customerDoc.id, { name, avatarUrl: customerData.profilePictureURL });
                    }
                }
            }

            // 6. Map to final OrderData structure with calculated total revenue
            const orders: ProviderOrderData[] = ordersFromDb.map(data => {
                const customerDetails = customersMap.get(data.customerFirebaseUid) || { name: UNKNOWN_CUSTOMER_NAME, avatarUrl: undefined };
                
                // SMART CALCULATION: Base amount + ALL billable timeTracking amounts
                let totalRevenue = 0;

                // 1. Add base order amount - check multiple field names for compatibility
                const baseAmount = data.totalAmountPaidByBuyer || data.totalPriceInCents || data.jobCalculatedPriceInCents || 0;
                if (baseAmount && typeof baseAmount === 'number' && baseAmount > 0) {
                    totalRevenue += baseAmount;
                    logger.error(`[getProviderOrders] Order ${data.id}: Added base amount ${baseAmount} cents`);
                }

                // 2. Add ALL billable amounts from timeTracking.timeEntries
                if (data.timeTracking && data.timeTracking.timeEntries && Array.isArray(data.timeTracking.timeEntries)) {
                    logger.error(`[getProviderOrders] Order ${data.id}: Found ${data.timeTracking.timeEntries.length} timeTracking entries`);
                    data.timeTracking.timeEntries.forEach((entry: any, index: number) => {
                        if (entry.billableAmount && typeof entry.billableAmount === 'number' && entry.billableAmount > 0) {
                            // Only add if payment was successful (transferred status)
                            if (entry.billingStatus === 'transferred' || entry.status === 'transferred') {
                                totalRevenue += entry.billableAmount;
                                logger.error(`[getProviderOrders] Order ${data.id}: Added timeEntry ${index} billableAmount ${entry.billableAmount} cents`);
                            } else {
                                logger.error(`[getProviderOrders] Order ${data.id}: Skipped timeEntry ${index} with status ${entry.billingStatus || entry.status}`);
                            }
                        } else {
                            logger.error(`[getProviderOrders] Order ${data.id}: timeEntry ${index} has no billableAmount`);
                        }
                    });
                } else {
                    logger.error(`[getProviderOrders] Order ${data.id}: No timeTracking.timeEntries found`);
                }

                // FORCE DEBUG LOG for every order
                logger.error(`[getProviderOrders] Order ${data.id} FINAL CALCULATION:`, {
                    baseAmount: data.totalAmountPaidByBuyer,
                    timeTrackingEntries: data.timeTracking?.timeEntries?.length || 0,
                    finalRevenue: totalRevenue,
                    status: data.status
                });

                return {
                    id: data.id,
                    selectedSubcategory: data.selectedSubcategory || data.unterkategorie,
                    customerName: customerDetails.name,
                    customerAvatarUrl: customerDetails.avatarUrl,
                    status: data.status,
                    orderDate: data.paidAt || data.createdAt,
                    totalAmountPaidByBuyer: totalRevenue,
                    uid: data.selectedAnbieterId,
                    orderedBy: data.customerFirebaseUid,
                    projectId: data.projectId,
                    projectName: data.projectId,
                    currency: data.currency || 'EUR',
                    jobDateFrom: data.jobDateFrom,
                    jobDateTo: data.jobDateTo,
                };
            });

            logger.info(`[getProviderOrders] Successfully fetched ${orders.length} orders for provider ${providerId}.`);
            response.status(200).json({ orders });

        } catch (error: any) {
            logger.error(`[getProviderOrders] Database query failed:`, error);
            response.status(500).json({
                error: 'An error occurred while fetching the orders. This might be due to a missing database index.',
                details: error.message
            });
        }
    }
);