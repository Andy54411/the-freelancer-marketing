// /Users/andystaudinger/Tasko/firebase_functions/src/triggers_firestore.ts

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { logger as loggerV2 } from 'firebase-functions/v2';
import * as functionsV1 from 'firebase-functions/v1'; // Wichtig für createStripeCustomAccountOnUserUpdate
import Stripe from 'stripe'; // Wichtig für createStripeCustomAccountOnUserUpdate
import { db, getStripeInstance } from './helpers'; // Wichtig für db und getStripeInstance
import { FieldValue } from 'firebase-admin/firestore'; // Wichtig für FieldValue

// WICHTIG: admin.initializeApp() MUSS HIER ENTFERNT WERDEN!
// Die Initialisierung erfolgt zentral in index.ts.
// Auch der Import von 'admin' hier ist nicht mehr nötig,
// da db, getStripeInstance etc. über helpers importiert werden.

interface FirmaUserData {
  uid: string;
  user_type: "firma";


  companyName?: string;
  companyAddressLine1ForBackend?: string;
  companyCityForBackend?: string;
  companyPostalCodeForBackend?: string; // Dies ist der primäre Pfad für die PLZ
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
  phoneNumber?: string; // Persönliche Nummer
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

  common?: { // Für Metadaten, die *ausschließlich* in common gespeichert werden
    registrationCompletedAt?: string;
    tosAcceptanceUserAgent?: string;
    tosAcceptanceIp?: string;
    createdByCallable?: string;
    stripeVerificationStatus?: string;
  };

  // Fallbacks für ältere oder alternative Datenstrukturen (möglichst vermeiden)
  step1?: { email?: string; phoneNumber?: string; firstName?: string; lastName?: string; dateOfBirth?: string; personalStreet?: string; personalHouseNumber?: string; personalPostalCode?: string; personalCity?: string; personalCountry?: string; isManagingDirectorOwner?: boolean; };
  step2?: { companyName?: string; postalCode?: string; /* alt */ companyPostalCode?: string; /* alt */ country?: string; city?: string; street?: string; houseNumber?: string; website?: string; industryMcc?: string; };
  step3?: { profilePictureURL?: string; hourlyRate?: string; taxNumber?: string; vatId?: string; companyRegister?: string; identityFrontUrl?: string; identityBackUrl?: string; };
  step4?: { iban?: string; accountHolder?: string; };

  createdAt?: FirebaseFirestore.Timestamp | Date;
  updatedAt?: FirebaseFirestore.Timestamp | Date;
  stripeAccountId?: string;
}


export const createUserProfile = onDocumentCreated("users/{userId}", async (event) => {
  const snapshot = event.data;
  const userId = event.params.userId;
  if (!snapshot || !snapshot.data) {
    loggerV2.warn(`[createUserProfile] User data for ${userId} is undefined. Skipping.`);
    return null;
  }
  const userData = snapshot.data() as FirmaUserData;
  loggerV2.info(`[createUserProfile Trigger] Verarbeite User ${userId}. Quelldaten (userData):`, JSON.stringify(userData, null, 2));

  if (userData.user_type === "firma") {

    const companyData: any = {
      uid: userId,
      user_type: "firma",
      // Lese direkt von Top-Level-Feldern im users-Dokument, basierend auf deinen Logs
      companyName: userData.companyName || "Unbenanntes Unternehmen",
      postalCode: userData.companyPostalCodeForBackend || null, // Dein primärer Pfad
      companyCity: userData.companyCityForBackend || null,     // Dein primärer Pfad
      selectedCategory: userData.selectedCategory || null,
      selectedSubcategory: userData.selectedSubcategory || null,
      hourlyRate: Number(userData.hourlyRate) || null,
      lat: userData.lat ?? null,
      lng: userData.lng ?? null,
      radiusKm: Number(userData.radiusKm) || null,
      profilePictureURL: userData.profilePictureFirebaseUrl || null,
      industryMcc: userData.industryMcc || null,
      description: userData.description || "", // Initial leer

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      profileLastUpdatedAt: FieldValue.serverTimestamp(),
    };

    // Bereinige das Objekt: undefined oder leere Strings zu null, NaN zu null
    Object.keys(companyData).forEach((key) => {
      if (companyData[key] === undefined || companyData[key] === "") {
        companyData[key] = null;
      }
    });
    if (companyData.hourlyRate !== null && isNaN(companyData.hourlyRate)) companyData.hourlyRate = null;
    if (companyData.radiusKm !== null && isNaN(companyData.radiusKm)) companyData.radiusKm = null;
    if (companyData.lat !== null && isNaN(Number(companyData.lat))) companyData.lat = null;
    if (companyData.lng !== null && isNaN(Number(companyData.lng))) companyData.lng = null;

    loggerV2.info(`[createUserProfile] Schreibe companyData-Objekt für ${userId}:`, JSON.stringify(companyData, null, 2));

    try {
      await db.collection("companies").doc(userId).set(companyData, { merge: true });
      loggerV2.info(`[createUserProfile] Company-Dokument für ${userId} erstellt/gemerged.`);
    } catch (error: any) {
      loggerV2.error(`[createUserProfile] Fehler bei Company-Dokument für ${userId}:`, error.message, error);
    }
  }
  return null;
}
);

