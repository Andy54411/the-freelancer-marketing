"use strict";
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
function getAdminApp() {
    if ((0, app_1.getApps)().length === 0) {
        (0, app_1.initializeApp)();
        if (process.env.FUNCTIONS_EMULATOR === 'true') {
            try {
                (0, firestore_1.getFirestore)().settings({
                    host: 'localhost:8080',
                    ssl: false,
                });
            }
            catch (e) {
                if (!e.message.includes("Firestore has already been started")) {
                    v2_1.logger.error("Fehler bei der Verbindung zum Firestore Emulator:", e);
                }
            }
        }
    }
    return (0, app_1.getApps)()[0];
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
    description: 'Publicly accessible URL for the frontend when testing with emulators, e.g., for Stripe webhooks or business profile URL. Should be set in .env for functions (e.g., http://localhost:3000).',
    default: ""
});
function getStripeInstance() {
    if (!stripeClientInstance) {
        const stripeKey = process.env.FUNCTIONS_EMULATOR === 'true' ? process.env.STRIPE_SECRET_KEY : exports.STRIPE_SECRET_KEY_PARAM.value();
        if (stripeKey) {
            try {
                stripeClientInstance = new stripe_1.default(stripeKey, {
                    typescript: true,
                    apiVersion: "2025-05-28.basil",
                });
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
            try {
                if (mail_1.default && typeof mail_1.default.setApiKey === "function") {
                    mail_1.default.setApiKey(sendgridKey);
                    sendgridClientConfigured = true;
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
            v2_1.logger.warn("SENDGRID_API_KEY Parameterwert nicht verfügbar. E-Mail-Versand wird fehlschlagen.");
            return undefined;
        }
    }
    return sendgridClientConfigured ? mail_1.default : undefined;
}
function getFrontendURL() {
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
    const liveUrl = exports.FRONTEND_URL_PARAM.value();
    if (liveUrl && typeof liveUrl === 'string' && liveUrl.startsWith('http')) {
        return liveUrl;
    }
    throw new https_1.HttpsError("internal", "Frontend URL ist auf dem Server nicht korrekt konfiguriert.");
}
function getStripeWebhookSecret() {
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (secret) {
            return secret;
        }
        throw new https_1.HttpsError("internal", "Stripe Webhook Secret ist im Emulator nicht konfiguriert.");
    }
    const secret = exports.STRIPE_WEBHOOK_SECRET_PARAM.value();
    if (secret) {
        return secret;
    }
    throw new https_1.HttpsError("internal", "Stripe Webhook Secret ist nicht konfiguriert.");
}
//# sourceMappingURL=helpers.js.map