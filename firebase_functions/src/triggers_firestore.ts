// /Users/andystaudinger/Tasko/firebase_functions/src/triggers_firestore.ts

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { logger as loggerV2 } from 'firebase-functions/v2';
import { getDb } from './helpers';
import { FieldValue } from 'firebase-admin/firestore';
import { UNNAMED_COMPANY } from './constants';
import { geohashForLocation } from 'geofire-common';
import { debounceFirestoreTrigger, incrementOperationCount } from './pub-sub-optimization';

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

/**
 * COST-OPTIMIZED: User profile creation with debouncing
 */
export const createUserProfile = onDocumentCreated({
  document: "users/{userId}",
  region: "europe-west1",
  memory: "256MiB", // Erhöht von 128MiB wegen Memory-Limit-Überschreitungen
  timeoutSeconds: 60
}, async (event) => {
  incrementOperationCount();
  
  return debounceFirestoreTrigger(
    `create_user_${event.params.userId}`,
    async () => {
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
          user_type: userData.user_type || 'kunde', // FIXED: Standard ist 'kunde', nicht 'firma'
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
    },
    1000 // 1 second debounce
  );
});

/**
 * COST-OPTIMIZED: Company profile creation with debouncing
 */
export const createCompanyProfile = onDocumentCreated({
  document: "companies/{companyId}",
  region: "europe-west1",
  memory: "256MiB", // More memory for company processing
  timeoutSeconds: 120
}, async (event) => {
  incrementOperationCount();
  
  return debounceFirestoreTrigger(
    `create_company_${event.params.companyId}`,
    async () => {
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
    },
    1500 // 1.5 second debounce for companies
  );
});

/**
 * COST-OPTIMIZED: User profile update with debouncing
 */
