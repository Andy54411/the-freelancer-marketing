'use client';
import Image from 'next/image';

import React, {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import ProgressBar from '@/components/ProgressBar';
import { FiX, FiCheckCircle, FiAlertCircle, FiLoader } from 'react-icons/fi';
import { useRegistration } from '@/contexts/Registration-Context';
import {
  getAuth,
  createUserWithEmailAndPassword,
  UserCredential,
  User as AuthUser,
  getIdToken,
} from 'firebase/auth'; // FieldValue,
import {
  doc,
  setDoc,
  serverTimestamp,
  deleteField,
  updateDoc,
  FieldValue,
} from 'firebase/firestore';
import { db, app as firebaseApp } from '../../../../firebase/clients';
import { functions as firebaseFunctions } from '../../../../firebase/clients';
import { httpsCallable } from 'firebase/functions';
import { PAGE_ERROR, PAGE_WARN } from '@/lib/constants';
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
  userId: string;
  clientIp: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  personalStreet?: string;
  personalHouseNumber?: string;
  personalPostalCode?: string;
  personalCity?: string;
  personalCountry?: string | null;
  isManagingDirectorOwner?: boolean;
  ownershipPercentage?: number;
  isActualDirector?: boolean;
  isActualOwner?: boolean;
  actualOwnershipPercentage?: number;
  isActualExecutive?: boolean;
  actualRepresentativeTitle?: string;
  companyName?: string;
  legalForm?: string | null;
  companyAddressLine1?: string;
  companyCity?: string;
  companyPostalCode?: string;
  companyCountry?: string | null;
  companyPhoneNumber?: string;
  companyWebsite?: string;
  companyRegister?: string;
  taxNumber?: string;
  vatId?: string;
  mcc?: string;
  iban?: string;
  accountHolder?: string;
  profilePictureFileId?: string;
  businessLicenseFileId?: string;
  masterCraftsmanCertificateFileId?: string;
  identityFrontFileId?: string;
  identityBackFileId?: string;
  // Firebase Storage URLs for display and saving
  profilePictureUrl?: string;
  businessLicenseUrl?: string;
  masterCraftsmanCertificateUrl?: string;
  identityFrontUrl?: string;
  identityBackUrl?: string;
}

type GetClientIpData = Record<string, never>;
type GetClientIpResult = { ip: string };
type FilePurpose = Stripe.FileCreateParams.Purpose;

const MAX_ID_DOC_SIZE_BYTES = 8 * 1024 * 1024;
const WEBP_QUALITY = 0.8;

