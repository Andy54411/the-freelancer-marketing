import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { AppOptions } from 'firebase-admin/app';
import { readFileSync } from 'fs';

if (!admin.apps.length) {
  try {
    // WICHTIG: Entferne GOOGLE_APPLICATION_CREDENTIALS sofort, um zu verhindern,
    // dass Firebase es automatisch als Dateipfad interpretiert
    const originalGoogleAppCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (originalGoogleAppCredentials) {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      console.log('[Firebase Server] 🔒 GOOGLE_APPLICATION_CREDENTIALS präventiv entfernt.');
    }

    const options: AppOptions = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tilvo-f142f',
      storageBucket: 'tilvo-f142f.firebasestorage.app',
      databaseURL:
        process.env.FIREBASE_DATABASE_URL ||
        'https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app',
    };

    // VERCEL OPTIMIERTE CREDENTIAL HANDLING
    let credentialSet = false;

    // 1. Priorität: FIREBASE_SERVICE_ACCOUNT_KEY (für Vercel)
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

    // 2. Fallback: Verwende die ursprünglich gespeicherte GOOGLE_APPLICATION_CREDENTIALS als JSON-String ODER Dateipfad
    if (originalGoogleAppCredentials && !credentialSet) {
      try {
        console.log(
          '[Firebase Server] Verwende ursprünglich gespeicherte GOOGLE_APPLICATION_CREDENTIALS...'
        );

        // Prüfe ob es ein Dateipfad ist (beginnt mit / oder enthält .json)
        if (
          originalGoogleAppCredentials.startsWith('/') ||
          originalGoogleAppCredentials.includes('.json')
        ) {
          console.log(
            '[Firebase Server] GOOGLE_APPLICATION_CREDENTIALS ist ein Dateipfad:',
            originalGoogleAppCredentials
          );
          // Lade JSON aus Datei
          const serviceAccountJson = readFileSync(originalGoogleAppCredentials, 'utf8');
          const serviceAccount = JSON.parse(serviceAccountJson);
          options.credential = admin.credential.cert(serviceAccount);
          credentialSet = true;
          console.log('[Firebase Server] ✅ Service Account aus Datei erfolgreich geladen.');
        } else {
          // Behandle als JSON-String (für Vercel)
          console.log('[Firebase Server] GOOGLE_APPLICATION_CREDENTIALS ist JSON-String');
          const cleanedJson = originalGoogleAppCredentials.replace(/\\n/g, '\n');
          const serviceAccount = JSON.parse(cleanedJson);
          options.credential = admin.credential.cert(serviceAccount);
          credentialSet = true;
          console.log(
            '[Firebase Server] ✅ GOOGLE_APPLICATION_CREDENTIALS als JSON erfolgreich geladen.'
          );
        }
      } catch (jsonError: any) {
        console.warn(
          '[Firebase Server] ⚠️ GOOGLE_APPLICATION_CREDENTIALS Parse fehlgeschlagen:',
          jsonError.message
        );
        console.warn(
          '[Firebase Server] ⚠️ Credentials Inhalt (erste 100 Zeichen):',
          originalGoogleAppCredentials.substring(0, 100)
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
