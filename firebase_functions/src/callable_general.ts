// functions/src/callable_general.ts

import { onCall, HttpsError, onRequest, CallableRequest } from 'firebase-functions/v2/https';
import { logger as loggerV2 } from 'firebase-functions/v2';
import { getDb, getStripeInstance, getUserDisplayName } from './helpers'; // getUserDisplayName hinzugefügt
import { FieldValue } from 'firebase-admin/firestore';
import * as admin from "firebase-admin"; // <-- Hinzufügen, falls nicht da
import { defineSecret } from 'firebase-functions/params';
import { UNKNOWN_USER_NAME, UNKNOWN_PROVIDER_NAME } from './constants'; // Konstanten importieren

// Parameter zentral definieren (auf oberster Ebene der Datei)
const STRIPE_SECRET_KEY_GENERAL = defineSecret("STRIPE_SECRET_KEY");

// Konsolen-Logs anpassen für Klarheit
loggerV2.info("Lade callable_general.ts..."); // Nutze loggerV2 konsistent

try {
  loggerV2.info("callable_general.ts: Globale Initialisierung erfolgreich.");
} catch (error: any) {
  loggerV2.error("callable_general.ts: Fehler bei globaler Initialisierung!", { error: error.message, stack: error.stack });
  throw error;
}



interface TemporaryJobDraftData {
  customerType: 'private' | 'business' | null;
  selectedCategory: string | null;
  selectedSubcategory: string | null;
  description: string;
  jobStreet?: string;
  jobPostalCode?: string;
  jobCity?: string;
  jobCountry?: string | null;
  jobDateFrom?: string | null;
  jobDateTo?: string | null;
  jobTimePreference?: string | null;
  providerName?: string | null; // Name of the provider/freelancer
  selectedAnbieterId?: string | null;
  jobDurationString?: string;
  jobTotalCalculatedHours?: number | null;
  jobCalculatedPriceInCents?: number | null;
}

interface TemporaryJobDraftResult {
  tempDraftId: string;
  anbieterStripeAccountId?: string | null;
}

// CustomerAddress, GetOrCreateStripeCustomerPayload, GetOrCreateStripeCustomerResult
// sind hier nicht mehr direkt für die Funktionen in dieser Datei notwendig,
// da getOrCreateStripeCustomer verschoben wird.

interface DeleteCompanyAccountResult {
  success: boolean;
  message: string;
}

// --- Cloud Functions ---

// --- Interfaces for Review Functions ---
interface SubmitReviewData {
  anbieterId: string;
  kundeId: string;
  auftragId: string;
  sterne: number;
  kommentar: string;
  kundeProfilePictureURL?: string;
  kategorie: string;
  unterkategorie: string;
}

interface SubmitReviewResult {
  message: string;
  reviewId: string;
}

interface ReviewData {
  id: string;
  kundeId: string;
  sterne: number;
  kommentar: string;
  kundeProfilePictureURL?: string;
  erstellungsdatum?: { _seconds: number, _nanoseconds: number } | Date;
}


export const getClientIp = onRequest({ cors: true }, (request, response) => {
  let clientIp = "IP_NOT_DETERMINED";
  const isEmulated = process.env.FUNCTIONS_EMULATOR === "true";

  const forwardedFor = request.headers["x-forwarded-for"];
  const realIpHeader = request.headers["x-real-ip"];

  if (forwardedFor && typeof forwardedFor === "string") clientIp = forwardedFor.split(",")[0].trim();
  else if (realIpHeader && typeof realIpHeader === "string") clientIp = realIpHeader.split(",")[0].trim();
  else if (request.ip) clientIp = request.ip;
  else if (request.socket?.remoteAddress) clientIp = request.socket.remoteAddress;

  if (isEmulated && (clientIp === "::1" || clientIp.startsWith("127.") || clientIp === "IP_NOT_DETERMINED")) {
    clientIp = "127.0.0.1";
  } else if (!isEmulated && (clientIp === "IP_NOT_DETERMINED" || clientIp.length < 7 || clientIp === "::1" || clientIp.startsWith("127.") || clientIp === "0.0.0.0")) {
    loggerV2.error(`[getClientIp] In NICHT-Emulator-Umgebung keine gültige IP. Gefunden: "${clientIp}".`);
    response.status(503).send({ error: "Gültige Client-IP konnte nicht ermittelt werden." });
    return;
  }
  loggerV2.info(`[getClientIp] final IP: ${clientIp}`);
  response.status(200).json({ ip: clientIp });
});

