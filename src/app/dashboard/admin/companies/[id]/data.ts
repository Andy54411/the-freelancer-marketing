import { db, admin } from '@/firebase/server';
import type { CompanyDetailData } from './types';
import type { File } from '@google-cloud/storage';

async function listUserDocuments(companyId: string): Promise<{ files: { name: string; url: string }[] }> {
    try {
        const isEmulator = !!process.env.FIREBASE_STORAGE_EMULATOR_HOST;
        console.log(
            `[data.ts] 1. listUserDocuments: Starte für ID ${companyId}. Verbinde mit ${isEmulator ? `EMULATOR (${process.env.FIREBASE_STORAGE_EMULATOR_HOST})` : 'LIVE Storage'
            }`
        );
        const bucket = admin.storage().bucket();

        // DIAGNOSTISCHER SCHRITT: Alle Dateien im Bucket auflisten, um die Verbindung zu prüfen.
        const [allFiles] = await bucket.getFiles();
        console.log(`[data.ts] DIAGNOSTIC: Found ${allFiles.length} total files in bucket. Files:`, allFiles.map(f => f.name));

        const [files] = await bucket.getFiles({ prefix: `user_uploads/${companyId}/` });
        console.log(`[data.ts] 2. listUserDocuments: ${files.length} Datei(en) im Storage gefunden.`);

        const documents = await Promise.all(
            files.map(async (file: File) => {
                if (file.name.endsWith('/')) return null;
                const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
                return { name: file.name, url };
            })
        );

        console.log(`[data.ts] 3. listUserDocuments: Signed URLs erfolgreich generiert.`);
        return { files: documents.filter((doc): doc is { name: string; url: string } => doc !== null) };
    } catch (e: unknown) {
        // Verbessertes Error-Logging, um nicht-standardmäßige Fehlerobjekte zu inspizieren.
        const error = e as any;
        console.error(`[data.ts] Fehler beim Auflisten der Storage-Dokumente für ID ${companyId}.`);
        console.error(`[data.ts] Error Message: ${error.message || 'Keine Nachricht verfügbar'}`);
        console.error(`[data.ts] Error Code: ${error.code || 'Kein Code verfügbar'}`);
        console.error(`[data.ts] Error Stack: ${error.stack || 'Kein Stack verfügbar'}`);
        console.error(`[data.ts] Full Error Object:`, error);
        // Im Fehlerfall ein leeres Array zurückgeben, damit die Seite nicht abstürzt.
        return { files: [] };
    }
}

export async function getCompanyDetails(companyId: string): Promise<CompanyDetailData | null> {
    try {
        console.log(`[data.ts] A. getCompanyDetails: Starte Datenabruf für ID ${companyId}`);
        const userDocRef = db.collection('users').doc(companyId);
        const companyDocRef = db.collection('companies').doc(companyId);

        const [userDoc, companyDoc, documentsResult] = await Promise.all([
            userDocRef.get(),
            companyDocRef.get(),
            listUserDocuments(companyId),
        ]);
        console.log(`[data.ts] B. getCompanyDetails: Parallele Abfragen (User, Company, Docs) abgeschlossen.`);

        if (!userDoc.exists) {
            console.warn(`[data.ts] C. getCompanyDetails: User mit ID ${companyId} nicht in Firestore gefunden.`);
            return null;
        }
        console.log(`[data.ts] C. getCompanyDetails: User-Dokument gefunden.`);

        const userData = userDoc.data()!;
        const companyData = companyDoc.exists ? companyDoc.data()! : {};

        const combinedDataRaw: { [key: string]: any } = { ...userData, ...companyData, id: companyId, documents: documentsResult.files };

        console.log(`[data.ts] D. getCompanyDetails: Daten werden serialisiert...`);
        const serializableData: { [key: string]: any } = {};
        for (const key in combinedDataRaw) {
            const value = combinedDataRaw[key];
            if (value && typeof value.toDate === 'function') {
                serializableData[key] = value.toDate().toISOString();
            } else {
                serializableData[key] = value;
            }
        }
        console.log(`[data.ts] E. getCompanyDetails: Serialisierung abgeschlossen. Daten werden zurückgegeben.`);
        return serializableData as CompanyDetailData;
    } catch (error) {
        console.error(`[data.ts] Schwerwiegender Fehler in getCompanyDetails für ID ${companyId}:`, error);
        return null;
    }
}