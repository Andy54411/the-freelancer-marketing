import * as admin from 'firebase-admin';  // Importiere Firebase Admin SDK
import { Firestore } from 'firebase-admin/firestore';  // Importiere den Firestore-Typ

// Definiere das ServiceAccount-Objekt ohne die "type"-Eigenschaft
const serviceAccount = {
  "project_id": process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tilvo-f142f",
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID!,
  "private_key": process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  "client_email": process.env.FIREBASE_CLIENT_EMAIL!,
  "client_id": process.env.FIREBASE_CLIENT_ID!,
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40tilvo-f142f.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

if (!admin.apps.length) {
  try {
    // Firebase Admin SDK initialisieren mit ServiceAccount-Credentials
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)  // Verwendet das ServiceAccount-Objekt korrekt
    });
    console.log('Firebase Admin SDK erfolgreich initialisiert.');
  } catch (error) {
    console.error('Fehler bei der Initialisierung des Firebase Admin SDK:', error);
    process.exit(1);  // Beende den Prozess bei einem kritischen Fehler
  }
} else {
  console.log('Firebase Admin SDK ist bereits initialisiert.');
}

// Firestore-Instanz deklarieren und zuweisen, nachdem die App initialisiert ist
const firestore: Firestore = admin.firestore();

// Exportiere die Firestore-Instanz für andere Teile der Anwendung
export { firestore };
