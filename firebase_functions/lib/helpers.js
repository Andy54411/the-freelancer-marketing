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
        if (process.env.FUNCTIONS_EMULATOR === 'true') {
            v2_1.logger.info("FUNCTIONS_EMULATOR ist 'true'. Versuche, Emulatoren zu verbinden.");
            // Firestore Emulator verbinden
            try {
                (0, firestore_1.getFirestore)(_adminApp).settings({
                    host: 'localhost:8080', // Standard-Firestore-Emulator-Host
                    ssl: false, // Wichtig: Für lokale Emulatoren ist SSL auf false zu setzen
                });
                v2_1.logger.info("Firestore Admin SDK auf Emulator umgeleitet (localhost:8080).");
            }
            catch (e) {
                // Dieser Fehler wird in der Regel bei Hot-Reloading auftreten, wenn settings bereits gesetzt sind.
                // Er ist dann harmlos, aber wir loggen ihn trotzdem, wenn er nicht der bekannte Typ ist.
                if (!e.message.includes("Firestore has already been started")) {
                    v2_1.logger.error("Fehler beim Umleiten des Firestore Admin SDK auf Emulator:", e);
                }
            }
        }
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
// KORRIGIERT: Expliziter Export für getFirebaseAdminStorage
function getFirebaseAdminStorage() {
    return (0, storage_1.getStorage)(_adminApp);
}
let stripeClientInstance;
let sendgridClientConfigured = false;
// Umgebungsvariablen-Parameter für Firebase Functions (defineSecret/defineString)
// Diese werden über `firebase functions:config:set` oder `firebase deploy --env-vars` konfiguriert.
// Im Emulator-Modus werden sie DIREKT aus process.env gelesen.
exports.STRIPE_SECRET_KEY_PARAM = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
exports.STRIPE_WEBHOOK_SECRET_PARAM = (0, params_1.defineSecret)("STRIPE_WEBHOOK_SECRET");
exports.SENDGRID_API_KEY_PARAM = (0, params_1.defineSecret)("SENDGRID_API_KEY");
exports.FRONTEND_URL_PARAM = (0, params_1.defineString)("FRONTEND_URL");
exports.EMULATOR_PUBLIC_FRONTEND_URL_PARAM = (0, params_1.defineString)("EMULATOR_PUBLIC_FRONTEND_URL", {
    description: 'Publicly accessible URL for the frontend when testing with emulators, e.g., for Stripe webhooks or business profile URL. Should be set in .env for functions (e.g., http://localhost:3000).',
    default: "" // Dieser Defaultwert wird in der Cloud nicht verwendet, im Emulator aber als Fallback, wenn process.env nicht gesetzt ist.
});
function getStripeInstance() {
    if (!stripeClientInstance) {
        const stripeKey = process.env.FUNCTIONS_EMULATOR === 'true' ? process.env.STRIPE_SECRET_KEY : exports.STRIPE_SECRET_KEY_PARAM.value();
        if (stripeKey) {
            stripeClientInstance = new stripe_1.default(stripeKey, {
                typescript: true,
                apiVersion: "2025-05-28.basil", // Sicherstellen, dass die API-Version korrekt ist. "2025-05-28.basil" ist kein Standardformat.
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
        const sendgridKey = process.env.FUNCTIONS_EMULATOR === 'true' ? process.env.SENDGRID_API_KEY : exports.SENDGRID_API_KEY_PARAM.value();
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
    // Im Emulator-Modus (FUNCTIONS_EMULATOR='true' oder FIREBASE_EMULATOR_HOST gesetzt)
    if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.FIREBASE_EMULATOR_HOST) {
        // Versuche zuerst die Emulator-spezifische öffentliche URL (von .env für Functions)
        const emulatorPublicUrl = process.env.EMULATOR_PUBLIC_FRONTEND_URL;
        if (emulatorPublicUrl && typeof emulatorPublicUrl === 'string' && emulatorPublicUrl.startsWith('http')) {
            v2_1.logger.info(`[getFrontendURL] Emulator-Modus: Verwende EMULATOR_PUBLIC_FRONTEND_URL aus process.env: ${emulatorPublicUrl}`);
            return emulatorPublicUrl;
        }
        // Fallback auf die allgemeinere Frontend URL, falls die Emulator-spezifische nicht gesetzt ist
        // (Diese könnte auch von `firebase functions:config:set frontend_url="..."` kommen)
        const generalFrontendUrl = process.env.FRONTEND_URL;
        if (generalFrontendUrl && typeof generalFrontendUrl === 'string' && generalFrontendUrl.startsWith('http')) {
            v2_1.logger.warn(`[getFrontendURL] Emulator-Modus: EMULATOR_PUBLIC_FRONTEND_URL nicht (korrekt) in process.env gesetzt. Fallback auf process.env.FRONTEND_URL: ${generalFrontendUrl}.`);
            return generalFrontendUrl;
        }
        v2_1.logger.error("KRITISCH: Im Emulator-Modus konnte weder EMULATOR_PUBLIC_FRONTEND_URL noch FRONTEND_URL aus process.env gelesen werden. Fallback auf localhost:3000.");
        return 'http://localhost:3000'; // Letzter Fallback
    }
    // Live-Betrieb: Liest von defineString().value() (Dies ist der korrekte Weg für die Cloud)
    const liveUrl = exports.FRONTEND_URL_PARAM.value();
    if (liveUrl && typeof liveUrl === 'string' && liveUrl.startsWith('http')) {
        return liveUrl;
    }
    v2_1.logger.error("KRITISCH: FRONTEND_URL in Konfiguration nicht verfügbar oder ungültig für Live-Betrieb.");
    throw new https_1.HttpsError("internal", "Frontend URL ist auf dem Server nicht korrekt konfiguriert.");
}
function getStripeWebhookSecret() {
    // Im Emulator-Modus liest man direkt aus process.env
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (secret) {
            return secret;
        }
        v2_1.logger.error("KRITISCH: Im Emulator-Modus ist STRIPE_WEBHOOK_SECRET in process.env nicht gesetzt.");
        throw new https_1.HttpsError("internal", "Stripe Webhook Secret ist im Emulator nicht konfiguriert.");
    }
    // Live-Betrieb: Liest von defineSecret().value()
    const secret = exports.STRIPE_WEBHOOK_SECRET_PARAM.value();
    if (secret) {
        return secret;
    }
    v2_1.logger.error("KRITISCH: Stripe Webhook Secret in Konfiguration nicht verfügbar.");
    throw new https_1.HttpsError("internal", "Stripe Webhook Secret ist nicht konfiguriert.");
}
//# sourceMappingURL=helpers.js.map