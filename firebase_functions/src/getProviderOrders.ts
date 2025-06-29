import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getDb, getUserDisplayName } from "./helpers";
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
    createdAt?: Timestamp;
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
        // It provides a single point of control for data validation and transformation.
        const data = snapshot.data();
        return {
            ...data,
        } as AuftraegeDocumentData;
    }
};

// This interface defines the structure of a single order from the provider's perspective.
interface OrderData {
    id: string;
    serviceTitle: string;
    serviceImageUrl?: string;
    customerName: string; // Fetched from the customer's user document
    customerAvatarUrl?: string; // Fetched from the customer's user document
    orderDate?: Timestamp; // Mapped from paidAt or createdAt
    priceInCents: number;
    status: string;
    customerId: string; // The customer's Firebase UID
    beschreibung?: string;
    jobPostalCode?: string;
    jobTotalCalculatedHours?: number; // Mapped
    projectId?: string;
    currency?: string;
    jobDateFrom?: string;
    jobDateTo?: string;
    uid: string; // The provider's UID (this company's UID)
}

export const getProviderOrders = onCall(
    {
        region: "europe-west1", // Aligned with Firestore (eur3) and Hosting for better performance.
        // Explicitly allow requests from your local development server.
        cors: ["http://localhost:3000"],
    },
    async (request: CallableRequest<{ providerId: string }>): Promise<{ orders: OrderData[] }> => {
        logger.info(`[getProviderOrders] Called for provider: ${request.data.providerId}`);

        // 1. Authentication Check (handled by onCall wrapper)
        if (!request.auth) {
            logger.error("[getProviderOrders] Unauthenticated call.");
            throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }

        // 2. Input Validation
        const providerId = request.data.providerId;
        if (!providerId) {
            logger.error("[getProviderOrders] Missing parameter: providerId.");
            throw new HttpsError('invalid-argument', 'The function must be called with a "providerId".');
        }

        // 3. Authorization Check
        if (request.auth.uid !== providerId) {
            logger.error(`[getProviderOrders] Security violation: User ${request.auth.uid} tried to access orders for provider ${providerId}.`);
            throw new HttpsError('permission-denied', 'You are not authorized to view these orders.');
        }

        const db = getDb();
        try {
            // 4. Fetch Data
            const ordersCollection = db
                .collection(FIRESTORE_COLLECTIONS.ORDERS)
                .withConverter(auftraegeConverter); // Apply the type-safe converter

            const ordersSnapshot = await ordersCollection
                .where('selectedAnbieterId', '==', providerId) // Filter by the provider's UID
                .where('paidAt', '!=', null) // Ignore documents where 'paidAt' is missing to prevent crashes.
                .orderBy('paidAt', 'desc') // Now safe to order.
                .get();

            if (ordersSnapshot.empty) {
                logger.info(`[getProviderOrders] No orders found for provider ${providerId}.`);
                return { orders: [] };
            }

            // 5. Process Data & Batch Fetch Customer Details
            const ordersFromDb = ordersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(), // No 'as' cast needed, doc.data() is already correctly typed!
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
            const orders: OrderData[] = ordersFromDb.map(data => {
                const customerDetails = customersMap.get(data.customerFirebaseUid) || { name: UNKNOWN_CUSTOMER_NAME, avatarUrl: undefined };

                return {
                    id: data.id,
                    serviceTitle: data.selectedSubcategory || 'Dienstleistung',
                    serviceImageUrl: data.serviceImageUrl,
                    customerName: customerDetails.name,
                    customerAvatarUrl: customerDetails.avatarUrl,
                    orderDate: data.paidAt || data.createdAt, // Prefer paidAt, fallback to createdAt
                    priceInCents: data.jobCalculatedPriceInCents || 0,
                    status: data.status,
                    customerId: data.customerFirebaseUid,
                    beschreibung: data.description,
                    jobPostalCode: data.jobPostalCode,
                    jobTotalCalculatedHours: data.jobTotalCalculatedHours,
                    projectId: data.projectId,
                    currency: data.currency || 'EUR',
                    jobDateFrom: data.jobDateFrom,
                    jobDateTo: data.jobDateTo,
                    uid: data.selectedAnbieterId,
                };
            });

            logger.info(`[getProviderOrders] Successfully fetched ${orders.length} orders for provider ${providerId}.`);
            return { orders };

        } catch (error: any) {
            logger.error(`[getProviderOrders] Database query failed for provider ${providerId}:`, error);
            // This error often indicates a missing Firestore index. Check the emulator logs for a link to create it.
            throw new HttpsError(
                'internal',
                'An error occurred while fetching the orders. This might be due to a missing database index.',
                error.message
            );
        }
    }
);