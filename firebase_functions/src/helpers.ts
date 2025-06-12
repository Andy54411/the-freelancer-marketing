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

/**
 * Initialisiert und gibt die Firebase Admin App Instanz zurück.
 * Diese Funktion verwendet die Standard-Initialisierung, die sowohl in der Cloud
 * als auch im Emulator mit der Umgebungsvariable GOOGLE_APPLICATION_CREDENTIALS funktioniert.
 */
function getAdminApp(): AdminApp {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const app = initializeApp();
  logger.info("Admin SDK erfolgreich initialisiert.");

  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    try {
      getFirestore(app).settings({
        host: 'localhost:8080', // Standard-Host für den Firestore-Emulator
        ssl: false,
      });
      logger.info("[getAdminApp] Firestore Admin SDK mit Emulator verbunden.");
    } catch (e: unknown) { // <-- Geändert von 'any' zu 'unknown'
      // Spezifischen Fehler abfangen, der auftritt, wenn Firestore bereits initialisiert wurde
      if (e instanceof Error && e.message.includes("Firestore has already been started")) {
        // Ignorieren, da dies ein erwartetes Verhalten bei mehrfacher Initialisierung sein kann
        logger.warn("[getAdminApp] Firestore-Instanz wurde bereits gestartet (erwartet bei erneuter Verbindung).");
      } else {
        // Andere unerwartete Fehler bei der Firestore-Verbindung loggen
        let errorMessage = "Unbekannter Fehler bei der Verbindung zum Firestore Emulator.";
        if (e instanceof Error) {
          errorMessage = e.message;
        } else if (typeof e === 'object' && e !== null && 'message' in e && typeof e.message === 'string') {
          errorMessage = e.message;
        }
        logger.error("[getAdminApp] Fehler bei der Verbindung zum Firestore Emulator:", errorMessage);
      }
    }
  }

  return app;
}

export const db: Firestore = getFirestore(getAdminApp());

export function getFirebaseAdminStorage(): Storage {
  return getStorage(getAdminApp());
}

let stripeClientInstance: Stripe | undefined;
let sendgridClientConfigured: boolean = false;

export const STRIPE_SECRET_KEY_PARAM = defineSecret("STRIPE_SECRET_KEY");
export const STRIPE_WEBHOOK_SECRET_PARAM = defineSecret("STRIPE_WEBHOOK_SECRET");
export const SENDGRID_API_KEY_PARAM = defineSecret("SENDGRID_API_KEY");
export const FRONTEND_URL_PARAM = defineString("FRONTEND_URL");
export const EMULATOR_PUBLIC_FRONTEND_URL_PARAM = defineString("EMULATOR_PUBLIC_FRONTEND_URL", {
  description: 'Publicly accessible URL for the frontend when testing with emulators.',
  default: ""
});

