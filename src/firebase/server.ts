import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { AppOptions } from 'firebase-admin/app';

// --- WORKAROUND: EMULATOR-HOSTS HARDCODIEREN ---
// Da das Laden aus .env.local fehlschlägt, setzen wir die Umgebungsvariablen hier
// manuell für den Entwicklungsmodus. Dies ist nicht ideal, aber es wird Sie
// entblocken und beweist, dass das Problem auf das Laden der .env-Datei beschränkt ist.
if (process.env.NODE_ENV === 'development') {
    if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
        console.log('\x1b[33m%s\x1b[0m', '[Firebase Server] WARNUNG: .env.local wird nicht geladen. Verwende hardcodierte Emulator-Hosts als Workaround.');
        // Setze die Variablen für den Rest des Prozesses manuell
        process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
        process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
        process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';
    }
    console.log(`\x1b[32m%s\x1b[0m`, `[Firebase Server] Verbinde mit Firestore Emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);
    console.log(`\x1b[32m%s\x1b[0m`, `[Firebase Server] Verbinde mit Auth Emulator: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
}

if (!admin.apps.length) {
    try {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        const options: AppOptions = {
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tilvo-f142f',
            storageBucket: 'tilvo-f142f.firebasestorage.app', // Corrected to match project config
        };

        // For production (e.g., Vercel), use the service account key from env vars.
        // For local dev, the Admin SDK can use Application Default Credentials.
        if (serviceAccountKey) {
            console.log('[Firebase Server] Initialisiere mit Service Account aus der Umgebungsvariable.');
            options.credential = admin.credential.cert(JSON.parse(serviceAccountKey));
        } else {
            console.log('[Firebase Server] Initialisiere mit Application Default Credentials.');
            // This uses GOOGLE_APPLICATION_CREDENTIALS locally or the default service account in a cloud environment.
            options.credential = admin.credential.applicationDefault();
        }

        admin.initializeApp(options);
        console.log('[Firebase Server] Admin SDK erfolgreich initialisiert.');

        if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
            console.log(`[Firebase Server] Storage Emulator erkannt und wird verwendet: ${process.env.FIREBASE_STORAGE_EMULATOR_HOST}`);
        }
    } catch (error: any) {
        let errorMessage = 'Initialisierung des Firebase Admin SDK fehlgeschlagen. Überprüfen Sie die Server-Logs für Details.';
        // Check specifically for a JSON parsing error
        if (error instanceof SyntaxError && error.message.includes('JSON')) {
            console.error('[Firebase Server] KRITISCH: Parsen von FIREBASE_SERVICE_ACCOUNT_KEY fehlgeschlagen. Die Umgebungsvariable ist wahrscheinlich eine fehlerhafte JSON-Zeichenkette.');
            console.error('[Firebase Server] TIPP: Stellen Sie sicher, dass der gesamte Inhalt der JSON-Schlüsseldatei korrekt als eine einzige Zeile kopiert wurde.');
            errorMessage = 'Ungültige FIREBASE_SERVICE_ACCOUNT_KEY Umgebungsvariable. Der Server kann nicht gestartet werden.';
        } else {
            console.error('[Firebase Server] KRITISCH: Initialisierung des Firebase Admin SDK fehlgeschlagen.', error);
        }
        throw new Error(errorMessage);
    }
}

const db = getFirestore();
const auth = getAuth();

export { db, auth, admin };