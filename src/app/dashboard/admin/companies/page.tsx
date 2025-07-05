import { db } from '@/firebase/server';
import { CompaniesDataTable } from './[id]/components/companies-data-table';
import { columns } from './[id]/components/columns';

// Definiert die Datenstruktur, die wir an den Client übergeben
export type CompanyData = {
    id: string; // UID
    companyName: string;
    email: string;
    createdAt: string; // ISO-String-Datum
    stripeAccountId: string | null;
};

async function getCompanies() {
    try {
        // Wir fragen die 'users'-Collection nach user_type 'firma' ab, um die Basisliste zu erhalten.
        const usersSnapshot = await db.collection('users').where('user_type', '==', 'firma').get();

        const companyPromises = usersSnapshot.docs.map(async (userDoc) => {
            const userData = userDoc.data();
            // Holen Sie das zugehörige Dokument aus der 'companies'-Collection.
            const companyDoc = await db.collection('companies').doc(userDoc.id).get();
            const companyData = companyDoc.exists ? companyDoc.data() : {};

            // Behandeln Sie den Firestore-Zeitstempel sicher.
            const createdAtTimestamp = userData?.createdAt;
            const createdAtString = (createdAtTimestamp && typeof createdAtTimestamp.toDate === 'function')
                ? createdAtTimestamp.toDate().toISOString()
                : new Date(0).toISOString(); // Fallback auf Epoche, wenn Datum fehlt

            return {
                id: userDoc.id,
                companyName: companyData?.companyName || userData?.companyName || 'N/A',
                email: userData?.email || 'N/A',
                createdAt: createdAtString,
                stripeAccountId: companyData?.stripeAccountId || userData?.stripeAccountId || null,
            };
        });

        // Führen Sie alle Datenabruf-Promises gleichzeitig aus.
        return Promise.all(companyPromises);
    } catch (error) {
        console.error("Fehler beim Abrufen der Firmen:", error);
        return []; // Leeres Array im Fehlerfall zurückgeben
    }
}

export default async function CompaniesPage() {
    const companies = await getCompanies();

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Firmen-Accounts</h1>
            <p className="text-gray-600 mb-6">
                Verwalte alle registrierten Firmen-Accounts auf Tasko.
            </p>
            <CompaniesDataTable columns={columns} data={companies} />
        </div>
    );
}