export const createTemporaryJobDraft = onCall(
  {
    region: "europe-west1",
  },
  async (request: CallableRequest<TemporaryJobDraftData>): Promise<TemporaryJobDraftResult> => {
    try {
      loggerV2.info("[createTemporaryJobDraft] Aufgerufen mit Daten:", JSON.stringify(request.data, null, 2));

      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Nutzer muss authentifiziert sein.');
      }
      const kundeId = request.auth.uid;
      const kundeEmail = request.auth.token.email || '';

      const db = getDb();
      const jobDetails = request.data;

      if (
        !jobDetails.customerType ||
        !jobDetails.selectedCategory ||
        !jobDetails.selectedSubcategory ||
        !jobDetails.description.trim() ||
        !jobDetails.jobPostalCode ||
        !jobDetails.selectedAnbieterId ||
        !(typeof jobDetails.jobCalculatedPriceInCents === 'number' && jobDetails.jobCalculatedPriceInCents > 0)
      ) {
        throw new HttpsError('invalid-argument', "Unvollständige oder ungültige Auftragsdetails übermittelt.");
      }

      const customerInfo = {
        firstName: UNKNOWN_USER_NAME,
        lastName: '',
        email: kundeEmail
      };
      try {
        const userDoc = await db.collection('users').doc(kundeId).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          if (data) {
            customerInfo.firstName = data.firstName || UNKNOWN_USER_NAME;
            customerInfo.lastName = data.lastName || '';
            customerInfo.email = data.email || customerInfo.email;
          }
          loggerV2.info(`[createTemporaryJobDraft] Kundendaten für ${kundeId} geladen.`);
        } else {
          loggerV2.warn(`[createTemporaryJobDraft] Konnte kein User-Dokument für Kunde ${kundeId} finden.`);
        }
      } catch (e: any) {
        loggerV2.error(`[createTemporaryJobDraft] Fehler beim Laden der Kundendaten für ${kundeId}:`, e.message);
      }

      let anbieterStripeAccountId: string;
      let providerName: string = UNKNOWN_PROVIDER_NAME;

      if (!jobDetails.selectedAnbieterId) {
        loggerV2.error("[createTemporaryJobDraft] selectedAnbieterId ist leer."); // Added log
        throw new HttpsError('invalid-argument', "Die ID des ausgewählten Anbieters ist erforderlich.");
      }

      // The 'users' document is the single source of truth for a provider's existence and type.
      const anbieterUserDocRef = db.collection('users').doc(jobDetails.selectedAnbieterId);
      const anbieterUserDoc = await anbieterUserDocRef.get();

      if (!anbieterUserDoc.exists) {
        // This is a critical error. The provider selected by the client does not exist in our system.
        loggerV2.error(`[createTemporaryJobDraft] Anbieter-Nutzerdokument für ID ${jobDetails.selectedAnbieterId} nicht gefunden. Auftrag kann nicht erstellt werden.`);
        throw new HttpsError('not-found', "Der ausgewählte Anbieter wurde nicht gefunden. Bitte versuchen Sie es erneut oder kontaktieren Sie den Support.");
      }

      const anbieterData = anbieterUserDoc.data();
      if (anbieterData?.user_type !== 'firma') {
        // The user exists but is not a company, which is a precondition for creating a job draft against them.
        loggerV2.error(`[createTemporaryJobDraft] Anbieter ${jobDetails.selectedAnbieterId} ist kein Firmenkonto. user_type: ${anbieterData?.user_type}`);
        throw new HttpsError('failed-precondition', "Der ausgewählte Anbieter ist kein gültiges Firmenkonto.");
      }

      // Now that we've validated the provider, let's get their public profile data.
      // The 'companies' document might not exist yet due to replication lag from triggers,
      // so we handle this gracefully.
      const anbieterCompanyDoc = await db.collection('companies').doc(jobDetails.selectedAnbieterId).get();
      if (!anbieterCompanyDoc.exists) {
        loggerV2.warn(`[createTemporaryJobDraft] Firmenprofil für Anbieter ${jobDetails.selectedAnbieterId} nicht in 'companies' gefunden. Dies deutet auf eine Replikationsverzögerung hin. Fahre mit Daten aus 'users' fort.`);
      }

      // Logik zur Namensfindung: Priorisiere Daten aus dem 'companies'-Dokument (die öffentliche Ansicht),
      // aber nutze das 'users'-Dokument als Fallback, um einen Namen zu finden.
      const companyData = anbieterCompanyDoc.exists ? anbieterCompanyDoc.data() : anbieterUserDoc.data();
      providerName = getUserDisplayName(companyData, getUserDisplayName(anbieterData, UNKNOWN_PROVIDER_NAME));

      if (anbieterData && anbieterData.stripeAccountId && typeof anbieterData.stripeAccountId === 'string' && anbieterData.stripeAccountId.startsWith('acct_')) {
        anbieterStripeAccountId = anbieterData.stripeAccountId;
      } else {
        loggerV2.error(`[createTemporaryJobDraft] Gültige Stripe Account ID für Anbieter ${jobDetails.selectedAnbieterId} nicht gefunden.`);
        throw new HttpsError('failed-precondition', "Stripe Connect Konto des Anbieters ist nicht korrekt eingerichtet.");
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
        jobDateFrom: jobDetails.jobDateFrom || null,
        jobDateTo: jobDetails.jobDateTo || null,
        jobTimePreference: jobDetails.jobTimePreference || null,
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
        createdAt: FieldValue.serverTimestamp(),
        lastUpdatedAt: FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection("temporaryJobDrafts").add(draftDataToSave);
      loggerV2.info(`[createTemporaryJobDraft] Draft ${docRef.id} für Kunde ${kundeId} erstellt.`);

      // Return the result in the format expected by the onCall client
      return {
        tempDraftId: docRef.id,
        anbieterStripeAccountId: anbieterStripeAccountId,
      };

    } catch (error: any) {
      loggerV2.error(`[createTemporaryJobDraft] Unerwarteter Fehler:`, error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', error.message || "Ein interner Serverfehler ist aufgetreten.");
    }
  }
);

