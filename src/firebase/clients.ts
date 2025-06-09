// /Users/andystaudinger/Tasko/src/firebase/clients.ts

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions';

// Lade Umgebungsvariablen
const NEXT_PUBLIC_FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const NEXT_PUBLIC_FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const NEXT_PUBLIC_FIREBASE_APP_ID = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

// Bestimme, ob wir im Emulator-Modus sind
const isEmulatorMode = process.env.NODE_ENV === 'development' && (
  process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST ||
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST ||
  process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST
);

let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
let storageInstance: FirebaseStorage;
let functionsInstance: Functions;

// Initialisiere die Firebase App und Services nur einmal
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

  app = initializeApp(firebaseConfig);

  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);
  functionsInstance = getFunctions(app);

  if (isEmulatorMode) {
    console.log("[Firebase Client] Running in emulator mode. Connecting to local emulators.");

    // Auth Emulator Verbindung
    if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST) {
      try {
        connectAuthEmulator(authInstance, `http://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}`);
        console.log(`[Firebase Client] Connected to Auth Emulator: http://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}`);
      } catch (e) {
        if (!(e instanceof Error && e.message.includes('Auth emulator is already being used'))) {
          console.error("[Firebase Client] Error connecting to Auth Emulator:", e);
        }
      }
    }

    // Firestore Emulator Verbindung
    if (process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST) {
      try {
        const firestoreHost = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST;
        const [host, port] = firestoreHost.split(':');
        connectFirestoreEmulator(dbInstance, host, parseInt(port, 10));
        console.log(`[Firebase Client] Connected to Firestore Emulator: http://${firestoreHost}`);
      } catch (e) {
        if (!(e instanceof Error && e.message.includes('Firestore emulator is already being used'))) {
          console.error("[Firebase Client] Error connecting to Firestore Emulator:", e);
        }
      }
    }

    // Storage Emulator Verbindung
    if (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST) {
      try {
        const storageHost = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST;
        const [host, port] = storageHost.split(':');
        connectStorageEmulator(storageInstance, host, parseInt(port, 10));
        console.log(`[Firebase Client] Connected to Storage Emulator: http://${storageHost}`);
      } catch (e) {
        if (!(e instanceof Error && e.message.includes('Storage emulator is already being used'))) {
          console.error("[Firebase Client] Error connecting to Storage Emulator:", e);
        }
      }
    }

    // Functions Emulator Verbindung
    if (process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST) {
      try {
        // KORREKTUR: Wir holen den Host und setzen den Port manuell,
        // da wir wissen, dass er 5001 ist und nicht in der Host-Variable steht.
        const host = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST; // Das ist "localhost"
        const port = 5001;

        connectFunctionsEmulator(functionsInstance, host, port);

        // KORREKTUR: Auch das Log anpassen, damit es die korrekte URL anzeigt.
        console.log(`[Firebase Client] Connected to Functions Emulator: http://${host}:${port}`);
      } catch (e) {
        if (!(e instanceof Error && e.message.includes('Functions emulator is already being used'))) {
          console.error("[Firebase Client] Error connecting to Functions Emulator:", e);
        }
      }
    }

  } else {
    console.log("[Firebase Client] Running in production mode. Using production Firebase services.");
  }

} else {
  // App ist bereits initialisiert
  app = getApps()[0];
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);
  functionsInstance = getFunctions(app);
}

// Exportiere die initialisierten Instanzen
export { app, authInstance as auth, dbInstance as db, storageInstance as storage, functionsInstance as functions };