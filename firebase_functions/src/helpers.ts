// /Users/andystaudinger/Tilvo/functions/src/helpers.ts

import { getApps, initializeApp as initializeAdminApp, type App as AdminApp } from "firebase-admin/app";
import { getFirestore as getAdminFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage as getAdminStorage, type Storage } from "firebase-admin/storage";
import * as admin from "firebase-admin";

import Stripe from "stripe";
import sendgridMail from "@sendgrid/mail";
import { HttpsError } from "firebase-functions/v2/https";
import { logger as loggerV2 } from "firebase-functions/v2";
import { defineString, defineSecret } from "firebase-functions/params";

let _adminApp: AdminApp;
try {
  if (getApps().length === 0) {
    _adminApp = initializeAdminApp();
    loggerV2.info("Firebase Admin SDK (Default App) erfolgreich initialisiert.");
  } else {
    _adminApp = getApps()[0];
    loggerV2.info("Firebase Admin SDK (Default App) bereits initialisiert, verwende existierende Instanz.");
  }
} catch (e: any) {
  loggerV2.error("CRITICAL: Firebase Admin SDK initialization failed.", { error: e.message, stack: e.stack });
  throw new Error(`Firebase Admin SDK could not be initialized: ${e.message}`);
}

export const db = getAdminFirestore(_adminApp);
export const adminAppInstance = _adminApp;

let stripeClientInstance: Stripe | undefined;
let sendgridClientConfigured: boolean = false;
let storageInstanceCache: Storage | undefined;

const STRIPE_SECRET_KEY_PARAM = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET_PARAM = defineSecret("STRIPE_WEBHOOK_SECRET");
const SENDGRID_API_KEY_PARAM = defineSecret("SENDGRID_API_KEY");
const FRONTEND_URL_PARAM = defineString("FRONTEND_URL");
const EMULATOR_PUBLIC_FRONTEND_URL_PARAM = defineString("EMULATOR_PUBLIC_FRONTEND_URL", {
  description: 'Publicly accessible URL for the frontend when testing with emulators, e.g., for Stripe webhooks or business profile URL. Should be set in .env.local for functions.',
  default: "" // Wird in .env.local gesetzt, z.B. auf https://dev.tilvo.de
});

export function getStorageInstance(): Storage {
  if (!storageInstanceCache) {
    loggerV2.debug("[getStorageInstance] Versuche, Storage-Instanz zu initialisieren.");
    try {
      storageInstanceCache = getAdminStorage(_adminApp);
      loggerV2.info("Firebase Storage-Client bei Bedarf initialisiert.");
    } catch (e: any) {
      loggerV2.error("CRITICAL: Fehler bei getAdminStorage(_adminApp) Aufruf.", { error: e.message, stack: e.stack });
      throw new HttpsError("internal", "Firebase Admin Storage Service konnte nicht initialisiert werden.");
    }
  }
  if (!storageInstanceCache) {
    loggerV2.error("CRITICAL: storageInstanceCache ist nach Initialisierungsversuch immer noch undefined.");
    throw new HttpsError("internal", "Firebase Admin Storage Service Initialisierung ergab undefined.");
  }
  return storageInstanceCache;
}

export function getStripeInstance(): Stripe {
  if (!stripeClientInstance) {
    const stripeKey = STRIPE_SECRET_KEY_PARAM.value();
    if (stripeKey) {
      stripeClientInstance = new Stripe(stripeKey, {
        typescript: true,
        apiVersion: "2025-05-28.basil",
      });
      loggerV2.info("Stripe-Client bei Bedarf initialisiert.");
    } else {
      loggerV2.error("KRITISCH: STRIPE_SECRET_KEY Parameterwert nicht verfügbar! Stripe-Client kann nicht initialisiert werden.");
      throw new HttpsError("internal", "Stripe ist auf dem Server nicht korrekt konfiguriert (Secret fehlt).");
    }
  }
  return stripeClientInstance;
}

export function getSendGridClient(): typeof sendgridMail | undefined {
  if (!sendgridClientConfigured) {
    const sendgridKey = SENDGRID_API_KEY_PARAM.value();
    if (sendgridKey) {
      if (sendgridMail && typeof sendgridMail.setApiKey === "function") {
        sendgridMail.setApiKey(sendgridKey);
        sendgridClientConfigured = true;
        loggerV2.info("SendGrid API Key bei Bedarf initialisiert.");
      } else {
        loggerV2.error("SendGrid Mail Objekt oder setApiKey Methode nicht verfügbar (bei getSendGridClient).");
        return undefined;
      }
    } else {
      loggerV2.warn("SENDGRID_API_KEY Parameterwert nicht verfügbar. E-Mail-Versand wird fehlschlagen.");
      return undefined;
    }
  }
  return sendgridClientConfigured ? sendgridMail : undefined;
}

export function getFrontendURL(): string {
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    const emulatorPublicUrl = EMULATOR_PUBLIC_FRONTEND_URL_PARAM.value();
    if (emulatorPublicUrl && emulatorPublicUrl.startsWith('http')) {
      loggerV2.info(`[getFrontendURL] Emulator-Modus: Verwende EMULATOR_PUBLIC_FRONTEND_URL: ${emulatorPublicUrl}`);
      return emulatorPublicUrl;
    }
    // Fallback zur normalen FRONTEND_URL (http://localhost:3000) für den Emulator, wenn keine spezielle öffentliche URL gesetzt ist.
    const localUrl = FRONTEND_URL_PARAM.value();
    loggerV2.warn(`[getFrontendURL] Emulator-Modus: EMULATOR_PUBLIC_FRONTEND_URL nicht (korrekt) gesetzt. Fallback auf lokale FRONTEND_URL: ${localUrl}. Dies kann für Stripe's business_profile.url ungültig sein.`);
    // Stelle sicher, dass auch hier ein gültiger Default zurückgegeben wird, falls FRONTEND_URL_PARAM leer ist.
    return localUrl || 'http://localhost:3000'; // Fallback, falls FRONTEND_URL nicht in .env.local gesetzt ist
  }

  // Für den Live-Betrieb
  const liveUrl = FRONTEND_URL_PARAM.value();
  if (liveUrl && liveUrl.startsWith('http')) {
    return liveUrl;
  }

  loggerV2.error("KRITISCH: FRONTEND_URL Parameterwert nicht verfügbar oder ungültig für Live-Betrieb.");
  throw new HttpsError("internal", "Frontend URL ist auf dem Server nicht korrekt konfiguriert.");
}

export function getStripeWebhookSecret(): string {
  const secret = STRIPE_WEBHOOK_SECRET_PARAM.value();
  if (secret) {
    return secret;
  }
  loggerV2.error("KRITISCH: Stripe Webhook Secret Parameterwert nicht verfügbar.");
  throw new HttpsError("internal", "Stripe Webhook Secret ist nicht konfiguriert.");
}

export { FieldValue, Timestamp, admin };
export type { MailDataRequired } from "@sendgrid/mail";