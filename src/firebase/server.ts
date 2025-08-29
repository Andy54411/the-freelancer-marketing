import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { AppOptions } from 'firebase-admin/app';
import { readFileSync, existsSync } from 'fs';

// Better build time detection
const isBuildTime =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  (process.env.NODE_ENV === 'production' && !process.env.VERCEL) ||
  typeof window !== 'undefined';

let db: ReturnType<typeof getFirestore> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

// Only initialize Firebase Admin SDK if not in build time
if (!isBuildTime && !admin.apps.length) {
  try {
    const options: AppOptions = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tilvo-f142f',
      storageBucket: 'tilvo-f142f.firebasestorage.app',
      databaseURL:
        process.env.FIREBASE_DATABASE_URL ||
        'https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app',
    };

    let credentialSet = false;

    // 1. Priorität: FIREBASE_SERVICE_ACCOUNT_KEY (für Vercel Production)
    const firebaseServiceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (firebaseServiceAccountKey && firebaseServiceAccountKey.trim() && !credentialSet) {
      try {
        console.log('Verwende FIREBASE_SERVICE_ACCOUNT_KEY für Credentials...');
        // Sehr robuste Bereinigung für problematische Vercel Environment Variables
        let cleanedKey = firebaseServiceAccountKey.trim();

        // Entferne äußere Anführungszeichen falls vorhanden
        if (cleanedKey.startsWith('"') && cleanedKey.endsWith('"')) {
          cleanedKey = cleanedKey.slice(1, -1);
        }
        if (cleanedKey.startsWith("'") && cleanedKey.endsWith("'")) {
          cleanedKey = cleanedKey.slice(1, -1);
        }

        // Ersetze alle escaped Zeichen
        cleanedKey = cleanedKey.replace(/\\n/g, '\n');
        cleanedKey = cleanedKey.replace(/\\r/g, '\r');
        cleanedKey = cleanedKey.replace(/\\t/g, '\t');
        cleanedKey = cleanedKey.replace(/\\"/g, '"');
        cleanedKey = cleanedKey.replace(/\\'/g, "'");
        cleanedKey = cleanedKey.replace(/\\\\/g, '\\');

        // Entferne ALLE problematischen Steuerzeichen (ASCII 0-31 außer erlaubten)
        // Erlaubt: \n (10), \r (13), \t (9)
        cleanedKey = cleanedKey.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

        // Zusätzliche Bereinigung: Entferne unsichtbare Unicode-Zeichen
        cleanedKey = cleanedKey.replace(/[\u200B-\u200D\uFEFF]/g, '');

        console.log('JSON-String bereinigt, versuche zu parsen...');
        const serviceAccount = JSON.parse(cleanedKey);

        // Validiere, dass es sich um ein gültiges Service Account Objekt handelt
        if (serviceAccount.type === 'service_account' && serviceAccount.project_id) {
          options.credential = admin.credential.cert(serviceAccount);
          credentialSet = true;
          console.log(
            '✅ Firebase Credentials erfolgreich aus FIREBASE_SERVICE_ACCOUNT_KEY geladen'
          );
        } else {
          console.warn('FIREBASE_SERVICE_ACCOUNT_KEY enthält kein gültiges Service Account Format');
        }
      } catch (jsonError: any) {
        console.error('Fehler beim Parsen von FIREBASE_SERVICE_ACCOUNT_KEY:', jsonError.message);
        console.log('Fallback zur lokalen Service Account Datei...');
      }
    } else if (firebaseServiceAccountKey && !firebaseServiceAccountKey.trim()) {
      console.log('FIREBASE_SERVICE_ACCOUNT_KEY ist leer, verwende Fallback-Methoden...');
    }

    // 2. Fallback: GOOGLE_APPLICATION_CREDENTIALS (nur Environment Variables)
    const googleAppCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (googleAppCredentials && googleAppCredentials.trim() && !credentialSet) {
      try {
        console.log('Versuche GOOGLE_APPLICATION_CREDENTIALS zu verwenden...');
        const cleanedCredentials = googleAppCredentials.trim();

        // Prüfe ob es ein Dateipfad ist (beginnt mit / oder enthält .json)
        if (cleanedCredentials.startsWith('/') || cleanedCredentials.includes('.json')) {
          console.log('Verwende Credential-Datei:', cleanedCredentials);
          const serviceAccountJson = readFileSync(cleanedCredentials, 'utf8');
          const serviceAccount = JSON.parse(serviceAccountJson);

          if (serviceAccount.type === 'service_account' && serviceAccount.project_id) {
            options.credential = admin.credential.cert(serviceAccount);
            credentialSet = true;
          } else {
            console.error('GOOGLE_APPLICATION_CREDENTIALS Datei hat ungültiges Format');
          }
        } else {
          // Behandle als JSON-String
          console.log('Verwende Credential-JSON-String...');
          const cleanedJson = cleanedCredentials.replace(/\\n/g, '\n');
          const serviceAccount = JSON.parse(cleanedJson);

          if (serviceAccount.type === 'service_account' && serviceAccount.project_id) {
            options.credential = admin.credential.cert(serviceAccount);
            credentialSet = true;
          } else {
            console.error('GOOGLE_APPLICATION_CREDENTIALS JSON hat ungültiges Format');
          }
        }

        if (credentialSet) {
          console.log(
            '✅ Firebase Credentials erfolgreich aus GOOGLE_APPLICATION_CREDENTIALS geladen'
          );
        }
      } catch (jsonError: any) {
        console.error('Fehler beim Parsen von GOOGLE_APPLICATION_CREDENTIALS:', jsonError.message);
      }
    }

    // WICHTIG: Wenn keine Credentials gesetzt sind, FEHLER werfen (aber nur zur Laufzeit)
    if (!credentialSet && !isBuildTime) {
      const errorMsg =
        'Firebase Credentials nicht verfügbar - FIREBASE_SERVICE_ACCOUNT_KEY, lokale service-account.json oder GOOGLE_APPLICATION_CREDENTIALS erforderlich.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    admin.initializeApp(options);

    // Initialize instances after successful app initialization
    db = getFirestore();
    auth = getAuth();

    // Logging für Emulator-Verbindungen in der lokalen Entwicklung
    if (process.env.NODE_ENV === 'development') {
      if (process.env.FIRESTORE_EMULATOR_HOST) {
        console.log('🔥 Firestore Emulator verbunden:', process.env.FIRESTORE_EMULATOR_HOST);
      }

      if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
        console.log('🔐 Auth Emulator verbunden:', process.env.FIREBASE_AUTH_EMULATOR_HOST);
      }

      if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
        console.log('📦 Storage Emulator verbunden:', process.env.FIREBASE_STORAGE_EMULATOR_HOST);
      }
    }
  } catch (error: any) {
    console.error('Firebase Admin SDK Initialisierungsfehler:', error.message);
    // In production, we should not throw during build time
    if (!isBuildTime) {
      throw new Error(
        'Initialisierung des Firebase Admin SDK fehlgeschlagen. Überprüfen Sie die Server-Logs für Details.'
      );
    }
  }
}

export { db, auth, admin };
