import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { logger as loggerV2 } from 'firebase-functions/v2';
import Stripe from 'stripe';
import { getDb, getStripeInstance, getEmulatorCallbackFrontendURL, getChatParticipantDetails, ParticipantDetails } from './helpers';
import { defineSecret } from 'firebase-functions/params';
import { FieldValue } from 'firebase-admin/firestore';

// Definiere die erlaubten Origins direkt hier
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5002',
  'http://127.0.0.1:5002',
  'https://tasko-rho.vercel.app',
  'https://tasko-zh8k.vercel.app',
  'https://tasko-live.vercel.app',
  'https://tilvo-f142f.web.app',
  'https://taskilo.de',
  'https://www.taskilo.de'
];

// Parameter zentral definieren (auf oberster Ebene der Datei)
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");

// Hilfsfunktion für Stripe-Key in Emulator vs Production
function getStripeSecretKey(): string {
  // Im Emulator: Verwende process.env
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    const emulatorKey = process.env.STRIPE_SECRET_KEY;
    if (!emulatorKey) {
      throw new Error("STRIPE_SECRET_KEY nicht in Emulator-Umgebung gefunden");
    }
    return emulatorKey;
  }
  // In Production: Verwende Firebase Secret
  return STRIPE_SECRET_KEY.value();
}
// Log für den Ladevorgang der Datei
loggerV2.info("Lade callable_stripe.ts...");

try {
  loggerV2.info("callable_stripe.ts: Globale Initialisierung erfolgreich.");
} catch (error: any) {
  loggerV2.error("callable_stripe.ts: Fehler bei globaler Initialisierung!", { error: error.message, stack: error.stack });
  throw error;
}

// Interfaces wie im Frontend definiert (oder sicherstellen, dass sie global verfügbar sind)
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

interface CreateStripeAccountCallableData {
  userId: string; clientIp: string;
  firstName?: string; lastName?: string; email?: string; phoneNumber?: string;
  dateOfBirth?: string;
  personalStreet?: string; personalHouseNumber?: string; personalPostalCode?: string;
  personalCity?: string; personalCountry?: string | null;

  isManagingDirectorOwner?: boolean;
  ownershipPercentage?: number;

  isActualDirector?: boolean;
  isActualOwner?: boolean;
  actualOwnershipPercentage?: number;
  isActualExecutive?: boolean;
  actualRepresentativeTitle?: string;

  // Stripe File IDs for verification
  identityFrontFileId?: string;
  identityBackFileId?: string;
  businessLicenseFileId?: string;
  masterCraftsmanCertificateFileId?: string;
  profilePictureFileId?: string;

  // Firebase Storage URLs for display
  identityFrontUrl?: string;
  identityBackUrl?: string;
  businessLicenseUrl?: string;
  masterCraftsmanCertificateUrl?: string;
  profilePictureUrl?: string;

  companyName?: string;
  legalForm?: string | null;
  companyAddressLine1?: string; companyCity?: string;
  companyPostalCode?: string; companyCountry?: string | null;
  companyPhoneNumber?: string;
  companyRegister?: string;
  taxNumber?: string;
  vatId?: string;
  companyWebsite?: string;
  mcc?: string;
  iban?: string; accountHolder?: string;
}

interface CreateStripeAccountCallableResult {
  success: boolean;
  accountId?: string;
  message?: string;
  accountLinkUrl?: string;
  missingFields?: string[];
  requiresStripeIntervention?: boolean;
}

interface UpdateStripeCompanyDetailsData {
  companyPhoneNumber?: string;
  companyWebsite?: string;
  companyRegister?: string;
  taxNumber?: string;
  vatId?: string;
  mcc?: string;
  iban?: string; accountHolder?: string; bankCountry?: string | null;
  representativeFirstName?: string; representativeLastName?: string;
  representativeEmail?: string; representativePhone?: string;
  representativeDateOfBirth?: string;
  representativeAddressStreet?: string; representativeAddressHouseNumber?: string;
  representativeAddressPostalCode?: string; representativeAddressCity?: string;
  representativeAddressCountry?: string | null;
  isRepresentative?: boolean; isDirector?: boolean; isOwner?: boolean;
  representativeTitle?: string;
  isExecutive?: boolean;
  identityFrontFileId?: string; identityBackFileId?: string;
  businessLicenseStripeFileId?: string;
}
interface UpdateStripeCompanyDetailsResult {
  success: boolean;
  message: string;
  accountLinkUrl?: string;
  missingFields?: string[];
}

interface GetStripeAccountStatusResult {
  success: boolean; message?: string; accountId?: string | null;
  detailsSubmitted?: boolean | null; chargesEnabled?: boolean | null;
  payoutsEnabled?: boolean | null;
  requirements?: Stripe.Account.Requirements | null;
  accountLinkUrl?: string;
  missingFields?: string[];
}

interface UserProfile {
  stripeCustomerId?: string;
  savedPaymentMethods?: {
    id: string;
    brand?: string;
    last4?: string;
    exp_month?: number;
    exp_year?: number;
    type: string;
  }[];
}




const translateStripeRequirement = (req: string): string => {
  if (req.startsWith('company.address.')) return `Firmenadresse (${req.substring(req.lastIndexOf('.') + 1)})`;
  if (req.startsWith('company.verification.document')) return "Firmen-Verifizierungsdokument (z.B. Handelsregisterauszug)";
  if (req === 'company.name') return "Firmenname";
  if (req === 'company.phone') return "Telefonnummer der Firma";
  if (req === 'company.tax_id') return "Nationale Steuernummer der Firma";
  if (req === 'company.registration_number') return "Handelsregisternummer";
  if (req === 'company.vat_id') return "Umsatzsteuer-ID der Firma";
  if (req.includes('percent_ownership')) return "Eigentumsanteil der Person";
  if (req === 'business_profile.mcc') return "MCC (Branchencode)";
  if (req === 'business_profile.url') return "Firmenwebseite (Ihr Profil auf Tilvo)";
  if (req.startsWith('person.') || req.startsWith('individual.')) {
    const prefix = req.startsWith('person.') ? 'person.' : 'individual.';
    const personField = req.substring(prefix.length);
    const baseText = "Angaben zur Person/Geschäftsführer";
    if (personField.startsWith('first_name')) return `${baseText}: Vorname`;
    if (personField.startsWith('last_name')) return `${baseText}: Nachname`;
    if (personField.startsWith('email')) return `${baseText}: E-Mail`;
    if (personField.startsWith('phone')) return `${baseText}: Telefonnummer`;
    if (personField.startsWith('dob.')) return `${baseText}: Geburtsdatum`;
    if (personField.startsWith('address.')) return `${baseText}: Private Adresse (${personField.substring(personField.lastIndexOf('.') + 1)})`;
    if (personField.startsWith('verification.document')) return `${baseText}: Ausweisdokument`;
    if (personField.startsWith('relationship.owner')) return "Nachweis der Eigentümerschaft";
    if (personField.startsWith('relationship.director')) return "Nachweis der Geschäftsführertätigkeit";
    if (personField.startsWith('relationship.executive')) return "Angaben zur leitenden Führungskraft";
    if (personField.startsWith('relationship.representative')) return "Angaben zum Vertreter";
    if (personField.startsWith('relationship.title')) return "Position/Titel des Vertreters";
    return `${baseText}: ${personField.replace('.', ' ')}`;
  }
  if (req.startsWith('external_account')) return "Bankverbindung";
  if (req.startsWith('tos_acceptance.')) return "Zustimmung zu den Stripe Nutzungsbedingungen";
  return `Benötigt: ${req.replace(/[._]/g, ' ')}`;
};

