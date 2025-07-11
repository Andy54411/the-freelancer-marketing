import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getDb, getUserDisplayName, getAuthInstance } from "./helpers";
import { Timestamp, FirestoreDataConverter, DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { UNKNOWN_CUSTOMER_NAME } from "./constants";

const FIRESTORE_COLLECTIONS = {
    ORDERS: 'auftraege',
    USERS: 'users',
};

// Interface für die Auftragsdaten, wie sie in Firestore gespeichert sind
interface AuftraegeDocumentData {
    customerFirebaseUid: string;
    selectedAnbieterId: string;
    selectedSubcategory: string;
    paidAt?: Timestamp;
    createdAt: Timestamp;
    jobCalculatedPriceInCents: number;
    status: 'AKTIV' | 'ABGESCHLOSSEN' | 'STORNIERT' | 'FEHLENDE DETAILS' | 'IN BEARBEITUNG' | 'zahlung_erhalten_clearing' | 'abgelehnt_vom_anbieter';
    description?: string;
    jobPostalCode?: string;
    jobTotalCalculatedHours?: number;
    projectId?: string; // Renamed from projectName for consistency
    currency?: string;
    jobDateFrom?: string;
    jobDateTo?: string;
    serviceImageUrl?: string;
}

// Firestore Data Converter for type-safe data access
const auftraegeConverter: FirestoreDataConverter<AuftraegeDocumentData> = {
    toFirestore(order: AuftraegeDocumentData): DocumentData {
        // This would be used if you were writing data.
        // For this read-only function, it's less critical but good practice.
        return order;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): AuftraegeDocumentData {
        // This ensures that any data read from Firestore is correctly typed.
        // It provides a single point of control for data validation, transformation, and setting default values.
        const data = snapshot.data() || {};

        // Add validation and default values to prevent runtime errors from malformed data.
        if (!data.createdAt) {
            // This case should be rare because of the orderBy('createdAt') clause in the query,
            // but it's a good safeguard to prevent crashes.
            logger.warn(`[getProviderOrders] Order document ${snapshot.id} is missing the 'createdAt' field.`);
        }

        return {
            ...data, // Spread optional fields first
            customerFirebaseUid: data.customerFirebaseUid || '',
            selectedAnbieterId: data.selectedAnbieterId || '',
            selectedSubcategory: data.selectedSubcategory || 'Dienstleistung',
            createdAt: data.createdAt || Timestamp.now(), // Fallback to satisfy the type, though the query requires it
            jobCalculatedPriceInCents: data.jobCalculatedPriceInCents || 0,
            status: data.status || 'FEHLENDE DETAILS',
        };
    }
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
        region: "europe-west1",
        cors: true,
        timeoutSeconds: 60,
        memory: "512MiB",
        cpu: 0.5
    },
    async (request, response): Promise<void> => {
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

            // 3. Authorization Check
            if (decodedToken.uid !== providerId) {
                logger.error(`[getProviderOrders] Security violation: User ${decodedToken.uid} tried to access orders for provider ${providerId}.`);
                response.status(403).json({ error: 'You are not authorized to view these orders.' });
                return;
            }

            const db = getDb();
            
            // 4. Fetch Data
            const ordersCollection = db
                .collection(FIRESTORE_COLLECTIONS.ORDERS)
                .withConverter(auftraegeConverter);

            const ordersSnapshot = await ordersCollection
                .where('selectedAnbieterId', '==', providerId)
                .orderBy('createdAt', 'desc')
                .get();

            if (ordersSnapshot.empty) {
                logger.info(`[getProviderOrders] No orders found for provider ${providerId}.`);
                response.status(200).json({ orders: [] });
                return;
            }

            // 5. Process Data & Batch Fetch Customer Details
            const ordersFromDb = ordersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));

            const customerIds = [...new Set(ordersFromDb.map(order => order.customerFirebaseUid).filter(Boolean))];

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

            // 6. Map to final OrderData structure
            const orders: ProviderOrderData[] = ordersFromDb.map(data => {
                const customerDetails = customersMap.get(data.customerFirebaseUid) || { name: UNKNOWN_CUSTOMER_NAME, avatarUrl: undefined };

                return {
                    id: data.id,
                    selectedSubcategory: data.selectedSubcategory || 'Dienstleistung',
                    customerName: customerDetails.name,
                    customerAvatarUrl: customerDetails.avatarUrl,
                    status: data.status,
                    orderDate: data.paidAt || data.createdAt,
                    totalAmountPaidByBuyer: data.jobCalculatedPriceInCents || 0,
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