// src/firebase/clients.ts
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { getFirestore, Firestore, FieldValue, connectFirestoreEmulator } from 'firebase/firestore'; // connectFirestoreEmulator HINZUGEFÜGT
import { FirebaseStorage, getStorage, connectStorageEmulator } from 'firebase/storage'; // connectStorageEmulator HINZUGEFÜGT
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { connectAuthEmulator } from 'firebase/auth'; // connectAuthEmulator HINZUGEFÜGT

// Ihre Firebase-Projektkonfiguration
const firebaseConfig = {
  apiKey: "AIzaSyD3-mx-FPoT-f2pXVP6HS_t1rE0w_eYNLY",
  authDomain: "tilvo-f142f.firebaseapp.com",
  projectId: "tilvo-f142f",
  storageBucket: "tilvo-f142f.firebasestorage.app",
  messagingSenderId: "1022290879475",
  appId: "1:1022290879475:web:8a188343326132e75ae886",
  measurementId: "G-DVLGG42Z5G"
};

const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Exportiere Firebase-Dienste, die Sie im Frontend verwenden möchten
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
const functions = getFunctions(app);

// HINZUGEFÜGT: Emulator-Verbindungen für den Entwicklungsmodus
if (process.env.NODE_ENV === 'development') {
  console.log("Connecting to Firebase Emulators...");
  // Verbinden Sie sich mit dem Functions Emulator auf dem Standardport 5001
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  // Verbinden Sie sich mit dem Firestore Emulator auf dem Standardport 8080
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  // Verbinden Sie sich mit dem Auth Emulator auf dem Standardport 9099
  connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  // Verbinden Sie sich mit dem Storage Emulator auf dem Standardport 9199
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}

export { app, auth, db, storage, FieldValue, functions };
