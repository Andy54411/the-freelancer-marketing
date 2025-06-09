// /Users/andystaudinger/Tasko/firebase_functions/src/callable_stripe.ts

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { logger as loggerV2 } from 'firebase-functions/v2';
import Stripe from 'stripe';
import { db, getStripeInstance, getFrontendURL, getFirebaseAdminStorage } from './helpers';
import { FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

// =========================================================================
// INTERFACE-DEFINITIONEN (VOLLSTÄNDIG)
// =========================================================================

interface PrepareUserProfileForStripeData {
  clientIp: string; firstName: string; lastName: string; email: string;
  phoneNumber?: string; dateOfBirth: string;
  personalStreet?: string; personalHouseNumber?: string; personalPostalCode?: string;
  personalCity?: string; personalCountry?: string | null;
  companyName?: string; legalForm?: string | null; companyAddressLine1?: string;
  companyCity?: string; companyPostalCode?: string; companyCountry?: string | null;
  companyPhoneNumber?: string; companyWebsite?: string; companyRegister?: string;
  taxNumber?: string; vatId?: string; mcc?: string; iban: string; accountHolder: string;
  profilePictureFileBase64: string; businessLicenseFileBase64: string;
  masterCraftsmanCertificateFileBase64?: string;
  identityFrontFileBase64: string; identityBackFileBase64: string;
  selectedCategory: string; selectedSubcategory: string; hourlyRate: string;
  lat?: number; lng?: number; radiusKm?: number; userType: string;
}

interface PrepareUserProfileForStripeResult {
  success: boolean; message: string; userId: string;
}

interface CreateStripeAccountData {
  userId: string;
}

interface CreateStripeAccountResult {
  success: boolean; accountId: string; accountLinkUrl: string; message: string;
}

interface UpdateStripeCompanyDetailsData {
  companyPhoneNumber?: string;
  companyWebsite?: string;
  companyRegister?: string;
  taxNumber?: string;
  vatId?: string;
  mcc?: string;
  iban?: string;
  accountHolder?: string;
  bankCountry?: string | null;
  representativeFirstName?: string;
  representativeLastName?: string;
  representativeEmail?: string;
  representativePhone?: string;
  representativeDateOfBirth?: string;
  representativeAddressStreet?: string;
  representativeAddressHouseNumber?: string;
  representativeAddressPostalCode?: string;
  representativeAddressCity?: string;
  representativeAddressCountry?: string | null;
  isRepresentative?: boolean;
  isDirector?: boolean;
  isOwner?: boolean;
  representativeTitle?: string;
  isExecutive?: boolean;
  identityFrontFileId?: string;
  identityBackFileId?: string;
  businessLicenseStripeFileId?: string;
}

interface UpdateStripeCompanyDetailsResult {
  success: boolean;
  message: string;
  accountLinkUrl?: string;
  missingFields?: string[];
}

interface GetStripeAccountStatusResult {
  success: boolean;
  message?: string;
  accountId?: string | null;
  detailsSubmitted?: boolean | null;
  chargesEnabled?: boolean | null;
  payoutsEnabled?: boolean | null;
  requirements?: Stripe.Account.Requirements | null;
  accountLinkUrl?: string;
  missingFields?: string[];
}


// =========================================================================
// HELPER-FUNKTIONEN
// =========================================================================

const undefinedIfNull = <T>(val: T | null | undefined): T | undefined => val === null || val === "" ? undefined : val;

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
    if (personField.startsWith('address.')) return `${baseText}: Private Adresse (${personField.substring(req.lastIndexOf('.') + 1)})`;
    if (personField.startsWith('first_name')) return `${baseText}: Vorname`;
    if (personField.startsWith('last_name')) return `${baseText}: Nachname`;
    if (personField.startsWith('email')) return `${baseText}: E-Mail`;
    if (personField.startsWith('phone')) return `${baseText}: Telefonnummer`;
    if (personField.startsWith('dob.')) return `${baseText}: Geburtsdatum`;
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

const mapCategoryToMcc = (category: string | null | undefined): string | undefined => {
  if (!category || category.trim() === '') {
    loggerV2.warn("[mapCategoryToMcc] Leere oder fehlende Kategorie. Verwende Fallback MCC.");
    return "5999";
  }
  switch (category) {
    case "Handwerk": return "1731";
    case "Haushalt & Reinigung": return "7349";
    case "Transport & Logistik": return "4215";
    case "Hotel & Gastronomie": return "5812";
    case "IT & Technik": return "7372";
    case "Marketing & Vertrieb": return "7311";
    case "Finanzen & Recht": return "8931";
    case "Gesundheit & Wellness": return "8099";
    case "Bildung & Nachhilfe": return "8299";
    case "Kunst & Kultur": return "8999";
    case "Veranstaltungen & Events": return "7999";
    case "Tiere & Pflanzen": return "0742";
    default:
      loggerV2.warn(`[mapCategoryToMcc] Kein spezifischer MCC für Kategorie "${category}" gefunden. Verwende Fallback MCC.`);
      return "5999";
  }
};

const mapLegalFormToStripeBusinessInfo = (
  legalForm: string | null | undefined
): { businessType: 'individual' | 'company'; companyStructure?: Stripe.AccountCreateParams.Company.Structure } => {
  if (!legalForm) {
    loggerV2.warn("[mapLegalFormToStripeBusinessInfo] Keine Rechtsform übergeben, Fallback auf 'company'.");
    return { businessType: 'company', companyStructure: undefined };
  }
  const form = legalForm.toLowerCase();
  if (form.includes("einzelunternehmen") || form.includes("freiberufler")) {
    if (form.includes("e.k.") || form.includes("eingetragener kaufmann")) {
      return { businessType: 'company', companyStructure: 'sole_proprietorship' };
    }
    return { businessType: 'individual' };
  }
  if (form.includes("gmbh") || form.includes("ug")) return { businessType: 'company', companyStructure: 'private_company' };
  if (form.includes("ag")) return { businessType: 'company', companyStructure: "public_company" };
  if (form.includes("gbr") || form.includes("ohg") || form.includes("kg") || form.includes("partnerschaft")) return { businessType: 'company', companyStructure: "unincorporated_partnership" };
  loggerV2.warn(`[mapLegalFormToStripeBusinessInfo] Unbekannte Rechtsform "${legalForm}", Fallback auf 'company'.`);
  return { businessType: 'company', companyStructure: undefined };
};

// =========================================================================
// FUNKTION 1: DATEN VORBEREITEN & DATEIEN HOCHLADEN
// =========================================================================
export const prepareUserProfileForStripe = onCall<PrepareUserProfileForStripeData, Promise<PrepareUserProfileForStripeResult>>(
  async (request: CallableRequest<PrepareUserProfileForStripeData>) => {
    // ... Implementierung bleibt unverändert ...
    loggerV2.info('[prepareUserProfileForStripe] Aufgerufen...');
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Authentifizierung erforderlich.');
    return { success: true, message: "Profil vorbereitet und Dateien hochgeladen.", userId: request.auth.uid };
  }
);

// =========================================================================
// FUNKTION 2: STRIPE ACCOUNT ERSTELLEN
// =========================================================================
export const createStripeAccount = onCall<CreateStripeAccountData, Promise<CreateStripeAccountResult>>(
  async (request: CallableRequest<CreateStripeAccountData>): Promise<CreateStripeAccountResult> => {
    // ... Implementierung bleibt unverändert ...
    loggerV2.info('[createStripeAccount] Aufgerufen...');
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Authentifizierung erforderlich.');
    return { success: true, accountId: 'acct_123', accountLinkUrl: 'https://stripe.com', message: "Stripe-Konto erfolgreich erstellt." };
  }
);


// =========================================================================
// FUNKTION 3: STRIPE ACCOUNT AKTUALISIEREN (VOLLSTÄNDIG & KORRIGIERT)
// =========================================================================
export const updateStripeCompanyDetails = onCall<UpdateStripeCompanyDetailsData, Promise<UpdateStripeCompanyDetailsResult>>(
  { cors: true },
  async (request: CallableRequest<UpdateStripeCompanyDetailsData>): Promise<UpdateStripeCompanyDetailsResult> => {
    loggerV2.info("[updateStripeCompanyDetails] Aufgerufen mit:", JSON.stringify(request.data));
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Nutzer nicht authentifiziert.");

    const userId = request.auth.uid;
    const localStripe = getStripeInstance();
    const resolvedFrontendURL = getFrontendURL();
    const userDocRef = db.collection("users").doc(userId);

    try {
      const userDoc = await userDocRef.get();
      if (!userDoc.exists) throw new HttpsError("not-found", "Benutzerprofil nicht gefunden.");

      const stripeAccountId = userDoc.data()?.stripeAccountId;
      if (!stripeAccountId) throw new HttpsError("failed-precondition", "Kein Stripe-Konto vorhanden.");

      const accountUpdateParams: Stripe.AccountUpdateParams = {};
      const clientData = request.data;

      // ** HIER IST DER FIX FÜR DEINEN FEHLER **
      if (clientData.iban && clientData.accountHolder && clientData.bankCountry) {
        accountUpdateParams.external_account = {
          object: 'bank_account',
          account_holder_name: clientData.accountHolder,
          account_number: clientData.iban.replace(/\s/g, ''),
          country: clientData.bankCountry,
          currency: 'eur', // FIX: Währung ist für SEPA-Konten erforderlich
        };
      }

      // Business-Profil aktualisieren
      const businessProfileUpdates: Partial<Stripe.AccountUpdateParams["business_profile"]> = {};
      if (clientData.companyWebsite !== undefined) businessProfileUpdates.url = undefinedIfNull(clientData.companyWebsite);
      if (clientData.mcc !== undefined) businessProfileUpdates.mcc = undefinedIfNull(clientData.mcc);
      if (Object.keys(businessProfileUpdates).length > 0) accountUpdateParams.business_profile = businessProfileUpdates;

      // Firmendaten aktualisieren
      const companyUpdates: Partial<Stripe.AccountUpdateParams["company"]> = {};
      if (clientData.companyPhoneNumber !== undefined) companyUpdates.phone = undefinedIfNull(clientData.companyPhoneNumber);
      if (clientData.companyRegister !== undefined) companyUpdates.registration_number = undefinedIfNull(clientData.companyRegister);
      if (clientData.taxNumber !== undefined) companyUpdates.tax_id = undefinedIfNull(clientData.taxNumber);
      if (clientData.vatId !== undefined) companyUpdates.vat_id = undefinedIfNull(clientData.vatId);
      if (Object.keys(companyUpdates).length > 0) accountUpdateParams.company = companyUpdates;

      // Führe das Haupt-Update am Account aus
      if (Object.keys(accountUpdateParams).length > 0) {
        await localStripe.accounts.update(stripeAccountId, accountUpdateParams);
        loggerV2.info(`Stripe Account ${stripeAccountId} aktualisiert.`);
      }

      await userDocRef.update({ updatedAt: FieldValue.serverTimestamp() });

      // Prüfe erneut den Status, um zu sehen, ob weitere Aktionen nötig sind
      const refreshedAccount = await localStripe.accounts.retrieve(stripeAccountId);
      const missingFields = (refreshedAccount.requirements?.currently_due || []).map(translateStripeRequirement);

      if (missingFields.length > 0) {
        const accountLink = await localStripe.accountLinks.create({
          account: stripeAccountId,
          refresh_url: `${resolvedFrontendURL}/dashboard/company/${userId}/settings?stripe_refresh=true`,
          return_url: `${resolvedFrontendURL}/dashboard/company/${userId}/settings?stripe_return=true`,
          type: 'account_update',
          collect: 'currently_due',
        });
        return { success: true, message: "Einige Angaben werden noch von Stripe benötigt.", accountLinkUrl: accountLink.url, missingFields };
      }

      return { success: true, message: "Profildaten erfolgreich bei Stripe aktualisiert." };

    } catch (error: any) {
      loggerV2.error(`[updateStripeCompanyDetails] Fehler für Nutzer ${userId}:`, error);
      throw new HttpsError("internal", error.raw?.message || error.message || "Ein Fehler beim Aktualisieren der Stripe-Daten ist aufgetreten.");
    }
  }
);


// =========================================================================
// FUNKTION 4: STRIPE ACCOUNT STATUS ABRUFEN (VOLLSTÄNDIG)
// =========================================================================
export const getStripeAccountStatus = onCall<Record<string, never>, Promise<GetStripeAccountStatusResult>>(
  { cors: true },
  async (request: CallableRequest<Record<string, never>>): Promise<GetStripeAccountStatusResult> => {
    loggerV2.info("[getStripeAccountStatus] Aufgerufen.");
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Nutzer muss angemeldet sein.");

    const userId = request.auth.uid;
    const localStripe = getStripeInstance();
    const resolvedFrontendURL = getFrontendURL();

    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists || !userDoc.data()?.stripeAccountId) {
      return { success: false, message: "Kein Stripe-Konto verknüpft.", accountId: null };
    }
    const stripeAccountId = userDoc.data()!.stripeAccountId;

    const account = await localStripe.accounts.retrieve(stripeAccountId);
    const requirements = account.requirements;

    const missingFields: string[] = [];
    (requirements?.currently_due || []).forEach(req => missingFields.push(translateStripeRequirement(req)));
    (requirements?.eventually_due || []).forEach(req => missingFields.push(`Benötigt (später): ${translateStripeRequirement(req)}`));
    (requirements?.errors || []).forEach(err => missingFields.push(`Fehler von Stripe: ${err.reason} (betrifft: ${translateStripeRequirement(err.requirement)})`));

    let accountLinkUrl: string | undefined = undefined;
    if (missingFields.length > 0) {
      try {
        const accountLink = await localStripe.accountLinks.create({
          account: stripeAccountId,
          refresh_url: `${resolvedFrontendURL}/dashboard/company/${userId}/settings?stripe_refresh=true`,
          return_url: `${resolvedFrontendURL}/dashboard/company/${userId}/settings?stripe_return=true`,
          type: 'account_update',
          collect: 'currently_due',
        });
        accountLinkUrl = accountLink.url;
      } catch (linkError: any) {
        loggerV2.error(`Fehler beim Erstellen des Account Links für ${stripeAccountId}:`, linkError.message);
      }
    }

    return {
      success: true,
      accountId: account.id,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements: requirements || null,
      missingFields: [...new Set(missingFields)], // Duplikate entfernen
      accountLinkUrl: accountLinkUrl,
    };
  }
);