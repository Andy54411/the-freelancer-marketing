// src/firebase/clients.ts

import { initializeApp, getApps, FirebaseApp, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions';
import { getDatabase, connectDatabaseEmulator, Database } from 'firebase/database'; // NEU: Realtime Database

// Import error handler
import { setupFirestoreErrorHandler } from '@/lib/firestoreErrorHandler';

// Initialize error suppression
setupFirestoreErrorHandler();

// Typen durch Rückgabewerte ableiten
type Auth = ReturnType<typeof getAuth>;
type User = NonNullable<Auth['currentUser']>;

// --- Konfiguration ---
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
    'https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app', // NEU: Realtime Database URL mit korrekter Region
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
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

  return initializeApp(firebaseConfig);
};

// --- Instanzen abrufen ---
const app = getClientApp();
const auth = getAuth(app);
const db = getFirestore(app);

// PERFORMANCE-OPTIMIERUNG: Firestore Settings für bessere Performance
import { enableNetwork, disableNetwork } from 'firebase/firestore';

// Hinweis: enableMultiTabIndexedDbPersistence() ist deprecated und wurde entfernt
// Firebase verwendet automatisch lokalen Cache, wenn verfügbar

const realtimeDb = getDatabase(app); // NEU: Realtime Database
const storage = getStorage(app);
const functions = getFunctions(app, functionsRegion);

// --- Emulatoren verbinden (nur wenn explizit konfiguriert) ---
// Nur verbinden, wenn Emulator-Environment-Variablen explizit gesetzt sind
if (!(global as any)._firebaseEmulatorsConnected) {
  // Auth Emulator
  if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST) {
    console.log(
      '🔧 Verbinde mit Auth Emulator:',
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST
    );
    connectAuthEmulator(auth, `http://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}`, {
      disableWarnings: true,
    });
  }

  // Firestore Emulator
  if (process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST) {
    console.log(
      '🔧 Verbinde mit Firestore Emulator:',
      process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST
    );
    const [host, portStr] = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST.split(':');
    connectFirestoreEmulator(db, host, parseInt(portStr, 10));
  }

  // Storage Emulator
  if (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST) {
    console.log(
      '🔧 Verbinde mit Storage Emulator:',
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST
    );
    const [host, portStr] = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST.split(':');
    connectStorageEmulator(storage, host, parseInt(portStr, 10));
  }

  // Functions Emulator - nur wenn explizit gesetzt
  if (process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST) {
    console.log(
      '🔧 Verbinde mit Functions Emulator:',
      process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST
    );
    const [host, portStr] = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST.split(':');
    connectFunctionsEmulator(functions, host, parseInt(portStr, 10));
  } else {
    console.log('🌐 Verwende Production Firebase Functions (europe-west1)');
  }

  // Realtime Database Emulator
  if (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_HOST) {
    console.log(
      '🔧 Verbinde mit Database Emulator:',
      process.env.NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_HOST
    );
    const [host, portStr] = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_HOST.split(':');
    connectDatabaseEmulator(realtimeDb, host, parseInt(portStr, 10));
  }

  (global as any)._firebaseEmulatorsConnected = true;
}

// --- Exporte ---
// Exportiere die Instanzen mit Aliasen für eine saubere Verwendung in der App.
export { app, auth, db, realtimeDb, storage, functions, onAuthStateChanged, signOut, type User };
