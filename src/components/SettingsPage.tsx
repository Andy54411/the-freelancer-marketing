'use client';

import React, { useEffect, useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, app as firebaseApp } from '../firebase/clients';
import { getFunctions, httpsCallable } from 'firebase/functions';
import GeneralForm from '@/components/dashboard_setting/allgemein';
import AccountingForm from '@/components/dashboard_setting/buchhaltung&steuern';
import BankForm from '@/components/dashboard_setting/bankverbindung';
import LogoForm from '@/components/dashboard_setting/logo';
import { PAGE_ERROR } from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/lib/constants';
import { FiLoader, FiSave, FiX } from 'react-icons/fi';
import { toast } from 'sonner';
import Stripe from 'stripe';

const firebaseFunctions = getFunctions(firebaseApp);

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
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <FiX size={24} />
        </button>
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Persönliche Daten des Geschäftsführers</h3>
        {/* Formularfelder hier */}
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="bg-[#14ad9f] text-white py-2 px-4 rounded-md hover:bg-teal-700">
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};


export interface RawFirestoreUserData {
  uid: string; email: string; user_type: string;
  firstName?: string; lastName?: string; phoneNumber?: string;
  dateOfBirth?: string; personalStreet?: string; personalHouseNumber?: string;
  personalPostalCode?: string; personalCity?: string; personalCountry?: string | null;
  isManagingDirectorOwner?: boolean; companyName?: string; legalForm?: string | null;
  address?: string; companyStreet?: string; companyHouseNumber?: string;
  companyPostalCode?: string; companyCity?: string; companyCountry?: string | null;
  companyPhoneNumber?: string; companyWebsite?: string; industryMcc?: string;
  iban?: string; accountHolder?: string; bankCountry?: string | null;
  profilePictureURL?: string; businessLicenseURL?: string;
  masterCraftsmanCertificateURL?: string; identityFrontUrl?: string; identityBackUrl?: string;
  hourlyRate?: string | number; taxNumber?: string; vatId?: string; companyRegister?: string;
  lat?: number | null; lng?: number | null; radiusKm?: number | null;
  selectedCategory?: string; selectedSubcategory?: string;
  step1?: Record<string, unknown>; step2?: Record<string, unknown>;
  step3?: Record<string, unknown>; step4?: Record<string, unknown>;
  common?: Record<string, unknown>; stripeAccountId?: string | null;
}

export interface UserDataForSettings {
  uid: string; email: string; user_type: string;
  step1: {
    firstName: string; lastName: string; phoneNumber: string; email: string;
    dateOfBirth: string; personalStreet: string; personalHouseNumber: string;
    personalPostalCode: string; personalCity: string; personalCountry: string | null;
    isManagingDirectorOwner: boolean;
  };
  step2: {
    companyName: string; companyPhoneNumber: string; legalForm: string | null;
    address: string; street: string; houseNumber: string; postalCode: string;
    city: string; country: string | null; website: string; industry: string;
    industryMcc: string; companySuffix?: string; fax?: string; languages?: string;
    description?: string; employees?: string;
  };
  step3: {
    hourlyRate: string; taxNumber: string; vatId: string; companyRegister: string;
    profilePictureURL: string; businessLicenseURL: string;
    masterCraftsmanCertificateURL: string; identityFrontUrl: string; identityBackUrl: string;
    districtCourt?: string; ust?: string; profitMethod?: string;
    taxMethod?: string; defaultTaxRate?: string; accountingSystem?: string;
    priceInput?: string;
  };
  step4: {
    accountHolder: string; iban: string; bankCountry: string | null;
    bic?: string; bankName?: string;
  };
  lat: number | null; lng: number | null; radiusKm: number | null;
  selectedCategory: string; selectedSubcategory: string;
  profilePictureFile: File | null; businessLicenseFile: File | null;
  masterCraftsmanCertificateFile: File | null;
  identityFrontFile: File | null; identityBackFile: File | null;
  stripeAccountId: string | null;
}

interface SettingsPageProps {
  userData: RawFirestoreUserData | null;
  onDataSaved: () => void;
}

interface UpdateStripeCompanyDetailsClientData {
  phoneNumber?: string | null; companyWebsite?: string; taxNumber?: string;
  vatId?: string; companyRegister?: string; mcc?: string; iban?: string;
  accountHolder?: string; bankCountry?: string | null; representativeFirstName?: string;
  representativeLastName?: string; representativeEmail?: string;
  representativePhone?: string; representativeDateOfBirth?: string;
  representativeAddressStreet?: string; representativeAddressHouseNumber?: string;
  representativeAddressPostalCode?: string; representativeAddressCity?: string;
  representativeAddressCountry?: string | null; isManagingDirectorOwner?: boolean;
  identityFrontFileId?: string; identityBackFileId?: string;
  businessLicenseStripeFileId?: string;
}

