'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, app as firebaseApp } from '../../firebase/clients';
import GeneralForm from '@/components/dashboard_setting/allgemein';
import AccountingForm from '@/components/dashboard_setting/buchhaltung&steuern';
import BankForm from '@/components/dashboard_setting/bankverbindung';
import LogoForm from '@/components/dashboard_setting/logo';
import { PAGE_ERROR } from '@/lib/constants'; // Stellen Sie sicher, dass dies korrekt ist
import { Loader2 as FiLoader, Save as FiSave, X as FiX } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'; // Firebase Storage Funktionen
import Stripe from 'stripe';
import { findCategoryBySubcategory } from '@/lib/categoriesData'; // Import der Kategorie-Mapping-Funktion

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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
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
    lastInvoiceNumber?: string; // Für Rechnungsnummern-Migration
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
  profileBannerImage: string | null;
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
    'general' | 'accounting' | 'bank' | 'logo' | 'payouts' | 'storno'
  >('general');
  const [showManagingDirectorPersonalModal, setShowManagingDirectorPersonalModal] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Timeout nach 10 Sekunden, um Fallback-Formular zu laden
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!form && userData) {
        console.log('⚠️ Settings: Loading timeout reached, creating fallback form');
        setLoadingTimeout(true);

        // Erstelle minimales Fallback-Formular mit type assertion für dynamische Eigenschaften
        const userDataAny = userData as any;

        setForm({
          uid: userData.uid || '',
          email: userData.email || '',
          user_type: userData.user_type || 'company',
          step1: {
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            phoneNumber: userData.phoneNumber || '',
            email: userData.email || '',
            dateOfBirth: userData.dateOfBirth || '',
            personalStreet: userData.personalStreet || '',
            personalHouseNumber: userData.personalHouseNumber || '',
            personalPostalCode: userData.personalPostalCode || '',
            personalCity: userData.personalCity || '',
            personalCountry: userData.personalCountry || 'DE',
            isManagingDirectorOwner: userData.isManagingDirectorOwner ?? true,
          },
          step2: {
            companyName: userData.companyName || '',
            companySuffix: userDataAny.companySuffix || '',
            companyPhoneNumber: userData.companyPhoneNumber || userData.phoneNumber || '',
            legalForm: userData.legalForm || null,
            address: userData.address || userData.personalStreet || '',
            street: userData.companyStreet || userData.personalStreet || '',
            houseNumber: userData.companyHouseNumber || userData.personalHouseNumber || '',
            postalCode: userData.companyPostalCode || userData.personalPostalCode || '',
            city: userData.companyCity || userData.personalCity || '',
            country: userData.companyCountry || userData.personalCountry || 'DE',
            website: userData.companyWebsite || userDataAny.website || '',
            fax: userDataAny.fax || '',
            languages: userDataAny.languages || '',
            description: userDataAny.publicDescription || userDataAny.description || '',
            employees: userDataAny.employees || '',
            industry: userDataAny.industry || userData.selectedCategory || '',
            industryMcc: userData.industryMcc || '',
          },
          step3: {
            hourlyRate: String(userData.hourlyRate || '0'),
            taxNumber: userData.taxNumber || '',
            vatId: userData.vatId || '',
            companyRegister: userData.companyRegister || '',
            profilePictureURL:
              userData.profilePictureFirebaseUrl ||
              userData.profilePictureURL ||
              '/default-avatar.png',
            businessLicenseURL: userData.businessLicenseURL || null,
            masterCraftsmanCertificateURL: userData.masterCraftsmanCertificateURL || null,
            identityFrontUrl: userData.identityFrontUrl || null,
            identityBackUrl: userData.identityBackUrl || null,
            districtCourt: '',
            ust: 'standard',
            profitMethod: 'euer',
            taxMethod: 'soll',
            defaultTaxRate: '19',
            accountingSystem: 'skr03',
            priceInput: 'netto',
          },
          step4: {
            accountHolder: userData.accountHolder || '',
            iban: userData.iban || '',
            bankCountry: userData.bankCountry || 'DE',
          },
          lat: userData.lat || null,
          lng: userData.lng || null,
          radiusKm: userData.radiusKm || 30,
          selectedCategory: userData.selectedCategory || null,
          selectedSubcategory: userData.selectedSubcategory || null,
          profileBannerImage: userDataAny.profileBannerImage || null,
          stripeAccountId: userData.stripeAccountId || null,
          profilePictureFile: null,
          businessLicenseFile: null,
          masterCraftsmanCertificateFile: null,
          identityFrontFile: null,
          identityBackFile: null,
        });
      }
    }, 10000); // 10 Sekunden Timeout

    return () => clearTimeout(timer);
  }, [userData, form]);

  useEffect(() => {
    console.log('🔧 SettingsComponent: useEffect triggered with userData:', userData);

    if (!userData) {
      console.log('❌ SettingsComponent: No userData provided');
      return;
    }

    try {
      console.log('🔄 SettingsComponent: Processing userData...');

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

      // DEBUG: Check languages specifically
      console.log('🗣️ Languages Debug:', {
        'step2.languages': get('step2.languages', 'NOT_FOUND'),
        languages: get('languages', 'NOT_FOUND'),
        combined: get('step2.languages', get('languages', 'BOTH_NOT_FOUND')),
        userData: userData,
      });

      const formData: UserDataForSettings = {
        uid: userData.uid,
        email: userData.email,
        user_type: userData.user_type,
        step1: {
          firstName: get('step1.firstName', get('firstName', '')),
          lastName: get('step1.lastName', get('lastName', '')),
          phoneNumber: get('step1.phoneNumber', get('phoneNumber', '')),
          email: get('step1.email', get('email', '')),
          dateOfBirth: get('step1.dateOfBirth', get('dateOfBirth', '')),
          personalStreet: get('step1.personalStreet', get('personalStreet', '')),
          personalHouseNumber: get('step1.personalHouseNumber', get('personalHouseNumber', '')),
          personalPostalCode: get('step1.personalPostalCode', get('personalPostalCode', '')),
          personalCity: get('step1.personalCity', get('personalCity', '')),
          personalCountry: get('step1.personalCountry', get('personalCountry', 'DE')),
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
            get('companyPhoneNumber', get('companyPhoneNumberForBackend', get('phoneNumber', '')))
          ),
          legalForm: get('step2.legalForm', get('legalForm', null)),
          address: get(
            'step2.address',
            get('companyAddressLine1ForBackend', get('personalStreet', get('address', '')))
          ),
          street: get(
            'step2.street',
            get('companyAddressLine1ForBackend', get('personalStreet', get('street', '')))
          ),
          houseNumber: get('step2.houseNumber', get('personalHouseNumber', get('houseNumber', ''))),
          postalCode: get(
            'step2.postalCode',
            get('companyPostalCodeForBackend', get('personalPostalCode', get('postalCode', '')))
          ),
          city: get(
            'step2.city',
            get('companyCityForBackend', get('personalCity', get('city', '')))
          ),
          country: get(
            'step2.country',
            get('companyCountryForBackend', get('personalCountry', get('country', 'DE')))
          ),
          website: get('step2.website', get('companyWebsiteForBackend', get('website', ''))),
          fax: get('step2.fax', get('fax', '')),
          languages: get('step2.languages', get('languages', '')),
          description: get('step2.description', get('publicDescription', get('description', ''))),
          employees: get('step2.employees', get('employees', '')),
          industry: (() => {
            // Vereinfachte Industrie-Logik
            const existingIndustry = get('step2.industry', '');
            if (
              existingIndustry &&
              existingIndustry !== 'Bitte wählen' &&
              existingIndustry !== ''
            ) {
              return existingIndustry;
            }

            const subcategory = get('selectedSubcategory', '') as string;
            if (subcategory && subcategory !== '') {
              try {
                const mappedCategory = findCategoryBySubcategory(subcategory);
                if (mappedCategory) {
                  return mappedCategory;
                }
              } catch (error) {
                console.warn('Error mapping category:', error);
              }
            }

            const selectedCategory = get('selectedCategory', '') as string;
            if (
              selectedCategory &&
              selectedCategory !== 'Bitte wählen' &&
              selectedCategory !== ''
            ) {
              return selectedCategory;
            }

            return get('industry', '');
          })(),
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
          bic: get('step4.bic', get('bic', '')),
          bankName: get('step4.bankName', get('bankName', '')),
        },
        lat: (() => {
          const existingLat = get('lat', null);
          if (existingLat !== null) return existingLat;
          const city = get('step2.city', get('personalCity', ''));
          return city.includes('Sellin') ? 54.3833 : null;
        })(),
        lng: (() => {
          const existingLng = get('lng', null);
          if (existingLng !== null) return existingLng;
          const city = get('step2.city', get('personalCity', ''));
          return city.includes('Sellin') ? 13.7167 : null;
        })(),
        radiusKm: get('radiusKm', 30),
        selectedCategory: get('selectedCategory', get('step2.industry', null)),
        selectedSubcategory: get('selectedSubcategory', null),
        profileBannerImage: get('profileBannerImage', null),
        stripeAccountId: get('stripeAccountId', null),
        profilePictureFile: null,
        businessLicenseFile: null,
        masterCraftsmanCertificateFile: null,
        identityFrontFile: null,
        identityBackFile: null,
      };

      console.log('✅ SettingsComponent: Form data created successfully:', formData);
      setForm(formData);
    } catch (error) {
      console.error('❌ SettingsComponent: Error processing userData:', error);
      // Fallback: Setze ein minimales form object
      setForm({
        uid: userData.uid || '',
        email: userData.email || '',
        user_type: userData.user_type || '',
        step1: {
          firstName: '',
          lastName: '',
          phoneNumber: '',
          email: userData.email || '',
          dateOfBirth: '',
          personalStreet: '',
          personalHouseNumber: '',
          personalPostalCode: '',
          personalCity: '',
          personalCountry: 'DE',
          isManagingDirectorOwner: true,
        },
        step2: {
          companyName: '',
          companySuffix: '',
          companyPhoneNumber: '',
          legalForm: null,
          address: '',
          street: '',
          houseNumber: '',
          postalCode: '',
          city: '',
          country: 'DE',
          website: '',
          fax: '',
          languages: '',
          description: '',
          employees: '',
          industry: '',
          industryMcc: '',
        },
        step3: {
          hourlyRate: '0',
          taxNumber: '',
          vatId: '',
          companyRegister: '',
          profilePictureURL: '/default-avatar.png',
          businessLicenseURL: null,
          masterCraftsmanCertificateURL: null,
          identityFrontUrl: null,
          identityBackUrl: null,
          districtCourt: '',
          ust: 'standard',
          profitMethod: 'euer',
          taxMethod: 'soll',
          defaultTaxRate: '19',
          accountingSystem: 'skr03',
          priceInput: 'netto',
        },
        step4: {
          accountHolder: '',
          iban: '',
          bankCountry: 'DE',
        },
        lat: null,
        lng: null,
        radiusKm: 30,
        selectedCategory: null,
        selectedSubcategory: null,
        profileBannerImage: null,
        stripeAccountId: null,
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

    // KRITISCHE KORREKTUR: Trenne Benutzerdaten von Firmendaten

    // 1. BENUTZER-DATEN für users collection (nur persönliche Daten)
    const userUpdateData: { [key: string]: any } = {
      firstName: updatedForm.step1.firstName,
      lastName: updatedForm.step1.lastName,
      email: updatedForm.step1.email,
      phoneNumber: updatedForm.step1.phoneNumber,
      updatedAt: new Date().toISOString(),
    };

    // 2. FIRMA-DATEN für companies collection (alle step1-4 + business Daten)
    const companyUpdateData: { [key: string]: any } = {
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
      'step3.districtCourt': updatedForm.step3.districtCourt,
      'step3.ust': updatedForm.step3.ust,
      'step3.profitMethod': updatedForm.step3.profitMethod,
      'step3.taxMethod': updatedForm.step3.taxMethod,
      'step3.defaultTaxRate': updatedForm.step3.defaultTaxRate,
      'step3.accountingSystem': updatedForm.step3.accountingSystem,
      'step3.priceInput': updatedForm.step3.priceInput,
      'step3.lastInvoiceNumber': updatedForm.step3.lastInvoiceNumber,
      'step4.accountHolder': updatedForm.step4?.accountHolder || '',
      'step4.iban': updatedForm.step4?.iban || '',
      'step4.bankCountry': updatedForm.step4?.bankCountry || '',
      'step4.bic': updatedForm.step4?.bic || '',
      'step4.bankName': updatedForm.step4?.bankName || '',
      firstName: updatedForm.step1.firstName,
      lastName: updatedForm.step1.lastName,
      phoneNumber: updatedForm.step1.phoneNumber,
      personalStreet: updatedForm.step1.personalStreet,
      personalHouseNumber: updatedForm.step1.personalHouseNumber,
      personalPostalCode: updatedForm.step1.personalPostalCode,
      personalCity: updatedForm.step1.personalCity,
      personalCountry: updatedForm.step1.personalCountry,
      companyName: updatedForm.step2.companyName,
      companyPhoneNumber: updatedForm.step2.companyPhoneNumber,
      companyAddressLine1ForBackend: updatedForm.step2.address,
      companyPostalCodeForBackend: updatedForm.step2.postalCode,
      companyCityForBackend: updatedForm.step2.city,
      companyCountryForBackend: updatedForm.step2.country,
      companyWebsiteForBackend: updatedForm.step2.website,
      companyPhoneNumberForBackend: updatedForm.step2.companyPhoneNumber,
      iban: updatedForm.step4?.iban || '',
      accountHolder: updatedForm.step4?.accountHolder || '',
      bankCountry: updatedForm.step4?.bankCountry || '',
      bic: updatedForm.step4?.bic || '',
      bankName: updatedForm.step4?.bankName || '',
      taxNumber: updatedForm.step3.taxNumber,
      vatId: updatedForm.step3.vatId,
      companyRegister: updatedForm.step3.companyRegister,
      districtCourt: updatedForm.step3.districtCourt,
      ust: updatedForm.step3.ust,
      profitMethod: updatedForm.step3.profitMethod,
      taxMethod: updatedForm.step3.taxMethod,
      defaultTaxRate: updatedForm.step3.defaultTaxRate,
      accountingSystem: updatedForm.step3.accountingSystem,
      priceInput: updatedForm.step3.priceInput,
      lastInvoiceNumber: updatedForm.step3.lastInvoiceNumber,
      hourlyRate: Number(updatedForm.step3.hourlyRate) || null,
      languages: updatedForm.step2.languages,
      description: updatedForm.step2.description,
      employees: updatedForm.step2.employees,
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
      updatedAt: new Date().toISOString(),
    };

    // Bilder und Stripe-Files zu company-Daten hinzufügen
    if (profilePictureFirebaseDownloadUrl) {
      companyUpdateData['step3.profilePictureURL'] = profilePictureFirebaseDownloadUrl;
      companyUpdateData['profilePictureURL'] = profilePictureFirebaseDownloadUrl;
      companyUpdateData['profilePictureFirebaseUrl'] = profilePictureFirebaseDownloadUrl;
      // Auch zu user-Daten für Profilbild
      userUpdateData['profilePictureURL'] = profilePictureFirebaseDownloadUrl;
    } else if (form.profilePictureFile === null) {
      companyUpdateData['step3.profilePictureURL'] = null;
      companyUpdateData['profilePictureURL'] = null;
      companyUpdateData['profilePictureFirebaseUrl'] = null;
      userUpdateData['profilePictureURL'] = null;
    }

    if (uploadedStripeFileIds.businessLicenseStripeFileId !== undefined) {
      companyUpdateData['step3.businessLicenseURL'] =
        uploadedStripeFileIds.businessLicenseStripeFileId;
      companyUpdateData['businessLicenseStripeId'] =
        uploadedStripeFileIds.businessLicenseStripeFileId;
    }
    if (uploadedStripeFileIds.masterCraftsmanCertificateStripeFileId !== undefined) {
      companyUpdateData['step3.masterCraftsmanCertificateURL'] =
        uploadedStripeFileIds.masterCraftsmanCertificateStripeFileId;
      companyUpdateData['masterCraftsmanCertificateStripeId'] =
        uploadedStripeFileIds.masterCraftsmanCertificateStripeFileId;
    }
    if (uploadedStripeFileIds.identityFrontStripeFileId !== undefined) {
      companyUpdateData['step3.identityFrontUrl'] = uploadedStripeFileIds.identityFrontStripeFileId;
      companyUpdateData['identityFrontUrlStripeId'] =
        uploadedStripeFileIds.identityFrontStripeFileId;
    }
    if (uploadedStripeFileIds.identityBackStripeFileId !== undefined) {
      companyUpdateData['step3.identityBackUrl'] = uploadedStripeFileIds.identityBackStripeFileId;
      companyUpdateData['identityBackUrlStripeId'] = uploadedStripeFileIds.identityBackStripeFileId;
    }

    try {
      // KRITISCHE KORREKTUR: Separate Updates für users und companies

      // Validate und clean data before sending to Firestore
      const cleanUserUpdateData = Object.fromEntries(
        Object.entries(userUpdateData).filter(([key, value]) => value !== undefined)
      );

      const cleanCompanyUpdateData = Object.fromEntries(
        Object.entries(companyUpdateData).filter(([key, value]) => value !== undefined)
      );

      console.log('User update data:', cleanUserUpdateData);
      console.log('Company update data:', cleanCompanyUpdateData);

      try {
        await updateDoc(doc(db, 'users', updatedForm.uid), cleanUserUpdateData);
        console.log('✅ User update successful');
      } catch (userError) {
        console.error('❌ User update failed:', userError);
        throw new Error(
          `User update failed: ${userError instanceof Error ? userError.message : 'Unknown error'}`
        );
      }

      try {
        await updateDoc(doc(db, 'companies', updatedForm.uid), cleanCompanyUpdateData);
        console.log('✅ Company update successful');
      } catch (companyError) {
        console.error('❌ Company update failed:', companyError);
        throw new Error(
          `Company update failed: ${companyError instanceof Error ? companyError.message : 'Unknown error'}`
        );
      }

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
  type TabKey = 'general' | 'accounting' | 'bank' | 'logo' | 'payouts' | 'storno';
  interface TabDefinition {
    key: TabKey;
    label: string;
  }

  const tabsToDisplay: TabDefinition[] = [
    { key: 'general', label: 'Allgemein' },
    { key: 'accounting', label: 'Buchhaltung & Steuer' },
    { key: 'bank', label: 'Bankverbindung' },
    { key: 'logo', label: 'Logo & Dokumente' },
    { key: 'payouts', label: 'Auszahlungen' },
    { key: 'storno', label: 'Storno-Einstellungen' },
  ];

  if (!form) {
    return (
      <div className="p-6 flex flex-col justify-center items-center min-h-[300px] space-y-4">
        <FiLoader className="animate-spin h-8 w-8 text-teal-600" />
        <div className="text-center">
          <span className="text-lg font-semibold text-gray-700">
            {loadingTimeout ? 'Erstelle Fallback-Formular...' : 'Lade Einstellungen...'}
          </span>
          <p className="text-sm text-gray-500 mt-2">
            {loadingTimeout
              ? 'Das Laden hat länger gedauert, verwende Basis-Daten...'
              : 'Falls das Laden zu lange dauert, versuchen Sie die Seite neu zu laden.'}
          </p>
        </div>

        {/* Debug Information (nur in Development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg text-xs text-gray-600 max-w-md">
            <p>
              <strong>Debug Info:</strong>
            </p>
            <p>userData: {userData ? 'vorhanden' : 'nicht vorhanden'}</p>
            <p>form: {form ? 'vorhanden' : 'nicht vorhanden'}</p>
            <p>loadingTimeout: {loadingTimeout ? 'ja' : 'nein'}</p>
            {userData && <p>userData.uid: {userData.uid}</p>}
          </div>
        )}
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
          {activeTab === 'accounting' && 'Buchhaltung & Steuern'}
          {activeTab === 'bank' && 'Bankverbindung'}
          {activeTab === 'logo' && 'Logo & Dokumente'}
          {activeTab === 'payouts' && 'Auszahlungen & Rechnungen'}
          {activeTab === 'storno' && 'Storno-Einstellungen'}
        </h2>

        {form && activeTab === 'general' && (
          <GeneralForm
            formData={form}
            handleChange={handleChange}
            onOpenManagingDirectorPersonalModal={() => setShowManagingDirectorPersonalModal(true)}
          />
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
        {activeTab === 'storno' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Storno-Einstellungen & Bedingungen
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Konfigurieren Sie Ihre Stornierungsbedingungen, Gebühren und automatische
                  Genehmigungen.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href={`/dashboard/company/${user?.uid}/settings/storno`}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-[#14ad9f] hover:bg-[#129a8f] transition-colors"
                >
                  Storno-Einstellungen verwalten
                </Link>

                <div className="text-sm text-gray-500 dark:text-gray-400 pt-3">
                  Hier können Sie Ihre Stornierungsbedingungen, Gebühren und automatische
                  Genehmigungsregeln konfigurieren.
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Wichtige Hinweise zu Stornierungen
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start">
                  <span className="text-[#14ad9f] mr-2">•</span>
                  Alle Stornierungen werden durch einen Admin geprüft und genehmigt
                </li>
                <li className="flex items-start">
                  <span className="text-[#14ad9f] mr-2">•</span>
                  Kunden haben bei Lieferverzug ein automatisches Storno-Recht
                </li>
                <li className="flex items-start">
                  <span className="text-[#14ad9f] mr-2">•</span>
                  Ihre Storno-Rate wird in Ihrem Provider-Score berücksichtigt
                </li>
                <li className="flex items-start">
                  <span className="text-[#14ad9f] mr-2">•</span>
                  Bei zu vielen Stornierungen kann Ihr Account temporär gesperrt werden
                </li>
                <li className="flex items-start">
                  <span className="text-[#14ad9f] mr-2">•</span>
                  Individuelle Storno-Bedingungen können konfiguriert werden
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
