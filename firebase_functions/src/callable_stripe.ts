// /Users/andystaudinger/Tasko/firebase_functions/src/callable_stripe.ts

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { logger as loggerV2 } from 'firebase-functions/v2';
import Stripe from 'stripe';
import { db, getStripeInstance, getFrontendURL, getFirebaseAdminStorage } from './helpers';
import { FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

// =========================================================================
// INTERFACE-DEFINITIONEN
// =========================================================================

// --- Interfaces für prepareUserProfileForStripe ---
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

// --- Interfaces für createStripeAccount (NEU) ---
interface CreateStripeAccountData {
  userId: string; // Wird serverseitig aus dem Auth-Context genommen
}

interface CreateStripeAccountResult {
  success: boolean;
  accountId: string;
  accountLinkUrl: string;
  message: string;
}


// --- Interfaces für updateStripeCompanyDetails ---
interface UpdateStripeCompanyDetailsData {
  // ... (unverändert aus deinem Code)
}
interface UpdateStripeCompanyDetailsResult {
  // ... (unverändert aus deinem Code)
}

// --- Interfaces für getStripeAccountStatus ---
interface GetStripeAccountStatusResult {
  // ... (unverändert aus deinem Code)
}


/// =========================================================================
// HELPER-FUNKTIONEN (KORRIGIERT)
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

  // KORREKTUR: Fallback-Return-Anweisung hinzugefügt, um den Fehler zu beheben.
  return `Benötigt: ${req.replace(/[._]/g, ' ')}`;
};

