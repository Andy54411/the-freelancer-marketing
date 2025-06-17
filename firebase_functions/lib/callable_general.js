"use strict";
// functions/src/callable_general.ts
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCompanyAccount = exports.createTemporaryJobDraft = exports.getClientIp = void 0;
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const helpers_1 = require("./helpers"); // getStripeInstance ist hier möglicherweise nicht mehr nötig
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
// Konsolen-Logs anpassen für Klarheit
v2_1.logger.info("Lade callable_general.ts..."); // Nutze loggerV2 konsistent
try {
    v2_1.logger.info("callable_general.ts: Globale Initialisierung erfolgreich.");
}
catch (error) {
    v2_1.logger.error("callable_general.ts: Fehler bei globaler Initialisierung!", { error: error.message, stack: error.stack });
    throw error;
}
// --- Cloud Functions ---
exports.getClientIp = (0, https_1.onCall)(async (request) => {
    const rawHttpRequest = request.rawRequest;
    let clientIp = "IP_NOT_DETERMINED";
    const isEmulated = process.env.FUNCTIONS_EMULATOR === "true";
    if (rawHttpRequest) {
        const forwardedFor = rawHttpRequest.headers["x-forwarded-for"];
        const realIpHeader = rawHttpRequest.headers["x-real-ip"];
        if (forwardedFor && typeof forwardedFor === "string")
            clientIp = forwardedFor.split(",")[0].trim();
        else if (realIpHeader && typeof realIpHeader === "string")
            clientIp = realIpHeader.split(",")[0].trim();
        else if (rawHttpRequest.ip)
            clientIp = rawHttpRequest.ip;
        else if (rawHttpRequest.socket?.remoteAddress)
            clientIp = rawHttpRequest.socket.remoteAddress;
    }
    if (isEmulated && (clientIp === "::1" || clientIp.startsWith("127.") || clientIp === "IP_NOT_DETERMINED")) {
        clientIp = "127.0.0.1";
    }
    else if (!isEmulated && (clientIp === "IP_NOT_DETERMINED" || clientIp.length < 7 || clientIp === "::1" || clientIp.startsWith("127.") || clientIp === "0.0.0.0")) {
        v2_1.logger.error(`[getClientIp] In NICHT-Emulator-Umgebung keine gültige IP. Gefunden: "${clientIp}".`);
        throw new https_1.HttpsError("unavailable", "Gültige Client-IP konnte nicht ermittelt werden.");
    }
    v2_1.logger.info(`[getClientIp] final IP: ${clientIp}`);
    return { ip: clientIp };
});
exports.createTemporaryJobDraft = (0, https_1.onCall)(async (request) => {
    v2_1.logger.info("[createTemporaryJobDraft] Aufgerufen mit Daten:", JSON.stringify(request.data, null, 2));
    const db = (0, helpers_1.getDb)();
    if (!request.auth?.uid) {
        v2_1.logger.error("[createTemporaryJobDraft] Nutzer nicht authentifiziert.");
        throw new https_1.HttpsError("unauthenticated", "Nutzer nicht authentifiziert.");
    }
    const jobDetails = request.data;
    const kundeId = request.auth.uid;
    if (!jobDetails.customerType ||
        !jobDetails.selectedCategory ||
        !jobDetails.selectedSubcategory ||
        !jobDetails.jobPostalCode ||
        !jobDetails.selectedAnbieterId ||
        !(typeof jobDetails.jobCalculatedPriceInCents === 'number' && jobDetails.jobCalculatedPriceInCents > 0)) {
        v2_1.logger.error("[createTemporaryJobDraft] Fehlende oder ungültige Pflichtdaten:", jobDetails);
        throw new https_1.HttpsError("invalid-argument", "Unvollständige oder ungültige Auftragsdetails übermittelt.");
    }
    const customerInfo = {
        firstName: 'Unbekannt',
        lastName: '',
        email: request.auth.token.email || ''
    };
    try {
        const userDoc = await db.collection('users').doc(kundeId).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            if (data) {
                customerInfo.firstName = data.firstName || 'Unbekannt';
                customerInfo.lastName = data.lastName || '';
                customerInfo.email = data.email || customerInfo.email;
            }
            v2_1.logger.info(`[createTemporaryJobDraft] Kundendaten für ${kundeId} geladen.`);
        }
        else {
            v2_1.logger.warn(`[createTemporaryJobDraft] Konnte kein User-Dokument für Kunde ${kundeId} finden.`);
        }
    }
    catch (e) {
        v2_1.logger.error(`[createTemporaryJobDraft] Fehler beim Laden der Kundendaten für ${kundeId}:`, e.message);
    }
    // --- Start der korrigierten Logik für anbieterStripeAccountId ---
    let anbieterStripeAccountId; // Auf nicht-null gesetzt, wir stellen sicher, dass es gesetzt ist oder werfen einen Fehler
    if (!jobDetails.selectedAnbieterId) {
        v2_1.logger.error("[createTemporaryJobDraft] Fehlende 'selectedAnbieterId' im Payload vom Client.");
        throw new https_1.HttpsError("invalid-argument", "Die ID des ausgewählten Anbieters ist erforderlich.");
    }
    try {
        const anbieterDocRef = db.collection('users').doc(jobDetails.selectedAnbieterId);
        const anbieterDoc = await anbieterDocRef.get();
        if (!anbieterDoc.exists) {
            v2_1.logger.error(`[createTemporaryJobDraft] Anbieter-Dokument (users/${jobDetails.selectedAnbieterId}) nicht gefunden.`);
            throw new https_1.HttpsError("not-found", `Der ausgewählte Anbieter wurde nicht gefunden.`);
        }
        const anbieterData = anbieterDoc.data();
        if (anbieterData && anbieterData.stripeAccountId && typeof anbieterData.stripeAccountId === 'string' && anbieterData.stripeAccountId.startsWith('acct_')) {
            anbieterStripeAccountId = anbieterData.stripeAccountId;
            v2_1.logger.info(`[createTemporaryJobDraft] Stripe Account ID für Anbieter ${jobDetails.selectedAnbieterId} gefunden: ${anbieterStripeAccountId}`);
        }
        else {
            v2_1.logger.error(`[createTemporaryJobDraft] Gültige Stripe Account ID für Anbieter ${jobDetails.selectedAnbieterId} nicht im users-Dokument ('${anbieterDoc.ref.path}') gefunden oder ungültig. Wert war: '${anbieterData?.stripeAccountId}'`);
            // Dies ist der kritische Punkt: Wenn keine gültige ID vorhanden ist, wird ein Fehler ausgelöst
            throw new https_1.HttpsError("failed-precondition", "Stripe Connect Konto des Anbieters ist nicht korrekt eingerichtet.");
        }
    }
    catch (dbError) {
        if (dbError instanceof https_1.HttpsError) { // Wirft bereits erstellte HttpsErrors erneut
            throw dbError;
        }
        v2_1.logger.error(`[createTemporaryJobDraft] Fehler beim Lesen des Anbieter-Dokuments (users/${jobDetails.selectedAnbieterId}):`, dbError.message, dbError);
        throw new https_1.HttpsError("internal", "Fehler beim Abrufen der Anbieterdetails.");
    }
    // --- Ende der korrigierten Logik für anbieterStripeAccountId ---
    try {
        const draftDataToSave = {
            customerType: jobDetails.customerType,
            selectedCategory: jobDetails.selectedCategory,
            selectedSubcategory: jobDetails.selectedSubcategory,
            description: jobDetails.description,
            jobStreet: jobDetails.jobStreet || null,
            jobPostalCode: jobDetails.jobPostalCode,
            jobCity: jobDetails.jobCity || null,
            jobCountry: jobDetails.jobCountry || null,
            jobDateFrom: jobDetails.jobDateFrom || jobDetails.dateFrom || null,
            jobDateTo: jobDetails.jobDateTo || jobDetails.dateTo || null,
            jobTimePreference: jobDetails.jobTimePreference || jobDetails.timePreference || null,
            selectedAnbieterId: jobDetails.selectedAnbieterId,
            jobDurationString: jobDetails.jobDurationString || null,
            jobTotalCalculatedHours: jobDetails.jobTotalCalculatedHours ?? null,
            jobCalculatedPriceInCents: jobDetails.jobCalculatedPriceInCents,
            kundeId: kundeId,
            anbieterStripeAccountId: anbieterStripeAccountId, // Sicherstellen, dass es im gespeicherten Entwurf enthalten ist
            customerFirstName: customerInfo.firstName,
            customerLastName: customerInfo.lastName,
            customerEmail: customerInfo.email,
            status: "pending_payment_setup",
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            lastUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        const docRef = await db.collection("temporaryJobDrafts").add(draftDataToSave);
        v2_1.logger.info(`[createTemporaryJobDraft] Draft ${docRef.id} für Kunde ${kundeId} und Anbieter ${jobDetails.selectedAnbieterId} erstellt.`);
        return {
            tempDraftId: docRef.id,
            anbieterStripeAccountId: anbieterStripeAccountId // Dies wird nun immer ein gültiger String sein, wenn die Funktion hier ankommt
        };
    }
    catch (e) {
        v2_1.logger.error(`[createTemporaryJobDraft] Fehler beim Speichern des Drafts:`, e.message, e);
        throw new https_1.HttpsError("internal", "Temporärer Auftragsentwurf konnte nicht gespeichert werden.", e.message);
    }
});
// --- getOrCreateStripeCustomer wurde aus dieser Datei verschoben nach callable_stripe.ts ---
// --- deleteCompanyAccount wird beibehalten ---
exports.deleteCompanyAccount = (0, https_1.onCall)(async (request) => {
    v2_1.logger.info("[deleteCompanyAccount] Aufgerufen von User:", request.auth?.uid);
    const db = (0, helpers_1.getDb)();
    if (!request.auth?.uid)
        throw new https_1.HttpsError("unauthenticated", "Nutzer muss angemeldet sein.");
    const userId = request.auth.uid;
    const localStripe = (0, helpers_1.getStripeInstance)(); // Kann hier bleiben, wenn in helpers.ts
    const userDocRef = db.collection("users").doc(userId);
    const companyDocRef = db.collection("companies").doc(userId);
    const adminAuthService = admin.auth();
    const adminStorageBucket = admin.storage().bucket();
    let stripeAccountId;
    const errors = [];
    try {
        const userDoc = await userDocRef.get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData?.user_type !== "firma")
                throw new https_1.HttpsError("permission-denied", "Nur Firmenkonten können gelöscht werden.");
            stripeAccountId = userData.stripeAccountId;
        }
        else {
            v2_1.logger.warn(`[deleteCompanyAccount] Nutzerdokument ${userId} nicht gefunden.`);
        }
        if (stripeAccountId?.startsWith("acct_")) {
            try {
                await localStripe.accounts.del(stripeAccountId);
                v2_1.logger.info(`Stripe Account ${stripeAccountId} gelöscht.`);
            }
            catch (e) {
                if (e.code === "account_invalid" || (e.type === "StripeInvalidRequestError" && e.raw?.code === "resource_missing")) {
                    v2_1.logger.warn(`Stripe Account ${stripeAccountId} existierte nicht oder war ungültig.`);
                }
                else {
                    errors.push(`Stripe-Konto nicht löschbar: ${e.message}`);
                    v2_1.logger.error(`Fehler Löschen Stripe Account ${stripeAccountId}:`, e);
                }
            }
        }
        const paths = [`profilePictures/${userId}/`, `logos/${userId}/`, `businessLicenses/${userId}/`, `masterCraftsmanCertificates/${userId}/`, `projectImages/${userId}/`, `identityDocs/${userId}/`];
        for (const p of paths) {
            try {
                await adminStorageBucket.deleteFiles({ prefix: p });
                v2_1.logger.info(`Storage ${p} gelöscht.`);
            }
            catch (e) {
                if (e.code !== 404 && e.code !== 'storage/object-not-found')
                    errors.push(`Storage ${p}: ${e.message}`);
                else
                    v2_1.logger.info(`Storage ${p} nicht gefunden.`);
            }
        }
        try {
            if ((await userDocRef.get()).exists)
                await userDocRef.delete();
            v2_1.logger.info(`Firestore 'users/${userId}' gelöscht.`);
        }
        catch (e) {
            errors.push(`Firestore (user): ${e.message}`);
        }
        try {
            if ((await companyDocRef.get()).exists)
                await companyDocRef.delete();
            v2_1.logger.info(`Firestore 'companies/${userId}' gelöscht.`);
        }
        catch (e) {
            errors.push(`Firestore (company): ${e.message}`);
        }
        try {
            await adminAuthService.deleteUser(userId);
            v2_1.logger.info(`Auth User ${userId} gelöscht.`);
        }
        catch (e) {
            if (e.code !== "auth/user-not-found")
                errors.push(`Auth-Fehler: ${e.message}`);
            else
                v2_1.logger.warn(`Auth User ${userId} nicht gefunden.`);
        }
        if (errors.length > 0)
            throw new https_1.HttpsError("internal", `Konto nicht vollständig gelöscht. Fehler: ${errors.join("; ")}`);
        return { success: true, message: "Konto und zugehörige Daten wurden gelöscht." };
    }
    catch (e) {
        v2_1.logger.error(`Schwerer Fehler deleteCompanyAccount für ${userId}:`, e.message, e);
        if (e instanceof https_1.HttpsError)
            throw e;
        throw new https_1.HttpsError("internal", e.message || "Unbekannter Serverfehler beim Löschen des Kontos.");
    }
});
//# sourceMappingURL=callable_general.js.map