const mapLegalFormToStripeBusinessInfo = (
  legalForm: string | null | undefined
): { businessType: 'individual' | 'company'; companyStructure?: Stripe.AccountCreateParams.Company.Structure } => {
  if (!legalForm) {
    loggerV2.warn("[mapLegalFormToStripeBusinessInfo] Keine Rechtsform übergeben, Fallback auf business_type: 'company', company.structure: undefined.");
    return { businessType: 'company', companyStructure: undefined };
  }
  const form = legalForm.toLowerCase();
  if (form.includes("einzelunternehmen") || form.includes("freiberufler")) {
    if (form.includes("e.k.") || form.includes("eingetragener kaufmann")) {
      return { businessType: 'company', companyStructure: 'sole_proprietorship' };
    }
    return { businessType: 'individual' };
  }
  if (form.includes("gmbh") || form.includes("ug")) return { businessType: 'company', companyStructure: undefined };
  if (form.includes("ag")) return { businessType: 'company', companyStructure: "public_company" };
  if (form.includes("gbr") || form.includes("ohg") || form.includes("kg") || form.includes("partnerschaft")) return { businessType: 'company', companyStructure: "unincorporated_partnership" };
  loggerV2.warn(`[mapLegalFormToStripeBusinessInfo] Unbekannte Rechtsform "${legalForm}", Fallback auf business_type: 'company', company.structure: undefined.`);
  return { businessType: 'company', companyStructure: undefined };
};

// Helper-Funktion für Umgebungs-URLs
const getEnvironmentUrls = (configuredFrontendUrl: string, userId?: string) => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

  loggerV2.info(`[getEnvironmentUrls] Umgebung erkannt: ${isEmulator ? 'Emulator' : 'Produktion'}`);
  loggerV2.info(`[getEnvironmentUrls] Konfigurierte Frontend-URL: ${configuredFrontendUrl}`);

  if (isEmulator) {
    // Im Emulator: Verwende für Stripe die Taskilo-URL mit Profil-ID
    const profileUrl = userId ? `https://taskilo.de/profile/${userId}` : 'https://taskilo.de';
    return {
      stripeBusinessProfileUrl: profileUrl,
    };
  } else {
    // In Produktion: Verwende die konfigurierte URL oder Fallback
    let baseUrl = configuredFrontendUrl;

    // Wenn localhost URL übergeben wird, verwende Produktions-Fallback
    if (!configuredFrontendUrl || !configuredFrontendUrl.startsWith('http') || configuredFrontendUrl.includes('localhost')) {
      loggerV2.warn(`[getEnvironmentUrls] Ungültige URL '${configuredFrontendUrl}' erkannt, verwende Produktions-Fallback`);
      baseUrl = 'https://taskilo.de'; // Sichere Produktions-URL als Fallback
    }

    // Erstelle individuelle Profil-URL für Stripe
    const profileUrl = userId ? `${baseUrl}/profile/${userId}` : baseUrl;

    return {
      stripeBusinessProfileUrl: profileUrl,
    };
  }
};

