"use strict";
// /Users/andystaudinger/Tasko/firebase_functions/src/helpers.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.admin = exports.Timestamp = exports.FieldValue = exports.EMULATOR_PUBLIC_FRONTEND_URL_PARAM = exports.FRONTEND_URL_PARAM = exports.SENDGRID_API_KEY_PARAM = exports.STRIPE_WEBHOOK_SECRET_PARAM = exports.STRIPE_SECRET_KEY_PARAM = exports.adminAppInstance = exports.db = void 0;
exports.getFirebaseAdminStorage = getFirebaseAdminStorage;
exports.getStripeInstance = getStripeInstance;
exports.getSendGridClient = getSendGridClient;
exports.getFrontendURL = getFrontendURL;
exports.getStripeWebhookSecret = getStripeWebhookSecret;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
Object.defineProperty(exports, "FieldValue", { enumerable: true, get: function () { return firestore_1.FieldValue; } });
Object.defineProperty(exports, "Timestamp", { enumerable: true, get: function () { return firestore_1.Timestamp; } });
const storage_1 = require("firebase-admin/storage");
const admin = __importStar(require("firebase-admin")); // <- Muss hier importiert bleiben, um typen zu nutzen
exports.admin = admin;
const stripe_1 = __importDefault(require("stripe"));
const mail_1 = __importDefault(require("@sendgrid/mail"));
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const params_1 = require("firebase-functions/params");
// Initialisierung der Admin SDK App wird NUR in index.ts gemacht.
// Hier greifen wir auf die bereits initialisierte App zu.
let _adminApp;
try {
    // getApps() sollte hier nicht leer sein, wenn index.ts zuerst geladen wird.
    // Wenn es leer ist, bedeutet das einen Fehler im Initialisierungsablauf.
    if ((0, app_1.getApps)().length === 0) {
        v2_1.logger.error("CRITICAL: Firebase Admin App wurde NICHT vor helpers.ts initialisiert! Bitte prüfen Sie index.ts.");
        throw new Error("Firebase Admin App nicht initialisiert in helpers.");
    }
    _adminApp = (0, app_1.getApps)()[0]; // Hole die erste (Standard-)App-Instanz
    // Wenn FUNCTIONS_EMULATOR=true, verbinde mit Emulatoren.
    // DIESER TEIL MUSS HIER BLEIBEN, DA ER DIE DATENBANK-INITIALISIERUNG BEEINFLUSST.
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        v2_1.logger.info("FUNCTIONS_EMULATOR ist 'true'. Versuche, Emulatoren zu verbinden.");
        try {
            // getAdminFirestore(_adminApp) muss HIER aufgerufen werden, damit die Firestore-Instanz
            // mit den Emulator-Settings verbunden wird, BEVOR sie exportiert wird.
            (0, firestore_1.getFirestore)(_adminApp).settings({
                host: 'localhost:8080', // Standard-Firestore-Emulator-Host
                ssl: false, // Wichtig: Für lokale Emulatoren ist SSL auf false zu setzen
            });
            v2_1.logger.info("Firestore Admin SDK auf Emulator umgeleitet (localhost:8080).");
        }
        catch (e) {
            if (!e.message.includes("Firestore has already been started")) {
                v2_1.logger.error("Fehler beim Umleiten des Firestore Admin SDK auf Emulator:", e);
            }
        }
    }
}
catch (e) {
    v2_1.logger.error("CRITICAL: Fehler beim Zugriff auf/Konfigurieren der Firebase Admin SDK App in helpers.", { error: e.message, stack: e.stack });
    throw new Error(`Firebase Admin SDK in helpers konnte nicht korrekt konfiguriert werden: ${e.message}`);
}
// Exportiere db und adminAppInstance basierend auf der geholten Instanz.
// Die Initialisierung der App (_adminApp) selbst erfolgt durch initializeApp() in index.ts.
exports.db = (0, firestore_1.getFirestore)(_adminApp); // <- Dies ist der korrekte Export von db
exports.adminAppInstance = _adminApp;
function getFirebaseAdminStorage() {
    // _adminApp sollte hier immer initialisiert sein, wenn der Ablauf korrekt ist.
    if (!_adminApp) {
        v2_1.logger.error("CRITICAL: Firebase Admin App nicht initialisiert in getFirebaseAdminStorage.");
        throw new https_1.HttpsError("internal", "Firebase Admin App nicht verfügbar.");
    }
    return (0, storage_1.getStorage)(_adminApp);
}
let stripeClientInstance;
let sendgridClientConfigured = false;
exports.STRIPE_SECRET_KEY_PARAM = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
exports.STRIPE_WEBHOOK_SECRET_PARAM = (0, params_1.defineSecret)("STRIPE_WEBHOOK_SECRET");
exports.SENDGRID_API_KEY_PARAM = (0, params_1.defineSecret)("SENDGRID_API_KEY");
exports.FRONTEND_URL_PARAM = (0, params_1.defineString)("FRONTEND_URL");
exports.EMULATOR_PUBLIC_FRONTEND_URL_PARAM = (0, params_1.defineString)("EMULATOR_PUBLIC_FRONTEND_URL", {
    description: 'Publicly accessible URL for the frontend when testing with emulators, e.g., for Stripe webhooks or business profile URL. Should be set in .env for functions (e.g., http://localhost:3000).',
    default: ""
});
function getStripeInstance() {
    if (!stripeClientInstance) {
        const stripeKey = process.env.FUNCTIONS_EMULATOR === 'true' ? process.env.STRIPE_SECRET_KEY : exports.STRIPE_SECRET_KEY_PARAM.value();
        if (stripeKey) {
            try { // Füge try-catch hinzu, um Initialisierungsfehler abzufangen
                stripeClientInstance = new stripe_1.default(stripeKey, {
                    typescript: true,
                    apiVersion: "2025-05-28.basil", // KORRIGIERT: API-Version an den erwarteten Typ anpassen
                });
                v2_1.logger.info("Stripe-Client bei Bedarf initialisiert."); // Protokollierung in Funktion
            }
            catch (e) {
                v2_1.logger.error("KRITISCH: Fehler bei der Initialisierung des Stripe-Clients.", { error: e.message, stack: e.stack });
                throw new https_1.HttpsError("internal", `Stripe ist auf dem Server nicht korrekt konfiguriert: ${e.message}`);
            }
        }
        else {
            v2_1.logger.error("KRITISCH: STRIPE_SECRET_KEY Parameterwert nicht verfügbar! Stripe-Client kann nicht initialisiert werden.");
            throw new https_1.HttpsError("internal", "Stripe ist auf dem Server nicht korrekt konfiguriert (Secret fehlt).");
        }
    }
    return stripeClientInstance;
}
function getSendGridClient() {
    if (!sendgridClientConfigured) {
        const sendgridKey = process.env.FUNCTIONS_EMULATOR === 'true' ? process.env.SENDGRID_API_KEY : exports.SENDGRID_API_KEY_PARAM.value();
        if (sendgridKey) {
            try { // Füge try-catch hinzu
                if (mail_1.default && typeof mail_1.default.setApiKey === "function") {
                    mail_1.default.setApiKey(sendgridKey);
                    sendgridClientConfigured = true;
                    v2_1.logger.info("SendGrid API Key bei Bedarf initialisiert."); // Protokollierung in Funktion
                }
                else {
                    v2_1.logger.error("SendGrid Mail Objekt oder setApiKey Methode nicht verfügbar (bei getSendGridClient).");
                    return undefined;
                }
            }
            catch (e) {
                v2_1.logger.error("KRITISCH: Fehler bei der Initialisierung des SendGrid-Clients.", { error: e.message, stack: e.stack });
                return undefined;
            }
        }
        else {
            v2_1.logger.warn("SENDGRID_API_KEY Parameterwert nicht verfügbar. E-Mail-Versand wird fehlschlagen."); // Protokollierung in Funktion
            return undefined;
        }
    }
    return sendgridClientConfigured ? mail_1.default : undefined;
}
function getFrontendURL() {
    if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.FIREBASE_EMULATOR_HOST) {
        const emulatorPublicUrl = process.env.EMULATOR_PUBLIC_FRONTEND_URL;
        if (emulatorPublicUrl && typeof emulatorPublicUrl === 'string' && emulatorPublicUrl.startsWith('http')) {
            v2_1.logger.info(`[getFrontendURL] Emulator-Modus: Verwende EMULATOR_PUBLIC_FRONTEND_URL aus process.env: ${emulatorPublicUrl}`);
            return emulatorPublicUrl;
        }
        const generalFrontendUrl = process.env.FRONTEND_URL;
        if (generalFrontendUrl && typeof generalFrontendUrl === 'string' && generalFrontendUrl.startsWith('http')) {
            v2_1.logger.warn(`[getFrontendURL] Emulator-Modus: EMULATOR_PUBLIC_FRONTEND_URL nicht (korrekt) in process.env gesetzt. Fallback auf process.env.FRONTEND_URL: ${generalFrontendUrl}.`);
            return generalFrontendUrl;
        }
        v2_1.logger.error("KRITISCH: Im Emulator-Modus konnte weder EMULATOR_PUBLIC_FRONTEND_URL noch FRONTEND_URL aus process.env gelesen werden. Fallback auf localhost:3000.");
        return 'http://localhost:3000';
    }
    const liveUrl = exports.FRONTEND_URL_PARAM.value();
    if (liveUrl && typeof liveUrl === 'string' && liveUrl.startsWith('http')) {
        return liveUrl;
    }
    v2_1.logger.error("KRITISCH: FRONTEND_URL in Konfiguration nicht verfügbar oder ungültig für Live-Betrieb.");
    throw new https_1.HttpsError("internal", "Frontend URL ist auf dem Server nicht korrekt konfiguriert.");
}
function getStripeWebhookSecret() {
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (secret) {
            return secret;
        }
        v2_1.logger.error("KRITISCH: Im Emulator-Modus ist STRIPE_WEBHOOK_SECRET in process.env nicht gesetzt.");
        throw new https_1.HttpsError("internal", "Stripe Webhook Secret ist im Emulator nicht konfiguriert.");
    }
    const secret = exports.STRIPE_WEBHOOK_SECRET_PARAM.value();
    if (secret) {
        return secret;
    }
    v2_1.logger.error("KRITISCH: Stripe Webhook Secret in Konfiguration nicht verfügbar.");
    throw new https_1.HttpsError("internal", "Stripe Webhook Secret ist nicht konfiguriert.");
}
//# sourceMappingURL=helpers.js.map