// /Users/andystaudinger/Tasko/firebase_functions/src/helpers.ts

import { getApps, initializeApp as initializeAdminApp, type App as AdminApp } from "firebase-admin/app";
import { getFirestore as getAdminFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage as getAdminStorage, type Storage } from "firebase-admin/storage";
import * as admin from "firebase-admin"; // <- Muss hier importiert bleiben, um typen zu nutzen
import Stripe from "stripe";
import sendgridMail from "@sendgrid/mail";
import { HttpsError } from "firebase-functions/v2/https";
import { logger as loggerV2 } from "firebase-functions/v2";
import { defineString, defineSecret } from "firebase-functions/params";

// Initialisierung der Admin SDK App wird NUR in index.ts gemacht.
// Hier greifen wir auf die bereits initialisierte App zu.
let _adminApp: AdminApp;
try {
  // getApps() sollte hier nicht leer sein, wenn index.ts zuerst geladen wird.
  // Wenn es leer ist, bedeutet das einen Fehler im Initialisierungsablauf.
  if (getApps().length === 0) {
    loggerV2.error("CRITICAL: Firebase Admin App wurde NICHT vor helpers.ts initialisiert! Bitte prüfen Sie index.ts.");
    throw new Error("Firebase Admin App nicht initialisiert in helpers.");
  }
  _adminApp = getApps()[0]; // Hole die erste (Standard-)App-Instanz

  // Wenn FUNCTIONS_EMULATOR=true, verbinde mit Emulatoren.
  // DIESER TEIL MUSS HIER BLEIBEN, DA ER DIE DATENBANK-INITIALISIERUNG BEEINFLUSST.
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    loggerV2.info("FUNCTIONS_EMULATOR ist 'true'. Versuche, Emulatoren zu verbinden.");
    try {
      // getAdminFirestore(_adminApp) muss HIER aufgerufen werden, damit die Firestore-Instanz
      // mit den Emulator-Settings verbunden wird, BEVOR sie exportiert wird.
      getAdminFirestore(_adminApp).settings({
        host: 'localhost:8080', // Standard-Firestore-Emulator-Host
        ssl: false, // Wichtig: Für lokale Emulatoren ist SSL auf false zu setzen
      });
      loggerV2.info("Firestore Admin SDK auf Emulator umgeleitet (localhost:8080).");
    } catch (e: any) {
      if (!e.message.includes("Firestore has already been started")) {
        loggerV2.error("Fehler beim Umleiten des Firestore Admin SDK auf Emulator:", e);
      }
    }
  }

} catch (e: any) {
  loggerV2.error("CRITICAL: Fehler beim Zugriff auf/Konfigurieren der Firebase Admin SDK App in helpers.", { error: e.message, stack: e.stack });
  throw new Error(`Firebase Admin SDK in helpers konnte nicht korrekt konfiguriert werden: ${e.message}`);
}

// Exportiere db und adminAppInstance basierend auf der geholten Instanz.
// Die Initialisierung der App (_adminApp) selbst erfolgt durch initializeApp() in index.ts.
export const db = getAdminFirestore(_adminApp); // <- Dies ist der korrekte Export von db
export const adminAppInstance = _adminApp;

