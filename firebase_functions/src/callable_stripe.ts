// /Users/andystaudinger/Tilvo/functions/src/callable_stripe.ts

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';

import { logger as loggerV2 } from 'firebase-functions/v2';
import Stripe from 'stripe';
import { db, getStripeInstance, getSendGridClient, getFrontendURL } from './helpers';
import { FieldValue } from 'firebase-admin/firestore';
import { type MailDataRequired } from '@sendgrid/mail';

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

  identityFrontFileId?: string; identityBackFileId?: string;
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
  profilePictureFileId?: string; businessLicenseFileId?: string;
  masterCraftsmanCertificateFileId?: string;
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
    if (personField.startsWith('address.')) return `${baseText}: Private Adresse (${personField.substring(req.lastIndexOf('.') + 1)})`;
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

export const createStripeAccountIfComplete = onCall<CreateStripeAccountCallableData, Promise<CreateStripeAccountCallableResult>>(
  async (request: CallableRequest<CreateStripeAccountCallableData>): Promise<CreateStripeAccountCallableResult> => {
    loggerV2.info('[createStripeAccountIfComplete] Aufgerufen mit Payload:', JSON.stringify(request.data));
    loggerV2.debug('[createStripeAccountIfComplete] DEBUG: Starte getStripeInstance()...');
    const localStripe = getStripeInstance();
    loggerV2.debug('[createStripeAccountIfComplete] DEBUG: getStripeInstance() erfolgreich.');
    const { userId, clientIp, ...payloadFromClient } = request.data as CreateStripeAccountCallableData;
    const resolvedFrontendURL = getFrontendURL();
    loggerV2.debug(`[createStripeAccountIfComplete] DEBUG: userId: ${userId}, clientIp: ${clientIp}`);

    if (!userId || !clientIp || clientIp.length < 7) {
      loggerV2.error('[createStripeAccountIfComplete] FEHLER: Nutzer-ID oder IP fehlt/ungültig.');
      throw new HttpsError("invalid-argument", "Nutzer-ID und gültige IP sind erforderlich.");
    }

    loggerV2.debug(`[createStripeAccountIfComplete] DEBUG: Rufe Nutzerdokument ${userId} ab.`);
    const userDocRef = db.collection("users").doc(userId);
    const userDocSnapshot = await userDocRef.get();
    if (!userDocSnapshot.exists) {
      loggerV2.error(`[createStripeAccountIfComplete] FEHLER: Nutzerdokument ${userId} nicht gefunden.`);
      throw new HttpsError("not-found", `Nutzerdokument ${userId} nicht gefunden.`);
    }
    const existingFirestoreUserData = userDocSnapshot.data() as any;
    if (!existingFirestoreUserData) {
      loggerV2.error('[createStripeAccountIfComplete] FEHLER: Nutzerdaten aus Firestore sind leer.');
      throw new HttpsError("internal", "Fehler beim Lesen der Nutzerdaten aus Firestore.");
    }
    loggerV2.debug('[createStripeAccountIfComplete] DEBUG: Nutzerdaten erfolgreich geladen.');

    if (existingFirestoreUserData.stripeAccountId?.startsWith('acct_')) {
      loggerV2.info(`[createStripeAccountIfComplete] Konto ${existingFirestoreUserData.stripeAccountId} existiert. Statusprüfung...`);
      try {
        const existingAccount = await localStripe.accounts.retrieve(existingFirestoreUserData.stripeAccountId);
        loggerV2.debug(`[createStripeAccountIfComplete] DEBUG: Bestehendes Stripe-Konto abgerufen: ${existingAccount.id}`);
        const allMissingFields: string[] = [];
        (existingAccount.requirements?.currently_due || []).forEach((req: string) => allMissingFields.push(translateStripeRequirement(req)));
        (existingAccount.requirements?.eventually_due || []).forEach((req: string) => allMissingFields.push(translateStripeRequirement(req)));
        if (!existingAccount.details_submitted && allMissingFields.length === 0 && (existingAccount.requirements?.currently_due?.length === 0)) {
          allMissingFields.push("Allgemeine Kontoinformationen vervollständigen");
        }
        const uniqueMissingFields = [...new Set(allMissingFields)];
        if (uniqueMissingFields.length === 0 && existingAccount.details_submitted && existingAccount.charges_enabled && existingAccount.payouts_enabled) {
          loggerV2.info('[createStripeAccountIfComplete] Konto existiert und ist aktiv.');
          return { success: true, accountId: existingAccount.id, message: "Konto existiert und ist aktiv.", missingFields: [] };
        } else if (uniqueMissingFields.length > 0) {
          loggerV2.info('[createStripeAccountIfComplete] Konto existiert, aber einige Informationen fehlen noch.');
          return { success: true, accountId: existingAccount.id, message: "Konto existiert, aber einige Informationen fehlen noch.", missingFields: uniqueMissingFields, accountLinkUrl: undefined };
        } else {
          loggerV2.warn(`[createStripeAccountIfComplete] Konto ${existingAccount.id} existiert, ist aber nicht voll aktiv und keine spezifischen Felder sind ausstehend.`);
          const accountLink = await localStripe.accountLinks.create({
            account: existingAccount.id,
            refresh_url: `${resolvedFrontendURL}/dashboard/company/${userId}/settings?stripe_refresh=true`,
            return_url: `${resolvedFrontendURL}/dashboard/company/${userId}/settings?stripe_return=true`,
            type: "account_onboarding", collect: "eventually_due",
          });
          loggerV2.debug(`[createStripeAccountIfComplete] DEBUG: AccountLink für bestehendes Konto erstellt: ${accountLink.url}`);
          return { success: false, accountId: existingAccount.id, message: "Konto existiert, Einrichtung unvollständig. Bitte bei Stripe vervollständigen.", accountLinkUrl: accountLink.url, missingFields: uniqueMissingFields.length > 0 ? uniqueMissingFields : ["Bitte bei Stripe vervollständigen"] };
        }
      } catch (e: any) {
        loggerV2.error(`[createStripeAccountIfComplete] FEHLER beim Abrufen eines bestehenden Stripe-Kontos ${existingFirestoreUserData.stripeAccountId}:`, e);
        // Fallback, wenn ein bestehendes Konto nicht abgerufen werden kann (z.B. gelöscht in Stripe)
        if (e.code === 'account_invalid') { // Beispiel für spezifischen Stripe-Fehlercode
          loggerV2.warn(`[createStripeAccountIfComplete] Bestehendes Stripe-Konto ${existingFirestoreUserData.stripeAccountId} ist ungültig. Versuche, es zu löschen und ein neues zu erstellen.`);
          await userDocRef.update({ stripeAccountId: FieldValue.delete(), stripeAccountError: "Ungültiges Stripe-Konto." });
          // Fortfahren mit der Kontoerstellung am Ende der Funktion
        } else {
          throw new HttpsError("internal", `Fehler beim Abrufen bestehenden Stripe-Kontos: ${e.message}`, e.raw || e);
        }
      }
    }
    loggerV2.debug('[createStripeAccountIfComplete] DEBUG: Prüfe user_type.');
    if (existingFirestoreUserData.user_type !== "firma") {
      loggerV2.error('[createStripeAccountIfComplete] FEHLER: Nutzer ist keine Firma.');
      return { success: false, message: "Nutzer ist keine Firma.", missingFields: ["Nutzer ist keine Firma"] };
    }
    loggerV2.debug('[createStripeAccountIfComplete] DEBUG: user_type ist Firma. Starte Validierungen der Payload-Daten.');

    const userAgent = existingFirestoreUserData.common?.tosAcceptanceUserAgent || request.rawRequest?.headers["user-agent"] || "UserAgentNotProvided";
    const { businessType, companyStructure } = mapLegalFormToStripeBusinessInfo(payloadFromClient.legalForm);
    loggerV2.debug(`[createStripeAccountIfComplete] DEBUG: businessType: ${businessType}, companyStructure: ${companyStructure}`);

    // --- Start Validierungen ---
    if (!payloadFromClient.legalForm?.trim()) throw new HttpsError("failed-precondition", "Rechtsform ist eine Pflichtangabe.");
    if (!payloadFromClient.email?.trim()) throw new HttpsError("failed-precondition", "E-Mail ist erforderlich.");
    if (!payloadFromClient.firstName?.trim()) throw new HttpsError("failed-precondition", "Vorname ist erforderlich.");
    if (!payloadFromClient.lastName?.trim()) throw new HttpsError("failed-precondition", "Nachname ist erforderlich.");
    if (!payloadFromClient.iban?.trim()) throw new HttpsError("failed-precondition", "IBAN ist erforderlich.");
    if (!payloadFromClient.accountHolder?.trim()) throw new HttpsError("failed-precondition", "Kontoinhaber ist erforderlich.");
    if (!payloadFromClient.mcc?.trim()) throw new HttpsError("failed-precondition", "MCC (Branchencode) ist erforderlich.");
    if (!payloadFromClient.identityFrontFileId || !payloadFromClient.identityBackFileId) throw new HttpsError("failed-precondition", "Ausweisdokumente (Vorder- und Rückseite) sind erforderlich.");
    if (!payloadFromClient.profilePictureFileId) throw new HttpsError("failed-precondition", "Profilbild ist erforderlich.");

    if (!payloadFromClient.dateOfBirth) {
      throw new HttpsError("failed-precondition", "Geburtsdatum des Ansprechpartners/Inhabers ist erforderlich.");
    }
    const [yearDob, monthDob, dayDob] = payloadFromClient.dateOfBirth.split('-').map(Number);
    const dobDate = new Date(Date.UTC(yearDob, monthDob - 1, dayDob));
    if (!(dobDate.getUTCFullYear() === yearDob && dobDate.getUTCMonth() === monthDob - 1 && dobDate.getUTCDate() === dayDob && yearDob > 1900 && yearDob < (new Date().getFullYear() - 17))) {
      throw new HttpsError("invalid-argument", "Ungültiges Geburtsdatum oder Person zu jung.");
    }
    loggerV2.debug('[createStripeAccountIfComplete] DEBUG: Grundlegende Felder und DOB validiert.');


    if (businessType === 'company') {
      loggerV2.debug('[createStripeAccountIfComplete] DEBUG: businessType ist "company", starte Unternehmens-Validierungen.');
      if (!payloadFromClient.companyName?.trim()) throw new HttpsError("failed-precondition", "Firmenname ist erforderlich.");
      if (!payloadFromClient.companyAddressLine1?.trim() || !payloadFromClient.companyCity?.trim() || !payloadFromClient.companyPostalCode?.trim() || !payloadFromClient.companyCountry?.trim()) {
        throw new HttpsError("failed-precondition", "Vollständige Firmenadresse ist erforderlich.");
      }
      if (payloadFromClient.companyCountry && payloadFromClient.companyCountry.length !== 2) throw new HttpsError("invalid-argument", "Ländercode Firma muss 2-stellig sein.");
      if (!payloadFromClient.businessLicenseFileId) throw new HttpsError("failed-precondition", "Gewerbeschein ist für Firmen erforderlich.");

      const isCapitalCompany = companyStructure === 'private_company' || companyStructure === 'public_company';
      loggerV2.debug(`[createStripeAccountIfComplete] DEBUG: isCapitalCompany: ${isCapitalCompany}`);

      let hasRequiredTaxId = false;
      if (isCapitalCompany || (companyStructure === 'sole_proprietorship' && payloadFromClient.legalForm?.toLowerCase().includes("e.k."))) {
        if (payloadFromClient.companyRegister?.trim()) hasRequiredTaxId = true;
        else throw new HttpsError("failed-precondition", `Handelsregisternummer erforderlich für ${payloadFromClient.legalForm}.`);

        if (isCapitalCompany && !payloadFromClient.taxNumber?.trim()) {
          loggerV2.warn(`[createStripeAccountIfComplete] WICHTIGER HINWEIS: Für die Rechtsform '${payloadFromClient.legalForm}' (Stripe Typ: ${companyStructure}) wurde keine Unternehmens-Steuernummer (taxNumber) im Payload übermittelt. Stripe wird diese sehr wahrscheinlich als Anforderung stellen, um das Konto vollständig zu aktivieren.`);
        }
      } else if (companyStructure === 'unincorporated_partnership') {
        if (payloadFromClient.taxNumber?.trim() || payloadFromClient.vatId?.trim()) hasRequiredTaxId = true;
        else throw new HttpsError("failed-precondition", `Nationale Steuernummer ODER USt-IdNr. erforderlich für ${payloadFromClient.legalForm}.`);
      } else if (companyStructure === 'sole_proprietorship') {
        if (payloadFromClient.companyRegister?.trim()) {
          hasRequiredTaxId = true;
        } else if (payloadFromClient.taxNumber?.trim() || payloadFromClient.vatId?.trim()) {
          hasRequiredTaxId = true;
        }
        else throw new HttpsError("failed-precondition", `Handelsregisternummer (für e.K.) ODER Nationale Steuernummer/USt-IdNr. für ${payloadFromClient.legalForm} erforderlich.`);
      } else {
        if (payloadFromClient.companyRegister?.trim() || payloadFromClient.taxNumber?.trim() || payloadFromClient.vatId?.trim()) hasRequiredTaxId = true;
        else throw new HttpsError("failed-precondition", `Steuerliche Identifikation erforderlich für ${payloadFromClient.legalForm}.`);
      }
      if (!hasRequiredTaxId) {
        throw new HttpsError("failed-precondition", `Keine gültige primäre steuerliche Identifikation für ${payloadFromClient.legalForm} angegeben.`);
      }
      loggerV2.debug('[createStripeAccountIfComplete] DEBUG: Steuerliche Identifikation validiert.');


      if (!payloadFromClient.personalStreet?.trim() || !payloadFromClient.personalPostalCode?.trim() || !payloadFromClient.personalCity?.trim() || !payloadFromClient.personalCountry?.trim()) {
        throw new HttpsError("failed-precondition", "Vollständige Privatadresse des Geschäftsführers für Firma erforderlich.");
      }
      if (payloadFromClient.personalCountry && payloadFromClient.personalCountry.length !== 2) throw new HttpsError("invalid-argument", "Ländercode (persönlich) muss 2-stellig sein.");
      loggerV2.debug('[createStripeAccountIfComplete] DEBUG: Privatadresse des Geschäftsführers validiert.');

      if (payloadFromClient.isManagingDirectorOwner && isCapitalCompany) {
        if (typeof payloadFromClient.ownershipPercentage !== 'number' ||
          payloadFromClient.ownershipPercentage <= 0 ||
          payloadFromClient.ownershipPercentage > 100) {
          throw new HttpsError("invalid-argument", `Wenn 'isManagingDirectorOwner' für eine Kapitalgesellschaft (${companyStructure}) gesetzt ist, muss ein gültiger 'ownershipPercentage' (Zahl zwischen 1 und 100) angegeben werden. Erhalten: ${payloadFromClient.ownershipPercentage}`);
        }
      } else if (!payloadFromClient.isManagingDirectorOwner && isCapitalCompany) {
        if (!payloadFromClient.actualRepresentativeTitle?.trim()) {
          throw new HttpsError("invalid-argument", "Für den Vertreter einer Kapitalgesellschaft muss ein Titel/Position ('actualRepresentativeTitle') angegeben werden, wenn 'isManagingDirectorOwner' nicht zutrifft.");
        }
        if (payloadFromClient.isActualOwner) {
          if (typeof payloadFromClient.actualOwnershipPercentage !== 'number' ||
            payloadFromClient.actualOwnershipPercentage <= 0 ||
            payloadFromClient.actualOwnershipPercentage > 100) {
            throw new HttpsError("invalid-argument", "Wenn der Vertreter als Eigentümer ('isActualOwner') für eine Kapitalgesellschaft markiert ist, muss ein gültiger 'actualOwnershipPercentage' (1-100) angegeben werden.");
          }
        }
      }
      loggerV2.debug('[createStripeAccountIfComplete] DEBUG: Eigentümer- und Vertreterdaten validiert.');


    } else { // businessType === 'individual'
      loggerV2.debug('[createStripeAccountIfComplete] DEBUG: businessType ist "individual", starte Einzelpersonen-Validierungen.');
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

      if (!payloadFromClient.taxNumber?.trim() && !payloadFromClient.vatId?.trim()) {
        throw new HttpsError("failed-precondition", `Nationale Steuernummer ODER USt-IdNr. für ${payloadFromClient.legalForm} erforderlich.`);
      }
      loggerV2.debug('[createStripeAccountIfComplete] DEBUG: Einzelpersonen-Validierungen abgeschlossen.');
    }
    // --- Ende Validierungen ---

    const platformProfileUrl = `${resolvedFrontendURL}/profil/${userId}`;
    loggerV2.info(`[createStripeAccountIfComplete] Verwende Plattform-Profil-URL für Stripe: ${platformProfileUrl}`);
    loggerV2.debug('[createStripeAccountIfComplete] DEBUG: Erstelle accountParams für Stripe.');

    const undefinedIfNull = <T>(val: T | null | undefined): T | undefined => val === null ? undefined : val;

    const accountParams: Stripe.AccountCreateParams = {
      type: "custom",
      country: businessType === 'company' ? undefinedIfNull(payloadFromClient.companyCountry)! : undefinedIfNull(payloadFromClient.personalCountry || payloadFromClient.companyCountry)!,
      email: payloadFromClient.email!,
      business_type: businessType,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { internal_user_id: userId, created_by_callable: "true", legal_form_provided: undefinedIfNull(payloadFromClient.legalForm) || 'N/A' },
      tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: clientIp, user_agent: userAgent },
      business_profile: {
        mcc: payloadFromClient.mcc!,
        url: platformProfileUrl,
      },
    };

    if (businessType === 'company') {
      accountParams.company = {
        name: payloadFromClient.companyName!,
        address: {
          line1: payloadFromClient.companyAddressLine1!,
          city: payloadFromClient.companyCity!,
          postal_code: payloadFromClient.companyPostalCode!,
          country: undefinedIfNull(payloadFromClient.companyCountry)!,
        },
        phone: undefinedIfNull(payloadFromClient.companyPhoneNumber || payloadFromClient.phoneNumber),
        registration_number: undefinedIfNull(payloadFromClient.companyRegister),
        tax_id: undefinedIfNull(payloadFromClient.taxNumber),
        vat_id: undefinedIfNull(payloadFromClient.vatId),
        structure: companyStructure,
      };
      if (payloadFromClient.businessLicenseFileId && accountParams.company) {
        if (!accountParams.company.verification) accountParams.company.verification = { document: {} };
        accountParams.company.verification.document = { front: payloadFromClient.businessLicenseFileId };
      }
    } else {
      const personalStreet = undefinedIfNull(payloadFromClient.personalStreet?.trim() || payloadFromClient.companyAddressLine1?.trim());
      const personalHouse = undefinedIfNull(payloadFromClient.personalHouseNumber?.trim());
      accountParams.individual = {
        first_name: payloadFromClient.firstName,
        last_name: payloadFromClient.lastName,
        email: payloadFromClient.email,
        phone: undefinedIfNull(payloadFromClient.phoneNumber),
        dob: { day: dayDob, month: monthDob, year: yearDob },
        address: {
          line1: personalStreet ? `${personalStreet} ${personalHouse ?? ''}`.trim() : undefinedIfNull(payloadFromClient.companyAddressLine1)!,
          postal_code: undefinedIfNull(payloadFromClient.personalPostalCode || payloadFromClient.companyPostalCode)!,
          city: undefinedIfNull(payloadFromClient.personalCity || payloadFromClient.companyCity)!,
          country: undefinedIfNull(payloadFromClient.personalCountry || payloadFromClient.companyCountry)!,
        },
        verification: {
          document: {
            front: payloadFromClient.identityFrontFileId,
            back: payloadFromClient.identityBackFileId,
          }
        }
      };
    }
    loggerV2.debug('[createStripeAccountIfComplete] DEBUG: Account-Parameter für Stripe vorbereitet.');

    if (payloadFromClient.iban && payloadFromClient.accountHolder) {
      accountParams.external_account = {
        object: "bank_account",
        country: businessType === 'company' ? undefinedIfNull(payloadFromClient.companyCountry)! : undefinedIfNull(payloadFromClient.personalCountry || payloadFromClient.companyCountry)!,
        currency: "eur",
        account_number: (payloadFromClient.iban).replace(/\s/g, ""),
        account_holder_name: payloadFromClient.accountHolder,
      };
      loggerV2.debug('[createStripeAccountIfComplete] DEBUG: Externe Bankverbindung hinzugefügt.');
    } else {
      loggerV2.warn('[createStripeAccountIfComplete] WARN: IBAN oder Kontoinhaber fehlen, keine externe Bankverbindung für Stripe.');
    }


    if (payloadFromClient.profilePictureFileId) {
      accountParams.settings = { ...accountParams.settings, branding: { icon: payloadFromClient.profilePictureFileId } };
      loggerV2.debug('[createStripeAccountIfComplete] DEBUG: Profilbild für Stripe Branding hinzugefügt.');
    }

    let account: Stripe.Account;
    loggerV2.debug('[createStripeAccountIfComplete] DEBUG: Versuche, Stripe-Konto zu erstellen...');
    try {
      account = await localStripe.accounts.create(accountParams);
      loggerV2.info(`[createStripeAccountIfComplete] Stripe Account ${account.id} initial für ${userId} erstellt (Typ: ${businessType}).`);
    } catch (initialAccountError: any) {
      loggerV2.error(`[createStripeAccountIfComplete] Stripe API Fehler (Initial Account) für ${userId}:`, { message: initialAccountError.message, type: initialAccountError.type, code: initialAccountError.code, param: initialAccountError.param, raw: initialAccountError.raw });
      throw new HttpsError("internal", initialAccountError.raw?.message || initialAccountError.message || "Fehler bei initialer Kontoerstellung durch Stripe.", {
        type: initialAccountError.type, code: initialAccountError.code, param: initialAccountError.param
      });
    }
    loggerV2.debug('[createStripeAccountIfComplete] DEBUG: Stripe-Konto-Erstellung abgeschlossen. Prüfe businessType für Personenerstellung.');

    if (businessType === 'company') {
      loggerV2.debug('[createStripeAccountIfComplete] DEBUG: businessType ist "company", starte Personenerstellung/Update.');
      const personRelationship: Stripe.AccountCreatePersonParams['relationship'] = {
        representative: true,
      };

      const isCapitalCompanyForRelationship = companyStructure === 'private_company' || companyStructure === 'public_company';
      loggerV2.debug(`[createStripeAccountIfComplete] DEBUG: isCapitalCompanyForRelationship: ${isCapitalCompanyForRelationship}`);


      if (payloadFromClient.isManagingDirectorOwner) {
        personRelationship.owner = true;
        personRelationship.director = true;
        personRelationship.executive = true;
        personRelationship.title = "Geschäftsführender Gesellschafter";
        if (typeof payloadFromClient.ownershipPercentage === 'number') {
          personRelationship.percent_ownership = payloadFromClient.ownershipPercentage;
        } else if (isCapitalCompanyForRelationship) {
          loggerV2.error(`[createStripeAccountIfComplete] Kritischer Fehler: ownershipPercentage fehlt für 'isManagingDirectorOwner=true' bei Kapitalgesellschaft. Account ${account.id} wird gelöscht.`);
          await localStripe.accounts.del(account.id).catch((delErr: any) => loggerV2.error(`Fehler beim Löschen von Account ${account.id}:`, delErr));
          throw new HttpsError("internal", "Interner Fehler bei der Verarbeitung der Eigentümerdaten (Validierungslücke).");
        }
      } else {
        personRelationship.director = payloadFromClient.isActualDirector ?? undefined;
        personRelationship.owner = payloadFromClient.isActualOwner ?? undefined;
        personRelationship.executive = payloadFromClient.isActualExecutive ?? undefined;
        personRelationship.title = payloadFromClient.actualRepresentativeTitle?.trim() || "Gesetzlicher Vertreter";

        if (personRelationship.owner && typeof payloadFromClient.actualOwnershipPercentage === 'number') {
          personRelationship.percent_ownership = payloadFromClient.actualOwnershipPercentage;
        } else if (personRelationship.owner && isCapitalCompanyForRelationship) {
          loggerV2.error(`[createStripeAccountIfComplete] Kritischer Fehler: actualOwnershipPercentage fehlt/ist ungültig für 'isActualOwner=true' bei Kapitalgesellschaft (wenn isManagingDirectorOwner=false). Account ${account.id} wird gelöscht.`);
          await localStripe.accounts.del(account.id).catch((delErr: any) => loggerV2.error(`Fehler beim Löschen von Account ${account.id}:`, delErr));
          throw new HttpsError("internal", "Interner Fehler bei der Verarbeitung der granularen Eigentümerdaten (Validierungslücke).");
        }
      }
      loggerV2.debug('[createStripeAccountIfComplete] DEBUG: Personen-Beziehung vorbereitet.');

      const personalStreet = undefinedIfNull(payloadFromClient.personalStreet);
      const personalHouseNumber = undefinedIfNull(payloadFromClient.personalHouseNumber);
      const personalPostalCode = undefinedIfNull(payloadFromClient.personalPostalCode);
      const personalCity = undefinedIfNull(payloadFromClient.personalCity);
      const personalCountry = undefinedIfNull(payloadFromClient.personalCountry);

      const personPayload: Stripe.AccountCreatePersonParams = {
        first_name: payloadFromClient.firstName!,
        last_name: payloadFromClient.lastName!,
        email: payloadFromClient.email!,
        phone: undefinedIfNull(payloadFromClient.phoneNumber),
        relationship: personRelationship,
        verification: {
          document: {
            front: payloadFromClient.identityFrontFileId!,
            back: payloadFromClient.identityBackFileId!,
          }
        },
        dob: { day: dayDob, month: monthDob, year: yearDob },
        address: {
          line1: personalStreet ? `${personalStreet} ${personalHouseNumber ?? ''}`.trim() : payloadFromClient.personalStreet!, // Fallback auf payloadClient.personalStreet!
          postal_code: personalPostalCode!,
          city: personalCity!,
          country: personalCountry!,
        },
      };
      loggerV2.debug('[createStripeAccountIfComplete] DEBUG: Person-Payload für Stripe vorbereitet.');

      try {
        const person = await localStripe.accounts.createPerson(account.id, personPayload);
        loggerV2.info(`[createStripeAccountIfComplete] Person ${person.id} (Repräsentant) für Account ${account.id} erstellt.`);
        await userDocRef.update({ stripeRepresentativePersonId: person.id });
        loggerV2.debug('[createStripeAccountIfComplete] DEBUG: Person erfolgreich erstellt und im Firestore aktualisiert.');
      } catch (personError: any) {
        loggerV2.error(`[createStripeAccountIfComplete] FEHLER beim Erstellen der Person für Account ${account.id}:`, { message: personError.message, type: personError.type, code: personError.code, param: personError.param, raw: personError.raw });
        loggerV2.info(`[createStripeAccountIfComplete] Versuche Account ${account.id} zu löschen aufgrund eines Fehlers bei der Personenerstellung.`);
        try {
          await localStripe.accounts.del(account.id);
          loggerV2.info(`[createStripeAccountIfComplete] Account ${account.id} nach fehlgeschlagener Personenerstellung erfolgreich gelöscht.`);
        } catch (deleteError: any) {
          loggerV2.error(`[createStripeAccountIfComplete] FEHLER beim Löschen des Accounts ${account.id} nach Personenerstellungsfehler:`, deleteError);
        }
        throw new HttpsError("internal", `Fehler beim Erstellen der Personendaten bei Stripe: ${personError.raw?.message || personError.message}`);
      }
    }
    loggerV2.debug('[createStripeAccountIfComplete] DEBUG: Stripe-Konto- und Personenerstellung abgeschlossen.');

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
      "step3.profilePictureURL": payloadFromClient.profilePictureFileId || null,
      "step3.businessLicenseURL": payloadFromClient.businessLicenseFileId || null,
      "step3.masterCraftsmanCertificateURL": payloadFromClient.masterCraftsmanCertificateFileId || FieldValue.delete(),
      "step3.identityFrontUrl": payloadFromClient.identityFrontFileId || null,
      "step3.identityBackUrl": payloadFromClient.identityBackFileId || null,
    };
    loggerV2.debug('[createStripeAccountIfComplete] DEBUG: Firestore Update-Daten vorbereitet.');
    await userDocRef.update(firestoreUpdateData);
    loggerV2.debug('[createStripeAccountIfComplete] DEBUG: Firestore Update für Nutzerdokument abgeschlossen.');


    const sendgrid = getSendGridClient();
    if (sendgrid && payloadFromClient.email && payloadFromClient.firstName && (payloadFromClient.companyName || (businessType === 'individual' && payloadFromClient.lastName))) {
      const recipientName = payloadFromClient.firstName;
      const entityName = businessType === 'company' ? payloadFromClient.companyName : `${payloadFromClient.firstName} ${payloadFromClient.lastName}`;
      const emailContent: MailDataRequired = {
        to: payloadFromClient.email,
        from: { email: "support@tilvo.com", name: "Tilvo Team" },
        subject: `Dein Tilvo Konto wurde bei Stripe angelegt`,
        text: `Hallo ${recipientName},\n\nDein Stripe-Konto (${account.id}) für "${entityName}" wurde initial bei Stripe angelegt. Bitte vervollständige alle notwendigen Angaben in deinem Tilvo Dashboard, um dein Konto zu aktivieren.\n\nViel Erfolg,\nDein Tilvo-Team`,
        html: `<p>Hallo ${recipientName},</p><p>Dein Stripe-Konto (<code>${account.id}</code>) für "<strong>${entityName}</strong>" wurde initial bei Stripe angelegt. Bitte vervollständige alle notwendigen Angaben in deinem Tilvo Dashboard, um dein Konto zu aktivieren.</p><p>Viel Erfolg!</p><p>Dein Tilvo-Team</p>`,
      };
      try {
        loggerV2.debug('[createStripeAccountIfComplete] DEBUG: Versuche, SendGrid-E-Mail zu senden.');
        await sendgrid.send(emailContent);
        loggerV2.info(`Bestätigungs-E-Mail an ${payloadFromClient.email} gesendet.`);
      }
      catch (e: any) {
        loggerV2.error("Mail Senden (Firma):", e.response?.body || e.message, e);
      }
    } else {
      loggerV2.warn("[createStripeAccountIfComplete] Nicht alle Daten für E-Mail-Versand vorhanden oder SendGrid-Client nicht verfügbar.");
    }

    loggerV2.debug('[createStripeAccountIfComplete] DEBUG: Rufe finalen Stripe Account Status ab.');
    const finalAccountData = await localStripe.accounts.retrieve(account.id);
    loggerV2.info("Finaler Stripe Account Status nach allen Operationen:", {
      accountId: finalAccountData.id,
      details_submitted: finalAccountData.details_submitted,
      charges_enabled: finalAccountData.charges_enabled,
      payouts_enabled: finalAccountData.payouts_enabled,
      requirements: JSON.stringify(finalAccountData.requirements, null, 2)
    });

    const finalMissingFields: string[] = [];
    (finalAccountData.requirements?.currently_due || []).forEach((req: string) => finalMissingFields.push(translateStripeRequirement(req)));
    (finalAccountData.requirements?.eventually_due || []).forEach((req: string) => finalMissingFields.push(`Benötigt (später): ${translateStripeRequirement(req)}`));
    if (!finalAccountData.details_submitted && finalMissingFields.length === 0 && (finalAccountData.requirements?.currently_due?.length === 0)) {
      finalMissingFields.push("Allgemeine Kontodetails bei Stripe vervollständigen");
    }
    if (finalAccountData.requirements?.errors && finalAccountData.requirements.errors.length > 0) {
      finalAccountData.requirements.errors.forEach((err: Stripe.Account.Requirements.Error) => {
        finalMissingFields.push(`Fehler von Stripe: ${err.reason} (betrifft: ${translateStripeRequirement(err.requirement)})`);
      });
    }
    const uniqueFinalMissingFields = [...new Set(finalMissingFields)];

    if (uniqueFinalMissingFields.length > 0) {
      loggerV2.info('[createStripeAccountIfComplete] Konto erstellt, aber mit ausstehenden Anforderungen.');
      return {
        success: true,
        accountId: account.id,
        message: "Stripe-Konto erstellt. Einige Informationen sind noch erforderlich oder werden bald benötigt.",
        missingFields: uniqueFinalMissingFields,
        accountLinkUrl: undefined
      };
    } else {
      loggerV2.info('[createStripeAccountIfComplete] Stripe Konto erfolgreich erstellt und alle Anforderungen erfüllt.');
      return {
        success: true,
        accountId: account.id,
        message: "Stripe Konto erfolgreich erstellt und alle Anforderungen erfüllt.",
        missingFields: [],
        accountLinkUrl: undefined
      };
    }
  }
);

