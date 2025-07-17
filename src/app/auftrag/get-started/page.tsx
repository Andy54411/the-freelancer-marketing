// /Users/andystaudinger/taskilo/src/app/auftrag/get-started/page.tsx
'use client';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { HeroHeader } from '@/components/hero8-header';
import { Combobox } from '@/components/combobox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ProgressBar from '@/components/ProgressBar';
import { Info as FiInfo, X as FiX, Check as FiCheck } from 'lucide-react';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { app } from '@/firebase/clients';
import { categories, type Category } from '@/lib/categoriesData';
import { useRegistration } from '@/contexts/Registration-Context';
import SubcategoryFormManager from '@/components/subcategory-forms/SubcategoryFormManager';
import { SubcategoryData } from '@/types/subcategory-forms';

const auth = getAuth(app);

export default function GetStartedPage() {
  const router = useRouter();
  const {
    customerType,
    setCustomerType,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    subcategoryData,
    setSubcategoryData,
  } = useRegistration();

  const steps = ['Kundentyp', 'Kategorie', 'Unterkategorie', 'Projektdetails'];

  const TOTAL_STEPS = steps.length; // 4 steps without description

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [isSubcategoryFormValid, setIsSubcategoryFormValid] = useState(false);

  // Effect to mark client mount
  useEffect(() => {
    setIsClientMounted(true);
    const unsubscribe = onAuthStateChanged(auth, (_user: User | null) => {
      // Auth logic if needed
    });
    return () => unsubscribe();
  }, []);

  const logicalCurrentStep = useMemo(() => {
    // Always return 0 until client is mounted to prevent hydration mismatch
    if (!isClientMounted) return 0;

    const stepsCompleted = [
      !!customerType,
      !!selectedCategory,
      !!selectedSubcategory,
      !!(isSubcategoryFormValid && subcategoryData && Object.keys(subcategoryData).length > 0),
    ];

    console.log('DEBUG Steps:', {
      customerType: !!customerType,
      selectedCategory: !!selectedCategory,
      selectedSubcategory: !!selectedSubcategory,
      isSubcategoryFormValid,
      subcategoryDataValid: !!(subcategoryData && Object.keys(subcategoryData).length > 0),
      subcategoryDataKeys: subcategoryData ? Object.keys(subcategoryData) : [],
      completedCount: stepsCompleted.filter(Boolean).length,
      totalSteps: TOTAL_STEPS,
    });

    return stepsCompleted.filter(Boolean).length;
  }, [
    customerType,
    selectedCategory,
    selectedSubcategory,
    isSubcategoryFormValid,
    subcategoryData, // Wichtig: subcategoryData als Dependency hinzufügen!
    isClientMounted,
  ]);

  // Always use 0 for server-side rendering and initial client render
  const stepForDisplay = isClientMounted ? logicalCurrentStep : 0;

  const handleCustomerTypeChange = (type: 'private' | 'business') => {
    setCustomerType(type);
    // Beim Wechsel des Kundentyps alle nachfolgenden Selektionen zurücksetzen
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSubcategoryData(null);
    setIsSubcategoryFormValid(false);
  };

  const handleCategoryChange = (categoryValue: string) => {
    setSelectedCategory(categoryValue);
    setSelectedSubcategory(null); // Reset subcategory
    setSubcategoryData(null); // Zurücksetzen der Formulardaten
    setIsSubcategoryFormValid(false); // Zurücksetzen der Validierungsstatus
  };

  const handleSubcategoryChange = (subcategoryValue: string) => {
    setSelectedSubcategory(subcategoryValue);
    setSubcategoryData(null); // Zurücksetzen der Formulardaten bei Unterkategorieänderung
    setIsSubcategoryFormValid(false); // Zurücksetzen der Validierungsstatus
  };

  const handleSubcategoryDataChange = useCallback((data: SubcategoryData) => {
    setSubcategoryData(data);
  }, []);

  // Hilfsfunktion, die prüft, ob alle erforderlichen Daten vorhanden sind
  const isFormValid = useCallback(() => {
    // Prüfe ob Grunddaten existieren
    if (!customerType || !selectedCategory || !selectedSubcategory || !subcategoryData) {
      console.log('Grunddaten fehlen:', {
        customerType,
        selectedCategory,
        selectedSubcategory,
        subcategoryData,
      });
      return false;
    }

    // Prüfe ob das Formular als gültig markiert wurde
    if (!isSubcategoryFormValid) {
      console.log('Formular wurde nicht als gültig markiert');
      return false;
    }

    // Prüfe ob Formulardaten vorhanden sind
    const hasSubcategoryData = Object.keys(subcategoryData).length > 0;
    if (!hasSubcategoryData) {
      console.log('Keine Formulardaten vorhanden');
      return false;
    }

    // Prüfe JEDEN Schlüssel in den Formulardaten
    const missingFields: string[] = [];

    // Allgemeine Regel: Alle Felder, die mit * enden, sind Pflichtfelder
    const requiredFields = Object.entries(subcategoryData).filter(
      ([key]) => key.endsWith('*') || key.includes('required') || key.includes('Required')
    );

    if (requiredFields.length === 0) {
      console.log('Keine Pflichtfelder erkannt, prüfe alle Felder...');
      // Wenn keine Pflichtfelder markiert sind, prüfe alle Standard-Formularfelder
      Object.entries(subcategoryData).forEach(([key, value]) => {
        // Überspringen von gewissen Schlüsseln, die optional sind
        if (
          key === 'additionalInfo' ||
          key === 'specialRequirements' ||
          key === 'additionalNotes' ||
          key === 'zusätzlicheInfos' ||
          key === 'besondereAnforderungen' ||
          key === 'subcategory' ||
          key === 'additionalServices' ||
          key.includes('optional') ||
          key.includes('Optional')
        ) {
          return;
        }

        if (
          value === null ||
          value === undefined ||
          value === '' ||
          (Array.isArray(value) && value.length === 0)
        ) {
          missingFields.push(key);
        }
      });
    } else {
      // Prüfe nur die als Pflichtfelder markierten Felder
      requiredFields.forEach(([key, value]) => {
        if (
          value === null ||
          value === undefined ||
          value === '' ||
          (Array.isArray(value) && value.length === 0)
        ) {
          missingFields.push(key);
        }
      });
    }

    const allRequiredFieldsFilled = missingFields.length === 0;

    // Debug-Ausgabe für bessere Fehlerdiagnose
    console.log('Detaillierte Form validation check:', {
      customerType: !!customerType,
      selectedCategory: !!selectedCategory,
      selectedSubcategory: !!selectedSubcategory,
      isSubcategoryFormValid,
      hasSubcategoryData,
      allRequiredFieldsFilled,
      missingFields,
      subcategoryDataKeys: Object.keys(subcategoryData),
      requiredFields: requiredFields.map(([key]) => key),
      subcategoryData,
      isValid: allRequiredFieldsFilled,
    });

    return allRequiredFieldsFilled;
  }, [
    customerType,
    selectedCategory,
    selectedSubcategory,
    isSubcategoryFormValid,
    subcategoryData,
  ]);

  const handleSubcategoryFormValidation = useCallback((isValid: boolean) => {
    setIsSubcategoryFormValid(isValid);
  }, []);

  const availableSubcategories =
    categories.find(cat => cat.title === selectedCategory)?.subcategories || [];

  // Zeige Projektdetails-Form wenn Unterkategorie ausgewählt ist
  const showSubcategoryForm = customerType && selectedCategory && selectedSubcategory;

  const handleNextClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Verhindert unbeabsichtigte Formularübermittlungen
    setError(null);

    // Verwende die isFormValid-Funktion für eine konsistente Validierung
    if (!isFormValid()) {
      setError('Bitte füllen Sie alle erforderlichen Felder aus.');
      return;
    }

    console.log('GetStartedPage: Daten im Context sind aktuell. Navigiere zu Adresse-Seite.');
    console.log('Context Daten für nächste Seite:', {
      customerType: customerType,
      selectedCategory: selectedCategory,
      selectedSubcategory: selectedSubcategory,
      subcategoryData: subcategoryData,
    });

    const encodedSubcategory = encodeURIComponent(selectedSubcategory!);

    router.push(`/auftrag/get-started/${encodedSubcategory}/adresse`);
  };

  return (
    <>
      <HeroHeader />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center space-y-10">
        <div className="text-center max-w-2xl space-y-4 w-full">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-white">
            Um welchen Auftrag handelt es sich?
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Finden Sie die Dienstleistung, die Sie benötigen, um geprüfte Handwerker in Ihrer Nähe
            zu kontaktieren.
          </p>

          <div className="w-full max-w-4xl mx-auto mt-6">
            <ProgressBar currentStep={stepForDisplay} totalSteps={TOTAL_STEPS} />
          </div>

          <div className="flex justify-between items-center mt-4 text-sm text-[#14ad9f] font-medium">
            <p>
              Schritt {stepForDisplay} von {TOTAL_STEPS}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="hover:underline flex items-center gap-1"
            >
              Schritte anzeigen <FiInfo className="text-base" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full mt-8">
            <button
              onClick={() => handleCustomerTypeChange('private')}
              className={`w-full rounded-xl border p-6 shadow transition flex flex-col items-center justify-center text-center gap-2 min-h-[140px] sm:min-h-[160px]
                ${isClientMounted && customerType === 'private' ? 'bg-[#ecfdfa] border-[#14ad9f]' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              <h2 className="text-xl font-semibold text-primary">Privatperson</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ich buche für meinen privaten Bedarf
              </p>
            </button>

            <button
              onClick={() => handleCustomerTypeChange('business')}
              className={`w-full rounded-xl border p-6 shadow transition flex flex-col items-center justify-center text-center gap-2 min-h-[140px] sm:min-h-[160px]
                ${isClientMounted && customerType === 'business' ? 'bg-[#ecfdfa] border-[#14ad9f]' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              <h2 className="text-xl font-semibold text-primary">Geschäftskunde</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ich buche für mein Unternehmen
              </p>
            </button>
          </div>

          {isClientMounted && customerType && (
            <div className="mt-6 w-full" onClick={e => e.stopPropagation()}>
              <Label className="text-base font-medium text-gray-800 dark:text-white">
                Wähle eine Hauptkategorie
              </Label>
              <Combobox
                options={categories.map(cat => cat.title)}
                placeholder="z. B. Handwerk, IT & Technik …"
                selected={selectedCategory}
                onChange={handleCategoryChange}
              />
            </div>
          )}

          {isClientMounted && selectedCategory && (
            <div className="mt-6 w-full" onClick={e => e.stopPropagation()}>
              <Label className="text-base font-medium text-gray-800 dark:text-white">
                Wähle eine Unterkategorie
              </Label>
              <Combobox
                options={availableSubcategories}
                placeholder="z. B. Elektriker, Umzugshelfer …"
                selected={selectedSubcategory}
                onChange={handleSubcategoryChange}
              />
            </div>
          )}

          {/* Kategorie-spezifisches Formular */}
          {isClientMounted && showSubcategoryForm && (
            <div className="mt-8 w-full">
              <SubcategoryFormManager
                subcategory={selectedSubcategory!}
                onDataChange={handleSubcategoryDataChange}
                onValidationChange={handleSubcategoryFormValidation}
              />
            </div>
          )}

          {error && (
            <div className="text-red-500 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          {/* Zeige einen Hinweis an, wenn das Formular unvollständig ist */}
          {isClientMounted && showSubcategoryForm && !isFormValid() && (
            <div className="mt-8 text-amber-600 bg-amber-50 p-4 rounded-lg border border-amber-200 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>Bitte füllen Sie alle erforderlichen Felder aus, um fortzufahren.</span>
            </div>
          )}

          {/* Button wird NUR angezeigt wenn das Formular vollständig und gültig ist */}
          {isClientMounted && isFormValid() && (
            <div className="mt-10">
              <button
                className="text-white font-medium py-3 px-6 rounded-lg shadow transition bg-[#14ad9f] hover:bg-teal-700"
                onClick={handleNextClick}
              >
                Weiter zur Adresseingabe
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10 w-full max-w-6xl">
          {[
            {
              title: 'Erstellen Sie Ihren Auftrag',
              subtitle: 'kostenlos und ohne Verpflichtungen',
              icon: (
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {' '}
                  <path d="M12 20h9" />{' '}
                  <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />{' '}
                </svg>
              ),
            },
            {
              title: 'Mehr als 56.582',
              subtitle: 'registrierte Handwerker',
              icon: (
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {' '}
                  <path d="M17 21v-2a4 4 0 0 0-3-3.87" /> <path d="M7 21v-2a4 4 0 0 1 3-3.87" />{' '}
                  <circle cx="12" cy="7" r="4" />{' '}
                </svg>
              ),
            },
            {
              title: 'Mehr als 994.012',
              subtitle: 'unabhängige Bewertungen',
              icon: (
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {' '}
                  <path d="M14 9l3 6h5l-3-6V3h-5v6z" /> <path d="M2 12h4l3 6h6" />{' '}
                </svg>
              ),
            },
          ].map((item, index) => (
            <div
              key={index}
              className="rounded-lg border p-6 text-center flex flex-col items-center bg-white dark:bg-gray-800 shadow-[0_0_20px_rgba(20,173,159,0.1)] hover:shadow-[0_0_30px_rgba(20,173,159,0.4)] transition duration-300"
            >
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full mb-4 text-[#14ad9f]">
                {' '}
                {item.icon}{' '}
              </div>
              <p className="text-base font-semibold text-gray-800 dark:text-white">{item.title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{item.subtitle}</p>
            </div>
          ))}
        </div>
        {isModalOpen && (
          <div className="fixed inset-0 flex justify-center items-center z-50 bg-black/50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
              <div className="flex justify-between items-center">
                {' '}
                <h2 className="text-2xl font-semibold">Auftrag erstellen</h2>{' '}
                <button onClick={() => setIsModalOpen(false)}>
                  {' '}
                  <FiX className="text-lg text-gray-500" />{' '}
                </button>{' '}
              </div>
              <div className="mt-4">
                {' '}
                {steps.map((step, index) => (
                  <div key={step} className="flex items-center py-2">
                    {' '}
                    <FiCheck className="text-green-500 mr-2" />{' '}
                    <p className="text-lg">{`${index + 1}. ${step}`}</p>{' '}
                  </div>
                ))}{' '}
              </div>
              <div className="flex justify-center mt-6">
                {' '}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="bg-[#14ad9f] text-white py-2 px-4 rounded-full hover:bg-[#7bdad2]"
                >
                  {' '}
                  Verstanden{' '}
                </button>{' '}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
