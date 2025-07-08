// functions/src/callable_general.ts

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { logger } from "firebase-functions/v2";
import { getDb, getUserDisplayName, deleteCollection, verifyAdmin } from './helpers';
import { FieldValue } from 'firebase-admin/firestore';
import * as admin from "firebase-admin";
import { UNKNOWN_USER_NAME, UNKNOWN_PROVIDER_NAME } from './constants';

// Konsolen-Logs anpassen für Klarheit
logger.info("Lade callable_general.ts...");

try {
  logger.info("callable_general.ts: Globale Initialisierung erfolgreich.");
} catch (error: any) {
  logger.error("callable_general.ts: Fehler bei globaler Initialisierung!", { error: error.message, stack: error.stack });
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

export const getClientIp = onCall({ cors: true }, (request) => {
  // HttpsError wird bei onCall-Funktionen bevorzugt.
  if (!request.rawRequest) {
    throw new HttpsError('internal', 'Raw request is not available.');
  }

  let clientIp = "IP_NOT_DETERMINED";
  const isEmulated = process.env.FUNCTIONS_EMULATOR === "true";

  const forwardedFor = request.rawRequest.headers["x-forwarded-for"];
  const realIpHeader = request.rawRequest.headers["x-real-ip"];

  if (forwardedFor && typeof forwardedFor === "string") {
    clientIp = forwardedFor.split(",")[0].trim();
  } else if (realIpHeader && typeof realIpHeader === "string") {
    clientIp = realIpHeader.split(",")[0].trim();
  } else if (request.rawRequest.ip) {
    clientIp = request.rawRequest.ip;
  } else if (request.rawRequest.socket?.remoteAddress) {
    clientIp = request.rawRequest.socket.remoteAddress;
  }

  if (isEmulated && (clientIp === "::1" || clientIp.startsWith("127.") || clientIp === "IP_NOT_DETERMINED")) {
    clientIp = "127.0.0.1"; // Standard-Emulator-IP
  }

  if (clientIp === "IP_NOT_DETERMINED" || clientIp.length < 7) {
    logger.info(`[getClientIp] Konnte keine gültige IP ermitteln. Headers: ${JSON.stringify(request.rawRequest.headers)}`);
    // Anstatt einen Fehler zu werfen, der den Client blockiert, geben wir einen klaren Status zurück.
    // Der Client kann dann entscheiden, ob er den Fallback (ipify) nutzen möchte.
    return { ip: 'IP_NOT_DETERMINED' };
  }

  logger.info(`[getClientIp] Ermittelte IP: ${clientIp}`);
  return { ip: clientIp };
});

export const createTemporaryJobDraft = onCall(
  {
    region: "europe-west1",
  },
  async (request: CallableRequest<TemporaryJobDraftData>): Promise<TemporaryJobDraftResult> => {
    try {
      logger.info("[createTemporaryJobDraft] Aufgerufen mit Daten:", JSON.stringify(request.data, null, 2));

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
          logger.info(`[createTemporaryJobDraft] Kundendaten für ${kundeId} geladen.`);
        } else {
          logger.warn(`[createTemporaryJobDraft] Konnte kein User-Dokument für Kunde ${kundeId} finden.`);
        }
      } catch (e: any) {
        logger.error(`[createTemporaryJobDraft] Fehler beim Laden der Kundendaten für ${kundeId}:`, e.message);
      }

      let anbieterStripeAccountId: string;
      let providerName: string = UNKNOWN_PROVIDER_NAME;

      if (!jobDetails.selectedAnbieterId) {
        logger.error("[createTemporaryJobDraft] selectedAnbieterId ist leer."); // Added log
        throw new HttpsError('invalid-argument', "Die ID des ausgewählten Anbieters ist erforderlich.");
      }

      // The 'users' document is the single source of truth for a provider's existence and type.
      const anbieterUserDocRef = db.collection('users').doc(jobDetails.selectedAnbieterId);
      const anbieterUserDoc = await anbieterUserDocRef.get();

      if (!anbieterUserDoc.exists) {
        // This is a critical error. The provider selected by the client does not exist in our system.
        logger.error(`[createTemporaryJobDraft] Anbieter-Nutzerdokument für ID ${jobDetails.selectedAnbieterId} nicht gefunden. Auftrag kann nicht erstellt werden.`);
        throw new HttpsError('not-found', "Der ausgewählte Anbieter wurde nicht gefunden. Bitte versuchen Sie es erneut oder kontaktieren Sie den Support.");
      }

      const anbieterData = anbieterUserDoc.data();
      if (anbieterData?.user_type !== 'firma') {
        // The user exists but is not a company, which is a precondition for creating a job draft against them.
        logger.error(`[createTemporaryJobDraft] Anbieter ${jobDetails.selectedAnbieterId} ist kein Firmenkonto. user_type: ${anbieterData?.user_type}`);
        throw new HttpsError('failed-precondition', "Der ausgewählte Anbieter ist kein gültiges Firmenkonto.");
      }

      // Now that we've validated the provider, let's get their public profile data.
      // The 'companies' document might not exist yet due to replication lag from triggers,
      // so we handle this gracefully.
      const anbieterCompanyDoc = await db.collection('companies').doc(jobDetails.selectedAnbieterId).get();
      if (!anbieterCompanyDoc.exists) {
        logger.warn(`[createTemporaryJobDraft] Firmenprofil für Anbieter ${jobDetails.selectedAnbieterId} nicht in 'companies' gefunden. Dies deutet auf eine Replikationsverzögerung hin. Fahre mit Daten aus 'users' fort.`);
      }

      // Logik zur Namensfindung: Priorisiere Daten aus dem 'companies'-Dokument (die öffentliche Ansicht),
      // aber nutze das 'users'-Dokument als Fallback, um einen Namen zu finden.
      const companyData = anbieterCompanyDoc.exists ? anbieterCompanyDoc.data() : anbieterUserDoc.data();
      providerName = getUserDisplayName(companyData, getUserDisplayName(anbieterData, UNKNOWN_PROVIDER_NAME));

      if (anbieterData && anbieterData.stripeAccountId && typeof anbieterData.stripeAccountId === 'string' && anbieterData.stripeAccountId.startsWith('acct_')) {
        anbieterStripeAccountId = anbieterData.stripeAccountId;
      } else {
        logger.error(`[createTemporaryJobDraft] Gültige Stripe Account ID für Anbieter ${jobDetails.selectedAnbieterId} nicht gefunden.`);
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
      logger.info(`[createTemporaryJobDraft] Draft ${docRef.id} für Kunde ${kundeId} erstellt.`);

      // Return the result in the format expected by the onCall client
      return {
        tempDraftId: docRef.id,
        anbieterStripeAccountId: anbieterStripeAccountId,
      };

    } catch (error: any) {
      logger.error(`[createTemporaryJobDraft] Unerwarteter Fehler:`, error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', error.message || "Ein interner Serverfehler ist aufgetreten.");
    }
  }
);

export const submitReview = onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<SubmitReviewData>): Promise<SubmitReviewResult> => {
    logger.info("[submitReview] Called with data:", request.data);

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
      logger.info(`[submitReview] Review ${docRef.id} created successfully.`);
      return { message: "Review submitted", reviewId: docRef.id };
    } catch (error: any) {
      logger.error("[submitReview] Error saving review to Firestore:", error);
      throw new HttpsError('internal', 'Failed to save the review.', error.message);
    }
  }
);

