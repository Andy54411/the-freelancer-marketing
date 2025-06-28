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
exports.admin = exports.Timestamp = exports.FieldValue = exports.corsOptions = void 0;
exports.getDb = getDb;
exports.getAuthInstance = getAuthInstance;
exports.getStorageInstance = getStorageInstance;
exports.getStripeInstance = getStripeInstance;
exports.getPublicFrontendURL = getPublicFrontendURL;
exports.getEmulatorCallbackFrontendURL = getEmulatorCallbackFrontendURL;
exports.getFrontendURL = getFrontendURL;
exports.getStripeWebhookSecret = getStripeWebhookSecret;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore"); // Exportiere FieldValue und Timestamp
Object.defineProperty(exports, "FieldValue", { enumerable: true, get: function () { return firestore_1.FieldValue; } });
Object.defineProperty(exports, "Timestamp", { enumerable: true, get: function () { return firestore_1.Timestamp; } });
const auth_1 = require("firebase-admin/auth");
const storage_1 = require("firebase-admin/storage");
const admin = __importStar(require("firebase-admin"));
exports.admin = admin;
const stripe_1 = __importDefault(require("stripe"));
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
// --- Instanz-Variablen für Lazy Loading ---
// Diese Variablen speichern die initialisierten Instanzen, um zu verhindern,
// dass sie bei jedem Aufruf neu erstellt werden.
// Zentrale CORS-Konfiguration für alle Callable Functions.
exports.corsOptions = {
    region: "europe-west1",
    cors: ["http://localhost:3000", "https://tilvo-f142f.web.app", "http://localhost:5002"]
};
let dbInstance;
let authInstance;
let storageInstance;
let stripeClientInstance;
/**
 * Initialisiert und gibt die Firebase Admin App Instanz zurück.
 * Diese Funktion stellt sicher, dass die App nur einmal initialisiert wird.
 */
function getAdminApp() {
    if ((0, app_1.getApps)().length > 0) {
        return (0, app_1.getApps)()[0];
    }
    const app = (0, app_1.initializeApp)();
    v2_1.logger.info("Admin SDK erfolgreich initialisiert.");
    // The Admin SDK automatically connects to the Firestore emulator when the
    // FIRESTORE_EMULATOR_HOST environment variable is set by `firebase emulators:start`.
    // The explicit configuration below is removed to avoid port conflicts and make the setup more robust.
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        v2_1.logger.info("[getAdminApp] Running in emulator mode. SDK will auto-connect to Firestore emulator if the environment variable is set.");
    }
    return app;
}
// --- ANGEPASSTE "GETTER"-FUNKTIONEN FÜR LAZY INITIALIZATION ---
/**
 * Gibt die Firestore-Datenbankinstanz zurück.
 * Die Initialisierung erfolgt nur beim ersten Aufruf ("lazy").
 * @returns {Firestore} Die Firestore-Instanz.
 */
function getDb() {
    if (!dbInstance) {
        dbInstance = (0, firestore_1.getFirestore)(getAdminApp());
        v2_1.logger.info("[getDb] Firestore-Instanz erfolgreich initialisiert (lazy).");
    }
    return dbInstance;
}
/**
 * Gibt die Firebase Auth Instanz zurück.
 * Die Initialisierung erfolgt nur beim ersten Aufruf ("lazy").
 * @returns {Auth} Die Auth-Instanz.
 */
function getAuthInstance() {
    if (!authInstance) {
        authInstance = (0, auth_1.getAuth)(getAdminApp());
        v2_1.logger.info("[getAuthInstance] Auth-Instanz erfolgreich initialisiert (lazy).");
    }
    return authInstance;
}
/**
 * Gibt die Firebase Storage Instanz zurück.
 * Die Initialisierung erfolgt nur beim ersten Aufruf ("lazy").
 * @returns {Storage} Die Storage-Instanz.
 */
