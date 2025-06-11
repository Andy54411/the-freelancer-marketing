import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions';

const NEXT_PUBLIC_FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const NEXT_PUBLIC_FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const NEXT_PUBLIC_FIREBASE_APP_ID = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

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

  // Füge diese Debug-Logs hinzu, um die Werte der Umgebungsvariablen zu überprüfen
  // und zu sehen, ob isEmulatorMode korrekt erkannt wird.
  console.log("--- CLIENTS.TS DEBUG START ---");
  console.log("DEBUG ENV: NODE_ENV =", process.env.NODE_ENV);
  console.log("DEBUG ENV: NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST =", process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST);
  console.log("DEBUG ENV: NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST =", process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST);
  console.log("DEBUG ENV: NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST =", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST);
  console.log("DEBUG ENV: NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST =", process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST);
  console.log("DEBUG ENV: isEmulatorMode =", isEmulatorMode);
  console.log("--- CLIENTS.TS DEBUG END ---");

  if (isEmulatorMode) {
    console.log("[Firebase Client] Running in emulator mode. Connecting to local emulators.");

    if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST) {
      try {
        connectAuthEmulator(authInstance, `http://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}`);
        console.log(`[Firebase Client] Connected to Auth Emulator: http://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}`);
      } catch (e: unknown) {
        if (!(e instanceof Error && e.message.includes('Auth emulator is already being used'))) {
          console.error("[Firebase Client] Error connecting to Auth Emulator:", e);
        }
      }
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
    }

    if (process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST) {
      try {
        const host = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST;
        const port = 5001;

        connectFunctionsEmulator(functionsInstance, host, port);

        console.log(`[Firebase Client] Connected to Functions Emulator: http://${host}:${port}`);
      } catch (e: unknown) {
        if (!(e instanceof Error && e.message.includes('Functions emulator is already being used'))) {
          console.error("[Firebase Client] Error connecting to Functions Emulator:", e);
        }
      }
    }

  } else {
    console.log("[Firebase Client] Running in production mode. Using production Firebase services.");
  }

} else {
  app = getApps()[0];
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);
  functionsInstance = getFunctions(app);
}

export { app, authInstance as auth, dbInstance as db, storageInstance as storage, functionsInstance as functions };