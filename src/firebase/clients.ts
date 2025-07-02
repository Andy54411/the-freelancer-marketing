// src/firebase/clients.ts

import { initializeApp, getApps, FirebaseApp, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions';

// --- Konfiguration ---
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Die Region muss mit der Deployment-Region der Funktion übereinstimmen.
// Die Cloud Functions sind in `firebase_functions/src/invites.ts` für `europe-west1` konfiguriert.
// Dies ist die entscheidende Korrektur.
const functionsRegion = 'europe-west1';

/**
 * Stellt eine einzige, initialisierte Firebase App-Instanz bereit.
 * Verhindert die mehrfache Initialisierung in Server-Side-Rendering- und
 * Hot-Module-Replacement-Szenarien.
 * @returns {FirebaseApp} Die initialisierte Firebase App.
 */
const getClientApp = (): FirebaseApp => {
  if (getApps().length) {
    return getApp();
  }
  console.log('[Firebase Client] Initializing new Firebase App.');
  return initializeApp(firebaseConfig);
};

// --- Instanzen abrufen ---
const app = getClientApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app, functionsRegion);

// --- Emulatoren verbinden (nur im Entwicklungsmodus) ---
// Dieser Block wird nur einmal pro Prozess ausgeführt, auch bei Hot-Reloads.
if (process.env.NODE_ENV === 'development') {
  // Ein globales Flag, um zu verhindern, dass die Verbindung zu den Emulatoren
  // bei jedem Hot-Reload erneut versucht wird, was zu Fehlern führen würde.
  if (!(global as any)._firebaseEmulatorsConnected) {
    console.log('[Firebase Client] (Dev) Connecting to emulators...');

    // Auth Emulator
    if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST) {
      connectAuthEmulator(auth, `http://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
      console.log(`[Firebase Client] (Dev) Auth Emulator connected.`);
    }

    // Firestore Emulator
    if (process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST) {
      const [host, portStr] = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST.split(':');
      connectFirestoreEmulator(db, host, parseInt(portStr, 10));
      console.log(`[Firebase Client] (Dev) Firestore Emulator connected to ${host}:${portStr}.`);
    }

    // Storage Emulator
    if (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST) {
      const [host, portStr] = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST.split(':');
      connectStorageEmulator(storage, host, parseInt(portStr, 10));
      console.log(`[Firebase Client] (Dev) Storage Emulator connected to ${host}:${portStr}.`);
    }

    // Functions Emulator
    if (process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST) {
      const [host, portStr] = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST.split(':');
      connectFunctionsEmulator(functions, host, parseInt(portStr, 10));
      console.log(`[Firebase Client] (Dev) Functions Emulator connected to ${host}:${portStr}.`);
    }

    (global as any)._firebaseEmulatorsConnected = true;
  }
}

// --- Exporte ---
// Exportiere die Instanzen mit Aliasen für eine saubere Verwendung in der App.
export { app, auth, db, storage, functions };
