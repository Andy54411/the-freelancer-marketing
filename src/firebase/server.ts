import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { AppOptions } from 'firebase-admin/app';

if (!admin.apps.length) {
  try {
    const options: AppOptions = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tilvo-f142f',
      storageBucket: 'tilvo-f142f.firebasestorage.app',
    };

    // Für Vercel: Immer Default Credentials verwenden (sicherer und einfacher)
    console.log('[Firebase Server] Initialisiere mit Application Default Credentials.');
    options.credential = admin.credential.applicationDefault();

    admin.initializeApp(options);
    console.log('[Firebase Server] Admin SDK erfolgreich initialisiert.');

    // Logging für Emulator-Verbindungen in der lokalen Entwicklung
    if (process.env.NODE_ENV === 'development') {
      if (process.env.FIRESTORE_EMULATOR_HOST)
        console.log(
          `\x1b[32m%s\x1b[0m`,
          `[Firebase Server] Verbinde mit Firestore Emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`
        );
      if (process.env.FIREBASE_AUTH_EMULATOR_HOST)
        console.log(
          `\x1b[32m%s\x1b[0m`,
          `[Firebase Server] Verbinde mit Auth Emulator: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`
        );
      if (process.env.FIREBASE_STORAGE_EMULATOR_HOST)
        console.log(
          `\x1b[32m%s\x1b[0m`,
          `[Firebase Server] Storage Emulator erkannt und wird verwendet: ${process.env.FIREBASE_STORAGE_EMULATOR_HOST}`
        );
    }
  } catch (error: any) {
    console.error(
      '[Firebase Server] KRITISCH: Initialisierung des Firebase Admin SDK fehlgeschlagen.',
      error
    );
    throw new Error(
      'Initialisierung des Firebase Admin SDK fehlgeschlagen. Überprüfen Sie die Server-Logs für Details.'
    );
  }
}

const db = getFirestore();
const auth = getAuth();

export { db, auth, admin };
