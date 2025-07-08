// functions/src/callable_general.ts

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { logger as loggerV2 } from 'firebase-functions/v2';
import { getDb, getUserDisplayName } from './helpers'; // getUserDisplayName hinzugefügt, getStripeInstance entfernt
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

interface DeleteCompanyAccountData {
  companyId: string;
}

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
    loggerV2.warn(`[getClientIp] Konnte keine gültige IP ermitteln. Headers: ${JSON.stringify(request.rawRequest.headers)}`);
    // Anstatt einen Fehler zu werfen, der den Client blockiert, geben wir einen klaren Status zurück.
    // Der Client kann dann entscheiden, ob er den Fallback (ipify) nutzen möchte.
    return { ip: 'IP_NOT_DETERMINED' };
  }

  loggerV2.info(`[getClientIp] Ermittelte IP: ${clientIp}`);
  return { ip: clientIp };
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

export const deleteCompanyAccount = onCall({ secrets: [STRIPE_SECRET_KEY_GENERAL], cors: true }, async (request: CallableRequest<DeleteCompanyAccountData>): Promise<DeleteCompanyAccountResult> => {
    loggerV2.info("[Callable] Start: deleteCompanyAccount", { data: request.data });

    // 1. Authentifizierung und Autorisierung des Admins
    if (!request.auth) {
        loggerV2.error("[Callable] Fehler: Nicht authentifizierter Aufruf.");
        throw new HttpsError("unauthenticated", "Der Benutzer ist nicht authentifiziert.");
    }

    const adminUid = request.auth.uid;
    try {
        const adminUser = await admin.auth().getUser(adminUid);
        const customClaims = adminUser.customClaims || {};
        if (customClaims.role !== 'admin' && customClaims.role !== 'master') {
            loggerV2.error(`[Callable] Fehler: Benutzer ${adminUid} hat nicht die erforderliche Admin-Rolle.`);
            throw new HttpsError("permission-denied", "Nur Administratoren dürfen diese Aktion ausführen.");
        }
        loggerV2.info(`[Callable] Admin-Benutzer ${adminUid} erfolgreich verifiziert.`);
    } catch (error) {
        loggerV2.error(`[Callable] Fehler bei der Überprüfung des Admin-Status für UID: ${adminUid}`, { error });
        throw new HttpsError("internal", "Fehler bei der Überprüfung der Administratorrechte.");
    }

    // 2. Validierung der Eingabedaten
    const { companyId } = request.data;
    if (!companyId) {
        loggerV2.error("[Callable] Fehler: companyId wurde nicht im Request-Body übergeben.");
        throw new HttpsError("invalid-argument", "Die Firmen-ID (companyId) ist erforderlich.");
    }

    loggerV2.info(`[Callable] Starte Löschvorgang für Firma: ${companyId}`);
    const db = getDb();
    const userRef = db.collection('users').doc(companyId);
    const companyRef = db.collection('companies').doc(companyId);

    try {
        // 3. Firestore-Dokumente und -Unterkollektionen in einer Transaktion löschen
        loggerV2.info('[Callable] Starte Firestore-Transaktion...');
        await db.runTransaction(async (transaction) => {
            const collectionsToDelete = [
                { ref: userRef, name: 'user' },
                { ref: companyRef, name: 'company' },
            ];

            for (const { ref, name } of collectionsToDelete) {
                const subcollections = await ref.listCollections();
                for (const subcollection of subcollections) {
                    loggerV2.info(`[Callable] Lösche Dokumente in ${name}-Unter-Sammlung: ${subcollection.id}`);
                    const allDocs = await subcollection.get();
                    allDocs.forEach(doc => transaction.delete(doc.ref));
                }
            }
            loggerV2.info(`[Callable] Lösche Hauptdokumente für User und Company: ${companyId}`);
            transaction.delete(userRef);
            transaction.delete(companyRef);
        });
        loggerV2.info('[Callable] Firestore-Transaktion erfolgreich abgeschlossen.');

        // 4. Firebase Auth-Benutzer löschen
        loggerV2.info(`[Callable] Lösche Auth-Benutzer: ${companyId}`);
        try {
            await admin.auth().deleteUser(companyId);
            loggerV2.info(`[Callable] Auth-Benutzer ${companyId} erfolgreich gelöscht.`);
        } catch (authError: any) {
            if (authError.code !== 'auth/user-not-found') {
                loggerV2.error(`[Callable] Fehler beim Löschen des Auth-Benutzers ${companyId}:`, authError);
                throw authError; // Wirft den Fehler, um die äußere catch-Klausel auszulösen
            }
            loggerV2.warn(`[Callable] Auth-Benutzer ${companyId} wurde nicht gefunden, was in diesem Fall ignoriert wird.`);
        }

        loggerV2.info(`[Callable] Löschvorgang für ${companyId} erfolgreich abgeschlossen.`);
        return { success: true, message: "Firma und alle zugehörigen Daten wurden endgültig gelöscht." };

    } catch (error: any) {
        loggerV2.error(`[Callable] Schwerwiegender Fehler beim Löschen der Firma ${companyId}:`, { error: error.message, stack: error.stack });
        throw new HttpsError("internal", `Der Löschvorgang konnte nicht abgeschlossen werden. Fehler: ${error.message}`);
    }
});

export const fixOrderProviderUid = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be authenticated.");
    }
    const db = getDb();
    const ordersRef = db.collection("orders");
    const snapshot = await ordersRef.get();

    if (snapshot.empty) {
        console.log("No orders found.");
        return { message: "No orders found to process." };
    }

    const batch = db.batch();
    let processedCount = 0;

    snapshot.forEach(doc => {
        const order = doc.data();
        if (order.anbieterId && !order.providerUid) {
            batch.update(doc.ref, { providerUid: order.anbieterId });
            processedCount++;
        }
    });

    if (processedCount > 0) {
        await batch.commit();
        return { message: `Successfully updated ${processedCount} orders.` };
    }

    return { message: "No orders needed updating." };
});


// --- Cloud Functions ---