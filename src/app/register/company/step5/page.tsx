'use client';
import Image from 'next/image';
import Link from 'next/link';

import React, {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import ProgressBar from '@/components/ProgressBar';
import { X, CheckCircle, AlertCircle, Loader2, CreditCard, Upload, Shield, ArrowRight, Lock, Building2, User, MapPin, Briefcase } from 'lucide-react';
import { useRegistration } from '@/contexts/Registration-Context';
import {
  getAuth,
  createUserWithEmailAndPassword,
  UserCredential,
  User as AuthUser,
  getIdToken,
} from 'firebase/auth';
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

// STRIPE DEAKTIVIERT - Escrow/Revolut System aktiv
// import type Stripe from 'stripe';

interface CreateAccountResult {
  success: boolean;
  message?: string;
}

interface FileUploadResult {
  fileId: string; // Umbenannt von fileId
  firebaseStorageUrl?: string;
  firebaseStoragePath?: string;
}

// STRIPE DEAKTIVIERT - Interface bleibt für Datensammlung
interface CompanyRegistrationData {
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
  bic?: string;
  bankName?: string;
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
// STRIPE DEAKTIVIERT - Verwende generischen File Purpose
type FilePurpose = 'identity_document' | 'additional_verification' | 'business_icon' | 'business_logo';

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
    bic, // 🔧 ADD: BIC aus Registration Context
    setBic, // 🔧 ADD: BIC setter
    bankName, // 🔧 ADD: bankName aus Registration Context
    setBankName, // 🔧 ADD: bankName setter
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
    selectedSkills,
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
      fileContextSetter: Dispatch<SetStateAction<File | null | undefined>>,
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

  // STRIPE DEAKTIVIERT - Upload nur noch in Firebase Storage
  const uploadFileToStorage = useCallback(
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
      
      // Upload direkt zu Firebase Storage statt Stripe
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', purpose);
      formData.append('userId', userId);

      // Verwende die Storage-Upload-API
      const uploadUrl = `/api/storage/upload`;

      let response: Response;
      try {
        response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          body: formData,
        });
      } catch (networkError: any) {
        const msg = networkError?.message || String(networkError);
        throw new Error(`Netzwerkfehler beim Upload von ${fileNameForLog}: ${msg}`);
      }

      if (!response.ok) {
        const errTxt = await response.text();
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
      if (result.success && result.fileId)
        return {
          fileId: result.fileId,
          firebaseStorageUrl: result.firebaseStorageUrl,
          firebaseStoragePath: result.firebaseStoragePath,
        };
      else throw new Error(result.message || `Upload-Fehler für ${fileNameForLog}.`);
    },
    []
  );

  const isFormValid = useCallback((): boolean => {
    if (!iban?.trim() || !accountHolder?.trim() || !bic?.trim() || !bankName?.trim()) return false; // 🔧 ADD: BIC und bankName Validierung
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

    // 🔧 DEBUG: Prüfe welche Steuerdaten aus dem Context kommen
    console.log('🔧 DEBUG Registration - Steuerdaten:', {
      vatId,
      taxNumber,
      companyPhoneNumber,
      companyWebsite,
      phoneNumber,
      iban,
      bic,
      bankName,
      accountHolder,
    });

    if (!isFormValid()) {
      const missingFieldsList: string[] = [];
      if (!iban?.trim()) missingFieldsList.push('IBAN');
      if (!accountHolder?.trim()) missingFieldsList.push('Kontoinhaber');
      if (!bic?.trim()) missingFieldsList.push('BIC'); // 🔧 ADD: BIC Validierung
      if (!bankName?.trim()) missingFieldsList.push('Bank Name'); // 🔧 ADD: bankName Validierung
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

      const profilePicResult = await uploadFileToStorage(
        profilePictureFile,
        'business_logo', // Profilbild als business_logo
        'Profilbild',
        currentAuthUserUID,
        idToken
      );
      const businessLicResult = await uploadFileToStorage(
        businessLicenseFile,
        'additional_verification',
        'Gewerbeschein',
        currentAuthUserUID,
        idToken
      );
      const idFrontResult = await uploadFileToStorage(
        identityFrontFile,
        'identity_document',
        'Ausweis Vorderseite',
        currentAuthUserUID,
        idToken
      );
      const idBackResult = await uploadFileToStorage(
        identityBackFile,
        'identity_document',
        'Ausweis Rückseite',
        currentAuthUserUID,
        idToken
      );

      let masterCertStripeFileId: string | undefined = undefined;
      let masterCertResult: FileUploadResult | null = null;
      if (masterCraftsmanCertificateFile instanceof File) {
        masterCertResult = await uploadFileToStorage(
          masterCraftsmanCertificateFile,
          'additional_verification',
          'Meisterbrief',
          currentAuthUserUID,
          idToken
        );
        masterCertStripeFileId = masterCertResult?.fileId;
      }

      // Validiere fileId UND firebaseStorageUrl für alle kritischen Uploads
      if (
        !profilePicResult?.fileId ||
        !businessLicResult?.fileId ||
        !idFrontResult?.fileId ||
        !idBackResult?.fileId
      ) {
        throw new Error('Ein oder mehrere kritische Datei-Uploads sind fehlgeschlagen (fileId fehlt).');
      }
      
      // KRITISCH: Profilbild-URL muss vorhanden sein für Header-Anzeige
      if (!profilePicResult.firebaseStorageUrl) {
        throw new Error(
          'Profilbild wurde hochgeladen, aber keine URL generiert. Bitte versuchen Sie es erneut.'
        );
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

      // KEIN USERS DOCUMENT ÜBERSCHREIBEN!
      // Companies gehören AUSSCHLIESSLICH in die companies Collection
      // Das users Document wurde bereits vom Firebase Auth Trigger erstellt

      // COMPANIES COLLECTION: Alle Firmendaten + Stripe + Onboarding
      const companyData: Record<string, unknown> = {
        uid: currentAuthUserUID,
        owner_uid: currentAuthUserUID, // Referenz zum User

        // Owner Daten (für User-Referenz)
        ownerEmail: email!,
        ownerFirstName: firstName?.trim() || '',
        ownerLastName: lastName?.trim() || '',

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

        // 🔧 FIX: Banking-Daten NICHT in Root-Level speichern - nur step4 Struktur verwenden
        // Banking-Daten werden durch Stripe Function in step4 geschrieben
        // iban: iban || '',  // ❌ ENTFERNT: Root-Level Banking überschreibt step4
        // accountHolder: accountHolder?.trim() || '',  // ❌ ENTFERNT
        // bankCountry: companyCountry || personalCountry || 'DE',  // ❌ ENTFERNT

        // Dokumente IDs (für Taskilo Escrow System)
        identityFrontFileId: idFrontResult.fileId,
        identityBackFileId: idBackResult.fileId,
        businessLicenseFileId: businessLicResult.fileId,
        masterCraftsmanCertificateFileId: masterCertStripeFileId || deleteField(),
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
        // 🔧 DEBUG: hourlyRate prüfen
        hourlyRate: (() => {
          const rate = Number(hourlyRate) || 0;

          return rate;
        })(),
        selectedCategory: selectedCategory || '',
        selectedSubcategory: selectedSubcategory || '',
        industryMcc: derivedMcc || null,
        lat: lat ?? null,
        lng: lng ?? null,
        radiusKm: radiusKm ?? 30,

        // Profile Picture (GEHÖRT ZUR FIRMA!)
        profilePictureURL: profilePicResult.firebaseStorageUrl || null,
        profilePictureFileId: profilePicResult.fileId,
        logoUrl: profilePicResult.firebaseStorageUrl || null, // Alias für Header-Anzeige

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

      // Null-Werte für undefined bereinigen und erweiterte Datenvalidierung
      const cleanedCompanyData = { ...companyData };

      Object.keys(cleanedCompanyData).forEach(key => {
        const value = cleanedCompanyData[key];

        // Entferne undefined Werte, aber behalte wichtige optionale Felder
        if (
          value === undefined &&
          key !== 'ownershipPercentage' &&
          key !== 'isActualDirector' &&
          key !== 'isActualOwner' &&
          key !== 'actualOwnershipPercentage' &&
          key !== 'isActualExecutive' &&
          key !== 'masterCraftsmanCertificateFileId'
        ) {
          cleanedCompanyData[key] = null;
        }

        // Validiere und bereinige verschachtelte Objekte
        if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
          // Prüfe ob es ein Firestore Timestamp ist
          if ((value as any)?.toDate && typeof (value as any).toDate === 'function') {
            // Firestore Timestamp - behalten
            return;
          }

          // Prüfe auf gültige Objekt-Struktur
          try {
            JSON.stringify(value);

            // Spezielle Behandlung für 'common' Objekt
            if (key === 'common') {
              // Bereinige das common Objekt
              const commonObj = value as any;
              const cleanCommon = {
                tosAcceptanceIp: String(commonObj.tosAcceptanceIp || ''),
                tosAcceptanceUserAgent: String(commonObj.tosAcceptanceUserAgent || ''),
                registrationCompletedAt: String(
                  commonObj.registrationCompletedAt || new Date().toISOString()
                ),
              };
              cleanedCompanyData[key] = cleanCommon;
            }
          } catch (error) {
            cleanedCompanyData[key] = null;
          }
        }

        // Validiere kritische String-Felder
        if (typeof value === 'string' && value.length > 10000) {
          cleanedCompanyData[key] = value.substring(0, 10000);
        }
      });

      // ENTFERNT: Kein Update der users Collection mehr!

      // WICHTIG 2: Companies document mit schrittweiser Erstellung (robusterer Ansatz)
      try {
        // Schritt 1: Nur die absolut notwendigen Basisdaten
        const coreData = {
          uid: currentAuthUserUID,
          email: email!,
          companyName: cleanedCompanyData.companyName || 'Unbekannt',
          legalForm: cleanedCompanyData.legalForm || 'Einzelunternehmen',
          // KRITISCH: user_type und accountType MÜSSEN in coreData sein für korrektes Routing!
          user_type: 'firma',
          accountType: 'business',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          // Storage: Default 500 MB Free Plan
          storageLimit: 500 * 1024 * 1024, // 500 MB
          storagePlanId: 'free',
          usage: {
            storageUsed: 0,
            firestoreUsed: 0,
            totalUsed: 0,
            lastUpdate: serverTimestamp(),
            stats: {
              totalFiles: 0,
              totalDocuments: 0,
            },
          },
        };

        await setDoc(doc(db, 'companies', currentAuthUserUID), coreData);

        // Schritt 2: Erweiterte Daten hinzufügen (nur sichere primitive Werte)
        const extendedData = {
          // Adressdaten
          companyCity: cleanedCompanyData.companyCity || null,
          companyPostalCode: cleanedCompanyData.companyPostalCode || null,
          companyCountry: cleanedCompanyData.companyCountry || 'DE',
          companyStreet: cleanedCompanyData.companyStreet || null,
          companyHouseNumber: cleanedCompanyData.companyHouseNumber || null,
          // Admin-kompatible Alias-Felder für Adresse
          city: cleanedCompanyData.companyCity || null,
          postalCode: cleanedCompanyData.companyPostalCode || null,
          country: cleanedCompanyData.companyCountry || 'DE',
          address: `${cleanedCompanyData.companyStreet || ''} ${cleanedCompanyData.companyHouseNumber || ''}`.trim() || null,
          
          // Kontaktdaten
          companyPhoneNumber: cleanedCompanyData.companyPhoneNumber || normalizedCompanyPhoneNumber || null,
          companyWebsite: cleanedCompanyData.companyWebsite || companyWebsite || null,
          // Admin-kompatible Alias-Felder für Kontakt
          phone: normalizedCompanyPhoneNumber || normalizedPersonalPhoneNumber || null,
          website: companyWebsite || null,
          
          // Steuerdaten (KRITISCH - fehlten vorher!)
          vatId: vatId || cleanedCompanyData.vatIdForBackend || null,
          taxNumber: taxNumber || cleanedCompanyData.taxNumberForBackend || null,
          
          // Banking-Daten (KRITISCH - fehlten vorher!)
          iban: iban || null,
          bic: bic || null,
          bankName: bankName || null,
          accountHolder: accountHolder?.trim() || null,
          
          // Persönliche Daten des Inhabers
          phoneNumber: cleanedCompanyData.phoneNumber || null,
          dateOfBirth: cleanedCompanyData.dateOfBirth || null,
          personalStreet: cleanedCompanyData.personalStreet || null,
          personalCity: cleanedCompanyData.personalCity || null,
          personalPostalCode: cleanedCompanyData.personalPostalCode || null,
          personalCountry: cleanedCompanyData.personalCountry || null,
          
          // Kategorien
          selectedCategory: cleanedCompanyData.selectedCategory || '',
          selectedSubcategory: cleanedCompanyData.selectedSubcategory || '',
          industry: cleanedCompanyData.selectedCategory || '', // Admin-kompatibles Alias
          description: cleanedCompanyData.description || '',
          skills: cleanedCompanyData.skills || [],
          serviceAreas: cleanedCompanyData.serviceAreas || [],
          
          // Benutzertyp
          user_type: 'firma',
          accountType: 'business',
          
          // Stundensatz
          hourlyRate: (() => {
            const rate = Number(cleanedCompanyData.hourlyRate) || Number(hourlyRate) || 0;
            return rate;
          })(),
          
          // Standort
          lat: cleanedCompanyData.lat || null,
          lng: cleanedCompanyData.lng || null,
          radiusKm: cleanedCompanyData.radiusKm || 30,
          location: `${cleanedCompanyData.companyCity || ''}${cleanedCompanyData.companyPostalCode ? ', ' + cleanedCompanyData.companyPostalCode : ''}`.trim(),
          
          // DOKUMENT-URLs (KRITISCH für Admin-Ansicht!)
          identityFrontUrl: idFrontResult.firebaseStorageUrl || null,
          identityBackUrl: idBackResult.firebaseStorageUrl || null,
          businessLicenseURL: businessLicResult.firebaseStorageUrl || null,
          profilePictureURL: profilePicResult.firebaseStorageUrl || null,
          logoUrl: profilePicResult.firebaseStorageUrl || null,
          masterCraftsmanCertificateUrl: masterCertResult?.firebaseStorageUrl || null,
          // Dokument File-IDs
          identityFrontFileId: idFrontResult.fileId || null,
          identityBackFileId: idBackResult.fileId || null,
          businessLicenseFileId: businessLicResult.fileId || null,
          profilePictureFileId: profilePicResult.fileId || null,
          masterCraftsmanCertificateFileId: masterCertStripeFileId || null,
          // Boolean-Flags für schnelle Prüfung
          hasIdentityDocuments: !!(idFrontResult.firebaseStorageUrl && idBackResult.firebaseStorageUrl),
          hasBusinessLicense: !!businessLicResult.firebaseStorageUrl,
          
          // Status
          status: 'pending_verification',
          profileComplete: false,
          updatedAt: serverTimestamp(),
        };

        // 🔧 DEBUG: Prüfe welche Steuerdaten in extendedData gespeichert werden
        console.log('🔧 DEBUG extendedData - Steuerdaten:', {
          vatId: extendedData.vatId,
          taxNumber: extendedData.taxNumber,
          phone: extendedData.phone,
          website: extendedData.website,
          iban: extendedData.iban,
          bic: extendedData.bic,
          bankName: extendedData.bankName,
          accountHolder: extendedData.accountHolder,
        });

        await updateDoc(doc(db, 'companies', currentAuthUserUID), extendedData);
      } catch (firestoreError) {
        // Absoluter Fallback: Nur Minimum ohne serverTimestamp
        try {
          const ultraMinimalData = {
            uid: currentAuthUserUID,
            email: email!,
            companyName: 'Temp Company',
            createdAt: new Date().toISOString(),
            status: 'error_during_creation',
          };

          await setDoc(doc(db, 'companies', currentAuthUserUID), ultraMinimalData);
        } catch (finalError) {}
      }

      // ============================================================
      // STRIPE DEAKTIVIERT - Zahlungssystem wird konfiguriert
      // ============================================================
      setCurrentStepMessage('Zahlungssystem wird konfiguriert...');

      // Sammle Registrierungsdaten für Firebase (ohne Stripe-Upload)
      const registrationData: CompanyRegistrationData = {
        userId: currentAuthUserUID,
        clientIp: clientIpAddress,
        firstName: firstName?.trim(),
        lastName: lastName?.trim(),
        email: email!,
        phoneNumber: normalizedPersonalPhoneNumber,
        dateOfBirth,
        personalStreet,
        personalHouseNumber,
        personalPostalCode,
        personalCity,
        personalCountry,
        isManagingDirectorOwner,
        ownershipPercentage: ownershipPercentage ?? undefined,
        isActualDirector: isActualDirector ?? undefined,
        isActualOwner: isActualOwner ?? undefined,
        actualOwnershipPercentage: actualOwnershipPercentage ?? undefined,
        isActualExecutive: isActualExecutive ?? undefined,
        actualRepresentativeTitle,
        companyName,
        legalForm,
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
        bic: bic?.trim(),
        bankName: bankName?.trim(),
        profilePictureFileId: profilePicResult.fileId,
        businessLicenseFileId: businessLicResult.fileId,
        masterCraftsmanCertificateFileId: masterCertStripeFileId,
        identityFrontFileId: idFrontResult.fileId,
        identityBackFileId: idBackResult.fileId,
        profilePictureUrl: profilePicResult.firebaseStorageUrl,
        businessLicenseUrl: businessLicResult.firebaseStorageUrl,
        masterCraftsmanCertificateUrl: masterCertResult?.firebaseStorageUrl,
        identityFrontUrl: idFrontResult.firebaseStorageUrl,
        identityBackUrl: idBackResult.firebaseStorageUrl,
      };

      if (
        registrationData.legalForm === 'Einzelunternehmen' ||
        registrationData.legalForm === 'Freiberufler'
      ) {
        registrationData.personalStreet = fullCompanyAddressForFirestore;
        registrationData.personalHouseNumber = '';
        registrationData.personalPostalCode = registrationData.companyPostalCode;
        registrationData.personalCity = registrationData.companyCity;
        registrationData.personalCountry = registrationData.companyCountry;
      }

      // ============================================================
      // STRIPE DEAKTIVIERT - ESCROW/REVOLUT-SYSTEM AKTIV
      // ============================================================
      // Stripe Account wird nicht mehr erstellt. Zahlungen laufen über das
      // neue Escrow/Revolut-System (siehe EscrowService).
      // Die Dokumente werden weiterhin in Firebase Storage gespeichert.
      
      setCurrentStepMessage('Zahlungssystem wird konfiguriert...');
      
      // Erfolgreiche Registrierung ohne Stripe
      const result = {
        success: true,
      };

      if (result.success) {
        const companyPaymentUpdate = {
          // KEIN stripeAccountId mehr
          paymentSystem: 'escrow_revolut', // Neues Zahlungssystem
          paymentSetupComplete: true,
          // Revolut-basiertes Auszahlungssystem
          revolutPayoutEnabled: true,
          updatedAt: serverTimestamp(),
        };
        // Update companies collection (wo alle Firmendaten liegen)
        await updateDoc(doc(db, 'companies', currentAuthUserUID), { ...companyPaymentUpdate });

        setCurrentStepMessage('Onboarding-System wird vorbereitet...');

        // 🔧 NUR COMPANIES COLLECTION - KEINE users Updates!

        // COMPANIES COLLECTION: Vollständige Onboarding-Daten
        // 🔧 FIX: Übertrage Registration-Daten in Onboarding-Struktur
        const step1Data = {
          companyName: companyName || '',
          legalForm: legalForm || '',
          address: {
            street: companyStreet || '',
            houseNumber: companyHouseNumber || '',
            postalCode: companyPostalCode || '',
            city: companyCity || '',
            country: companyCountry || 'DE',
          },
          companyRegister: companyRegister || '',
          // Steuerdaten (KRITISCH für GoBD-Compliance)
          vatId: vatId || '',
          taxNumber: taxNumber || '',
          // Kontaktdaten
          phone: companyPhoneNumber || '',
          website: companyWebsite || '',
        };

        const step2Data = {
          contactPerson: {
            firstName: firstName || '',
            lastName: lastName || '',
            email: email || '',
            phone: phoneNumber || '',
            dateOfBirth: dateOfBirth || '',
          },
          businessAddress: {
            street: personalStreet || '',
            houseNumber: personalHouseNumber || '',
            postalCode: personalPostalCode || '',
            city: personalCity || '',
            country: personalCountry || 'DE',
          },
          // Steuerdaten auch in step2 für Kompatibilität
          vatId: vatId || '',
          taxNumber: taxNumber || '',
        };

        const step3Data = {
          skills: selectedSkills || {},
          category: selectedCategory || '',
          subcategory: selectedSubcategory || '',
        };

        const step4Data = {
          availabilityType: 'flexible',
          maxDistance: radiusKm || 30,
          // 🔧 FIX: Banking-Daten aus Step5 hier speichern
          iban: iban || '',
          bic: bic || '',
          bankName: bankName || '',
          accountHolder: accountHolder?.trim() || '',
        };

        const step5Data = {
          // Dokument-IDs und URLs aus Step5 Registration speichern
          identityFrontFileId: idFrontResult.fileId,
          identityBackFileId: idBackResult.fileId,
          businessLicenseFileId: businessLicResult.fileId,
          masterCraftsmanCertificateFileId: masterCertStripeFileId || null,
          identityFrontUrl: idFrontResult.firebaseStorageUrl || null,
          identityBackUrl: idBackResult.firebaseStorageUrl || null,
          businessLicenseUrl: businessLicResult.firebaseStorageUrl || null,
          masterCraftsmanCertificateUrl: masterCertResult?.firebaseStorageUrl || null,
          documentsCompleted: true,
        };

        await updateDoc(doc(db, 'companies', currentAuthUserUID), {
          onboardingStartedAt: serverTimestamp(),
          onboardingCurrentStep: '1',
          onboardingStepData: {},
          onboardingCompletionPercentage: 0,
          onboardingCompleted: false,
          profileComplete: false,
          profileStatus: 'pending_onboarding',
          // Übertrage Registration-Daten in Step-Struktur
          step1: step1Data,
          step2: step2Data,
          step3: step3Data,
          step4: step4Data,
          step5: step5Data,
        });

        // ✅ NEU: Standard-Nummerkreise für neue Company erstellen
        setCurrentStepMessage('Nummerkreise werden eingerichtet...');
        try {
          // Import der NumberSequenceService erfolgt dynamisch um Import-Probleme zu vermeiden
          const { NumberSequenceService } = await import('@/services/numberSequenceService');
          await NumberSequenceService.createDefaultSequences(currentAuthUserUID);
        } catch (numberSequenceError) {
          console.warn('⚠️ Fehler beim Erstellen der Standard-Nummerkreise:', numberSequenceError);
          // Nicht blockierend - Registrierung läuft weiter
        }

        // SUCCESS: Registration abgeschlossen - harmonisiertes System ist bereits konfiguriert

        setCurrentStepMessage('Weiterleitung zum Onboarding...');
        setIsRedirecting(true);

        // Kurze Verzögerung für bessere UX
        setTimeout(() => {
          alert(
            'Registrierung abgeschlossen! Sie werden nun durch unser Onboarding-System geführt, um Ihr Firmenprofil zu vervollständigen.'
          );
          if (resetRegistrationData) resetRegistrationData();
          // Client-Side Navigation - useCompanyDashboard prüft jetzt firebaseUser
          router.push(`/dashboard/company/${currentAuthUserUID}/onboarding/welcome`);
        }, 1500);
      }
      // STRIPE DEAKTIVIERT - Fehlerfall kann nicht mehr auftreten
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
    <div className="min-h-screen flex flex-col">
      {/* Loading Overlay */}
      {(isLoading || isConvertingImage || isProcessingImage || isRedirecting) && (
        <div className="fixed inset-0 bg-gray-900/75 flex items-center justify-center z-101">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm mx-4">
            <Loader2 className="animate-spin h-10 w-10 mb-4 text-[#14ad9f]" />
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

      {/* Hero Section */}
      <div className="relative bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-800 text-white">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: "url('/images/features/accounting-hero.png')" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Navigation */}
          <div className="flex justify-between items-center mb-6">
            <Link 
              href="/register/company/step4"
              className={`flex items-center text-white/80 hover:text-white transition-colors ${isLoading || isRedirecting ? 'pointer-events-none opacity-50' : ''}`}
            >
              <span>Zurück</span>
            </Link>
            <Link 
              href="/"
              className={`flex items-center text-white/80 hover:text-white transition-colors ${isLoading || isRedirecting ? 'pointer-events-none opacity-50' : ''}`}
            >
              <span className="mr-2">Abbrechen</span>
              <X className="w-5 h-5" />
            </Link>
          </div>

          {/* Progress */}
          <div className="max-w-2xl mx-auto mb-6">
            <ProgressBar currentStep={5} totalSteps={5} />
          </div>

          {/* Title */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <p className="text-lg text-white/80 mb-4">Schritt 5 von 5</p>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Abschluss & Verifizierung
            </h1>
            <p className="text-lg text-white/80 max-w-xl mx-auto">
              Fast geschafft! Geben Sie Ihre Bankverbindung an und verifizieren Sie Ihre Identität.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-linear-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Summary Card - Shows what user has entered */}
            <div className="bg-linear-to-r from-[#14ad9f]/5 to-teal-50 rounded-2xl border border-[#14ad9f]/20 p-6 mb-8">
              <div className="flex items-center mb-4">
                <CheckCircle className="w-6 h-6 text-[#14ad9f] mr-3" />
                <h3 className="text-lg font-bold text-gray-800">Ihre bisherigen Angaben</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center">
                  <div className="p-2 bg-white rounded-lg shadow-sm mr-3">
                    <Building2 className="w-4 h-4 text-[#14ad9f]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Firma</p>
                    <p className="text-sm font-medium text-gray-800 truncate max-w-[120px]">{companyName || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="p-2 bg-white rounded-lg shadow-sm mr-3">
                    <User className="w-4 h-4 text-[#14ad9f]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="text-sm font-medium text-gray-800 truncate max-w-[120px]">{firstName} {lastName}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="p-2 bg-white rounded-lg shadow-sm mr-3">
                    <MapPin className="w-4 h-4 text-[#14ad9f]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Standort</p>
                    <p className="text-sm font-medium text-gray-800 truncate max-w-[120px]">{companyCity || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="p-2 bg-white rounded-lg shadow-sm mr-3">
                    <Briefcase className="w-4 h-4 text-[#14ad9f]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Branche</p>
                    <p className="text-sm font-medium text-gray-800 truncate max-w-[120px]">{selectedCategory || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {formError && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start mb-6"
              >
                <AlertCircle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Fehler bei der Registrierung:</p>
                  <p className="text-sm">{formError}</p>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Banking Section */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-[#14ad9f]/10 rounded-xl mr-3">
                      <CreditCard className="w-6 h-6 text-[#14ad9f]" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">Bankverbindung</h2>
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <Lock className="w-3 h-3 mr-1" />
                    SSL
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="accountHolder" className={`block text-sm font-medium mb-2 ${hasAttemptedSubmit && !accountHolder?.trim() ? 'text-red-600' : 'text-gray-700'}`}>
                      Kontoinhaber*
                    </label>
                    <input
                      type="text"
                      id="accountHolder"
                      value={accountHolder || ''}
                      onChange={e => setAccountHolder(e.target.value)}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] text-gray-800 transition-all ${hasAttemptedSubmit && !accountHolder?.trim() ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                      placeholder="Max Mustermann"
                      disabled={isLoading || isConvertingImage}
                    />
                  </div>
                  <div>
                    <label htmlFor="iban" className={`block text-sm font-medium mb-2 ${hasAttemptedSubmit && !iban?.trim() ? 'text-red-600' : 'text-gray-700'}`}>
                      IBAN*
                    </label>
                    <input
                      type="text"
                      id="iban"
                      value={iban || ''}
                      onChange={e => setIban(e.target.value.replace(/\s/g, ''))}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] text-gray-800 font-mono transition-all ${hasAttemptedSubmit && !iban?.trim() ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                      placeholder="DE89 3704 0044 0532 0130 00"
                      disabled={isLoading || isConvertingImage}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="bic" className={`block text-sm font-medium mb-2 ${hasAttemptedSubmit && !bic?.trim() ? 'text-red-600' : 'text-gray-700'}`}>
                        BIC*
                      </label>
                      <input
                        type="text"
                        id="bic"
                        value={bic || ''}
                        onChange={e => setBic(e.target.value.toUpperCase())}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] text-gray-800 font-mono transition-all ${hasAttemptedSubmit && !bic?.trim() ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                        placeholder="COBADEFFXXX"
                        disabled={isLoading || isConvertingImage}
                      />
                    </div>
                    <div>
                      <label htmlFor="bankName" className={`block text-sm font-medium mb-2 ${hasAttemptedSubmit && !bankName?.trim() ? 'text-red-600' : 'text-gray-700'}`}>
                        Bank*
                      </label>
                      <input
                        type="text"
                        id="bankName"
                        value={bankName || ''}
                        onChange={e => setBankName(e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] text-gray-800 transition-all ${hasAttemptedSubmit && !bankName?.trim() ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                        placeholder="Commerzbank"
                        disabled={isLoading || isConvertingImage}
                      />
                    </div>
                  </div>
                </div>

                {/* Secure Payment Badge */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-center text-xs text-gray-500">
                    <Lock className="w-3 h-3 mr-1" />
                    <span>Sichere Zahlungsabwicklung durch</span>
                    <span className="ml-1 font-semibold text-teal-600">Taskilo Escrow</span>
                  </div>
                </div>
              </motion.div>

              {/* Identity Verification Section */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-[#14ad9f]/10 rounded-xl mr-3">
                      <Shield className="w-6 h-6 text-[#14ad9f]" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">Identität</h2>
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <Lock className="w-3 h-3 mr-1" />
                    Verschlüsselt
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Front ID */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${hasAttemptedSubmit && !(identityFrontFile instanceof File) ? 'text-red-600' : 'text-gray-700'}`}>
                      Ausweis Vorderseite*
                    </label>
                    <div 
                      onClick={() => !isLoading && document.getElementById('identityFrontInput')?.click()}
                      className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all hover:border-[#14ad9f] hover:bg-teal-50/50 ${
                        hasAttemptedSubmit && !(identityFrontFile instanceof File) 
                          ? 'border-red-300 bg-red-50' 
                          : identityFrontFile 
                            ? 'border-[#14ad9f] bg-teal-50/30' 
                            : 'border-gray-200'
                      }`}
                    >
                      {identityFrontPreview ? (
                        <div className="relative">
                          <Image
                            src={identityFrontPreview}
                            alt="Vorschau Vorderseite"
                            width={180}
                            height={100}
                            style={{ objectFit: 'contain' }}
                            className="mx-auto rounded-lg"
                          />
                          <div className="absolute top-1 right-1 p-1 bg-green-500 rounded-full">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="py-4">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Klicken zum Hochladen</p>
                          <p className="text-xs text-gray-400 mt-1">JPEG oder PNG, max. 8MB</p>
                        </div>
                      )}
                      <input
                        type="file"
                        id="identityFrontInput"
                        accept="image/jpeg, image/png"
                        onChange={e => handleFileChangeAndPreview(e, setIdentityFrontFile, setIdentityFrontPreview, MAX_ID_DOC_SIZE_BYTES, 'Ausweis Vorderseite', false)}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Back ID */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${hasAttemptedSubmit && !(identityBackFile instanceof File) ? 'text-red-600' : 'text-gray-700'}`}>
                      Ausweis Rückseite*
                    </label>
                    <div 
                      onClick={() => !isLoading && document.getElementById('identityBackInput')?.click()}
                      className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all hover:border-[#14ad9f] hover:bg-teal-50/50 ${
                        hasAttemptedSubmit && !(identityBackFile instanceof File) 
                          ? 'border-red-300 bg-red-50' 
                          : identityBackFile 
                            ? 'border-[#14ad9f] bg-teal-50/30' 
                            : 'border-gray-200'
                      }`}
                    >
                      {identityBackPreview ? (
                        <div className="relative">
                          <Image
                            src={identityBackPreview}
                            alt="Vorschau Rückseite"
                            width={180}
                            height={100}
                            style={{ objectFit: 'contain' }}
                            className="mx-auto rounded-lg"
                          />
                          <div className="absolute top-1 right-1 p-1 bg-green-500 rounded-full">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="py-4">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Klicken zum Hochladen</p>
                          <p className="text-xs text-gray-400 mt-1">JPEG oder PNG, max. 8MB</p>
                        </div>
                      )}
                      <input
                        type="file"
                        id="identityBackInput"
                        accept="image/jpeg, image/png"
                        onChange={e => handleFileChangeAndPreview(e, setIdentityBackFile, setIdentityBackPreview, MAX_ID_DOC_SIZE_BYTES, 'Ausweis Rückseite', false)}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Security Info */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-center text-xs text-gray-500">
                    <Shield className="w-3 h-3 mr-1" />
                    <span>Daten werden verschlüsselt übertragen</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Submit Button */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-8 flex flex-col items-center"
            >
              <button
                type="button"
                onClick={handleRegistration}
                disabled={isLoading || isConvertingImage || isProcessingImage || isRedirecting || (hasAttemptedSubmit && !isFormValid())}
                className={`group w-full max-w-md py-4 px-8 rounded-xl font-semibold text-lg text-white transition-all duration-300 flex items-center justify-center ${
                  !isFormValid() || isLoading || isConvertingImage || isProcessingImage || isRedirecting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-linear-to-r from-[#14ad9f] to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-lg hover:shadow-xl hover:scale-[1.02]'
                }`}
              >
                {isLoading || isConvertingImage || isProcessingImage || isRedirecting ? (
                  <>
                    <Loader2 className="animate-spin w-5 h-5 mr-3" />
                    <span>{currentStepMessage || 'Bitte warten...'}</span>
                  </>
                ) : (
                  <>
                    Registrierung abschliessen
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
              
              <div className="mt-6 flex items-center justify-center space-x-6 text-xs text-gray-500">
                <div className="flex items-center">
                  <Lock className="w-3 h-3 mr-1" />
                  <span>256-bit SSL</span>
                </div>
                <div className="flex items-center">
                  <Shield className="w-3 h-3 mr-1" />
                  <span>DSGVO konform</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  <span>Verifiziert</span>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mt-4 text-center max-w-md">
                Mit Klick bestätigst du die Richtigkeit deiner Angaben und stimmst unseren AGB & Datenschutzbestimmungen zu.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
