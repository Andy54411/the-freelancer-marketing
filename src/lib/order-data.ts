import { db } from '@/firebase/server';
import { DocumentData } from 'firebase-admin/firestore';

export async function getAllOrders() {
    const ordersSnapshot = await db.collection('auftraege').get();
    const orders = ordersSnapshot.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() }));
    return orders;
}
