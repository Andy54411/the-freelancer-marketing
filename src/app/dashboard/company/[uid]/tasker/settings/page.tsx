'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import PortfolioForm from '@/components/dashboard_setting/portfolio';
import ServicesForm from '@/components/dashboard_setting/services-professional';
import FaqsForm from '@/components/dashboard_setting/faqs';
import TaskerProfileForm from '@/components/dashboard_setting/tasker-profile';
import { RawFirestoreUserData, UserDataForSettings } from '@/types/settings';
import { Loader2 as FiLoader, Save as FiSave } from 'lucide-react';
import { toast } from 'sonner';

export default function TaskerSettingsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const view = searchParams?.get('view') || 'profile';
  const [form, setForm] = useState<UserDataForSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const transformToUserDataForSettings = (rawData: RawFirestoreUserData): UserDataForSettings => {
    const transformed = {
      uid: rawData.uid,
      companyName: rawData.companyName || rawData.step2?.companyName,
      email: rawData.email,
      displayName: rawData.displayName || rawData.email || '',
      legalForm: rawData.step2?.legalForm,
      // Root-level image URLs
      profilePictureURL: rawData.profilePictureURL || rawData.step3?.profilePictureURL,
      profileBannerImage: rawData.profileBannerImage || rawData.step3?.profileBannerImage,
      // Root-level Tasker Profile fields - use double type assertion for optional fields that may exist in Firestore
      bio: rawData.bio || (rawData as unknown as Record<string, unknown>).description as string || rawData.step3?.bio || '',
      description: (rawData as unknown as Record<string, unknown>).description as string || rawData.bio,
      selectedCategory: rawData.selectedCategory || rawData.step3?.selectedCategory || '',
      selectedSubcategory: rawData.selectedSubcategory || rawData.step3?.selectedSubcategory || '',
      skills: rawData.skills || rawData.step3?.skills,
      hourlyRate: rawData.hourlyRate || rawData.step3?.hourlyRate,
      location: rawData.location || rawData.step3?.location || rawData.step2?.companyAddress?.city,
      offersVideoConsultation: rawData.offersVideoConsultation ?? rawData.step3?.offersVideoConsultation,
      level: rawData.level || rawData.step3?.level,
      isTopRated: rawData.isTopRated ?? rawData.step3?.isTopRated,
      step1: rawData.step1,
      step2: rawData.step2,
      step3: {
        ...(rawData.step3 || {}),
        vatId: rawData.vatId ?? rawData.step3?.vatId ?? '',
        taxNumber: rawData.taxNumber ?? rawData.step3?.taxNumber ?? '',
        districtCourt: rawData.districtCourt || rawData.step3?.districtCourt || rawData.step2?.districtCourt || '',
        companyRegister: rawData.companyRegister || rawData.step3?.companyRegister || rawData.step2?.companyRegister || rawData.registrationNumber || '',
        ust: rawData.step3?.ust || rawData.ust,
        profitMethod: rawData.step3?.profitMethod || rawData.profitMethod,
        priceInput: rawData.step3?.priceInput || rawData.priceInput,
        taxMethod: rawData.step3?.taxMethod || rawData.taxMethod,
        accountingSystem: rawData.step3?.accountingSystem || (rawData.accountingSystem === 'skr03' ? 'skro3' : rawData.accountingSystem),
        defaultTaxRate: rawData.defaultTaxRate || rawData.step3?.defaultTaxRate || '19',
        profilePictureURL: rawData.profilePictureURL || rawData.step3?.profilePictureURL,
        profileBannerImage: rawData.profileBannerImage || rawData.step3?.profileBannerImage,
        // Tasker Profile fields - check root level first, then step3
        bio: rawData.bio || rawData.step3?.bio || '',
        selectedCategory: rawData.selectedCategory || rawData.step3?.selectedCategory || '',
        selectedSubcategory: rawData.selectedSubcategory || rawData.step3?.selectedSubcategory || '',
        skills: rawData.skills || rawData.step3?.skills || [],
        hourlyRate: rawData.hourlyRate || rawData.step3?.hourlyRate || 0,
        location: rawData.location || rawData.step3?.location || rawData.step2?.companyAddress?.city || '',
        offersVideoConsultation: rawData.offersVideoConsultation ?? rawData.step3?.offersVideoConsultation ?? false,
        level: rawData.level || rawData.step3?.level || 1,
        isTopRated: rawData.isTopRated ?? rawData.step3?.isTopRated ?? false,
        bankDetails: rawData.step3?.bankDetails || {
          bankName: rawData.bankName || '',
          iban: rawData.iban || '',
          bic: rawData.bic || '',
          accountHolder: rawData.accountHolder || '',
        },
      },
      step4: rawData.step4,
      step5: rawData.step5,
      portfolioItems: rawData.portfolioItems || [],
      faqs: rawData.faqs || [],
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
        const companyDoc = await getDoc(doc(db, 'companies', uid));
        if (companyDoc.exists()) {
          const companyData = companyDoc.data() as RawFirestoreUserData;
          const transformedData = transformToUserDataForSettings(companyData);
          setForm(transformedData);
        } else {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as RawFirestoreUserData;
            const transformedData = transformToUserDataForSettings(userData);
            setForm(transformedData);
          } else {
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
          }
        }
      } catch {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (path: string, value: string | number | boolean | null | any[]) => {
    if (!form) return;

    const pathArray = path.split('.');
    const newForm = { ...form };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const saveForm = async () => {
    if (!form || !uid || saving) return;

    setSaving(true);
    try {
      const docRef = doc(db, 'companies', uid);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cleanData = (obj: any): any => {
        if (obj === null || obj === undefined) {
          return null;
        }

        if (Array.isArray(obj)) {
          return obj.map(item => cleanData(item));
        }

        if (typeof obj === 'object') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      await updateDoc(docRef, {
        ...cleanedForm,
        lastUpdated: serverTimestamp(),
      });
      toast.success('Einstellungen erfolgreich gespeichert!');
    } catch {
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

  const renderSettingsComponent = () => {
    switch (view) {
      case 'profile':
        return <TaskerProfileForm formData={form} handleChange={handleChange} userId={uid} />;
      case 'portfolio':
        return <PortfolioForm formData={form} handleChange={handleChange} userId={uid} />;
      case 'services':
        return <ServicesForm formData={form} setFormData={setForm} />;
      case 'faqs':
        return <FaqsForm formData={form} handleChange={handleChange} />;
      default:
        return <TaskerProfileForm formData={form} handleChange={handleChange} userId={uid} />;
    }
  };

  const getSettingsTitle = () => {
    switch (view) {
      case 'profile':
        return { title: 'Tasker-Profil', description: 'Bearbeite dein öffentliches Profil für Kunden' };
      case 'portfolio':
        return { title: 'Portfolio', description: 'Präsentieren Sie Ihre Arbeiten und Projekte' };
      case 'services':
        return { title: 'Dienstleistungen', description: 'Verwalten Sie Ihre angebotenen Services und Preise' };
      case 'faqs':
        return { title: 'FAQs', description: 'Verwalten Sie häufig gestellte Fragen zu Ihren Services' };
      default:
        return { title: 'Tasker-Einstellungen', description: 'Verwalten Sie Ihre Tasker-Einstellungen' };
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
        <div className="max-w-6xl mx-auto p-6 sm:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-600">{description}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-8">
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
    </>
  );
}
