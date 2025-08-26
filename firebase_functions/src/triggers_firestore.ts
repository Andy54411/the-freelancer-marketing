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
const cleanAndNormalizeCompanyData = (data: Record<string, unknown>): Record<string, unknown> => {
  const cleanedData = { ...data };
  Object.keys(cleanedData).forEach((key) => {
    if (cleanedData[key] === undefined || cleanedData[key] === "") {
      cleanedData[key] = null;
    }
  });
  if (cleanedData.hourlyRate !== null && isNaN(Number(cleanedData.hourlyRate))) cleanedData.hourlyRate = null;
  if (cleanedData.radiusKm !== null && isNaN(Number(cleanedData.radiusKm))) cleanedData.radiusKm = null;
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
  // Nur minimales User-Profil erstellen für Auth-Zwecke
  if (!event.data) {
    loggerV2.warn('No data in user creation event');
    return;
  }

  const userId = event.params.userId;
  const userData = event.data.data() as Record<string, unknown>;

  loggerV2.info('👤 Creating minimal user profile for auth', { userId });

  try {
    const db = await getDb();

    // Minimale User-Daten für Auth
    const minimalUserData = {
      uid: userId,
      email: userData.email || null,
      displayName: userData.displayName || null,
      photoURL: userData.photoURL || null,
      createdAt: userData.createdAt || FieldValue.serverTimestamp(),
      user_type: userData.user_type || 'firma',
      // Auth Flags
      needsOnboarding: userData.needsOnboarding !== false,
      hasOnboardingStarted: userData.hasOnboardingStarted || false,
      onboardingCompleted: userData.onboardingCompleted || false,
      profileComplete: userData.profileComplete || false,
    };

    await db.collection("users").doc(userId).set(minimalUserData, { merge: true });
    loggerV2.info('✅ Minimal user profile created successfully', { userId });

  } catch (error) {
    loggerV2.error('❌ Error creating minimal user profile:', error);
  }
});

// 🔧 NEUE COMPANIES COLLECTION TRIGGER
export const createCompanyProfile = onDocumentCreated("companies/{companyId}", async (event) => {
  if (!event.data) {
    loggerV2.warn('No data in company creation event');
    return;
  }

  const companyId = event.params.companyId;
  const companyData = event.data.data() as FirmaUserData;

  loggerV2.info('🏢 Processing company profile creation', { companyId });

  try {
    const db = await getDb();

    // Vollständige Company-Daten verarbeiten
    const finalCompanyData = cleanAndNormalizeCompanyData(companyData as unknown as Record<string, unknown>);

    if (finalCompanyData.companyName === null || finalCompanyData.companyName === undefined) {
      finalCompanyData.companyName = UNNAMED_COMPANY;
    }

    // Geohash für Location berechnen
    if (typeof finalCompanyData.lat === 'number' && typeof finalCompanyData.lng === 'number') {
      const lat = finalCompanyData.lat as number;
      const lng = finalCompanyData.lng as number;
      finalCompanyData.geohash = geohashForLocation([lat, lng]);
    }

    // Final company document
    finalCompanyData.createdAt = FieldValue.serverTimestamp();
    finalCompanyData.lastUpdated = FieldValue.serverTimestamp();

    // Save to companies collection
    await db.collection("companies").doc(companyId).set(finalCompanyData, { merge: true });
    loggerV2.info('✅ Company profile created successfully', { companyId });

  } catch (error) {
    loggerV2.error('❌ Error creating company profile:', error);
  }
});

export const updateUserProfile = onDocumentUpdated("users/{userId}", async (event) => {
  const userId = event.params.userId;
  const snapshotAfter = event.data?.after;
  
  if (!snapshotAfter) {
    loggerV2.warn(`[updateUserProfile] Kein Daten-Snapshot nach Update für User ${userId}. Abbruch.`);
    return null;
  }
  
  const userData = snapshotAfter.data() as Record<string, unknown>;
  
  // 🔧 SAUBERE TRENNUNG: Nur minimal Auth-Updates in users collection
  loggerV2.info(`[updateUserProfile] Minimale Auth-Updates für User ${userId}`);

  try {
    const db = await getDb();

    // Nur essentielle Auth-Flags updateDoc
    const authUpdates: Record<string, unknown> = {
      lastAuthUpdate: FieldValue.serverTimestamp(),
    };

    // Nur wenn Auth-relevante Felder sich geändert haben
    if (userData.onboardingCompleted || userData.profileComplete) {
      loggerV2.info(`[updateUserProfile] Auth flags updated für ${userId}`);
    }

    await db.collection("users").doc(userId).update(authUpdates);
    loggerV2.info('✅ Minimal user auth update completed', { userId });

  } catch (error) {
    loggerV2.error('❌ Error updating user auth:', error);
  }
  
  return null;
});