export function getFirebaseAdminStorage(): Storage {
  // _adminApp sollte hier immer initialisiert sein, wenn der Ablauf korrekt ist.
  if (!_adminApp) {
    loggerV2.error("CRITICAL: Firebase Admin App nicht initialisiert in getFirebaseAdminStorage.");
    throw new HttpsError("internal", "Firebase Admin App nicht verfügbar.");
  }
  return getAdminStorage(_adminApp);
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
      try { // Füge try-catch hinzu, um Initialisierungsfehler abzufangen
        stripeClientInstance = new Stripe(stripeKey, {
          typescript: true,
          apiVersion: "2025-05-28.basil", // KORRIGIERT: API-Version an den erwarteten Typ anpassen
        });
        loggerV2.info("Stripe-Client bei Bedarf initialisiert."); // Protokollierung in Funktion
      } catch (e: any) {
        loggerV2.error("KRITISCH: Fehler bei der Initialisierung des Stripe-Clients.", { error: e.message, stack: e.stack });
        throw new HttpsError("internal", `Stripe ist auf dem Server nicht korrekt konfiguriert: ${e.message}`);
      }
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
      try { // Füge try-catch hinzu
        if (sendgridMail && typeof sendgridMail.setApiKey === "function") {
          sendgridMail.setApiKey(sendgridKey);
          sendgridClientConfigured = true;
          loggerV2.info("SendGrid API Key bei Bedarf initialisiert."); // Protokollierung in Funktion
        } else {
          loggerV2.error("SendGrid Mail Objekt oder setApiKey Methode nicht verfügbar (bei getSendGridClient).");
          return undefined;
        }
      } catch (e: any) {
        loggerV2.error("KRITISCH: Fehler bei der Initialisierung des SendGrid-Clients.", { error: e.message, stack: e.stack });
        return undefined;
      }
    } else {
      loggerV2.warn("SENDGRID_API_KEY Parameterwert nicht verfügbar. E-Mail-Versand wird fehlschlagen."); // Protokollierung in Funktion
      return undefined;
    }
  }
  return sendgridClientConfigured ? sendgridMail : undefined;
}

export function getFrontendURL(): string {
  if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.FIREBASE_EMULATOR_HOST) {
    const emulatorPublicUrl = process.env.EMULATOR_PUBLIC_FRONTEND_URL;
    if (emulatorPublicUrl && typeof emulatorPublicUrl === 'string' && emulatorPublicUrl.startsWith('http')) {
      loggerV2.info(`[getFrontendURL] Emulator-Modus: Verwende EMULATOR_PUBLIC_FRONTEND_URL aus process.env: ${emulatorPublicUrl}`);
      return emulatorPublicUrl;
    }

    const generalFrontendUrl = process.env.FRONTEND_URL;
    if (generalFrontendUrl && typeof generalFrontendUrl === 'string' && generalFrontendUrl.startsWith('http')) {
      loggerV2.warn(`[getFrontendURL] Emulator-Modus: EMULATOR_PUBLIC_FRONTEND_URL nicht (korrekt) in process.env gesetzt. Fallback auf process.env.FRONTEND_URL: ${generalFrontendUrl}.`);
      return generalFrontendUrl;
    }

    loggerV2.error("KRITISCH: Im Emulator-Modus konnte weder EMULATOR_PUBLIC_FRONTEND_URL noch FRONTEND_URL aus process.env gelesen werden. Fallback auf localhost:3000.");
    return 'http://localhost:3000';
  }

  const liveUrl = FRONTEND_URL_PARAM.value();
  if (liveUrl && typeof liveUrl === 'string' && liveUrl.startsWith('http')) {
    return liveUrl;
  }

  loggerV2.error("KRITISCH: FRONTEND_URL in Konfiguration nicht verfügbar oder ungültig für Live-Betrieb.");
  throw new HttpsError("internal", "Frontend URL ist auf dem Server nicht korrekt konfiguriert.");
}

export function getStripeWebhookSecret(): string {
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (secret) {
      return secret;
    }
    loggerV2.error("KRITISCH: Im Emulator-Modus ist STRIPE_WEBHOOK_SECRET in process.env nicht gesetzt.");
    throw new HttpsError("internal", "Stripe Webhook Secret ist im Emulator nicht konfiguriert.");
  }
  const secret = STRIPE_WEBHOOK_SECRET_PARAM.value();
  if (secret) {
    return secret;
  }
  loggerV2.error("KRITISCH: Stripe Webhook Secret in Konfiguration nicht verfügbar.");
  throw new HttpsError("internal", "Stripe Webhook Secret ist nicht konfiguriert.");
}

export { FieldValue, Timestamp, admin };
export type { MailDataRequired } from "@sendgrid/mail";