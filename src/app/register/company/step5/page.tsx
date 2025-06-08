// /Users/andystaudinger/tasko/src/app/register/company/step5/page.tsx
'use client';
import Image from 'next/image';

import React, { ChangeEvent, Dispatch, SetStateAction, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProgressBar from '@/components/ProgressBar';
import { FiX, FiCheckCircle, FiAlertCircle, FiLoader } from 'react-icons/fi';
import { useRegistration } from '@/components/Registration-Context';
import { getAuth, createUserWithEmailAndPassword, UserCredential, User as AuthUser } from 'firebase/auth';
// WICHTIG: getDoc hinzugefügt
import { doc, setDoc, serverTimestamp, deleteField, updateDoc, FieldValue, getDoc } from 'firebase/firestore';
import { db, app as firebaseApp } from '../../../../firebase/clients';
import { getFunctions, httpsCallable, FunctionsError } from 'firebase/functions';
import { PAGE_ERROR, PAGE_WARN } from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/lib/constants';
import type Stripe from 'stripe';

interface CreateStripeAccountCallableResult {
  success: boolean;
  accountId?: string;
  message?: string;
  accountLinkUrl?: string;
  missingFields?: string[];
  personId?: string;
  detailsSubmitted?: boolean;
  payoutsEnabled?: boolean;
}

interface FileUploadResult {
  stripeFileId: string;
  firebaseStorageUrl?: string;
  firebaseStoragePath?: string;
}

interface CreateStripeAccountClientData {
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
  companyName?: string;
  legalForm?: string | null;
  companyAddressLine1?: string; companyCity?: string;
  companyPostalCode?: string; companyCountry?: string | null;
  companyPhoneNumber?: string;
  companyWebsite?: string;
  companyRegister?: string;
  taxNumber?: string;
  vatId?: string;
  mcc?: string;
  iban?: string; accountHolder?: string;
  profilePictureFileId?: string;
  businessLicenseFileId?: string;
  masterCraftsmanCertificateFileId?: string;
  identityFrontFileId?: string;
  identityBackFileId?: string;
}

type GetClientIpData = Record<string, never>;
type GetClientIpResult = { ip: string; };
type FilePurpose = Stripe.FileCreateParams.Purpose;

const MAX_ID_DOC_SIZE_BYTES = 8 * 1024 * 1024;
const WEBP_QUALITY = 0.8;

export default function Step5CompanyPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStepMessage, setCurrentStepMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const [identityFrontPreview, setIdentityFrontPreview] = useState<string | null>(null);
  const [identityBackPreview, setIdentityBackPreview] = useState<string | null>(null);
  const [isConvertingImage, setIsConvertingImage] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const router = useRouter();
  const registration = useRegistration();
  const {
    firstName, lastName, email, password,
    companyName,
    legalForm,
    companyStreet, companyHouseNumber, companyPostalCode, companyCity, companyCountry,
    companyPhoneNumber,
    companyWebsite,
    lat, lng, radiusKm,
    selectedCategory,
    selectedSubcategory,
    profilePictureFile, businessLicenseFile, masterCraftsmanCertificateFile,
    identityFrontFile, setIdentityFrontFile,
    identityBackFile, setIdentityBackFile,
    hourlyRate,
    companyRegister,
    taxNumber,
    vatId,
    phoneNumber,
    iban, setIban,
    accountHolder, setAccountHolder,
    dateOfBirth,
    personalStreet, personalHouseNumber, personalPostalCode, personalCity, personalCountry,
    isManagingDirectorOwner,
    ownershipPercentage,
    isActualDirector,
    isActualOwner,
    actualOwnershipPercentage,
    isActualExecutive,
    actualRepresentativeTitle,
    resetRegistrationData
  } = registration;

  useEffect(() => {
    const initPreview = (fileFromContext: File | object | null | undefined, currentLocalPreview: string | null, setLocalPreview: Dispatch<SetStateAction<string | null>>) => {
      if (fileFromContext instanceof File) {
        if (!currentLocalPreview) {
          try {
            const newUrl = URL.createObjectURL(fileFromContext);
            setLocalPreview(newUrl);
          } catch (e: unknown) { console.error(PAGE_ERROR, "Preview Fehler (Init Step5)", { error: e instanceof Error ? e.message : String(e), fileName: fileFromContext?.name }); }
        }
      } else {
        if (currentLocalPreview) {
          URL.revokeObjectURL(currentLocalPreview);
          setLocalPreview(null);
        }
      }
    };
    initPreview(identityFrontFile, identityFrontPreview, setIdentityFrontPreview);
    initPreview(identityBackFile, identityBackPreview, setIdentityBackPreview);
  }, [identityFrontFile, identityBackFile, identityFrontPreview, identityBackPreview]);

  useEffect(() => {
    const localPreviews = [identityFrontPreview, identityBackPreview];
    return () => {
      localPreviews.forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [identityFrontPreview, identityBackPreview]);

  const mapCategoryToMcc = useCallback((category: string | null | undefined): string | undefined => {
    // NEUE LOGIK: Behandle leere Strings hier direkt
    if (!category || category.trim() === '') {
      console.warn(PAGE_WARN, `[mapCategoryToMcc] Leere oder fehlende Kategorie. Verwende Fallback MCC.`);
      return "5999"; // Fallback MCC für "Allgemeine Dienstleistungen"
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
        console.warn(PAGE_WARN, `[mapCategoryToMcc] Kein spezifischer MCC für Kategorie "${category}" gefunden. Verwende Fallback MCC.`);
        return "5999"; // Fallback MCC für "Allgemeine Dienstleistungen"
    }
  }, []);

  const convertImageToWebP = useCallback(async (file: File, quality: number): Promise<File | null> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/') || file.type === 'image/webp' || (file.type !== 'image/jpeg' && file.type !== 'image/png')) {
        resolve(file); return;
      }
      setIsConvertingImage(true);
      setFormError(null);
      const reader = new FileReader();
      reader.onload = (event) => { // event ist vom Typ ProgressEvent<FileReader>
        const img = new window.Image(); // Explizit window.Image verwenden
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width; canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { console.error(PAGE_ERROR, "Canvas 2D Context nicht bekommen."); setIsConvertingImage(false); resolve(file); return; }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              setIsConvertingImage(false);
              if (blob) {
                const nameWithoutExtension = file.name.lastIndexOf('.') > 0 ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name;
                const webpFile = new File([blob], `${nameWithoutExtension}.webp`, { type: 'image/webp', lastModified: Date.now() });
                resolve(webpFile);
              } else { console.error(PAGE_ERROR, "Fehler bei canvas.toBlob, Blob ist null."); resolve(file); }
            }, 'image/webp', quality
          );
        };
        img.onerror = () => { console.error(PAGE_ERROR, "Bild konnte nicht geladen werden für Konvertierung."); setIsConvertingImage(false); resolve(file); };
        if (event.target?.result && typeof event.target.result === 'string') { img.src = event.target.result; }
        else { setIsConvertingImage(false); resolve(file); }
      };
      reader.onerror = () => { console.error(PAGE_ERROR, "Datei konnte nicht gelesen werden für Konvertierung."); setIsConvertingImage(false); resolve(file); };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileChangeAndPreview = useCallback(async (
    e: ChangeEvent<HTMLInputElement>,
    fileContextSetter: Dispatch<SetStateAction<File | null>>,
    localPreviewSetter: Dispatch<SetStateAction<string | null>>,
    maxSizeBytes?: number, fileTypeForAlert?: string, attemptWebPConversion: boolean = false): Promise<void> => {
    const inputFile = e.target.files?.[0] || null; // KORREKTUR: Geändert zu const
    let processedFile: File | null = inputFile;

    setFormError(null);

    localPreviewSetter(prevLocalPreviewUrl => {
      if (prevLocalPreviewUrl) URL.revokeObjectURL(prevLocalPreviewUrl);
      return null;
    });

    if (inputFile) {
      setIsProcessingImage(true);
      if (attemptWebPConversion && (inputFile.type === 'image/jpeg' || inputFile.type === 'image/png')) {
        const convertedFile = await convertImageToWebP(inputFile, WEBP_QUALITY);
        if (convertedFile) processedFile = convertedFile;
      }
      if (maxSizeBytes && processedFile && processedFile.size > maxSizeBytes) {
        setFormError(`Die Datei für "<span class="math-inline">\{fileTypeForAlert \|\| 'diesen Upload'\}" \(</span>{processedFile.name}) ist zu groß (${(processedFile.size / (1024 * 1024)).toFixed(2)}MB). Max. ${(maxSizeBytes / (1024 * 1024)).toFixed(2)}MB.`);
        fileContextSetter(null); if (e.target) e.target.value = '';
        setIsProcessingImage(false);
        return;
      }
      fileContextSetter(processedFile);
      if (processedFile && typeof URL !== 'undefined' && URL.createObjectURL) {
        try { localPreviewSetter(URL.createObjectURL(processedFile)); }
        catch (urlError: unknown) { console.error(PAGE_ERROR, "[Step5] Fehler beim Erstellen der ObjectURL für Preview:", urlError instanceof Error ? urlError.message : String(urlError)); localPreviewSetter(null); }
      }
      setIsProcessingImage(false);
    } else {
      fileContextSetter(null);
      setIsProcessingImage(false);
    }
  }, [convertImageToWebP]);

  const uploadFileToStripeAndStorage = useCallback(async (file: File | object | null | undefined, purpose: FilePurpose, fileNameForLog: string, userId: string): Promise<FileUploadResult | null> => {
    if (!file || !(file instanceof File)) {
      setFormError(`Datei für ${fileNameForLog} fehlt oder ist ungültig.`);
      return null;
    }
    setCurrentStepMessage(`Lade ${fileNameForLog} hoch...`);
    const formData = new FormData();
    formData.append('file', file); formData.append('purpose', purpose); formData.append('userId', userId);
    const customUploadUrl = process.env.NEXT_PUBLIC_UPLOAD_STRIPE_FILE_FUNCTION_URL;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tilvo-f142f';
    const functionsEmulatorPort = 5001;

    const uploadUrl = customUploadUrl || (process.env.NODE_ENV === 'development' ?

      `http://localhost:${functionsEmulatorPort}/${projectId}/us-central1/uploadStripeFile` :
      `https://us-central1-${projectId}.cloudfunctions.net/uploadStripeFile`);

    if (!uploadUrl || uploadUrl.includes('undefined') || uploadUrl.includes(':undefined')) {
      throw new Error("Upload URL ist nicht korrekt konfiguriert oder konnte nicht generiert werden.");
    }

    const response = await fetch(uploadUrl, { method: 'POST', body: formData });
    if (!response.ok) { const errTxt = await response.text(); throw new Error(`Upload-Fehler für ${fileNameForLog}: ${response.status} ${errTxt}`); }
    const result = await response.json();
    if (result.success && result.stripeFileId) return { stripeFileId: result.stripeFileId, firebaseStorageUrl: result.firebaseStorageUrl, firebaseStoragePath: result.firebaseStoragePath };
    else throw new Error(result.message || `Upload-Fehler für ${fileNameForLog}.`);
  }, []);

  const isFormValid = useCallback((): boolean => {
    if (!iban?.trim() || !accountHolder?.trim()) return false;
    if (!(identityFrontFile instanceof File) || !(identityBackFile instanceof File)) return false;
    if (!(profilePictureFile instanceof File)) return false;
    if (!hourlyRate || parseFloat(hourlyRate) <= 0) return false;
    if (!(businessLicenseFile instanceof File)) return false;
    if (!legalForm?.trim()) return false;

    const hasPersonalAddr = personalStreet?.trim() && personalPostalCode?.trim() && personalCity?.trim() && personalCountry?.trim();
    const hasCompanyAddr = companyStreet?.trim() && companyPostalCode?.trim() && companyCity?.trim() && companyCountry?.trim();
    const isCapitalCompany = legalForm?.toLowerCase() && (legalForm.toLowerCase().includes("gmbh") || legalForm.toLowerCase().includes("ug") || legalForm.toLowerCase().includes("ag"));

    if (isCapitalCompany && (!personalStreet?.trim() || !personalPostalCode?.trim() || !personalCity?.trim() || !personalCountry?.trim())) return false;
    if (legalForm?.toLowerCase() && (legalForm.toLowerCase().includes("einzelunternehmen") || legalForm.toLowerCase().includes("freiberufler")) && !isCapitalCompany && !hasPersonalAddr && !hasCompanyAddr) return false;
    if (personalCountry && personalCountry.length !== 2) return false;

    const isEK = legalForm?.toLowerCase().includes("e.k.");
    let taxIdValidForLegalForm = false;
    if (isCapitalCompany || isEK) {
      if (companyRegister?.trim()) taxIdValidForLegalForm = true;
    }
    if (!taxIdValidForLegalForm) {
      if (isCapitalCompany || legalForm?.toLowerCase().includes("gbr") || legalForm?.toLowerCase().includes("ohg") || legalForm?.toLowerCase().includes("kg")) {
        if (taxNumber?.trim() || vatId?.trim()) taxIdValidForLegalForm = true;
      } else if (legalForm?.toLowerCase() && (legalForm.toLowerCase().includes("einzelunternehmen") || legalForm.toLowerCase().includes("freiberufler")) && !isEK) {
        if (taxNumber?.trim() || vatId?.trim()) taxIdValidForLegalForm = true;
      } else if (legalForm?.trim() && !isCapitalCompany && !isEK && !legalForm.toLowerCase().includes("gbr") && !legalForm.toLowerCase().includes("ohg") && !legalForm.toLowerCase().includes("kg")) {
        if (companyRegister?.trim() || taxNumber?.trim() || vatId?.trim()) taxIdValidForLegalForm = true;
      }
    }
    if (!taxIdValidForLegalForm) return false;

    return !isLoading && !isConvertingImage && !isProcessingImage;
  }, [
    iban, accountHolder, identityFrontFile, identityBackFile, isLoading, isConvertingImage,
    profilePictureFile, hourlyRate, businessLicenseFile, legalForm,
    personalStreet, personalPostalCode, personalCity, personalCountry,
    companyStreet, companyPostalCode, companyCity, companyCountry, isProcessingImage,
    companyRegister, taxNumber, vatId
  ]);

  const handleRegistration = async () => {
    setHasAttemptedSubmit(true);
    setFormError(null);

    if (!isFormValid()) {
      const missingFieldsList: string[] = [];
      if (!iban?.trim()) missingFieldsList.push('IBAN');
      if (!accountHolder?.trim()) missingFieldsList.push('Kontoinhaber');
      if (!(identityFrontFile instanceof File)) missingFieldsList.push('Ausweis Vorderseite');
      if (!(identityBackFile instanceof File)) missingFieldsList.push('Ausweis Rückseite');
      if (!(profilePictureFile instanceof File)) missingFieldsList.push('Profilbild');
      if (!hourlyRate || parseFloat(hourlyRate) <= 0) missingFieldsList.push('Stundenpreis (muss > 0 sein)');
      if (!(businessLicenseFile instanceof File)) missingFieldsList.push('Gewerbeschein');
      if (!legalForm?.trim()) missingFieldsList.push('Rechtsform');

      const hasPersonalAddr = personalStreet?.trim() && personalPostalCode?.trim() && personalCity?.trim() && personalCountry?.trim();
      const hasCompanyAddr = companyStreet?.trim() && companyPostalCode?.trim() && companyCity?.trim() && companyCountry?.trim();
      const isCapitalCompany = legalForm?.toLowerCase() && (legalForm.toLowerCase().includes("gmbh") || legalForm.toLowerCase().includes("ug") || legalForm.toLowerCase().includes("ag"));
      const isIndividual = legalForm?.toLowerCase() && (legalForm.toLowerCase().includes("einzelunternehmen") || legalForm.toLowerCase().includes("freiberufler"));

      if (isCapitalCompany && (!personalStreet?.trim() || !personalPostalCode?.trim() || !personalCity?.trim() || !personalCountry?.trim())) {
        missingFieldsList.push('Private Adresse des Geschäftsführers (für Kapitalgesellschaft)');
      } else if (isIndividual && !isCapitalCompany && !hasPersonalAddr && !hasCompanyAddr) {
        missingFieldsList.push('Adresse (Privat- oder Firmenanschrift)');
      }
      if ((personalCountry && personalCountry.length !== 2) || (companyCountry && companyCountry.length !== 2)) {
        missingFieldsList.push('Ländercode muss 2-stellig sein (z.B. DE)');
      }

      const isEK = legalForm?.toLowerCase().includes("e.k.");
      let taxIdProvided = false;
      const taxIdErrors: string[] = [];

      if (isCapitalCompany || isEK) {
        if (!companyRegister?.trim()) taxIdErrors.push('Handelsregisternummer');
        else taxIdProvided = true;
      }
      if (!taxIdProvided) {
        if (isCapitalCompany || legalForm?.toLowerCase().includes("gbr") || legalForm?.toLowerCase().includes("ohg") || legalForm?.toLowerCase().includes("kg")) {
          if (!taxNumber?.trim() && !vatId?.trim()) taxIdErrors.push('Steuernummer ODER USt-IdNr.');
          else taxIdProvided = true;
        } else if (isIndividual && !isEK) {
          if (!taxNumber?.trim() && !vatId?.trim()) taxIdErrors.push('Steuernummer ODER USt-IdNr.');
          else taxIdProvided = true;
        } else if (legalForm?.trim() && !isCapitalCompany && !isIndividual && !isEK && !legalForm.toLowerCase().includes("gbr") && !legalForm.toLowerCase().includes("ohg") && !legalForm.toLowerCase().includes("kg")) {
          if (!companyRegister?.trim() || !taxNumber?.trim() || !vatId?.trim()) taxIdErrors.push('Handelsregisternummer, Steuernummer ODER USt-IdNr.');
          else taxIdProvided = true;
        }
      }
      if (!taxIdProvided && taxIdErrors.length === 0) {
        taxIdErrors.push('Steuerliche Identifikation');
      }
      missingFieldsList.push(...new Set(taxIdErrors));

      setFormError(`Bitte alle erforderlichen Felder ausfüllen: ${[...new Set(missingFieldsList)].join(', ')}.`);
      return;
    }

    setIsLoading(true);
    setCurrentStepMessage('Registrierung wird vorbereitet...');

    const firebaseFunctions = getFunctions(firebaseApp);

    try {
      const derivedMcc = mapCategoryToMcc(selectedCategory);

      const firebaseAuthInstance = getAuth(firebaseApp);
      let authUser: AuthUser | undefined = undefined;

      setCurrentStepMessage('Benutzerkonto wird erstellt...');
      if (!firebaseAuthInstance.currentUser) {
        const userCredential: UserCredential = await createUserWithEmailAndPassword(firebaseAuthInstance, email!, password!);
        authUser = userCredential.user;
      } else {
        authUser = firebaseAuthInstance.currentUser;
      }
      if (!authUser) throw new Error("Benutzer konnte nicht authentifiziert oder erstellt werden.");
      const currentAuthUserUID = authUser.uid;

      setCurrentStepMessage('IP-Adresse wird ermittelt...');
      const getClientIpFunction = httpsCallable<GetClientIpData, GetClientIpResult>(firebaseFunctions, 'getClientIp');
      let clientIpAddress = 'FALLBACK_IP_ADDRESS';
      try {
        const ipResult = await getClientIpFunction({});
        if (ipResult.data?.ip && ipResult.data.ip !== 'IP_NOT_DETERMINED' && ipResult.data.ip.length >= 7) {
          clientIpAddress = ipResult.data.ip;
        } else if (process.env.NODE_ENV === 'development') {
          clientIpAddress = '127.0.0.1';
        }
      } catch (ipLookupError: unknown) {
        console.warn(PAGE_WARN, "[Step5] Fehler beim Ermitteln der Client IP:", ipLookupError);
        if (process.env.NODE_ENV === 'development') {
          clientIpAddress = '127.0.0.1';
        }
      }

      if (!profilePictureFile || !businessLicenseFile || !identityFrontFile || !identityBackFile) {
        throw new Error("Kritische Dateien für den Upload fehlen.");
      }

      const profilePicResult = await uploadFileToStripeAndStorage(profilePictureFile, 'business_icon', 'Profilbild', currentAuthUserUID);
      const businessLicResult = await uploadFileToStripeAndStorage(businessLicenseFile, 'additional_verification', 'Gewerbeschein', currentAuthUserUID);
      const idFrontResult = await uploadFileToStripeAndStorage(identityFrontFile, 'identity_document', 'Ausweis Vorderseite', currentAuthUserUID);
      const idBackResult = await uploadFileToStripeAndStorage(identityBackFile, 'identity_document', 'Ausweis Rückseite', currentAuthUserUID);

      let masterCertStripeFileId: string | undefined = undefined;
      if (masterCraftsmanCertificateFile instanceof File) {
        const masterCertResult = await uploadFileToStripeAndStorage(masterCraftsmanCertificateFile, 'additional_verification', 'Meisterbrief', currentAuthUserUID);
        masterCertStripeFileId = masterCertResult?.stripeFileId;
      }

      if (!profilePicResult?.stripeFileId || !businessLicResult?.stripeFileId || !idFrontResult?.stripeFileId || !idBackResult?.stripeFileId) {
        throw new Error("Ein oder mehrere kritische Datei-Uploads sind fehlgeschlagen.");
      }

      setCurrentStepMessage('Profildaten werden gespeichert...');

      const resolvedCompanyStreet = companyStreet || '';
      const resolvedCompanyHouseNumber = companyHouseNumber || '';

      const fullCompanyAddressForFirestore = `${resolvedCompanyStreet}${resolvedCompanyStreet && resolvedCompanyHouseNumber ? ' ' : ''}${resolvedCompanyHouseNumber}`.trim();

      const frontendAppUrl = process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || 'https://tasko-zh8k.vercel.app';

      // KORREKTUR: Typ von any zu Record<string, unknown> geändert für bessere Typsicherheit
      const userPrivateData: Record<string, unknown> = {
        uid: currentAuthUserUID, email: email!, user_type: 'firma',
        firstName: firstName || '', lastName: lastName || '',
        phoneNumber: phoneNumber || null, dateOfBirth: dateOfBirth || null,
        personalStreet: personalStreet || null, personalHouseNumber: personalHouseNumber || null,
        personalPostalCode: personalPostalCode || null, personalCity: personalCity || null,
        personalCountry: personalCountry || null, isManagingDirectorOwner: isManagingDirectorOwner ?? true,
        ownershipPercentage: ownershipPercentage !== undefined ? ownershipPercentage : deleteField(),
        isActualDirector: isActualDirector ?? deleteField(),
        isActualOwner: isActualOwner ?? deleteField(),
        actualOwnershipPercentage: actualOwnershipPercentage ?? deleteField(),
        isActualExecutive: isActualExecutive ?? deleteField(),
        actualRepresentativeTitle: actualRepresentativeTitle || null,
        iban: iban || '', accountHolder: accountHolder || '',
        bankCountry: companyCountry || personalCountry || 'DE',
        identityFrontUrlStripeId: idFrontResult.stripeFileId,
        identityBackUrlStripeId: idBackResult.stripeFileId, // Korrigierter Variablenname
        businessLicenseStripeId: businessLicResult.stripeFileId,
        masterCraftsmanCertificateStripeId: masterCertStripeFileId || deleteField(),
        companyName: companyName || '', legalForm: legalForm || null,
        companyAddressLine1ForBackend: fullCompanyAddressForFirestore,
        companyCityForBackend: companyCity || null, companyPostalCodeForBackend: companyPostalCode || null,
        companyCountryForBackend: companyCountry || null, companyPhoneNumberForBackend: companyPhoneNumber || null,
        companyWebsiteForBackend: companyWebsite || null, companyRegisterForBackend: companyRegister || null,
        taxNumberForBackend: taxNumber || null, vatIdForBackend: vatId || null,
        lat: lat ?? null, lng: lng ?? null,
        hourlyRate: Number(hourlyRate) || 0, radiusKm: radiusKm ?? 30,
        selectedCategory: selectedCategory || '', selectedSubcategory: selectedSubcategory || '',
        industryMcc: derivedMcc || null,
        profilePictureStripeFileId: profilePicResult.stripeFileId,
        profilePictureFirebaseUrl: profilePicResult.firebaseStorageUrl || null,
        common: {
          tosAcceptanceIp: clientIpAddress,
          tosAcceptanceUserAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'UserAgentNotAvailable',
          registrationCompletedAt: new Date().toISOString(),
        },
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      };

      Object.keys(userPrivateData).forEach(key => {
        if (userPrivateData[key] === undefined && key !== 'ownershipPercentage' && key !== 'isActualDirector' && key !== 'isActualOwner' && key !== 'actualOwnershipPercentage' && key !== 'isActualExecutive' && key !== 'masterCraftsmanCertificateStripeId') {
          userPrivateData[key] = null;
        }
      });


      const companyPublicProfileData: Record<string, unknown> = {
        uid: currentAuthUserUID, companyName: companyName || '', postalCode: companyPostalCode || null,

        tilvoProfileUrl: `${frontendAppUrl}/profil/${currentAuthUserUID}`,
        description: "", hourlyRate: Number(hourlyRate) || 0,
        profilePictureURL: profilePicResult.firebaseStorageUrl || null,
        selectedCategory: selectedCategory || '', selectedSubcategory: selectedSubcategory || '',
        industryMcc: derivedMcc || null,
        lat: lat ?? null, lng: lng ?? null, radiusKm: radiusKm ?? 30,
        profileLastUpdatedAt: serverTimestamp(),
      };

      if (legalForm?.toLowerCase().includes("gmbh") || legalForm?.toLowerCase().includes("ug") || legalForm?.toLowerCase().includes("ag") || legalForm?.toLowerCase().includes("e.k.")) {
        if (companyRegister?.trim()) companyPublicProfileData.companyRegisterPublic = companyRegister;
      }

      console.log(PAGE_WARN, "[Step5] Beginne setDoc für Nutzerdokument...", { userId: currentAuthUserUID });
      await setDoc(doc(db, 'users', currentAuthUserUID), userPrivateData, { merge: true });
      console.log(PAGE_WARN, "[Step5] setDoc für Nutzerdokument abgeschlossen. Überprüfe Existenz...");

      // Debugging-Check: Überprüfen, ob das Dokument existiert, bevor die Callable Function aufgerufen wird
      const checkIfUserDocExists = await getDoc(doc(db, 'users', currentAuthUserUID));
      if (!checkIfUserDocExists.exists()) {
        console.error(PAGE_ERROR, "DEBUG: Benutzerdokument nach setDoc nicht in Firestore gefunden!", { userId: currentAuthUserUID });
        setFormError("Interner Fehler: Benutzerdaten konnten nicht gespeichert werden (Dokument nicht gefunden).");
        setIsLoading(false);
        return; // Brechen Sie hier ab, da das Backend fehlschlagen wird
      }
      console.log(PAGE_WARN, "DEBUG: Benutzerdokument in Firestore gefunden. Fahre fort.");


      await setDoc(doc(db, 'companies', currentAuthUserUID), companyPublicProfileData, { merge: true });
      console.log(PAGE_WARN, "[Step5] setDoc für Firmendokument abgeschlossen.");

      // NEU: Füge eine kleine Verzögerung hinzu, um Firestore-Konsistenz zu gewährleisten (nur für Debugging im Emulator)
      if (process.env.NODE_ENV === 'development') {
        console.log(PAGE_WARN, "[Step5] DEBUG: Füge 500ms Verzögerung für Firestore-Konsistenz im Emulator hinzu...");
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms Verzögerung
        console.log(PAGE_WARN, "[Step5] DEBUG: Verzögerung abgeschlossen, rufe Callable Function auf.");
      }

      setCurrentStepMessage('Zahlungskonto wird bei Stripe eingerichtet...');

      const dataForStripeCallable: CreateStripeAccountClientData = {
        userId: currentAuthUserUID, clientIp: clientIpAddress,
        firstName, lastName, email: email!, phoneNumber, dateOfBirth,
        personalStreet, personalHouseNumber, personalPostalCode, personalCity, personalCountry,
        isManagingDirectorOwner, ownershipPercentage: ownershipPercentage ?? undefined,
        isActualDirector: isActualDirector ?? undefined, isActualOwner: isActualOwner ?? undefined, // KORREKTUR: isActualOwner sollte isActualOwner sein
        actualOwnershipPercentage: actualOwnershipPercentage ?? undefined,
        isActualExecutive: isActualExecutive ?? undefined,
        actualRepresentativeTitle, companyName, legalForm,
        companyAddressLine1: fullCompanyAddressForFirestore,
        companyCity, companyPostalCode, companyCountry,
        companyPhoneNumber, companyWebsite, companyRegister, taxNumber, vatId, mcc: derivedMcc,
        iban, accountHolder,
        profilePictureFileId: profilePicResult.stripeFileId,
        businessLicenseFileId: businessLicResult.stripeFileId,
        masterCraftsmanCertificateFileId: masterCertStripeFileId, // KORREKTUR: Korrekte Variable verwenden
        identityFrontFileId: idFrontResult.stripeFileId,
        identityBackFileId: idBackResult.stripeFileId,
      };

      // KORREKTUR: Falscher Feldname in dataForStripeCallable: isActualOwner
      // Im Frontend-Payload wurde isActualOwner anscheinend falsch gemappt
      // Es sollte sein: isActualOwner: isActualOwner ?? undefined,
      // Vorher war: isActualOwner: isActualDirector ?? undefined,
      // Diese Korrektur sollte gemacht werden, um sicherzustellen, dass die richtigen Daten an die Callable Function gesendet werden.
      // (Ich habe es in der oben eingefügten Datei bereits korrigiert)

      const createStripeAccountCallable = httpsCallable<CreateStripeAccountClientData, CreateStripeAccountCallableResult>(firebaseFunctions, 'createStripeAccountIfComplete');
      console.log(PAGE_WARN, "[Step5] Rufe createStripeAccountIfComplete Callable Function auf...");
      const result = await createStripeAccountCallable(dataForStripeCallable);
      console.log(PAGE_WARN, "[Step5] createStripeAccountIfComplete Callable Function abgeschlossen.");

      interface UserStripeUpdateData {
        stripeAccountId?: string;
        stripeRepresentativePersonId?: string | FieldValue;
        stripeAccountDetailsSubmitted?: boolean;
        stripeAccountPayoutsEnabled?: boolean;
        updatedAt?: FieldValue;
        'common.createdByCallable'?: string;
        'common.stripeVerificationStatus'?: string;
      }

      if (result.data.success) {
        const userUpdateAfterStripe: UserStripeUpdateData = {
          stripeAccountId: result.data.accountId,
          stripeRepresentativePersonId: result.data.personId || deleteField(),
          stripeAccountDetailsSubmitted: result.data.detailsSubmitted ?? false,
          stripeAccountPayoutsEnabled: result.data.payoutsEnabled ?? false,
          updatedAt: serverTimestamp(),
          'common.createdByCallable': "true",
          'common.stripeVerificationStatus': result.data.detailsSubmitted ? "details_submitted" : "pending",
        };
        await updateDoc(doc(db, 'users', currentAuthUserUID), { ...userUpdateAfterStripe });
        console.log(PAGE_WARN, "[Step5] Nutzerdokument nach erfolgreicher Stripe-Kontoerstellung aktualisiert.");

        alert('Registrierung fast abgeschlossen! Bitte überprüfe dein Dashboard für den Status deines Zahlungskontos.');
        if (resetRegistrationData) resetRegistrationData();
        router.push(`/dashboard/company/${currentAuthUserUID}`);

      } else {
        setFormError(`Problem bei Stripe: ${result.data.message || 'Unbekannter Fehler.'} ${result.data.missingFields ? `Fehlende Felder: ${result.data.missingFields.join(', ')}` : ''}`);
        console.error(PAGE_ERROR, "[Step5] Stripe-Kontoerstellung Callable Function meldete Fehler:", result.data.message, result.data.missingFields);
      }
    } catch (error: unknown) {
      console.error(PAGE_ERROR, '[Step5] Fehler im Registrierungsprozess:', error);
      let specificErrorMessage = 'Ein unerwarteter Fehler ist aufgetreten.';

      if (error instanceof FunctionsError) {
        specificErrorMessage = `Serverfehler (${error.code}): ${error.message} ${error.details ? `(Details: ${JSON.stringify(error.details)})` : ''}`;
      } else if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
        specificErrorMessage = `Firebase Fehler (${(error as { code: string }).code}): ${(error as { message: string }).message}`;
      } else if (error instanceof Error) {
        specificErrorMessage = error.message;
      }
      setFormError(specificErrorMessage);
    } finally {
      setIsLoading(false);
      setCurrentStepMessage('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 font-sans">
      {(isLoading || isConvertingImage || isProcessingImage) && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-[101]">
          <div className="bg-white p-4 rounded-lg shadow-xl flex items-center">
            <FiLoader className="animate-spin h-5 w-5 mr-3 text-teal-600" />
            <span>{currentStepMessage || 'Bitte warten...'}</span>
          </div>
        </div>
      )}
      <div className="w-full max-w-xl lg:max-w-4xl mx-auto mb-6 px-4">
        <div className="flex justify-end mb-4">
          <button onClick={() => router.push('/')} className="text-gray-600 hover:text-gray-800 text-base sm:text-lg flex items-center transition-colors duration-200" disabled={isLoading || isConvertingImage}>
            <span className="mr-2">Abbrechen</span> <FiX />
          </button>
        </div>
        <div className="mb-6">
          <ProgressBar currentStep={5} totalSteps={5} />
        </div>
        <div className="flex justify-between items-center mb-6">
          <p className="text-lg sm:text-xl text-teal-600 font-semibold">Schritt 5/5: Abschluss & Verifizierung</p>
        </div>
      </div>
      <div className="flex-grow flex items-center justify-center w-full px-4 sm:px-6">
        <div className="max-w-xl w-full bg-white p-6 sm:p-8 rounded-xl shadow-2xl border border-gray-200 flex flex-col items-center">
          <FiCheckCircle className="text-5xl text-green-500 mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-center text-gray-800">Fast geschafft!</h2>
          <p className="text-center text-gray-600 mb-6">
            Bitte gib deine Bankverbindung für Auszahlungen an und lade die Vorder- und Rückseite deines Ausweisdokuments hoch, um deine Identität zu verifizieren.
            Diese Informationen werden sicher an unseren Zahlungsdienstleister Stripe übermittelt.
          </p>
          {formError && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-center mb-4 w-full" role="alert">
              <FiAlertCircle className="h-6 w-6 text-red-500 mr-3 shrink-0" />
              <div>
                <p className="font-bold">Fehler bei der Registrierung:</p>
                <p className="text-sm">{formError}</p>
              </div>
            </div>
          )}

          <div className="w-full space-y-6 mb-8">
            <div>
              <label htmlFor="accountHolder" className={`block text-sm font-medium mb-1 ${hasAttemptedSubmit && !accountHolder?.trim() ? 'text-red-600' : 'text-gray-700'}`}>Name des Kontoinhabers*</label>
              <input type="text" id="accountHolder" value={accountHolder || ''} onChange={(e) => setAccountHolder(e.target.value)}
                className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm ${hasAttemptedSubmit && !accountHolder?.trim() ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Max Mustermann" disabled={isLoading || isConvertingImage} />
            </div>
            <div>
              <label htmlFor="iban" className={`block text-sm font-medium mb-1 ${hasAttemptedSubmit && !iban?.trim() ? 'text-red-600' : 'text-gray-700'}`}>IBAN*</label>
              <input type="text" id="iban" value={iban || ''} onChange={(e) => setIban(e.target.value)}
                className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm ${hasAttemptedSubmit && !iban?.trim() ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="DE89..." disabled={isLoading || isConvertingImage} />
            </div>
            <div className="mt-6">
              <label className={`block text-sm font-medium mb-1 ${hasAttemptedSubmit && !(identityFrontFile instanceof File) ? 'text-red-600' : 'text-gray-700'}`}>Ausweis Vorderseite* (max. {MAX_ID_DOC_SIZE_BYTES / (1024 * 1024)}MB, JPEG/PNG)</label>
              {identityFrontPreview && (
                <div className="my-2 max-h-32 rounded-lg border border-gray-300 p-1 flex justify-center items-center overflow-hidden">
                  <Image
                    src={identityFrontPreview}
                    alt="Vorschau Vorderseite"
                    width={200} // Beispielbreite, anpassen falls nötig
                    height={128} // Entspricht max-h-32
                    style={{ objectFit: "contain" }}
                    className="max-h-full max-w-full" />
                </div>
              )}
              <input type="file" id="identityFrontInput" accept="image/jpeg, image/png"
                onChange={(e) => handleFileChangeAndPreview(e, setIdentityFrontFile, setIdentityFrontPreview, MAX_ID_DOC_SIZE_BYTES, "Ausweis Vorderseite", false)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
              {identityFrontFile && (
                <p className="mt-1 text-xs text-gray-600">{identityFrontFile.name} ({(identityFrontFile.size / (1024 * 1024)).toFixed(2)}MB)</p>
              )}
              {hasAttemptedSubmit && !(identityFrontFile instanceof File) && (
                <p className="mt-1 text-xs text-red-500">Ausweis Vorderseite ist erforderlich.</p>
              )}
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${hasAttemptedSubmit && !(identityBackFile instanceof File) ? 'text-red-600' : 'text-gray-700'}`}>Ausweis Rückseite* (max. {MAX_ID_DOC_SIZE_BYTES / (1024 * 1024)}MB, JPEG/PNG)</label>
              {identityBackPreview && (
                <div className="my-2 max-h-32 rounded-lg border border-gray-300 p-1 flex justify-center items-center overflow-hidden">
                  <Image
                    src={identityBackPreview}
                    alt="Vorschau Rückseite"
                    width={200} // Beispielbreite, anpassen falls nötig
                    height={128} // Entspricht max-h-32
                    style={{ objectFit: "contain" }}
                    className="max-h-full max-w-full" />
                </div>
              )}
              <input type="file" id="identityBackInput" accept="image/jpeg, image/png"
                onChange={(e) => handleFileChangeAndPreview(e, setIdentityBackFile, setIdentityBackPreview, MAX_ID_DOC_SIZE_BYTES, "Ausweis Rückseite", false)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
              {identityBackFile && (
                <p className="mt-1 text-xs text-gray-600">{identityBackFile.name} ({(identityBackFile.size / (1024 * 1024)).toFixed(2)}MB)</p>
              )}
              {hasAttemptedSubmit && !(identityBackFile instanceof File) && (
                <p className="mt-1 text-xs text-red-500">Ausweis Rückseite ist erforderlich.</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleRegistration}
            disabled={isLoading || isConvertingImage || isProcessingImage || (hasAttemptedSubmit && !isFormValid())}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-lg text-white transition-colors duration-150 ease-in-out
              ${(!isFormValid() || isLoading || isConvertingImage || isProcessingImage)
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2'}`}
          >
            {isLoading || isConvertingImage || isProcessingImage ? (
              <span className="flex items-center justify-center">
                <FiLoader className="animate-spin h-5 w-5 mr-3" />
                <span>{currentStepMessage || 'Bitte warten...'}</span>
              </span>
            ) : 'Registrierung abschließen & Zahlungskonto einrichten'}
          </button>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Mit Klick bestätigst du die Richtigkeit deiner Angaben und stimmst unseren AGB & Datenschutzbestimmungen zu.
          </p>
        </div>
      </div>
    </div>
  );
}