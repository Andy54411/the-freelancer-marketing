// /Users/andystaudinger/Tasko/firebase_functions/src/helpers.ts

import { getApps, App as AdminApp } from "firebase-admin/app";
import { getFirestore, Firestore, FieldValue, Timestamp } from "firebase-admin/firestore"; // Exportiere FieldValue und Timestamp
import { getAuth, Auth } from "firebase-admin/auth";
import { getStorage, Storage } from "firebase-admin/storage";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { UNKNOWN_USER_NAME, UNKNOWN_PROVIDER_NAME } from "./constants";

// --- Instanz-Variablen für Lazy Loading ---
// Diese Variablen speichern die initialisierten Instanzen, um zu verhindern,
// dass sie bei jedem Aufruf neu erstellt werden.

// Zentrale CORS-Konfiguration für den lokalen Emulator-Zugriff.
// Dies sollte nur die erlaubten Origins enthalten. Die Region wird pro Funktion definiert.
export const corsOptions: string[] = [
  "http://localhost:3000", "http://localhost:3001", "http://localhost:3002",
  "https://tilvo-f142f.web.app", "http://localhost:5002"
];

let dbInstance: Firestore;
let authInstance: Auth;
let storageInstance: Storage;


/**
 * Initialisiert und gibt die Firebase Admin App Instanz zurück.
 * Diese Funktion stellt sicher, dass die App nur einmal initialisiert wird.
 * WICHTIG: initializeApp() MUSS global in index.ts aufgerufen werden.
 */
function getAdminApp(): AdminApp {
  // This function now assumes that initializeApp() has been called in the main
  // entry point (index.ts). It simply retrieves the already-initialized app.
  return getApps()[0];
}

// --- ANGEPASSTE "GETTER"-FUNKTIONEN FÜR LAZY INITIALIZATION ---

/**
 * Gibt die Firestore-Datenbankinstanz zurück.
 * Die Initialisierung erfolgt nur beim ersten Aufruf ("lazy").
 * @returns {Firestore} Die Firestore-Instanz.
 */
export function getDb(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirestore(getAdminApp());
    logger.info("[getDb] Firestore-Instanz erfolgreich initialisiert (lazy).");
  }
  return dbInstance;
}

/**
 * Gibt die Firebase Auth Instanz zurück.
 * Die Initialisierung erfolgt nur beim ersten Aufruf ("lazy").
 * @returns {Auth} Die Auth-Instanz.
 */
export function getAuthInstance(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getAdminApp());
    logger.info("[getAuthInstance] Auth-Instanz erfolgreich initialisiert (lazy).");
  }
  return authInstance;
}

/**
 * Gibt die Firebase Storage Instanz zurück.
 * Die Initialisierung erfolgt nur beim ersten Aufruf ("lazy").
 * @returns {Storage} Die Storage-Instanz.
 */
export function getStorageInstance(): Storage {
  if (!storageInstance) {
    storageInstance = getStorage(getAdminApp());
    logger.info("[getStorageInstance] Storage-Instanz erfolgreich initialisiert (lazy).");
  }
  return storageInstance;
}

/**
 * A type representing any object that has user name properties.
 */
interface UserLike {
  companyName?: string;
  firmenname?: string;
  firstName?: string;
  lastName?: string;
}

