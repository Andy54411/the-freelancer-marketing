import type { Firestore } from "firebase-admin/firestore";

export interface OrderData {
    id: string;
    customerName?: string;
    customerEmail?: string;
    customerUid?: string;
    status?: string;
    description?: string;
    selectedCategory?: string;
    selectedSubcategory?: string;
    providerName?: string;
    jobDateFrom?: string;
    jobDateTo?: string;
    jobTimePreference?: string;
    jobDurationString?: string;
    jobTotalCalculatedHours?: number;
    jobCalculatedPriceInCents?: number;
    totalAmountPaidByBuyer?: number;
    jobCity?: string;
    jobPostalCode?: string;
    createdAt?: string;
    paidAt?: string;
    clearingPeriodEndsAt?: string;
    paymentIntentId?: string;
    [key: string]: any;
}

/**
 * Extrahiert Auftragsnummern aus einem Text
 * Sucht nach Mustern wie "Auftrag #ABC123" oder "#ABC123"
 */
export function extractOrderIds(text: string): string[] {
    const orderIdPattern = /#([A-Za-z0-9]+)/g;
    const matches = text.matchAll(orderIdPattern);
    return Array.from(matches).map(match => match[1]);
}

/**
 * Ruft Auftragsdaten aus Firestore ab
 */
export async function getOrderData(
    db: Pick<Firestore, 'collection'>,
    orderId: string,
    logError: (message: string, ...args: any[]) => void = console.error
): Promise<OrderData | null> {
    try {
        const orderDoc = await db.collection('auftraege').doc(orderId).get();
        if (!orderDoc.exists) {
            logError(`Auftrag ${orderId} nicht gefunden`);
            return null;
        }

        const orderData = { id: orderId, ...orderDoc.data() } as OrderData;

        // Sensitive Daten für Chat-Kontext entfernen
        const chatSafeOrder = {
            id: orderData.id,
            customerName: orderData.customerName,
            customerEmail: orderData.customerEmail,
            status: orderData.status,
            description: orderData.description,
            selectedCategory: orderData.selectedCategory,
            selectedSubcategory: orderData.selectedSubcategory,
            providerName: orderData.providerName,
            jobDateFrom: orderData.jobDateFrom,
            jobDateTo: orderData.jobDateTo,
            jobTimePreference: orderData.jobTimePreference,
            jobDurationString: orderData.jobDurationString,
            jobTotalCalculatedHours: orderData.jobTotalCalculatedHours,
            priceInEuro: orderData.jobCalculatedPriceInCents
                ? (orderData.jobCalculatedPriceInCents / 100).toFixed(2)
                : orderData.totalAmountPaidByBuyer
                    ? (orderData.totalAmountPaidByBuyer / 100).toFixed(2)
                    : 'Nicht angegeben',
            jobCity: orderData.jobCity,
            jobPostalCode: orderData.jobPostalCode,
            createdAt: orderData.createdAt,
            paidAt: orderData.paidAt,
            clearingPeriodEndsAt: orderData.clearingPeriodEndsAt,
            paymentIntentId: orderData.paymentIntentId ? 'Vorhanden' : 'Nicht vorhanden'
        };

        return chatSafeOrder;
    } catch (error) {
        logError(`Fehler beim Abrufen von Auftrag ${orderId}:`, error);
        return null;
    }
}

/**
 * Ruft mehrere Aufträge ab
 */
export async function getMultipleOrders(
    db: Pick<Firestore, 'collection'>,
    orderIds: string[],
    logError: (message: string, ...args: any[]) => void = console.error
): Promise<OrderData[]> {
    const orders: OrderData[] = [];

    for (const orderId of orderIds) {
        const order = await getOrderData(db, orderId, logError);
        if (order) {
            orders.push(order);
        }
    }

    return orders;
}

/**
 * Formatiert Auftragsdaten für den Chat-Kontext
 */
export function formatOrderForChat(order: OrderData): string {
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Nicht angegeben';
        try {
            return new Date(dateString).toLocaleDateString('de-DE');
        } catch {
            return dateString;
        }
    };

    const formatStatus = (status?: string) => {
        const statusMap: { [key: string]: string } = {
            'zahlung_erhalten_clearing': 'Zahlung erhalten - Clearing',
            'pending': 'Ausstehend',
            'cancelled': 'Storniert',
            'completed': 'Abgeschlossen',
            'confirmed': 'Bestätigt',
            'in_progress': 'In Bearbeitung',
            'draft': 'Entwurf'
        };
        return statusMap[status?.toLowerCase() || ''] || status || 'Unbekannt';
    };

    return `
**Auftrag #${order.id}**
- Kunde: ${order.customerName || 'Unbekannt'}
- E-Mail: ${order.customerEmail || 'Nicht verfügbar'}
- Status: ${formatStatus(order.status)}
- Beschreibung: ${order.description || 'Keine Beschreibung'}
- Kategorie: ${order.selectedCategory || 'Nicht angegeben'}
- Service: ${order.selectedSubcategory || 'Nicht angegeben'}
- Anbieter: ${order.providerName || 'Nicht angegeben'}
- Preis: ${order.priceInEuro} €
- Zeitraum: ${formatDate(order.jobDateFrom)} bis ${formatDate(order.jobDateTo)}
- Uhrzeit: ${order.jobTimePreference || 'Nicht angegeben'}
- Dauer: ${order.jobDurationString || 'Nicht angegeben'} Stunden
- Ort: ${order.jobCity || 'Nicht angegeben'}${order.jobPostalCode ? ` (${order.jobPostalCode})` : ''}
- Erstellt am: ${formatDate(order.createdAt)}
- Bezahlt am: ${formatDate(order.paidAt)}
- Clearing-Ende: ${formatDate(order.clearingPeriodEndsAt)}
- Zahlung: ${order.paymentIntentId}
`.trim();
}
