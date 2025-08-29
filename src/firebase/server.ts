import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { AppOptions } from 'firebase-admin/app';

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

        let serviceAccount;

        try {
          // Versuche zuerst Base64-Decoding (falls Base64-encoded)
          if (firebaseServiceAccountKey.match(/^[A-Za-z0-9+/=]+$/)) {
            console.log('Erkenne Base64-Format, dekodiere...');
            const decodedKey = Buffer.from(firebaseServiceAccountKey, 'base64').toString('utf-8');
            serviceAccount = JSON.parse(decodedKey);
          } else {
            // Normale JSON-String-Verarbeitung mit verbesserter Bereinigung
            let cleanedKey = firebaseServiceAccountKey.trim();

            // Entferne äußere Anführungszeichen
            if (cleanedKey.startsWith('"') && cleanedKey.endsWith('"')) {
              cleanedKey = cleanedKey.slice(1, -1);
            }
            if (cleanedKey.startsWith("'") && cleanedKey.endsWith("'")) {
              cleanedKey = cleanedKey.slice(1, -1);
            }

            // SOFORTIGE aggressive Zeichen-Bereinigung um Vercel-Logs sauber zu halten
            console.log('Führe sofortige aggressive Zeichen-Bereinigung durch...');
            let ultraCleanKey = '';
            for (let i = 0; i < cleanedKey.length; i++) {
              const char = cleanedKey[i];
              const charCode = char.charCodeAt(0);
              // Nur printable ASCII + erlaubte Steuerzeichen (LF, CR, TAB)
              if (
                (charCode >= 32 && charCode <= 126) ||
                charCode === 10 ||
                charCode === 13 ||
                charCode === 9
              ) {
                ultraCleanKey += char;
              }
            }

            // Standard-Escape-Sequenzen normalisieren
            ultraCleanKey = ultraCleanKey.replace(/\\n/g, '\n');
            ultraCleanKey = ultraCleanKey.replace(/\\r/g, '\r');
            ultraCleanKey = ultraCleanKey.replace(/\\t/g, '\t');
            ultraCleanKey = ultraCleanKey.replace(/\\"/g, '"');
            ultraCleanKey = ultraCleanKey.replace(/\\'/g, "'");
            ultraCleanKey = ultraCleanKey.replace(/\\\\/g, '\\');

            // Entferne zusätzliche problematische Unicode-Zeichen
            ultraCleanKey = ultraCleanKey.replace(/[\u200B-\u200D\uFEFF]/g, '');

            console.log('JSON-String aggressiv bereinigt, versuche zu parsen...');
            serviceAccount = JSON.parse(ultraCleanKey);
          }
        } catch (parseError: any) {
          console.error(
            'JSON-Parsing fehlgeschlagen nach aggressiver Bereinigung:',
            parseError.message
          );
          throw new Error(
            `Firebase Service Account Key konnte nicht geparst werden: ${parseError.message}`
          );
        }

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
        console.log('Versuche Fallback-Methoden...');
      }
    } else if (firebaseServiceAccountKey && !firebaseServiceAccountKey.trim()) {
      console.log('FIREBASE_SERVICE_ACCOUNT_KEY ist leer, verwende Fallback-Methoden...');
    }

    // 2. Fallback: GOOGLE_APPLICATION_CREDENTIALS (nur JSON-String)
    const googleAppCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (googleAppCredentials && googleAppCredentials.trim() && !credentialSet) {
      try {
        console.log('Versuche GOOGLE_APPLICATION_CREDENTIALS als JSON-String zu verwenden...');
        let cleanedCredentials = googleAppCredentials.trim();

        // Bereinige JSON-String (falls escape-sequences enthalten)
        cleanedCredentials = cleanedCredentials.replace(/\\n/g, '\n');
        cleanedCredentials = cleanedCredentials.replace(/\\r/g, '\r');
        cleanedCredentials = cleanedCredentials.replace(/\\t/g, '\t');
        cleanedCredentials = cleanedCredentials.replace(/\\"/g, '"');

        const serviceAccount = JSON.parse(cleanedCredentials);

        if (serviceAccount.type === 'service_account' && serviceAccount.project_id) {
          options.credential = admin.credential.cert(serviceAccount);
          credentialSet = true;
          console.log(
            '✅ Firebase Credentials erfolgreich aus GOOGLE_APPLICATION_CREDENTIALS geladen'
          );
        } else {
          console.error('GOOGLE_APPLICATION_CREDENTIALS hat ungültiges Service Account Format');
        }
      } catch (jsonError: any) {
        console.error('Fehler beim Parsen von GOOGLE_APPLICATION_CREDENTIALS:', jsonError.message);
      }
    }

    // WICHTIG: Wenn keine Credentials gesetzt sind, FEHLER werfen (aber nur zur Laufzeit)
    if (!credentialSet && !isBuildTime) {
      const errorMsg =
        'Firebase Credentials nicht verfügbar - FIREBASE_SERVICE_ACCOUNT_KEY oder GOOGLE_APPLICATION_CREDENTIALS erforderlich.';
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
