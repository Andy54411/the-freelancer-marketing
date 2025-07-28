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
          '[Firebase Server] WARNUNG: FIREBASE_SERVICE_ACCOUNT_KEY nicht gesetzt. Versuche Default Credentials...'
        );
        // Fallback zu Default Credentials
        options.credential = admin.credential.applicationDefault();
      } else {
        try {
          // Prüfe, ob es ein JSON-String oder ein Dateipfad ist
          let serviceAccount;
          if (serviceAccountKey.startsWith('{')) {
            // Es ist ein JSON-String
            serviceAccount = JSON.parse(serviceAccountKey);
            console.log('[Firebase Server] Service Account als JSON-String erkannt.');

            // Wichtiger Workaround für Vercel: Zeilenumbrüche im Private Key korrigieren.
            // Vercel ersetzt `\n` oft mit `\\n`.
            if (serviceAccount.private_key) {
              serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }
            options.credential = admin.credential.cert(serviceAccount);
          } else {
            // Es ist wahrscheinlich ein Dateipfad - nutze Default Credentials
            console.log(
              '[Firebase Server] Service Account Pfad erkannt, nutze Default Credentials.'
            );
            options.credential = admin.credential.applicationDefault();
          }
        } catch (e: any) {
          console.error(
            '[Firebase Server] WARNUNG: Parsen von FIREBASE_SERVICE_ACCOUNT_KEY fehlgeschlagen. Nutze Default Credentials als Fallback...',
            e.message
          );
          // Fallback zu Default Credentials
          options.credential = admin.credential.applicationDefault();
        }
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
