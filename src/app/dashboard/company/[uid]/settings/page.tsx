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

  // Funktion zum Umwandeln der Firestore-Daten in das Settings-Format
  const transformToUserDataForSettings = (rawData: RawFirestoreUserData): UserDataForSettings => {
    return {
      uid: rawData.uid,
      companyName: rawData.companyName || rawData.step2?.companyName,
      email: rawData.email,
      displayName: rawData.displayName || rawData.email || '',
      step1: rawData.step1,
      step2: rawData.step2,
      step3: rawData.step3,
      step4: rawData.step4,
      step5: rawData.step5,
      portfolioItems: rawData.portfolioItems || [],
      faqs: rawData.faqs || [],
      paymentTermsSettings: rawData.paymentTermsSettings,
      logoUrl: rawData.logoUrl,
      documentTemplates: rawData.documentTemplates,
      stornoSettings: rawData.stornoSettings,
    };
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

      if (user.uid !== uid) {
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
  const handleChange = (path: string, value: string | number | boolean | null) => {
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

      await updateDoc(docRef, {
        ...cleanedForm,
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
              // Optional: Modal-Funktionalität kann hier implementiert werden
            }}
          />
        );
      case 'bank':
        return <BankForm formData={form} handleChange={handleChange} />;
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
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
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
              // Optional: Modal-Funktionalität kann hier implementiert werden
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
    </>
  );
}