export default function Step5CompanyPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
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
    firstName,
    lastName,
    email,
    password,
    companyName,
    legalForm,
    companyStreet,
    companyHouseNumber,
    companyPostalCode,
    companyCity,
    companyCountry,
    companyPhoneNumber,
    companyWebsite,
    lat,
    lng,
    radiusKm,
    selectedCategory,
    selectedSubcategory,
    profilePictureFile,
    businessLicenseFile,
    masterCraftsmanCertificateFile,
    identityFrontFile,
    setIdentityFrontFile,
    identityBackFile,
    setIdentityBackFile,
    hourlyRate,
    companyRegister,
    taxNumber,
    vatId,
    phoneNumber,
    iban,
    setIban,
    accountHolder,
    setAccountHolder,
    dateOfBirth,
    personalStreet,
    personalHouseNumber,
    personalPostalCode,
    personalCity,
    personalCountry,
    isManagingDirectorOwner,
    ownershipPercentage,
    isActualDirector,
    isActualOwner,
    actualOwnershipPercentage,
    isActualExecutive,
    actualRepresentativeTitle,
    resetRegistrationData,
  } = registration;

  useEffect(() => {
    const initPreview = (
      fileFromContext: File | object | null | undefined,
      currentLocalPreview: string | null,
      setLocalPreview: Dispatch<SetStateAction<string | null>>
    ) => {
      if (fileFromContext instanceof File) {
        if (!currentLocalPreview) {
          try {
            const newUrl = URL.createObjectURL(fileFromContext);
            setLocalPreview(newUrl);
          } catch (e: unknown) {}
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

  const mapCategoryToMcc = useCallback(
    (category: string | null | undefined): string | undefined => {
      if (!category || category.trim() === '') {
        return '5999';
      }
      switch (category) {
        case 'Handwerk':
          return '1731';
        case 'Haushalt & Reinigung':
          return '7349';
        case 'Transport & Logistik':
          return '4215';
        case 'Hotel & Gastronomie':
          return '5812';
        case 'IT & Technik':
          return '7372';
        case 'Marketing & Vertrieb':
          return '7311';
        case 'Finanzen & Recht':
          return '8931';
        case 'Gesundheit & Wellness':
          return '8099';
        case 'Bildung & Nachhilfe':
          return '8299';
        case 'Kunst & Kultur':
          return '8999';
        case 'Veranstaltungen & Events':
          return '7999';
        case 'Tiere & Pflanzen':
          return '0742';
        default:
          return '5999';
      }
    },
    []
  );

  const convertImageToWebP = useCallback(
    async (file: File, quality: number): Promise<File | null> => {
      return new Promise(resolve => {
        if (
          !file.type.startsWith('image/') ||
          file.type === 'image/webp' ||
          (file.type !== 'image/jpeg' && file.type !== 'image/png')
        ) {
          resolve(file);
          return;
        }
        setIsConvertingImage(true);
        setFormError(null);
        const reader = new FileReader();
        reader.onload = event => {
          const img = new window.Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              setIsConvertingImage(false);
              resolve(file);
              return;
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
              blob => {
                setIsConvertingImage(false);
                if (blob) {
                  const nameWithoutExtension =
                    file.name.lastIndexOf('.') > 0
                      ? file.name.substring(0, file.name.lastIndexOf('.'))
                      : file.name;
                  const webpFile = new File([blob], `${nameWithoutExtension}.webp`, {
                    type: 'image/webp',
                    lastModified: Date.now(),
                  });
                  resolve(webpFile);
                } else {
                  resolve(file);
                }
              },
              'image/webp',
              quality
            );
          };
          img.onerror = () => {
            setIsConvertingImage(false);
            resolve(file);
          };
          if (event.target?.result && typeof event.target.result === 'string') {
            img.src = event.target.result;
          } else {
            setIsConvertingImage(false);
            resolve(file);
          }
        };
        reader.onerror = () => {
          setIsConvertingImage(false);
          resolve(file);
        };
        reader.readAsDataURL(file);
      });
    },
    []
  );

  const handleFileChangeAndPreview = useCallback(
    async (
      e: ChangeEvent<HTMLInputElement>,
      fileContextSetter: Dispatch<SetStateAction<File | null | undefined>>, // Allow undefined
      localPreviewSetter: Dispatch<SetStateAction<string | null>>,
      maxSizeBytes?: number,
      fileTypeForAlert?: string,
      attemptWebPConversion: boolean = false
    ): Promise<void> => {
      const inputFile = e.target.files?.[0] || null;
      let processedFile: File | null = inputFile;

      setFormError(null);

      localPreviewSetter(prevLocalPreviewUrl => {
        if (prevLocalPreviewUrl) URL.revokeObjectURL(prevLocalPreviewUrl);
        return null;
      });

      if (inputFile) {
        setIsProcessingImage(true);
        if (
          attemptWebPConversion &&
          (inputFile.type === 'image/jpeg' || inputFile.type === 'image/png')
        ) {
          const convertedFile = await convertImageToWebP(inputFile, WEBP_QUALITY);
          if (convertedFile) processedFile = convertedFile;
        }
        if (maxSizeBytes && processedFile && processedFile.size > maxSizeBytes) {
          setFormError(
            `Die Datei für "${fileTypeForAlert || 'diesen Upload'}" (${processedFile.name}) ist zu groß (${(processedFile.size / (1024 * 1024)).toFixed(2)}MB). Max. ${(maxSizeBytes / (1024 * 1024)).toFixed(2)}MB.`
          );
          fileContextSetter(null);
          if (e.target) e.target.value = '';
          setIsProcessingImage(false);
          return;
        }
        fileContextSetter(processedFile);
        if (processedFile && typeof URL !== 'undefined' && URL.createObjectURL) {
          try {
            localPreviewSetter(URL.createObjectURL(processedFile));
          } catch (urlError: unknown) {
            localPreviewSetter(null);
          }
        }
        setIsProcessingImage(false);
      } else {
        fileContextSetter(null);
        setIsProcessingImage(false);
      }
    },
    [convertImageToWebP]
  );

  const uploadFileToStripeAndStorage = useCallback(
    async (
      file: File | object | null | undefined,
      purpose: FilePurpose,
      fileNameForLog: string,
      userId: string,
      idToken: string
    ): Promise<FileUploadResult | null> => {
      if (!file || !(file instanceof File)) {
        setFormError(`Datei für ${fileNameForLog} fehlt oder ist ungültig.`);
        return null;
      }
      setCurrentStepMessage(`Lade ${fileNameForLog} hoch...`);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', purpose);
      formData.append('userId', userId);

      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tilvo-f142f';
      const region = 'europe-west1';

      const uploadUrl = `https://${region}-${projectId}.cloudfunctions.net/uploadStripeFile`;

      if (!uploadUrl || uploadUrl.includes('undefined')) {
        throw new Error(
          'Upload URL ist nicht korrekt konfiguriert oder konnte nicht generiert werden.'
        );
      }

      // WICHTIG: Logging des Tokens vor dem Senden

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errTxt = await response.text();
        // Bessere Fehlermeldungen für häufige Probleme
        let userFriendlyMessage = `Upload-Fehler für ${fileNameForLog}: ${response.status}`;
        if (response.status === 500) {
          userFriendlyMessage = `Server-Fehler beim Upload von ${fileNameForLog}. Bitte versuchen Sie es in wenigen Sekunden erneut.`;
        } else if (response.status === 413) {
          userFriendlyMessage = `Datei ${fileNameForLog} ist zu groß. Bitte verwenden Sie eine kleinere Datei.`;
        } else if (response.status === 401) {
          userFriendlyMessage = `Authentifizierungsfehler beim Upload von ${fileNameForLog}. Bitte laden Sie die Seite neu.`;
        }
        throw new Error(`${userFriendlyMessage} Details: ${errTxt}`);
      }
      const result = await response.json();
      if (result.success && result.stripeFileId)
        return {
          stripeFileId: result.stripeFileId,
          firebaseStorageUrl: result.firebaseStorageUrl,
          firebaseStoragePath: result.firebaseStoragePath,
        };
      else throw new Error(result.message || `Upload-Fehler für ${fileNameForLog}.`);
    },
    []
  );

  const isFormValid = useCallback((): boolean => {
    if (!iban?.trim() || !accountHolder?.trim()) return false;
    if (!(identityFrontFile instanceof File) || !(identityBackFile instanceof File)) return false;
    if (!(profilePictureFile instanceof File)) return false;
    if (!hourlyRate || parseFloat(hourlyRate) <= 0) return false;
    if (!(businessLicenseFile instanceof File)) return false;
    if (!legalForm?.trim()) return false;

    const hasPersonalAddr =
      personalStreet?.trim() &&
      personalPostalCode?.trim() &&
      personalCity?.trim() &&
      personalCountry?.trim();
    const hasCompanyAddr =
      companyStreet?.trim() &&
      companyPostalCode?.trim() &&
      companyCity?.trim() &&
      companyCountry?.trim();
    const isCapitalCompany =
      legalForm?.toLowerCase() &&
      (legalForm.toLowerCase().includes('gmbh') ||
        legalForm.toLowerCase().includes('ug') ||
        legalForm.toLowerCase().includes('ag'));
    const isIndividual =
      legalForm?.toLowerCase() &&
      (legalForm.toLowerCase().includes('einzelunternehmen') ||
        legalForm.toLowerCase().includes('freiberufler'));

    if (
      isCapitalCompany &&
      (!personalStreet?.trim() ||
        !personalPostalCode?.trim() ||
        !personalCity?.trim() ||
        !personalCountry?.trim())
    )
      return false;
    if (isIndividual && !isCapitalCompany && !hasPersonalAddr && !hasCompanyAddr) return false;
    if (personalCountry && personalCountry.length !== 2) return false;

    const isEK = legalForm?.toLowerCase().includes('e.k.');
    let taxIdProvided = false;
    if (isCapitalCompany || isEK) {
      if (companyRegister?.trim()) taxIdProvided = true;
    }
    if (!taxIdProvided) {
      if (
        isCapitalCompany ||
        legalForm?.toLowerCase().includes('gbr') ||
        legalForm?.toLowerCase().includes('ohg') ||
        legalForm?.toLowerCase().includes('kg')
      ) {
        if (taxNumber?.trim() || vatId?.trim()) taxIdProvided = true;
      } else if (isIndividual && !isEK) {
        if (taxNumber?.trim() || vatId?.trim()) taxIdProvided = true;
      } else if (
        legalForm?.trim() &&
        !isCapitalCompany &&
        !isIndividual &&
        !isEK &&
        !legalForm.toLowerCase().includes('gbr') &&
        !legalForm.toLowerCase().includes('ohg') &&
        !legalForm.toLowerCase().includes('kg')
      ) {
        if (companyRegister?.trim() || taxNumber?.trim() || vatId?.trim()) taxIdProvided = true;
      }
    }
    if (!taxIdProvided) return false;

    return !isLoading && !isConvertingImage && !isProcessingImage;
  }, [
    iban,
    accountHolder,
    identityFrontFile,
    identityBackFile,
    isLoading,
    isConvertingImage,
    profilePictureFile,
    hourlyRate,
    businessLicenseFile,
    legalForm,
    personalStreet,
    personalPostalCode,
    personalCity,
    personalCountry,
    companyStreet,
    companyPostalCode,
    companyCity,
    companyCountry,
    isProcessingImage,
    companyRegister,
    taxNumber,
    vatId,
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
      if (!hourlyRate || parseFloat(hourlyRate) <= 0)
        missingFieldsList.push('Stundenpreis (muss > 0 sein)');
      if (!(businessLicenseFile instanceof File)) missingFieldsList.push('Gewerbeschein');
      if (!legalForm?.trim()) missingFieldsList.push('Rechtsform');
      setFormError(
        `Bitte alle erforderlichen Felder ausfüllen: ${[...new Set(missingFieldsList)].join(', ')}.`
      );
      return;
    }

    setIsLoading(true);
    setCurrentStepMessage('Registrierung wird vorbereitet...');

    try {
      // Telefonnummern für Stripe ins E.164-Format normalisieren.
      // KORREKTUR: Diese Funktion wurde robuster gemacht, um verschiedene Eingabeformate
      // und Ländercodes zu verarbeiten und ein gültiges E.164-Format sicherzustellen.
      const normalizePhoneNumber = (
        num: string | null | undefined,
        countryISO: string | null | undefined
      ): string => {
        if (!num) return '';

        // 1. Alle nicht-numerischen Zeichen außer einem führenden '+' entfernen.
        let cleanedNum = num.trim();
        if (cleanedNum.startsWith('+')) {
          cleanedNum = '+' + cleanedNum.substring(1).replace(/\D/g, '');
        } else {
          cleanedNum = cleanedNum.replace(/\D/g, '');
        }

        // 2. Wenn die Nummer bereits ein internationales Präfix hat, wird sie als korrekt angenommen.
        if (cleanedNum.startsWith('+')) {
          return cleanedNum;
        }

        // 3. Anhand des Ländercodes (ISO 2-stellig) die Ländervorwahl bestimmen.
        const effectiveCountryISO = countryISO || 'DE'; // Fallback auf Deutschland
        let dialCode = '';
        switch (effectiveCountryISO.toUpperCase()) {
          case 'DE':
            dialCode = '+49';
            break;
          case 'AT':
            dialCode = '+43';
            break;
          case 'CH':
            dialCode = '+41';
            break;
          // Fügen Sie hier bei Bedarf weitere Länder hinzu.
          default:
            dialCode = '+49'; // Standard auf Deutschland
        }

        // 4. Eine eventuelle führende Null von der nationalen Nummer entfernen.
        if (cleanedNum.startsWith('0')) {
          cleanedNum = cleanedNum.substring(1);
        }

        return `${dialCode}${cleanedNum}`;
      };

      const normalizedPersonalPhoneNumber = normalizePhoneNumber(phoneNumber, personalCountry);
      const normalizedCompanyPhoneNumber = normalizePhoneNumber(companyPhoneNumber, companyCountry);

      const derivedMcc = mapCategoryToMcc(selectedCategory);

      const firebaseAuthInstance = getAuth(firebaseApp);
      let authUser: AuthUser | undefined = undefined;

      setCurrentStepMessage('Benutzerkonto wird erstellt...');
      if (!firebaseAuthInstance.currentUser) {
        const userCredential: UserCredential = await createUserWithEmailAndPassword(
          firebaseAuthInstance,
          email!,
          password!
        );
        authUser = userCredential.user;
      } else {
        authUser = firebaseAuthInstance.currentUser;
      }
      if (!authUser) throw new Error('Benutzer konnte nicht authentifiziert oder erstellt werden.');
      const currentAuthUserUID = authUser.uid;

      const idToken = await authUser.getIdToken(true);

      setCurrentStepMessage('IP-Adresse wird ermittelt...');
      const getClientIpFunction = httpsCallable<GetClientIpData, GetClientIpResult>(
        firebaseFunctions,
        'getClientIp'
      );
      let clientIpAddress = ''; // Initialisieren als leerer String

      try {
        const ipResult = await getClientIpFunction({});
        if (
          ipResult.data?.ip &&
          ipResult.data.ip !== 'IP_NOT_DETERMINED' &&
          ipResult.data.ip.length >= 7
        ) {
          clientIpAddress = ipResult.data.ip;
        } else {
        }
      } catch (ipLookupError: unknown) {}

      // Fallback, wenn die Firebase Function fehlschlägt oder keine gültige IP liefert
      if (!clientIpAddress) {
        try {
          const response = await fetch('https://api.ipify.org?format=json');
          if (!response.ok) {
            throw new Error(`ipify.org antwortete mit Status: ${response.status}`);
          }
          const ipData = await response.json();
          if (ipData.ip) {
            clientIpAddress = ipData.ip;
          }
        } catch (fallbackError: unknown) {}
      }

      if (!clientIpAddress && process.env.NODE_ENV === 'development') {
        clientIpAddress = '8.8.8.8'; // Eine gültige öffentliche IP für Tests
      }

      if (!clientIpAddress) {
        throw new Error('Konnte keine gültige IP-Adresse für die Stripe-Registrierung ermitteln.');
      }

      if (!profilePictureFile || !businessLicenseFile || !identityFrontFile || !identityBackFile) {
        throw new Error('Kritische Dateien für den Upload fehlen.');
      }

      const profilePicResult = await uploadFileToStripeAndStorage(
        profilePictureFile,
        'business_icon',
        'Profilbild',
        currentAuthUserUID,
        idToken
      );
      const businessLicResult = await uploadFileToStripeAndStorage(
        businessLicenseFile,
        'additional_verification',
        'Gewerbeschein',
        currentAuthUserUID,
        idToken
      );
      const idFrontResult = await uploadFileToStripeAndStorage(
        identityFrontFile,
        'identity_document',
        'Ausweis Vorderseite',
        currentAuthUserUID,
        idToken
      );
      const idBackResult = await uploadFileToStripeAndStorage(
        identityBackFile,
        'identity_document',
        'Ausweis Rückseite',
        currentAuthUserUID,
        idToken
      );

      let masterCertStripeFileId: string | undefined = undefined;
      let masterCertResult: FileUploadResult | null = null;
      if (masterCraftsmanCertificateFile instanceof File) {
        masterCertResult = await uploadFileToStripeAndStorage(
          masterCraftsmanCertificateFile,
          'additional_verification',
          'Meisterbrief',
          currentAuthUserUID,
          idToken
        );
        masterCertStripeFileId = masterCertResult?.stripeFileId;
      }

      if (
        !profilePicResult?.stripeFileId ||
        !businessLicResult?.stripeFileId ||
        !idFrontResult?.stripeFileId ||
        !idBackResult?.stripeFileId
      ) {
        throw new Error('Ein oder mehrere kritische Datei-Uploads sind fehlgeschlagen.');
      }

      setCurrentStepMessage('Profildaten werden gespeichert...');

      const resolvedCompanyStreet = companyStreet || '';
      const resolvedCompanyHouseNumber = companyHouseNumber || '';
      const fullCompanyAddressForFirestore =
        `${resolvedCompanyStreet}${resolvedCompanyStreet && resolvedCompanyHouseNumber ? ' ' : ''}${resolvedCompanyHouseNumber}`.trim();
      const frontendAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taskilo.de';

      // ========================================
      // NEUE 2-COLLECTION ARCHITEKTUR
      // ========================================

      // USERS COLLECTION: Nur Authentifizierung + Basis-Profildaten (KEINE FIRMENDATEN!)
      const userBasicData: Record<string, unknown> = {
        uid: currentAuthUserUID,
        email: email!,
        user_type: 'firma',
        firstName: firstName?.trim() || '',
        lastName: lastName?.trim() || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // COMPANIES COLLECTION: Alle Firmendaten + Stripe + Onboarding
      const companyData: Record<string, unknown> = {
        uid: currentAuthUserUID,
        owner_uid: currentAuthUserUID, // Referenz zum User

        // Persönliche Daten (für Stripe)
        phoneNumber: normalizedPersonalPhoneNumber || null,
        dateOfBirth: dateOfBirth || null,
        personalStreet: personalStreet || null,
        personalHouseNumber: personalHouseNumber || null,
        personalPostalCode: personalPostalCode || null,
        personalCity: personalCity || null,
        personalCountry: personalCountry || null,
        isManagingDirectorOwner: isManagingDirectorOwner ?? true,
        ownershipPercentage:
          ownershipPercentage !== undefined ? ownershipPercentage : deleteField(),
        isActualDirector: isActualDirector ?? deleteField(),
        isActualOwner: isActualOwner ?? deleteField(),
        actualOwnershipPercentage: actualOwnershipPercentage ?? deleteField(),
        isActualExecutive: isActualExecutive ?? deleteField(),
        actualRepresentativeTitle: actualRepresentativeTitle || null,

        // Banking
        iban: iban || '',
        accountHolder: accountHolder?.trim() || '',
        bankCountry: companyCountry || personalCountry || 'DE',

        // Stripe Dokumente
        identityFrontUrlStripeId: idFrontResult.stripeFileId,
        identityBackUrlStripeId: idBackResult.stripeFileId,
        businessLicenseStripeId: businessLicResult.stripeFileId,
        masterCraftsmanCertificateStripeId: masterCertStripeFileId || deleteField(),
        identityFrontFirebaseUrl: idFrontResult.firebaseStorageUrl || null,
        identityBackFirebaseUrl: idBackResult.firebaseStorageUrl || null,
        businessLicenseFirebaseUrl: businessLicResult.firebaseStorageUrl || null,
        masterCraftsmanCertificateFirebaseUrl: masterCertResult?.firebaseStorageUrl || null,

        // Firmendaten
        companyName: companyName || '',
        legalForm: legalForm || null,
        companyAddressLine1ForBackend: fullCompanyAddressForFirestore,
        companyCityForBackend: companyCity || null,
        companyPostalCodeForBackend: companyPostalCode || null,
        companyCountryForBackend: companyCountry || null,
        companyPhoneNumberForBackend: normalizedCompanyPhoneNumber || null,
        companyWebsiteForBackend: companyWebsite || null,
        companyRegisterForBackend: companyRegister || null,
        taxNumberForBackend: taxNumber || null,
        vatIdForBackend: vatId || null,

        // Öffentliche Profildaten
        postalCode: companyPostalCode || null,
        taskiloProfileUrl: `${frontendAppUrl}/profile/${currentAuthUserUID}`,
        description: '',
        hourlyRate: Number(hourlyRate) || 0,
        selectedCategory: selectedCategory || '',
        selectedSubcategory: selectedSubcategory || '',
        industryMcc: derivedMcc || null,
        lat: lat ?? null,
        lng: lng ?? null,
        radiusKm: radiusKm ?? 30,

        // Profile Picture (GEHÖRT ZUR FIRMA!)
        profilePictureURL: profilePicResult.firebaseStorageUrl || null,
        profilePictureStripeFileId: profilePicResult.stripeFileId,

        // Firmendetails für öffentliches Profil
        companyWebsite: companyWebsite || null,
        companyPhoneNumber: normalizedCompanyPhoneNumber || null,
        companyStreet: companyStreet || null,
        companyHouseNumber: companyHouseNumber || null,
        companyPostalCode: companyPostalCode || null,
        companyCity: companyCity || null,
        companyCountry: companyCountry || null,

        // Legal & Compliance
        common: {
          tosAcceptanceIp: clientIpAddress,
          tosAcceptanceUserAgent:
            typeof navigator !== 'undefined' ? navigator.userAgent : 'UserAgentNotAvailable',
          registrationCompletedAt: new Date().toISOString(),
        },

        // Timestamps
        profileLastUpdatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Company Register nur für bestimmte Rechtsformen
      if (
        legalForm?.toLowerCase().includes('gmbh') ||
        legalForm?.toLowerCase().includes('ug') ||
        legalForm?.toLowerCase().includes('ag') ||
        legalForm?.toLowerCase().includes('e.k.')
      ) {
        if (companyRegister?.trim()) {
          companyData.companyRegisterPublic = companyRegister;
        }
      }

      // Null-Werte für undefined bereinigen
      Object.keys(companyData).forEach(key => {
        if (
          companyData[key] === undefined &&
          key !== 'ownershipPercentage' &&
          key !== 'isActualDirector' &&
          key !== 'isActualOwner' &&
          key !== 'actualOwnershipPercentage' &&
          key !== 'isActualExecutive' &&
          key !== 'masterCraftsmanCertificateStripeId'
        ) {
          companyData[key] = null;
        }
      });

      console.log('📝 Creating documents with 2-collection architecture...', {
        uid: currentAuthUserUID,
        user_type: userBasicData.user_type,
        email: userBasicData.email,
        companyName: companyData.companyName,
      });

      // Erstelle users document (Basis-Authentifizierung)
      await setDoc(doc(db, 'users', currentAuthUserUID), userBasicData, { merge: true });
      console.log('✅ Users document created successfully');

      // Erstelle companies document (Alle Firmendaten)
      await setDoc(doc(db, 'companies', currentAuthUserUID), companyData, { merge: true });
      console.log('✅ Companies document created successfully');

      setCurrentStepMessage('Zahlungskonto wird bei Stripe eingerichtet...');

      const dataForStripeCallable: CreateStripeAccountClientData = {
        userId: currentAuthUserUID,
        clientIp: clientIpAddress,
        firstName: firstName?.trim(),
        lastName: lastName?.trim(), // Persönliche Daten des Vertreters
        email: email!,
        phoneNumber: normalizedPersonalPhoneNumber,
        dateOfBirth,
        personalStreet,
        personalHouseNumber,
        personalPostalCode,
        personalCity,
        personalCountry,
        isManagingDirectorOwner,
        ownershipPercentage: ownershipPercentage ?? undefined, // Daten zur wirtschaftlich berechtigten Person
        isActualDirector: isActualDirector ?? undefined,
        isActualOwner: isActualOwner ?? undefined,
        actualOwnershipPercentage: actualOwnershipPercentage ?? undefined,
        isActualExecutive: isActualExecutive ?? undefined,
        actualRepresentativeTitle,
        companyName,
        legalForm, // Firmendaten
        companyAddressLine1: fullCompanyAddressForFirestore,
        companyCity,
        companyPostalCode,
        companyCountry,
        companyPhoneNumber: normalizedCompanyPhoneNumber,
        companyWebsite,
        companyRegister,
        taxNumber,
        vatId,
        mcc: derivedMcc,
        iban,
        accountHolder: accountHolder?.trim(),
        profilePictureFileId: profilePicResult.stripeFileId,
        businessLicenseFileId: businessLicResult.stripeFileId,
        masterCraftsmanCertificateFileId: masterCertStripeFileId,
        identityFrontFileId: idFrontResult.stripeFileId,
        identityBackFileId: idBackResult.stripeFileId,
        // Pass the URLs to the backend as well for correct Firestore saving
        profilePictureUrl: profilePicResult.firebaseStorageUrl,
        businessLicenseUrl: businessLicResult.firebaseStorageUrl,
        masterCraftsmanCertificateUrl: masterCertResult?.firebaseStorageUrl,
        identityFrontUrl: idFrontResult.firebaseStorageUrl,
        identityBackUrl: idBackResult.firebaseStorageUrl,
      };

      if (
        dataForStripeCallable.legalForm === 'Einzelunternehmen' ||
        dataForStripeCallable.legalForm === 'Freiberufler'
      ) {
        dataForStripeCallable.personalStreet = fullCompanyAddressForFirestore;
        dataForStripeCallable.personalHouseNumber = '';
        dataForStripeCallable.personalPostalCode = dataForStripeCallable.companyPostalCode;
        dataForStripeCallable.personalCity = dataForStripeCallable.companyCity;
        dataForStripeCallable.personalCountry = dataForStripeCallable.companyCountry;
      }

      const createStripeAccountCallable = httpsCallable<
        CreateStripeAccountClientData,
        CreateStripeAccountCallableResult
      >(firebaseFunctions, 'createStripeAccountIfComplete');
      const result = await createStripeAccountCallable(dataForStripeCallable);

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
        console.log('🔧 Updating companies document with Stripe data...');
        const companyStripeUpdate: UserStripeUpdateData = {
          stripeAccountId: result.data.accountId,
          stripeRepresentativePersonId: result.data.personId || deleteField(),
          stripeAccountDetailsSubmitted: result.data.detailsSubmitted ?? false,
          stripeAccountPayoutsEnabled: result.data.payoutsEnabled ?? false,
          updatedAt: serverTimestamp(),
          'common.createdByCallable': 'true',
          'common.stripeVerificationStatus': result.data.detailsSubmitted
            ? 'details_submitted'
            : 'pending',
        };
        // Update companies collection (wo alle Firmendaten liegen)
        await updateDoc(doc(db, 'companies', currentAuthUserUID), { ...companyStripeUpdate });
        console.log('✅ Companies document updated with Stripe data');

        setCurrentStepMessage('Onboarding-System wird vorbereitet...');

        // 🔧 SAUBERE 2-COLLECTION TRENNUNG:

        // 1. USERS COLLECTION: Nur Basis-Onboarding-Flag für AuthContext
        console.log('🔧 Setting basic onboarding flag in users collection...');
        await updateDoc(doc(db, 'users', currentAuthUserUID), {
          hasOnboardingStarted: true,
          needsOnboarding: true,
        });
        console.log('✅ Users collection: Basic onboarding flag set');

        // 2. COMPANIES COLLECTION: Vollständige Onboarding-Daten für Functions
        console.log('🔧 Setting complete onboarding data in companies collection...');
        await updateDoc(doc(db, 'companies', currentAuthUserUID), {
          onboardingStartedAt: serverTimestamp(),
          onboardingCurrentStep: '1',
          onboardingStepData: {},
          onboardingCompletionPercentage: 0,
          onboardingCompleted: false,
          profileComplete: false,
          profileStatus: 'pending_onboarding',
        });
        console.log('✅ Companies collection: Complete onboarding data set');

        // SUCCESS: Registration abgeschlossen - harmonisiertes System ist bereits konfiguriert
        console.log('✅ Registration abgeschlossen (harmonisiertes System)');

        setCurrentStepMessage('Weiterleitung zum Onboarding...');
        setIsRedirecting(true);

        // Kurze Verzögerung bevor Weiterleitung für bessere UX
        setTimeout(() => {
          console.log('🔄 Registration Step 5 - Weiterleitung wird ausgeführt');
          console.log(
            '📍 Target URL:',
            `/dashboard/company/${currentAuthUserUID}/onboarding/welcome`
          );
          console.log('👤 Current User UID:', currentAuthUserUID);

          alert(
            'Registrierung abgeschlossen! Sie werden nun durch unser Onboarding-System geführt, um Ihr Firmenprofil zu vervollständigen.'
          );
          if (resetRegistrationData) resetRegistrationData();
          // NEU: Redirect zum Onboarding anstatt Dashboard (nach Dokumentation)
          router.push(`/dashboard/company/${currentAuthUserUID}/onboarding/welcome`);

          console.log('✅ router.push executed for company onboarding');
        }, 1500);
      } else {
        setFormError(
          `Problem bei Stripe: ${result.data.message || 'Unbekannter Fehler.'} ${result.data.missingFields ? `Fehlende Felder: ${result.data.missingFields.join(', ')}` : ''}`
        );
      }
    } catch (error: unknown) {
      let specificErrorMessage = 'Ein unerwarteter Fehler ist aufgetreten.';

      if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
        const errorObj = error as { code: string; message: string; details?: any };
        specificErrorMessage = `Serverfehler (${errorObj.code}): ${errorObj.message} ${errorObj.details ? `(Details: ${JSON.stringify(errorObj.details)})` : ''}`;
      } else if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
        specificErrorMessage = `Firebase Fehler (${(error as { code: string }).code}): ${(error as { message: string }).message}`;
      } else if (error instanceof Error) {
        specificErrorMessage = error.message;
      }
      setFormError(specificErrorMessage);
    } finally {
      if (!isRedirecting) {
        setIsLoading(false);
        setCurrentStepMessage('');
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 font-sans">
      {(isLoading || isConvertingImage || isProcessingImage || isRedirecting) && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-[101]">
          <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center max-w-sm mx-4">
            <FiLoader className="animate-spin h-8 w-8 mb-4 text-teal-600" />
            <span className="text-lg font-medium text-gray-800 text-center mb-2">
              {currentStepMessage || 'Bitte warten...'}
            </span>
            {isRedirecting && (
              <p className="text-sm text-gray-600 text-center">
                Sie werden gleich zu Ihrem Dashboard weitergeleitet.
              </p>
            )}
          </div>
        </div>
      )}
      <div className="w-full max-w-xl lg:max-w-4xl mx-auto mb-6 px-4">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => router.push('/')}
            className="text-[#14ad9f] hover:text-teal-700 text-base sm:text-lg flex items-center transition-colors duration-200"
            disabled={isLoading || isConvertingImage || isRedirecting}
          >
            <span className="mr-2">Abbrechen</span> <FiX />
          </button>
        </div>
        <div className="mb-6">
          <ProgressBar currentStep={5} totalSteps={5} />
        </div>
        <div className="flex justify-between items-center mb-6">
          <p className="text-lg sm:text-xl text-teal-600 font-semibold">
            Schritt 5/5: Abschluss & Verifizierung
          </p>
        </div>
      </div>
      <div className="flex-grow flex items-center justify-center w-full px-4 sm:px-6">
        <div className="max-w-xl w-full bg-white p-6 sm:p-8 rounded-xl shadow-2xl border border-gray-200 flex flex-col items-center">
          <FiCheckCircle className="text-5xl text-green-500 mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-center text-gray-800">
            Fast geschafft!
          </h2>
          <p className="text-center text-gray-600 mb-6">
            Bitte gib deine Bankverbindung für Auszahlungen an und lade die Vorder- und Rückseite
            deines Ausweisdokuments hoch, um deine Identität zu verifizieren. Diese Informationen
            werden sicher an unseren Zahlungsdienstleister Stripe übermittelt.
          </p>
          {formError && (
            <div
              className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-center mb-4 w-full"
              role="alert"
            >
              <FiAlertCircle className="h-6 w-6 text-red-500 mr-3 shrink-0" />
              <div>
                <p className="font-bold">Fehler bei der Registrierung:</p>
                <p className="text-sm">{formError}</p>
              </div>
            </div>
          )}

          <div className="w-full space-y-6 mb-8">
            <div>
              <label
                htmlFor="accountHolder"
                className={`block text-sm font-medium mb-1 ${hasAttemptedSubmit && !accountHolder?.trim() ? 'text-red-600' : 'text-gray-700'}`}
              >
                Name des Kontoinhabers*
              </label>
              <input
                type="text"
                id="accountHolder"
                value={accountHolder || ''}
                onChange={e => setAccountHolder(e.target.value.trim())}
                className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm ${hasAttemptedSubmit && !accountHolder?.trim() ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Max Mustermann"
                disabled={isLoading || isConvertingImage}
              />
            </div>
            <div>
              <label
                htmlFor="iban"
                className={`block text-sm font-medium mb-1 ${hasAttemptedSubmit && !iban?.trim() ? 'text-red-600' : 'text-gray-700'}`}
              >
                IBAN*
              </label>
              <input
                type="text"
                id="iban"
                value={iban || ''}
                onChange={e => setIban(e.target.value.replace(/\s/g, ''))}
                className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm ${hasAttemptedSubmit && !iban?.trim() ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="DE89..."
                disabled={isLoading || isConvertingImage}
              />
            </div>
            <div className="mt-6">
              <label
                className={`block text-sm font-medium mb-1 ${hasAttemptedSubmit && !(identityFrontFile instanceof File) ? 'text-red-600' : 'text-gray-700'}`}
              >
                Ausweis Vorderseite* (max. {MAX_ID_DOC_SIZE_BYTES / (1024 * 1024)}MB, JPEG/PNG)
              </label>
              {identityFrontPreview && (
                <div className="my-2 max-h-32 rounded-lg border border-gray-300 p-1 flex justify-center items-center overflow-hidden">
                  <Image
                    src={identityFrontPreview}
                    alt="Vorschau Vorderseite"
                    width={200}
                    height={128}
                    style={{ objectFit: 'contain' }}
                    className="max-h-full max-w-full"
                  />
                </div>
              )}
              <input
                type="file"
                id="identityFrontInput"
                accept="image/jpeg, image/png"
                onChange={e =>
                  handleFileChangeAndPreview(
                    e,
                    setIdentityFrontFile,
                    setIdentityFrontPreview,
                    MAX_ID_DOC_SIZE_BYTES,
                    'Ausweis Vorderseite',
                    false
                  )
                }
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
              />
              {identityFrontFile && (
                <p className="mt-1 text-xs text-gray-600">
                  {identityFrontFile.name} ({(identityFrontFile.size / (1024 * 1024)).toFixed(2)}MB)
                </p>
              )}
              {hasAttemptedSubmit && !(identityFrontFile instanceof File) && (
                <p className="mt-1 text-xs text-red-500">Ausweis Vorderseite ist erforderlich.</p>
              )}
            </div>
            <div>
              <label
                className={`block text-sm font-medium mb-1 ${hasAttemptedSubmit && !(identityBackFile instanceof File) ? 'text-red-600' : 'text-gray-700'}`}
              >
                Ausweis Rückseite* (max. {MAX_ID_DOC_SIZE_BYTES / (1024 * 1024)}MB, JPEG/PNG)
              </label>
              {identityBackPreview && (
                <div className="my-2 max-h-32 rounded-lg border border-gray-300 p-1 flex justify-center items-center overflow-hidden">
                  <Image
                    src={identityBackPreview}
                    alt="Vorschau Rückseite"
                    width={200}
                    height={128}
                    style={{ objectFit: 'contain' }}
                    className="max-h-full max-w-full"
                  />
                </div>
              )}
              <input
                type="file"
                id="identityBackInput"
                accept="image/jpeg, image/png"
                onChange={e =>
                  handleFileChangeAndPreview(
                    e,
                    setIdentityBackFile,
                    setIdentityBackPreview,
                    MAX_ID_DOC_SIZE_BYTES,
                    'Ausweis Rückseite',
                    false
                  )
                }
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
              />
              {identityBackFile && (
                <p className="mt-1 text-xs text-gray-600">
                  {identityBackFile.name} ({(identityBackFile.size / (1024 * 1024)).toFixed(2)}MB)
                </p>
              )}
              {hasAttemptedSubmit && !(identityBackFile instanceof File) && (
                <p className="mt-1 text-xs text-red-500">Ausweis Rückseite ist erforderlich.</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleRegistration}
            disabled={
              isLoading ||
              isConvertingImage ||
              isProcessingImage ||
              isRedirecting ||
              (hasAttemptedSubmit && !isFormValid())
            }
            className={`w-full py-3 px-6 rounded-lg font-semibold text-lg text-white transition-colors duration-150 ease-in-out
              ${
                !isFormValid() ||
                isLoading ||
                isConvertingImage ||
                isProcessingImage ||
                isRedirecting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2'
              }`}
          >
            {isLoading || isConvertingImage || isProcessingImage || isRedirecting ? (
              <span className="flex items-center justify-center">
                <FiLoader className="animate-spin h-5 w-5 mr-3" />
                <span>{currentStepMessage || 'Bitte warten...'}</span>
              </span>
            ) : (
              'Registrierung abschließen & Zahlungskonto einrichten'
            )}
          </button>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Mit Klick bestätigst du die Richtigkeit deiner Angaben und stimmst unseren AGB &
            Datenschutzbestimmungen zu.
          </p>
        </div>
      </div>
    </div>
  );
}
