// /Users/andystaudinger/Tasko/firebase_functions/src/triggers_firestore.ts

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { logger as loggerV2 } from 'firebase-functions/v2';
import { getDb } from './helpers';
import { FieldValue } from 'firebase-admin/firestore';
import { UNNAMED_COMPANY } from './constants';
import { geohashForLocation } from 'geofire-common';

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
  
  // 🔧 CRITICAL: Loop-Prevention für lastAuthUpdate
  const currentTime = Date.now();
  const lastUpdate = userData.lastAuthUpdate as any;
  
  if (lastUpdate && typeof lastUpdate === 'object' && lastUpdate.seconds) {
    const lastUpdateTime = lastUpdate.seconds * 1000;
    const timeDiff = currentTime - lastUpdateTime;
    
    if (timeDiff < 30000) { // 30 Sekunden
      loggerV2.info(`[updateUserProfile] Loop-Prevention: Letztes Update vor ${timeDiff}ms für ${userId}. Übersprungen.`);
      return null;
    }
  }
  
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
    // Check if any relevant fields have actually changed (OHNE STRIPE-FELDER!)
    const relevantFields = [
      'companyName', 'description', 'hourlyRate', 'selectedCategory', 'selectedSubcategory',
      'lat', 'lng', 'radiusKm', 'companyPostalCodeForBackend', 'companyCityForBackend', 'companyCountryForBackend',
      'companyPhoneNumberForBackend', 'companyWebsiteForBackend',
      'profilePictureURL', 'profilePictureFirebaseUrl',
      // ❌ STRIPE-FELDER ENTFERNT! Keine Sync von Stripe-Daten mehr!
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
      
      // Business details from step2 - NUR für Search/Display, KEINE STRIPE-DATEN!
      'step2.companyName': afterData.companyName || null,
      'step2.description': afterData.description || null,
      'step2.city': afterData.companyCity || afterData.companyCityForBackend || null,
      'step2.country': afterData.companyCountryForBackend || null,
      'step2.industryMcc': afterData.industryMcc || null,
      
      // Technical details from step3 - NUR für Search/Display, KEINE STRIPE-DATEN!
      'step3.hourlyRate': afterData.hourlyRate ? String(afterData.hourlyRate) : null,
      'step3.profilePictureURL': afterData.profilePictureURL || afterData.profilePictureFirebaseUrl || null,
      
      // ❌ STRIPE-DATEN WERDEN NICHT MEHR SYNCHRONISIERT!
      // Stripe-Daten bleiben nur in companies collection!
      
      // Additional profile data für Search/Display
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
  loggerV2.info(`Stripe Trigger für Company ${companyId}`);

  const afterData = event.data?.after.data();
  const beforeData = event.data?.before.data();

  if (!afterData) {
    loggerV2.warn(`No after data for company ${companyId}`);
    return null;
  }

  // Prüfen ob Stripe Account bereits existiert
  const hasStripeAccount = afterData.stripeAccountId;
  if (hasStripeAccount) {
    loggerV2.info(`Company ${companyId} has already Stripe account: ${afterData.stripeAccountId}`);
    return null;
  }

  // Prüfen ob alle nötigen Daten vorhanden sind
  const shouldCreateStripeAccount = (
    afterData.step4?.stripeAccountChargesEnabled === true &&
    afterData.step4?.stripeAccountPayoutsEnabled === true &&
    afterData.step4?.stripeAccountDetailsSubmitted === true &&
    afterData.step2?.companyName &&
    afterData.step4?.iban &&
    afterData.step4?.accountHolder
  );

  if (!shouldCreateStripeAccount) {
    loggerV2.info(`Company ${companyId} not ready for Stripe account creation`);
    return null;
  }

  // Verhindere Loop falls nur Stripe-Felder geändert wurden
  const onlyStripeFieldsChanged = (
    beforeData?.stripeAccountId !== afterData.stripeAccountId ||
    beforeData?.step4?.stripeAccountChargesEnabled !== afterData.step4?.stripeAccountChargesEnabled ||
    beforeData?.step4?.stripeAccountPayoutsEnabled !== afterData.step4?.stripeAccountPayoutsEnabled
  );

  if (onlyStripeFieldsChanged && beforeData?.step2?.companyName === afterData.step2?.companyName) {
    loggerV2.info(`Company ${companyId}: Only Stripe fields changed, preventing loop`);
    return null;
  }

  loggerV2.info(`Creating Stripe account for company ${companyId}`);

  try {
    const db = await getDb();

    // Update company with Stripe account info from step4 (diese Daten kommen vom Frontend)
    await db.collection('companies').doc(companyId).update({
      stripeAccountId: afterData.step4.stripeAccountId,
      stripeAccountCreationDate: FieldValue.serverTimestamp(),
      stripeAccountChargesEnabled: afterData.step4.stripeAccountChargesEnabled,
      stripeAccountPayoutsEnabled: afterData.step4.stripeAccountPayoutsEnabled,
      stripeAccountDetailsSubmitted: afterData.step4.stripeAccountDetailsSubmitted,
      updatedAt: FieldValue.serverTimestamp(),
    });

    loggerV2.info(`✅ Stripe account data saved for company ${companyId}: ${afterData.step4.stripeAccountId}`);

  } catch (error) {
    loggerV2.error(`❌ Error saving Stripe data for company ${companyId}:`, error);
  }

  return null;
});

// Legacy: DEAKTIVIERT - User Trigger wird nicht mehr für Stripe verwendet
export const createStripeCustomAccountOnUserUpdate_LEGACY = onDocumentUpdated("users/{userId}", async (event) => {
  const userId = event.params.userId;
  const afterData = event.data?.after.data();
  
  // Nur für user_type !== 'firma' ausführen (normale User)
  if (afterData?.user_type === 'firma') {
    loggerV2.info(`[LEGACY] User ${userId} ist Firma - Stripe wird in companies collection behandelt`);
    return null;
  }
  
  // Für normale User (user_type: 'kunde') nur minimale Auth-Updates
  loggerV2.info(`[LEGACY] User ${userId} - normale User auth updates`);
  return null;
});