// DEIN ORIGINALCODE FÜR updateStripeCompanyDetails - UNVERÄNDERT
export const updateStripeCompanyDetails = onCall<UpdateStripeCompanyDetailsData, Promise<UpdateStripeCompanyDetailsResult>>(
  async (request: CallableRequest<UpdateStripeCompanyDetailsData>): Promise<UpdateStripeCompanyDetailsResult> => {
    loggerV2.info("[updateStripeCompanyDetails] Aufgerufen mit request.data:", JSON.stringify(request.data));
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Nutzer nicht authentifiziert.");
    const userId = request.auth.uid;
    const localStripe = getStripeInstance();
    const resolvedFrontendURL = getFrontendURL();
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
      } else { // individual
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
        const documentIndividual: Partial<Stripe.AccountUpdateParams.Individual.Verification.Document> = {};
        if (updatePayloadFromClient.identityFrontFileId) documentIndividual.front = updatePayloadFromClient.identityFrontFileId;
        if (updatePayloadFromClient.identityBackFileId) documentIndividual.back = updatePayloadFromClient.identityBackFileId;
        if (Object.keys(documentIndividual).length > 0) verificationIndividual.document = documentIndividual;
        if (Object.keys(verificationIndividual).length > 0) individualUpdates.verification = verificationIndividual;

        if (Object.keys(individualUpdates).length > 0) accountUpdateParams.individual = individualUpdates;
      }

      const businessProfileUpdates: Partial<Stripe.AccountUpdateParams["business_profile"]> = {};
      if (updatePayloadFromClient.companyWebsite !== undefined) {
        businessProfileUpdates.url = updatePayloadFromClient.companyWebsite || "";
      }
      if (updatePayloadFromClient.mcc !== undefined) businessProfileUpdates.mcc = updatePayloadFromClient.mcc || undefined;
      if (Object.keys(businessProfileUpdates).length > 0) accountUpdateParams.business_profile = businessProfileUpdates;

      if (updatePayloadFromClient.iban && updatePayloadFromClient.accountHolder && updatePayloadFromClient.bankCountry) {
        accountUpdateParams.external_account = {
          object: 'bank_account',
          account_holder_name: updatePayloadFromClient.accountHolder,
          account_number: updatePayloadFromClient.iban.replace(/\s/g, ''),
          country: updatePayloadFromClient.bankCountry,
        };
      }

      if (Object.keys(accountUpdateParams).length > 0) {
        await localStripe.accounts.update(stripeAccountId, accountUpdateParams);
        loggerV2.info(`Stripe Account ${stripeAccountId} (Typ: ${currentBusinessType}) aktualisiert.`);
      }

      if (currentBusinessType === 'company') {
        let personIdToUpdate: string | undefined = currentFirestoreUserData.stripeRepresentativePersonId;
        const personDataToUpdate: Partial<Stripe.AccountUpdatePersonParams> = {};
        let isCreatingNewPerson = false;

        if (updatePayloadFromClient.representativeFirstName) personDataToUpdate.first_name = updatePayloadFromClient.representativeFirstName;
        if (updatePayloadFromClient.representativeLastName) personDataToUpdate.last_name = updatePayloadFromClient.representativeLastName;
        if (updatePayloadFromClient.representativeEmail) personDataToUpdate.email = updatePayloadFromClient.representativeEmail;
        if (updatePayloadFromClient.representativePhone) personDataToUpdate.phone = updatePayloadFromClient.representativePhone;

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
          refresh_url: `${resolvedFrontendURL}/dashboard/company/${userId}/settings?stripe_refresh=true`,
          return_url: `${resolvedFrontendURL}/dashboard/company/${userId}/settings?stripe_return=true`,
          type: 'account_update',
          collect: 'currently_due',
        });
        accountLinkUrlResponse = accLink.url;
        return { success: true, message: "Profildetails aktualisiert, aber einige Angaben werden noch von Stripe benötigt oder es gibt Fehler.", accountLinkUrl: accountLinkUrlResponse, missingFields: [...new Set(uniqueFinalMissingFieldsList)] };
      }
      return { success: true, message: "Profildetails erfolgreich bei Stripe aktualisiert.", accountLinkUrl: undefined, missingFields: [] };

    } catch (error: any) {
      loggerV2.error(`[updateStripeCompanyDetails] Fehler für Nutzer ${userId}:`, { message: error.message, type: error.type, code: error.code, param: error.param, raw: error.raw });
      let errMsg = "Interner Fehler beim Aktualisieren der Stripe-Informationen.";
      if (error instanceof HttpsError) errMsg = error.message;
      else if (error.type === "StripeInvalidRequestError" || error.type === "StripeCardError") errMsg = error.message;
      else if (error.message) errMsg = error.message;

      try {
        const userDocForError = db.collection("users").doc(userId);
        await userDocForError.update({ stripeAccountError: errMsg, updatedAt: FieldValue.serverTimestamp() });
        const companyDocRefForError = db.collection("companies").doc(userId);
        if ((await companyDocRefForError.get()).exists) {
          await companyDocRefForError.set({ stripeAccountError: errMsg, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        }
      } catch (dbError: any) {
        loggerV2.error(`DB-Fehler beim Speichern des Stripe-Fehlers für ${userId} im Catch-Block von updateStripeCompanyDetails:`, dbError.message, dbError);
      }

      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", errMsg, error.raw?.code || error.code || error.type);
    }
  }
);

