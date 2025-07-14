import { db } from '@/firebase/server';

export async function getSupportTickets() {
  // "offene Tickets" bedeutet wahrscheinlich Chats, die menschliche Aufmerksamkeit erfordern.
  const snapshot = await db.collection('supportChats').where('status', '==', 'human').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
