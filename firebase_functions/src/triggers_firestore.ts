// /Users/andystaudinger/Tasko/firebase_functions/src/triggers_firestore.ts

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { logger as loggerV2 } from 'firebase-functions/v2';
import Stripe from 'stripe';
import { getDb, getStripeInstance } from './helpers';
import { FieldValue } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { UNNAMED_COMPANY } from './constants';
import { geohashForLocation } from 'geofire-common';

// Parameter zentral definieren
const STRIPE_SECRET_KEY_TRIGGERS = defineSecret("STRIPE_SECRET_KEY");

// Helper function to clean and normalize company data before writing to Firestore.
const cleanAndNormalizeCompanyData = (data: any): any => {
  const cleanedData = { ...data };
  Object.keys(cleanedData).forEach((key) => {
    if (cleanedData[key] === undefined || cleanedData[key] === "") {
      cleanedData[key] = null;
    }
  });
  if (cleanedData.hourlyRate !== null && isNaN(cleanedData.hourlyRate)) cleanedData.hourlyRate = null;
  if (cleanedData.radiusKm !== null && isNaN(cleanedData.radiusKm)) cleanedData.radiusKm = null;
  if (cleanedData.lat !== null && isNaN(Number(cleanedData.lat))) cleanedData.lat = null;
  if (cleanedData.lng !== null && isNaN(Number(cleanedData.lng))) cleanedData.lng = null;
  return cleanedData;
};

interface FirmaUserData {
  uid: string;
  user_type: "firma";


  companyName?: string;
  companyAddressLine1ForBackend?: string;
  companyCityForBackend?: string;
  companyPostalCodeForBackend?: string;
  companyCountryForBackend?: string;
  companyPhoneNumberForBackend?: string;
  companyWebsiteForBackend?: string;
  companyRegisterForBackend?: string;
  taxNumberForBackend?: string;
  vatIdForBackend?: string;
  selectedCategory?: string;
  selectedSubcategory?: string;
  hourlyRate?: number | string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  profilePictureFirebaseUrl?: string;
  industryMcc?: string;
  description?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  personalStreet?: string;
  personalHouseNumber?: string;
  personalPostalCode?: string;
  personalCity?: string;
  personalCountry?: string | null;
  isManagingDirectorOwner?: boolean;
  iban?: string;
  accountHolder?: string;
  identityFrontUrlStripeId?: string;
  identityBackUrlStripeId?: string;
  masterCraftsmanCertificateStripeId?: string;
  profilePictureStripeFileId?: string;

  common?: {
    registrationCompletedAt?: string;
    tosAcceptanceUserAgent?: string;
    tosAcceptanceIp?: string;
    createdByCallable?: string;
    stripeVerificationStatus?: string;
  };

  step1?: { email?: string; phoneNumber?: string; firstName?: string; lastName?: string; dateOfBirth?: string; personalStreet?: string; personalHouseNumber?: string; personalPostalCode?: string; personalCity?: string; personalCountry?: string; isManagingDirectorOwner?: boolean; };
  step2?: { companyName?: string; postalCode?: string; companyPostalCode?: string; country?: string; city?: string; street?: string; houseNumber?: string; website?: string; industryMcc?: string; };
  step3?: { profilePictureURL?: string; hourlyRate?: string; taxNumber?: string; vatId?: string; companyRegister?: string; identityFrontUrl?: string; identityBackUrl?: string; };
  step4?: { iban?: string; accountHolder?: string; };

  createdAt?: FirebaseFirestore.Timestamp | Date;
  updatedAt?: FirebaseFirestore.Timestamp | Date;
  stripeAccountId?: string;

  // Hinzugefügt, um die Fehler zu beheben. Diese Felder werden vom Stripe-Webhook gesetzt.
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  stripeDetailsSubmitted?: boolean;
}

