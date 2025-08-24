import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { AppOptions } from 'firebase-admin/app';

if (!admin.apps.length) {
  try {
    const options: AppOptions = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tilvo-f142f',
      storageBucket: 'tilvo-f142f.firebasestorage.app',
      databaseURL:
        process.env.FIREBASE_DATABASE_URL ||
        'https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app',
    };

    // ROBUST CREDENTIAL HANDLING für Vercel und lokale Entwicklung
    let credentialSet = false;

    // 1. Versuche zuerst FIREBASE_SERVICE_ACCOUNT_KEY (für Vercel optimiert)
    const firebaseServiceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (firebaseServiceAccountKey && !credentialSet) {
      try {
        console.log('[Firebase Server] Versuche FIREBASE_SERVICE_ACCOUNT_KEY...');
        const serviceAccount = JSON.parse(firebaseServiceAccountKey);
        options.credential = admin.credential.cert(serviceAccount);
        credentialSet = true;
        console.log('[Firebase Server] ✅ FIREBASE_SERVICE_ACCOUNT_KEY erfolgreich geladen.');
      } catch (jsonError: any) {
        console.warn(
          '[Firebase Server] ⚠️ FIREBASE_SERVICE_ACCOUNT_KEY JSON-Parse fehlgeschlagen:',
          jsonError.message
        );
      }
    }

    // 2. Fallback: GOOGLE_APPLICATION_CREDENTIALS als JSON-String (für Vercel)
    const googleAppCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (googleAppCredentials && !credentialSet) {
      // NIEMALS als Dateipfad verwenden in Vercel/Lambda - immer als JSON parsen
      try {
        console.log(
          '[Firebase Server] GOOGLE_APPLICATION_CREDENTIALS als JSON-String verarbeiten (Vercel-Modus)...'
        );
        // Bereinige escaped newlines und parse als JSON
        const cleanedJson = googleAppCredentials.replace(/\\n/g, '\n');
        const serviceAccount = JSON.parse(cleanedJson);
        options.credential = admin.credential.cert(serviceAccount);
        credentialSet = true;
        console.log(
          '[Firebase Server] ✅ GOOGLE_APPLICATION_CREDENTIALS als JSON erfolgreich geladen.'
        );

        // WICHTIG: Entferne die Umgebungsvariable nach dem Parsen, um zu verhindern,
        // dass Firebase sie automatisch als Dateipfad verwendet
        delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
        console.log(
          '[Firebase Server] 🔒 GOOGLE_APPLICATION_CREDENTIALS Umgebungsvariable entfernt.'
        );
      } catch (jsonError: any) {
        console.warn(
          '[Firebase Server] ⚠️ GOOGLE_APPLICATION_CREDENTIALS JSON-Parse fehlgeschlagen:',
          jsonError.message
        );
        console.warn(
          '[Firebase Server] ⚠️ Credentials Inhalt (erste 100 Zeichen):',
          googleAppCredentials.substring(0, 100)
        );
      }
    }

    // WICHTIG: Wenn keine Credentials gesetzt sind, FEHLER werfen (nie applicationDefault verwenden)
    if (!credentialSet) {
      const errorMsg =
        'Firebase Credentials nicht verfügbar - FIREBASE_SERVICE_ACCOUNT_KEY oder GOOGLE_APPLICATION_CREDENTIALS als JSON-String erforderlich.';
      console.error('[Firebase Server] ❌', errorMsg);
      throw new Error(errorMsg);
    }

    admin.initializeApp(options);
    console.log('[Firebase Server] Admin SDK erfolgreich initialisiert.');

    // Logging für Emulator-Verbindungen in der lokalen Entwicklung
    if (process.env.NODE_ENV === 'development') {
      if (process.env.FIRESTORE_EMULATOR_HOST)
        console.log(
          `\x1b[32m%s\x1b[0m`,
          `[Firebase Server] Verbinde mit Firestore Emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`
        );
      if (process.env.FIREBASE_AUTH_EMULATOR_HOST)
        console.log(
          `\x1b[32m%s\x1b[0m`,
          `[Firebase Server] Verbinde mit Auth Emulator: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`
        );
      if (process.env.FIREBASE_STORAGE_EMULATOR_HOST)
        console.log(
          `\x1b[32m%s\x1b[0m`,
          `[Firebase Server] Storage Emulator erkannt und wird verwendet: ${process.env.FIREBASE_STORAGE_EMULATOR_HOST}`
        );
    }
  } catch (error: any) {
    console.error(
      '[Firebase Server] KRITISCH: Initialisierung des Firebase Admin SDK fehlgeschlagen.',
      error
    );
    throw new Error(
      'Initialisierung des Firebase Admin SDK fehlgeschlagen. Überprüfen Sie die Server-Logs für Details.'
    );
  }
}

const db = getFirestore();
const auth = getAuth();

export { db, auth, admin };
