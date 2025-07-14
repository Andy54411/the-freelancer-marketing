import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { AppOptions } from 'firebase-admin/app';

if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    const options: AppOptions = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tilvo-f142f',
      storageBucket: 'tilvo-f142f.firebasestorage.app', // Corrected to match project config
    };

    // Logik für Vercel (Produktion/Preview)
    if (process.env.VERCEL) {
      console.log(
        '[Firebase Server] Vercel-Umgebung erkannt. Initialisiere mit FIREBASE_SERVICE_ACCOUNT_KEY.'
      );
      if (!serviceAccountKey) {
        console.error(
          '[Firebase Server] KRITISCH: Die App läuft auf Vercel, aber die Umgebungsvariable FIREBASE_SERVICE_ACCOUNT_KEY ist nicht gesetzt.'
        );
        throw new Error('Server-Konfigurationsfehler: Firebase-Credentials fehlen.');
      }
      try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        // Wichtiger Workaround für Vercel: Zeilenumbrüche im Private Key korrigieren.
        // Vercel ersetzt `\n` oft mit `\\n`.
        if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        options.credential = admin.credential.cert(serviceAccount);
      } catch (e: any) {
        console.error(
          '[Firebase Server] KRITISCH: Parsen von FIREBASE_SERVICE_ACCOUNT_KEY fehlgeschlagen. Ist die Variable korrekt als JSON formatiert?',
          e
        );
        throw new Error('Fehlerhafte FIREBASE_SERVICE_ACCOUNT_KEY Umgebungsvariable.');
      }
    } else {
      // Logik für lokale Entwicklung
      // Verwendet automatisch die `GOOGLE_APPLICATION_CREDENTIALS` Umgebungsvariable, wenn gesetzt.
      console.log(
        '[Firebase Server] Lokale Umgebung erkannt. Initialisiere mit Application Default Credentials (erwartet GOOGLE_APPLICATION_CREDENTIALS).'
      );
      options.credential = admin.credential.applicationDefault();
    }

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
    let errorMessage =
      'Initialisierung des Firebase Admin SDK fehlgeschlagen. Überprüfen Sie die Server-Logs für Details.';
    // Check specifically for a JSON parsing error
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      console.error(
        '[Firebase Server] KRITISCH: Parsen von FIREBASE_SERVICE_ACCOUNT_KEY fehlgeschlagen. Die Umgebungsvariable ist wahrscheinlich eine fehlerhafte JSON-Zeichenkette.'
      );
      console.error(
        '[Firebase Server] TIPP: Stellen Sie sicher, dass der gesamte Inhalt der JSON-Schlüsseldatei korrekt als eine einzige Zeile kopiert wurde.'
      );
      errorMessage =
        'Ungültige FIREBASE_SERVICE_ACCOUNT_KEY Umgebungsvariable. Der Server kann nicht gestartet werden.';
    } else {
      console.error(
        '[Firebase Server] KRITISCH: Initialisierung des Firebase Admin SDK fehlgeschlagen.',
        error
      );
    }
    throw new Error(errorMessage);
  }
}

const db = getFirestore();
const auth = getAuth();

export { db, auth, admin };
