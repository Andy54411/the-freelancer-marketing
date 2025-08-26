// functions/src/callable_general.ts

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { logger } from "firebase-functions/v2";
import { getDb, getUserDisplayName, deleteCollection, verifyAdmin, corsOptions } from './helpers';
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
  sterne: number;
  kommentar: string;
  kundeId: string;
  kundeProfilePictureURL: string; // Jetzt erforderlich
  auftragId?: string;
  kategorie?: string;
  unterkategorie?: string;
}

interface SubmitReviewResult {
  success: boolean;
  reviewId?: string;
  message?: string;
}

interface ReviewData {
  id: string;
  kundeId: string;
  sterne: number;
  kommentar: string;
  kundeProfilePictureURL?: string;
  erstellungsdatum?: { _seconds: number, _nanoseconds: number } | Date;
  // Unternehmensantwort
  antwort?: {
    text: string;
    antwortDatum: Date | FirebaseFirestore.Timestamp;
    antwortVon: string; // Company Name or ID
  };
}

// Interface für Antworten auf Reviews
interface ReplyToReviewData {
  reviewId: string;
  antwortText: string;
  companyId: string;
  companyName: string;
}

interface ReplyToReviewResult {
  success: boolean;
  message: string;
}

export const getClientIp = onCall({
  cors: corsOptions,
  region: "europe-west1"
}, (request) => {
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
        }
      } catch (e: any) {
        // Minimaler Logging für Memory-Optimierung
      }

      let anbieterStripeAccountId: string;
      let providerName: string = UNKNOWN_PROVIDER_NAME;

      if (!jobDetails.selectedAnbieterId) {
        throw new HttpsError('invalid-argument', "Die ID des ausgewählten Anbieters ist erforderlich.");
      }

      const anbieterUserDocRef = db.collection('users').doc(jobDetails.selectedAnbieterId);
      const anbieterUserDoc = await anbieterUserDocRef.get();

      if (!anbieterUserDoc.exists) {
        throw new HttpsError('not-found', "Der ausgewählte Anbieter wurde nicht gefunden. Bitte versuchen Sie es erneut oder kontaktieren Sie den Support.");
      }

      const anbieterData = anbieterUserDoc.data();
      if (anbieterData?.user_type !== 'firma') {
        throw new HttpsError('failed-precondition', "Der ausgewählte Anbieter ist kein gültiges Firmenkonto.");
      }

      const anbieterCompanyDoc = await db.collection('companies').doc(jobDetails.selectedAnbieterId).get();

      // Priorität: companies collection für Unternehmensdaten, users für Auth-Daten
      const companyData = anbieterCompanyDoc.exists ? anbieterCompanyDoc.data() : anbieterData;
      providerName = getUserDisplayName(companyData, getUserDisplayName(anbieterData, UNKNOWN_PROVIDER_NAME));

      // Stripe Account ID zuerst aus companies, dann aus users
      if (companyData && companyData.stripeAccountId && typeof companyData.stripeAccountId === 'string' && companyData.stripeAccountId.startsWith('acct_')) {
        anbieterStripeAccountId = companyData.stripeAccountId;
      } else if (anbieterData && anbieterData.stripeAccountId && typeof anbieterData.stripeAccountId === 'string' && anbieterData.stripeAccountId.startsWith('acct_')) {
        anbieterStripeAccountId = anbieterData.stripeAccountId;
      } else {
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

      return {
        tempDraftId: docRef.id,
        anbieterStripeAccountId: anbieterStripeAccountId,
      };

    } catch (error: any) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', error.message || "Ein interner Serverfehler ist aufgetreten.");
    }
  }
);

export const submitReview = onCall(
  {
    region: "europe-west1",
    cors: ["https://tasko-rho.vercel.app", "https://tasko-zh8k.vercel.app", "https://tasko-live.vercel.app", "https://taskilo.de", "https://www.taskilo.de", "http://localhost:3000"]
  },
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

    // Validierung: Profilbild ist erforderlich
    if (!kundeProfilePictureURL || kundeProfilePictureURL.trim() === '') {
      throw new HttpsError('failed-precondition', 'Ein Profilbild ist erforderlich, um eine Bewertung abgeben zu können.');
    }

    const db = getDb();
    try {
      const newReviewData = {
        anbieterId,
        kundeId,
        auftragId,
        sterne,
        kommentar: kommentar || "",
        kundeProfilePictureURL, // Jetzt immer vorhanden
        kategorie,
        unterkategorie,
        erstellungsdatum: new Date(),
      };
      const docRef = await db.collection("reviews").add(newReviewData);
      logger.info(`[submitReview] Review ${docRef.id} created successfully.`);
      return { success: true, message: "Review submitted", reviewId: docRef.id };
    } catch (error: any) {
      logger.error("[submitReview] Error saving review to Firestore:", error);
      throw new HttpsError('internal', 'Failed to save the review.', error.message);
    }
  }
);