interface UpdateStripeCompanyDetailsCallableResult {
  success: boolean; message: string; accountLinkUrl?: string;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ userData, onDataSaved }) => {
  const [form, setForm] = useState<UserDataForSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'accounting' | 'bank' | 'logo'>('general');
  const [showManagingDirectorPersonalModal, setShowManagingDirectorPersonalModal] = useState(false);

  useEffect(() => {
    if (userData) {
      const get = <T,>(path: string, fallback: T): T => {
        const keys = path.split('.');
        let current: unknown = userData; // Changed from any to unknown
        for (const key of keys) {
          // Type guard to ensure current is an object and has the key
          if (typeof current !== 'object' || current === null || !Object.prototype.hasOwnProperty.call(current, key)) {
            return fallback;
          }
          current = (current as Record<string, unknown>)[key]; // Access property after check
        }
        // If the loop completes, 'current' holds the value or is undefined/null.
        return (current === undefined || current === null) ? fallback : current as T;
      };
      setForm({
        uid: userData.uid, email: userData.email, user_type: userData.user_type,
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
          isManagingDirectorOwner: get('step1.isManagingDirectorOwner', get('isManagingDirectorOwner', true)),
        },
        step2: {
          companyName: get('step2.companyName', get('companyName', '')),
          companyPhoneNumber: get('step2.companyPhoneNumber', get('companyPhoneNumber', '')),
          legalForm: get('step2.legalForm', get('legalForm', null)),
          address: get('step2.address', get('address', '')),
          street: get('step2.street', get('companyStreet', '')),
          houseNumber: get('step2.houseNumber', get('companyHouseNumber', '')),
          postalCode: get('step2.postalCode', get('companyPostalCode', '')),
          city: get('step2.city', get('companyCity', '')),
          country: get('step2.country', get('companyCountry', null)),
          website: get('step2.website', get('companyWebsite', '')),
          industry: get('step2.industry', get('selectedCategory', '')),
          industryMcc: get('step2.industryMcc', get('industryMcc', '')),
        },
        step3: {
          hourlyRate: String(get('step3.hourlyRate', get('hourlyRate', '0'))),
          taxNumber: get('step3.taxNumber', get('taxNumber', '')),
          vatId: get('step3.vatId', get('vatId', '')),
          companyRegister: get('step3.companyRegister', get('companyRegister', '')),
          profilePictureURL: get('step3.profilePictureURL', get('profilePictureURL', '')),
          businessLicenseURL: get('step3.businessLicenseURL', get('businessLicenseURL', '')),
          masterCraftsmanCertificateURL: get('step3.masterCraftsmanCertificateURL', get('masterCraftsmanCertificateURL', '')),
          identityFrontUrl: get('step3.identityFrontUrl', get('identityFrontUrl', '')),
          identityBackUrl: get('step3.identityBackUrl', get('identityBackUrl', '')),
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
        lat: get('lat', null), lng: get('lng', null), radiusKm: get('radiusKm', 30),
        selectedCategory: get('selectedCategory', get('step2.industry', '')),
        selectedSubcategory: get('selectedSubcategory', ''),
        stripeAccountId: get('stripeAccountId', null),
        profilePictureFile: null, businessLicenseFile: null, masterCraftsmanCertificateFile: null,
        identityFrontFile: null, identityBackFile: null,
      });
    }
  }, [userData]);

  const handleChange = (path: string, value: string | number | boolean | File | null) => {
    setForm((prevForm) => {
      if (!prevForm) return null;
      // Ensure updatedForm is correctly typed after JSON.parse/stringify
      const updatedForm = JSON.parse(JSON.stringify(prevForm)) as UserDataForSettings;
      let currentPathObject: Record<string, unknown> = updatedForm as unknown as Record<string, unknown>;
      const keys = path.split('.');
      keys.forEach((key, index) => {
        if (index === keys.length - 1) {
          currentPathObject[key] = value;
        } else {
          // Ensure the next level is an object before traversing
          if (!Object.prototype.hasOwnProperty.call(currentPathObject, key) ||
            typeof currentPathObject[key] !== 'object' ||
            currentPathObject[key] === null) {
            currentPathObject[key] = {};
          }
          currentPathObject = currentPathObject[key] as Record<string, unknown>; // Assign the nested object for the next iteration
        }
      });
      return updatedForm;
    });
  };

  const mapIndustryToMcc = (industry: string | null | undefined): string | undefined => {
    if (!industry) return undefined;
    switch (industry) {
      case "Handwerk": return "1731"; case "Haushalt & Reinigung": return "7349";
      case "Transport & Logistik": return "4215"; case "Hotel & Gastronomie": return "5812";
      case "IT & Technik": return "7372"; case "Marketing & Vertrieb": return "7311";
      case "Finanzen & Recht": return "8931"; case "Gesundheit & Wellness": return "8099";
      case "Bildung & Nachhilfe": return "8299"; case "Kunst & Kultur": return "7999";
      case "Veranstaltungen & Events": return "7999"; case "Tiere & Pflanzen": return "0742";
      default: return "5999";
    }
  };

  const uploadFileAndUpdateFormState = async (file: File, purpose: Stripe.FileCreateParams.Purpose, formFieldForFileId: string): Promise<string | undefined> => {
    if (!userData?.uid) {
      toast.error("Benutzer-ID fehlt für den Upload.");
      return undefined;
    }
    toast.info(`Lade ${file.name} hoch...`);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', purpose);
    formData.append('userId', userData.uid);
    const uploadUrl = process.env.NEXT_PUBLIC_UPLOAD_STRIPE_FILE_FUNCTION_URL || 'YOUR_FALLBACK_URL_HERE';
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
      const message = error instanceof Error ? error.message : "Unbekannter Netzwerkfehler.";
      toast.error(message);
      return undefined;
    }
  };

  const handleSave = async () => {
    if (!form || !form.uid) {
      toast.error("Keine Daten zum Speichern.");
      return;
    }
    setSaving(true);
    const updatedForm = { ...form };

    const fileUploads = [
      form.profilePictureFile ? uploadFileAndUpdateFormState(form.profilePictureFile, 'business_icon', 'step3.profilePictureURL') : Promise.resolve(undefined),
      form.businessLicenseFile ? uploadFileAndUpdateFormState(form.businessLicenseFile, 'additional_verification', 'step3.businessLicenseURL') : Promise.resolve(undefined),
      form.masterCraftsmanCertificateFile ? uploadFileAndUpdateFormState(form.masterCraftsmanCertificateFile, 'additional_verification', 'step3.masterCraftsmanCertificateURL') : Promise.resolve(undefined),
      form.identityFrontFile ? uploadFileAndUpdateFormState(form.identityFrontFile, 'identity_document', 'step3.identityFrontUrl') : Promise.resolve(undefined),
      form.identityBackFile ? uploadFileAndUpdateFormState(form.identityBackFile, 'identity_document', 'step3.identityBackUrl') : Promise.resolve(undefined),
    ];
    const [profilePicId, businessLicId, masterCertId, idFrontId, idBackId] = await Promise.all(fileUploads);

    if (form.profilePictureFile && !profilePicId) { setSaving(false); return; }
    if (form.businessLicenseFile && !businessLicId) { setSaving(false); return; }
    if (form.masterCraftsmanCertificateFile && !masterCertId) { setSaving(false); return; }
    if (form.identityFrontFile && !idFrontId) { setSaving(false); return; }
    if (form.identityBackFile && !idBackId) { setSaving(false); return; }

    // KORREKTUR: Das Update-Objekt wird jetzt "flach" mit Dot-Notation erstellt.
    const firestoreUpdateData = {
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
      'step2.industry': updatedForm.step2.industry,
      'step2.industryMcc': mapIndustryToMcc(updatedForm.step2.industry) || updatedForm.step2.industryMcc || null,
      'step3.hourlyRate': updatedForm.step3.hourlyRate,
      'step3.taxNumber': updatedForm.step3.taxNumber,
      'step3.vatId': updatedForm.step3.vatId,
      'step3.companyRegister': updatedForm.step3.companyRegister,
      'step4.accountHolder': updatedForm.step4.accountHolder,
      'step4.iban': updatedForm.step4.iban,
      'step4.bankCountry': updatedForm.step4.bankCountry,
      email: updatedForm.email,
      companyName: updatedForm.step2.companyName,
      iban: updatedForm.step4.iban,
      accountHolder: updatedForm.step4.accountHolder,
      lat: updatedForm.lat,
      lng: updatedForm.lng,
      radiusKm: updatedForm.radiusKm,
      selectedCategory: updatedForm.selectedCategory,
      selectedSubcategory: updatedForm.selectedSubcategory,
      updatedAt: serverTimestamp(),
    };

    try {
      await updateDoc(doc(db, "users", updatedForm.uid), firestoreUpdateData);
      toast.success("Profildaten in Firestore gespeichert!");

      const stripeUpdatePayload: UpdateStripeCompanyDetailsClientData = {
        phoneNumber: updatedForm.step2.companyPhoneNumber,
        companyWebsite: updatedForm.step2.website,
        taxNumber: updatedForm.step3.taxNumber,
        vatId: updatedForm.step3.vatId,
        companyRegister: updatedForm.step3.companyRegister,
        mcc: mapIndustryToMcc(updatedForm.step2.industry) || updatedForm.step2.industryMcc || undefined,
        iban: updatedForm.step4.iban,
        accountHolder: updatedForm.step4.accountHolder,
        bankCountry: updatedForm.step4.bankCountry || updatedForm.step2.country,
        representativeFirstName: updatedForm.step1.firstName,
        representativeLastName: updatedForm.step1.lastName,
        representativeEmail: updatedForm.step1.email,
        representativePhone: updatedForm.step1.phoneNumber,
        representativeDateOfBirth: updatedForm.step1.dateOfBirth,
        representativeAddressStreet: updatedForm.step1.personalStreet,
        representativeAddressHouseNumber: updatedForm.step1.personalHouseNumber,
        representativeAddressPostalCode: updatedForm.step1.personalPostalCode,
        representativeAddressCity: updatedForm.step1.personalCity,
        representativeAddressCountry: updatedForm.step1.personalCountry,
        isManagingDirectorOwner: updatedForm.step1.isManagingDirectorOwner,
        identityFrontFileId: idFrontId,
        identityBackFileId: idBackId,
        businessLicenseStripeFileId: businessLicId,
      };

      const cleanedStripePayload = Object.fromEntries(
        Object.entries(stripeUpdatePayload).filter(([, value]) => value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== ''))
      ) as UpdateStripeCompanyDetailsClientData;

      if (Object.keys(cleanedStripePayload).length > 0) {
        const updateStripeFunc = httpsCallable<UpdateStripeCompanyDetailsClientData, UpdateStripeCompanyDetailsCallableResult>(firebaseFunctions, 'updateStripeCompanyDetails');
        const result = await updateStripeFunc(cleanedStripePayload);

        if (result.data.success) {
          toast.success(result.data.message || "Stripe-Details erfolgreich aktualisiert.");
          if (result.data.accountLinkUrl) {
            toast.info("Zusätzliche Angaben bei Stripe erforderlich. Sie werden weitergeleitet...");
            setTimeout(() => { window.location.href = result.data.accountLinkUrl!; }, 2000);
          }
        } else {
          toast.error(result.data.message || "Fehler beim Aktualisieren der Stripe-Details.");
        }
      } else {
        toast.info("Keine Änderungen für Stripe vorhanden.");
      }
      onDataSaved();
    } catch (error: unknown) {
      console.error(PAGE_ERROR, "[SettingsPage] Fehler beim Speichern:", error);
      const message = error instanceof Error ? error.message : "Unbekannter Fehler.";
      toast.error(`Fehler: ${message}`);
    } finally {
      setSaving(false);
    }
  };


  if (!form) {
    return <div className="p-6 flex justify-center items-center min-h-[300px]"><FiLoader className="animate-spin mr-3 h-8 w-8 text-teal-600" /><span>Lade Einstellungen...</span></div>;
  }

  type TabKey = 'general' | 'accounting' | 'bank' | 'logo';
  interface TabDefinition { key: TabKey; label: string; }

  const tabsToDisplay: TabDefinition[] = [
    { key: 'general', label: 'Allgemein' },
    { key: 'accounting', label: 'Buchhaltung & Steuer' },
    { key: 'bank', label: 'Bankverbindung' },
    { key: 'logo', label: 'Logo & Dokumente' }
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-var(--header-height))] bg-background text-foreground">
      <aside className="w-full lg:w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6 space-y-1 lg:sticky lg:top-[var(--header-height)] lg:h-[calc(100vh-var(--header-height))] overflow-y-auto shrink-0">
        <div className="font-semibold text-gray-700 dark:text-gray-200 text-lg mb-4">Einstellung</div>
        <ul className="space-y-1">
          {tabsToDisplay.map((tab) => (
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
        </h2>

        {form && activeTab === 'general' && <GeneralForm formData={form} handleChange={handleChange} onOpenManagingDirectorPersonalModal={() => setShowManagingDirectorPersonalModal(true)} />}
        {form && activeTab === 'accounting' && <AccountingForm formData={form} handleChange={handleChange} />}
        {form && activeTab === 'bank' && <BankForm formData={form} handleChange={handleChange} />}
        {form && activeTab === 'logo' && <LogoForm formData={form} handleChange={handleChange} />}

        <div className="pt-8 mt-8 border-t border-gray-200 dark:border-gray-700 flex flex-col lg:flex-row justify-between items-center gap-4">
          <button
            onClick={handleSave} disabled={saving}
            className="px-6 py-3 rounded-md bg-[#14ad9f] text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center text-base"
          >
            {saving ? <><FiLoader className="animate-spin h-5 w-5 mr-2" /> Speichern...</> : <><FiSave className="h-5 w-5 mr-2" /> Änderungen speichern</>}
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