export const submitReview = onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<SubmitReviewData>): Promise<SubmitReviewResult> => {
    loggerV2.info("[submitReview] Called with data:", request.data);

    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { anbieterId, kundeId, auftragId, sterne, kommentar, kundeProfilePictureURL, kategorie, unterkategorie } = request.data;

    if (request.auth.uid !== kundeId) {
      throw new HttpsError('permission-denied', 'You can only submit reviews for yourself.');
    }

    if (!anbieterId || !kundeId || !auftragId || typeof sterne !== "number" || sterne < 1 || sterne > 5 || !kategorie || !unterkategorie) {
      throw new HttpsError('invalid-argument', 'Missing or invalid data provided for review submission.');
    }

    const db = getDb();
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
      loggerV2.info(`[submitReview] Review ${docRef.id} created successfully.`);
      return { message: "Review submitted", reviewId: docRef.id };
    } catch (error: any) {
      loggerV2.error("[submitReview] Error saving review to Firestore:", error);
      throw new HttpsError('internal', 'Failed to save the review.', error.message);
    }
  }
);

export const getReviewsByProvider = onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<{ anbieterId: string }>): Promise<ReviewData[]> => {
    loggerV2.info("[getReviewsByProvider] Called for provider:", request.data.anbieterId);

    const { anbieterId } = request.data;
    if (!anbieterId) {
      throw new HttpsError('invalid-argument', 'The anbieterId is required.');
    }

    const db = getDb();
    try {
      const reviewsRef = db.collection('reviews');
      const snapshot = await reviewsRef.where('anbieterId', '==', anbieterId).orderBy('erstellungsdatum', 'desc').get();

      const reviews: ReviewData[] = [];
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
    } catch (error: any) {
      loggerV2.error("[getReviewsByProvider] Error fetching reviews from Firestore:", error);
      throw new HttpsError('internal', 'Failed to fetch reviews.', error.message);
    }
  }
);

// --- getOrCreateStripeCustomer wurde aus dieser Datei verschoben nach callable_stripe.ts ---
// --- deleteCompanyAccount wird beibehalten ---