export const createStripeAccountIfComplete = onCall(
  // Force redeploy by adding a comment
  {
    region: "europe-west1",
    cors: allowedOrigins,
    secrets: [STRIPE_SECRET_KEY],
    memory: '512MiB', // Speicher auf 512 MiB erhöhen für Stripe-Konto-Erstellung
    timeoutSeconds: 120 // Timeout auf 120 Sekunden erhöhen für komplexe Stripe-Operationen
  },
  async (request: CallableRequest<CreateStripeAccountCallableData>): Promise<CreateStripeAccountCallableResult> => {
    loggerV2.info('[createStripeAccountIfComplete] Aufgerufen mit Payload:', JSON.stringify(request.data));

    const stripeKey = STRIPE_SECRET_KEY.value();
    const frontendUrlValue = process.env.FRONTEND_URL || 'https://taskilo.de';

    loggerV2.info(`[DEBUG] Stripe Key geladen? ${stripeKey ? 'Ja, Länge: ' + stripeKey.length : 'NEIN, LEER!'}`);
    loggerV2.info(`[DEBUG] Frontend URL geladen? ${frontendUrlValue ? 'Ja: ' + frontendUrlValue : 'NEIN, LEER!'}`);

    const db = getDb();
    const localStripe = getStripeInstance(stripeKey); // <-- Parameter übergeben
    const { userId, clientIp, ...payloadFromClient } = request.data;

    if (!stripeKey) {
      loggerV2.error("[createStripeAccountIfComplete] FATAL: Stripe Secret Key ist nicht verfügbar. Überprüfen Sie die Umgebungsvariablen/Secrets.");
      throw new HttpsError("internal", "Server-Konfigurationsfehler: Stripe-Schlüssel fehlt.");
    }

    if (!userId || !clientIp || clientIp.length < 7) {
      throw new HttpsError("invalid-argument", "Nutzer-ID und gültige IP sind erforderlich.");
    }
    loggerV2.info('[DEBUG] Punkt 1: Basis-Infos (userId, IP) OK.');

    const userDocRef = db.collection("users").doc(userId);
    const userDocSnapshot = await userDocRef.get();
    if (!userDocSnapshot.exists) {
      throw new HttpsError("not-found", `Nutzerdokument ${userId} nicht gefunden.`);
    }
    const existingFirestoreUserData = userDocSnapshot.data() as any;
    if (!existingFirestoreUserData) {
      throw new HttpsError("internal", "Fehler beim Lesen der Nutzerdaten aus Firestore.");
    }
    loggerV2.info('[DEBUG] Punkt 2: Nutzerdokument aus Firestore geladen OK.');

    if (existingFirestoreUserData.stripeAccountId?.startsWith('acct_')) {
      throw new HttpsError("already-exists", "Nutzer hat bereits ein Stripe-Konto.");
    }
    loggerV2.info('[DEBUG] Punkt 3: Kein bestehendes Stripe-Konto gefunden, fahre fort OK.');

    if (existingFirestoreUserData.user_type !== "firma") {
      throw new HttpsError("failed-precondition", "Nur Nutzer vom Typ 'Firma' können Stripe-Konten erstellen.");
    }
    loggerV2.info('[DEBUG] Punkt 4: Nutzer ist Typ "Firma" OK.');

    const { businessType, companyStructure } = mapLegalFormToStripeBusinessInfo(payloadFromClient.legalForm);
    loggerV2.info(`[DEBUG] Punkt 5: Rechtsform gemappt. Typ: ${businessType}, Struktur: ${companyStructure}`);

    // Refactored validation logic
    const requiredFields: { key: keyof CreateStripeAccountCallableData, name: string }[] = [
      { key: 'legalForm', name: 'Rechtsform' },
      { key: 'email', name: 'E-Mail' },
      { key: 'firstName', name: 'Vorname' },
      { key: 'lastName', name: 'Nachname' },
      { key: 'iban', name: 'IBAN' },
      { key: 'accountHolder', name: 'Kontoinhaber' },
      { key: 'mcc', name: 'MCC (Branchencode)' },
      { key: 'identityFrontFileId', name: 'Ausweisdokument (Vorderseite)' }, // Validate File ID presence
      { key: 'identityBackFileId', name: 'Ausweisdokument (Rückseite)' },   // Validate File ID presence
      { key: 'profilePictureFileId', name: 'Profilbild' },                 // Validate File ID presence
    ];

    for (const field of requiredFields) {
      const value = request.data[field.key];
      if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
        throw new HttpsError("failed-precondition", `${field.name} ist eine Pflichtangabe.`);
      }
      loggerV2.info(`[DEBUG] Validierung OK: ${field.key}`);
    }

    if (!payloadFromClient.dateOfBirth) {
      throw new HttpsError("failed-precondition", "Geburtsdatum des Ansprechpartners/Inhabers ist erforderlich.");
    }
    loggerV2.info('[DEBUG] Validierung OK: dateOfBirth existiert.');

    const [yearDob, monthDob, dayDob] = (payloadFromClient.dateOfBirth || '').split('-').map(Number);
    const dobDate = new Date(Date.UTC(yearDob, monthDob - 1, dayDob));
    if (!(dobDate.getUTCFullYear() === yearDob && dobDate.getUTCMonth() === monthDob - 1 && dobDate.getUTCDate() === dayDob && yearDob > 1900 && yearDob < (new Date().getFullYear() - 17))) {
      loggerV2.error(`FEHLER bei DOB-Validierung: Jahr=${yearDob}, Monat=${monthDob}, Tag=${dayDob}`);
      throw new HttpsError("invalid-argument", "Ungültiges Geburtsdatum oder Person zu jung.");
    }
    loggerV2.info('[DEBUG] Validierung OK: dateOfBirth ist gültiges Format und Alter.');

    if (businessType === 'company') {
      loggerV2.info('[DEBUG] Starte Validierungen für "company".');
      if (!payloadFromClient.companyName?.trim()) throw new HttpsError("failed-precondition", "Firmenname ist erforderlich.");
      if (!payloadFromClient.companyAddressLine1?.trim() || !payloadFromClient.companyCity?.trim() || !payloadFromClient.companyPostalCode?.trim() || !payloadFromClient.companyCountry?.trim()) {
        throw new HttpsError("failed-precondition", "Vollständige Firmenadresse ist erforderlich.");
      }
      if (payloadFromClient.companyCountry && payloadFromClient.companyCountry.length !== 2) throw new HttpsError("invalid-argument", "Ländercode der Firma muss 2-stellig sein (z.B. DE).");
      if (!payloadFromClient.businessLicenseFileId) throw new HttpsError("failed-precondition", "Gewerbeschein ist für Firmen erforderlich.");
      loggerV2.info('[DEBUG] Company-Validierung OK: Basis-Infos.');
    } else { // businessType === 'individual'
      loggerV2.info('[DEBUG] Starte Validierungen für "individual".');
      const personalStreetToUse = payloadFromClient.personalStreet?.trim() || payloadFromClient.companyAddressLine1?.trim();
      const personalPostalCodeToUse = payloadFromClient.personalPostalCode?.trim() || payloadFromClient.companyPostalCode?.trim();
      const personalCityToUse = payloadFromClient.personalCity?.trim() || payloadFromClient.companyCity?.trim();
      const personalCountryToUse = payloadFromClient.personalCountry?.trim() || payloadFromClient.companyCountry?.trim();
      if (!personalStreetToUse || !personalPostalCodeToUse || !personalCityToUse || !personalCountryToUse) {
        throw new HttpsError("failed-precondition", "Vollständige Adresse (Privat- oder Firmenadresse) für Einzelperson/Freiberufler erforderlich.");
      }
      if (personalCountryToUse && personalCountryToUse.length !== 2) {
        throw new HttpsError("invalid-argument", "Verwendeter Ländercode muss 2-stellig sein.");
      }
      loggerV2.info('[DEBUG] Individual-Validierung OK: Adresse.');

      if (!payloadFromClient.taxNumber?.trim() && !payloadFromClient.vatId?.trim()) {
        throw new HttpsError("failed-precondition", `Nationale Steuernummer ODER USt-IdNr. für ${payloadFromClient.legalForm} erforderlich.`);
      }
      loggerV2.info('[DEBUG] Individual-Validierung OK: Steuernummer.');
    }
    loggerV2.info('[DEBUG] Alle Validierungen bestanden. Fahre fort mit Kontoerstellung.');

    const userAgent = existingFirestoreUserData.common?.tosAcceptanceUserAgent || request.rawRequest?.headers["user-agent"] || "UserAgentNotProvided";
    // Helper, um leere Strings, null oder undefined in 'undefined' umzuwandeln, damit Stripe sie ignoriert.
    const sanitizeForStripe = <T>(val: T | null | undefined | ""): T | undefined => {
      if (val === null || val === undefined || val === "") return undefined;
      return val;
    };

    // The platformProfileUrl for Stripe's business_profile MUST be a public, non-localhost URL.
    // We will always use the production frontend URL for this, which is correctly
    // sourced from the FRONTEND_URL parameter.
    const { stripeBusinessProfileUrl } = getEnvironmentUrls(frontendUrlValue, userId);

    const accountParams: Stripe.AccountCreateParams = {
      type: "custom",
      country: businessType === 'company' ? sanitizeForStripe(payloadFromClient.companyCountry)! : sanitizeForStripe(payloadFromClient.personalCountry || payloadFromClient.companyCountry)!,
      email: payloadFromClient.email!,
      business_type: businessType,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { internal_user_id: userId, created_by_callable: "true", legal_form_provided: sanitizeForStripe(payloadFromClient.legalForm) || 'N/A' },
      tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: clientIp, user_agent: userAgent },
      business_profile: {
        mcc: payloadFromClient.mcc!,
        url: stripeBusinessProfileUrl,
      },
    };

    if (businessType === 'company') {
      accountParams.company = {
        name: payloadFromClient.companyName!,
        address: {
          line1: payloadFromClient.companyAddressLine1!,
          city: payloadFromClient.companyCity!,
          postal_code: payloadFromClient.companyPostalCode!,
          country: sanitizeForStripe(payloadFromClient.companyCountry)!,
        },
        phone: sanitizeForStripe(payloadFromClient.companyPhoneNumber || payloadFromClient.phoneNumber),
        registration_number: sanitizeForStripe(payloadFromClient.companyRegister),
        tax_id: sanitizeForStripe(payloadFromClient.taxNumber),
        vat_id: sanitizeForStripe(payloadFromClient.vatId),
        structure: companyStructure,
      };
      if (payloadFromClient.businessLicenseFileId && accountParams.company) {
        if (!accountParams.company.verification) accountParams.company.verification = { document: {} };
        accountParams.company.verification.document = { front: payloadFromClient.businessLicenseFileId };
      }
    } else {
      const personalStreet = sanitizeForStripe(payloadFromClient.personalStreet?.trim() || payloadFromClient.companyAddressLine1?.trim());
      const personalHouse = sanitizeForStripe(payloadFromClient.personalHouseNumber?.trim());
      accountParams.individual = {
        first_name: payloadFromClient.firstName,
        last_name: payloadFromClient.lastName,
        email: payloadFromClient.email,
        phone: sanitizeForStripe(payloadFromClient.phoneNumber),
        dob: { day: dayDob, month: monthDob, year: yearDob },
        address: {
          line1: personalStreet ? `${personalStreet} ${personalHouse ?? ''}`.trim() : sanitizeForStripe(payloadFromClient.companyAddressLine1)!,
          postal_code: sanitizeForStripe(payloadFromClient.personalPostalCode || payloadFromClient.companyPostalCode)!,
          city: sanitizeForStripe(payloadFromClient.personalCity || payloadFromClient.companyCity)!,
          country: sanitizeForStripe(payloadFromClient.personalCountry || payloadFromClient.companyCountry)!,
        },
        verification: {
          document: {
            front: payloadFromClient.identityFrontFileId,
            back: payloadFromClient.identityBackFileId,
          }
        }
      };
    }

    if (payloadFromClient.iban && payloadFromClient.accountHolder) {
      accountParams.external_account = {
        object: "bank_account",
        country: businessType === 'company' ? sanitizeForStripe(payloadFromClient.companyCountry)! : sanitizeForStripe(payloadFromClient.personalCountry || payloadFromClient.companyCountry)!,
        currency: "eur",
        account_number: (payloadFromClient.iban).replace(/\s/g, ""),
        account_holder_name: payloadFromClient.accountHolder,
      };
    }

    if (payloadFromClient.profilePictureFileId) {
      accountParams.settings = { ...accountParams.settings, branding: { icon: payloadFromClient.profilePictureFileId } };
    }

    let account: Stripe.Account;
    try {
      // --- ERWEITERTES LOGGING START ---
      loggerV2.info(">>>> VERSUCHE, STRIPE KONTO ZU ERSTELLEN mit Parametern (detailliert):", { params: JSON.stringify(accountParams, null, 2) });
      // --- ERWEITERTES LOGGING ENDE ---
      account = await localStripe.accounts.create(accountParams);
      loggerV2.info(`✅✅✅ ERFOLG! Stripe Account ${account.id} wurde erstellt.`);

    } catch (e: any) {
      // Check if it's a Stripe error by looking for a `type` property
      if (e.type && typeof e.type === 'string') {
        // --- ERWEITERTES LOGGING START ---
        loggerV2.error("🔥🔥🔥 STRIPE API FEHLER (DETAILLIERT) 🔥🔥🔥:", {
          message: e.message,
          type: e.type,
          code: e.code,
          param: e.param,
          statusCode: e.statusCode,
          requestId: e.requestId,
          raw: JSON.stringify(e.raw) // Vollständiges Raw-Objekt als String loggen
        });
        // --- ERWEITERTES LOGGING ENDE ---
        throw new HttpsError("internal", e.raw?.message || "Fehler bei initialer Kontoerstellung durch Stripe.");
      } else {
        // Fallback für nicht-Stripe-Fehler
        // --- ERWEITERTES LOGGING START ---
        loggerV2.error("🔥🔥🔥 ALLGEMEINER FEHLER BEI KONTOERSTELLUNG (DETAILLIERT) 🔥🔥🔥:", {
          error: e,
          message: e.message,
          stack: e.stack
        });
        // --- ERWEITERTES LOGGING ENDE ---
        throw new HttpsError("internal", e.message || "Ein unerwarteter Fehler ist bei der Kontoerstellung aufgetreten.");
      }
    }


    // --- NEUES LOGGING START ---
    loggerV2.info(">>>> NACH dem Stripe API Call. Account-Daten (vollständig):", { accountData: JSON.stringify(account, null, 2) });
    // --- NEUES LOGGING ENDE ---


    if (businessType === 'company') {
      // Nur versuchen, eine Person zu erstellen, wenn die erforderlichen Daten vorhanden sind.
      const hasRequiredPersonData =
        payloadFromClient.firstName &&
        payloadFromClient.lastName &&
        payloadFromClient.email &&
        payloadFromClient.dateOfBirth &&
        payloadFromClient.identityFrontFileId &&
        payloadFromClient.identityBackFileId &&
        payloadFromClient.personalStreet &&
        payloadFromClient.personalPostalCode &&
        payloadFromClient.personalCity &&
        payloadFromClient.personalCountry;

      if (hasRequiredPersonData) {
        const personRelationship: Stripe.AccountCreatePersonParams['relationship'] = {
          representative: true,
          director: payloadFromClient.isActualDirector,
          owner: payloadFromClient.isActualOwner,
          executive: payloadFromClient.isActualExecutive,
          title: sanitizeForStripe(payloadFromClient.actualRepresentativeTitle),
        };

        if (payloadFromClient.isManagingDirectorOwner) {
          personRelationship.owner = true;
          personRelationship.director = true;
          personRelationship.executive = true;
          personRelationship.title = "Geschäftsführender Gesellschafter";
          personRelationship.percent_ownership = payloadFromClient.ownershipPercentage;
        }

        const personPayload: Stripe.AccountCreatePersonParams = {
          first_name: payloadFromClient.firstName!,
          last_name: payloadFromClient.lastName!,
          email: payloadFromClient.email!,
          phone: sanitizeForStripe(payloadFromClient.phoneNumber),
          relationship: personRelationship,
          verification: { document: { front: payloadFromClient.identityFrontFileId!, back: payloadFromClient.identityBackFileId! } },
          dob: { day: dayDob, month: monthDob, year: yearDob },
          address: {
            line1: `${payloadFromClient.personalStreet!} ${payloadFromClient.personalHouseNumber ?? ''}`.trim(),
            postal_code: payloadFromClient.personalPostalCode!,
            city: payloadFromClient.personalCity!,
            country: payloadFromClient.personalCountry!,
          },
        };

        try {
          loggerV2.info("Versuche, eine Person für das Firmenkonto zu erstellen...", { accountId: account.id });
          const person = await localStripe.accounts.createPerson(account.id, personPayload);
          await userDocRef.update({ stripeRepresentativePersonId: person.id });
          loggerV2.info(`Person ${person.id} erfolgreich für Konto ${account.id} erstellt.`);
        } catch (e: any) {
          // Loggen Sie den Fehler, aber fahren Sie fort, anstatt das Konto zu löschen.
          // Das Konto existiert bereits und das Hinzufügen der Person kann später erneut versucht werden.
          // --- ERWEITERTES LOGGING START ---
          loggerV2.error(`Fehler beim Erstellen der Personendaten für Konto ${account.id}, aber das Konto wird beibehalten. (DETAILLIERT)`, {
            message: e.raw?.message || e.message,
            accountId: account.id,
            rawError: JSON.stringify(e.raw) // Vollständiges Raw-Objekt als String loggen
          });
          // --- ERWEITERTES LOGGING ENDE ---
          // Optional: Speichern Sie den Fehler im Nutzerdokument, um ihn später zu behandeln.
          await userDocRef.update({
            stripeAccountError: `Personen-Erstellung fehlgeschlagen: ${e.raw?.message || e.message}`
          });
        }
      } else {
        loggerV2.warn(`Überspringe die Erstellung der Person für das Firmenkonto ${account.id}, da erforderliche Daten fehlen.`, {
          accountId: account.id,
          missingDataHint: "Überprüfen Sie firstName, lastName, email, dob, identity files, personal address."
        });
      }
    }

    const firestoreUpdateData: { [key: string]: any } = {
      stripeAccountId: account.id,
      stripeAccountDetailsSubmitted: account.details_submitted,
      stripeAccountPayoutsEnabled: account.payouts_enabled,
      stripeAccountChargesEnabled: account.charges_enabled,
      stripeAccountCreationDate: FieldValue.serverTimestamp(),
      stripeAccountError: FieldValue.delete(),
      "common.createdByCallable": "true",
      "step1.dateOfBirth": payloadFromClient.dateOfBirth || null,
      "step1.phoneNumber": payloadFromClient.phoneNumber || null,
      "step1.personalStreet": payloadFromClient.personalStreet || null,
      "step1.personalHouseNumber": payloadFromClient.personalHouseNumber || null,
      "step1.personalPostalCode": payloadFromClient.personalPostalCode || null,
      "step1.personalCity": payloadFromClient.personalCity || null,
      "step1.personalCountry": payloadFromClient.personalCountry || null,
      "step1.isManagingDirectorOwner": payloadFromClient.isManagingDirectorOwner ?? true,
      "step1.ownershipPercentage": payloadFromClient.ownershipPercentage ?? null,
      "step1.isActualDirector": payloadFromClient.isActualDirector === undefined ? null : payloadFromClient.isActualDirector,
      "step1.isActualOwner": payloadFromClient.isActualOwner === undefined ? null : payloadFromClient.isActualOwner,
      "step1.actualOwnershipPercentage": payloadFromClient.actualOwnershipPercentage ?? null,
      "step1.isActualExecutive": payloadFromClient.isActualExecutive === undefined ? null : payloadFromClient.isActualExecutive,
      "step1.actualRepresentativeTitle": payloadFromClient.actualRepresentativeTitle || null,
      "step2.legalForm": payloadFromClient.legalForm || null,
      "step2.companyName": payloadFromClient.companyName || null,
      "step2.industryMcc": payloadFromClient.mcc || null,
      "step2.website": payloadFromClient.companyWebsite || null,
      "step3.companyRegister": payloadFromClient.companyRegister || null,
      "step3.taxNumber": payloadFromClient.taxNumber || null,
      "step3.vatId": payloadFromClient.vatId || null,
      "step3.profilePictureURL": payloadFromClient.profilePictureUrl || null,
      "step3.businessLicenseURL": payloadFromClient.businessLicenseUrl || null,
      "step3.masterCraftsmanCertificateURL": payloadFromClient.masterCraftsmanCertificateUrl || FieldValue.delete(),
      "step3.identityFrontUrl": payloadFromClient.identityFrontUrl || null,
      "step3.identityBackUrl": payloadFromClient.identityBackUrl || null,
      "step4.iban": payloadFromClient.iban ? `****${payloadFromClient.iban.slice(-4)}` : null, // Nur die letzten 4 Ziffern speichern
      "step4.accountHolder": payloadFromClient.accountHolder || null,
    };
    await userDocRef.update(firestoreUpdateData);

    const finalAccountData = await localStripe.accounts.retrieve(account.id);
    const finalMissingFields: string[] = [];
    (finalAccountData.requirements?.currently_due || []).forEach(req => finalMissingFields.push(translateStripeRequirement(req)));
    (finalAccountData.requirements?.eventually_due || []).forEach(req => finalMissingFields.push(`Benötigt (später): ${translateStripeRequirement(req)}`));

    return {
      success: true,
      accountId: account.id,
      message: "Stripe Konto erfolgreich erstellt und alle Anforderungen erfüllt.",
      missingFields: [...new Set(finalMissingFields)],
    };
  }
);

