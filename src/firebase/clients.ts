// src/firebase/clients.ts

import { initializeApp, getApps, FirebaseApp, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions';

// Direktes Laden der Umgebungsvariablen
const NEXT_PUBLIC_FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const NEXT_PUBLIC_FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const NEXT_PUBLIC_FIREBASE_APP_ID = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

// Debug-Ausgaben (können nach der Fehlerbehebung entfernt werden)
// Diese Logs sollten immer beim Laden der Datei erscheinen, unabhängig davon, ob die App neu initialisiert wird.
console.log("--- CLIENTS.TS DEBUG START ---");
console.log("DEBUG ENV: NODE_ENV =", process.env.NODE_ENV);
console.log("DEBUG ENV: NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST =", process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST);
console.log("DEBUG ENV: NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST =", process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST);
console.log("DEBUG ENV: NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST =", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST);
console.log("DEBUG ENV: NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST =", process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST);
// Überprüfen, ob der API-Key gesetzt ist (aber nicht den Wert selbst ausgeben, aus Sicherheitsgründen)
console.log("DEBUG ENV: NEXT_PUBLIC_FIREBASE_API_KEY =", NEXT_PUBLIC_FIREBASE_API_KEY ? '****** (API Key gefunden)' : 'API Key FEHLT oder ist leer!');
console.log("--- CLIENTS.TS DEBUG END ---");

// Prüfen, ob Emulatoren verwendet werden sollen
const isClient = typeof window !== 'undefined'; // Überprüfen, ob wir im Browser sind
const isDevelopment = process.env.NODE_ENV === 'development';
const useEmulators = isDevelopment && (
  process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST ||
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST ||
  process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST
);
console.log("DEBUG ENV: isEmulatorMode (computed) =", useEmulators);


let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
let storageInstance: FirebaseStorage;
let functionsInstance: Functions;

if (!getApps().length) {
  const firebaseConfig = {
    apiKey: NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  };

  // Überprüfen, ob wichtige Konfigurationswerte fehlen
  if (!firebaseConfig.apiKey) {
    console.error("FEHLER: NEXT_PUBLIC_FIREBASE_API_KEY ist nicht gesetzt! Firebase kann nicht initialisiert werden.");
    // Sie könnten hier eine Fehlermeldung für den Benutzer anzeigen oder die App zum Absturz bringen
    // Für eine Produktionsumgebung würden Sie hier wahrscheinlich einen robusten Fehlerhandhabungsmechanismus einbauen.
  }
  if (!firebaseConfig.projectId) {
    console.warn("WARNUNG: NEXT_PUBLIC_FIREBASE_PROJECT_ID ist nicht gesetzt. Einige Firebase-Dienste könnten fehlschlagen.");
  }


  app = initializeApp(firebaseConfig);

  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);
  functionsInstance = getFunctions(app);

  if (useEmulators && isClient) { // isClient ist wichtig, da Emulatoren nur im Browser verbunden werden
    console.log("[Firebase Client] Running in emulator mode. Connecting to local emulators.");
    console.warn('WARNING: You are using the Auth Emulator, which is intended for local testing only. Do not use with production credentials.');


    if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST) {
      try {
        connectAuthEmulator(authInstance, `http://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}`);
        console.log(`[Firebase Client] Connected to Auth Emulator: http://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}`);
      } catch (e: unknown) {
        if (!(e instanceof Error && e.message.includes('Auth emulator is already being used'))) {
          console.error("[Firebase Client] Error connecting to Auth Emulator:", e);
        }
      }
    } else {
      console.warn('[Firebase Client] NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ist nicht gesetzt. Auth Emulator wird nicht verbunden.');
    }


    if (process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST) {
      try {
        const firestoreHost = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST;
        const [host, port] = firestoreHost.split(':');
        connectFirestoreEmulator(dbInstance, host, parseInt(port, 10));
        console.log(`[Firebase Client] Connected to Firestore Emulator: http://${firestoreHost}`);
      } catch (e: unknown) {
        if (!(e instanceof Error && e.message.includes('Firestore emulator is already being used'))) {
          console.error("[Firebase Client] Error connecting to Firestore Emulator:", e);
        }
      }
    } else {
      console.warn('[Firebase Client] NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST ist nicht gesetzt. Firestore Emulator wird nicht verbunden.');
    }


    if (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST) {
      try {
        const storageHost = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST;
        const [host, port] = storageHost.split(':');
        connectStorageEmulator(storageInstance, host, parseInt(port, 10));
        console.log(`[Firebase Client] Connected to Storage Emulator: http://${storageHost}`);
      } catch (e: unknown) {
        if (!(e instanceof Error && e.message.includes('Storage emulator is already being used'))) {
          console.error("[Firebase Client] Error connecting to Storage Emulator:", e);
        }
      }
    } else {
      console.warn('[Firebase Client] NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST ist nicht gesetzt. Storage Emulator wird nicht verbunden.');
    }


    if (process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST) {
      try {
        const host = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST;
        const port = 5001; // Standard-Port für Functions Emulator

        connectFunctionsEmulator(functionsInstance, host, port);

        console.log(`[Firebase Client] Connected to Functions Emulator: http://${host}:${port}`);
      } catch (e: unknown) {
        if (!(e instanceof Error && e.message.includes('Functions emulator is already being used'))) {
          console.error("[Firebase Client] Error connecting to Functions Emulator:", e);
        }
      }
    } else {
      console.warn('[Firebase Client] NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST ist nicht gesetzt. Functions Emulator wird nicht verbunden.');
    }

  } else {
    console.log("[Firebase Client] Running in production mode. Using production Firebase services.");
  }

} else {
  // Wenn die App bereits initialisiert wurde (z.B. bei Hot-Reload), die vorhandene Instanz verwenden.
  app = getApp();
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);
  functionsInstance = getFunctions(app);
  console.log("[Firebase Client] Firebase App already initialized. Reusing existing instance.");
}

export { app, authInstance as auth, dbInstance as db, storageInstance as storage, functionsInstance as functions };