export interface ParticipantDetails {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * Generates a display name for a user.
 * It prioritizes the company name, then falls back to a combination of
 * first and last names, and finally to a default string if no name can be constructed.
 * @param userData - An object containing user name properties.
 * @returns The display name as a string.
 * @param fallback - A fallback string to use if no name can be constructed.
 */
export function getUserDisplayName(userData: UserLike | null | undefined, fallback: string = UNKNOWN_USER_NAME): string {
  if (!userData) {
    return fallback;
  }
  const name = userData.companyName || userData.firmenname || `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
  return name || fallback;
}

/**
 * Fetches the correct display name and avatar for a chat participant.
 * It intelligently checks if the user is a 'firma' (company) and fetches
 * data from the 'companies' collection, otherwise it uses the 'users' collection.
 * @param db - The Firestore database instance.
 * @param userId - The ID of the user to fetch details for.
 * @returns A promise that resolves to the participant's details.
 */
export async function getChatParticipantDetails(db: Firestore, userId: string): Promise<ParticipantDetails> {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return { id: userId, name: UNKNOWN_USER_NAME, avatarUrl: null };
    }
    const userData = userDoc.data()!;

    if (userData.user_type === 'firma') {
      const companyDoc = await db.collection("companies").doc(userId).get();
      const companyData = companyDoc.exists ? companyDoc.data() : null;
      // For companies, the name and avatar come from the 'companies' document.
      return {
        id: userId,
        name: companyData?.companyName || getUserDisplayName(userData, UNKNOWN_PROVIDER_NAME),
        avatarUrl: companyData?.profilePictureURL || null,
      };
    }
    // For regular users, use their personal details.
    return { id: userId, name: getUserDisplayName(userData), avatarUrl: userData.profilePictureURL || userData.profilePictureFirebaseUrl || null };
  } catch (error: any) {
    logger.error(`[getChatParticipantDetails] Error fetching details for user ${userId}:`, error);
    return { id: userId, name: UNKNOWN_USER_NAME, avatarUrl: null };
  }
}

// --- Bestehende Getter-Funktionen (JETZT MIT KORRIGIERTER LOGIK) ---

export function getStripeInstance(stripeKey: string): Stripe {
  // Die Singleton-Logik wird entfernt. Jede Funktion, die diese Hilfsfunktion aufruft,
  // ist nun dafür verantwortlich, den korrekten Schlüssel bereitzustellen.
  // if (!stripeClientInstance) {

  if (stripeKey) {
    try {
      // Erstelle und gib immer eine neue Instanz zurück.
      const stripeInstance = new Stripe(stripeKey, {
        typescript: true,
        apiVersion: "2024-06-20",
      });
      logger.info("[getStripeInstance] Stripe-Client erfolgreich initialisiert.");
      return stripeInstance;
    } catch (e: unknown) {
      let errorMessage = "Unbekannter Fehler bei der Initialisierung des Stripe-Clients.";
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      logger.error("KRITISCH: Fehler bei der Initialisierung des Stripe-Clients.", { error: errorMessage, at: 'getStripeInstance' });
      throw new HttpsError("internal", `Stripe ist auf dem Server nicht korrekt konfiguriert: ${errorMessage}`);
    }
  } else {
    logger.error("KRITISCH: STRIPE_SECRET_KEY nicht verfügbar!", { at: 'getStripeInstance' });
    throw new HttpsError("internal", "Stripe ist auf dem Server nicht korrekt konfiguriert (Secret fehlt).");
  }
  // }
  // return stripeClientInstance!;
}

/**
 * Gibt die öffentlich zugängliche Frontend-URL zurück (Live-URL im Prod, oder die in .env.local gesetzte Live-URL im Emulator).
 * Diese URL ist für Dienste wie Stripe Business Profile URL gedacht.
 */
export function getPublicFrontendURL(liveUrl: string): string {
  if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.FIREBASE_EMULATOR_HOST) {
    const emulatorLiveSimulatedUrl = process.env.FRONTEND_URL;
    if (emulatorLiveSimulatedUrl?.startsWith('http')) {
      logger.info("[getPublicFrontendURL] Liefere Emulator (simulierte Live)-URL.");
      return emulatorLiveSimulatedUrl;
    }
    logger.error("[getPublicFrontendURL] FRONTEND_URL ist im Emulator nicht korrekt konfiguriert oder ungültig.", { url: emulatorLiveSimulatedUrl });
    throw new HttpsError("internal", "Öffentliche Frontend URL ist im Emulator nicht korrekt konfiguriert (FRONTEND_URL in .env.local fehlt/ist ungültig).");
  } else {
    // Der Live-URL wird nun als Parameter übergeben
    if (liveUrl?.startsWith('http')) {
      logger.info("[getPublicFrontendURL] Liefere Live-URL.");
      return liveUrl;
    }
    logger.error("[getPublicFrontendURL] FRONTEND_URL ist auf dem Server nicht korrekt konfiguriert oder ungültig.", { url: liveUrl });
    throw new HttpsError("internal", "Frontend URL ist auf dem Server nicht korrekt konfiguriert.");
  }
}

/**
 * Gibt die für den Emulator spezifische Frontend-URL zurück, die lokal erreichbar ist.
 * Dies ist für Callback-URLs wie Stripe Account Links gedacht.
 */
export function getEmulatorCallbackFrontendURL(liveUrl: string): string {
  if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.FIREBASE_EMULATOR_HOST) {
    // Dieser Teil ist schnell und benötigt keine Änderung
    const emulatorLocalUrl = process.env.EMULATOR_PUBLIC_FRONTEND_URL;
    if (emulatorLocalUrl?.startsWith('http')) {
      logger.info("[getEmulatorCallbackFrontendURL] Liefere lokale Emulator-URL.");
      return emulatorLocalUrl;
    }
    logger.warn("[getEmulatorCallbackFrontendURL] EMULATOR_PUBLIC_FRONTEND_URL nicht gesetzt oder ungültig. Fallback auf localhost:3000.");
    return 'http://localhost:3000';
  }
  logger.info("[getEmulatorCallbackFrontendURL] Im Live-Betrieb: Liefere Live-URL (wie getPublicFrontendURL).");
  return getPublicFrontendURL(liveUrl);
}

/**
 * Allgemeine Hilfsfunktion für die Frontend-URL.
 */
export function getFrontendURL(liveUrl: string): string {
  if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.FIREBASE_EMULATOR_HOST) {
    return getEmulatorCallbackFrontendURL(liveUrl);
  }
  return liveUrl;
}


export function getStripeWebhookSecret(webhookSecretFromParams: string | undefined): string {
  const webhookSecret = process.env.FUNCTIONS_EMULATOR === 'true' ? process.env.STRIPE_WEBHOOK_SECRET : webhookSecretFromParams;

  if (webhookSecret) {
    return webhookSecret;
  } else if (process.env.FUNCTIONS_EMULATOR === 'true') {
    throw new HttpsError("internal", "Stripe Webhook Secret ist im Emulator nicht konfiguriert.");
  } else {
    throw new HttpsError("internal", "Stripe Webhook Secret ist nicht konfiguriert.");
  }
}

/**
 * Verifiziert, ob ein Benutzer in der 'admins'-Sammlung existiert.
 * @param {string} uid - Die UID des zu überprüfenden Benutzers.
 * @returns {Promise<boolean>} - Wahr, wenn der Benutzer ein Administrator ist, andernfalls falsch.
 */
export async function verifyAdmin(uid: string): Promise<boolean> {
  const db = getDb();
  try {
    logger.info(`[verifyAdmin] Überprüfe Admin-Status für UID: ${uid}`);

    // 1. Überprüfe Custom Claim
    const userRecord = await getAuthInstance().getUser(uid);
    if (userRecord.customClaims && userRecord.customClaims.admin === true) {
      logger.info(`[verifyAdmin] Admin-Status für ${uid} durch Custom Claim bestätigt.`);
      return true;
    }
    logger.info(`[verifyAdmin] Kein Admin-Custom-Claim für ${uid} gefunden.`);

    // 2. Fallback: Überprüfe Firestore 'users'-Dokument
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists && userDoc.data()?.user_type === 'master') {
      logger.info(`[verifyAdmin] Admin-Status für ${uid} durch Firestore-Dokument (user_type: master) bestätigt.`);
      return true;
    }
    logger.info(`[verifyAdmin] Kein Admin-Status für ${uid} im Firestore-Dokument gefunden.`);

    // 3. Fallback: Überprüfe die alte 'admins'-Sammlung (optional, für Abwärtskompatibilität)
    const adminDoc = await db.collection("admins").doc(uid).get();
    if (adminDoc.exists) {
      logger.info(`[verifyAdmin] Admin-Status für ${uid} durch 'admins'-Sammlung bestätigt.`);
      return true;
    }
    logger.info(`[verifyAdmin] Kein Admin-Status für ${uid} in der 'admins'-Sammlung gefunden.`);

    logger.warn(`[verifyAdmin] Admin-Prüfung für ${uid} fehlgeschlagen. Benutzer ist kein Admin.`);
    return false;

  } catch (error: any) {
    logger.error(`[verifyAdmin] Fehler bei der Überprüfung des Admin-Status für UID ${uid}:`, error);
    return false; // Im Fehlerfall immer den Zugriff verweigern
  }
}

/**
 * Löscht eine Sammlung in Firestore in Batches.
 * WICHTIG: Löscht keine Subkollektionen rekursiv.
 * @param db Die Firestore-Instanz.
 * @param collectionPath Der Pfad zur Sammlung.
 * @param batchSize Die Größe der Batches, die gelöscht werden sollen.
 */
export async function deleteCollection(db: Firestore, collectionPath: string, batchSize: number): Promise<void> {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy("__name__").limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(db: Firestore, query: admin.firestore.Query, resolve: () => void): Promise<void> {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}


// --- UMGEBUNGS-HELPER FUNKTIONEN ---

/**
 * Bestimmt ob die Anwendung im Firebase Emulator läuft
 * @returns {boolean} True wenn im Emulator, false in Produktion
 */
export function isEmulator(): boolean {
  // Prüfe verschiedene Emulator-Indikatoren
  return !!(
    process.env.FUNCTIONS_EMULATOR === 'true' ||
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    process.env.STORAGE_EMULATOR_HOST
  );
}

/**
 * Gibt die korrekten URLs für die aktuelle Umgebung zurück
 * @returns {object} Objekt mit frontend_url und stripe_return_url
 */
export function getEnvironmentUrls(): { frontend_url: string; stripe_return_url: string } {
  const isEmulatorEnv = isEmulator();
  
  if (isEmulatorEnv) {
    // Im Emulator verwenden wir die öffentliche Firebase-URL für Stripe
    const publicUrl = "https://tilvo-f142f.web.app";
    return {
      frontend_url: publicUrl,
      stripe_return_url: `${publicUrl}/dashboard`
    };
  } else {
    // In Produktion verwenden wir die echte Frontend-URL
    const frontendUrl = process.env.FRONTEND_URL || "https://tilvo-f142f.web.app";
    return {
      frontend_url: frontendUrl,
      stripe_return_url: `${frontendUrl}/dashboard`
    };
  }
}

// --- Hilfstypen und Admin-Export ---
export { FieldValue, Timestamp, admin };