const mapCategoryToMcc = (category: string | null | undefined): string | undefined => {
  if (!category || category.trim() === '') {
    loggerV2.warn("[mapCategoryToMcc] Leere oder fehlende Kategorie. Verwende Fallback MCC.");
    return "5999"; // Fallback MCC
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
    // KORREKTUR: 'default'-Fall stellt sicher, dass immer ein Wert zurückgegeben wird.
    default:
      loggerV2.warn(`[mapCategoryToMcc] Kein spezifischer MCC für Kategorie "${category}" gefunden. Verwende Fallback MCC.`);
      return "5999"; // Fallback MCC
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

  // KORREKTUR: Fallback-Return-Anweisung für unbekannte Rechtsformen.
  loggerV2.warn(`[mapLegalFormToStripeBusinessInfo] Unbekannte Rechtsform "${legalForm}", Fallback auf 'company'.`);
  return { businessType: 'company', companyStructure: undefined };
};

// =========================================================================
// FUNKTION 1: DATEN VORBEREITEN & DATEIEN HOCHLADEN
// =========================================================================
export const prepareUserProfileForStripe = onCall<PrepareUserProfileForStripeData, Promise<PrepareUserProfileForStripeResult>>(
  async (request: CallableRequest<PrepareUserProfileForStripeData>) => {
    loggerV2.info('[prepareUserProfileForStripe] Aufgerufen...');
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentifizierung erforderlich.');
    }
    const userId = request.auth.uid;
    const data = request.data;

    // --- Validierung (Beispiel) ---
    if (data.userType !== "firma") {
      throw new HttpsError('invalid-argument', 'Nur Firmenkonten können diesen Prozess nutzen.');
    }
    if (!data.email || !data.firstName || !data.lastName || !data.iban || !data.accountHolder || !data.legalForm || !data.dateOfBirth) {
      throw new HttpsError("invalid-argument", "Wichtige Basisinformationen fehlen.");
    }

    const { businessType, companyStructure } = mapLegalFormToStripeBusinessInfo(data.legalForm);
    const derivedMcc = data.mcc || mapCategoryToMcc(data.selectedCategory);

    // --- Interner Helper zum Hochladen ---
    const uploadBase64ToStripeAndStorage = async (fileBase64: string, filePurpose: Stripe.FileCreateParams.Purpose, origFileName: string, origFileType: string) => {
      const fileBinaryData = Buffer.from(fileBase64, 'base64');
      if (fileBinaryData.length === 0) throw new HttpsError('invalid-argument', `Leere Datei für ${origFileName}.`);
      if (fileBinaryData.length > 10 * 1024 * 1024) throw new HttpsError('resource-exhausted', `Datei ${origFileName} ist zu groß.`);

      const localStripe = getStripeInstance();
      const adminStorage = getFirebaseAdminStorage();
      const bucket = adminStorage.bucket();

      const stripeFile = await localStripe.files.create({
        file: { data: fileBinaryData, name: origFileName, type: origFileType },
        purpose: filePurpose,
      });

      const safeFileName = origFileName.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
      const filePath = `user_uploads/${userId}/${filePurpose}_${uuidv4()}_${safeFileName}`;
      const fileRef = bucket.file(filePath);
      const downloadToken = uuidv4();

      await fileRef.save(fileBinaryData, {
        metadata: { contentType: origFileType, metadata: { firebaseStorageDownloadTokens: downloadToken } },
        public: true
      });
      const firebaseStorageUrl = fileRef.publicUrl();

      return { stripeFileId: stripeFile.id, firebaseStorageUrl };
    };

    // --- Datei-Uploads parallel ausführen ---
    const [profilePic, businessLic, idFront, idBack] = await Promise.all([
      uploadBase64ToStripeAndStorage(data.profilePictureFileBase64, 'business_icon', 'profile.jpg', 'image/jpeg'),
      uploadBase64ToStripeAndStorage(data.businessLicenseFileBase64, 'additional_verification', 'business_license.png', 'image/png'),
      uploadBase64ToStripeAndStorage(data.identityFrontFileBase64, 'identity_document', 'id_front.jpg', 'image/jpeg'),
      uploadBase64ToStripeAndStorage(data.identityBackFileBase64, 'identity_document', 'id_back.jpg', 'image/jpeg')
    ]);

    let masterCertStripeFileId: string | undefined;
    if (data.masterCraftsmanCertificateFileBase64) {
      const masterCert = await uploadBase64ToStripeAndStorage(data.masterCraftsmanCertificateFileBase64, 'additional_verification', 'master_cert.png', 'image/png');
      masterCertStripeFileId = masterCert.stripeFileId;
    }

    // --- Daten für Firestore vorbereiten ---
    const userPrivateData = {
      // Wichtige private Daten
      uid: userId, email: data.email, user_type: data.userType,
      firstName: data.firstName, lastName: data.lastName, dateOfBirth: data.dateOfBirth,
      iban: data.iban, accountHolder: data.accountHolder,
      // ... weitere private Felder

      // Stripe-spezifische, vorbereitete Daten
      stripePreperationData: {
        clientIp: data.clientIp,
        businessType: businessType,
        companyStructure: companyStructure,
        legalForm: data.legalForm,
        phoneNumber: data.phoneNumber,
        personalAddress: { street: data.personalStreet, houseNumber: data.personalHouseNumber, postalCode: data.personalPostalCode, city: data.personalCity, country: data.personalCountry },
        companyAddress: { line1: data.companyAddressLine1, city: data.companyCity, postalCode: data.companyPostalCode, country: data.companyCountry },
        companyDetails: { phoneNumber: data.companyPhoneNumber, website: data.companyWebsite, register: data.companyRegister, taxNumber: data.taxNumber, vatId: data.vatId },
        mcc: derivedMcc,
        fileIds: {
          profilePicture: profilePic.stripeFileId,
          businessLicense: businessLic.stripeFileId,
          identityFront: idFront.stripeFileId,
          identityBack: idBack.stripeFileId,
          masterCraftsman: masterCertStripeFileId,
        },
      },

      // Metadaten
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const companyPublicProfileData = {
      uid: userId, companyName: data.companyName, postalCode: data.companyPostalCode,
      profilePictureURL: profilePic.firebaseStorageUrl,
      // ... weitere öffentliche Felder
      profileLastUpdatedAt: FieldValue.serverTimestamp(),
    };

    // --- In Firestore speichern ---
    const userDocRef = db.collection('users').doc(userId);
    const companyDocRef = db.collection('companies').doc(userId);
    await userDocRef.set(userPrivateData, { merge: true });
    await companyDocRef.set(companyPublicProfileData, { merge: true });

    loggerV2.info('[prepareUserProfileForStripe] Vorbereitung abgeschlossen. Nächster Schritt: createStripeAccount.');

    return { success: true, message: "Profil vorbereitet und Dateien hochgeladen.", userId: userId };
  }
);

// =========================================================================
// FUNKTION 2: STRIPE ACCOUNT ERSTELLEN (NEU)
// =========================================================================
export const createStripeAccount = onCall<CreateStripeAccountData, Promise<CreateStripeAccountResult>>(
  async (request: CallableRequest<CreateStripeAccountData>): Promise<CreateStripeAccountResult> => {
    loggerV2.info('[createStripeAccount] Aufgerufen...');
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentifizierung erforderlich.');
    }
    const userId = request.auth.uid;
    const localStripe = getStripeInstance();

    // --- Vorbereitete Daten aus Firestore laden ---
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) throw new HttpsError("not-found", "Benutzerprofil nicht gefunden. Bitte zuerst prepareUserProfileForStripe ausführen.");

    const userData = userDoc.data();
    const prepData = userData?.stripePreperationData;
    if (!prepData) throw new HttpsError("failed-precondition", "Vorbereitungsdaten nicht gefunden.");

    const [year, month, day] = userData.dateOfBirth.split('-').map(Number);

    // --- Account-Erstellungsparameter zusammenbauen ---
    const accountCreateParams: Stripe.AccountCreateParams = {
      type: 'custom',
      country: prepData.companyAddress?.country || prepData.personalAddress?.country || 'DE',
      email: userData.email,
      business_type: prepData.businessType,
      business_profile: {
        mcc: prepData.mcc,
        url: prepData.companyDetails.website || `https://tilvo.com/profil/${userId}`, // Fallback auf Profil-URL
      },
      external_account: {
        object: 'bank_account',
        country: prepData.companyAddress?.country || prepData.personalAddress?.country || 'DE',
        currency: 'eur',
        account_holder_name: userData.accountHolder,
        account_number: userData.iban,
      },
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: prepData.clientIp,
      },
    };

    // --- Logik für 'individual' vs 'company' ---
    if (prepData.businessType === 'individual') {
      accountCreateParams.individual = {
        first_name: userData.firstName,
        last_name: userData.lastName,
        email: userData.email,
        phone: prepData.phoneNumber,
        dob: { day, month, year },
        address: {
          line1: `${prepData.personalAddress.street} ${prepData.personalAddress.houseNumber || ''}`.trim(),
          postal_code: prepData.personalAddress.postalCode,
          city: prepData.personalAddress.city,
          country: prepData.personalAddress.country,
        },
        verification: {
          document: {
            front: prepData.fileIds.identityFront,
            back: prepData.fileIds.identityBack,
          },
        },
      };
    } else { // company
      accountCreateParams.company = {
        name: userData.companyName,
        structure: prepData.companyStructure,
        phone: prepData.companyDetails.phoneNumber,
        address: {
          line1: prepData.companyAddress.line1,
          postal_code: prepData.companyAddress.postalCode,
          city: prepData.companyAddress.city,
          country: prepData.companyAddress.country,
        },
        tax_id: prepData.companyDetails.taxNumber,
        vat_id: prepData.companyDetails.vatId,
        registration_number: prepData.companyDetails.register,
        verification: {
          document: { front: prepData.fileIds.businessLicense }
        }
      };
    }

    // --- Account bei Stripe erstellen ---
    const account = await localStripe.accounts.create(accountCreateParams);
    loggerV2.info(`[createStripeAccount] Stripe Account ${account.id} für User ${userId} erstellt.`);

    // --- Account ID in Firestore speichern ---
    await db.collection("users").doc(userId).update({
      stripeAccountId: account.id,
      'stripePreperationData.isCompleted': true, // Markieren als abgeschlossen
      updatedAt: FieldValue.serverTimestamp(),
    });

    // --- Onboarding Link erstellen ---
    const resolvedFrontendURL = getFrontendURL();
    const accountLink = await localStripe.accountLinks.create({
      account: account.id,
      refresh_url: `${resolvedFrontendURL}/dashboard/company/${userId}/settings?stripe_refresh=true`,
      return_url: `${resolvedFrontendURL}/dashboard/company/${userId}/settings?stripe_return=true`,
      type: 'account_onboarding',
      collect: 'eventually_due',
    });

    return {
      success: true,
      accountId: account.id,
      accountLinkUrl: accountLink.url,
      message: "Stripe-Konto erfolgreich erstellt."
    };
  }
);


