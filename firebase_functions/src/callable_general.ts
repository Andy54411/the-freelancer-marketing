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

      const companyData = anbieterCompanyDoc.exists ? anbieterCompanyDoc.data() : anbieterUserDoc.data();
      providerName = getUserDisplayName(companyData, getUserDisplayName(anbieterData, UNKNOWN_PROVIDER_NAME));

      if (anbieterData && anbieterData.stripeAccountId && typeof anbieterData.stripeAccountId === 'string' && anbieterData.stripeAccountId.startsWith('acct_')) {
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
    // Use default companyId if not provided
    const companyId = request.data?.companyId || "BsUxClYQtkNWRmpSY17YsJyVR0D2";
    
    logger.info(`[syncSpecificCompanyToUser] Syncing company ${companyId} to user data`);

    if (!companyId || typeof companyId !== "string") {
      throw new HttpsError("invalid-argument", "companyId is required and must be a string.");
    }

    const db = getDb();
    try {
      // Get company data
      const companyDoc = await db.collection("companies").doc(companyId).get();
      if (!companyDoc.exists) {
        throw new HttpsError("not-found", `Company with ID ${companyId} not found.`);
      }

      const companyData = companyDoc.data();
      if (!companyData) {
        throw new HttpsError("not-found", `Company ${companyId} has no data.`);
      }

      // Check if corresponding user document exists
      const userDocRef = db.collection("users").doc(companyId);
      const userDoc = await userDocRef.get();
      
      if (!userDoc.exists) {
        throw new HttpsError("not-found", `User document ${companyId} does not exist.`);
      }

      // Prepare user data update with company data
      const userDataUpdate: Record<string, any> = {
        // Basic company info
        companyName: companyData.companyName || null,
        description: companyData.description || null,
        hourlyRate: companyData.hourlyRate || null,
        selectedCategory: companyData.selectedCategory || null,
        selectedSubcategory: companyData.selectedSubcategory || null,
        
        // Location data
        lat: companyData.lat || null,
        lng: companyData.lng || null,
        radiusKm: companyData.radiusKm || null,
        companyPostalCodeForBackend: companyData.companyPostalCodeForBackend || companyData.postalCode || null,
        companyCityForBackend: companyData.companyCityForBackend || companyData.companyCity || null,
        companyCountryForBackend: companyData.companyCountryForBackend || null,
        
        // Contact and business info
        companyPhoneNumberForBackend: companyData.companyPhoneNumberForBackend || null,
        companyWebsiteForBackend: companyData.companyWebsiteForBackend || null,
        
        // Profile and media
        profilePictureFirebaseUrl: companyData.profilePictureURL || companyData.profilePictureFirebaseUrl || null,
        profilePictureURL: companyData.profilePictureURL || companyData.profilePictureFirebaseUrl || null,
        
        // Business details from step2
        'step2.companyName': companyData.companyName || null,
        'step2.description': companyData.description || null,
        'step2.city': companyData.companyCity || companyData.companyCityForBackend || null,
        'step2.country': companyData.companyCountryForBackend || null,
        'step2.industryMcc': companyData.industryMcc || null,
        
        // Technical details from step3  
        'step3.hourlyRate': companyData.hourlyRate ? String(companyData.hourlyRate) : null,
        'step3.profilePictureURL': companyData.profilePictureURL || companyData.profilePictureFirebaseUrl || null,
        
        // Stripe and verification data
        stripeAccountId: companyData.stripeAccountId || null,
        stripeChargesEnabled: companyData.stripeChargesEnabled || false,
        stripePayoutsEnabled: companyData.stripePayoutsEnabled || false,
        stripeDetailsSubmitted: companyData.stripeDetailsSubmitted || false,
        stripeVerificationStatus: companyData.stripeVerificationStatus || null,
        
        // Additional profile data
        specialties: companyData.specialties || null,
        portfolio: companyData.portfolio || null,
        skills: companyData.skills || null,
        languages: companyData.languages || null,
        education: companyData.education || null,
        certifications: companyData.certifications || null,
        
        // Metrics and performance
        responseTime: companyData.responseTime || companyData.responseTimeGuarantee || null,
        completionRate: companyData.completionRate || null,
        totalOrders: companyData.totalOrders || null,
        averageRating: companyData.averageRating || null,
        totalReviews: companyData.totalReviews || null,
        
        // Timestamps
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Remove null values to avoid overwriting existing data with nulls
      const cleanedUpdate: { [x: string]: any } = Object.fromEntries(
        Object.entries(userDataUpdate).filter(([_, value]) => value !== null)
      );

      await userDocRef.update(cleanedUpdate);

      logger.info(`[syncSpecificCompanyToUser] Successfully synced company ${companyId} to user data. Updated ${Object.keys(cleanedUpdate).length} fields.`);
      return { success: true, message: `Successfully synced company ${companyId} to user data. Updated ${Object.keys(cleanedUpdate).length} fields.` };

    } catch (error: any) {
      logger.error(`[syncSpecificCompanyToUser] Error syncing company ${companyId}:`, error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", `Error syncing company data: ${error.message}`);
    }
  }
);

export const syncSpecificUserToCompany = onCall(
  {
    cors: ["https://tasko-rho.vercel.app", "https://tasko-zh8k.vercel.app", "https://tasko-live.vercel.app", "https://taskilo.de", "https://www.taskilo.de", "http://localhost:3000"],
    region: "europe-west1",
    memory: "512MiB",
  },
  async (request: CallableRequest<{ userId?: string }>): Promise<{ success: boolean; message: string; }> => {
    // Use default userId if not provided
    const userId = request.data?.userId || "BsUxClYQtkNWRmpSY17YsJyVR0D2";
    
    logger.info(`[syncSpecificUserToCompany] Syncing user ${userId} to company data`);

    if (!userId || typeof userId !== "string") {
      throw new HttpsError("invalid-argument", "userId is required and must be a string.");
    }

    const db = getDb();
    try {
      // Get user data
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        throw new HttpsError("not-found", `User with ID ${userId} not found.`);
      }

      const userData = userDoc.data();
      if (!userData) {
        throw new HttpsError("not-found", `User ${userId} has no data.`);
      }

      // Check if corresponding company document exists
      const companyDocRef = db.collection("companies").doc(userId);
      const companyDoc = await companyDocRef.get();
      
      // Debug logging for description
      logger.info(`[syncSpecificUserToCompany] Checking description sources for ${userId}:`);
      logger.info(`userData.description: ${userData.description}`);
      logger.info(`userData.step2: ${JSON.stringify(userData.step2)}`);
      logger.info(`userData['step2.description']: ${userData['step2.description']}`);
      
      // Extract step2 data if it exists
      const step2Data = userData.step2 || {};
      
      // Prepare company data update with user data
      const companyDataUpdate: Record<string, any> = {
        // Basic company info
        companyName: userData.companyName || step2Data.companyName || null,
        description: userData.description || step2Data.description || null,
        hourlyRate: userData.hourlyRate || (userData['step3.hourlyRate'] ? parseFloat(userData['step3.hourlyRate']) : null),
        selectedCategory: userData.selectedCategory || null,
        selectedSubcategory: userData.selectedSubcategory || null,
        
        // Location data
        lat: userData.lat || null,
        lng: userData.lng || null,
        radiusKm: userData.radiusKm || null,
        postalCode: userData.companyPostalCodeForBackend || null,
        companyCity: userData.companyCityForBackend || userData['step2.city'] || null,
        companyCountryForBackend: userData.companyCountryForBackend || userData['step2.country'] || null,
        
        // Contact and business info
        companyPhoneNumberForBackend: userData.companyPhoneNumberForBackend || null,
        companyWebsiteForBackend: userData.companyWebsiteForBackend || null,
        
        // Profile and media
        profilePictureURL: userData.profilePictureURL || userData.profilePictureFirebaseUrl || userData['step3.profilePictureURL'] || null,
        profilePictureFirebaseUrl: userData.profilePictureFirebaseUrl || userData.profilePictureURL || userData['step3.profilePictureURL'] || null,
        
        // Business details
        industryMcc: userData['step2.industryMcc'] || null,
        
        // Stripe and verification data
        stripeAccountId: userData.stripeAccountId || null,
        stripeChargesEnabled: userData.stripeChargesEnabled || false,
        stripePayoutsEnabled: userData.stripePayoutsEnabled || false,
        stripeDetailsSubmitted: userData.stripeDetailsSubmitted || false,
        stripeVerificationStatus: userData.stripeVerificationStatus || null,
        
        // Additional profile data
        specialties: userData.specialties || null,
        portfolio: userData.portfolio || null,
        skills: userData.skills || null,
        languages: (() => {
          // Try step2.languages first
          if (step2Data.languages && typeof step2Data.languages === 'string') {
            return step2Data.languages.split(',').map((lang: string) => lang.trim()).filter(Boolean);
          }
          // Try userData.languages as fallback
          if (userData.languages && Array.isArray(userData.languages)) {
            return userData.languages;
          }
          return null;
        })(),
        education: userData.education || null,
        certifications: userData.certifications || null,
        
        // Metrics and performance
        responseTime: userData.responseTime || null,
        completionRate: userData.completionRate || null,
        totalOrders: userData.totalOrders || null,
        averageRating: userData.averageRating || null,
        totalReviews: userData.totalReviews || null,
        
        // Timestamps
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Remove null values but keep debug info
      const cleanedUpdate: { [x: string]: any } = {};
      const removedFields: string[] = [];
      
      for (const [key, value] of Object.entries(companyDataUpdate)) {
        if (value !== null && value !== undefined) {
          cleanedUpdate[key] = value;
        } else {
          removedFields.push(key);
        }
      }
      
      logger.info(`[syncSpecificUserToCompany] Fields to update: ${Object.keys(cleanedUpdate).join(', ')}`);
      logger.info(`[syncSpecificUserToCompany] Removed null fields: ${removedFields.join(', ')}`);
      logger.info(`[syncSpecificUserToCompany] Description value being set: ${cleanedUpdate.description}`);

      if (companyDoc.exists) {
        // Update existing company document
        await companyDocRef.update(cleanedUpdate);
      } else {
        // Create new company document
        cleanedUpdate.id = userId;
        cleanedUpdate.createdAt = FieldValue.serverTimestamp();
        await companyDocRef.set(cleanedUpdate);
      }

      logger.info(`[syncSpecificUserToCompany] Successfully synced user ${userId} to company data. Updated ${Object.keys(cleanedUpdate).length} fields.`);
      return { success: true, message: `Successfully synced user ${userId} to company data. Updated ${Object.keys(cleanedUpdate).length} fields.` };

    } catch (error: any) {
      logger.error(`[syncSpecificUserToCompany] Error syncing user ${userId}:`, error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", `Error syncing user data: ${error.message}`);
    }
  }
);

// --- Cloud Functions ---