// 🔧 NEUE COMPANIES UPDATE TRIGGER
export const updateCompanyProfile = onDocumentUpdated("companies/{companyId}", async (event) => {
  const companyId = event.params.companyId;
  const snapshotBefore = event.data?.before;
  const snapshotAfter = event.data?.after;
  
  if (!snapshotAfter) {
    loggerV2.warn(`[updateCompanyProfile] Kein Daten-Snapshot nach Update für Company ${companyId}. Abbruch.`);
    return null;
  }
  
  const db = await getDb();
  const companyData = snapshotAfter.data() as FirmaUserData;
  const previousData = snapshotBefore?.data() as FirmaUserData;
  
  if (typeof companyData !== "object" || companyData === null) {
    loggerV2.warn(`[updateCompanyProfile] Company-Daten für ${companyId} nach Update ungültig. Abbruch.`);
    return null;
  }

  // CRITICAL: Verhindere Endlosschleife - Zeit-basierte Prevention
  const currentTime = Date.now();
  const lastUpdate = (companyData as any)?.profileLastUpdatedAt?._seconds * 1000 || 0;
  
  // Wenn das letzte Update weniger als 10 Sekunden her ist, breche ab
  if (currentTime - lastUpdate < 10000) {
    loggerV2.info(`[updateCompanyProfile] ${companyId}: Update zu kürzlich (${Math.round((currentTime - lastUpdate)/1000)}s), Trigger-Loop verhindert.`);
    return null;
  }

  // Prüfe ob relevante Company-Felder geändert wurden
  const relevantFieldsChanged = (
    previousData?.companyName !== companyData?.companyName ||
    previousData?.step2?.companyName !== companyData?.step2?.companyName ||
    previousData?.selectedCategory !== companyData?.selectedCategory ||
    previousData?.selectedSubcategory !== companyData?.selectedSubcategory ||
    previousData?.hourlyRate !== companyData?.hourlyRate ||
    previousData?.lat !== companyData?.lat ||
    previousData?.lng !== companyData?.lng ||
    previousData?.radiusKm !== companyData?.radiusKm
  );

  if (!relevantFieldsChanged) {
    loggerV2.info(`[updateCompanyProfile] ${companyId}: Keine relevanten Felder geändert, Update übersprungen.`);
    return null;
  }

  loggerV2.info(`[updateCompanyProfile Trigger] Verarbeite Company ${companyId}. Quelldaten:`, JSON.stringify(companyData, null, 2));

  try {
    // Helper to find the first non-empty, non-null value from a list of potential sources.
    const pickFirst = <T>(...args: (T | null | undefined)[]) => args.find((v) => v) ?? null;

    const lat = pickFirst(companyData.lat);
    const lng = pickFirst(companyData.lng);
    let geohash: string | null = null;
    if (typeof lat === 'number' && typeof lng === 'number') {
      geohash = geohashForLocation([lat, lng]);
    }

    const postalCode = pickFirst(companyData.companyPostalCodeForBackend, companyData.step2?.postalCode, companyData.step2?.companyPostalCode);
    const companyName = pickFirst(companyData.companyName, companyData.step2?.companyName);
    const companyCity = pickFirst(companyData.companyCityForBackend, companyData.step2?.city);
    const hourlyRate = pickFirst(companyData.hourlyRate, companyData.step3?.hourlyRate);
    const profilePictureURL = pickFirst(companyData.profilePictureFirebaseUrl, companyData.step3?.profilePictureURL);
    const industryMcc = pickFirst(companyData.industryMcc, companyData.step2?.industryMcc);

    const companyDataUpdate: Record<string, unknown> = {
      uid: companyId,
      user_type: "firma",
      updatedAt: FieldValue.serverTimestamp(),
      profileLastUpdatedAt: FieldValue.serverTimestamp(),

      companyName: companyName,
      postalCode: postalCode,
      companyPostalCodeForBackend: postalCode,
      companyCity: companyCity,
      selectedCategory: companyData.selectedCategory || null,
      selectedSubcategory: companyData.selectedSubcategory || null,
      stripeAccountId: companyData.stripeAccountId || null,
      hourlyRate: Number(hourlyRate) || null,
      lat: lat,
      lng: lng,
      radiusKm: Number(companyData.radiusKm) || null,
      geohash: geohash,
      profilePictureURL: profilePictureURL,
      industryMcc: industryMcc,
      description: companyData.description || "",
      // Stripe-Statusfelder für die Anbietersuche synchronisieren
      stripeChargesEnabled: companyData.stripeChargesEnabled ?? false,
      stripePayoutsEnabled: companyData.stripePayoutsEnabled ?? false,
      stripeDetailsSubmitted: companyData.stripeDetailsSubmitted ?? false,
    };

    const companyDocBefore = await db.collection("companies").doc(companyId).get();
    if (companyDocBefore.exists && companyDocBefore.data()?.createdAt) {
      companyDataUpdate.createdAt = companyDocBefore.data()?.createdAt;
    } else if (companyData.createdAt) {
      companyDataUpdate.createdAt = companyData.createdAt;
    } else {
      if (!companyDataUpdate.createdAt && !companyDocBefore.exists) {
        companyDataUpdate.createdAt = FieldValue.serverTimestamp();
      }
    }

    const finalCompanyDataUpdate = cleanAndNormalizeCompanyData(companyDataUpdate);
    loggerV2.info(`[updateCompanyProfile] Schreibe companyDataUpdate-Objekt für ${companyId}:`, JSON.stringify(finalCompanyDataUpdate, null, 2));

    await db.collection("companies").doc(companyId).set(finalCompanyDataUpdate, { merge: true });
    loggerV2.info(`[updateCompanyProfile] Company-Dokument für ${companyId} erfolgreich aktualisiert.`);

  } catch (error: unknown) {
    if (error instanceof Error) {
      loggerV2.error(`[updateCompanyProfile] Fehler Company-Dokument für ${companyId}:`, error.message, error);
    } else {
      loggerV2.error(`[updateCompanyProfile] Fehler Company-Dokument für ${companyId}:`, String(error));
    }
  }
  
  return null;
});