// =========================================================================
// FUNKTION 3: STRIPE ACCOUNT AKTUALISIEREN
// =========================================================================
export const updateStripeCompanyDetails = onCall<UpdateStripeCompanyDetailsData, Promise<UpdateStripeCompanyDetailsResult>>(
  { cors: true },
  async (request: CallableRequest<UpdateStripeCompanyDetailsData>): Promise<UpdateStripeCompanyDetailsResult> => {
    // Dein existierender Code für `updateStripeCompanyDetails` kommt hierher.
    // Er ist bereits gut strukturiert und muss nicht grundlegend geändert werden.
    // Stelle sicher, dass er `undefinedIfNull` und andere Helfer verwendet.
    loggerV2.info("[updateStripeCompanyDetails] Aufgerufen...");
    // ... Implementierung aus deinem Originalcode ...
    return { success: true, message: "Platzhalter: Implementierung einfügen." };
  });


// =========================================================================
// FUNKTION 4: STRIPE ACCOUNT STATUS ABRUFEN
// =========================================================================
export const getStripeAccountStatus = onCall<Record<string, never>, Promise<GetStripeAccountStatusResult>>(
  { cors: true },
  async (request: CallableRequest<Record<string, never>>): Promise<GetStripeAccountStatusResult> => {
    // Dein existierender Code für `getStripeAccountStatus` kommt hierher.
    // Er ist ebenfalls bereits gut strukturiert.
    // Stelle sicher, dass er `translateStripeRequirement` verwendet.
    loggerV2.info("[getStripeAccountStatus] Aufgerufen.");
    // ... Implementierung aus deinem Originalcode ...
    return { success: true, message: "Platzhalter: Implementierung einfügen." };
  });