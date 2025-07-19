// /firebase_functions/src/getUserOrders.ts

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { getDb } from './helpers'; // Use shared helper for DB instance

interface OrderData {
    id: string;
    // Fields from the database document, based on provided data
    anbieterStripeAccountId: string;
    applicationFeeAmountFromStripe: number;
    buyerApprovedAt: Timestamp | null;
    buyerServiceFeeInCents: number;
    clearingPeriodEndsAt: Timestamp;
    createdAt: Timestamp;
    customerEmail: string;
    customerFirebaseUid: string;
    customerFirstName: string;
    customerLastName: string;
    customerType: 'private' | 'business';
    description: string;
    jobCalculatedPriceInCents: number;
    jobCity: string | null;
    jobCountry: string;
    jobDateFrom: string;
    jobDateTo: string | null;
    jobDurationString: string;
    jobPostalCode: string;
    jobStreet: string | null;
    jobTimePreference: string;
    jobTotalCalculatedHours: number;
    kundeId: string;
    lastUpdatedAt: Timestamp;
    originalJobPriceInCents: number;
    paidAt: Timestamp;
    paymentMethodId: string;
    providerName: string;
    selectedAnbieterId: string;
    selectedCategory: string;
    selectedSubcategory: string;
    sellerCommissionInCents: number;
    status:
    | 'AKTIV'
    | 'ABGESCHLOSSEN'
    | 'STORNIERT'
    | 'FEHLENDE DETAILS'
    | 'IN BEARBEITUNG'
    | 'zahlung_erhalten_clearing'
    | 'abgelehnt_vom_anbieter';
    stripeCustomerId: string;
    tempJobDraftRefId: string;
    totalAmountPaidByBuyer: number;
    totalPlatformFeeInCents: number;
    // Optional fields that might exist on other orders
    serviceImageUrl?: string;
    freelancerAvatarUrl?: string;
    projectName?: string;
    projectId?: string;
    currency?: string;
}

// Change back to onCall, which is the correct type for client-side SDK calls.
// It handles CORS, auth, and data parsing automatically.
export const getUserOrders = onCall(
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
    async (request: CallableRequest<{ userId: string }>): Promise<{ orders: OrderData[] }> => {
        logger.info(`[getUserOrders] Called for user: ${request.data.userId}`, { structuredData: true });

        // 1. Authentication Check (handled automatically by onCall)
        if (!request.auth) {
            logger.error("[getUserOrders] Unauthenticated call.", { userId: request.data.userId });
            throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }

        const requestingUid = request.auth.uid;
        const targetUid = request.data.userId;

        // 2. Authorization Check
        if (requestingUid !== targetUid) {
            logger.error(`[getUserOrders] Forbidden: User ${requestingUid} attempted to access orders for ${targetUid}.`);
            throw new HttpsError('permission-denied', 'You are not authorized to view these orders.');
        }

        try {
            const db = getDb(); // Get DB instance from shared helper

            // 3. Fetch Data
            const snapshot = await db
                .collection('auftraege')
                .where('customerFirebaseUid', '==', targetUid)
                .orderBy('createdAt', 'desc')
                .get();

            if (snapshot.empty) {
                logger.info(`[getUserOrders] No orders found for user: ${targetUid}`);
                return { orders: [] };
            }

            // 4. Process and Return Data
            const orders = snapshot.docs.map((doc): OrderData => {
                const data = doc.data() || {}; // Use empty object as fallback
                // This explicit mapping ensures that the data sent to the client always
                // matches the OrderData interface, providing default values for missing fields.
                // This prevents errors like 'NaN €' if a price field is missing.
                return {
                    id: doc.id,
                    anbieterStripeAccountId: data.anbieterStripeAccountId || '',
                    applicationFeeAmountFromStripe: data.applicationFeeAmountFromStripe || 0,
                    buyerApprovedAt: data.buyerApprovedAt || null,
                    buyerServiceFeeInCents: data.buyerServiceFeeInCents || 0,
                    clearingPeriodEndsAt: data.clearingPeriodEndsAt || new Timestamp(0, 0),
                    createdAt: data.createdAt || new Timestamp(0, 0), // Provide a fallback date
                    customerEmail: data.customerEmail || '',
                    customerFirebaseUid: data.customerFirebaseUid || '',
                    customerFirstName: data.customerFirstName || '',
                    customerLastName: data.customerLastName || '',
                    customerType: data.customerType || 'private',
                    description: data.description || '',
                    jobCalculatedPriceInCents: data.jobCalculatedPriceInCents || 0,
                    jobCity: data.jobCity || null,
                    jobCountry: data.jobCountry || '',
                    jobDateFrom: data.jobDateFrom || '',
                    jobDateTo: data.jobDateTo || null,
                    jobDurationString: data.jobDurationString || '',
                    jobPostalCode: data.jobPostalCode || '',
                    jobStreet: data.jobStreet || null,
                    jobTimePreference: data.jobTimePreference || '',
                    jobTotalCalculatedHours: data.jobTotalCalculatedHours || 0,
                    kundeId: data.kundeId || '',
                    lastUpdatedAt: data.lastUpdatedAt || new Timestamp(0, 0),
                    originalJobPriceInCents: data.originalJobPriceInCents || 0,
                    paidAt: data.paidAt || new Timestamp(0, 0),
                    paymentMethodId: data.paymentMethodId || '',
                    providerName: data.providerName || '',
                    selectedAnbieterId: data.selectedAnbieterId || '',
                    selectedCategory: data.selectedCategory || '',
                    selectedSubcategory: data.selectedSubcategory || '',
                    sellerCommissionInCents: data.sellerCommissionInCents || 0,
                    status: data.status || 'FEHLENDE DETAILS',
                    stripeCustomerId: data.stripeCustomerId || '',
                    tempJobDraftRefId: data.tempJobDraftRefId || '',
                    totalAmountPaidByBuyer: data.totalAmountPaidByBuyer || 0,
                    totalPlatformFeeInCents: data.totalPlatformFeeInCents || 0,
                    serviceImageUrl: data.serviceImageUrl,
                    freelancerAvatarUrl: data.freelancerAvatarUrl,
                    projectName: data.projectName,
                    projectId: data.projectId,
                    currency: data.currency || 'EUR', // Provide a fallback currency
                } as OrderData;
            });

            logger.info(`[getUserOrders] Successfully fetched ${orders.length} orders for user: ${targetUid}`);
            return { orders };

        } catch (error: any) {
            // 5. Error Handling
            logger.error(`[getUserOrders] Database query failed for user ${targetUid}:`, error);
            // This error often indicates a missing Firestore index. Check the emulator logs for a link to create it.
            throw new HttpsError(
                'internal',
                'An error occurred while fetching the orders. This might be due to a missing database index.',
                error.message
            );
        }
    }
);
