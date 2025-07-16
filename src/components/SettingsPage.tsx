'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, app as firebaseApp } from '../firebase/clients';
import GeneralForm from '@/components/dashboard_setting/allgemein';
import AccountingForm from '@/components/dashboard_setting/buchhaltung&steuern';
import BankForm from '@/components/dashboard_setting/bankverbindung';
import LogoForm from '@/components/dashboard_setting/logo';
import PublicProfileForm from '@/components/dashboard_setting/public-profile';
import { PAGE_ERROR } from '@/lib/constants'; // Stellen Sie sicher, dass dies korrekt ist
import { Loader2 as FiLoader, Save as FiSave, X as FiX } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'; // Firebase Storage Funktionen
import Stripe from 'stripe';

// Firebase Storage wird noch für Bild-Uploads verwendet

type FormDataStep1 = UserDataForSettings['step1'];

interface ManagingDirectorPersonalDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: FormDataStep1;
  handleChange: (path: string, value: string | number | boolean | null) => void;
}

const ManagingDirectorPersonalDataModal: React.FC<ManagingDirectorPersonalDataModalProps> = ({
  isOpen,
  onClose,
  // formData, // ESLint: 'formData' is defined but never used. Uncomment if used in the full modal.
  // handleChange, // ESLint: 'handleChange' is defined but never used. Uncomment if used in the full modal.
}) => {
  // ... Modal-Implementierung (unverändert)
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <FiX size={24} />
        </button>
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Persönliche Daten des Geschäftsführers
        </h3>
        {/* Formularfelder hier */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#14ad9f] text-white py-2 px-4 rounded-md hover:bg-teal-700"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

export interface RawFirestoreUserData {
  uid: string;
  email: string;
  user_type: string;
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
  companyName?: string;
  legalForm?: string | null; // `legalForm` kann auch `null` sein
  address?: string;
  companyStreet?: string;
  companyHouseNumber?: string;
  companyPostalCode?: string;
  companyCity?: string;
  companyCountry?: string | null;
  companyPhoneNumber?: string;
  companyWebsite?: string;
  industryMcc?: string;
  iban?: string;
  accountHolder?: string;
  bankCountry?: string | null; // `bankCountry` kann auch `null` sein
  profilePictureURL?: string | null; // Erlaube `null`
  profilePictureFirebaseUrl?: string | null; // Erlaube `null`
  businessLicenseURL?: string | null; // Erlaube `null`
  masterCraftsmanCertificateURL?: string | null; // Erlaube `null`
  identityFrontUrl?: string | null; // Erlaube `null`
  identityBackUrl?: string | null; // Erlaube `null`
  identityFrontUrlStripeId?: string | null; // Hinzugefügt für root-level Speicherung
  identityBackUrlStripeId?: string | null; // Hinzugefügt für root-level Speicherung
  taxNumberForBackend?: string | null; // Hinzugefügt für root-level Speicherung
  vatIdForBackend?: string | null; // Hinzugefügt für root-level Speicherung
  hourlyRate?: string | number;
  taxNumber?: string;
  vatId?: string;
  companyRegister?: string | null; // `companyRegister` kann auch `null` sein
  lat?: number | null;
  lng?: number | null;
  radiusKm?: number | null; // `lat`, `lng`, `radiusKm` können `null` sein
  selectedCategory?: string | null;
  selectedSubcategory?: string | null; // `selectedCategory`, `selectedSubcategory` können `null` sein
  step1?: Record<string, any>;
  step2?: Record<string, any>; // `unknown` zu `any` geändert für einfachere Handhabung
  step3?: Record<string, unknown>;
  step4?: Record<string, unknown>; // eslint-disable-line
  common?: Record<string, unknown>;
  stripeAccountId?: string | null; // eslint-disable-line
  updatedAt?: any; // HINZUGEFÜGT: Für Firestore Timestamps
}

export interface UserDataForSettings {
  uid: string;
  email: string;
  user_type: string;
  step1: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
    dateOfBirth: string;
    personalStreet: string;
    personalHouseNumber: string;
    personalPostalCode: string;
    personalCity: string;
    personalCountry: string | null;
    isManagingDirectorOwner: boolean;
  };
  step2: {
    companyName: string;
    companyPhoneNumber: string;
    legalForm: string | null;
    address: string;
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    country: string | null;
    website: string;
    industry: string;
    industryMcc: string;
    companySuffix?: string;
    fax?: string;
    languages?: string;
    description?: string;
    employees?: string;
  };
  step3: {
    hourlyRate: string;
    taxNumber: string;
    vatId: string;
    companyRegister: string;
    profilePictureURL: string; // This has a valid fallback and is always a string.
    businessLicenseURL: string | null;
    masterCraftsmanCertificateURL: string | null;
    identityFrontUrl: string | null;
    identityBackUrl: string | null;
    districtCourt?: string;
    ust?: string;
    profitMethod?: string;
    taxMethod?: string;
    defaultTaxRate?: string;
    accountingSystem?: string;
    priceInput?: string;
  };
  step4: {
    accountHolder: string;
    iban: string;
    bankCountry: string | null;
    bic?: string;
    bankName?: string;
  };
  lat: number | null;
  lng: number | null;
  radiusKm: number | null;
  selectedCategory: string | null;
  selectedSubcategory: string | null;
  profilePictureFile: File | null;
  businessLicenseFile: File | null;
  masterCraftsmanCertificateFile: File | null;
  identityFrontFile: File | null;
  identityBackFile: File | null;
  stripeAccountId: string | null; // Erlaube `null`
}

interface SettingsPageProps {
  userData: RawFirestoreUserData | null;
  onDataSaved: () => void;
}

const SettingsPage = ({ userData, onDataSaved }: SettingsPageProps) => {
  const { user } = useAuth();
  const [form, setForm] = useState<UserDataForSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'general' | 'accounting' | 'bank' | 'logo' | 'public-profile' | 'payouts'
  >('general');
  const [showManagingDirectorPersonalModal, setShowManagingDirectorPersonalModal] = useState(false);

  useEffect(() => {
    if (userData) {
      const get = <T,>(path: string, fallback: T): T => {
        const keys = path.split('.');
        let current: unknown = userData;
        for (const key of keys) {
          if (
            typeof current !== 'object' ||
            current === null ||
            !Object.prototype.hasOwnProperty.call(current, key)
          ) {
            return fallback;
          }
          current = (current as Record<string, unknown>)[key];
        }
        return current === undefined || current === null ? fallback : (current as T);
      };
      setForm({
        uid: userData.uid,
        email: userData.email,
        user_type: userData.user_type,
        step1: {
          firstName: get('step1.firstName', get('firstName', '')),
          lastName: get('step1.lastName', get('lastName', '')),
          phoneNumber: get('step1.phoneNumber', get('phoneNumber', '')),
          email: get('step1.email', get('email', '')),
          dateOfBirth: get('step1.dateOfBirth', ''),
          personalStreet: get('step1.personalStreet', ''),
          personalHouseNumber: get('step1.personalHouseNumber', ''),
          personalPostalCode: get('step1.personalPostalCode', ''),
          personalCity: get('step1.personalCity', ''),
          personalCountry: get('step1.personalCountry', null),
          isManagingDirectorOwner: get(
            'step1.isManagingDirectorOwner',
            get('isManagingDirectorOwner', true)
          ),
        },
        step2: {
          companyName: get('step2.companyName', get('companyName', '')),
          companySuffix: get('step2.companySuffix', get('companySuffix', '')),
          companyPhoneNumber: get(
            'step2.companyPhoneNumber',
            get('companyPhoneNumber', get('companyPhoneNumberForBackend', ''))
          ),
          legalForm: get('step2.legalForm', get('legalForm', null)),
          address: get('step2.address', get('companyAddressLine1ForBackend', get('address', ''))),
          street: get('step2.street', get('companyAddressLine1ForBackend', get('street', ''))),
          houseNumber: get('step2.houseNumber', get('companyHouseNumber', '')),
          postalCode: get(
            'step2.postalCode',
            get('companyPostalCodeForBackend', get('postalCode', ''))
          ),
          city: get('step2.city', get('companyCityForBackend', get('city', ''))),
          country: get('step2.country', get('companyCountryForBackend', get('country', 'DE'))),
          website: get('step2.website', get('companyWebsiteForBackend', get('website', ''))),
          fax: get('step2.fax', get('fax', '')),
          languages: get('step2.languages', get('languages', '')),
          description: get('step2.description', get('publicDescription', '')),
          employees: get('step2.employees', get('employees', '')),
          industry: get('step2.industry', get('selectedCategory', '')),
          industryMcc: get('step2.industryMcc', get('industryMcc', '')),
        },
        step3: {
          hourlyRate: String(get('step3.hourlyRate', get('hourlyRate', '0'))),
          taxNumber: get('step3.taxNumber', get('taxNumber', '')),
          vatId: get('step3.vatId', get('vatId', '')),
          companyRegister: get('step3.companyRegister', get('companyRegister', '')),
          profilePictureURL: get(
            'profilePictureFirebaseUrl',
            get('step3.profilePictureURL', get('profilePictureURL', '/default-avatar.png'))
          ),
          businessLicenseURL: get('step3.businessLicenseURL', get('businessLicenseURL', null)),
          masterCraftsmanCertificateURL: get(
            'step3.masterCraftsmanCertificateURL',
            get('masterCraftsmanCertificateURL', null)
          ),
          identityFrontUrl: get('step3.identityFrontUrl', get('identityFrontUrl', null)),
          identityBackUrl: get('step3.identityBackUrl', get('identityBackUrl', null)),
          districtCourt: get('step3.districtCourt', ''),
          ust: get('step3.ust', 'standard'),
          profitMethod: get('step3.profitMethod', 'euer'),
          taxMethod: get('step3.taxMethod', 'soll'),
          defaultTaxRate: get('step3.defaultTaxRate', '19'),
          accountingSystem: get('step3.accountingSystem', 'skr03'),
          priceInput: get('step3.priceInput', 'netto'),
        },
        step4: {
          accountHolder: get('step4.accountHolder', get('accountHolder', '')),
          iban: get('step4.iban', get('iban', '')),
          bankCountry: get('step4.bankCountry', get('bankCountry', get('companyCountry', null))),
        },
        lat: get('lat', null),
        lng: get('lng', null),
        radiusKm: get('radiusKm', 30),
        selectedCategory: get('selectedCategory', get('step2.industry', null)), // Erlaube null
        selectedSubcategory: get('selectedSubcategory', null), // Erlaube null
        stripeAccountId: get('stripeAccountId', null),
        profilePictureFile: null,
        businessLicenseFile: null,
        masterCraftsmanCertificateFile: null,
        identityFrontFile: null,
        identityBackFile: null,
      });
    }
  }, [userData]);

  const handleChange = (path: string, value: string | number | boolean | File | null) => {
    setForm(prevForm => {
      if (!prevForm) return null;
      const updatedForm = JSON.parse(JSON.stringify(prevForm)) as UserDataForSettings;
      let currentPathObject: Record<string, unknown> = updatedForm as unknown as Record<
        string,
        unknown
      >;
      const keys = path.split('.');
      keys.forEach((key, index) => {
        if (index === keys.length - 1) {
          currentPathObject[key] = value;
        } else {
          if (
            !Object.prototype.hasOwnProperty.call(currentPathObject, key) ||
            typeof currentPathObject[key] !== 'object' ||
            currentPathObject[key] === null
          ) {
            currentPathObject[key] = {};
          }
          currentPathObject = currentPathObject[key] as Record<string, unknown>;
        }
      });
      return updatedForm;
    });
  };

  const mapIndustryToMcc = (industry: string | null | undefined): string | undefined => {
    if (!industry) return undefined;
    switch (industry) {
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
        return '7999';
      case 'Veranstaltungen & Events':
        return '7999';
      case 'Tiere & Pflanzen':
        return '0742';
      default:
        return '5999';
    }
  };

  const uploadFileAndUpdateFormState = async (
    file: File,
    purpose: Stripe.FileCreateParams.Purpose,
    formFieldForFileId: string
  ): Promise<string | undefined> => {
    if (!userData?.uid) {
      toast.error('Benutzer-ID fehlt für den Upload.');
      return undefined;
    }
    toast.info(`Lade ${file.name} hoch...`);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', purpose);
    formData.append('userId', userData.uid);
    const uploadUrl =
      process.env.NEXT_PUBLIC_UPLOAD_STRIPE_FILE_FUNCTION_URL || 'YOUR_FALLBACK_URL_HERE';
    try {
      const response = await fetch(uploadUrl, { method: 'POST', body: formData });
      const result = await response.json();
      if (response.ok && result.success && result.stripeFileId) {
        handleChange(formFieldForFileId, result.stripeFileId);
        toast.success(`${file.name} erfolgreich zu Stripe hochgeladen.`);
        return result.stripeFileId;
      } else {
        toast.error(result.message || `Fehler beim Upload von ${file.name}.`);
        return undefined;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unbekannter Netzwerkfehler.';
      toast.error(message);
      return undefined;
    }
  };

  const uploadFileToFirebaseStorage = async (
    file: File,
    uid: string,
    folder: string,
    fileName: string
  ): Promise<string | undefined> => {
    if (!uid) {
      toast.error('Benutzer-ID fehlt für den Firebase Storage Upload.');
      return undefined;
    }
    try {
      const storageInstance = getStorage(firebaseApp);
      const fileRef = storageRef(storageInstance, `${folder}/${uid}/${fileName}`);
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);
      return downloadURL;
    } catch (error: unknown) {
      console.error(`Fehler beim Hochladen von ${fileName} zu Firebase Storage:`, error);
      toast.error(
        `Fehler beim Hochladen von ${fileName}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      );
      return undefined;
    }
  };

  const handleSave = useCallback(async () => {
    if (!form || !form.uid) {
      toast.error('Keine Daten zum Speichern.');
      return;
    }
    setSaving(true);
    const updatedForm = { ...form };

    let profilePictureFirebaseDownloadUrl: string | null | undefined = form.step3.profilePictureURL;

    if (form.profilePictureFile) {
      toast.info('Lade Profilbild hoch...');
      const fileName = `profile_picture_${Date.now()}_${form.profilePictureFile.name}`;
      profilePictureFirebaseDownloadUrl = await uploadFileToFirebaseStorage(
        form.profilePictureFile,
        form.uid,
        'profilePictures',
        fileName
      );

      if (!profilePictureFirebaseDownloadUrl) {
        setSaving(false);
        return;
      }
    }

    // Statt Promise<any>[] => Promise<unknown>[] für Typsicherheit und keine any-Fehler
    const fileUploadPromises: Promise<unknown>[] = [];
    const uploadedStripeFileIds: { [key: string]: string | undefined | null } = {};

    if (form.businessLicenseFile) {
      fileUploadPromises.push(
        uploadFileAndUpdateFormState(
          form.businessLicenseFile,
          'additional_verification',
          'step3.businessLicenseURL'
        ).then(id => (uploadedStripeFileIds.businessLicenseStripeFileId = id))
      );
    } else if (form.businessLicenseFile === null) {
      uploadedStripeFileIds.businessLicenseStripeFileId = null;
    }
    if (form.masterCraftsmanCertificateFile) {
      fileUploadPromises.push(
        uploadFileAndUpdateFormState(
          form.masterCraftsmanCertificateFile,
          'additional_verification',
          'step3.masterCraftsmanCertificateURL'
        ).then(id => (uploadedStripeFileIds.masterCraftsmanCertificateStripeFileId = id))
      );
    } else if (form.masterCraftsmanCertificateFile === null) {
      uploadedStripeFileIds.masterCraftsmanCertificateStripeFileId = null;
    }
    if (form.identityFrontFile) {
      fileUploadPromises.push(
        uploadFileAndUpdateFormState(
          form.identityFrontFile,
          'identity_document',
          'step3.identityFrontUrl'
        ).then(id => (uploadedStripeFileIds.identityFrontStripeFileId = id))
      );
    } else if (form.identityFrontFile === null) {
      uploadedStripeFileIds.identityFrontStripeFileId = null;
    }
    if (form.identityBackFile) {
      fileUploadPromises.push(
        uploadFileAndUpdateFormState(
          form.identityBackFile,
          'identity_document',
          'step3.identityBackUrl'
        ).then(id => (uploadedStripeFileIds.identityBackStripeFileId = id))
      );
    } else if (form.identityBackFile === null) {
      uploadedStripeFileIds.identityBackStripeFileId = null;
    }

    await Promise.all(fileUploadPromises);

    if (
      (form.businessLicenseFile &&
        uploadedStripeFileIds.businessLicenseStripeFileId === undefined) ||
      (form.masterCraftsmanCertificateFile &&
        uploadedStripeFileIds.masterCraftsmanCertificateStripeFileId === undefined) ||
      (form.identityFrontFile && uploadedStripeFileIds.identityFrontStripeFileId === undefined) ||
      (form.identityBackFile && uploadedStripeFileIds.identityBackStripeFileId === undefined)
    ) {
      setSaving(false);
      return;
    }

    const firestoreUpdateData: { [key: string]: any } = {
      'step1.firstName': updatedForm.step1.firstName,
      'step1.lastName': updatedForm.step1.lastName,
      'step1.phoneNumber': updatedForm.step1.phoneNumber,
      'step1.email': updatedForm.step1.email,
      'step1.dateOfBirth': updatedForm.step1.dateOfBirth,
      'step1.personalStreet': updatedForm.step1.personalStreet,
      'step1.personalHouseNumber': updatedForm.step1.personalHouseNumber,
      'step1.personalPostalCode': updatedForm.step1.personalPostalCode,
      'step1.personalCity': updatedForm.step1.personalCity,
      'step1.personalCountry': updatedForm.step1.personalCountry,
      'step1.isManagingDirectorOwner': updatedForm.step1.isManagingDirectorOwner,
      'step2.companyName': updatedForm.step2.companyName,
      'step2.companyPhoneNumber': updatedForm.step2.companyPhoneNumber,
      'step2.legalForm': updatedForm.step2.legalForm,
      'step2.address': updatedForm.step2.address,
      'step2.street': updatedForm.step2.street,
      'step2.houseNumber': updatedForm.step2.houseNumber,
      'step2.postalCode': updatedForm.step2.postalCode,
      'step2.city': updatedForm.step2.city,
      'step2.country': updatedForm.step2.country,
      'step2.website': updatedForm.step2.website,
      'step2.fax': updatedForm.step2.fax,
      'step2.languages': updatedForm.step2.languages,
      'step2.description': updatedForm.step2.description,
      'step2.employees': updatedForm.step2.employees,
      'step2.industry': updatedForm.step2.industry,
      'step2.industryMcc':
        mapIndustryToMcc(updatedForm.step2.industry) || updatedForm.step2.industryMcc || null,
      'step3.hourlyRate': updatedForm.step3.hourlyRate,
      'step3.taxNumber': updatedForm.step3.taxNumber,
      'step3.vatId': updatedForm.step3.vatId,
      'step3.companyRegister': updatedForm.step3.companyRegister,
      'step4.accountHolder': updatedForm.step4.accountHolder,
      'step4.iban': updatedForm.step4.iban,
      'step4.bankCountry': updatedForm.step4.bankCountry,
      companyName: updatedForm.step2.companyName,
      companyPhoneNumber: updatedForm.step2.companyPhoneNumber,
      companyAddressLine1ForBackend: updatedForm.step2.address,
      companyPostalCodeForBackend: updatedForm.step2.postalCode,
      companyCityForBackend: updatedForm.step2.city,
      companyCountryForBackend: updatedForm.step2.country,
      companyWebsiteForBackend: updatedForm.step2.website,
      companyPhoneNumberForBackend: updatedForm.step2.companyPhoneNumber,
      iban: updatedForm.step4.iban,
      accountHolder: updatedForm.step4.accountHolder,
      legalForm: updatedForm.step2.legalForm,
      selectedCategory: updatedForm.step2.industry,
      industryMcc:
        mapIndustryToMcc(updatedForm.step2.industry) || updatedForm.step2.industryMcc || null,
      lat: updatedForm.lat,
      lng: updatedForm.lng,
      radiusKm: updatedForm.radiusKm,
      selectedSubcategory: updatedForm.selectedSubcategory,
      // Öffentliche Profil-Daten hinzufügen (mit Fallback-Werten)
      publicDescription: (updatedForm as any).publicProfile?.publicDescription || '',
      specialties: (updatedForm as any).publicProfile?.specialties || [],
      servicePackages: (updatedForm as any).publicProfile?.servicePackages || [],
      workingHours: (updatedForm as any).publicProfile?.workingHours || [],
      instantBooking: (updatedForm as any).publicProfile?.instantBooking ?? false,
      responseTimeGuarantee: (updatedForm as any).publicProfile?.responseTimeGuarantee || 24,
      faqs: (updatedForm as any).publicProfile?.faqs || [],
      profileBannerImage: (updatedForm as any).publicProfile?.profileBannerImage || '',
      businessLicense: (updatedForm as any).publicProfile?.businessLicense || '',
      certifications: (updatedForm as any).publicProfile?.certifications || [],
      updatedAt: serverTimestamp(),
    };

    if (profilePictureFirebaseDownloadUrl) {
      firestoreUpdateData['step3.profilePictureURL'] = profilePictureFirebaseDownloadUrl;
      firestoreUpdateData['profilePictureURL'] = profilePictureFirebaseDownloadUrl;
      firestoreUpdateData['profilePictureFirebaseUrl'] = profilePictureFirebaseDownloadUrl;
    } else if (form.profilePictureFile === null) {
      firestoreUpdateData['step3.profilePictureURL'] = null;
      firestoreUpdateData['profilePictureURL'] = null;
      firestoreUpdateData['profilePictureFirebaseUrl'] = null;
    }

    if (uploadedStripeFileIds.businessLicenseStripeFileId !== undefined) {
      firestoreUpdateData['step3.businessLicenseURL'] =
        uploadedStripeFileIds.businessLicenseStripeFileId;
      firestoreUpdateData['businessLicenseStripeId'] =
        uploadedStripeFileIds.businessLicenseStripeFileId;
    }
    if (uploadedStripeFileIds.masterCraftsmanCertificateStripeFileId !== undefined) {
      firestoreUpdateData['step3.masterCraftsmanCertificateURL'] =
        uploadedStripeFileIds.masterCraftsmanCertificateStripeFileId;
      firestoreUpdateData['masterCraftsmanCertificateStripeId'] =
        uploadedStripeFileIds.masterCraftsmanCertificateStripeFileId;
    }
    if (uploadedStripeFileIds.identityFrontStripeFileId !== undefined) {
      firestoreUpdateData['step3.identityFrontUrl'] =
        uploadedStripeFileIds.identityFrontStripeFileId;
      firestoreUpdateData['identityFrontUrlStripeId'] =
        uploadedStripeFileIds.identityFrontStripeFileId;
    }
    if (uploadedStripeFileIds.identityBackStripeFileId !== undefined) {
      firestoreUpdateData['step3.identityBackUrl'] = uploadedStripeFileIds.identityBackStripeFileId;
      firestoreUpdateData['identityBackUrlStripeId'] =
        uploadedStripeFileIds.identityBackStripeFileId;
    }

    try {
      await updateDoc(doc(db, 'users', updatedForm.uid), firestoreUpdateData);
      toast.success('Profildaten in Firestore gespeichert!');

      if (form.profilePictureFile && profilePictureFirebaseDownloadUrl) {
        window.dispatchEvent(
          new CustomEvent('profileUpdated', {
            detail: { profilePictureURL: profilePictureFirebaseDownloadUrl },
          })
        );
      } else if (form.profilePictureFile === null) {
        window.dispatchEvent(
          new CustomEvent('profileUpdated', { detail: { profilePictureURL: null } })
        );
      }

      // Stripe-Update entfernt - Daten werden nur in Firestore gespeichert
      toast.success('Profildaten erfolgreich gespeichert!');
      onDataSaved();
    } catch (error: unknown) {
      console.error(PAGE_ERROR, '[SettingsPage] Fehler beim Speichern:', error);
      let errorMessage = 'Ein unbekannter Fehler ist aufgetreten.';
      if (error && typeof error === 'object' && 'message' in error) {
        // Use the specific message from the backend (which now includes the Stripe error)
        errorMessage = (error as { message: string }).message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      // Zeige die spezifischere Fehlermeldung an
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [form, userData, onDataSaved, handleChange]); // Abhängigkeiten für useCallback

  // Alle Hooks müssen vor bedingten Returns aufgerufen werden
  type TabKey = 'general' | 'accounting' | 'bank' | 'logo' | 'public-profile' | 'payouts';
  interface TabDefinition {
    key: TabKey;
    label: string;
  }

  const tabsToDisplay: TabDefinition[] = [
    { key: 'general', label: 'Allgemein' },
    { key: 'public-profile', label: 'Öffentliches Profil' },
    { key: 'accounting', label: 'Buchhaltung & Steuer' },
    { key: 'bank', label: 'Bankverbindung' },
    { key: 'logo', label: 'Logo & Dokumente' },
    { key: 'payouts', label: 'Auszahlungen' },
  ];

  if (!form) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[300px]">
        <FiLoader className="animate-spin mr-3 h-8 w-8 text-teal-600" />
        <span>Lade Einstellungen...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-var(--header-height))] bg-background text-foreground">
      <aside className="w-full lg:w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6 space-y-1 lg:sticky lg:top-[var(--header-height)] lg:h-[calc(100vh-var(--header-height))] overflow-y-auto shrink-0">
        <div className="font-semibold text-gray-700 dark:text-gray-200 text-lg mb-4">
          Einstellung
        </div>
        <ul className="space-y-1">
          {tabsToDisplay.map(tab => (
            <li key={tab.key}>
              <button
                onClick={() => setActiveTab(tab.key)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${activeTab === tab.key ? 'bg-teal-100 text-teal-700 font-medium dark:bg-teal-800 dark:text-teal-100' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'}`}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex-1 p-6 sm:p-8 md:p-10 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-8">
          {activeTab === 'general' && 'Allgemeine Firmendaten'}
          {activeTab === 'public-profile' && 'Öffentliches Company-Profil'}
          {activeTab === 'accounting' && 'Buchhaltung & Steuern'}
          {activeTab === 'bank' && 'Bankverbindung'}
          {activeTab === 'logo' && 'Logo & Dokumente'}
          {activeTab === 'payouts' && 'Auszahlungen & Rechnungen'}
        </h2>

        {form && activeTab === 'general' && (
          <GeneralForm
            formData={form}
            handleChange={handleChange}
            onOpenManagingDirectorPersonalModal={() => setShowManagingDirectorPersonalModal(true)}
          />
        )}
        {form && activeTab === 'public-profile' && (
          <PublicProfileForm formData={form} handleChange={handleChange} />
        )}
        {form && activeTab === 'accounting' && (
          <AccountingForm formData={form} handleChange={handleChange} />
        )}
        {form && activeTab === 'bank' && <BankForm formData={form} handleChange={handleChange} />}
        {form && activeTab === 'logo' && <LogoForm formData={form} handleChange={handleChange} />}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Auszahlungshistorie & Rechnungen
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Verwalten Sie Ihre Auszahlungen und laden Sie Rechnungen für Ihre Buchführung
                  herunter.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href={`/dashboard/company/${user?.uid}/payouts`}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-[#14ad9f] hover:bg-[#129a8f] transition-colors"
                >
                  Auszahlungen verwalten
                </Link>

                <div className="text-sm text-gray-500 dark:text-gray-400 pt-3">
                  Hier können Sie alle Ihre Auszahlungen einsehen, den Status verfolgen und
                  Rechnungen für Ihre Buchführung herunterladen.
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Wichtige Hinweise zu Auszahlungen
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start">
                  <span className="text-[#14ad9f] mr-2">•</span>
                  Auszahlungen werden in der Regel innerhalb von 1-2 Werktagen bearbeitet
                </li>
                <li className="flex items-start">
                  <span className="text-[#14ad9f] mr-2">•</span>
                  Eine Plattformgebühr von 4,5% wird automatisch abgezogen
                </li>
                <li className="flex items-start">
                  <span className="text-[#14ad9f] mr-2">•</span>
                  Rechnungen stehen sofort nach der Auszahlung zum Download bereit
                </li>
                <li className="flex items-start">
                  <span className="text-[#14ad9f] mr-2">•</span>
                  Alle Beträge werden automatisch versteuert - Details in Ihrer Buchhaltung
                </li>
              </ul>
            </div>
          </div>
        )}

        <div className="pt-8 mt-8 border-t border-gray-200 dark:border-gray-700 flex flex-col lg:flex-row justify-between items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 rounded-md bg-[#14ad9f] text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center text-base"
          >
            {saving ? (
              <>
                <FiLoader className="animate-spin h-5 w-5 mr-2" /> Speichern...
              </>
            ) : (
              <>
                <FiSave className="h-5 w-5 mr-2" /> Änderungen speichern
              </>
            )}
          </button>
        </div>
      </main>

      {form && form.step1 && showManagingDirectorPersonalModal && (
        <ManagingDirectorPersonalDataModal
          isOpen={showManagingDirectorPersonalModal}
          onClose={() => setShowManagingDirectorPersonalModal(false)}
          formData={form.step1}
          handleChange={(path, value) => handleChange(`step1.${path}`, value)}
        />
      )}
    </div>
  );
};
export default SettingsPage;
