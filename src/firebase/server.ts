import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { AppOptions } from 'firebase-admin/app';
import { readFileSync } from 'fs';

if (!admin.apps.length) {
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
        // Bereinige mögliche Escape-Sequenzen und Whitespace
        const cleanedKey = firebaseServiceAccountKey.trim().replace(/\\n/g, '\n');
        const serviceAccount = JSON.parse(cleanedKey);
        
        // Validiere, dass es sich um ein gültiges Service Account Objekt handelt
        if (serviceAccount.type === 'service_account' && serviceAccount.project_id) {
          options.credential = admin.credential.cert(serviceAccount);
          credentialSet = true;
          console.log('✅ Firebase Credentials erfolgreich aus FIREBASE_SERVICE_ACCOUNT_KEY geladen');
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

    // 2. Fallback: Lokale Service Account Datei (für Development)
    if (!credentialSet) {
      try {
        console.log('Versuche Service Account Datei zu verwenden...');
        const serviceAccountPath = './firebase_functions/service-account.json';
        
        // Prüfe ob Datei existiert
        const serviceAccountJson = readFileSync(serviceAccountPath, 'utf8');
        const serviceAccount = JSON.parse(serviceAccountJson);
        
        // Validiere Service Account Format
        if (serviceAccount.type === 'service_account' && serviceAccount.project_id) {
          options.credential = admin.credential.cert(serviceAccount);
          credentialSet = true;
          console.log(
            '✅ Firebase Credentials erfolgreich aus lokaler Datei geladen:',
            serviceAccountPath
          );
        } else {
          console.error('Lokale Service Account Datei hat ungültiges Format');
        }
      } catch (fileError: any) {
        console.error('Fehler beim Laden der Service Account Datei:', fileError.message);
      }
    }

    // 3. Fallback: GOOGLE_APPLICATION_CREDENTIALS
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

    // WICHTIG: Wenn keine Credentials gesetzt sind, FEHLER werfen
    if (!credentialSet) {
      const errorMsg =
        'Firebase Credentials nicht verfügbar - FIREBASE_SERVICE_ACCOUNT_KEY, lokale service-account.json oder GOOGLE_APPLICATION_CREDENTIALS erforderlich.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    admin.initializeApp(options);

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
    throw new Error(
      'Initialisierung des Firebase Admin SDK fehlgeschlagen. Überprüfen Sie die Server-Logs für Details.'
    );
  }
}

const db = getFirestore();
const auth = getAuth();

export { db, auth, admin };