export const updateUserProfile = onDocumentUpdated({
  document: "users/{userId}",
  region: "europe-west1",
  memory: "256MiB", // Erhöht von 128MiB wegen Memory-Limit-Überschreitungen
  timeoutSeconds: 60
}, async (event) => {
  incrementOperationCount();
  
  return debounceFirestoreTrigger(
    `update_user_${event.params.userId}`,
    async () => {
      const userId = event.params.userId;
      const snapshotAfter = event.data?.after;
      
      if (!snapshotAfter) {
        loggerV2.warn(`[updateUserProfile] Kein Daten-Snapshot nach Update für User ${userId}. Abbruch.`);
        return;
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
          return;
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
    },
    2000 // 2 second debounce for user updates
  );
});

/**
 * COST-OPTIMIZED: Company profile update with debouncing
 */
export const updateCompanyProfile = onDocumentUpdated({
  document: "companies/{companyId}",
  region: "europe-west1",
  memory: "256MiB",
  timeoutSeconds: 120
}, async (event) => {
  incrementOperationCount();
  
  return debounceFirestoreTrigger(
    `update_company_${event.params.companyId}`,
    async () => {
      const companyId = event.params.companyId;
      const snapshotBefore = event.data?.before;
      const snapshotAfter = event.data?.after;
      
      if (!snapshotAfter) {
        loggerV2.warn(`[updateCompanyProfile] Kein Daten-Snapshot nach Update für Company ${companyId}. Abbruch.`);
        return;
      }
      
      const db = await getDb();
      const companyData = snapshotAfter.data() as FirmaUserData;
      const previousData = snapshotBefore?.data() as FirmaUserData;
      
      if (typeof companyData !== "object" || companyData === null) {
        loggerV2.warn(`[updateCompanyProfile] Company-Daten für ${companyId} nach Update ungültig. Abbruch.`);
        return;
      }

      // CRITICAL: Verhindere Endlosschleife - Zeit-basierte Prevention
      const currentTime = Date.now();
      const lastUpdate = (companyData as any)?.profileLastUpdatedAt?._seconds * 1000 || 0;
      
      // Wenn das letzte Update weniger als 10 Sekunden her ist, breche ab
      if (currentTime - lastUpdate < 10000) {
        loggerV2.info(`[updateCompanyProfile] ${companyId}: Update zu kürzlich (${Math.round((currentTime - lastUpdate)/1000)}s), Trigger-Loop verhindert.`);
        return;
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
        return;
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
    },
    3000 // 3 second debounce for company updates
  );
});

export const syncCompanyToUserOnUpdate = onDocumentUpdated({
  document: "companies/{companyId}",
  region: "europe-west1"
}, async (event) => {
  const companyId = event.params.companyId;
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();
  
  if (!afterData) {
    loggerV2.warn(`[syncCompanyToUserOnUpdate] No after data for company ${companyId}`);
    return null;
  }

  // Prüfe ob relevante Felder geändert wurden
  const relevantFields = [
    'status', 'profileStatus', 'accountStatus', 'suspended', 'blocked',
    'companyName', 'companyStreet', 'companyHouseNumber', 'companyCity', 
    'companyPostalCode', 'companyCountry', 'vatId', 'taxNumber', 
    'iban', 'bic', 'bankName', 'industry', 'legalForm',
    'step2' // Für contactPerson firstName/lastName
  ];

  const hasRelevantChanges = relevantFields.some(field => {
    const before = beforeData?.[field];
    const after = afterData?.[field];
    return JSON.stringify(before) !== JSON.stringify(after);
  });

  if (!hasRelevantChanges) {
    loggerV2.info(`[syncCompanyToUserOnUpdate] No relevant changes for company ${companyId} - skipping Hetzner sync`);
    return null;
  }

  // Finde die Taskilo E-Mail für dieses Unternehmen
  const taskiloEmail = afterData.step5?.taskiloEmail || afterData.step6?.taskiloEmail || afterData.taskiloEmail;
  
  if (!taskiloEmail || !taskiloEmail.endsWith('@taskilo.de')) {
    loggerV2.info(`[syncCompanyToUserOnUpdate] No Taskilo email for company ${companyId} - skipping Hetzner sync`);
    return null;
  }

  // Sync zu Hetzner
  try {
    const WEBMAIL_API_URL = process.env.WEBMAIL_API_URL || 'https://mail.taskilo.de';
    
    // Contact Person aus step2
    const contactPerson = afterData.step2?.contactPerson || {};
    
    const syncPayload = {
      email: taskiloEmail,
      companyId: companyId,
      companyData: {
        companyName: afterData.companyName || '',
        street: afterData.companyStreet || afterData.street || '',
        houseNumber: afterData.companyHouseNumber || afterData.houseNumber || '',
        city: afterData.companyCity || afterData.city || '',
        zip: afterData.companyPostalCode || afterData.postalCode || '',
        country: afterData.companyCountry || afterData.country || 'DE',
        vatId: afterData.vatId || '',
        taxNumber: afterData.taxNumber || '',
        iban: afterData.iban || '',
        bic: afterData.bic || '',
        bankName: afterData.bankName || '',
        industry: afterData.industry || afterData.selectedCategory || '',
        legalForm: afterData.legalForm || '',
        phone: afterData.phone || afterData.phoneNumber || '',
        website: afterData.website || afterData.companyWebsite || '',
        accountHolder: afterData.accountHolder || '',
        firstName: contactPerson.firstName || afterData.firstName || '',
        lastName: contactPerson.lastName || afterData.lastName || '',
        // Account Status
        accountStatus: afterData.status || afterData.profileStatus || 'active',
        suspended: afterData.suspended === true,
        blocked: afterData.blocked === true,
      },
    };

    loggerV2.info(`[syncCompanyToUserOnUpdate] Syncing company ${companyId} to Hetzner for ${taskiloEmail}`);

    const response = await fetch(`${WEBMAIL_API_URL}/api/profile/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncPayload),
    });

    if (response.ok) {
      const result = await response.json();
      loggerV2.info(`[syncCompanyToUserOnUpdate] Hetzner sync successful for ${taskiloEmail}:`, result);
    } else {
      const errorText = await response.text();
      loggerV2.error(`[syncCompanyToUserOnUpdate] Hetzner sync failed for ${taskiloEmail}: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    loggerV2.error(`[syncCompanyToUserOnUpdate] Error syncing to Hetzner for company ${companyId}:`, error);
  }

  return null;
});

// ❌ ALLE SYNC-FUNKTIONEN DEAKTIVIERT - STRIKTE TRENNUNG ZWISCHEN COLLECTIONS
// Keine Firmendaten mehr in users collection!