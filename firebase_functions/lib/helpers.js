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
exports.admin = exports.Timestamp = exports.FieldValue = exports.EMULATOR_PUBLIC_FRONTEND_URL_PARAM = exports.FRONTEND_URL_PARAM = exports.SENDGRID_API_KEY_PARAM = exports.STRIPE_WEBHOOK_SECRET_PARAM = exports.STRIPE_SECRET_KEY_PARAM = exports.db = void 0;
exports.getFirebaseAdminStorage = getFirebaseAdminStorage;
exports.getStripeInstance = getStripeInstance;
exports.getSendGridClient = getSendGridClient;
exports.getPublicFrontendURL = getPublicFrontendURL;
exports.getEmulatorCallbackFrontendURL = getEmulatorCallbackFrontendURL;
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
/**
 * Initialisiert und gibt die Firebase Admin App Instanz zurück.
 * Diese Funktion verwendet die Standard-Initialisierung, die sowohl in der Cloud
 * als auch im Emulator mit der Umgebungsvariable GOOGLE_APPLICATION_CREDENTIALS funktioniert.
 */
function getAdminApp() {
    if ((0, app_1.getApps)().length > 0) {
        return (0, app_1.getApps)()[0];
    }
    const app = (0, app_1.initializeApp)();
    v2_1.logger.info("Admin SDK erfolgreich initialisiert.");
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        try {
            (0, firestore_1.getFirestore)(app).settings({
                host: 'localhost:8080', // Standard-Host für den Firestore-Emulator
                ssl: false,
            });
            v2_1.logger.info("[getAdminApp] Firestore Admin SDK mit Emulator verbunden.");
        }
        catch (e) {
            if (!(e instanceof Error && e.message.includes("Firestore has already been started"))) {
                v2_1.logger.error("[getAdminApp] Fehler bei der Verbindung zum Firestore Emulator:", e);
            }
        }
    }
    return app;
}
exports.db = (0, firestore_1.getFirestore)(getAdminApp());
function getFirebaseAdminStorage() {
    return (0, storage_1.getStorage)(getAdminApp());
}
let stripeClientInstance;
let sendgridClientConfigured = false;
exports.STRIPE_SECRET_KEY_PARAM = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
exports.STRIPE_WEBHOOK_SECRET_PARAM = (0, params_1.defineSecret)("STRIPE_WEBHOOK_SECRET");
exports.SENDGRID_API_KEY_PARAM = (0, params_1.defineSecret)("SENDGRID_API_KEY");
exports.FRONTEND_URL_PARAM = (0, params_1.defineString)("FRONTEND_URL");
exports.EMULATOR_PUBLIC_FRONTEND_URL_PARAM = (0, params_1.defineString)("EMULATOR_PUBLIC_FRONTEND_URL", {
    description: 'Publicly accessible URL for the frontend when testing with emulators.',
    default: "" // Dieser Defaultwert sollte im Einsatz immer überschrieben werden
});
function getStripeInstance() {
    if (!stripeClientInstance) {
        const env = process.env;
        const stripeKey = env.FUNCTIONS_EMULATOR === 'true' ? env.STRIPE_SECRET_KEY : exports.STRIPE_SECRET_KEY_PARAM.value();
        if (stripeKey) {
            try {
                stripeClientInstance = new stripe_1.default(stripeKey, {
                    typescript: true,
                    apiVersion: "2025-05-28.basil",
                });
                v2_1.logger.info("[getStripeInstance] Stripe-Client erfolgreich initialisiert.");
            }
            catch (e) {
                v2_1.logger.error("KRITISCH: Fehler bei der Initialisierung des Stripe-Clients.", { error: e.message, at: 'getStripeInstance' });
                throw new https_1.HttpsError("internal", `Stripe ist auf dem Server nicht korrekt konfiguriert: ${e.message}`);
            }
        }
        else {
            v2_1.logger.error("KRITISCH: STRIPE_SECRET_KEY nicht verfügbar!", { at: 'getStripeInstance' });
            throw new https_1.HttpsError("internal", "Stripe ist auf dem Server nicht korrekt konfiguriert (Secret fehlt).");
        }
    }
    return stripeClientInstance;
}
function getSendGridClient() {
    if (!sendgridClientConfigured) {
        const env = process.env;
        const sendgridKey = env.FUNCTIONS_EMULATOR === 'true' ? env.SENDGRID_API_KEY : exports.SENDGRID_API_KEY_PARAM.value();
        if (sendgridKey) {
            try {
                mail_1.default.setApiKey(sendgridKey);
                sendgridClientConfigured = true;
                v2_1.logger.info("[getSendGridClient] SendGrid-Client erfolgreich initialisiert.");
            }
            catch (e) {
                v2_1.logger.error("KRITISCH: Fehler bei der Initialisierung des SendGrid-Clients.", { error: e.message, at: 'getSendGridClient' });
                return undefined;
            }
        }
        else {
            v2_1.logger.warn("SENDGRID_API_KEY nicht verfügbar. E-Mail-Versand wird fehlschlagen.", { at: 'getSendGridClient' });
            return undefined;
        }
    }
    return sendgridClientConfigured ? mail_1.default : undefined;
}
/**
 * Gibt die öffentlich zugängliche Frontend-URL zurück (Live-URL im Prod, oder die in .env.local gesetzte Live-URL im Emulator).
 * Diese URL ist für Dienste wie Stripe Business Profile URL gedacht.
 */