export const syncCompanyToUserOnUpdate = onDocumentUpdated("companies/{companyId}", async (event) => {
  const companyId = event.params.companyId;
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();
  
  if (!afterData) {
    loggerV2.warn(`[syncCompanyToUserOnUpdate] No data after update for company ${companyId}. Skipping.`);
    return null;
  }

  if (!beforeData) {
    loggerV2.info(`[syncCompanyToUserOnUpdate] No before data for company ${companyId}. Proceeding with full sync.`);
  } else {
    // Check if any relevant fields have actually changed
    const relevantFields = [
      'companyName', 'description', 'hourlyRate', 'selectedCategory', 'selectedSubcategory',
      'lat', 'lng', 'radiusKm', 'companyPostalCodeForBackend', 'companyCityForBackend', 'companyCountryForBackend',
      'companyPhoneNumberForBackend', 'companyWebsiteForBackend',
      'profilePictureURL', 'profilePictureFirebaseUrl',
      'stripeAccountId', 'stripeChargesEnabled', 'stripePayoutsEnabled', 'stripeDetailsSubmitted', 'stripeVerificationStatus',
      'specialties', 'portfolio', 'skills', 'languages', 'education', 'certifications',
      'responseTime', 'responseTimeGuarantee', 'completionRate', 'totalOrders', 'averageRating', 'totalReviews',
      'industryMcc', 'postalCode', 'companyCity'
    ];

    let hasChanges = false;
    const changedFields: string[] = [];

    for (const field of relevantFields) {
      const beforeValue = beforeData[field];
      const afterValue = afterData[field];
      
      // Deep comparison for objects/arrays, simple comparison for primitives
      if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
        hasChanges = true;
        changedFields.push(field);
      }
    }

    if (!hasChanges) {
      loggerV2.info(`[syncCompanyToUserOnUpdate] No relevant changes detected for company ${companyId}. Skipping sync.`);
      return null;
    }

    loggerV2.info(`[syncCompanyToUserOnUpdate] Company ${companyId} has changes in fields: [${changedFields.join(', ')}]. Proceeding with sync.`);
  }

  const db = getDb();
  try {
    // Check if corresponding user document exists
    const userDocRef = db.collection("users").doc(companyId);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      loggerV2.warn(`[syncCompanyToUserOnUpdate] User document ${companyId} does not exist. Skipping sync.`);
      return null;
    }

    // Prepare user data update with company data
    const userDataUpdate: Record<string, unknown> = {
      // Basic company info
      companyName: afterData.companyName || null,
      description: afterData.description || null,
      hourlyRate: afterData.hourlyRate || null,
      selectedCategory: afterData.selectedCategory || null,
      selectedSubcategory: afterData.selectedSubcategory || null,
      
      // Location data
      lat: afterData.lat || null,
      lng: afterData.lng || null,
      radiusKm: afterData.radiusKm || null,
      companyPostalCodeForBackend: afterData.companyPostalCodeForBackend || afterData.postalCode || null,
      companyCityForBackend: afterData.companyCityForBackend || afterData.companyCity || null,
      companyCountryForBackend: afterData.companyCountryForBackend || null,
      
      // Contact and business info
      companyPhoneNumberForBackend: afterData.companyPhoneNumberForBackend || null,
      companyWebsiteForBackend: afterData.companyWebsiteForBackend || null,
      
      // Profile and media
      profilePictureFirebaseUrl: afterData.profilePictureURL || afterData.profilePictureFirebaseUrl || null,
      profilePictureURL: afterData.profilePictureURL || afterData.profilePictureFirebaseUrl || null,
      
      // Business details from step2
      'step2.companyName': afterData.companyName || null,
      'step2.description': afterData.description || null,
      'step2.city': afterData.companyCity || afterData.companyCityForBackend || null,
      'step2.country': afterData.companyCountryForBackend || null,
      'step2.industryMcc': afterData.industryMcc || null,
      
      // Technical details from step3  
      'step3.hourlyRate': afterData.hourlyRate ? String(afterData.hourlyRate) : null,
      'step3.profilePictureURL': afterData.profilePictureURL || afterData.profilePictureFirebaseUrl || null,
      
      // Stripe and verification data
      stripeAccountId: afterData.stripeAccountId || null,
      stripeChargesEnabled: afterData.stripeChargesEnabled || false,
      stripePayoutsEnabled: afterData.stripePayoutsEnabled || false,
      stripeDetailsSubmitted: afterData.stripeDetailsSubmitted || false,
      stripeVerificationStatus: afterData.stripeVerificationStatus || null,
      
      // Additional profile data
      specialties: afterData.specialties || null,
      portfolio: afterData.portfolio || null,
      skills: afterData.skills || null,
      languages: afterData.languages || null,
      education: afterData.education || null,
      certifications: afterData.certifications || null,
      
      // Metrics and performance
      responseTime: afterData.responseTime || afterData.responseTimeGuarantee || null,
      completionRate: afterData.completionRate || null,
      totalOrders: afterData.totalOrders || null,
      averageRating: afterData.averageRating || null,
      totalReviews: afterData.totalReviews || null,
      
      // Timestamps
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Remove null values to avoid overwriting existing data with nulls
    const cleanedUpdate: { [x: string]: any } = Object.fromEntries(
      Object.entries(userDataUpdate).filter(([_, value]) => value !== null)
    );

    if (Object.keys(cleanedUpdate).length > 0) {
      await userDocRef.update(cleanedUpdate);
      loggerV2.info(`[syncCompanyToUserOnUpdate] Successfully synced company ${companyId} data to user document. Updated ${Object.keys(cleanedUpdate).length} fields.`);
    } else {
      loggerV2.info(`[syncCompanyToUserOnUpdate] No non-null data to sync for company ${companyId}.`);
    }
    
    return null;
  } catch (error: unknown) {
    if (error instanceof Error) {
      loggerV2.error(`[syncCompanyToUserOnUpdate] Error syncing company ${companyId} to user:`, error.message, error);
    } else {
      loggerV2.error(`[syncCompanyToUserOnUpdate] Error syncing company ${companyId} to user:`, String(error));
    }
    return null;
  }
});

