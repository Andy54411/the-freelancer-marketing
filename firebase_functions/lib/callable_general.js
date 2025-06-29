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
exports.fixOrderProviderUid = exports.deleteCompanyAccount = exports.getReviewsByProvider = exports.submitReview = exports.createTemporaryJobDraft = exports.getClientIp = void 0;
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const helpers_1 = require("./helpers"); // getUserDisplayName hinzugefügt
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin")); // <-- Hinzufügen, falls nicht da
const params_1 = require("firebase-functions/params");
const constants_1 = require("./constants"); // Konstanten importieren
// Parameter zentral definieren (auf oberster Ebene der Datei)
const STRIPE_SECRET_KEY_GENERAL = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
// Konsolen-Logs anpassen für Klarheit
v2_1.logger.info("Lade callable_general.ts..."); // Nutze loggerV2 konsistent
try {
    v2_1.logger.info("callable_general.ts: Globale Initialisierung erfolgreich.");
}
catch (error) {
    v2_1.logger.error("callable_general.ts: Fehler bei globaler Initialisierung!", { error: error.message, stack: error.stack });
    throw error;
}
exports.getClientIp = (0, https_1.onRequest)({ cors: true }, (request, response) => {
    let clientIp = "IP_NOT_DETERMINED";
    const isEmulated = process.env.FUNCTIONS_EMULATOR === "true";
    const forwardedFor = request.headers["x-forwarded-for"];
    const realIpHeader = request.headers["x-real-ip"];
    if (forwardedFor && typeof forwardedFor === "string")
        clientIp = forwardedFor.split(",")[0].trim();
    else if (realIpHeader && typeof realIpHeader === "string")
        clientIp = realIpHeader.split(",")[0].trim();
    else if (request.ip)
        clientIp = request.ip;
    else if (request.socket?.remoteAddress)
        clientIp = request.socket.remoteAddress;
    if (isEmulated && (clientIp === "::1" || clientIp.startsWith("127.") || clientIp === "IP_NOT_DETERMINED")) {
        clientIp = "127.0.0.1";
    }
    else if (!isEmulated && (clientIp === "IP_NOT_DETERMINED" || clientIp.length < 7 || clientIp === "::1" || clientIp.startsWith("127.") || clientIp === "0.0.0.0")) {
        v2_1.logger.error(`[getClientIp] In NICHT-Emulator-Umgebung keine gültige IP. Gefunden: "${clientIp}".`);
        response.status(503).send({ error: "Gültige Client-IP konnte nicht ermittelt werden." });
        return;
    }
    v2_1.logger.info(`[getClientIp] final IP: ${clientIp}`);
    response.status(200).json({ ip: clientIp });
});
exports.createTemporaryJobDraft = (0, https_1.onCall)({
    region: "europe-west1",
}, async (request) => {
    try {
        v2_1.logger.info("[createTemporaryJobDraft] Aufgerufen mit Daten:", JSON.stringify(request.data, null, 2));
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'Nutzer muss authentifiziert sein.');
        }
        const kundeId = request.auth.uid;
        const kundeEmail = request.auth.token.email || '';
        const db = (0, helpers_1.getDb)();
        const jobDetails = request.data;
        if (!jobDetails.customerType ||
            !jobDetails.selectedCategory ||
            !jobDetails.selectedSubcategory ||
            !jobDetails.description.trim() ||
            !jobDetails.jobPostalCode ||
            !jobDetails.selectedAnbieterId ||
            !(typeof jobDetails.jobCalculatedPriceInCents === 'number' && jobDetails.jobCalculatedPriceInCents > 0)) {
            throw new https_1.HttpsError('invalid-argument', "Unvollständige oder ungültige Auftragsdetails übermittelt.");
        }
        const customerInfo = {
            firstName: constants_1.UNKNOWN_USER_NAME,
            lastName: '',
            email: kundeEmail
        };
        try {
            const userDoc = await db.collection('users').doc(kundeId).get();
            if (userDoc.exists) {
                const data = userDoc.data();
                if (data) {
                    customerInfo.firstName = data.firstName || constants_1.UNKNOWN_USER_NAME;
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
        let anbieterStripeAccountId;
        let providerName = constants_1.UNKNOWN_PROVIDER_NAME;
        if (!jobDetails.selectedAnbieterId) {
            v2_1.logger.error("[createTemporaryJobDraft] selectedAnbieterId ist leer."); // Added log
            throw new https_1.HttpsError('invalid-argument', "Die ID des ausgewählten Anbieters ist erforderlich.");
        }
        const anbieterDocRef = db.collection('users').doc(jobDetails.selectedAnbieterId);
        const anbieterDoc = await anbieterDocRef.get();
        if (!anbieterDoc.exists) {
            v2_1.logger.error(`[createTemporaryJobDraft] Anbieter ${jobDetails.selectedAnbieterId} nicht gefunden.`); // Added log
            throw new https_1.HttpsError('not-found', "Der ausgewählte Anbieter wurde nicht gefunden.");
        }
        const anbieterData = anbieterDoc.data();
        if (!anbieterData || anbieterData?.user_type !== 'firma') {
            v2_1.logger.error(`[createTemporaryJobDraft] Anbieter ${jobDetails.selectedAnbieterId} gefunden, aber kein Firmenkonto oder ungültige Daten. user_type: ${anbieterData?.user_type}`); // Added log
            throw new https_1.HttpsError('failed-precondition', "Der ausgewählte Anbieter ist kein gültiges Firmenkonto.");
        }
        // Logik zur Namensfindung mit der zentralen Hilfsfunktion vereinfacht
        const anbieterCompanyDoc = await db.collection('companies').doc(jobDetails.selectedAnbieterId).get();
        const companyData = anbieterCompanyDoc.exists ? anbieterCompanyDoc.data() : null;
        providerName = (0, helpers_1.getUserDisplayName)(companyData, (0, helpers_1.getUserDisplayName)(anbieterData, constants_1.UNKNOWN_PROVIDER_NAME));
        if (anbieterData && anbieterData.stripeAccountId && typeof anbieterData.stripeAccountId === 'string' && anbieterData.stripeAccountId.startsWith('acct_')) {
            anbieterStripeAccountId = anbieterData.stripeAccountId;
        }
        else {
            v2_1.logger.error(`[createTemporaryJobDraft] Gültige Stripe Account ID für Anbieter ${jobDetails.selectedAnbieterId} nicht gefunden.`);
            throw new https_1.HttpsError('failed-precondition', "Stripe Connect Konto des Anbieters ist nicht korrekt eingerichtet.");
        }
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
            providerName: providerName,
            jobDurationString: jobDetails.jobDurationString || null,
            jobTotalCalculatedHours: jobDetails.jobTotalCalculatedHours ?? null,
            jobCalculatedPriceInCents: jobDetails.jobCalculatedPriceInCents,
            kundeId: kundeId,
            anbieterStripeAccountId: anbieterStripeAccountId,
            customerFirstName: customerInfo.firstName,
            customerLastName: customerInfo.lastName,
            customerEmail: customerInfo.email,
            status: "pending_payment_setup",
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            lastUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        const docRef = await db.collection("temporaryJobDrafts").add(draftDataToSave);
        v2_1.logger.info(`[createTemporaryJobDraft] Draft ${docRef.id} für Kunde ${kundeId} erstellt.`);
        // Return the result in the format expected by the onCall client
        return {
            tempDraftId: docRef.id,
            anbieterStripeAccountId: anbieterStripeAccountId,
        };
    }
    catch (error) {
        v2_1.logger.error(`[createTemporaryJobDraft] Unerwarteter Fehler:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || "Ein interner Serverfehler ist aufgetreten.");
    }
});
exports.submitReview = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    v2_1.logger.info("[submitReview] Called with data:", request.data);
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { anbieterId, kundeId, auftragId, sterne, kommentar, kundeProfilePictureURL, kategorie, unterkategorie } = request.data;
    if (request.auth.uid !== kundeId) {
        throw new https_1.HttpsError('permission-denied', 'You can only submit reviews for yourself.');
    }
    if (!anbieterId || !kundeId || !auftragId || typeof sterne !== "number" || sterne < 1 || sterne > 5 || !kategorie || !unterkategorie) {
        throw new https_1.HttpsError('invalid-argument', 'Missing or invalid data provided for review submission.');
    }
    const db = (0, helpers_1.getDb)();
    try {
        const newReviewData = {
            anbieterId,
            kundeId,
            auftragId,
            sterne,
            kommentar: kommentar || "",
            kundeProfilePictureURL: kundeProfilePictureURL || null,
            kategorie,
            unterkategorie,
            erstellungsdatum: new Date(),
        };
        const docRef = await db.collection("reviews").add(newReviewData);
        v2_1.logger.info(`[submitReview] Review ${docRef.id} created successfully.`);
        return { message: "Review submitted", reviewId: docRef.id };
    }
    catch (error) {
        v2_1.logger.error("[submitReview] Error saving review to Firestore:", error);
        throw new https_1.HttpsError('internal', 'Failed to save the review.', error.message);
    }
});
exports.getReviewsByProvider = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    v2_1.logger.info("[getReviewsByProvider] Called for provider:", request.data.anbieterId);
    const { anbieterId } = request.data;
    if (!anbieterId) {
        throw new https_1.HttpsError('invalid-argument', 'The anbieterId is required.');
    }
    const db = (0, helpers_1.getDb)();
    try {
        const reviewsRef = db.collection('reviews');
        const snapshot = await reviewsRef.where('anbieterId', '==', anbieterId).orderBy('erstellungsdatum', 'desc').get();
        const reviews = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            reviews.push({
                id: doc.id,
                kundeId: data.kundeId,
                sterne: data.sterne,
                kommentar: data.kommentar,
                kundeProfilePictureURL: data.kundeProfilePictureURL,
                erstellungsdatum: data.erstellungsdatum instanceof admin.firestore.Timestamp ? data.erstellungsdatum.toDate() : data.erstellungsdatum,
            });
        });
        return reviews;
    }
    catch (error) {
        v2_1.logger.error("[getReviewsByProvider] Error fetching reviews from Firestore:", error);
        throw new https_1.HttpsError('internal', 'Failed to fetch reviews.', error.message);
    }
});
// --- getOrCreateStripeCustomer wurde aus dieser Datei verschoben nach callable_stripe.ts ---
// --- deleteCompanyAccount wird beibehalten ---
exports.deleteCompanyAccount = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    v2_1.logger.info("[deleteCompanyAccount] Aufgerufen von User:", request.auth?.uid);
    const db = (0, helpers_1.getDb)();
    if (!request.auth?.uid)
        throw new https_1.HttpsError("unauthenticated", "Nutzer muss angemeldet sein.");
    const userId = request.auth.uid;
    // Die Logik für den Emulator-Modus wird von defineSecret gehandhabt,
    // daher ist keine manuelle isEmulated-Prüfung mehr nötig.
    const stripeKey = STRIPE_SECRET_KEY_GENERAL.value();
    const localStripe = (0, helpers_1.getStripeInstance)(stripeKey);
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
exports.fixOrderProviderUid = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    v2_1.logger.info("[fixOrderProviderUid] Aufgerufen mit Daten:", request.data);
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Die Funktion muss authentifiziert aufgerufen werden.');
    }
    const { orderId, correctProviderUid } = request.data;
    if (!orderId || !correctProviderUid) {
        throw new https_1.HttpsError('invalid-argument', 'orderId und correctProviderUid sind erforderlich.');
    }
    const db = (0, helpers_1.getDb)();
    try {
        const orderRef = db.collection('auftraege').doc(orderId);
        const orderDoc = await orderRef.get();
        if (!orderDoc.exists) {
            v2_1.logger.warn(`[fixOrderProviderUid] Auftrag ${orderId} nicht gefunden.`);
            throw new https_1.HttpsError('not-found', `Auftrag ${orderId} nicht gefunden.`);
        }
        const currentAnbieterId = orderDoc.data()?.selectedAnbieterId;
        await orderRef.update({
            selectedAnbieterId: correctProviderUid,
            lastUpdatedAt: firestore_1.FieldValue.serverTimestamp(), // Update timestamp
            fixedByAdmin: request.auth.uid, // Zur Auditierung: Wer hat es behoben
            fixedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        v2_1.logger.info(`[fixOrderProviderUid] Auftrag ${orderId}: selectedAnbieterId von ${currentAnbieterId} auf ${correctProviderUid} aktualisiert.`);
        return { success: true, message: `Auftrag ${orderId} erfolgreich auf Anbieter-UID ${correctProviderUid} aktualisiert.` };
    }
    catch (error) {
        v2_1.logger.error(`[fixOrderProviderUid] Fehler beim Aktualisieren des Auftrags ${orderId}:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Fehler beim Beheben des Auftrags.', error.message);
    }
});
//# sourceMappingURL=callable_general.js.map