export const getReviewsByProvider = onCall(
  {
    region: "europe-west1",
    cors: ["https://tasko-rho.vercel.app", "https://tasko-zh8k.vercel.app", "https://tasko-live.vercel.app", "https://taskilo.de", "https://www.taskilo.de", "http://localhost:3000"],
  },
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
          antwort: data.antwort ? {
            text: data.antwort.text,
            antwortDatum: data.antwort.antwortDatum instanceof admin.firestore.Timestamp ? data.antwort.antwortDatum.toDate() : data.antwort.antwortDatum,
            antwortVon: data.antwort.antwortVon
          } : undefined,
        });
      });
      return reviews;
    } catch (error: any) {
      logger.error("[getReviewsByProvider] Error fetching reviews from Firestore:", error);
      throw new HttpsError('internal', 'Failed to fetch reviews.', error.message);
    }
  }
);

// Neue Funktion: Auf Review antworten
export const replyToReview = onCall(
  {
    region: "europe-west1",
    cors: ["https://tasko-rho.vercel.app", "https://tasko-zh8k.vercel.app", "https://tasko-live.vercel.app", "https://taskilo.de", "https://www.taskilo.de", "http://localhost:3000"],
  },
  async (request: CallableRequest<ReplyToReviewData>): Promise<ReplyToReviewResult> => {
    logger.info("[replyToReview] Called for review:", request.data.reviewId);

    const { reviewId, antwortText, companyId, companyName } = request.data;

    // Validierung
    if (!reviewId || !antwortText || !companyId || !companyName) {
      throw new HttpsError('invalid-argument', 'Review ID, Antworttext, Company ID und Company Name sind erforderlich.');
    }

    if (antwortText.trim().length < 10) {
      throw new HttpsError('invalid-argument', 'Die Antwort muss mindestens 10 Zeichen lang sein.');
    }

    const db = getDb();
    try {
      // Prüfen, ob das Review existiert
      const reviewDoc = await db.collection('reviews').doc(reviewId).get();

      if (!reviewDoc.exists) {
        throw new HttpsError('not-found', 'Review nicht gefunden.');
      }

      const reviewData = reviewDoc.data();

      // Prüfen, ob die Company berechtigt ist (Review gehört zu diesem Anbieter)
      if (reviewData?.anbieterId !== companyId) {
        throw new HttpsError('permission-denied', 'Sie sind nicht berechtigt, auf dieses Review zu antworten.');
      }

      // Antwort hinzufügen
      const antwortData = {
        text: antwortText.trim(),
        antwortDatum: new Date(),
        antwortVon: companyName
      };

      await db.collection('reviews').doc(reviewId).update({
        antwort: antwortData
      });

      logger.info(`[replyToReview] Reply added to review ${reviewId} by company ${companyName}`);
      return { success: true, message: "Antwort erfolgreich hinzugefügt" };

    } catch (error: any) {
      logger.error("[replyToReview] Error adding reply to review:", error);
      throw new HttpsError('internal', 'Fehler beim Hinzufügen der Antwort.', error.message);
    }
  }
);

// --- getOrCreateStripeCustomer wurde aus dieser Datei verschoben nach callable_stripe.ts ---

