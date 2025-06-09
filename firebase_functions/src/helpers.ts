// /Users/andystaudinger/Tasko/firebase_functions/src/helpers.ts

import { getApps, initializeApp as initializeAdminApp, type App as AdminApp } from "firebase-admin/app";
import { getFirestore as getAdminFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage as getAdminStorage, type Storage } from "firebase-admin/storage";
import { getAuth as getAdminAuth } from "firebase-admin/auth";

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

    if (process.env.FUNCTIONS_EMULATOR === 'true') {
      loggerV2.info("FUNCTIONS_EMULATOR ist 'true'. Versuche, Emulatoren zu verbinden.");

      // Firestore Emulator verbinden
      try {
        getAdminFirestore(_adminApp).settings({
          host: 'localhost:8080', // Standard-Firestore-Emulator-Host
          ssl: false, // Wichtig: Für lokale Emulatoren ist SSL auf false zu setzen
        });
        loggerV2.info("Firestore Admin SDK auf Emulator umgeleitet (localhost:8080).");
      } catch (e: any) {
        // Dieser Fehler wird in der Regel bei Hot-Reloading auftreten, wenn settings bereits gesetzt sind.
        // Er ist dann harmlos, aber wir loggen ihn trotzdem, wenn er nicht der bekannte Typ ist.
        if (!e.message.includes("Firestore has already been started")) {
          loggerV2.error("Fehler beim Umleiten des Firestore Admin SDK auf Emulator:", e);
        }
      }
    }

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

// KORRIGIERT: Expliziter Export für getFirebaseAdminStorage
export function getFirebaseAdminStorage(): Storage {
  return getAdminStorage(_adminApp);
}

let stripeClientInstance: Stripe | undefined;
let sendgridClientConfigured: boolean = false;

// Umgebungsvariablen-Parameter für Firebase Functions (defineSecret/defineString)
// Diese werden über `firebase functions:config:set` oder `firebase deploy --env-vars` konfiguriert.
// Im Emulator-Modus werden sie DIREKT aus process.env gelesen.
export const STRIPE_SECRET_KEY_PARAM = defineSecret("STRIPE_SECRET_KEY");
export const STRIPE_WEBHOOK_SECRET_PARAM = defineSecret("STRIPE_WEBHOOK_SECRET");
export const SENDGRID_API_KEY_PARAM = defineSecret("SENDGRID_API_KEY");
export const FRONTEND_URL_PARAM = defineString("FRONTEND_URL");
export const EMULATOR_PUBLIC_FRONTEND_URL_PARAM = defineString("EMULATOR_PUBLIC_FRONTEND_URL", {
  description: 'Publicly accessible URL for the frontend when testing with emulators, e.g., for Stripe webhooks or business profile URL. Should be set in .env for functions (e.g., http://localhost:3000).',
  default: "" // Dieser Defaultwert wird in der Cloud nicht verwendet, im Emulator aber als Fallback, wenn process.env nicht gesetzt ist.
});


export function getStripeInstance(): Stripe {
  if (!stripeClientInstance) {
    const stripeKey = process.env.FUNCTIONS_EMULATOR === 'true' ? process.env.STRIPE_SECRET_KEY : STRIPE_SECRET_KEY_PARAM.value();

    if (stripeKey) {
      stripeClientInstance = new Stripe(stripeKey, {
        typescript: true,
        apiVersion: "2025-05-28.basil", // Sicherstellen, dass die API-Version korrekt ist. "2025-05-28.basil" ist kein Standardformat.
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
    const sendgridKey = process.env.FUNCTIONS_EMULATOR === 'true' ? process.env.SENDGRID_API_KEY : SENDGRID_API_KEY_PARAM.value();

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
  // Im Emulator-Modus (FUNCTIONS_EMULATOR='true' oder FIREBASE_EMULATOR_HOST gesetzt)
  if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.FIREBASE_EMULATOR_HOST) {
    // Versuche zuerst die Emulator-spezifische öffentliche URL (von .env für Functions)
    const emulatorPublicUrl = process.env.EMULATOR_PUBLIC_FRONTEND_URL;
    if (emulatorPublicUrl && typeof emulatorPublicUrl === 'string' && emulatorPublicUrl.startsWith('http')) {
      loggerV2.info(`[getFrontendURL] Emulator-Modus: Verwende EMULATOR_PUBLIC_FRONTEND_URL aus process.env: ${emulatorPublicUrl}`);
      return emulatorPublicUrl;
    }

    // Fallback auf die allgemeinere Frontend URL, falls die Emulator-spezifische nicht gesetzt ist
    // (Diese könnte auch von `firebase functions:config:set frontend_url="..."` kommen)
    const generalFrontendUrl = process.env.FRONTEND_URL;
    if (generalFrontendUrl && typeof generalFrontendUrl === 'string' && generalFrontendUrl.startsWith('http')) {
      loggerV2.warn(`[getFrontendURL] Emulator-Modus: EMULATOR_PUBLIC_FRONTEND_URL nicht (korrekt) in process.env gesetzt. Fallback auf process.env.FRONTEND_URL: ${generalFrontendUrl}.`);
      return generalFrontendUrl;
    }

    loggerV2.error("KRITISCH: Im Emulator-Modus konnte weder EMULATOR_PUBLIC_FRONTEND_URL noch FRONTEND_URL aus process.env gelesen werden. Fallback auf localhost:3000.");
    return 'http://localhost:3000'; // Letzter Fallback
  }

  // Live-Betrieb: Liest von defineString().value() (Dies ist der korrekte Weg für die Cloud)
  const liveUrl = FRONTEND_URL_PARAM.value();
  if (liveUrl && typeof liveUrl === 'string' && liveUrl.startsWith('http')) {
    return liveUrl;
  }

  loggerV2.error("KRITISCH: FRONTEND_URL in Konfiguration nicht verfügbar oder ungültig für Live-Betrieb.");
  throw new HttpsError("internal", "Frontend URL ist auf dem Server nicht korrekt konfiguriert.");
}

export function getStripeWebhookSecret(): string {
  // Im Emulator-Modus liest man direkt aus process.env
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (secret) {
      return secret;
    }
    loggerV2.error("KRITISCH: Im Emulator-Modus ist STRIPE_WEBHOOK_SECRET in process.env nicht gesetzt.");
    throw new HttpsError("internal", "Stripe Webhook Secret ist im Emulator nicht konfiguriert.");
  }
  // Live-Betrieb: Liest von defineSecret().value()
  const secret = STRIPE_WEBHOOK_SECRET_PARAM.value();
  if (secret) {
    return secret;
  }
  loggerV2.error("KRITISCH: Stripe Webhook Secret in Konfiguration nicht verfügbar.");
  throw new HttpsError("internal", "Stripe Webhook Secret ist nicht konfiguriert.");
}

export { FieldValue, Timestamp, admin };
export type { MailDataRequired } from "@sendgrid/mail";