export function getStripeInstance(): Stripe {
  if (!stripeClientInstance) {
    const env = process.env as NodeJS.ProcessEnv;
    // Im Emulator muss der Stripe Secret Key direkt aus process.env gelesen werden.
    // Für die Bereitstellung wird STRIPE_SECRET_KEY_PARAM.value() verwendet.
    const stripeKey = env.FUNCTIONS_EMULATOR === 'true' ? env.STRIPE_SECRET_KEY : STRIPE_SECRET_KEY_PARAM.value();

    if (stripeKey) {
      try {
        stripeClientInstance = new Stripe(stripeKey, {
          typescript: true,
          apiVersion: "2025-05-28.basil",
        });
        logger.info("[getStripeInstance] Stripe-Client erfolgreich initialisiert.");
      } catch (e: unknown) { // <-- Geändert von 'any' zu 'unknown'
        let errorMessage = "Unbekannter Fehler bei der Initialisierung des Stripe-Clients.";
        if (e instanceof Error) {
          errorMessage = e.message;
        } else if (typeof e === 'object' && e !== null && 'message' in e && typeof e.message === 'string') {
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
    // Im Emulator muss der SendGrid API Key direkt aus process.env gelesen werden.
    const sendgridKey = env.FUNCTIONS_EMULATOR === 'true' ? env.SENDGRID_API_KEY : SENDGRID_API_KEY_PARAM.value();

    if (sendgridKey) {
      try {
        sendgridMail.setApiKey(sendgridKey);
        sendgridClientConfigured = true;
        logger.info("[getSendGridClient] SendGrid-Client erfolgreich initialisiert.");
      } catch (e: unknown) { // <-- Geändert von 'any' zu 'unknown'
        let errorMessage = "Unbekannter Fehler bei der Initialisierung des SendGrid-Clients.";
        if (e instanceof Error) {
          errorMessage = e.message;
        } else if (typeof e === 'object' && e !== null && 'message' in e && typeof e.message === 'string') {
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
  // Unterscheide zwischen Emulator und Live-Umgebung
  if (env.FUNCTIONS_EMULATOR === 'true' || env.FIREBASE_EMULATOR_HOST) {
    // Im Emulator: Lese den Wert direkt aus process.env
    const emulatorLiveSimulatedUrl = env.FRONTEND_URL;
    if (emulatorLiveSimulatedUrl?.startsWith('http')) {
      logger.info("[getPublicFrontendURL] Liefere Emulator (simulierte Live)-URL.");
      return emulatorLiveSimulatedUrl;
    }
    // Wenn FRONTEND_URL in .env.local nicht gesetzt oder ungültig ist
    logger.error("[getPublicFrontendURL] FRONTEND_URL ist im Emulator nicht korrekt konfiguriert oder ungültig.", { url: emulatorLiveSimulatedUrl });
    throw new HttpsError("internal", "Öffentliche Frontend URL ist im Emulator nicht korrekt konfiguriert (FRONTEND_URL in .env.local fehlt/ist ungültig).");
  } else {
    // Im Live-Betrieb: Verwende den über Functions Parameter definierten Wert
    const liveUrl = FRONTEND_URL_PARAM.value();
    if (liveUrl?.startsWith('http')) {
      logger.info("[getPublicFrontendURL] Liefere Live-URL.");
      return liveUrl;
    }
    // Wenn FRONTEND_URL Parameter nicht gesetzt oder ungültig ist
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
    // Im Emulator: Lese den Wert direkt aus process.env
    const emulatorLocalUrl = env.EMULATOR_PUBLIC_FRONTEND_URL;
    if (emulatorLocalUrl?.startsWith('http')) {
      logger.info("[getEmulatorCallbackFrontendURL] Liefere lokale Emulator-URL.");
      return emulatorLocalUrl;
    }
    logger.warn("[getEmulatorCallbackFrontendURL] EMULATOR_PUBLIC_FRONTEND_URL nicht gesetzt oder ungültig. Fallback auf localhost:3000.");
    return 'http://localhost:3000'; // Standard-Fallback für lokalen Frontend-Zugriff
  }
  // Im Live-Betrieb: Diese Funktion sollte idealerweise nicht für Callbacks verwendet werden,
  // die lokal sein müssen. Hier ist es ein Fallback auf die öffentliche URL.
  logger.info("[getEmulatorCallbackFrontendURL] Im Live-Betrieb: Liefere Live-URL (wie getPublicFrontendURL).");
  return getPublicFrontendURL();
}

/**
 * Allgemeine Hilfsfunktion für die Frontend-URL.
 * Gibt im Emulator die lokale Callback-URL zurück, im Live-Betrieb die öffentliche.
 * Wenn Sie spezifisch die öffentliche URL für Stripe Business Profile benötigen,
 * nutzen Sie getPublicFrontendURL().
 */
export function getFrontendURL(): string {
  const env = process.env as NodeJS.ProcessEnv;
  if (env.FUNCTIONS_EMULATOR === 'true' || env.FIREBASE_EMULATOR_HOST) {
    return getEmulatorCallbackFrontendURL(); // Für allgemeine Frontend-Referenzen im Emulator
  }
  // Für den Live-Betrieb ist es einfach die definierte FRONTEND_URL.
  return FRONTEND_URL_PARAM.value();
}


export function getStripeWebhookSecret(): string {
  const env = process.env as NodeJS.ProcessEnv;
  // Im Emulator muss der Webhook Secret direkt aus process.env gelesen werden.
  const webhookSecret = env.FUNCTIONS_EMULATOR === 'true' ? env.STRIPE_WEBHOOK_SECRET : STRIPE_WEBHOOK_SECRET_PARAM.value();

  if (webhookSecret) return webhookSecret;

  if (env.FUNCTIONS_EMULATOR === 'true') {
    throw new HttpsError("internal", "Stripe Webhook Secret ist im Emulator nicht konfiguriert.");
  } else {
    throw new HttpsError("internal", "Stripe Webhook Secret ist nicht konfiguriert.");
  }
}

export { FieldValue, Timestamp, admin };
export type { MailDataRequired } from "@sendgrid/mail";