export const createUserProfile = onDocumentCreated("users/{userId}", async (event) => {
  const snapshot = event.data;
  const userId = event.params.userId;
  if (!snapshot || !snapshot.data) {
    loggerV2.warn(`[createUserProfile] User data for ${userId} is undefined. Skipping.`);
    return null;
  }
  const db = getDb();
  const userData = snapshot.data() as FirmaUserData;
  loggerV2.info(`[createUserProfile Trigger] Verarbeite User ${userId}. Quelldaten (userData):`, JSON.stringify(userData, null, 2));

  if (userData.user_type === "firma") {
    // Helper to find the first non-empty, non-null value from a list of potential sources.
    const pickFirst = <T>(...args: (T | null | undefined)[]) => args.find((v) => v) ?? null;

    const lat = pickFirst(userData.lat);
    const lng = pickFirst(userData.lng);
    let geohash: string | null = null;
    if (typeof lat === 'number' && typeof lng === 'number') {
      geohash = geohashForLocation([lat, lng]);
    }

    const postalCode = pickFirst(userData.companyPostalCodeForBackend, userData.step2?.postalCode, userData.step2?.companyPostalCode);
    const companyName = pickFirst(userData.companyName, userData.step2?.companyName) || UNNAMED_COMPANY;
    const companyCity = pickFirst(userData.companyCityForBackend, userData.step2?.city);
    const hourlyRate = pickFirst(userData.hourlyRate, userData.step3?.hourlyRate);
    const profilePictureURL = pickFirst(userData.profilePictureFirebaseUrl, userData.step3?.profilePictureURL);
    const industryMcc = pickFirst(userData.industryMcc, userData.step2?.industryMcc);

    const companyData: any = {
      uid: userId,
      user_type: "firma",
      companyName: companyName,
      postalCode: postalCode,
      companyPostalCodeForBackend: postalCode,
      companyCity: companyCity,
      selectedCategory: userData.selectedCategory || null,
      selectedSubcategory: userData.selectedSubcategory || null,
      stripeAccountId: userData.stripeAccountId || null, // HINZUGEFÜGT
      hourlyRate: Number(hourlyRate) || null,
      lat: lat,
      lng: lng,
      radiusKm: Number(userData.radiusKm) || null,
      geohash: geohash,
      profilePictureURL: profilePictureURL,
      industryMcc: industryMcc,
      description: userData.description || "",
      // Stripe-Statusfelder für die Anbietersuche synchronisieren
      stripeChargesEnabled: userData.stripeChargesEnabled ?? false,
      stripePayoutsEnabled: userData.stripePayoutsEnabled ?? false,
      stripeDetailsSubmitted: userData.stripeDetailsSubmitted ?? false,

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      profileLastUpdatedAt: FieldValue.serverTimestamp(),
    };

    const finalCompanyData = cleanAndNormalizeCompanyData(companyData);
    loggerV2.info(`[createUserProfile] Schreibe companyData-Objekt für ${userId}:`, JSON.stringify(finalCompanyData, null, 2));

    try {
      await db.collection("companies").doc(userId).set(finalCompanyData, { merge: true });
      loggerV2.info(`[createUserProfile] Company-Dokument für ${userId} erstellt/gemerged.`);
    } catch (error: any) {
      loggerV2.error(`[createUserProfile] Fehler bei Company-Dokument für ${userId}:`, error.message, error);
    }
  }
  return null;
});

