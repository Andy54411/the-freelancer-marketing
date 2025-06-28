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

const functionsRegion = 'europe-west1';

// --- Typ-Definitionen für das globale Objekt ---
// Dies ist notwendig, um TypeScript mitzuteilen, dass wir Firebase-Instanzen
// im globalen Namespace speichern, was in der Entwicklung mit HMR (Hot Module Replacement)
// nützlich ist, um den Zustand zwischen den Neuladungen zu erhalten.
declare global {
  var _firebaseApp: FirebaseApp | undefined;
  var _firebaseAuth: Auth | undefined;
  var _firebaseDb: Firestore | undefined;
  var _firebaseStorage: FirebaseStorage | undefined;
  var _firebaseFunctions: Functions | undefined;
}

// --- Hauptlogik ---
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;

const isDevelopment = process.env.NODE_ENV === 'development';
const isClient = typeof window !== 'undefined';

if (isDevelopment && isClient) {
  // Im Entwicklungsmodus verwenden wir das 'global'-Objekt als Cache.
  // Dies verhindert, dass bei jedem Fast Refresh von Next.js eine neue
  // Firebase-App initialisiert und die Emulator-Verbindungen verloren gehen.

  // Check for the existence of the cached app AND functions instance.
  // If either is missing, re-initialize everything to prevent stale states caused by HMR.
  if (!global._firebaseApp || !global._firebaseFunctions) {
    console.log('[Firebase Client] (Dev) Re-initializing Firebase and caching in global.');

    // Initialisiere die App und die Dienste
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app, functionsRegion);

    // Speichere die Instanzen im globalen Cache
    global._firebaseApp = app;
    global._firebaseAuth = auth;
    global._firebaseDb = db;
    global._firebaseStorage = storage;
    global._firebaseFunctions = functions;

    // Verbinde die Emulatoren NUR bei der allerersten Initialisierung.
    // Auth Emulator
    if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST) {
      connectAuthEmulator(auth, `http://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}`);
      console.log(`[Firebase Client] (Dev) Auth Emulator connected.`);
    }
    // Firestore Emulator
    if (process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST) {
      const [host, port] = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST.split(':');
      connectFirestoreEmulator(db, host, parseInt(port, 10));
      console.log(`[Firebase Client] (Dev) Firestore Emulator connected.`);
    }
    // Storage Emulator
    if (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST) {
      const [host, port] = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST.split(':');
      connectStorageEmulator(storage, host, parseInt(port, 10));
      console.log(`[Firebase Client] (Dev) Storage Emulator connected.`);
    }
    // Functions Emulator
    if (process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST) {
      const hostWithPort = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST;
      const [host, portStr] = hostWithPort.includes(':') ? hostWithPort.split(':') : [hostWithPort, '5001'];
      connectFunctionsEmulator(functions, host, parseInt(portStr, 10));
      console.log(`[Firebase Client] (Dev) Functions Emulator connected.`);
    }

  } else {
    // Wenn die Instanzen bereits im globalen Cache vorhanden sind, verwenden wir sie wieder.
    console.log('[Firebase Client] (Dev) Reusing cached Firebase instances from global.');
    app = global._firebaseApp!;
    auth = global._firebaseAuth!;
    db = global._firebaseDb!;
    storage = global._firebaseStorage!;
    functions = global._firebaseFunctions!;
  }
} else {
  // Im Produktionsmodus oder auf dem Server verwenden wir das Standard-Singleton-Pattern.
  if (!getApps().length) {
    console.log('[Firebase Client] (Prod) Initializing Firebase App.');
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app, functionsRegion);
}

// --- Exporte ---
// Exportiere die Instanzen mit Aliasen für eine saubere Verwendung in der App.
export { app, auth, db, storage, functions };
