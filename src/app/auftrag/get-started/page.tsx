// /Users/andystaudinger/tasko/src/app/auftrag/get-started/page.tsx
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import FooterSection from '@/components/footer';
import { HeroHeader } from '@/components/hero8-header';
import { Combobox } from '@/components/combobox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ProgressBar from '@/components/ProgressBar';
import { FiInfo, FiX, FiCheck } from 'react-icons/fi';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { app } from '@/firebase/clients';
import { categories, type Category } from '@/lib/categoriesData'; // Importiere Kategorien aus der zentralen Datei
import { useRegistration } from '@/contexts/Registration-Context';

const auth = getAuth(app);

const steps = [
  'Kundentyp wählen',
  'Kategorie wählen',
  'Unterkategorie wählen',
  'Auftrag beschreiben'
];

const TOTAL_STEPS = steps.length;

export default function GetStartedPage() {
  const router = useRouter();
  const {
    customerType,
    setCustomerType,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    description,
    setDescription,
  } = useRegistration();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClientMounted, setIsClientMounted] = useState(false);

  // Effect to mark client mount
  useEffect(() => {
    setIsClientMounted(true);
    const unsubscribe = onAuthStateChanged(auth, (_user: User | null) => {
      // Auth logic if needed
    });
    return () => unsubscribe();
  }, []);

  const logicalCurrentStep = useMemo(() => {
    const stepsCompleted = [
      !!customerType,
      !!selectedCategory,
      !!selectedSubcategory,
      description.trim().length > 0,
    ];
    return stepsCompleted.filter(Boolean).length;
  }, [customerType, selectedCategory, selectedSubcategory, description]);

  // Determine the step to display, ensuring server and initial client render match
  const stepForDisplay = isClientMounted ? logicalCurrentStep : 0;

  const handleCustomerTypeChange = (type: 'private' | 'business') => {
    setCustomerType(type);
  };

  const handleCategoryChange = (categoryValue: string) => {
    setSelectedCategory(categoryValue);
    setSelectedSubcategory(null); // Reset subcategory
  };

  const handleSubcategoryChange = (subcategoryValue: string) => {
    setSelectedSubcategory(subcategoryValue);
  };

  const handleDescriptionChange = (descValue: string) => {
    setDescription(descValue);
  };

  const availableSubcategories =
    categories.find((cat) => cat.title === selectedCategory)?.subcategories || [];

  const showDescriptionField =
    customerType && selectedCategory && selectedSubcategory;

  const handleNextClick = () => {
    setError(null);

    // Use context state for validation
    if (
      !customerType ||
      !selectedCategory ||
      !selectedSubcategory ||
      description.trim().length === 0
    ) {
      setError('Bitte füllen Sie alle Felder aus.');
      return;
    }

    console.log('GetStartedPage: Daten im Context sind aktuell. Navigiere zu Adresse-Seite.');
    console.log('Context Daten für nächste Seite:', {
      customerType: customerType,
      selectedCategory: selectedCategory,
      selectedSubcategory: selectedSubcategory,
      description: description
    });

    const encodedSubcategory = encodeURIComponent(selectedSubcategory!);
    const encodedDescription = encodeURIComponent(description); // Beschreibung kodieren

    router.push(`/auftrag/get-started/${encodedSubcategory}/adresse?description=${encodedDescription}`);
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
            Finden Sie die Dienstleistung, die Sie benötigen, um geprüfte Handwerker in Ihrer Nähe zu kontaktieren.
          </p>

          <div className="w-full max-w-4xl mx-auto mt-6">
            <ProgressBar currentStep={stepForDisplay} totalSteps={TOTAL_STEPS} />
          </div>

          <div className="flex justify-between items-center mt-4 text-sm text-[#14ad9f] font-medium">
            <p>Schritt {stepForDisplay}/{TOTAL_STEPS}</p>
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
                ${customerType === 'private' ? 'bg-[#ecfdfa] border-[#14ad9f]' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              <h2 className="text-xl font-semibold text-primary">Ich bin Privatkunde</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Dienstleister für mein Zuhause finden und buchen.
              </p>
            </button>

            <button
              onClick={() => handleCustomerTypeChange('business')}
              className={`w-full rounded-xl border p-6 shadow transition flex flex-col items-center justify-center text-center gap-2 min-h-[140px] sm:min-h-[160px]
                ${customerType === 'business' ? 'bg-[#ecfdfa] border-[#14ad9f]' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              <h2 className="text-xl font-semibold text-primary">Ich bin ein Unternehmen</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Für mein Unternehmen Hilfe buchen (B2B).
              </p>
            </button>
          </div>

          {isClientMounted && customerType && (
            <div className="mt-6 w-full">
              <Label className="text-base font-medium text-gray-800 dark:text-white">
                Wähle eine Hauptkategorie
              </Label>
              <Combobox
                options={categories.map((cat) => cat.title)}
                placeholder="z. B. Handwerk, IT & Technik …"
                selected={selectedCategory}
                onChange={handleCategoryChange}
              />
            </div>
          )}

          {isClientMounted && selectedCategory && (
            <div className="mt-6 w-full">
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

          {isClientMounted && showDescriptionField && (
            <div className="mt-6 w-full">
              <Label htmlFor="auftragBeschreibung" className="text-base font-medium text-gray-800 dark:text-white">
                Beschreiben Sie Ihren Auftrag
              </Label>
              <Textarea
                id="auftragBeschreibung"
                placeholder="Beschreiben Sie hier, was genau gemacht werden soll …"
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
              />
            </div>
          )}


          {error && (
            <div className="text-red-500 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">{error}</div>
          )}

          {isClientMounted && logicalCurrentStep === TOTAL_STEPS && (
            <div className="mt-10">
              <button
                className="bg-[#14ad9f] text-white font-medium py-3 px-6 rounded-lg shadow hover:bg-teal-700 transition"
                onClick={handleNextClick}
              >
                Weiter zur Adresseingabe
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10 w-full max-w-6xl">
          {[
            { title: "Erstellen Sie Ihren Auftrag", subtitle: "kostenlos und ohne Verpflichtungen", icon: (<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <path d="M12 20h9" /> <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" /> </svg>), },
            { title: "Mehr als 56.582", subtitle: "registrierte Handwerker", icon: (<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <path d="M17 21v-2a4 4 0 0 0-3-3.87" /> <path d="M7 21v-2a4 4 0 0 1 3-3.87" /> <circle cx="12" cy="7" r="4" /> </svg>), },
            { title: "Mehr als 994.012", subtitle: "unabhängige Bewertungen", icon: (<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <path d="M14 9l3 6h5l-3-6V3h-5v6z" /> <path d="M2 12h4l3 6h6" /> </svg>), },
          ].map((item, index) => (
            <div key={index} className="rounded-lg border p-6 text-center flex flex-col items-center bg-white dark:bg-gray-800 shadow-[0_0_20px_rgba(20,173,159,0.1)] hover:shadow-[0_0_30px_rgba(20,173,159,0.4)] transition duration-300" >
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full mb-4 text-[#14ad9f]"> {item.icon} </div>
              <p className="text-base font-semibold text-gray-800 dark:text-white">{item.title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{item.subtitle}</p>
            </div>
          ))}
        </div>
        {isModalOpen && (
          <div className="fixed inset-0 flex justify-center items-center z-50 bg-black/50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
              <div className="flex justify-between items-center"> <h2 className="text-2xl font-semibold">Auftrag erstellen</h2> <button onClick={() => setIsModalOpen(false)}> <FiX className="text-lg text-gray-500" /> </button> </div>
              <div className="mt-4"> {steps.map((step, index) => (<div key={step} className="flex items-center py-2"> <FiCheck className="text-green-500 mr-2" /> <p className="text-lg">{`${index + 1}. ${step}`}</p> </div>))} </div>
              <div className="flex justify-center mt-6"> <button onClick={() => setIsModalOpen(false)} className="bg-[#14ad9f] text-white py-2 px-4 rounded-full hover:bg-[#7bdad2]" > Verstanden </button> </div>
            </div>
          </div>
        )}
        <FooterSection />
      </main>
    </>
  );
}