export const updateUserProfile = onDocumentUpdated("users/{userId}", async (event) => {
  const userId = event.params.userId;
  const snapshotAfter = event.data?.after;
  if (!snapshotAfter) {
    loggerV2.warn(`[updateUserProfile] Kein Daten-Snapshot nach Update für User ${userId}. Abbruch.`);
    return null;
  }
  const userData = snapshotAfter.data() as FirmaUserData;
  if (typeof userData !== "object" || userData === null) {
    loggerV2.warn(`[updateUserProfile] Userdaten für ${userId} nach Update ungültig. Abbruch.`);
    return null;
  }

  loggerV2.info(`[updateUserProfile Trigger] Verarbeite User ${userId}. Quelldaten (userData):`, JSON.stringify(userData, null, 2));

  if (userData.user_type === "firma") {
    const companyDataUpdate: any = {
      uid: userId,
      user_type: "firma",
      updatedAt: FieldValue.serverTimestamp(),
      profileLastUpdatedAt: FieldValue.serverTimestamp(),

      companyName: userData.companyName || null,
      postalCode: userData.companyPostalCodeForBackend || null,
      companyCity: userData.companyCityForBackend || null,
      selectedCategory: userData.selectedCategory || null,
      selectedSubcategory: userData.selectedSubcategory || null,
      hourlyRate: Number(userData.hourlyRate) || null,
      lat: userData.lat ?? null,
      lng: userData.lng ?? null,
      radiusKm: Number(userData.radiusKm) || null,
      profilePictureURL: userData.profilePictureFirebaseUrl || null,
      industryMcc: userData.industryMcc || null,
      description: userData.description || "",
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

    Object.keys(companyDataUpdate).forEach((key) => {
      if (companyDataUpdate[key] === undefined || companyDataUpdate[key] === "") {
        companyDataUpdate[key] = null;
      }
    });
    if (companyDataUpdate.hourlyRate !== null && isNaN(companyDataUpdate.hourlyRate)) companyDataUpdate.hourlyRate = null;
    if (companyDataUpdate.radiusKm !== null && isNaN(companyDataUpdate.radiusKm)) companyDataUpdate.radiusKm = null;
    if (companyDataUpdate.lat !== null && isNaN(Number(companyDataUpdate.lat))) companyDataUpdate.lat = null;
    if (companyDataUpdate.lng !== null && isNaN(Number(companyDataUpdate.lng))) companyDataUpdate.lng = null;

    loggerV2.info(`[updateUserProfile] Schreibe companyDataUpdate-Objekt für ${userId}:`, JSON.stringify(companyDataUpdate, null, 2));

    try {
      await db.collection("companies").doc(userId).set(companyDataUpdate, { merge: true });
      loggerV2.info(`[updateUserProfile] Company-Dokument für ${userId} aktualisiert.`);
    } catch (error: any) {
      loggerV2.error(`[updateUserProfile] Fehler Company-Dokument für ${userId}:`, error.message, error);
    }
  } else {
    loggerV2.info(`[updateUserProfile] User ${userId} Typ '${userData.user_type}', kein Update für companies Dokument.`);
  }
  return null;
});

export const createStripeCustomAccountOnUserUpdate = functionsV1.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    const userId = context.params.userId;
    functionsV1.logger.info(`Firestore Trigger 'createStripeCustomAccountOnUserUpdate' für ${userId}.`);
    const localStripe = getStripeInstance();
    const after = change.after.data() as FirmaUserData;
    if (!after) {
      functionsV1.logger.warn(`Keine Daten nach Update für ${userId}.`);
      return null;
    }

    if (after.stripeAccountId && after.common?.createdByCallable === "true") {
      functionsV1.logger.info(`${userId} hat bereits Stripe-Konto via Callable erstellt. Fallback-Trigger bricht ab.`);
      return null;
    }
    if (after.stripeAccountId && after.common?.createdByCallable !== "true") {
      functionsV1.logger.info(`${userId} hat bereits eine Stripe-Konto ID (${after.stripeAccountId}), aber nicht via Callable. Fallback-Trigger bricht ab.`);
      return null;
    }

    const userEmail = after.email || after.step1?.email; // Behalte step1 Fallback für E-Mail

    // Lese primär von Top-Level Feldern aus dem 'users'-Dokument (after-Objekt)
    const companyCountryFromData = after.companyCountryForBackend || after.step2?.country;
    const companyPostalCodeFromData = after.companyPostalCodeForBackend || after.step2?.postalCode;
    const companyCityFromData = after.companyCityForBackend || after.step2?.city;
    const companyAddressLine1 = after.companyAddressLine1ForBackend || `${after.step2?.street || ""} ${after.step2?.houseNumber || ""}`.trim();
    const companyNameFromData = after.companyName || after.step2?.companyName;
    const companyPhoneFromData = after.companyPhoneNumberForBackend || after.step1?.phoneNumber;
    const companyWebsiteFromData = after.companyWebsiteForBackend || after.step2?.website;
    const industryMccFromData = after.industryMcc; // Direkter Top-Level Zugriff
    const ibanFromData = after.iban || after.step4?.iban; // Direkter Top-Level Zugriff
    const accountHolderFromData = after.accountHolder || after.step4?.accountHolder; // Direkter Top-Level Zugriff
    const taxIdFromData = after.taxNumberForBackend || after.step3?.taxNumber;
    const vatIdFromData = after.vatIdForBackend || after.step3?.vatId;
    const companyRegisterFromData = after.companyRegisterForBackend || after.step3?.companyRegister;

    const firstNameFromData = after.firstName || after.step1?.firstName;
    const lastNameFromData = after.lastName || after.step1?.lastName;
    const phoneFromData = after.phoneNumber || after.step1?.phoneNumber; // Persönliche Nummer
    const dobFromData = after.dateOfBirth || after.step1?.dateOfBirth;
    const personalStreetFromData = after.personalStreet || after.step1?.personalStreet;
    const personalHouseNumberFromData = after.personalHouseNumber || after.step1?.personalHouseNumber;
    const personalPostalCodeFromData = after.personalPostalCode || after.step1?.personalPostalCode;
    const personalCityFromData = after.personalCity || after.step1?.personalCity;
    const personalCountryFromData = after.personalCountry || after.step1?.personalCountry;
    const isManagingDirectorOwnerFromData = after.isManagingDirectorOwner ?? after.step1?.isManagingDirectorOwner ?? false;

    const identityFrontStripeId = after.identityFrontUrlStripeId || after.step3?.identityFrontUrl;
    const identityBackStripeId = after.identityBackUrlStripeId || after.step3?.identityBackUrl;

    const clientIp = after.common?.tosAcceptanceIp;
    const userAgent = after.common?.tosAcceptanceUserAgent || "UserAgentNotProvidedInFirestoreTrigger";

    const requiredFields =
      after.user_type === "firma" &&
      userEmail &&
      firstNameFromData && lastNameFromData &&
      companyNameFromData && companyAddressLine1 &&
      companyCityFromData && companyPostalCodeFromData && companyCountryFromData &&
      (taxIdFromData || vatIdFromData || companyRegisterFromData) &&
      ibanFromData && accountHolderFromData &&
      clientIp &&
      !["FALLBACK_IP_ADDRESS", "IP_NOT_DETERMINED", "NEEDS_REAL_USER_IP", "8.8.8.8", "127.0.0.1", "::1"].includes(clientIp);

    if (!requiredFields) {
      functionsV1.logger.info(`${userId} ist nicht Firma oder es fehlen wichtige Daten/gültige IP für den Fallback Stripe Account Creation Trigger. Details: userEmail=${!!userEmail}, firstName=${!!firstNameFromData}, lastName=${!!lastNameFromData}, companyName=${!!companyNameFromData}, companyAddressLine1=${!!companyAddressLine1}, companyCity=${!!companyCityFromData}, companyPostalCode=${!!companyPostalCodeFromData}, companyCountry=${!!companyCountryFromData}, tax/vat/register=${!!(taxIdFromData || vatIdFromData || companyRegisterFromData)}, iban=${!!ibanFromData}, accountHolder=${!!accountHolderFromData}, clientIp=${clientIp}`);
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

      functionsV1.logger.info(`Stripe Custom Account (Trigger Fallback) für ${userId} erstellt: ${account.id}`);
      await db.collection("users").doc(userId).update({
        stripeAccountId: account.id,
        stripeAccountDetailsSubmitted: account.details_submitted,
        stripeAccountCreationDate: FieldValue.serverTimestamp(),
        stripeAccountError: FieldValue.delete(),
      });
      return null;
    } catch (error: any) {
      functionsV1.logger.error(`Fehler Erstellung Stripe Account (Trigger Fallback) für ${userId}:`, error.message, error);
      await db.collection("users").doc(userId).update({
        stripeAccountError: error instanceof Error ? error.message : String(error.toString()),
      }).catch((dbErr: any) => functionsV1.logger.error(`DB-Fehler Speichern Stripe-Fehler (Trigger Fallback) für ${userId}:`, dbErr.message, dbErr));
      return null;
    }
  });