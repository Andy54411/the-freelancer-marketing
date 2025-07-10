import { db } from '@/firebase/server';
import { DocumentData, Timestamp } from 'firebase-admin/firestore';

function serializeFirestoreData(data: any): any {
    if (data === null || data === undefined) {
        return data;
    }

    if (data instanceof Timestamp) {
        return data.toDate().toISOString();
    }

    if (Array.isArray(data)) {
        return data.map(serializeFirestoreData);
    }

    if (typeof data === 'object') {
        const serialized: any = {};
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                serialized[key] = serializeFirestoreData(data[key]);
            }
        }
        return serialized;
    }

    return data;
}

export async function getAllOrders() {
    const ordersSnapshot = await db.collection('auftraege').get();

    // Sammle alle einzigartigen Kunden-UIDs
    const customerUids = new Set<string>();
    const orders = ordersSnapshot.docs.map((doc: DocumentData) => {
        const data = doc.data();
        const serializedData = serializeFirestoreData(data);

        // Sammle Kunden-UID für Batch-Loading
        const customerUid = data.customerFirebaseUid || data.kundeId || data.userId;
        if (customerUid) {
            customerUids.add(customerUid);
        }

        return { id: doc.id, customerUid, ...serializedData };
    });

    // Lade alle Kundendaten in einem Batch
    const customerData: { [uid: string]: any } = {};
    if (customerUids.size > 0) {
        const userPromises = Array.from(customerUids).map(async (uid) => {
            try {
                const userDoc = await db.collection('users').doc(uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    return { uid, data: userData };
                }
            } catch (error) {
                console.error(`Fehler beim Laden von Benutzer ${uid}:`, error);
            }
            return { uid, data: null };
        });

        const userResults = await Promise.all(userPromises);
        userResults.forEach(result => {
            if (result.data) {
                customerData[result.uid] = result.data;
            }
        });
    }

    // Füge Kundennamen zu den Aufträgen hinzu
    const enrichedOrders = orders.map(order => {
        const customer = customerData[order.customerUid];
        let customerName = 'Unbekannt';

        if (customer) {
            console.log('Debug customer data for UID', order.customerUid, ':', JSON.stringify(customer, null, 2));

            // Versuche verschiedene Feldkombinationen
            const firstName = customer.firstName || customer.firstname || customer.vorname || '';
            const lastName = customer.lastName || customer.lastname || customer.nachname || '';

            if (firstName.trim() && lastName.trim()) {
                customerName = `${firstName.trim()} ${lastName.trim()}`;
            } else if (firstName.trim()) {
                customerName = firstName.trim();
            } else if (lastName.trim()) {
                customerName = lastName.trim();
            } else if (customer.displayName) {
                customerName = customer.displayName;
            } else if (customer.email) {
                customerName = customer.email;
            } else {
                customerName = `Kunde ${order.customerUid?.substring(0, 8) || 'unbekannt'}`;
            }
        }

        return {
            ...order,
            customerName,
            customerEmail: customer?.email || 'Unbekannt'
        };
    });

    return enrichedOrders;
}
