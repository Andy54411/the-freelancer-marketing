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
exports.getStorageInstance = getStorageInstance;
exports.getStripeInstance = getStripeInstance;
exports.getSendGridClient = getSendGridClient;
exports.getFrontendURL = getFrontendURL;
exports.getStripeWebhookSecret = getStripeWebhookSecret;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
Object.defineProperty(exports, "FieldValue", { enumerable: true, get: function () { return firestore_1.FieldValue; } });
Object.defineProperty(exports, "Timestamp", { enumerable: true, get: function () { return firestore_1.Timestamp; } });
const storage_1 = require("firebase-admin/storage");
const admin = __importStar(require("firebase-admin"));
exports.admin = admin;
const stripe_1 = __importDefault(require("stripe"));
const mail_1 = __importDefault(require("@sendgrid/mail"));
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const params_1 = require("firebase-functions/params"); // <-- DIESE ZEILE BLEIBT/HINZUGEFÜGT
// Stelle sicher, dass *nicht* import * as functions from 'firebase-functions'; hier steht,
// da wir functions.config() nicht direkt in diesen Funktionen verwenden, sondern defineSecret/defineString.
let _adminApp;
try {
    if ((0, app_1.getApps)().length === 0) {
        _adminApp = (0, app_1.initializeApp)();
        v2_1.logger.info("Firebase Admin SDK (Default App) erfolgreich initialisiert.");
        // =========================================================================
        // ANGEPASSTE ANPASSUNG FÜR DEN EMULATOR-BETRIEB
        // Hier wird nur Firestore explizit über .settings() verbunden.
        // Für Auth und Storage verlassen wir uns auf Umgebungsvariablen.
        // =========================================================================
        if (process.env.FUNCTIONS_EMULATOR === 'true') {
            v2_1.logger.info("FUNCTIONS_EMULATOR ist 'true'. Versuche, Emulatoren zu verbinden.");
            // Firestore Emulator verbinden (DIESER TEIL FUNKTIONIERT UND BLEIBT SO)
            try {
                (0, firestore_1.getFirestore)(_adminApp).settings({
                    host: 'localhost:8080', // Standard-Firestore-Emulator-Host
                    ssl: false, // Wichtig: Für lokale Emulatoren ist SSL auf false zu setzen
                });
                v2_1.logger.info("Firestore Admin SDK auf Emulator umgeleitet (localhost:8080).");
            }
            catch (e) {
                v2_1.logger.error("Fehler beim Umleiten des Firestore Admin SDK auf Emulator:", e);
            }
            // HINWEIS: Für Auth und Storage sind hier KEINE expliziten .useEmulator-Aufrufe mehr.
            // Diese Dienste verbinden sich automatisch mit den Emulatoren,
            // WENN die Umgebungsvariablen (z.B. FIREBASE_AUTH_EMULATOR_HOST, FIREBASE_STORAGE_EMULATOR_HOST)
            // beim Start der Emulatoren gesetzt sind.
            // Die zuvor aufgetretenen TypeErrors werden so umgangen.
        }
        // =========================================================================
        // ENDE DER ANPASSUNG
        // =========================================================================
    }
    else {
        _adminApp = (0, app_1.getApps)()[0];
        v2_1.logger.info("Firebase Admin SDK (Default App) bereits initialisiert, verwende existierende Instanz.");
    }
}
catch (e) {
    v2_1.logger.error("CRITICAL: Firebase Admin SDK initialization failed.", { error: e.message, stack: e.stack });
    throw new Error(`Firebase Admin SDK could not be initialized: ${e.message}`);
}
exports.db = (0, firestore_1.getFirestore)(_adminApp);
exports.adminAppInstance = _adminApp;
let stripeClientInstance;
let sendgridClientConfigured = false;
let storageInstanceCache;
// ========================================================================
// KORRIGIERT: 'export' vor allen defineSecret/defineString hinzufügen
// ========================================================================
exports.STRIPE_SECRET_KEY_PARAM = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
exports.STRIPE_WEBHOOK_SECRET_PARAM = (0, params_1.defineSecret)("STRIPE_WEBHOOK_SECRET");
exports.SENDGRID_API_KEY_PARAM = (0, params_1.defineSecret)("SENDGRID_API_KEY");
exports.FRONTEND_URL_PARAM = (0, params_1.defineString)("FRONTEND_URL");
exports.EMULATOR_PUBLIC_FRONTEND_URL_PARAM = (0, params_1.defineString)("EMULATOR_PUBLIC_FRONTEND_URL", {
    description: 'Publicly accessible URL for the frontend when testing with emulators, e.g., for Stripe webhooks or business profile URL. Should be set in .env.local for functions.',
    default: "" // Wird in .env.local gesetzt, z.B. auf http://localhost:3000
});
function getStorageInstance() {
    if (!storageInstanceCache) {
        v2_1.logger.debug("[getStorageInstance] Versuche, Storage-Instanz zu initialisieren.");
        try {
            storageInstanceCache = (0, storage_1.getStorage)(_adminApp);
            v2_1.logger.info("Firebase Storage-Client bei Bedarf initialisiert.");
        }
        catch (e) {
            v2_1.logger.error("CRITICAL: Fehler bei getAdminStorage(_adminApp) Aufruf.", { error: e.message, stack: e.stack });
            throw new https_1.HttpsError("internal", "Firebase Admin Storage Service konnte nicht initialisiert werden.");
        }
    }
    if (!storageInstanceCache) {
        v2_1.logger.error("CRITICAL: storageInstanceCache ist nach Initialisierungsversuch immer noch undefined.");
        throw new https_1.HttpsError("internal", "Firebase Admin Storage Service Initialisierung ergab undefined.");
    }
    return storageInstanceCache;
}
function getStripeInstance() {
    if (!stripeClientInstance) {
        // KORRIGIERT: Abruf über defineSecret().value()
        const stripeKey = exports.STRIPE_SECRET_KEY_PARAM.value();
        if (stripeKey) {
            stripeClientInstance = new stripe_1.default(stripeKey, {
                typescript: true,
                apiVersion: "2025-05-28.basil",
            });
            v2_1.logger.info("Stripe-Client bei Bedarf initialisiert.");
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
        // KORRIGIERT: Abruf über defineString().value()
        const sendgridKey = exports.SENDGRID_API_KEY_PARAM.value();
        if (sendgridKey) {
            if (mail_1.default && typeof mail_1.default.setApiKey === "function") {
                mail_1.default.setApiKey(sendgridKey);
                sendgridClientConfigured = true;
                v2_1.logger.info("SendGrid API Key bei Bedarf initialisiert.");
            }
            else {
                v2_1.logger.error("SendGrid Mail Objekt oder setApiKey Methode nicht verfügbar (bei getSendGridClient).");
                return undefined;
            }
        }
        else {
            v2_1.logger.warn("SENDGRID_API_KEY Parameterwert nicht verfügbar. E-Mail-Versand wird fehlschlagen.");
            return undefined;
        }
    }
    return sendgridClientConfigured ? mail_1.default : undefined;
}
function getFrontendURL() {
    // ========================================================================
    // KORRIGIERT: Emulator-Modus liest DIREKT von process.env
    // ========================================================================
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        // Diese Environment-Variablen werden direkt über die Shell gesetzt
        // (z.B. FUNCTIONS_EMULATOR=true FRONTEND_URL=... EMULATOR_PUBLIC_FRONTEND_URL=... firebase emulators:start)
        const emulatorPublicUrl = process.env.EMULATOR_PUBLIC_FRONTEND_URL;
        const prodFrontendUrlInEmulator = process.env.FRONTEND_URL; // Dies ist die Produktions-URL
        if (emulatorPublicUrl && typeof emulatorPublicUrl === 'string' && emulatorPublicUrl.startsWith('http')) {
            v2_1.logger.info(`[getFrontendURL] Emulator-Modus: Verwende EMULATOR_PUBLIC_FRONTEND_URL aus process.env: ${emulatorPublicUrl}`);
            return emulatorPublicUrl;
        }
        // Fallback auf die Produktions-URL, falls die Emulator-spezifische nicht gesetzt ist oder ungültig ist.
        if (prodFrontendUrlInEmulator && typeof prodFrontendUrlInEmulator === 'string' && prodFrontendUrlInEmulator.startsWith('http')) {
            v2_1.logger.warn(`[getFrontendURL] Emulator-Modus: EMULATOR_PUBLIC_FRONTEND_URL nicht (korrekt) in process.env gesetzt. Fallback auf process.env.FRONTEND_URL: ${prodFrontendUrlInEmulator}.`);
            return prodFrontendUrlInEmulator;
        }
        v2_1.logger.error("KRITISCH: Im Emulator-Modus konnte weder EMULATOR_PUBLIC_FRONTEND_URL noch FRONTEND_URL aus process.env gelesen werden.");
        // Letzter Fallback, sollte niemals erreicht werden, wenn Env Vars gesetzt sind
        return 'http://localhost:3000';
    }
    // ========================================================================
    // Live-Betrieb: Liest von defineString().value() (Dies ist der korrekte Weg für die Cloud)
    // ========================================================================
    const liveUrl = exports.FRONTEND_URL_PARAM.value(); // Liest den Wert von defineString in der Cloud
    if (liveUrl && typeof liveUrl === 'string' && liveUrl.startsWith('http')) {
        return liveUrl;
    }
    v2_1.logger.error("KRITISCH: FRONTEND_URL in Konfiguration nicht verfügbar oder ungültig für Live-Betrieb.");
    throw new https_1.HttpsError("internal", "Frontend URL ist auf dem Server nicht korrekt konfiguriert.");
}
function getStripeWebhookSecret() {
    // KORRIGIERT: Abruf über defineSecret().value()
    const secret = exports.STRIPE_WEBHOOK_SECRET_PARAM.value();
    if (secret) {
        return secret;
    }
    v2_1.logger.error("KRITISCH: Stripe Webhook Secret in Konfiguration nicht verfügbar.");
    throw new https_1.HttpsError("internal", "Stripe Webhook Secret ist nicht konfiguriert.");
}
//# sourceMappingURL=helpers.js.map