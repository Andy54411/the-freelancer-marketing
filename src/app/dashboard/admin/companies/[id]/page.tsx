import { notFound } from 'next/navigation';
import { CompanyDetailClientPage } from './components/CompanyDetailClientPage';
import { db } from '@/firebase/server';
import type { CompanyDetailData } from './types';

export const dynamic = 'force-dynamic';

// Vereinfachte getCompanyDetails-Funktion mit besserer Error-Behandlung
async function getCompanyDetails(companyId: string): Promise<CompanyDetailData | null> {
  try {
    console.log(`[Page] getCompanyDetails: Starting fetch for ID ${companyId}`);

    const userDocRef = db.collection('users').doc(companyId);
    const companyDocRef = db.collection('companies').doc(companyId);

    const [userDoc, companyDoc] = await Promise.all([userDocRef.get(), companyDocRef.get()]);

    console.log(
      `[Page] User doc exists: ${userDoc.exists}, Company doc exists: ${companyDoc.exists}`
    );

    // If neither document exists, return null
    if (!userDoc.exists && !companyDoc.exists) {
      console.warn(`[Page] No documents found for company ID ${companyId}`);
      return null;
    }

    const userData = userDoc.exists ? userDoc.data()! : {};
    const companyData = companyDoc.exists ? companyDoc.data()! : {};

    const combinedDataRaw: { [key: string]: any } = {
      ...userData,
      ...companyData,
      id: companyId,
      documents: [], // Skip storage documents for now to avoid errors
    };

    console.log(`[Page] Serializing data...`);
    const serializableData: { [key: string]: any } = {};
    for (const key in combinedDataRaw) {
      const value = combinedDataRaw[key];
      if (value && typeof value.toDate === 'function') {
        serializableData[key] = value.toDate().toISOString();
      } else {
        serializableData[key] = value;
      }
    }

    console.log(`[Page] Successfully fetched and serialized company data`);
    return serializableData as CompanyDetailData;
  } catch (error) {
    console.error(`[Page] Critical error in getCompanyDetails for ID ${companyId}:`, error);
    return null;
  }
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const companyDetails = await getCompanyDetails(id);
  if (!companyDetails) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Fehler beim Laden der Firmendaten</h1>
        <p className="text-gray-600">
          Firma mit ID {id} konnte nicht gefunden werden oder ein Server-Fehler ist aufgetreten.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Überprüfen Sie die Server-Logs für weitere Details oder kontaktieren Sie den
          Administrator.
        </p>
      </div>
    );
  }

  return <CompanyDetailClientPage data={companyDetails} />;
}