function getStorageInstance() {
    if (!storageInstance) {
        storageInstance = (0, storage_1.getStorage)(getAdminApp());
        v2_1.logger.info("[getStorageInstance] Storage-Instanz erfolgreich initialisiert (lazy).");
    }
    return storageInstance;
}
// --- Parameter-Definitionen (AUSKOMMENTIERT, DA SIE DEN FEHLER VERURSACHEN) ---
// export const STRIPE_SECRET_KEY_PARAM = defineSecret("STRIPE_SECRET_KEY");
// export const STRIPE_WEBHOOK_SECRET_PARAM = defineSecret("STRIPE_WEBHOOK_SECRET");
// export const SENDGRID_API_KEY_PARAM = defineSecret("SENDGRID_API_KEY");
// export const FRONTEND_URL_PARAM = defineString("FRONTEND_URL");
// export const EMULATOR_PUBLIC_FRONTEND_URL_PARAM = defineString("EMULATOR_PUBLIC_FRONTEND_URL", {
//   description: 'Publicly accessible URL for the frontend when testing with emulators.',
//   default: ""
// });
// --- Bestehende Getter-Funktionen (JETZT MIT KORRIGIERTER LOGIK) ---
function getStripeInstance(stripeKey) {
    if (!stripeClientInstance) {
        // Der Stripe-Schlüssel wird jetzt als Parameter übergeben.
        if (stripeKey) {
            try {
                stripeClientInstance = new stripe_1.default(stripeKey, {
                    typescript: true,
                    apiVersion: "2025-05-28.basil",
                });
                v2_1.logger.info("[getStripeInstance] Stripe-Client erfolgreich initialisiert.");
            }
            catch (e) {
                let errorMessage = "Unbekannter Fehler bei der Initialisierung des Stripe-Clients.";
                if (e instanceof Error) {
                    errorMessage = e.message;
                }
                v2_1.logger.error("KRITISCH: Fehler bei der Initialisierung des Stripe-Clients.", { error: errorMessage, at: 'getStripeInstance' });
                throw new https_1.HttpsError("internal", `Stripe ist auf dem Server nicht korrekt konfiguriert: ${errorMessage}`);
            }
        }
        else {
            v2_1.logger.error("KRITISCH: STRIPE_SECRET_KEY nicht verfügbar!", { at: 'getStripeInstance' });
            throw new https_1.HttpsError("internal", "Stripe ist auf dem Server nicht korrekt konfiguriert (Secret fehlt).");
        }
    }
    return stripeClientInstance;
}
/**
 * Gibt die öffentlich zugängliche Frontend-URL zurück (Live-URL im Prod, oder die in .env.local gesetzte Live-URL im Emulator).
 * Diese URL ist für Dienste wie Stripe Business Profile URL gedacht.
 */
function getPublicFrontendURL(liveUrl) {
    if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.FIREBASE_EMULATOR_HOST) {
        const emulatorLiveSimulatedUrl = process.env.FRONTEND_URL;
        if (emulatorLiveSimulatedUrl?.startsWith('http')) {
            v2_1.logger.info("[getPublicFrontendURL] Liefere Emulator (simulierte Live)-URL.");
            return emulatorLiveSimulatedUrl;
        }
        v2_1.logger.error("[getPublicFrontendURL] FRONTEND_URL ist im Emulator nicht korrekt konfiguriert oder ungültig.", { url: emulatorLiveSimulatedUrl });
        throw new https_1.HttpsError("internal", "Öffentliche Frontend URL ist im Emulator nicht korrekt konfiguriert (FRONTEND_URL in .env.local fehlt/ist ungültig).");
    }
    else {
        // Der Live-URL wird nun als Parameter übergeben
        if (liveUrl?.startsWith('http')) {
            v2_1.logger.info("[getPublicFrontendURL] Liefere Live-URL.");
            return liveUrl;
        }
        v2_1.logger.error("[getPublicFrontendURL] FRONTEND_URL ist auf dem Server nicht korrekt konfiguriert oder ungültig.", { url: liveUrl });
        throw new https_1.HttpsError("internal", "Frontend URL ist auf dem Server nicht korrekt konfiguriert.");
    }
}
/**
 * Gibt die für den Emulator spezifische Frontend-URL zurück, die lokal erreichbar ist.
 * Dies ist für Callback-URLs wie Stripe Account Links gedacht.
 */
function getEmulatorCallbackFrontendURL(liveUrl) {
    if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.FIREBASE_EMULATOR_HOST) {
        // Dieser Teil ist schnell und benötigt keine Änderung
        const emulatorLocalUrl = process.env.EMULATOR_PUBLIC_FRONTEND_URL;
        if (emulatorLocalUrl?.startsWith('http')) {
            v2_1.logger.info("[getEmulatorCallbackFrontendURL] Liefere lokale Emulator-URL.");
            return emulatorLocalUrl;
        }
        v2_1.logger.warn("[getEmulatorCallbackFrontendURL] EMULATOR_PUBLIC_FRONTEND_URL nicht gesetzt oder ungültig. Fallback auf localhost:3000.");
        return 'http://localhost:3000';
    }
    v2_1.logger.info("[getEmulatorCallbackFrontendURL] Im Live-Betrieb: Liefere Live-URL (wie getPublicFrontendURL).");
    return getPublicFrontendURL(liveUrl);
}
/**
 * Allgemeine Hilfsfunktion für die Frontend-URL.
 */
function getFrontendURL(liveUrl) {
    if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.FIREBASE_EMULATOR_HOST) {
        return getEmulatorCallbackFrontendURL(liveUrl);
    }
    return liveUrl;
}
function getStripeWebhookSecret(webhookSecretFromParams) {
    const webhookSecret = process.env.FUNCTIONS_EMULATOR === 'true' ? process.env.STRIPE_WEBHOOK_SECRET : webhookSecretFromParams;
    if (webhookSecret) {
        return webhookSecret;
    }
    else if (process.env.FUNCTIONS_EMULATOR === 'true') {
        throw new https_1.HttpsError("internal", "Stripe Webhook Secret ist im Emulator nicht konfiguriert.");
    }
    else {
        throw new https_1.HttpsError("internal", "Stripe Webhook Secret ist nicht konfiguriert.");
    }
}
//# sourceMappingURL=helpers.js.map