// --- HIER WIRD DIE FUNKTION getOrCreateStripeCustomer HINZUGEFÜGT ---
export const getOrCreateStripeCustomer = onCall<GetOrCreateStripeCustomerPayload>(
  {
    region: "europe-west1",
    cors: allowedOrigins,
    secrets: [STRIPE_SECRET_KEY]
  },
  async (request: CallableRequest<GetOrCreateStripeCustomerPayload>): Promise<GetOrCreateStripeCustomerResult> => {
    // Minimaler Logging für Memory-Optimierung
    const db = getDb();
    const stripeKey = getStripeSecretKey();
    const localStripe = getStripeInstance(stripeKey);

    if (!request.auth?.uid) { throw new HttpsError("unauthenticated", "Nutzer nicht authentifiziert."); }
    const firebaseUserId = request.auth.uid;
    const payload = request.data;

    if (!payload.email) {
      throw new HttpsError("invalid-argument", "E-Mail ist im Payload erforderlich.");
    }

    try {
      const userDocRef = db.collection("users").doc(firebaseUserId);
      let userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        const [firstName, ...lastNameParts] = (payload.name || "").split(" ");
        const lastName = lastNameParts.join(" ");

        const newUserProfileData = {
          uid: firebaseUserId,
          email: payload.email,
          firstName: firstName || null,
          lastName: lastName || null,
          phoneNumber: payload.phone || null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          user_type: 'kunde',
          savedAddresses: payload.address && payload.address.line1 ? [{
            id: `addr_${new Date().getTime()}`,
            name: payload.name || `Rechnungsadresse`,
            line1: payload.address.line1,
            line2: payload.address.line2,
            city: payload.address.city,
            postal_code: payload.address.postal_code,
            country: payload.address.country,
            isDefault: true,
            type: 'billing',
            savedAt: new Date().toISOString(),
          }] : [],
        };

        await userDocRef.set(newUserProfileData, { merge: true });
        userDoc = await userDocRef.get();
      }

      interface FirestoreUserData {
        stripeCustomerId?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        step1?: {
          firstName?: string;
          lastName?: string;
          email?: string;
        };
      }
      const userData = userDoc.data() as FirestoreUserData | undefined;

      if (!userData) { throw new HttpsError("internal", "Fehler Lesen Nutzerdaten."); }
      if (userData.stripeCustomerId?.startsWith("cus_")) { return { stripeCustomerId: userData.stripeCustomerId }; }

      const customerEmailForStripe = payload.email;
      const customerNameForStripe = payload.name || `${userData.firstName || userData.step1?.firstName || ""} ${userData.lastName || userData.step1?.lastName || ""}`.trim() || undefined;
      const customerPhoneForStripe = payload.phone || undefined;

      const stripeCustomerParams: Stripe.CustomerCreateParams = {
        email: customerEmailForStripe,
        name: customerNameForStripe,
        phone: customerPhoneForStripe,
        metadata: { firebaseUID: firebaseUserId }
      };

      if (payload.address) {
        stripeCustomerParams.address = {
          line1: payload.address.line1 || undefined,
          line2: payload.address.line2 || undefined,
          city: payload.address.city || undefined,
          postal_code: payload.address.postal_code || undefined,
          state: payload.address.state || undefined,
          country: payload.address.country || undefined,
        };
      }

      const stripeCustomer = await localStripe.customers.create(stripeCustomerParams);
      await userDocRef.update({ stripeCustomerId: stripeCustomer.id });
      return { stripeCustomerId: stripeCustomer.id };
    } catch (e: any) {
      loggerV2.error(`[getOrCreateStripeCustomer] Fehler für ${firebaseUserId}:`, e);
      if (e instanceof HttpsError) throw e;
      throw new HttpsError("internal", "Fehler Stripe Kundendaten.", e.message);
    }
  });

