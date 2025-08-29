import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { AppOptions } from 'firebase-admin/app';

// Better build time detection
const isBuildTime =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.npm_lifecycle_event === 'build' ||
  process.argv.includes('build') ||
  (process.env.NODE_ENV === 'production' &&
    !process.env.VERCEL &&
    !process.env.RAILWAY_ENVIRONMENT) ||
  typeof window !== 'undefined';

let db: ReturnType<typeof getFirestore> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

// Debug: Log build time detection
console.log('🔍 Firebase Init Debug:', {
  isBuildTime,
  NEXT_PHASE: process.env.NEXT_PHASE,
  npm_lifecycle_event: process.env.npm_lifecycle_event,
  NODE_ENV: process.env.NODE_ENV,
  hasVercel: !!process.env.VERCEL,
  hasFirebaseKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
});

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
              // Nur printable ASCII + erlaubte Steuerzeichen (LF, CR, TAB) + JSON-relevante Zeichen
              if (
                (charCode >= 32 && charCode <= 126) || // Printable ASCII
                charCode === 10 || // LF
                charCode === 13 || // CR
                charCode === 9 // TAB
              ) {
                ultraCleanKey += char;
              } else {
                // Log problematische Zeichen für Debugging
                console.warn(
                  `Entferne problematisches Zeichen an Position ${i}: charCode ${charCode}`
                );
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

            // EXTRA: Entferne alle Control Characters (0-31 außer erlaubten)
            ultraCleanKey = ultraCleanKey.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

            // EXTRA: Normalisiere Zeilenumbrüche zu \n
            ultraCleanKey = ultraCleanKey.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

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

        // Entferne äußere Anführungszeichen
        if (cleanedCredentials.startsWith('"') && cleanedCredentials.endsWith('"')) {
          cleanedCredentials = cleanedCredentials.slice(1, -1);
        }
        if (cleanedCredentials.startsWith("'") && cleanedCredentials.endsWith("'")) {
          cleanedCredentials = cleanedCredentials.slice(1, -1);
        }

        // AGGRESSIVE Zeichen-Bereinigung für GOOGLE_APPLICATION_CREDENTIALS
        let ultraCleanCredentials = '';
        for (let i = 0; i < cleanedCredentials.length; i++) {
          const char = cleanedCredentials[i];
          const charCode = char.charCodeAt(0);
          // Nur printable ASCII + erlaubte Steuerzeichen
          if (
            (charCode >= 32 && charCode <= 126) ||
            charCode === 10 ||
            charCode === 13 ||
            charCode === 9
          ) {
            ultraCleanCredentials += char;
          } else {
            console.warn(
              `GOOGLE_APPLICATION_CREDENTIALS: Entferne problematisches Zeichen an Position ${i}: charCode ${charCode}`
            );
          }
        }

        // Standard-Escape-Sequenzen normalisieren
        ultraCleanCredentials = ultraCleanCredentials.replace(/\\n/g, '\n');
        ultraCleanCredentials = ultraCleanCredentials.replace(/\\r/g, '\r');
        ultraCleanCredentials = ultraCleanCredentials.replace(/\\t/g, '\t');
        ultraCleanCredentials = ultraCleanCredentials.replace(/\\"/g, '"');
        ultraCleanCredentials = ultraCleanCredentials.replace(/\\'/g, "'");
        ultraCleanCredentials = ultraCleanCredentials.replace(/\\\\/g, '\\');

        // Entferne Control Characters
        ultraCleanCredentials = ultraCleanCredentials.replace(
          /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
          ''
        );

        // Normalisiere Zeilenumbrüche
        ultraCleanCredentials = ultraCleanCredentials.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        const serviceAccount = JSON.parse(ultraCleanCredentials);

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
    console.error('Debug Info:', {
      isBuildTime,
      hasApps: admin.apps.length > 0,
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PHASE: process.env.NEXT_PHASE,
    });

    // In production build, don't throw - create mock instances
    if (isBuildTime || process.env.npm_lifecycle_event === 'build') {
      console.log('🔨 Build-Zeit erkannt - verwende Mock Firebase Instanzen');
      // Don't throw during build, just log and continue
      db = null;
      auth = null;
    } else {
      // Runtime error - throw as before
      throw new Error(
        'Initialisierung des Firebase Admin SDK fehlgeschlagen. Überprüfen Sie die Server-Logs für Details.'
      );
    }
  }
}

export { db, auth, admin };

// Export mit Fallback für Buildzeit
export default {
  db: db || null,
  auth: auth || null,
  admin: admin || null,
  isBuildTime,
};
