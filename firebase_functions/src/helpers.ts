import { initializeApp, getApps, App as AdminApp } from "firebase-admin/app";
import { getFirestore, Firestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import sendgridMail from "@sendgrid/mail";
import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { defineString, defineSecret } from "firebase-functions/params";

function getAdminApp(): AdminApp {
  if (getApps().length === 0) {
    initializeApp();
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
      try {
        getFirestore().settings({
          host: 'localhost:8080',
          ssl: false,
        });
      } catch (e: any) {
        if (!e.message.includes("Firestore has already been started")) {
          logger.error("Fehler bei der Verbindung zum Firestore Emulator:", e);
        }
      }
    }
  }
  return getApps()[0];
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
  description: 'Publicly accessible URL for the frontend when testing with emulators, e.g., for Stripe webhooks or business profile URL. Should be set in .env for functions (e.g., http://localhost:3000).',
  default: ""
});

export function getStripeInstance(): Stripe {
  if (!stripeClientInstance) {
    const stripeKey = process.env.FUNCTIONS_EMULATOR === 'true' ? process.env.STRIPE_SECRET_KEY : STRIPE_SECRET_KEY_PARAM.value();
    if (stripeKey) {
      try {
        stripeClientInstance = new Stripe(stripeKey, {
          typescript: true,
          apiVersion: "2025-05-28.basil",
        });
      } catch (e: any) {
        logger.error("KRITISCH: Fehler bei der Initialisierung des Stripe-Clients.", { error: e.message, stack: e.stack });
        throw new HttpsError("internal", `Stripe ist auf dem Server nicht korrekt konfiguriert: ${e.message}`);
      }
    } else {
      logger.error("KRITISCH: STRIPE_SECRET_KEY Parameterwert nicht verfügbar! Stripe-Client kann nicht initialisiert werden.");
      throw new HttpsError("internal", "Stripe ist auf dem Server nicht korrekt konfiguriert (Secret fehlt).");
    }
  }
  return stripeClientInstance!;
}

export function getSendGridClient(): typeof sendgridMail | undefined {
  if (!sendgridClientConfigured) {
    const sendgridKey = process.env.FUNCTIONS_EMULATOR === 'true' ? process.env.SENDGRID_API_KEY : SENDGRID_API_KEY_PARAM.value();
    if (sendgridKey) {
      try {
        if (sendgridMail && typeof sendgridMail.setApiKey === "function") {
          sendgridMail.setApiKey(sendgridKey);
          sendgridClientConfigured = true;
        } else {
          logger.error("SendGrid Mail Objekt oder setApiKey Methode nicht verfügbar (bei getSendGridClient).");
          return undefined;
        }
      } catch (e: any) {
        logger.error("KRITISCH: Fehler bei der Initialisierung des SendGrid-Clients.", { error: e.message, stack: e.stack });
        return undefined;
      }
    } else {
      logger.warn("SENDGRID_API_KEY Parameterwert nicht verfügbar. E-Mail-Versand wird fehlschlagen.");
      return undefined;
    }
  }
  return sendgridClientConfigured ? sendgridMail : undefined;
}

export function getFrontendURL(): string {
  if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.FIREBASE_EMULATOR_HOST) {
    const emulatorPublicUrl = process.env.EMULATOR_PUBLIC_FRONTEND_URL;
    if (emulatorPublicUrl && typeof emulatorPublicUrl === 'string' && emulatorPublicUrl.startsWith('http')) {
      return emulatorPublicUrl;
    }
    const generalFrontendUrl = process.env.FRONTEND_URL;
    if (generalFrontendUrl && typeof generalFrontendUrl === 'string' && generalFrontendUrl.startsWith('http')) {
      return generalFrontendUrl;
    }
    return 'http://localhost:3000';
  }
  const liveUrl = FRONTEND_URL_PARAM.value();
  if (liveUrl && typeof liveUrl === 'string' && liveUrl.startsWith('http')) {
    return liveUrl;
  }
  throw new HttpsError("internal", "Frontend URL ist auf dem Server nicht korrekt konfiguriert.");
}

export function getStripeWebhookSecret(): string {
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (secret) {
      return secret;
    }
    throw new HttpsError("internal", "Stripe Webhook Secret ist im Emulator nicht konfiguriert.");
  }
  const secret = STRIPE_WEBHOOK_SECRET_PARAM.value();
  if (secret) {
    return secret;
  }
  throw new HttpsError("internal", "Stripe Webhook Secret ist nicht konfiguriert.");
}

export { FieldValue, Timestamp, admin };
export type { MailDataRequired } from "@sendgrid/mail";