// 🔧 NEUE STRIPE TRIGGER für companies collection
export const createStripeCustomAccountOnCompanyUpdate = onDocumentUpdated("companies/{companyId}", async (event) => {
  const companyId = event.params.companyId;
  loggerV2.info(`Firestore Trigger 'createStripeCustomAccountOnCompanyUpdate' (V2) für ${companyId}.`);

  const afterData = event.data?.after.data();

  if (!afterData) {
    loggerV2.warn(`No after data for company ${companyId}`);
    return null;
  }

  // Prüfen ob Stripe Account erstellt werden muss
  const hasStripeAccount = afterData.stripeAccountId;
  const shouldCreateStripeAccount = !hasStripeAccount && (
    afterData.onboardingCompleted === true ||
    afterData.profileComplete === true ||
    afterData.step2?.companyName
  );

  if (!shouldCreateStripeAccount) {
    loggerV2.info(`No Stripe account creation needed for company ${companyId}`);
    return null;
  }

  loggerV2.info(`Creating Stripe account for company ${companyId}`);

  try {
    const stripe = getStripeInstance(STRIPE_SECRET_KEY_TRIGGERS.value());
    const db = await getDb();

    // Create Stripe Express account für company
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'DE',
      email: afterData.email,
      business_type: 'company',
      company: {
        name: afterData.companyName || afterData.step2?.companyName || 'Unbekannte Firma',
      },
      business_profile: {
        mcc: afterData.industryMcc || afterData.step2?.industryMcc || '7399',
        name: afterData.companyName || afterData.step2?.companyName || 'Unbekannte Firma',
        product_description: afterData.description || 'Professionelle Dienstleistungen',
        support_email: afterData.email,
        url: afterData.website || afterData.step1?.website || undefined,
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'daily',
          },
        },
      },
    });

    // Save Stripe account ID to companies collection
    await db.collection('companies').doc(companyId).update({
      stripeAccountId: account.id,
      stripeAccountCreatedAt: FieldValue.serverTimestamp(),
    });

    loggerV2.info(`✅ Stripe account ${account.id} created for company ${companyId}`);

  } catch (error) {
    loggerV2.error(`❌ Error creating Stripe account for company ${companyId}:`, error);
  }

  return null;
});