function getPublicFrontendURL() {
    // Für Live-Betrieb immer die übergebenen Parameter verwenden
    if (process.env.FUNCTIONS_EMULATOR !== 'true') {
        const liveUrl = exports.FRONTEND_URL_PARAM.value();
        if (liveUrl?.startsWith('http')) {
            v2_1.logger.info("[getPublicFrontendURL] Liefere Live-URL.");
            return liveUrl;
        }
        v2_1.logger.error("[getPublicFrontendURL] FRONTEND_URL ist auf dem Server nicht korrekt konfiguriert oder ungültig.", { url: liveUrl });
        throw new https_1.HttpsError("internal", "Frontend URL ist auf dem Server nicht korrekt konfiguriert.");
    }
    // Für Emulator-Betrieb: Wir wollen auch hier die "öffentliche" URL verwenden, die Stripe akzeptiert.
    // Diese sollte über FRONTEND_URL_PARAM auch im Emulator verfügbar sein (z.B. in .env.local gesetzt).
    const emulatorLiveSimulatedUrl = exports.FRONTEND_URL_PARAM.value();
    if (emulatorLiveSimulatedUrl?.startsWith('http')) {
        v2_1.logger.info("[getPublicFrontendURL] Liefere Emulator (simulierte Live)-URL.");
        return emulatorLiveSimulatedUrl;
    }
    // Dieser Fall sollte idealerweise nicht eintreten, wenn FRONTEND_URL immer korrekt gesetzt ist.
    v2_1.logger.error("[getPublicFrontendURL] FRONTEND_URL ist im Emulator nicht korrekt konfiguriert oder ungültig.", { url: emulatorLiveSimulatedUrl });
    throw new https_1.HttpsError("internal", "Öffentliche Frontend URL ist im Emulator nicht korrekt konfiguriert.");
}
/**
 * Gibt die für den Emulator spezifische Frontend-URL zurück, die lokal erreichbar ist.
 * Dies ist für Callback-URLs wie Stripe Account Links gedacht.
 */
function getEmulatorCallbackFrontendURL() {
    const env = process.env;
    if (env.FUNCTIONS_EMULATOR === 'true' || env.FIREBASE_EMULATOR_HOST) {
        const emulatorLocalUrl = exports.EMULATOR_PUBLIC_FRONTEND_URL_PARAM.value();
        if (emulatorLocalUrl?.startsWith('http')) {
            v2_1.logger.info("[getEmulatorCallbackFrontendURL] Liefere lokale Emulator-URL.");
            return emulatorLocalUrl;
        }
        v2_1.logger.warn("[getEmulatorCallbackFrontendURL] EMULATOR_PUBLIC_FRONTEND_URL nicht gesetzt oder ungültig. Fallback auf localhost:3000.");
        return 'http://localhost:3000'; // Standard-Fallback für lokalen Frontend-Zugriff
    }
    // Im Live-Betrieb ist diese Funktion nicht relevant für lokale Callbacks.
    // Hier sollte die normale Public URL zurückgegeben werden.
    v2_1.logger.info("[getEmulatorCallbackFrontendURL] Im Live-Betrieb: Liefere Live-URL (wie getPublicFrontendURL).");
    return getPublicFrontendURL();
}
/**
 * Allgemeine Hilfsfunktion für die Frontend-URL.
 * Standardmäßig gibt sie im Emulator die lokale URL zurück, im Live-Betrieb die öffentliche.
 * Wenn Sie spezifisch die öffentliche URL für Stripe Business Profile benötigen,
 * nutzen Sie getPublicFrontendURL().
 */
function getFrontendURL() {
    const env = process.env;
    if (env.FUNCTIONS_EMULATOR === 'true' || env.FIREBASE_EMULATOR_HOST) {
        // Im Emulator-Modus: Geben Sie die lokale URL für allgemeine Frontend-Referenzen zurück.
        return getEmulatorCallbackFrontendURL();
    }
    // Im Live-Betrieb: Geben Sie die öffentliche URL zurück.
    return exports.FRONTEND_URL_PARAM.value();
}
function getStripeWebhookSecret() {
    const env = process.env;
    if (env.FUNCTIONS_EMULATOR === 'true') {
        const secret = env.STRIPE_WEBHOOK_SECRET;
        if (secret)
            return secret;
        throw new https_1.HttpsError("internal", "Stripe Webhook Secret ist im Emulator nicht konfiguriert.");
    }
    const secret = exports.STRIPE_WEBHOOK_SECRET_PARAM.value();
    if (secret)
        return secret;
    throw new https_1.HttpsError("internal", "Stripe Webhook Secret ist nicht konfiguriert.");
}
//# sourceMappingURL=helpers.js.map