// /Users/andystaudinger/Tasko/firebase_functions/src/helpers.ts

import { initializeApp, getApps, App as AdminApp } from "firebase-admin/app";
import { getFirestore, Firestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import sendgridMail from "@sendgrid/mail";
import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { defineString, defineSecret } from "firebase-functions/params";

// --- Instanz-Variablen für Lazy Loading ---
// Diese Variablen speichern die initialisierten Instanzen, um zu verhindern,
// dass sie bei jedem Aufruf neu erstellt werden.
let dbInstance: Firestore;
let storageInstance: Storage;
let stripeClientInstance: Stripe | undefined;
let sendgridClientConfigured: boolean = false;


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

  // Emulator-spezifische Konfigurationen, falls zutreffend.
  // Hinweis: Diese Firestore-Verbindung hier ist nur für die Settings und
  // wird nicht für die Instanz-Erstellung der Funktion verwendet.
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    try {
      getFirestore(app).settings({
        host: 'localhost:8080',
        ssl: false,
      });
      logger.info("[getAdminApp] Firestore Admin SDK mit Emulator verbunden.");
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes("Firestore has already been started")) {
        logger.warn("[getAdminApp] Firestore-Instanz wurde bereits gestartet (erwartetes Verhalten).");
      } else {
        let errorMessage = "Unbekannter Fehler bei der Verbindung zum Firestore Emulator.";
        if (e instanceof Error) {
          errorMessage = e.message;
        }
        logger.error("[getAdminApp] Fehler bei der Verbindung zum Firestore Emulator:", errorMessage);
      }
    }
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

export function getStripeInstance(): Stripe {
  if (!stripeClientInstance) {
    const env = process.env as NodeJS.ProcessEnv;
    // ALT (verursacht Fehler): const stripeKey = env.FUNCTIONS_EMULATOR === 'true' ? env.STRIPE_SECRET_KEY : STRIPE_SECRET_KEY_PARAM.value();
    // NEU (korrigiert):
    const stripeKey = env.FUNCTIONS_EMULATOR === 'true' ? env.STRIPE_SECRET_KEY : defineSecret("STRIPE_SECRET_KEY").value();

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

export function getSendGridClient(): typeof sendgridMail | undefined {
  if (!sendgridClientConfigured) {
    const env = process.env as NodeJS.ProcessEnv;
    // ALT (verursacht Fehler): const sendgridKey = env.FUNCTIONS_EMULATOR === 'true' ? env.SENDGRID_API_KEY : SENDGRID_API_KEY_PARAM.value();
    // NEU (korrigiert):
    const sendgridKey = env.FUNCTIONS_EMULATOR === 'true' ? env.SENDGRID_API_KEY : defineSecret("SENDGRID_API_KEY").value();

    if (sendgridKey) {
      try {
        sendgridMail.setApiKey(sendgridKey);
        sendgridClientConfigured = true;
        logger.info("[getSendGridClient] SendGrid-Client erfolgreich initialisiert.");
      } catch (e: unknown) {
        let errorMessage = "Unbekannter Fehler bei der Initialisierung des SendGrid-Clients.";
        if (e instanceof Error) {
          errorMessage = e.message;
        }
        logger.error("KRITISCH: Fehler bei der Initialisierung des SendGrid-Clients.", { error: errorMessage, at: 'getSendGridClient' });
        return undefined;
      }
    } else {
      logger.warn("SENDGRID_API_KEY nicht verfügbar. E-Mail-Versand wird fehlschlagen.", { at: 'getSendGridClient' });
      return undefined;
    }
  }
  return sendgridClientConfigured ? sendgridMail : undefined;
}

/**
 * Gibt die öffentlich zugängliche Frontend-URL zurück (Live-URL im Prod, oder die in .env.local gesetzte Live-URL im Emulator).
 * Diese URL ist für Dienste wie Stripe Business Profile URL gedacht.
 */
export function getPublicFrontendURL(): string {
  const env = process.env as NodeJS.ProcessEnv;
  if (env.FUNCTIONS_EMULATOR === 'true' || env.FIREBASE_EMULATOR_HOST) {
    const emulatorLiveSimulatedUrl = env.FRONTEND_URL;
    if (emulatorLiveSimulatedUrl?.startsWith('http')) {
      logger.info("[getPublicFrontendURL] Liefere Emulator (simulierte Live)-URL.");
      return emulatorLiveSimulatedUrl;
    }
    logger.error("[getPublicFrontendURL] FRONTEND_URL ist im Emulator nicht korrekt konfiguriert oder ungültig.", { url: emulatorLiveSimulatedUrl });
    throw new HttpsError("internal", "Öffentliche Frontend URL ist im Emulator nicht korrekt konfiguriert (FRONTEND_URL in .env.local fehlt/ist ungültig).");
  } else {
    // ALT (verursacht Fehler): const liveUrl = FRONTEND_URL_PARAM.value();
    // NEU (korrigiert):
    const liveUrl = defineString("FRONTEND_URL").value();
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
export function getEmulatorCallbackFrontendURL(): string {
  const env = process.env as NodeJS.ProcessEnv;
  if (env.FUNCTIONS_EMULATOR === 'true' || env.FIREBASE_EMULATOR_HOST) {
    // Dieser Teil ist schnell und benötigt keine Änderung
    const emulatorLocalUrl = env.EMULATOR_PUBLIC_FRONTEND_URL;
    if (emulatorLocalUrl?.startsWith('http')) {
      logger.info("[getEmulatorCallbackFrontendURL] Liefere lokale Emulator-URL.");
      return emulatorLocalUrl;
    }
    logger.warn("[getEmulatorCallbackFrontendURL] EMULATOR_PUBLIC_FRONTEND_URL nicht gesetzt oder ungültig. Fallback auf localhost:3000.");
    return 'http://localhost:3000';
  }
  logger.info("[getEmulatorCallbackFrontendURL] Im Live-Betrieb: Liefere Live-URL (wie getPublicFrontendURL).");
  return getPublicFrontendURL();
}

/**
 * Allgemeine Hilfsfunktion für die Frontend-URL.
 */
export function getFrontendURL(): string {
  const env = process.env as NodeJS.ProcessEnv;
  if (env.FUNCTIONS_EMULATOR === 'true' || env.FIREBASE_EMULATOR_HOST) {
    return getEmulatorCallbackFrontendURL();
  }
  // ALT (verursacht Fehler): return FRONTEND_URL_PARAM.value();
  // NEU (korrigiert):
  return defineString("FRONTEND_URL").value();
}


export function getStripeWebhookSecret(): string {
  const env = process.env as NodeJS.ProcessEnv;
  // ALT (verursacht Fehler): const webhookSecret = env.FUNCTIONS_EMULATOR === 'true' ? env.STRIPE_WEBHOOK_SECRET : STRIPE_WEBHOOK_SECRET_PARAM.value();
  // NEU (korrigiert):
  const webhookSecret = env.FUNCTIONS_EMULATOR === 'true' ? env.STRIPE_WEBHOOK_SECRET : defineSecret("STRIPE_WEBHOOK_SECRET").value();

  if (webhookSecret) return webhookSecret;

  if (env.FUNCTIONS_EMULATOR === 'true') {
    throw new HttpsError("internal", "Stripe Webhook Secret ist im Emulator nicht konfiguriert.");
  } else {
    throw new HttpsError("internal", "Stripe Webhook Secret ist nicht konfiguriert.");
  }
}

// --- Hilfstypen und Admin-Export ---
export { FieldValue, Timestamp, admin };
export type { MailDataRequired } from "@sendgrid/mail";