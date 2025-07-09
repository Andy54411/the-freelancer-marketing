import { db, admin } from '@/firebase/server';

export interface CompanyData {
    id: string;
    [key: string]: any;
}

export async function getAllCompanies() {
    try {
        const companiesSnapshot = await db.collection('companies').get();
        const companies = companiesSnapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() }));
        return companies;
    } catch (error) {
        // Logging mit Kontext für Debugging
        console.error('[getAllCompanies] Fehler beim Laden der Firmen:', {
            error,
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
        });
        throw error;
    }
}

export async function getCompanyData(id: string): Promise<CompanyData | null> {
    const userDocRef = db.collection('users').doc(id);
    const companyDocRef = db.collection('companies').doc(id);

    const [userDoc, companyDoc] = await Promise.all([userDocRef.get(), companyDocRef.get()]);

    if (!userDoc.exists) {
        return null;
    }

    const userData = userDoc.data() || {};
    const companyData = companyDoc.exists ? companyDoc.data() : {};

    const combinedData: { [key: string]: any } = { ...companyData, ...userData, id: userDoc.id };

    // Sanitize data for serialization (convert Timestamps)
    const sanitizedData: { [key: string]: any } = {};
    for (const key in combinedData) {
        const value = combinedData[key];
        if (value instanceof admin.firestore.Timestamp) {
            sanitizedData[key] = value.toDate().toISOString();
        } else {
            sanitizedData[key] = value;
        }
    }

    return sanitizedData as CompanyData;
}

/**
 * Ruft die IDs aller Firmen-Konten ab.
 * Diese Funktion wird für `generateStaticParams` verwendet, um Seiten zur Build-Zeit vorab zu generieren.
 * Ein Firmen-Konto wird durch `user_type === 'firma'` im 'users'-Dokument identifiziert.
 * @returns Ein Promise, das ein Array von Objekten mit der Firmen-ID auflöst.
 */
export async function getAllCompanyIds(): Promise<{ id: string }[]> {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('user_type', '==', 'firma').get();

    if (snapshot.empty) {
        return [];
    }

    return snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({ id: doc.id }));
}