export const deleteCompanyAccount = onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<Record<string, never>>): Promise<DeleteCompanyAccountResult> => {
    loggerV2.info("[deleteCompanyAccount] Aufgerufen von User:", request.auth?.uid);
    const db = getDb();
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Nutzer muss angemeldet sein.");
    const userId = request.auth.uid;

    // Die Logik für den Emulator-Modus wird von defineSecret gehandhabt,
    // daher ist keine manuelle isEmulated-Prüfung mehr nötig.
    const stripeKey = STRIPE_SECRET_KEY_GENERAL.value();
    const localStripe = getStripeInstance(stripeKey);
    const userDocRef = db.collection("users").doc(userId);
    const companyDocRef = db.collection("companies").doc(userId);
    const adminAuthService = admin.auth();
    const adminStorageBucket = admin.storage().bucket();
    let stripeAccountId: string | undefined;
    const errors: string[] = [];

    try {
      const userDoc = await userDocRef.get();
      if (userDoc.exists) {
        const userData = userDoc.data() as any;
        if (userData?.user_type !== "firma") throw new HttpsError("permission-denied", "Nur Firmenkonten können gelöscht werden.");
        stripeAccountId = userData.stripeAccountId as string | undefined;
      } else { loggerV2.warn(`[deleteCompanyAccount] Nutzerdokument ${userId} nicht gefunden.`); }

      if (stripeAccountId?.startsWith("acct_")) {
        try { await localStripe.accounts.del(stripeAccountId); loggerV2.info(`Stripe Account ${stripeAccountId} gelöscht.`); }
        catch (e: any) {
          if (e.code === "account_invalid" || (e.type === "StripeInvalidRequestError" && e.raw?.code === "resource_missing")) {
            loggerV2.warn(`Stripe Account ${stripeAccountId} existierte nicht oder war ungültig.`);
          } else {
            errors.push(`Stripe-Konto nicht löschbar: ${e.message}`);
            loggerV2.error(`Fehler Löschen Stripe Account ${stripeAccountId}:`, e);
          }
        }
      }
      // This is the robust way to delete all user-related files.
      // The old logic with multiple paths is no longer needed and can be removed.
      const userUploadsPrefix = `user_uploads/${userId}/`;
      try {
        await adminStorageBucket.deleteFiles({ prefix: userUploadsPrefix });
        loggerV2.info(`Storage-Dateien unter dem Präfix '${userUploadsPrefix}' gelöscht.`);
      } catch (e: any) {
        // It's not an error if the folder doesn't exist.
        if (e.code !== 404 && e.code !== 'storage/object-not-found') {
          errors.push(`Storage (${userUploadsPrefix}): ${e.message}`);
        } else {
          loggerV2.info(`Keine Storage-Dateien unter dem Präfix '${userUploadsPrefix}' gefunden.`);
        }
      }
      try { if ((await userDocRef.get()).exists) await userDocRef.delete(); loggerV2.info(`Firestore 'users/${userId}' gelöscht.`); }
      catch (e: any) { errors.push(`Firestore (user): ${e.message}`); }
      try { if ((await companyDocRef.get()).exists) await companyDocRef.delete(); loggerV2.info(`Firestore 'companies/${userId}' gelöscht.`); }
      catch (e: any) { errors.push(`Firestore (company): ${e.message}`); }
      try { await adminAuthService.deleteUser(userId); loggerV2.info(`Auth User ${userId} gelöscht.`); }
      catch (e: any) { if (e.code !== "auth/user-not-found") errors.push(`Auth-Fehler: ${e.message}`); else loggerV2.warn(`Auth User ${userId} nicht gefunden.`); }

      if (errors.length > 0) throw new HttpsError("internal", `Konto nicht vollständig gelöscht. Fehler: ${errors.join("; ")}`);
      return { success: true, message: "Konto und zugehörige Daten wurden gelöscht." };
    } catch (e: any) {
      loggerV2.error(`Schwerer Fehler deleteCompanyAccount für ${userId}:`, e.message, e);
      if (e instanceof HttpsError) throw e;
      throw new HttpsError("internal", e.message || "Unbekannter Serverfehler beim Löschen des Kontos.");
    }
  }
);

interface FixOrderProviderUidData {
  orderId: string;
  correctProviderUid: string;
}

interface FixOrderProviderUidResult {
  success: boolean;
  message: string;
}

export const fixOrderProviderUid = onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<FixOrderProviderUidData>): Promise<FixOrderProviderUidResult> => {
    loggerV2.info("[fixOrderProviderUid] Aufgerufen mit Daten:", request.data);

    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Die Funktion muss authentifiziert aufgerufen werden.');
    }

    const { orderId, correctProviderUid } = request.data;

    if (!orderId || !correctProviderUid) {
      throw new HttpsError('invalid-argument', 'orderId und correctProviderUid sind erforderlich.');
    }

    const db = getDb();

    try {
      const orderRef = db.collection('auftraege').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        loggerV2.warn(`[fixOrderProviderUid] Auftrag ${orderId} nicht gefunden.`);
        throw new HttpsError('not-found', `Auftrag ${orderId} nicht gefunden.`);
      }

      const currentAnbieterId = orderDoc.data()?.selectedAnbieterId;
      await orderRef.update({
        selectedAnbieterId: correctProviderUid,
        lastUpdatedAt: FieldValue.serverTimestamp(), // Update timestamp
        fixedByAdmin: request.auth.uid, // Zur Auditierung: Wer hat es behoben
        fixedAt: FieldValue.serverTimestamp(),
      });
      loggerV2.info(`[fixOrderProviderUid] Auftrag ${orderId}: selectedAnbieterId von ${currentAnbieterId} auf ${correctProviderUid} aktualisiert.`);
      return { success: true, message: `Auftrag ${orderId} erfolgreich auf Anbieter-UID ${correctProviderUid} aktualisiert.` };
    } catch (error: any) {
      loggerV2.error(`[fixOrderProviderUid] Fehler beim Aktualisieren des Auftrags ${orderId}:`, error);
      if (error instanceof HttpsError) { throw error; }
      throw new HttpsError('internal', 'Fehler beim Beheben des Auftrags.', error.message);
    }
  }
);