export const updateUserProfile = onDocumentUpdated("users/{userId}", async (event) => {
  const userId = event.params.userId;
  const snapshotAfter = event.data?.after;
  if (!snapshotAfter) {
    loggerV2.warn(`[updateUserProfile] Kein Daten-Snapshot nach Update für User ${userId}. Abbruch.`);
    return null;
  }
  const db = getDb();
  const userData = snapshotAfter.data() as FirmaUserData;
  if (typeof userData !== "object" || userData === null) {
    loggerV2.warn(`[updateUserProfile] Userdaten für ${userId} nach Update ungültig. Abbruch.`);
    return null;
  }

  loggerV2.info(`[updateUserProfile Trigger] Verarbeite User ${userId}. Quelldaten (userData):`, JSON.stringify(userData, null, 2));

  if (userData.user_type === "firma") {
    // Helper to find the first non-empty, non-null value from a list of potential sources.
    const pickFirst = <T>(...args: (T | null | undefined)[]) => args.find((v) => v) ?? null;

    const lat = pickFirst(userData.lat);
    const lng = pickFirst(userData.lng);
    let geohash: string | null = null;
    if (typeof lat === 'number' && typeof lng === 'number') {
      geohash = geohashForLocation([lat, lng]);
    }

    const postalCode = pickFirst(userData.companyPostalCodeForBackend, userData.step2?.postalCode, userData.step2?.companyPostalCode);
    const companyName = pickFirst(userData.companyName, userData.step2?.companyName);
    const companyCity = pickFirst(userData.companyCityForBackend, userData.step2?.city);
    const hourlyRate = pickFirst(userData.hourlyRate, userData.step3?.hourlyRate);
    const profilePictureURL = pickFirst(userData.profilePictureFirebaseUrl, userData.step3?.profilePictureURL);
    const industryMcc = pickFirst(userData.industryMcc, userData.step2?.industryMcc);

    const companyDataUpdate: any = {
      uid: userId,
      user_type: "firma",
      updatedAt: FieldValue.serverTimestamp(),
      profileLastUpdatedAt: FieldValue.serverTimestamp(),

      companyName: companyName,
      postalCode: postalCode,
      companyPostalCodeForBackend: postalCode,
      companyCity: companyCity,
      selectedCategory: userData.selectedCategory || null,
      selectedSubcategory: userData.selectedSubcategory || null,
      stripeAccountId: userData.stripeAccountId || null, // HINZUGEFÜGT
      hourlyRate: Number(hourlyRate) || null,
      lat: lat,
      lng: lng,
      radiusKm: Number(userData.radiusKm) || null,
      geohash: geohash,
      profilePictureURL: profilePictureURL,
      industryMcc: industryMcc,
      description: userData.description || "",
      // Stripe-Statusfelder für die Anbietersuche synchronisieren
      stripeChargesEnabled: userData.stripeChargesEnabled ?? false,
      stripePayoutsEnabled: userData.stripePayoutsEnabled ?? false,
      stripeDetailsSubmitted: userData.stripeDetailsSubmitted ?? false,
    };

    const companyDocBefore = await db.collection("companies").doc(userId).get();
    if (companyDocBefore.exists && companyDocBefore.data()?.createdAt) {
      companyDataUpdate.createdAt = companyDocBefore.data()?.createdAt;
    } else if (userData.createdAt) {
      companyDataUpdate.createdAt = userData.createdAt;
    } else {
      if (!companyDataUpdate.createdAt && !companyDocBefore.exists) {
        companyDataUpdate.createdAt = FieldValue.serverTimestamp();
      }
    }

    const finalCompanyDataUpdate = cleanAndNormalizeCompanyData(companyDataUpdate);
    loggerV2.info(`[updateUserProfile] Schreibe companyDataUpdate-Objekt für ${userId}:`, JSON.stringify(finalCompanyDataUpdate, null, 2));

    try {
      await db.collection("companies").doc(userId).set(finalCompanyDataUpdate, { merge: true });
      loggerV2.info(`[updateUserProfile] Company-Dokument für ${userId} aktualisiert.`);
    } catch (error: any) {
      loggerV2.error(`[updateUserProfile] Fehler Company-Dokument für ${userId}:`, error.message, error);
    }
  } else {
    loggerV2.info(`[updateUserProfile] User ${userId} Typ '${userData.user_type}', kein Update für companies Dokument.`);
  }
  return null;
});

