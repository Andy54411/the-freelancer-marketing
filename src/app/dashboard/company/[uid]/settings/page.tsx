'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import GeneralForm from '@/components/dashboard_setting/allgemein';
import BankForm from '@/components/dashboard_setting/bankverbindung';
import AccountingForm from '@/components/dashboard_setting/buchhaltung&steuern';
import LogoForm from '@/components/dashboard_setting/logo';
import PortfolioForm from '@/components/dashboard_setting/portfolio';
import ServicesForm from '@/components/dashboard_setting/services-professional';
import FaqsForm from '@/components/dashboard_setting/faqs';
import PaymentTermsForm from '@/components/dashboard_setting/PaymentTermsForm';
import ManagingDirectorModal from '@/components/dashboard_setting/ManagingDirectorModal';
import { CompanyStorageCard } from '@/components/dashboard/CompanyStorageCard';
import { RawFirestoreUserData, UserDataForSettings } from '@/types/settings';
import { Loader2 as FiLoader, Save as FiSave } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const view = searchParams?.get('view') || 'general';
  const [form, setForm] = useState<UserDataForSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isManagingDirectorModalOpen, setIsManagingDirectorModalOpen] = useState(false);

  const transformToUserDataForSettings = (rawData: RawFirestoreUserData): UserDataForSettings => {
    // Basierend auf der tatsächlichen Datenbankstruktur:
    // - step1 enthält: address (city, postalCode, street), companyName, legalForm, taxNumber, vatId, website
    // - step2 enthält: contactPerson (firstName, lastName, email, phone, dateOfBirth), kleinunternehmer, priceInput, profitMethod, taxNumber, vatId
    // - step3 enthält: bankDetails, defaultTaxRate, taxNumber, vatId, profitMethod, priceInput
    // - step4 enthält: Bank-Daten (iban, bic, bankName, accountHolder)
    // - Root-Level enthält auch viele Felder als Duplikate
    
    // Extrahiere step1 Felder (Firmendaten)
    const step1Data = {
      ...(rawData.step1 || {}),
      // Adresse aus step1.address
      address: (rawData.step1 as any)?.address || {},
      // Persönliche Daten Objekt (für Geburtsdatum etc.)
      personalData: {
        ...(rawData.step1?.personalData || {}),
        dateOfBirth: rawData.step1?.personalData?.dateOfBirth || (rawData.step2 as any)?.contactPerson?.dateOfBirth || '',
        firstName: rawData.step1?.personalData?.firstName || rawData.step1?.firstName || '',
        lastName: rawData.step1?.personalData?.lastName || rawData.step1?.lastName || '',
        email: rawData.step1?.personalData?.email || rawData.email || rawData.step1?.email || '',
        phone: rawData.step1?.personalData?.phone || rawData.phoneNumber || rawData.phone || '',
      },
      // Persönliche Daten flach
      firstName: rawData.step1?.firstName || rawData.step1?.personalData?.firstName || (rawData.step1 as any)?.address?.firstName || '',
      lastName: rawData.step1?.lastName || rawData.step1?.personalData?.lastName || '',
      email: rawData.email || rawData.step1?.email || '',
      phoneNumber: rawData.phoneNumber || rawData.phone || (rawData.step1 as any)?.phone || '',
      personalStreet: rawData.step1?.personalStreet || (rawData.step1 as any)?.address?.street || '',
      personalPostalCode: rawData.step1?.personalPostalCode || (rawData.step1 as any)?.address?.postalCode || '',
    };

    // Extrahiere step2 Felder (Kontaktperson und Steuer-Basics)
    const step2Data = {
      ...(rawData.step2 || {}),
      // Firmendaten - aus step1 oder Root
      companyName: rawData.companyName || (rawData.step1 as any)?.companyName || rawData.step2?.companyName || '',
      companySuffix: rawData.step2?.companySuffix || '',
      // Adresse - aus step1.address oder Root
      address: rawData.address || (rawData.step1 as any)?.address?.street || rawData.step2?.address || '',
      street: rawData.address || (rawData.step1 as any)?.address?.street || rawData.step2?.street || '',
      postalCode: rawData.postalCode || (rawData.step1 as any)?.address?.postalCode || rawData.step2?.postalCode || '',
      city: rawData.city || (rawData.step1 as any)?.address?.city || rawData.step2?.city || '',
      // Kontakt - aus step2.contactPerson oder Root
      companyPhoneNumber: rawData.phoneNumber || rawData.phone || (rawData.step2 as any)?.contactPerson?.phone || rawData.step2?.companyPhone || '',
      companyPhone: rawData.phoneNumber || rawData.phone || (rawData.step2 as any)?.contactPerson?.phone || rawData.step2?.companyPhone || '',
      fax: rawData.step2?.fax || '',
      website: rawData.website || (rawData.step1 as any)?.website || rawData.step2?.website || '',
      companyWebsite: rawData.website || (rawData.step1 as any)?.website || rawData.step2?.companyWebsite || '',
      languages: rawData.languages || rawData.step2?.languages || '',
      industry: rawData.industry || rawData.step2?.industry || '',
      employees: rawData.employees || (rawData.step1 as any)?.employees || rawData.step2?.employees || '',
      numberOfEmployees: rawData.employees || (rawData.step1 as any)?.employees || rawData.step2?.numberOfEmployees || '',
      // Rechtsform - aus Root oder step1
      legalForm: rawData.legalForm || (rawData.step1 as any)?.legalForm || rawData.step2?.legalForm || '',
      foundingDate: rawData.step2?.foundingDate || '',
      hauptberuflich: rawData.step2?.hauptberuflich,
      // Steuer-Daten - aus step2 oder Root oder step1
      vatId: rawData.vatId || (rawData.step2 as any)?.vatId || (rawData.step1 as any)?.vatId || '',
      taxId: rawData.taxNumber || (rawData.step2 as any)?.taxNumber || (rawData.step1 as any)?.taxNumber || '',
      taxNumber: rawData.taxNumber || (rawData.step2 as any)?.taxNumber || (rawData.step1 as any)?.taxNumber || '',
      // Kleinunternehmer aus step2 oder Root
      kleinunternehmer: rawData.kleinunternehmer || (rawData.step2 as any)?.kleinunternehmer || 'nein',
      // Steuer-Einstellungen aus step2 oder Root
      profitMethod: rawData.profitMethod || (rawData.step2 as any)?.profitMethod || 'euer',
      priceInput: rawData.priceInput || (rawData.step2 as any)?.priceInput || 'netto',
      taxRate: rawData.taxRate || (rawData.step2 as any)?.taxRate || '19',
      businessDescription: rawData.description || rawData.step2?.businessDescription || '',
      categories: rawData.step2?.categories || [],
      subcategories: rawData.step2?.subcategories || [],
      // Kontaktperson
      contactPerson: (rawData.step2 as any)?.contactPerson || {},
      companyAddress: rawData.step2?.companyAddress || (rawData.step2 as any)?.businessAddress || {
        street: rawData.address || (rawData.step1 as any)?.address?.street || '',
        city: rawData.city || (rawData.step1 as any)?.address?.city || '',
        postalCode: rawData.postalCode || (rawData.step1 as any)?.address?.postalCode || '',
        country: 'Deutschland',
      },
    };

    // Extrahiere step3 Felder (Buchhaltung & Bank)
    const step3Data = {
      ...(rawData.step3 || {}),
      // Steuer-IDs - Priorität: step3 > step2 > step1 > Root
      vatId: rawData.step3?.vatId || (rawData.step2 as any)?.vatId || (rawData.step1 as any)?.vatId || rawData.vatId || '',
      taxNumber: rawData.step3?.taxNumber || (rawData.step2 as any)?.taxNumber || (rawData.step1 as any)?.taxNumber || rawData.taxNumber || '',
      districtCourt: rawData.step3?.districtCourt || rawData.districtCourt || '',
      companyRegister: rawData.step3?.companyRegister || (rawData.step1 as any)?.companyRegister || rawData.companyRegister || '',
      // USt-Status - aus kleinunternehmer ableiten
      ust: rawData.step3?.ust || (rawData.kleinunternehmer === 'ja' || (rawData.step2 as any)?.kleinunternehmer === 'ja' ? 'kleinunternehmer' : 'standard'),
      // Gewinnermittlung - Priorität: step3 > step2 > Root
      profitMethod: rawData.step3?.profitMethod || (rawData.step2 as any)?.profitMethod || rawData.profitMethod || 'euer',
      priceInput: rawData.step3?.priceInput || (rawData.step2 as any)?.priceInput || rawData.priceInput || 'netto',
      taxMethod: rawData.step3?.taxMethod || rawData.taxMethod || 'soll',
      accountingSystem: rawData.step3?.accountingSystem || rawData.accountingSystem || 'skro4',
      // Steuersatz - aus step3 oder step2 oder Root
      defaultTaxRate: rawData.step3?.defaultTaxRate || (rawData.step2 as any)?.taxRate || rawData.taxRate || rawData.defaultTaxRate || '19',
      finanzamt: rawData.step3?.finanzamt || rawData.finanzamt || '',
      bundesland: rawData.step3?.bundesland || rawData.bundesland || '',
      profilePictureURL: rawData.profilePictureURL || rawData.step3?.profilePictureURL,
      profileBannerImage: rawData.profileBannerImage || rawData.step3?.profileBannerImage,
      // Bankdaten - aus step3.bankDetails oder step4 oder Root
      bankDetails: rawData.step3?.bankDetails || {
        bankName: rawData.bankName || rawData.step4?.bankName || '',
        iban: rawData.iban || rawData.step4?.iban || '',
        bic: rawData.bic || rawData.step4?.bic || '',
        accountHolder: rawData.accountHolder || rawData.step4?.accountHolder || '',
      },
    };

    // Extrahiere step4 Felder (Bank-Daten Fallback)
    const step4Data = {
      ...(rawData.step4 || {}),
      bankName: rawData.step4?.bankName || rawData.step3?.bankDetails?.bankName || rawData.bankName || '',
      iban: rawData.step4?.iban || rawData.step3?.bankDetails?.iban || rawData.iban || '',
      bic: rawData.step4?.bic || rawData.step3?.bankDetails?.bic || rawData.bic || '',
      accountHolder: rawData.step4?.accountHolder || rawData.step3?.bankDetails?.accountHolder || rawData.accountHolder || '',
    };

    const transformed: UserDataForSettings = {
      uid: rawData.uid,
      companyName: rawData.companyName || rawData.step2?.companyName || '',
      email: rawData.email || '',
      displayName: rawData.displayName || rawData.email || '',
      legalForm: rawData.legalForm || rawData.step2?.legalForm || '',
      lat: rawData.lat,
      lng: rawData.lng,
      radiusKm: rawData.radiusKm || 30,
      profilePictureURL: rawData.profilePictureURL || rawData.step3?.profilePictureURL,
      profileBannerImage: rawData.profileBannerImage || rawData.step3?.profileBannerImage,
      // Tasker-Felder
      bio: rawData.bio || rawData.step3?.bio || '',
      selectedCategory: rawData.selectedCategory || rawData.step3?.selectedCategory || '',
      selectedSubcategory: rawData.selectedSubcategory || rawData.step3?.selectedSubcategory || '',
      skills: rawData.skills || rawData.step3?.skills || [],
      hourlyRate: rawData.hourlyRate || rawData.step3?.hourlyRate,
      location: rawData.location || rawData.step3?.location || '',
      offersVideoConsultation: rawData.offersVideoConsultation || rawData.step3?.offersVideoConsultation,
      level: rawData.level || rawData.step3?.level,
      isTopRated: rawData.isTopRated || rawData.step3?.isTopRated,
      // Steps
      step1: step1Data,
      step2: step2Data,
      step3: step3Data,
      step4: step4Data,
      step5: rawData.step5,
      // Listen
      portfolioItems: rawData.portfolioItems || rawData.portfolio || [],
      faqs: rawData.faqs || [],
      portfolio: rawData.portfolio || rawData.portfolioItems || [],
      // Sonstige
      paymentTermsSettings: rawData.paymentTermsSettings || {
        defaultPaymentTerms: rawData.defaultPaymentTerms,
      },
      logoUrl: rawData.logoUrl,
      documentTemplates: rawData.documentTemplates,
      stornoSettings: rawData.stornoSettings,
    };

    return transformed;
  };

  useEffect(() => {
    const loadUserData = async () => {
      if (!uid) {
        setLoading(false);
        return;
      }

      if (!user) {
        return;
      }

      const isOwner = user.uid === uid;
      const isEmployee = user.user_type === 'mitarbeiter' && user.companyId === uid;
      if (!isOwner && !isEmployee) {
        setLoading(false);
        return;
      }

      try {
        // Lade Company-Daten
        const companyDoc = await getDoc(doc(db, 'companies', uid));
        if (companyDoc.exists()) {
          const companyData = companyDoc.data() as RawFirestoreUserData;

          const transformedData = transformToUserDataForSettings(companyData);

          setForm(transformedData);
        } else {
          // Fallback: User-Daten
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as RawFirestoreUserData;
            const transformedData = transformToUserDataForSettings(userData);
            setForm(transformedData);

            // Erstelle Company-Dokument aus User-Daten für zukünftige Verwendung
            await updateDoc(doc(db, 'companies', uid), {
              ...userData,
              uid: uid,
              lastUpdated: serverTimestamp(),
            });
          } else {
            // Erstelle Basis-Daten
            const baseData: UserDataForSettings = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.email || '',
              companyName: '',
              step1: { personalData: {} },
              step2: { companyAddress: {} },
              step3: { bankDetails: {} },
              portfolioItems: [],
              faqs: [],
            };
            setForm(baseData);

            // Erstelle leeres Company-Dokument
            await updateDoc(doc(db, 'companies', uid), {
              uid: uid,
              email: user.email || '',
              displayName: user.email || '',
              lastUpdated: serverTimestamp(),
            });
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden der Benutzerdaten:', error);
        // Erstelle Fallback-Daten bei Fehler
        const fallbackData: UserDataForSettings = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.email || '',
          companyName: '',
          step1: { personalData: {} },
          step2: { companyAddress: {} },
          step3: { bankDetails: {} },
          portfolioItems: [],
          faqs: [],
        };
        setForm(fallbackData);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [uid, user]);

  // Handle form changes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (path: string, value: string | number | boolean | null | any[]) => {
    if (!form) return;

    const pathArray = path.split('.');
    const newForm = { ...form };
    let current: any = newForm;

    for (let i = 0; i < pathArray.length - 1; i++) {
      const key = pathArray[i];
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }

    current[pathArray[pathArray.length - 1]] = value;
    setForm(newForm);
  };

  // Save form data
  const saveForm = async () => {
    if (!form || !uid || saving) return;

    setSaving(true);
    try {
      const docRef = doc(db, 'companies', uid);

      // Filter out undefined values recursively
      const cleanData = (obj: any): any => {
        if (obj === null || obj === undefined) {
          return null;
        }

        if (Array.isArray(obj)) {
          return obj.map(item => cleanData(item));
        }

        if (typeof obj === 'object') {
          const cleaned: any = {};
          for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
              cleaned[key] = cleanData(value);
            }
          }
          return cleaned;
        }

        return obj;
      };

      const cleanedForm = cleanData(form);

      // MASTER-Felder Synchronisation: step3 ist MASTER für Steuerdaten
      // Synchronisiere step3 Werte auf Root-Level für Konsistenz
      const masterSyncFields: Record<string, unknown> = {};
      
      // Steuerdaten: step3 ist MASTER
      if (cleanedForm.step3?.taxNumber) {
        masterSyncFields.taxNumber = cleanedForm.step3.taxNumber;
      }
      if (cleanedForm.step3?.vatId) {
        masterSyncFields.vatId = cleanedForm.step3.vatId;
      }
      
      // Buchhaltungseinstellungen: step3 ist MASTER
      if (cleanedForm.step3?.ust) {
        masterSyncFields.kleinunternehmer = cleanedForm.step3.ust === 'kleinunternehmer' ? 'ja' : 'nein';
      }
      if (cleanedForm.step3?.profitMethod) {
        masterSyncFields.profitMethod = cleanedForm.step3.profitMethod;
      }
      if (cleanedForm.step3?.priceInput) {
        masterSyncFields.priceInput = cleanedForm.step3.priceInput;
      }
      if (cleanedForm.step3?.defaultTaxRate) {
        masterSyncFields.taxRate = cleanedForm.step3.defaultTaxRate;
      }
      
      // Bio: step3 ist MASTER
      if (cleanedForm.step3?.bio) {
        masterSyncFields.bio = cleanedForm.step3.bio;
      }
      
      // Portfolio: step3 ist MASTER
      if (cleanedForm.step3?.portfolio) {
        masterSyncFields.portfolio = cleanedForm.step3.portfolio;
      }
      
      // FAQs: step3 ist MASTER
      if (cleanedForm.step3?.faqs) {
        masterSyncFields.faqs = cleanedForm.step3.faqs;
      }
      
      // Bankdaten: step3.bankDetails ist MASTER
      if (cleanedForm.step3?.bankDetails) {
        if (cleanedForm.step3.bankDetails.iban) {
          masterSyncFields.iban = cleanedForm.step3.bankDetails.iban;
        }
        if (cleanedForm.step3.bankDetails.bic) {
          masterSyncFields.bic = cleanedForm.step3.bankDetails.bic;
        }
        if (cleanedForm.step3.bankDetails.bankName) {
          masterSyncFields.bankName = cleanedForm.step3.bankDetails.bankName;
        }
        if (cleanedForm.step3.bankDetails.accountHolder) {
          masterSyncFields.accountHolder = cleanedForm.step3.bankDetails.accountHolder;
        }
      }

      await updateDoc(docRef, {
        ...cleanedForm,
        ...masterSyncFields,
        lastUpdated: serverTimestamp(),
      });
      toast.success('Einstellungen erfolgreich gespeichert!');
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      toast.error('Fehler beim Speichern der Einstellungen');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[300px] space-y-4">
        <FiLoader className="animate-spin h-8 w-8 text-teal-600" />
        <div className="text-center">
          <span className="text-lg font-semibold text-gray-700">Lade Einstellungen...</span>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[300px] space-y-4">
        <span className="text-lg font-semibold text-gray-700">Keine Daten gefunden</span>
      </div>
    );
  }

  // Funktion zum Rendern der richtigen Komponente basierend auf view
  const renderSettingsComponent = () => {
    switch (view) {
      case 'general':
        return (
          <GeneralForm
            formData={form}
            handleChange={handleChange}
            onOpenManagingDirectorPersonalModal={() => {
              setIsManagingDirectorModalOpen(true);
            }}
          />
        );

      case 'bank':
        return <BankForm formData={form} handleChange={handleChange} companyId={uid as string} />;
      case 'accounting':
        return <AccountingForm formData={form} handleChange={handleChange} />;
      case 'logo':
        return <LogoForm formData={form} handleChange={handleChange} />;
      case 'portfolio':
        return <PortfolioForm formData={form} handleChange={handleChange} />;
      case 'services':
        return <ServicesForm formData={form} setFormData={setForm} />;
      case 'faqs':
        return <FaqsForm formData={form} handleChange={handleChange} />;
      case 'payment-terms':
        return <PaymentTermsForm formData={form} handleChange={handleChange} />;
      case 'payouts':
        return (
          <div className="space-y-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Auszahlungen verwalten</h3>
              <p className="text-gray-600 mb-6">
                Verwalten Sie Ihre Auszahlungen und sehen Sie den verfügbaren Saldo ein.
              </p>
              <button
                onClick={() => (window.location.href = `/dashboard/company/${uid}/payouts`)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#14ad9f] hover:bg-taskilo-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
              >
                Zur Auszahlungsübersicht
              </button>
            </div>
          </div>
        );

      default:
        return (
          <GeneralForm
            formData={form}
            handleChange={handleChange}
            onOpenManagingDirectorPersonalModal={() => {
              setIsManagingDirectorModalOpen(true);
            }}
          />
        );
    }
  };

  // Titel und Beschreibung basierend auf view
  const getSettingsTitle = () => {
    switch (view) {
      case 'general':
        return {
          title: 'Allgemeine Einstellungen',
          description: 'Verwalten Sie Ihre allgemeinen Firmendaten und Kontaktinformationen',
        };
      case 'bank':
        return {
          title: 'Bankverbindung',
          description: 'Verwalten Sie Ihre Bankdaten für Zahlungen und Auszahlungen',
        };
      case 'accounting':
        return {
          title: 'Buchhaltung & Steuer',
          description: 'Konfigurieren Sie Ihre Steuer- und Buchhaltungseinstellungen',
        };
      case 'logo':
        return {
          title: 'Logo & Dokumente',
          description: 'Verwalten Sie Ihr Firmenlogo und Dokumentvorlagen',
        };
      case 'portfolio':
        return { title: 'Portfolio', description: 'Präsentieren Sie Ihre Arbeiten und Projekte' };
      case 'services':
        return {
          title: 'Dienstleistungen',
          description: 'Verwalten Sie Ihre angebotenen Services und Preise',
        };
      case 'faqs':
        return {
          title: 'FAQs',
          description: 'Verwalten Sie häufig gestellte Fragen zu Ihren Services',
        };
      default:
        return { title: 'Einstellungen', description: 'Verwalten Sie Ihre Einstellungen' };
    }
  };

  const { title, description } = getSettingsTitle();

  return (
    <>
      {view === 'services' ? (
        <div className="min-h-screen bg-gray-50">
          <div className="p-6 sm:p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
              <p className="text-gray-600">{description}</p>
            </div>

            {renderSettingsComponent()}
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto p-6 sm:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-600">{description}</p>
          </div>

          {/* Storage Card - nur bei general view */}
          {view === 'general' && (
            <div className="mb-6">
              <CompanyStorageCard companyId={uid} />
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border p-6">
            {renderSettingsComponent()}

            <div className="mt-8 pt-6 border-t">
              <button
                onClick={saveForm}
                disabled={saving}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <FiLoader className="animate-spin -ml-1 mr-3 h-5 w-5" />
                    Speichern...
                  </>
                ) : (
                  <>
                    <FiSave className="-ml-1 mr-3 h-5 w-5" />
                    Speichern
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Managing Director Modal */}
      {form && (
        <ManagingDirectorModal
          isOpen={isManagingDirectorModalOpen}
          onClose={() => setIsManagingDirectorModalOpen(false)}
          formData={form}
          handleChange={handleChange}
          onSave={saveForm}
        />
      )}
    </>
  );
}
