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

        const serviceAccount = JSON.parse(firebaseServiceAccountKey);
        options.credential = admin.credential.cert(serviceAccount);
        credentialSet = true;

      } catch (jsonError: any) {

      }
    }

    // 2. Fallback: Verwende die ursprünglich gespeicherte GOOGLE_APPLICATION_CREDENTIALS als JSON-String ODER Dateipfad
    if (originalGoogleAppCredentials && !credentialSet) {
      try {

        // Prüfe ob es ein Dateipfad ist (beginnt mit / oder enthält .json)
        if (
          originalGoogleAppCredentials.startsWith('/') ||
          originalGoogleAppCredentials.includes('.json')
        ) {

          // Lade JSON aus Datei
          const serviceAccountJson = readFileSync(originalGoogleAppCredentials, 'utf8');
          const serviceAccount = JSON.parse(serviceAccountJson);
          options.credential = admin.credential.cert(serviceAccount);
          credentialSet = true;

        } else {
          // Behandle als JSON-String (für Vercel)

          const cleanedJson = originalGoogleAppCredentials.replace(/\\n/g, '\n');
          const serviceAccount = JSON.parse(cleanedJson);
          options.credential = admin.credential.cert(serviceAccount);
          credentialSet = true;

        }
      } catch (jsonError: any) {

      }
    }

    // WICHTIG: Wenn keine Credentials gesetzt sind, FEHLER werfen (nie applicationDefault verwenden)
    if (!credentialSet) {
      const errorMsg =
        'Firebase Credentials nicht verfügbar - FIREBASE_SERVICE_ACCOUNT_KEY oder GOOGLE_APPLICATION_CREDENTIALS als JSON-String erforderlich.';

      throw new Error(errorMsg);
    }

    admin.initializeApp(options);

    // Logging für Emulator-Verbindungen in der lokalen Entwicklung
    if (process.env.NODE_ENV === 'development') {
      if (process.env.FIRESTORE_EMULATOR_HOST)

      if (process.env.FIREBASE_AUTH_EMULATOR_HOST)

      if (process.env.FIREBASE_STORAGE_EMULATOR_HOST)

    }
  } catch (error: any) {

    throw new Error(
      'Initialisierung des Firebase Admin SDK fehlgeschlagen. Überprüfen Sie die Server-Logs für Details.'
    );
  }
}

const db = getFirestore();
const auth = getAuth();

export { db, auth, admin };
