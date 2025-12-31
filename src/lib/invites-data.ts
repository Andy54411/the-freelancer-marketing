import { db } from '@/firebase/server';
import { Timestamp } from 'firebase-admin/firestore';

export interface InviteCode {
  id: string;
  code: string;
  role: 'support' | 'master';
  createdAt: string; // Serialized as ISO string
  used: boolean;
  [key: string]: unknown;
}

/**
 * Fetches all unused invite codes from Firestore for the admin dashboard.
 */
export async function getUnusedInviteCodes(): Promise<InviteCode[]> {
  if (!db) {
    throw new Error('Datenbank nicht initialisiert');
  }

  const codesRef = db.collection('invite_codes');
  const snapshot = await codesRef.where('used', '==', false).orderBy('createdAt', 'desc').get();

  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs.map(doc => {
    const data = doc.data();
    const createdAt = data.createdAt as Timestamp;
    return {
      ...data,
      id: doc.id,
      createdAt: createdAt.toDate().toISOString(),
    } as InviteCode;
  });
}
