import { db } from '@/firebase/server';

export async function getSupportTickets() {
  if (!db) {
    throw new Error('Datenbank nicht initialisiert');
  }

  // "offene Tickets" bedeutet wahrscheinlich Chats, die menschliche Aufmerksamkeit erfordern.
  const snapshot = await db.collection('supportChats').where('status', '==', 'human').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
