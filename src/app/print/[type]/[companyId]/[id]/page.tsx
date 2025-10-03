import { notFound } from 'next/navigation';
import { db } from '@/firebase/server';
import { PrintClient } from '../../[id]/PrintClient';


// Server Component - lädt Daten serverseitig mit companyId
export default async function PrintPage({
  params,
}: {
  params: Promise<{ type: string; companyId: string; id: string }>;
}) {
  const { type, companyId, id } = await params;

  // Bestimme Collection basierend auf Typ
  let collectionName = 'invoices';
  if (type === 'quote') collectionName = 'quotes';
  if (type === 'reminder') collectionName = 'reminders';

  try {
    // Verwende Firebase Admin Firestore (serverseitig, umgeht Auth-Probleme)
    if (!db) {
      console.error('Firebase Admin nicht verfügbar');
      notFound();
    }
    
    console.log(`🔍 Lade Dokument: companies/${companyId}/${collectionName}/${id}`);
    
    // CRITICAL FIX: Lade Dokument direkt aus der Subcollection mit companyId
    const docRef = db
      .collection('companies')
      .doc(companyId)
      .collection(collectionName)
      .doc(id);
    
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.error(`❌ Dokument nicht gefunden: companies/${companyId}/${collectionName}/${id}`);
      notFound();
    }

    console.log('✅ Dokument gefunden!');

    const documentData: any = {
      id: docSnap.id,
      ...docSnap.data(),
    };

    // 🔥 CRITICAL: Lade Company-Daten und enriche das Dokument GENAU wie im SendDocumentModal
    console.log(`🔍 Lade Company-Daten: companies/${companyId}`);
    const companyRef = db.collection('companies').doc(companyId);
    const companySnap = await companyRef.get();
    
    let enrichedData: any = documentData;
    
    if (companySnap.exists) {
      const companyData: any = companySnap.data();
      console.log('✅ Company-Daten gefunden!');
      
      // 🎯 EXACT COPY vom SendDocumentModal enrichment logic
      enrichedData = {
        ...documentData,
        // Company-Basisdaten (EXACT wie SendDocumentModal!)
        companyName: companyData?.companyName || companyData?.name || documentData.companyName,
        companyEmail: companyData?.email || documentData.companyEmail || '',
        companyPhone: companyData?.phoneNumber || companyData?.companyPhoneNumber || documentData.companyPhone || '',
        companyWebsite: companyData?.website || companyData?.companyWebsite || documentData.companyWebsite || '',
        companyAddress: (() => {
          const address = [
            [companyData?.companyStreet?.replace(/\s+/g, ' ').trim(), companyData?.companyHouseNumber]
              .filter(Boolean)
              .join(' '),
            [companyData?.companyPostalCode, companyData?.companyCity].filter(Boolean).join(' '),
            companyData?.companyCountry,
          ]
            .filter(Boolean)
            .join('\n');
          return address || documentData.companyAddress || '';
        })(),
        companyVatId: companyData?.vatId || documentData.companyVatId || '',
        companyTaxNumber: companyData?.taxNumber || documentData.companyTaxNumber || '',
        companyLogo: companyData?.profilePictureURL || companyData?.profilePictureFirebaseUrl || companyData?.companyLogo || documentData.companyLogo || '',
        
        // Zusätzliche Felder für Template-Kompatibilität
        companyId: companyId,
        companyStreet: companyData?.companyStreet || companyData?.step2?.street,
        companyHouseNumber: companyData?.companyHouseNumber || companyData?.step2?.houseNumber,
        companyPostalCode: companyData?.companyPostalCode || companyData?.step2?.postalCode,
        companyCity: companyData?.companyCity || companyData?.step2?.city,
        phoneNumber: companyData?.phoneNumber || companyData?.step1?.phoneNumber,
        contactEmail: companyData?.email || companyData?.step1?.email,
        companyWebsiteForBackend: companyData?.website || companyData?.step4?.website,
        
        // Steuer- und Rechtsdaten
        vatId: companyData?.vatId || companyData?.step3?.vatId,
        taxNumber: companyData?.taxNumber || companyData?.step3?.taxNumber,
        legalForm: companyData?.legalForm || companyData?.step2?.legalForm,
        companySuffix: companyData?.step2?.companySuffix,
        registrationNumber: companyData?.registrationNumber || companyData?.step3?.registrationNumber,
        districtCourt: companyData?.districtCourt || companyData?.step3?.districtCourt,
        
        // Bankdaten - preserve existing if not in company
        bankDetails: companyData?.step4 ? {
          iban: companyData?.step4?.iban,
          bic: companyData?.step4?.bic,
          bankName: companyData?.step4?.bankName,
          accountHolder: companyData?.step4?.accountHolder || companyData?.companyName,
        } : documentData.bankDetails,
        
        // Company Settings für Template (ALLE steps!)
        step1: companyData?.step1,
        step2: companyData?.step2,
        step3: companyData?.step3,
        step4: companyData?.step4,
      };
    } else {
      console.warn('⚠️ Company-Daten nicht gefunden - verwende nur Dokument-Daten');
    }

    // Konvertiere Firestore Timestamps zu ISO Strings
    const serializedData = JSON.parse(
      JSON.stringify(enrichedData, (key, value) => {
        if (value && typeof value === 'object' && value._seconds) {
          // Firestore Timestamp
          return new Date(value._seconds * 1000).toISOString();
        }
        return value;
      })
    );

    return <PrintClient documentData={serializedData} />;
  } catch (error) {
    console.error('Fehler beim Laden des Dokuments:', error);
    notFound();
  }
}