// DEIN ORIGINALCODE FÜR getStripeAccountStatus - UNVERÄNDERT
export const getStripeAccountStatus = onCall<Record<string, never>, Promise<GetStripeAccountStatusResult>>(
  async (request: CallableRequest<Record<string, never>>): Promise<GetStripeAccountStatusResult> => {
    loggerV2.info("[getStripeAccountStatus] Aufgerufen.");
    if (!request.auth?.uid) { throw new HttpsError("unauthenticated", "Nutzer muss angemeldet sein."); }
    const userId = request.auth.uid;
    const localStripe = getStripeInstance();
    const resolvedFrontendURL = getFrontendURL();
    try {
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) throw new HttpsError("not-found", "Nutzerdokument nicht gefunden.");
      const userData = userDoc.data() as any;
      if (userData?.user_type !== "firma") throw new HttpsError("permission-denied", "Nur Firmen können Status abrufen.");

      const stripeAccountId = userData.stripeAccountId as string | undefined;
      if (!stripeAccountId?.startsWith("acct_")) {
        return {
          success: false, message: "Kein Stripe-Konto verknüpft oder ID ungültig.",
          accountId: null, detailsSubmitted: null, chargesEnabled: null,
          payoutsEnabled: null, requirements: null, accountLinkUrl: undefined,
          missingFields: ["Kein Stripe-Konto vorhanden oder verknüpft."]
        };
      }
      const account = await localStripe.accounts.retrieve(stripeAccountId);

      const currentMissingFields: string[] = [];
      (account.requirements?.currently_due || []).forEach((req: string) => currentMissingFields.push(translateStripeRequirement(req)));
      (account.requirements?.eventually_due || []).forEach((req: string) => currentMissingFields.push(`Benötigt (später): ${translateStripeRequirement(req)}`));

      if (!account.details_submitted && currentMissingFields.length === 0 && (account.requirements?.currently_due?.length === 0)) {
        currentMissingFields.push("Allgemeine Kontodetails bei Stripe vervollständigen oder initiale Anforderungen prüfen.");
      }
      if (account.requirements?.errors && account.requirements.errors.length > 0) {
        account.requirements.errors.forEach((err: Stripe.Account.Requirements.Error) => {
          currentMissingFields.push(`Fehler von Stripe: ${err.reason} (betrifft: ${translateStripeRequirement(err.requirement)})`);
        });
      }
      const uniqueMissingFields = [...new Set(currentMissingFields)];

      let accountLinkUrl: string | undefined = undefined;
      const needsStripeUIIntervention = (account.requirements?.errors?.length ?? 0) > 0 ||
        ((account.requirements?.currently_due?.length ?? 0) > 0 && !account.charges_enabled);

      if (needsStripeUIIntervention) {
        try {
          const accLinkParams: Stripe.AccountLinkCreateParams = {
            account: stripeAccountId,
            refresh_url: `${resolvedFrontendURL}/dashboard/company/${userId}/settings?stripe_refresh=true`,
            return_url: `${resolvedFrontendURL}/dashboard/company/${userId}/settings?stripe_return=true`,
            type: "account_update",
            collect: "currently_due",
          };
          const accLink = await localStripe.accountLinks.create(accLinkParams);
          accountLinkUrl = accLink.url;
        } catch (linkError: any) {
          loggerV2.error(`[getStripeAccountStatus] Fehler Account Link für ${stripeAccountId}:`, { message: linkError.message, type: linkError.type });
        }
      }
      return {
        success: true,
        accountId: account.id,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        requirements: account.requirements || null,
        accountLinkUrl: accountLinkUrl,
        missingFields: uniqueMissingFields
      };
    } catch (e: any) {
      loggerV2.error(`Fehler getStripeAccountStatus für ${userId}:`, { message: e.message, code: e.code, type: e.type });
      if (e.code === "resource_missing" && e.param === "account") {
        try { await db.collection("users").doc(userId).update({ stripeAccountId: FieldValue.delete(), stripeAccountError: "Stripe-Konto nicht gefunden." }); }
        catch (dbErr: any) { loggerV2.error("Fehler Löschen ungültige Stripe ID:", dbErr.message, dbErr); }
        return {
          success: false, message: "Zugehöriges Stripe-Konto nicht gefunden.",
          accountId: null,
          detailsSubmitted: null,
          chargesEnabled: null,
          payoutsEnabled: null,
          requirements: null, accountLinkUrl: undefined,
          missingFields: ["Stripe-Konto nicht gefunden."]
        };
      }
      if (e instanceof HttpsError) throw e;
      throw new HttpsError("internal", e.message || "Fehler Abruf Stripe-Status.", e.details);
    }
  }
);