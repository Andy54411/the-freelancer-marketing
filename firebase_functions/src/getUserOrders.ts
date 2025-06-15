// /Users/andystaudinger/Tasko/firebase_functions/src/getUserOrders.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger as loggerV2 } from 'firebase-functions/v2';
import { getDb } from './helpers'; // Importiere getDb aus deinen Helfern

// Interface für die Auftragsdaten, wie sie in Firestore gespeichert sind
// und wie sie das Frontend erwartet (ggf. anpassen)
interface OrderData {
    id: string; // Firestore document ID
    serviceTitle: string;
    serviceImageUrl?: string;
    freelancerName: string; // Annahme: Ist im Auftragsdokument gespeichert
    freelancerAvatarUrl?: string; // Annahme: Ist im Auftragsdokument gespeichert
    projectName?: string;
    orderedBy: string; // UID des Bestellers (im Frontend) / customerFirebaseUid (in Firestore)
    orderDate: FirebaseFirestore.Timestamp | string; // Firestore Timestamp oder ISO String
    priceInCents: number;
    status: 'AKTIV' | 'ABGESCHLOSSEN' | 'STORNIERT' | 'FEHLENDE DETAILS' | 'IN BEARBEITUNG' | 'zahlung_erhalten_clearing';
    freelancerId: string;
    projectId?: string;
    currency?: string;
    // Füge hier alle Felder hinzu, die deine Auftragsdokumente enthalten und die das Frontend benötigt
    // z.B. Felder aus dem tempJobDraftData, die in auftragData übernommen wurden
    beschreibung?: string;
    jobPostalCode?: string;
    // ... weitere Felder
}

export const getUserOrders = onCall<{ userId: string }, Promise<{ orders: OrderData[] }>>(
    async (request) => {
        loggerV2.info(`[getUserOrders] Aufgerufen für User: ${request.data.userId}`, { structuredData: true });

        if (!request.auth) {
            loggerV2.error("[getUserOrders] Nicht authentifizierter Aufruf.");
            throw new HttpsError('unauthenticated', 'Die Funktion muss authentifiziert aufgerufen werden.');
        }
        if (!request.data.userId) {
            loggerV2.error("[getUserOrders] Fehlender Parameter: userId.");
            throw new HttpsError('invalid-argument', 'Die Funktion muss mit dem Parameter "userId" aufgerufen werden.');
        }

        // Sicherheitsüberprüfung: Derzeit darf jeder authentifizierte Benutzer die Aufträge jedes Benutzers abrufen.
        // Im Frontend wird geprüft, ob request.auth.uid === request.data.userId.
        // Für eine strengere serverseitige Prüfung könnte man hier context.auth.uid === data.userId erzwingen.

        const db = getDb();
        const ordersSnapshot = await db.collection('auftraege') // Deine Auftrags-Collection
            .where('customerFirebaseUid', '==', request.data.userId) // Filtere nach der UID des Kunden
            .orderBy('createdAt', 'desc') // Neueste Aufträge zuerst (angenommen, 'createdAt' ist ein Timestamp)
            .get();

        const orders: OrderData[] = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderData));
        loggerV2.info(`[getUserOrders] ${orders.length} Aufträge für User ${request.data.userId} gefunden.`);
        return { orders };
    }
);