export const deleteCompanyAccount = onCall(
  {
    region: "europe-west1",
    memory: "512MiB", // Speicher auf 512 MB erhöht
    // Erlaube Anfragen von der Vercel-Produktionsumgebung und vom lokalen Emulator.
    cors: ["https://tasko-rho.vercel.app", "https://tasko-zh8k.vercel.app", "https://tasko-live.vercel.app", "https://taskilo.de", "https://www.taskilo.de", "http://localhost:3000"],
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

      // 3. Das zugehörige User-Dokument löschen
      const userRef = db.collection("users").doc(companyId);
      await userRef.delete();
      logger.info(`[Action] User-Dokument ${companyId} aus 'users' gelöscht.`);

      // 4. Den zugehörigen Firebase Auth Benutzer löschen (falls vorhanden)
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

export const syncSpecificCompanyToUser = onCall(
  {
    cors: ["https://tasko-rho.vercel.app", "https://tasko-zh8k.vercel.app", "https://tasko-live.vercel.app", "https://taskilo.de", "https://www.taskilo.de", "http://localhost:3000"],
    region: "europe-west1",
    memory: "512MiB",
  },
  async (request: CallableRequest<{ companyId?: string }>): Promise<{ success: boolean; message: string; }> => {
    // DEAKTIVIERT: Keine Synchronisation zwischen companies und users collections
    throw new HttpsError("failed-precondition", "Synchronisation zwischen companies und users collections ist deaktiviert. Firmendaten bleiben in companies collection.");
  }
);

export const syncSpecificUserToCompany = onCall(
  {
    cors: ["https://tasko-rho.vercel.app", "https://tasko-zh8k.vercel.app", "https://tasko-live.vercel.app", "https://taskilo.de", "https://www.taskilo.de", "http://localhost:3000"],
    region: "europe-west1",
    memory: "512MiB",
  },
  async (request: CallableRequest<{ userId?: string }>): Promise<{ success: boolean; message: string; }> => {
    // DEAKTIVIERT: Keine Synchronisation zwischen users und companies collections
    throw new HttpsError("failed-precondition", "Synchronisation zwischen users und companies collections ist deaktiviert. Firmendaten gehören in companies collection.");
  }
);

// Update Company Status Function
export const updateCompanyStatus = onCall(
  {
    cors: corsOptions,
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request: CallableRequest<{ companyId: string; status: string }>) => {
    try {
      await verifyAdmin(request.auth?.uid || '');

      const { companyId, status } = request.data;

      if (!companyId || !status) {
        throw new HttpsError("invalid-argument", "CompanyId and status are required");
      }

      if (!['active', 'locked'].includes(status)) {
        throw new HttpsError("invalid-argument", "Status must be either 'active' or 'locked'");
      }

      const db = getDb();

      // ❌ ARCHITEKTUR-KORREKTUR: NUR companies collection updaten!
      // users collection darf KEINE Firmendaten enthalten!

      const companyRef = db.collection('companies').doc(companyId);
      
      await companyRef.update({
        status: status,
        isActive: status === 'active',
        updatedAt: FieldValue.serverTimestamp()
      });

      logger.info(`[updateCompanyStatus] Successfully updated company ${companyId} status to ${status} (ONLY in companies collection)`);
      return {
        success: true,
        message: `Company status updated to ${status}`,
        companyId,
        status
      };

    } catch (error: any) {
      logger.error(`[updateCompanyStatus] Error updating company status:`, error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", `Error updating company status: ${error.message}`);
    }
  }
);

/**
 * Search for providers by subcategory in both users and companies collections
 * This function provides access to provider data for the Flutter app
 */
export const searchProvidersBySubcategory = onCall(
  { region: "europe-west1", ...corsOptions },
  async (request: CallableRequest<{ subcategory: string }>) => {
    try {
      const { subcategory } = request.data;
      
      if (!subcategory) {
        throw new HttpsError("invalid-argument", "Missing required parameter: subcategory");
      }

      logger.info(`[searchProvidersBySubcategory] Searching for providers in subcategory: ${subcategory}`);
      
      const db = getDb();
      const providers: any[] = [];
      const hourlyRates: number[] = [];

      // Search in companies collection
      try {
        const companiesQuery = await db
          .collection('companies')
          .where('selectedSubcategory', '==', subcategory)
          .get();

        logger.info(`[searchProvidersBySubcategory] Found ${companiesQuery.docs.length} providers in companies collection`);

        for (const doc of companiesQuery.docs) {
          const data = doc.data();
          const provider = {
            id: doc.id,
            name: data.companyName || 'Unbekanntes Unternehmen',
            companyName: data.companyName || '',
            description: data.publicDescription || '',
            hourlyRate: data.hourlyRate || 0,
            rating: null,
            profilePictureURL: data.profilePictureURL || '',
            location: `${data.companyCityForBackend || ''}, ${data.companyCountryForBackend || ''}`.trim().replace(/^,\s*/, ''),
            source: 'companies',
            category: data.selectedCategory || '',
            subcategory: data.selectedSubcategory || '',
          };
          
          providers.push(provider);
          
          if (typeof data.hourlyRate === 'number' && data.hourlyRate > 0) {
            hourlyRates.push(data.hourlyRate);
          }
        }
      } catch (error) {
        logger.warn(`[searchProvidersBySubcategory] Error searching companies collection: ${error}`);
      }

      // Calculate statistics
      const statistics = {
        totalProviders: providers.length,
        averagePrice: hourlyRates.length > 0 
          ? `${(hourlyRates.reduce((a, b) => a + b, 0) / hourlyRates.length).toFixed(2)} €/h`
          : 'N/A',
        minPrice: hourlyRates.length > 0 ? `${Math.min(...hourlyRates)} €/h` : 'N/A',
        maxPrice: hourlyRates.length > 0 ? `${Math.max(...hourlyRates)} €/h` : 'N/A',
        averageRating: 'N/A', // Can be implemented later
      };

      logger.info(`[searchProvidersBySubcategory] Found ${providers.length} total providers for ${subcategory}`);

      return {
        providers,
        statistics,
        subcategory,
        success: true,
      };

    } catch (error: any) {
      logger.error(`[searchProvidersBySubcategory] Error:`, error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", `Error searching providers: ${error.message}`);
    }
  }
);

// --- Cloud Functions ---