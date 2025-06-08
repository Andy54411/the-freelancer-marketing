"use strict";
// /Users/andystaudinger/Tilvo/functions/src/helpers.ts
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
exports.admin = exports.Timestamp = exports.FieldValue = exports.adminAppInstance = exports.db = void 0;
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
const params_1 = require("firebase-functions/params");
let _adminApp;
try {
    if ((0, app_1.getApps)().length === 0) {
        _adminApp = (0, app_1.initializeApp)();
        v2_1.logger.info("Firebase Admin SDK (Default App) erfolgreich initialisiert.");
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
const STRIPE_SECRET_KEY_PARAM = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET_PARAM = (0, params_1.defineSecret)("STRIPE_WEBHOOK_SECRET");
const SENDGRID_API_KEY_PARAM = (0, params_1.defineSecret)("SENDGRID_API_KEY");
const FRONTEND_URL_PARAM = (0, params_1.defineString)("FRONTEND_URL");
const EMULATOR_PUBLIC_FRONTEND_URL_PARAM = (0, params_1.defineString)("EMULATOR_PUBLIC_FRONTEND_URL", {
    description: 'Publicly accessible URL for the frontend when testing with emulators, e.g., for Stripe webhooks or business profile URL. Should be set in .env.local for functions.',
    default: "" // Wird in .env.local gesetzt, z.B. auf https://dev.tilvo.de
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
        const stripeKey = STRIPE_SECRET_KEY_PARAM.value();
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
        const sendgridKey = SENDGRID_API_KEY_PARAM.value();
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
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        const emulatorPublicUrl = EMULATOR_PUBLIC_FRONTEND_URL_PARAM.value();
        if (emulatorPublicUrl && emulatorPublicUrl.startsWith('http')) {
            v2_1.logger.info(`[getFrontendURL] Emulator-Modus: Verwende EMULATOR_PUBLIC_FRONTEND_URL: ${emulatorPublicUrl}`);
            return emulatorPublicUrl;
        }
        // Fallback zur normalen FRONTEND_URL (http://localhost:3000) für den Emulator, wenn keine spezielle öffentliche URL gesetzt ist.
        const localUrl = FRONTEND_URL_PARAM.value();
        v2_1.logger.warn(`[getFrontendURL] Emulator-Modus: EMULATOR_PUBLIC_FRONTEND_URL nicht (korrekt) gesetzt. Fallback auf lokale FRONTEND_URL: ${localUrl}. Dies kann für Stripe's business_profile.url ungültig sein.`);
        // Stelle sicher, dass auch hier ein gültiger Default zurückgegeben wird, falls FRONTEND_URL_PARAM leer ist.
        return localUrl || 'http://localhost:3000'; // Fallback, falls FRONTEND_URL nicht in .env.local gesetzt ist
    }
    // Für den Live-Betrieb
    const liveUrl = FRONTEND_URL_PARAM.value();
    if (liveUrl && liveUrl.startsWith('http')) {
        return liveUrl;
    }
    v2_1.logger.error("KRITISCH: FRONTEND_URL Parameterwert nicht verfügbar oder ungültig für Live-Betrieb.");
    throw new https_1.HttpsError("internal", "Frontend URL ist auf dem Server nicht korrekt konfiguriert.");
}
function getStripeWebhookSecret() {
    const secret = STRIPE_WEBHOOK_SECRET_PARAM.value();
    if (secret) {
        return secret;
    }
    v2_1.logger.error("KRITISCH: Stripe Webhook Secret Parameterwert nicht verfügbar.");
    throw new https_1.HttpsError("internal", "Stripe Webhook Secret ist nicht konfiguriert.");
}
//# sourceMappingURL=helpers.js.map