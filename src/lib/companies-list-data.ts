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
export async function getCompaniesData(): Promise<CompanyListData[]> {
  const companiesSnapshot = await db.collection('companies').get();

  if (companiesSnapshot.empty) {
    return [];
  }

  return companiesSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      companyName: data.companyName || 'Unbenanntes Unternehmen',
      email: data.ownerEmail || data.email || '',
      createdAt:
        data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : new Date().toISOString(),
      stripeAccountId: data.stripeAccountId || null,
    };
  });
}
