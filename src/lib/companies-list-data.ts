import { db } from '@/firebase/server';
import { Timestamp } from 'firebase-admin/firestore';

export interface CompanyListData {
  id: string;
  companyName: string;
  email: string;
  createdAt: string; // ISO-String-Datum
  stripeAccountId: string | null;
}

/**
 * Fetches a list of all company accounts from Firestore.
 * This is the server-side equivalent of the `/api/companies` route.
 */
export async function getAllCompanies(): Promise<CompanyListData[]> {
  const usersRef = db.collection('users');
  const snapshot = await usersRef
    .where('user_type', '==', 'firma')
    .orderBy('createdAt', 'desc')
    .get();

  if (snapshot.empty) {
    return [];
  }

  const companiesPromises = snapshot.docs.map(async userDoc => {
    const userData = userDoc.data();
    const createdAt = userData.createdAt as Timestamp;

    return {
      id: userDoc.id,
      companyName: userData.companyName || 'Unbekanntes Unternehmen',
      email: userData.email || 'Keine E-Mail',
      createdAt: createdAt ? createdAt.toDate().toISOString() : new Date(0).toISOString(),
      stripeAccountId: userData.stripeAccountId || null,
    };
  });

  return Promise.all(companiesPromises);
}