export const updateStripeCompanyDetails = onCall(
  {
    region: "europe-west1",
    cors: true,  // Erlaube alle Origins in der Entwicklung
    secrets: [STRIPE_SECRET_KEY]
  },
  async (request: CallableRequest<UpdateStripeCompanyDetailsData>): Promise<UpdateStripeCompanyDetailsResult> => {
    loggerV2.info("[updateStripeCompanyDetails] Aufgerufen mit request.data:", JSON.stringify(request.data));
    const db = getDb();
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Nutzer nicht authentifiziert.");
    const stripeKey = STRIPE_SECRET_KEY.value();
    const frontendUrlValue = process.env.FRONTEND_URL || 'https://taskilo.de';
    const userId = request.auth.uid;
    const localStripe = getStripeInstance(stripeKey); // <-- Parameter übergeben
    const userDocRef = db.collection("users").doc(userId);

    try {
      const userDoc = await userDocRef.get();
      if (!userDoc.exists) throw new HttpsError("not-found", "Benutzerprofil nicht gefunden.");
      const currentFirestoreUserData = userDoc.data() as any;
      if (!currentFirestoreUserData) throw new HttpsError("internal", "Nutzerdaten nicht lesbar.");

      const stripeAccountId = currentFirestoreUserData.stripeAccountId as string | undefined;
      if (!stripeAccountId || !stripeAccountId.startsWith('acct_')) {
        throw new HttpsError("failed-precondition", "Stripe-Konto ID ist nicht vorhanden oder ungültig.");
      }

      const currentStripeAccount = await localStripe.accounts.retrieve(stripeAccountId);
      const currentBusinessType = currentStripeAccount.business_type;

      const updatePayloadFromClient = request.data;
      const accountUpdateParams: Stripe.AccountUpdateParams = {};

      if (currentBusinessType === 'company') {
        const companyUpdates: Partial<Stripe.AccountUpdateParams["company"]> = {};
        if (updatePayloadFromClient.companyPhoneNumber !== undefined) companyUpdates.phone = updatePayloadFromClient.companyPhoneNumber || undefined;
        if (updatePayloadFromClient.companyRegister !== undefined) companyUpdates.registration_number = updatePayloadFromClient.companyRegister || undefined;
        if (updatePayloadFromClient.taxNumber !== undefined) companyUpdates.tax_id = updatePayloadFromClient.taxNumber || undefined;
        if (updatePayloadFromClient.vatId !== undefined) companyUpdates.vat_id = updatePayloadFromClient.vatId || undefined;
        if (Object.keys(companyUpdates).length > 0) accountUpdateParams.company = companyUpdates;
      } else {
        const individualUpdates: Partial<Stripe.AccountUpdateParams['individual']> = {};
        if (updatePayloadFromClient.representativeFirstName) individualUpdates.first_name = updatePayloadFromClient.representativeFirstName;
        if (updatePayloadFromClient.representativeLastName) individualUpdates.last_name = updatePayloadFromClient.representativeLastName;
        if (updatePayloadFromClient.representativeEmail) individualUpdates.email = updatePayloadFromClient.representativeEmail;
        if (updatePayloadFromClient.representativePhone) individualUpdates.phone = updatePayloadFromClient.representativePhone;
        if (updatePayloadFromClient.representativeDateOfBirth) {
          const [year, month, day] = updatePayloadFromClient.representativeDateOfBirth.split('-').map(Number);
          if (day && month && year && year > 1900 && year < (new Date().getFullYear() - 5) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            individualUpdates.dob = { day, month, year };
          }
        }
        if (updatePayloadFromClient.representativeAddressStreet && updatePayloadFromClient.representativeAddressPostalCode && updatePayloadFromClient.representativeAddressCity && updatePayloadFromClient.representativeAddressCountry) {
          individualUpdates.address = {
            line1: `${updatePayloadFromClient.representativeAddressStreet} ${updatePayloadFromClient.representativeAddressHouseNumber ?? ''}`.trim(),
            postal_code: updatePayloadFromClient.representativeAddressPostalCode,
            city: updatePayloadFromClient.representativeAddressCity,
            country: updatePayloadFromClient.representativeAddressCountry,
          };
        }
        const verificationIndividual: Partial<Stripe.AccountUpdateParams.Individual.Verification> = {};
        const documentIndividual: Partial<Stripe.AccountUpdatePersonParams.Verification.Document> = {};
        if (updatePayloadFromClient.identityFrontFileId) documentIndividual.front = updatePayloadFromClient.identityFrontFileId;
        if (updatePayloadFromClient.identityBackFileId) documentIndividual.back = updatePayloadFromClient.identityBackFileId;
        if (Object.keys(documentIndividual).length > 0) verificationIndividual.document = documentIndividual;
        if (Object.keys(verificationIndividual).length > 0) individualUpdates.verification = verificationIndividual;

        if (Object.keys(individualUpdates).length > 0) accountUpdateParams.individual = individualUpdates;
      }

      const businessProfileUpdates: Partial<Stripe.AccountUpdateParams["business_profile"]> = {};
      // Verwende immer die individuelle Profil-URL für Stripe, nicht die Firmen-Website
      const { stripeBusinessProfileUrl } = getEnvironmentUrls(frontendUrlValue, userId);
      businessProfileUpdates.url = stripeBusinessProfileUrl;

      if (updatePayloadFromClient.mcc !== undefined) businessProfileUpdates.mcc = updatePayloadFromClient.mcc || undefined;
      if (Object.keys(businessProfileUpdates).length > 0) accountUpdateParams.business_profile = businessProfileUpdates;

      if (updatePayloadFromClient.iban && updatePayloadFromClient.accountHolder && updatePayloadFromClient.bankCountry) {
        accountUpdateParams.external_account = {
          object: 'bank_account',
          account_holder_name: updatePayloadFromClient.accountHolder,
          account_number: updatePayloadFromClient.iban.replace(/\s/g, ''),
          country: updatePayloadFromClient.bankCountry,
          currency: 'eur', // Hinzugefügt: Währung für das externe Konto
        };
      }

      if (Object.keys(accountUpdateParams).length > 0) {
        await localStripe.accounts.update(stripeAccountId, accountUpdateParams);
        loggerV2.info(`Stripe Account ${stripeAccountId} (Typ: ${currentBusinessType}) aktualisiert.`);
      }

      // Firestore-Daten ebenfalls aktualisieren, um Konsistenz zu wahren
      const firestoreUpdatePayload: { [key: string]: any } = {
        "step4.iban": updatePayloadFromClient.iban ? `****${updatePayloadFromClient.iban.slice(-4)}` : undefined,
        "step4.accountHolder": updatePayloadFromClient.accountHolder || undefined,
      };
      await userDocRef.set(firestoreUpdatePayload, { merge: true });

      if (currentBusinessType === 'company') {
        let personIdToUpdate: string | undefined = currentFirestoreUserData.stripeRepresentativePersonId;
        const personDataToUpdate: Partial<Stripe.AccountUpdatePersonParams> = {};
        let isCreatingNewPerson = false;

        if (updatePayloadFromClient.representativeFirstName) personDataToUpdate.first_name = updatePayloadFromClient.representativeFirstName;
        if (updatePayloadFromClient.representativeLastName) personDataToUpdate.last_name = updatePayloadFromClient.representativeLastName;
        if (updatePayloadFromClient.representativeEmail) personDataToUpdate.email = updatePayloadFromClient.representativeEmail; // Korrigierter Tippfehler
        if (updatePayloadFromClient.representativePhone) personDataToUpdate.phone = updatePayloadFromClient.representativePhone; // Korrigierter Tippfehler

        if (updatePayloadFromClient.representativeDateOfBirth) {
          const [year, month, day] = updatePayloadFromClient.representativeDateOfBirth.split('-').map(Number);
          if (day && month && year && year > 1900 && year < (new Date().getFullYear() - 5) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            personDataToUpdate.dob = { day, month, year };
          } else {
            loggerV2.warn(`[updateStripeCompanyDetails] Ungültiges DOB-Format für Update: ${updatePayloadFromClient.representativeDateOfBirth}`);
          }
        }
        if (updatePayloadFromClient.representativeAddressStreet && updatePayloadFromClient.representativeAddressPostalCode && updatePayloadFromClient.representativeAddressCity && updatePayloadFromClient.representativeAddressCountry) {
          personDataToUpdate.address = {
            line1: `${updatePayloadFromClient.representativeAddressStreet} ${updatePayloadFromClient.representativeAddressHouseNumber ?? ''}`.trim(),
            postal_code: updatePayloadFromClient.representativeAddressPostalCode,
            city: updatePayloadFromClient.representativeAddressCity,
            country: updatePayloadFromClient.representativeAddressCountry,
          };
        }

        const relationship: Partial<Stripe.AccountUpdatePersonParams['relationship']> = {};
        if (updatePayloadFromClient.isRepresentative !== undefined) relationship.representative = updatePayloadFromClient.isRepresentative; else relationship.representative = true;
        if (updatePayloadFromClient.isOwner !== undefined) relationship.owner = updatePayloadFromClient.isOwner;
        if (updatePayloadFromClient.isDirector !== undefined) relationship.director = updatePayloadFromClient.isDirector;
        if (updatePayloadFromClient.isExecutive !== undefined) relationship.executive = updatePayloadFromClient.isExecutive;
        if (updatePayloadFromClient.representativeTitle) relationship.title = updatePayloadFromClient.representativeTitle;

        if (Object.keys(relationship).length > 0) {
          personDataToUpdate.relationship = relationship;
        }

        const verification: Partial<Stripe.AccountUpdatePersonParams['verification']> = {};
        const documentData: Partial<Stripe.AccountUpdatePersonParams.Verification.Document> = {};
        if (updatePayloadFromClient.identityFrontFileId) documentData.front = updatePayloadFromClient.identityFrontFileId;
        if (updatePayloadFromClient.identityBackFileId) documentData.back = updatePayloadFromClient.identityBackFileId;
        if (Object.keys(documentData).length > 0) verification.document = documentData;

        if (Object.keys(verification).length > 0) personDataToUpdate.verification = verification;

        if (Object.keys(personDataToUpdate).length > 0) {
          if (!personIdToUpdate) {
            const personsList = await localStripe.accounts.listPersons(stripeAccountId, { relationship: { representative: true }, limit: 1 });
            if (personsList.data.length > 0) {
              personIdToUpdate = personsList.data[0].id;
            } else {
              if (personDataToUpdate.first_name && personDataToUpdate.last_name && personDataToUpdate.email && personDataToUpdate.dob) {
                isCreatingNewPerson = true;
              } else {
                loggerV2.warn(`[updateStripeCompanyDetails] Minimale Personendaten für Neuerstellung fehlen für Account ${stripeAccountId}.`);
              }
            }
          }

          if (isCreatingNewPerson && personIdToUpdate === undefined) {
            const createPersonPayload = { ...personDataToUpdate } as Stripe.AccountCreatePersonParams;
            const createdPerson = await localStripe.accounts.createPerson(stripeAccountId, createPersonPayload);
            personIdToUpdate = createdPerson.id;
            await userDocRef.update({ stripeRepresentativePersonId: personIdToUpdate });
            loggerV2.info(`Stripe Person ${personIdToUpdate} für Account ${stripeAccountId} NEU erstellt via Update-Funktion.`);
          } else if (personIdToUpdate) {
            await localStripe.accounts.updatePerson(stripeAccountId, personIdToUpdate, personDataToUpdate);
            loggerV2.info(`Stripe Person ${personIdToUpdate} für Account ${stripeAccountId} aktualisiert.`);
          }
        }
      }

      await userDocRef.update({ stripeAccountError: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
      const companyDocRef = db.collection("companies").doc(userId);
      if ((await companyDocRef.get()).exists) {
        await companyDocRef.set({ stripeAccountError: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }

      const refreshedAccountAfterUpdate = await localStripe.accounts.retrieve(stripeAccountId);
      let accountLinkUrlResponse: string | undefined = undefined;
      const finalMissingFieldsList: string[] = [];
      (refreshedAccountAfterUpdate.requirements?.currently_due || []).forEach((req: string) => finalMissingFieldsList.push(translateStripeRequirement(req)));
      (refreshedAccountAfterUpdate.requirements?.eventually_due || []).forEach((req: string) => finalMissingFieldsList.push(`Benötigt (später): ${translateStripeRequirement(req)}`));
      if (!refreshedAccountAfterUpdate.details_submitted && finalMissingFieldsList.length === 0 && (refreshedAccountAfterUpdate.requirements?.currently_due?.length === 0)) {
        finalMissingFieldsList.push("Allgemeine Kontodetails bei Stripe vervollständigen");
      }
      if ((refreshedAccountAfterUpdate.requirements?.errors?.length ?? 0) > 0) {
        (refreshedAccountAfterUpdate.requirements!.errors || []).forEach((err: Stripe.Account.Requirements.Error) => {
          finalMissingFieldsList.push(`Fehler von Stripe: ${err.reason} (betrifft: ${translateStripeRequirement(err.requirement)})`);
        });
      }
      const uniqueFinalMissingFieldsList = [...new Set(finalMissingFieldsList)];

      if (uniqueFinalMissingFieldsList.length > 0) {
        const accLink = await localStripe.accountLinks.create({
          account: stripeAccountId,
          refresh_url: `${getEmulatorCallbackFrontendURL(frontendUrlValue)}/dashboard/company/${userId}/settings?stripe_refresh=true`, // <-- Parameter übergeben
          return_url: `${getEmulatorCallbackFrontendURL(frontendUrlValue)}/dashboard/company/${userId}/settings?stripe_return=true`, // <-- Parameter übergeben
          type: 'account_update',
          collect: 'currently_due',
        });
        accountLinkUrlResponse = accLink.url;
        return { success: true, message: "Profildetails aktualisiert, aber einige Angaben werden noch von Stripe benötigt oder es gibt Fehler.", accountLinkUrl: accountLinkUrlResponse, missingFields: [...new Set(uniqueFinalMissingFieldsList)] };
      }
      return { success: true, message: "Profildetails erfolgreich bei Stripe aktualisiert.", accountLinkUrl: undefined, missingFields: [] };

    } catch (error: any) {
      loggerV2.error(`[updateStripeCompanyDetails] Fehler für Nutzer ${userId}:`, { message: error.message, type: error.type, code: error.code, param: error.param, raw: error.raw });

      // If it's a Stripe validation error, use its message directly and return a 400-level error.
      if (error.type === "StripeInvalidRequestError" || error.type === "StripeCardError") {
        throw new HttpsError('invalid-argument', error.message);
      }

      // If it's an HttpsError we've thrown ourselves, re-throw it.
      if (error instanceof HttpsError) throw error;

      try {
        const userDocForError = db.collection("users").doc(userId);
        await userDocForError.update({ stripeAccountError: error.message || 'Unbekannter Stripe-Fehler', updatedAt: FieldValue.serverTimestamp() });
        const companyDocRefForError = db.collection("companies").doc(userId);
        if ((await companyDocRefForError.get()).exists) {
          await companyDocRefForError.set({ stripeAccountError: error.message || 'Unbekannter Stripe-Fehler', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        }
      } catch (dbError: any) {
        loggerV2.error(`DB-Fehler beim Speichern des Stripe-Fehlers für ${userId} im Catch-Block von updateStripeCompanyDetails:`, dbError.message);
      }

      // For all other unexpected errors, throw a generic 'internal' error.
      throw new HttpsError("internal", error.message || "Interner Serverfehler beim Aktualisieren der Stripe-Informationen.", error.raw?.code || error.code || error.type);
    }
  }
);

/**
 * Ruft die öffentlichen Teilnehmerdetails (Anbieter und Kunde) für eine bestimmte Auftrags-ID ab.
 * Diese Funktion stellt sicher, dass der anfragende Benutzer ein Teilnehmer des Auftrags ist,
 * bevor sie die Daten zurückgibt.
 */
export const getOrderParticipantDetails = onCall(
  {
    region: "europe-west1",
    cors: allowedOrigins,
    secrets: [STRIPE_SECRET_KEY]
  },
  async (request: CallableRequest<{ orderId: string }>): Promise<{ provider: ParticipantDetails, customer: ParticipantDetails }> => {
    const { orderId } = request.data;
    loggerV2.info(`[getOrderParticipantDetails] Called for orderId: ${orderId} by user: ${request.auth?.uid}`);

    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Nutzer nicht authentifiziert.");
    }
    const db = getDb();
    if (!orderId) {
      throw new HttpsError("invalid-argument", "Eine Auftrags-ID (orderId) ist erforderlich.");
    }

    const orderDocRef = db.collection('auftraege').doc(orderId);
    const orderDoc = await orderDocRef.get();

    if (!orderDoc.exists) {
      throw new HttpsError("not-found", `Auftrag ${orderId} nicht gefunden.`);
    }
    const orderData = orderDoc.data()!;

    // Sicherheitsprüfung: Nur Teilnehmer des Auftrags dürfen die Details abrufen.
    if (request.auth.uid !== orderData.kundeId && request.auth.uid !== orderData.selectedAnbieterId) {
      throw new HttpsError("permission-denied", "Sie haben keine Berechtigung, die Details für diesen Auftrag abzurufen.");
    }

    const [providerDetails, customerDetails] = await Promise.all([
      getChatParticipantDetails(db, orderData.selectedAnbieterId),
      getChatParticipantDetails(db, orderData.kundeId),
    ]);

    loggerV2.info(`[getOrderParticipantDetails] Successfully fetched details for orderId: ${orderId}`);
    return { provider: providerDetails, customer: customerDetails };
  }
);

export const createSetupIntent = onCall(
  {
    region: "europe-west1",
    cors: allowedOrigins,
    secrets: [STRIPE_SECRET_KEY]
  },
  async (request: CallableRequest<{ customerId: string, paymentMethodTypes?: string[] }>): Promise<{ client_secret: string | null }> => {
    loggerV2.info("[createSetupIntent] Aufgerufen.");
    const db = getDb();

    if (!request.auth?.uid) {
      loggerV2.warn("[createSetupIntent] Unauthentifizierter Aufruf.");
      throw new HttpsError("unauthenticated", "Nutzer nicht authentifiziert.");
    }

    const firebaseUserId = request.auth.uid;
    const stripeKey = STRIPE_SECRET_KEY.value();
    const localStripe = getStripeInstance(stripeKey); // <-- Parameter übergeben

    try {
      const userDocRef = db.collection("users").doc(firebaseUserId);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        loggerV2.error(`[createSetupIntent] Nutzerprofil ${firebaseUserId} nicht gefunden.`);
        throw new HttpsError("not-found", "Nutzerprofil nicht gefunden.");
      }

      const userData = userDoc.data() as UserProfile;

      if (!userData.stripeCustomerId) {
        loggerV2.error(`[createSetupIntent] Stripe Customer ID fehlt für Nutzer ${firebaseUserId}.`);
        throw new HttpsError("failed-precondition", "Stripe Customer ID fehlt. Bitte erstellen Sie zuerst einen Kunden.");
      }

      const setupIntent = await localStripe.setupIntents.create({
        customer: userData.stripeCustomerId,
        usage: 'off_session',
      });

      loggerV2.info(`[createSetupIntent] SetupIntent ${setupIntent.id} für Nutzer ${firebaseUserId} erstellt.`);
      return { client_secret: setupIntent.client_secret! };

    } catch (e: any) {
      loggerV2.error(`[createSetupIntent] Fehler für Nutzer ${firebaseUserId}:`, e);
      if (e instanceof HttpsError) {
        throw e;
      }
      throw new HttpsError("internal", "Fehler beim Erstellen des SetupIntent.", e.message);
    }
  }
);

export const detachPaymentMethod = onCall(
  {
    region: "europe-west1",
    cors: allowedOrigins,
    secrets: [STRIPE_SECRET_KEY]
  },
  async (request: CallableRequest<{ paymentMethodId: string }>): Promise<{ success: boolean }> => {
    loggerV2.info("[detachPaymentMethod] Aufgerufen.");
    const db = getDb();

    if (!request.auth?.uid) {
      loggerV2.warn("[detachPaymentMethod] Unauthentifizierter Aufruf.");
      throw new HttpsError("unauthenticated", "Nutzer nicht authentifiziert.");
    }

    const firebaseUserId = request.auth.uid;
    const stripeKey = STRIPE_SECRET_KEY.value();
    const localStripe = getStripeInstance(stripeKey); // <-- Parameter übergeben

    try {
      const userDocRef = db.collection("users").doc(firebaseUserId);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        loggerV2.error(`[detachPaymentMethod] Nutzerprofil ${firebaseUserId} nicht gefunden.`);
        throw new HttpsError("not-found", "Nutzerprofil nicht gefunden.");
      }

      const userData = userDoc.data() as UserProfile;

      if (!userData.stripeCustomerId) {
        loggerV2.error(`[detachPaymentMethod] Stripe Customer ID fehlt für Nutzer ${firebaseUserId}.`);
        throw new HttpsError("failed-precondition", "Stripe Customer ID fehlt. Bitte erstellen Sie zuerst einen Kunden.");
      }

      const paymentMethodId = request.data.paymentMethodId;

      // Detach the payment method from the customer
      await localStripe.paymentMethods.detach(paymentMethodId);

      // Optionally, you can also update the user's profile in Firestore if needed
      // For example, removing the payment method from savedPaymentMethods array

      loggerV2.info(`[detachPaymentMethod] Zahlungsmethode ${paymentMethodId} erfolgreich getrennt für Nutzer ${firebaseUserId}.`);
      return { success: true };

    } catch (e: any) {
      loggerV2.error(`[detachPaymentMethod] Fehler für Nutzer ${firebaseUserId}:`, e);
      if (e instanceof HttpsError) {
        throw e;
      }
      throw new HttpsError("internal", "Fehler beim Trennen der Zahlungsmethode.", e.message);
    }
  }
);

interface GetStripeAccountStatusResult {
  success: boolean; message?: string; accountId?: string | null;
  detailsSubmitted?: boolean | null; chargesEnabled?: boolean | null;
  payoutsEnabled?: boolean | null;
  requirements?: Stripe.Account.Requirements | null;
  accountLinkUrl?: string;
  missingFields?: string[];
}

export const getStripeAccountStatus = onCall(
  {
    region: "europe-west1",
    cors: allowedOrigins,
    secrets: [STRIPE_SECRET_KEY]
  },
  async (request: CallableRequest<{ userId: string }>): Promise<GetStripeAccountStatusResult> => {
    const { userId } = request.data;
    if (!userId) {
      throw new HttpsError("invalid-argument", "Die Nutzer-ID ist erforderlich.");
    }

    const db = getDb();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const accountId = userData?.stripeAccountId;

    if (!accountId) {
      return { success: false, message: "Keine Stripe-Konto-ID für diesen Nutzer gefunden." };
    }

    try {
      const stripe = getStripeInstance(STRIPE_SECRET_KEY.value());
      const account = await stripe.accounts.retrieve(accountId);

      return {
        success: true,
        accountId: account.id,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        requirements: account.requirements,
      };
    } catch (error: any) {
      loggerV2.error(`Fehler beim Abrufen des Stripe-Kontostatus für ${userId}:`, error);
      throw new HttpsError("internal", "Fehler beim Abrufen des Stripe-Kontostatus.", { stripeError: error.message });
    }
  });

export const getSavedPaymentMethods = onCall(
  {
    region: "europe-west1",
    cors: allowedOrigins,
    secrets: [STRIPE_SECRET_KEY]
  },
  async (request: CallableRequest<Record<string, never>>): Promise<{ savedPaymentMethods: Stripe.PaymentMethod[] }> => {
    // User must be authenticated
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Benutzer ist nicht angemeldet.');
    }

    try {
      const db = getDb();
      const userDoc = await db.collection('users').doc(request.auth.uid).get();

      if (!userDoc.exists) {
        loggerV2.info(`Benutzer ${request.auth.uid} existiert nicht in der Datenbank.`);
        return { savedPaymentMethods: [] };
      }

      const userData = userDoc.data();
      const stripeCustomerId = userData?.stripeCustomerId;

      if (!stripeCustomerId) {
        loggerV2.info(`Benutzer ${request.auth.uid} hat noch keine Stripe Customer ID.`);
        return { savedPaymentMethods: [] };
      }

      const stripe = getStripeInstance(getStripeSecretKey());
      const paymentMethods = await stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: 'card',
      });

      return { savedPaymentMethods: paymentMethods.data };
    } catch (error: any) {
      loggerV2.error(`Fehler beim Abrufen der Zahlungsmethoden für Benutzer ${request.auth.uid}:`, error);
      throw new HttpsError('internal', 'Zahlungsmethoden konnten nicht abgerufen werden.');
    }
  });

export const getProviderStripeAccountId = onCall(
  {
    region: "europe-west1",
    cors: allowedOrigins,
    secrets: [STRIPE_SECRET_KEY]
  },
  async (request: CallableRequest<{ providerId: string }>): Promise<{ accountId: string | null }> => {
    const { providerId } = request.data;
    if (!providerId) {
      throw new HttpsError('invalid-argument', 'Die Anbieter-ID ist erforderlich.');
    }
    try {
      const db = getDb();
      const userDoc = await db.collection('users').doc(providerId).get();
      if (!userDoc.exists) {
        return { accountId: null };
      }
      const userData = userDoc.data();
      return { accountId: userData?.stripeAccountId || null };
    } catch (error) {
      loggerV2.error(`Fehler beim Abrufen der Stripe-Konto-ID für Anbieter ${providerId}:`, error);
      throw new HttpsError('internal', 'Konto-ID konnte nicht abgerufen werden.');
    }
  });
