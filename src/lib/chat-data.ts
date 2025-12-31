import { db } from '@/firebase/server';
import { DocumentData } from 'firebase-admin/firestore';

export async function getAllChats() {
  if (!db) {
    throw new Error('Datenbank nicht initialisiert');
  }

  const chatsSnapshot = await db.collectionGroup('messages').get();
  const chats = chatsSnapshot.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() }));
  return chats;
}