export const getReviewsByProvider = onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<{ anbieterId: string }>): Promise<ReviewData[]> => {
    logger.info("[getReviewsByProvider] Called for provider:", request.data.anbieterId);

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
      logger.error("[getReviewsByProvider] Error fetching reviews from Firestore:", error);
      throw new HttpsError('internal', 'Failed to fetch reviews.', error.message);
    }
  }
);

// --- getOrCreateStripeCustomer wurde aus dieser Datei verschoben nach callable_stripe.ts ---

export const deleteCompanyAccount = onCall(
  {
    region: "europe-west1",
    // Erlaube Anfragen von der Vercel-Produktionsumgebung und vom lokalen Emulator.
    cors: ["https://tasko-rho.vercel.app", "http://localhost:3000"],
  },
  async (request: CallableRequest<{ companyId: string }>): Promise<{ success: boolean; message: string; }> => {
    logger.info(`[Action] Aufruf zum Löschen der Firma empfangen für: ${request.data.companyId}`);

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Benutzer muss für diese Aktion authentifiziert sein.");
    }

    const adminUid = request.auth.uid;
    const { companyId } = request.data;

    const isAdmin = await verifyAdmin(adminUid);
    if (!isAdmin) {
      throw new HttpsError(
        "permission-denied",
        "Zugriff verweigert. Nur Administratoren können diese Aktion ausführen."
      );
    }

    if (!companyId || typeof companyId !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "Die `companyId` ist erforderlich und muss ein String sein."
      );
    }

    const db = getDb();
    try {
      logger.info(`[Action] Admin ${adminUid} startet Löschvorgang für Firma ${companyId}.`);

      const companyRef = db.collection("companies").doc(companyId);
      const companyDoc = await companyRef.get();

      if (!companyDoc.exists) {
        throw new HttpsError("not-found", `Firma mit ID ${companyId} nicht gefunden.`);
      }

      const companyData = companyDoc.data();
      const ownerUid = companyData?.ownerUid;

      // 1. Alle Subkollektionen und Dokumente in Firestore löschen
      await deleteCollection(db, `companies/${companyId}/documents`, 100);
      await deleteCollection(db, `companies/${companyId}/inviteCodes`, 100);
      await deleteCollection(db, `companies/${companyId}/orders`, 100);
      await deleteCollection(db, `companies/${companyId}/reviews`, 100);
      await deleteCollection(db, `companies/${companyId}/services`, 100);
      await deleteCollection(db, `companies/${companyId}/stripe_customers`, 100);
      logger.info(`[Action] Alle Subkollektionen für Firma ${companyId} gelöscht.`);

      // 2. Das Haupt-Firmendokument löschen
      await companyRef.delete();
      logger.info(`[Action] Hauptdokument für Firma ${companyId} gelöscht.`);

      // 3. Den zugehörigen Firebase Auth Benutzer löschen (falls vorhanden)
      if (ownerUid) {
        try {
          await admin.auth().deleteUser(ownerUid);
          logger.info(`[Action] Firebase Auth Benutzer ${ownerUid} für Firma ${companyId} gelöscht.`);
        } catch (authError: any) {
          if (authError.code === "auth/user-not-found") {
            logger.warn(`[Action] Firebase Auth Benutzer ${ownerUid} wurde bereits gelöscht.`);
          } else {
            logger.error(`[Action] Fehler beim Löschen des Auth-Benutzers ${ownerUid}:`, authError);
          }
        }
      } else {
        logger.warn(`[Action] Kein 'ownerUid' für Firma ${companyId} gefunden. Auth-Benutzer nicht gelöscht.`);
      }

      logger.info(`[Action] Löschvorgang für Firma ${companyId} erfolgreich abgeschlossen.`);
      return { success: true, message: "Firma erfolgreich gelöscht." };

    } catch (error: any) {
      logger.error(`[Action] Fehler beim Löschen der Firma ${companyId}:`, error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", "Ein interner Fehler ist beim Löschen der Firma aufgetreten.", error.message);
    }
  }
);

// --- Cloud Functions ---