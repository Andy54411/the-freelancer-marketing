// functions/src/callable_general.ts

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger as loggerV2 } from 'firebase-functions/v2';
import { getDb, getStripeInstance } from './helpers'; // getStripeInstance ist hier möglicherweise nicht mehr nötig
import { FieldValue } from 'firebase-admin/firestore';
// Stripe Importe und admin sind hier nicht direkt für diese Funktionen notwendig,
// aber wenn sie helpers.ts genutzt werden, ist es in Ordnung.
import Stripe from 'stripe';
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2"; // Firebase Logger für v2 Functions

// Konsolen-Logs anpassen für Klarheit
loggerV2.info("Lade callable_general.ts..."); // Nutze loggerV2 konsistent

try {
  loggerV2.info("callable_general.ts: Globale Initialisierung erfolgreich.");
} catch (error: any) {
  loggerV2.error("callable_general.ts: Fehler bei globaler Initialisierung!", { error: error.message, stack: error.stack });
  throw error;
}

// --- Interfaces für diese Datei ---
interface GetClientIpData {
}

interface GetClientIpResult {
  ip: string;
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
  dateFrom?: string | null;
  dateTo?: string | null;
  timePreference?: string | null;
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
// Sie könnten in einer gemeinsamen Interface-Datei oder direkt dort, wo sie benötigt werden, definiert werden.
/*
interface CustomerAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  state?: string | null;
  country?: string | null;
}
interface GetOrCreateStripeCustomerPayload {
  email: string;
  name?: string;
  phone?: string | null;
  address?: CustomerAddress | null;
}
interface GetOrCreateStripeCustomerResult {
  stripeCustomerId: string;
}
*/

interface DeleteCompanyAccountResult {
  success: boolean;
  message: string;
}

// --- Cloud Functions ---

export const getClientIp = onCall<GetClientIpData, Promise<GetClientIpResult>>(
  async (request): Promise<GetClientIpResult> => {
    const rawHttpRequest = request.rawRequest;
    let clientIp = "IP_NOT_DETERMINED";
    const isEmulated = process.env.FUNCTIONS_EMULATOR === "true";
    if (rawHttpRequest) {
      const forwardedFor = rawHttpRequest.headers["x-forwarded-for"];
      const realIpHeader = rawHttpRequest.headers["x-real-ip"];
      if (forwardedFor && typeof forwardedFor === "string") clientIp = forwardedFor.split(",")[0].trim();
      else if (realIpHeader && typeof realIpHeader === "string") clientIp = realIpHeader.split(",")[0].trim();
      else if (rawHttpRequest.ip) clientIp = rawHttpRequest.ip;
      else if (rawHttpRequest.socket?.remoteAddress) clientIp = rawHttpRequest.socket.remoteAddress;
    }
    if (isEmulated && (clientIp === "::1" || clientIp.startsWith("127.") || clientIp === "IP_NOT_DETERMINED")) {
      clientIp = "127.0.0.1";
    } else if (!isEmulated && (clientIp === "IP_NOT_DETERMINED" || clientIp.length < 7 || clientIp === "::1" || clientIp.startsWith("127.") || clientIp === "0.0.0.0")) {
      loggerV2.error(`[getClientIp] In NICHT-Emulator-Umgebung keine gültige IP. Gefunden: "${clientIp}".`);
      throw new HttpsError("unavailable", "Gültige Client-IP konnte nicht ermittelt werden.");
    }
    loggerV2.info(`[getClientIp] final IP: ${clientIp}`);
    return { ip: clientIp };
  });


export const createTemporaryJobDraft = onCall<TemporaryJobDraftData, Promise<TemporaryJobDraftResult>>(
  async (request): Promise<TemporaryJobDraftResult> => {
    loggerV2.info("[createTemporaryJobDraft] Aufgerufen mit Daten:", JSON.stringify(request.data, null, 2));
    const db = getDb();
    if (!request.auth?.uid) {
      loggerV2.error("[createTemporaryJobDraft] Nutzer nicht authentifiziert.");
      throw new HttpsError("unauthenticated", "Nutzer nicht authentifiziert.");
    }

    const jobDetails = request.data;
    const kundeId = request.auth.uid;

    if (
      !jobDetails.customerType ||
      !jobDetails.selectedCategory ||
      !jobDetails.selectedSubcategory ||
      !jobDetails.jobPostalCode ||
      !jobDetails.selectedAnbieterId ||
      !(typeof jobDetails.jobCalculatedPriceInCents === 'number' && jobDetails.jobCalculatedPriceInCents > 0)
    ) {
      loggerV2.error("[createTemporaryJobDraft] Fehlende oder ungültige Pflichtdaten:", jobDetails);
      throw new HttpsError("invalid-argument", "Unvollständige oder ungültige Auftragsdetails übermittelt.");
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
        loggerV2.info(`[createTemporaryJobDraft] Kundendaten für ${kundeId} geladen.`);
      } else {
        loggerV2.warn(`[createTemporaryJobDraft] Konnte kein User-Dokument für Kunde ${kundeId} finden.`);
      }
    } catch (e: any) {
      loggerV2.error(`[createTemporaryJobDraft] Fehler beim Laden der Kundendaten für ${kundeId}:`, e.message);
    }

    // --- Start der korrigierten Logik für anbieterStripeAccountId ---
    let anbieterStripeAccountId: string; // Auf nicht-null gesetzt, wir stellen sicher, dass es gesetzt ist oder werfen einen Fehler

    if (!jobDetails.selectedAnbieterId) {
      loggerV2.error("[createTemporaryJobDraft] Fehlende 'selectedAnbieterId' im Payload vom Client.");
      throw new HttpsError("invalid-argument", "Die ID des ausgewählten Anbieters ist erforderlich.");
    }

    try {
      const anbieterDocRef = db.collection('users').doc(jobDetails.selectedAnbieterId);
      const anbieterDoc = await anbieterDocRef.get();

      if (!anbieterDoc.exists) {
        loggerV2.error(`[createTemporaryJobDraft] Anbieter-Dokument (users/${jobDetails.selectedAnbieterId}) nicht gefunden.`);
        throw new HttpsError("not-found", `Der ausgewählte Anbieter wurde nicht gefunden.`);
      }

      const anbieterData = anbieterDoc.data();
      if (anbieterData && anbieterData.stripeAccountId && typeof anbieterData.stripeAccountId === 'string' && anbieterData.stripeAccountId.startsWith('acct_')) {
        anbieterStripeAccountId = anbieterData.stripeAccountId;
        loggerV2.info(`[createTemporaryJobDraft] Stripe Account ID für Anbieter ${jobDetails.selectedAnbieterId} gefunden: ${anbieterStripeAccountId}`);
      } else {
        loggerV2.error(`[createTemporaryJobDraft] Gültige Stripe Account ID für Anbieter ${jobDetails.selectedAnbieterId} nicht im users-Dokument ('${anbieterDoc.ref.path}') gefunden oder ungültig. Wert war: '${anbieterData?.stripeAccountId}'`);
        // Dies ist der kritische Punkt: Wenn keine gültige ID vorhanden ist, wird ein Fehler ausgelöst
        throw new HttpsError("failed-precondition", "Stripe Connect Konto des Anbieters ist nicht korrekt eingerichtet.");
      }
    } catch (dbError: any) {
      if (dbError instanceof HttpsError) { // Wirft bereits erstellte HttpsErrors erneut
        throw dbError;
      }
      loggerV2.error(`[createTemporaryJobDraft] Fehler beim Lesen des Anbieter-Dokuments (users/${jobDetails.selectedAnbieterId}):`, dbError.message, dbError);
      throw new HttpsError("internal", "Fehler beim Abrufen der Anbieterdetails.");
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
        createdAt: FieldValue.serverTimestamp(),
        lastUpdatedAt: FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection("temporaryJobDrafts").add(draftDataToSave);
      loggerV2.info(`[createTemporaryJobDraft] Draft ${docRef.id} für Kunde ${kundeId} und Anbieter ${jobDetails.selectedAnbieterId} erstellt.`);

      return {
        tempDraftId: docRef.id,
        anbieterStripeAccountId: anbieterStripeAccountId // Dies wird nun immer ein gültiger String sein, wenn die Funktion hier ankommt
      };

    } catch (e: any) {
      loggerV2.error(`[createTemporaryJobDraft] Fehler beim Speichern des Drafts:`, e.message, e);
      throw new HttpsError("internal", "Temporärer Auftragsentwurf konnte nicht gespeichert werden.", e.message);
    }
  }
);

// --- getOrCreateStripeCustomer wurde aus dieser Datei verschoben nach callable_stripe.ts ---
// --- deleteCompanyAccount wird beibehalten ---

export const deleteCompanyAccount = onCall<Record<string, never>, Promise<DeleteCompanyAccountResult>>(
  async (request): Promise<DeleteCompanyAccountResult> => {
    loggerV2.info("[deleteCompanyAccount] Aufgerufen von User:", request.auth?.uid);
    const db = getDb();
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Nutzer muss angemeldet sein.");
    const userId = request.auth.uid;
    const localStripe = getStripeInstance(); // Kann hier bleiben, wenn in helpers.ts
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
      const paths = [`profilePictures/${userId}/`, `logos/${userId}/`, `businessLicenses/${userId}/`, `masterCraftsmanCertificates/${userId}/`, `projectImages/${userId}/`, `identityDocs/${userId}/`];
      for (const p of paths) {
        try { await adminStorageBucket.deleteFiles({ prefix: p }); loggerV2.info(`Storage ${p} gelöscht.`); }
        catch (e: any) { if (e.code !== 404 && e.code !== 'storage/object-not-found') errors.push(`Storage ${p}: ${e.message}`); else loggerV2.info(`Storage ${p} nicht gefunden.`); }
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