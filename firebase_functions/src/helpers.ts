// /Users/andystaudinger/Tasko/firebase_functions/src/helpers.ts

import { initializeApp, getApps, App as AdminApp } from "firebase-admin/app";
import { getFirestore, Firestore, FieldValue, Timestamp } from "firebase-admin/firestore"; // Exportiere FieldValue und Timestamp
import { getAuth, Auth } from "firebase-admin/auth";
import { getStorage, Storage } from "firebase-admin/storage";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { defineString, defineSecret } from "firebase-functions/params";

// --- Instanz-Variablen für Lazy Loading ---
// Diese Variablen speichern die initialisierten Instanzen, um zu verhindern,
// dass sie bei jedem Aufruf neu erstellt werden.

// Zentrale CORS-Konfiguration für alle Callable Functions.
export const corsOptions = {
  region: "europe-west1",
  cors: ["http://localhost:3000", "https://tilvo-f142f.web.app", "http://localhost:5002"]
};

let dbInstance: Firestore;
let authInstance: Auth;
let storageInstance: Storage;
let stripeClientInstance: Stripe | undefined;


/**
 * Initialisiert und gibt die Firebase Admin App Instanz zurück.
 * Diese Funktion stellt sicher, dass die App nur einmal initialisiert wird.
 */
function getAdminApp(): AdminApp {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const app = initializeApp();
  logger.info("Admin SDK erfolgreich initialisiert.");

  // The Admin SDK automatically connects to the Firestore emulator when the
  // FIRESTORE_EMULATOR_HOST environment variable is set by `firebase emulators:start`.
  // The explicit configuration below is removed to avoid port conflicts and make the setup more robust.
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    logger.info("[getAdminApp] Running in emulator mode. SDK will auto-connect to Firestore emulator if the environment variable is set.");
  }

  return app;
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

// --- Parameter-Definitionen (AUSKOMMENTIERT, DA SIE DEN FEHLER VERURSACHEN) ---
// export const STRIPE_SECRET_KEY_PARAM = defineSecret("STRIPE_SECRET_KEY");
// export const STRIPE_WEBHOOK_SECRET_PARAM = defineSecret("STRIPE_WEBHOOK_SECRET");
// export const SENDGRID_API_KEY_PARAM = defineSecret("SENDGRID_API_KEY");
// export const FRONTEND_URL_PARAM = defineString("FRONTEND_URL");
// export const EMULATOR_PUBLIC_FRONTEND_URL_PARAM = defineString("EMULATOR_PUBLIC_FRONTEND_URL", {
//   description: 'Publicly accessible URL for the frontend when testing with emulators.',
//   default: ""
// });


// --- Bestehende Getter-Funktionen (JETZT MIT KORRIGIERTER LOGIK) ---

export function getStripeInstance(stripeKey: string): Stripe {
  if (!stripeClientInstance) {
    // Der Stripe-Schlüssel wird jetzt als Parameter übergeben.

    if (stripeKey) {
      try {
        stripeClientInstance = new Stripe(stripeKey, {
          typescript: true,
          apiVersion: "2025-05-28.basil",
        });
        logger.info("[getStripeInstance] Stripe-Client erfolgreich initialisiert.");
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
  }
  return stripeClientInstance!;
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

// --- Hilfstypen und Admin-Export ---
export { FieldValue, Timestamp, admin };