// Legacy: Behalte den alten users trigger für Kompatibilität
export const createStripeCustomAccountOnUserUpdate = onDocumentUpdated("users/{userId}", async (event) => {
  const userId = event.params.userId;
  loggerV2.info(`Firestore Trigger 'createStripeCustomAccountOnUserUpdate' (V2) für ${userId}.`);
  const db = getDb();
  
  // ENDLOSSCHLEIFE PREVENTION: Prüfe ob das Update vom Trigger selbst kommt
  const before = event.data?.before.data() as FirmaUserData;
  const after = event.data?.after.data() as FirmaUserData;
  
  if (!after) {
    loggerV2.warn(`Keine Daten nach Update für ${userId}.`);
    return null;
  }

  // CRITICAL: Verhindere Trigger-Loop - wenn nur Stripe-Felder geändert wurden, breche ab
  const onlyStripeFieldsChanged = (
    before?.stripeAccountId !== after?.stripeAccountId ||
    (before as any)?.stripeDetailsSubmitted !== (after as any)?.stripeDetailsSubmitted ||
    (before as any)?.stripeAccountCreationDate !== (after as any)?.stripeAccountCreationDate ||
    (before as any)?.stripeAccountError !== (after as any)?.stripeAccountError ||
    (before as any)?.stripeRepresentativePersonId !== (after as any)?.stripeRepresentativePersonId
  ) && (
    // Keine relevanten Benutzerdaten wurden geändert
    before?.email === after?.email &&
    before?.step1?.email === after?.step1?.email &&
    before?.step2?.companyName === after?.step2?.companyName &&
    before?.step4?.iban === after?.step4?.iban
  );

  if (onlyStripeFieldsChanged) {
    loggerV2.info(`${userId}: Nur Stripe-Felder geändert, Trigger-Loop verhindert.`);
    return null;
  }

  // Die Logik für den Emulator-Modus wird von defineSecret gehandhabt,
  // daher ist keine manuelle isEmulated-Prüfung mehr nötig.
  const stripeKey = STRIPE_SECRET_KEY_TRIGGERS.value();
  const localStripe = getStripeInstance(stripeKey);

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
  } catch (error: unknown) {
    if (error instanceof Error) {
      loggerV2.error(`Fehler Erstellung Stripe Account (Trigger Fallback) für ${userId}:`, error.message, error);
    } else {
      loggerV2.error(`Fehler Erstellung Stripe Account (Trigger Fallback) für ${userId}:`, String(error));
    }
    await db.collection("users").doc(userId).update({
      stripeAccountError: error instanceof Error ? error.message : String(error),
    }).catch((dbErr: unknown) => {
      if (dbErr instanceof Error) {
        loggerV2.error(`DB-Fehler Speichern Stripe-Fehler (Trigger Fallback) für ${userId}:`, dbErr.message, dbErr);
      } else {
        loggerV2.error(`DB-Fehler Speichern Stripe-Fehler (Trigger Fallback) für ${userId}:`, String(dbErr));
      }
    });
    return null;
  }
});