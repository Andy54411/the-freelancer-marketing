import { db } from '@/firebase/server';

export async function getSupportTickets() {
    const snapshot = await db.collection('supportTickets').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