export const createStripeCustomAccountOnUserUpdate = onDocumentUpdated("users/{userId}", async (event) => {
  const userId = event.params.userId;
  loggerV2.info(`Firestore Trigger 'createStripeCustomAccountOnUserUpdate' (V2) für ${userId}.`);
  const db = getDb();
  // Die Logik für den Emulator-Modus wird von defineSecret gehandhabt,
  // daher ist keine manuelle isEmulated-Prüfung mehr nötig.
  const stripeKey = STRIPE_SECRET_KEY_TRIGGERS.value();
  const localStripe = getStripeInstance(stripeKey);
  const after = event.data?.after.data() as FirmaUserData;
  if (!after) {
    loggerV2.warn(`Keine Daten nach Update für ${userId}.`);
    return null;
  }

  if (after.stripeAccountId && after.common?.createdByCallable === "true") {
    loggerV2.info(`${userId} hat bereits Stripe-Konto via Callable erstellt. Fallback-Trigger bricht ab.`);
    return null;
  }
  if (after.stripeAccountId && after.common?.createdByCallable !== "true") {
    loggerV2.info(`${userId} hat bereits eine Stripe-Konto ID (${after.stripeAccountId}), aber nicht via Callable. Fallback-Trigger bricht ab.`);
    return null;
  }

  // Helper to pick the first non-empty value from a list of potential sources.
  const pickFirst = <T>(...args: (T | null | undefined)[]) => args.find(v => v) || undefined;

  const userEmail = pickFirst(after.email, after.step1?.email);
  const companyCountryFromData = pickFirst(after.companyCountryForBackend, after.step2?.country);
  const companyPostalCodeFromData = pickFirst(after.companyPostalCodeForBackend, after.step2?.postalCode);
  const companyCityFromData = pickFirst(after.companyCityForBackend, after.step2?.city);
  const companyAddressLine1 = pickFirst(after.companyAddressLine1ForBackend, `${after.step2?.street || ""} ${after.step2?.houseNumber || ""}`.trim());
  const companyNameFromData = pickFirst(after.companyName, after.step2?.companyName);
  const companyPhoneFromData = pickFirst(after.companyPhoneNumberForBackend, after.step1?.phoneNumber);
  const companyWebsiteFromData = pickFirst(after.companyWebsiteForBackend, after.step2?.website);
  const industryMccFromData = pickFirst(after.industryMcc);
  const ibanFromData = pickFirst(after.iban, after.step4?.iban);
  const accountHolderFromData = pickFirst(after.accountHolder, after.step4?.accountHolder);
  const taxIdFromData = pickFirst(after.taxNumberForBackend, after.step3?.taxNumber);
  const vatIdFromData = pickFirst(after.vatIdForBackend, after.step3?.vatId);
  const companyRegisterFromData = pickFirst(after.companyRegisterForBackend, after.step3?.companyRegister);
  const firstNameFromData = pickFirst(after.firstName, after.step1?.firstName);
  const lastNameFromData = pickFirst(after.lastName, after.step1?.lastName);
  const phoneFromData = pickFirst(after.phoneNumber, after.step1?.phoneNumber);
  const dobFromData = pickFirst(after.dateOfBirth, after.step1?.dateOfBirth);
  const personalStreetFromData = pickFirst(after.personalStreet, after.step1?.personalStreet);
  const personalHouseNumberFromData = pickFirst(after.personalHouseNumber, after.step1?.personalHouseNumber);
  const personalPostalCodeFromData = pickFirst(after.personalPostalCode, after.step1?.personalPostalCode);
  const personalCityFromData = pickFirst(after.personalCity, after.step1?.personalCity);
  const personalCountryFromData = pickFirst(after.personalCountry, after.step1?.personalCountry);
  const isManagingDirectorOwnerFromData = after.isManagingDirectorOwner ?? after.step1?.isManagingDirectorOwner ?? false;
  const identityFrontStripeId = pickFirst(after.identityFrontUrlStripeId, after.step3?.identityFrontUrl);
  const identityBackStripeId = pickFirst(after.identityBackUrlStripeId, after.step3?.identityBackUrl);

  const clientIp = after.common?.tosAcceptanceIp;
  const userAgent = after.common?.tosAcceptanceUserAgent || "UserAgentNotProvidedInFirestoreTrigger";

  const validationChecks = {
    isCompany: after.user_type === "firma",
    hasContactDetails: !!userEmail && !!firstNameFromData && !!lastNameFromData,
    hasCompanyDetails: !!companyNameFromData && !!companyAddressLine1 && !!companyCityFromData && !!companyPostalCodeFromData && !!companyCountryFromData,
    hasTaxInfo: !!(taxIdFromData || vatIdFromData || companyRegisterFromData),
    hasBankDetails: !!ibanFromData && !!accountHolderFromData,
    hasValidIp: !!clientIp && !["FALLBACK_IP_ADDRESS", "IP_NOT_DETERMINED", "NEEDS_REAL_USER_IP", "8.8.8.8", "127.0.0.1", "::1"].includes(clientIp),
  };

  const allChecksPassed = Object.values(validationChecks).every(Boolean);

  if (!allChecksPassed) {
    loggerV2.info(
      `${userId} erfüllt nicht alle Bedingungen für den Fallback Stripe Account Creation Trigger. Status:`,
      { ...validationChecks, clientIp: clientIp } // Log validation status and the IP for context
    );
    return null;
  }

  try {
    const accountParams: Stripe.AccountCreateParams = {
      type: "custom", country: companyCountryFromData!, email: userEmail!,
      business_type: "company",
      company: {
        name: companyNameFromData!,
        tax_id: companyRegisterFromData || taxIdFromData || undefined,
        vat_id: vatIdFromData || undefined,
        phone: companyPhoneFromData || undefined,
        address: {
          line1: companyAddressLine1, city: companyCityFromData!,
          postal_code: companyPostalCodeFromData!, country: companyCountryFromData!,
        },
      },
      business_profile: {
        url: companyWebsiteFromData || undefined,
        mcc: industryMccFromData || undefined,
      },
      external_account: {
        object: "bank_account", country: companyCountryFromData!, currency: "eur",
        account_number: (ibanFromData!).replace(/\s/g, ""),
        account_holder_name: (accountHolderFromData!),
      },
      tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: clientIp, user_agent: userAgent },
      capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
      metadata: { internal_user_id: userId, created_by: "firestore_trigger_fallback" },
    };

    const account = await localStripe.accounts.create(accountParams);

    if (firstNameFromData && lastNameFromData) {
      const personPayload: Stripe.AccountCreatePersonParams = {
        first_name: firstNameFromData,
        last_name: lastNameFromData,
        email: userEmail!,
        phone: phoneFromData || undefined,
        relationship: {
          representative: true,
          owner: isManagingDirectorOwnerFromData,
          director: isManagingDirectorOwnerFromData,
        },
      };
      if (dobFromData) {
        const [year, month, day] = dobFromData.split('-').map(Number);
        if (day && month && year) personPayload.dob = { day, month, year };
      }
      if (personalStreetFromData && personalCityFromData && personalPostalCodeFromData && personalCountryFromData) {
        personPayload.address = {
          line1: `${personalStreetFromData} ${personalHouseNumberFromData || ''}`.trim(),
          city: personalCityFromData,
          postal_code: personalPostalCodeFromData,
          country: personalCountryFromData ? personalCountryFromData : undefined,
        };
      }
      if (identityFrontStripeId || identityBackStripeId) {
        personPayload.verification = { document: {} };
        if (identityFrontStripeId && personPayload.verification.document) personPayload.verification.document.front = identityFrontStripeId;
        if (identityBackStripeId && personPayload.verification.document) personPayload.verification.document.back = identityBackStripeId;
      }

      const person = await localStripe.accounts.createPerson(account.id, personPayload);
      await db.collection("users").doc(userId).update({ stripeRepresentativePersonId: person.id });
    }

    loggerV2.info(`Stripe Custom Account (Trigger Fallback) für ${userId} erstellt: ${account.id}`);
    await db.collection("users").doc(userId).update({
      stripeAccountId: account.id,
      stripeAccountDetailsSubmitted: account.details_submitted,
      stripeAccountCreationDate: FieldValue.serverTimestamp(),
      stripeAccountError: FieldValue.delete(),
    });
    return null;
  } catch (error: any) {
    loggerV2.error(`Fehler Erstellung Stripe Account (Trigger Fallback) für ${userId}:`, error.message, error);
    await db.collection("users").doc(userId).update({
      stripeAccountError: error instanceof Error ? error.message : String(error.toString()),
    }).catch((dbErr: any) => loggerV2.error(`DB-Fehler Speichern Stripe-Fehler (Trigger Fallback) für ${userId}:`, dbErr.message, dbErr));
    return null;
  }
});