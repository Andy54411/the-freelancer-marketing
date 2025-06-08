// /Users/andystaudinger/tasko/src/app/auftrag/get-started/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FooterSection from '@/components/footer';
import { HeroHeader } from '@/components/hero8-header';
import { Combobox } from '@/components/combobox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ProgressBar from '@/components/ProgressBar';
import { FiInfo, FiX, FiCheck } from 'react-icons/fi';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from '@/firebase/clients';
import { useRegistration } from '@/components/Registration-Context';

const auth = getAuth(app);

const steps = [
  'Kundentyp wählen',
  'Kategorie wählen',
  'Unterkategorie wählen',
  'Auftrag beschreiben'
];

type Category = {
  title: string;
  subcategories: string[];
};

const categories: Category[] = [
  {
    title: "Handwerk",
    subcategories: [
      "Tischler", "Klempner", "Maler & Lackierer", "Elektriker",
      "Heizungsbau & Sanitär", "Fliesenleger", "Dachdecker",
      "Maurer", "Trockenbauer", "Schreiner", "Zimmerer",
      "Bodenleger", "Glaser", "Schlosser", "Metallbauer", "Fenster- & Türenbauer"
    ]
  },
  {
    title: "Haushalt & Reinigung",
    subcategories: [
      "Reinigungskraft", "Garten und Landschaftspflege", "Haushaltshilfe", "Fensterputzer",
      "Umzugshelfer", "Entrümpelung", "Hausmeisterdienste", "Teppichreinigung",
      "Bodenreinigung", "Hausreinigung"
    ]
  },
  {
    title: "Transport & Logistik",
    subcategories: [
      "Möbelmontage", "Umzugshelfer", "Fahrer", "Kurierdienste",
      "Transportdienstleistungen", "Lagerlogistik", "Frachtführer",
      "Speditionsdienstleistungen", "Kurierfahrer", "Frachtlogistik"
    ]
  },
  {
    title: "Hotel & Gastronomie",
    subcategories: [
      "Mietkoch", "Mietkellner"
    ]
  },
  {
    title: "IT & Technik",
    subcategories: [
      "Webentwicklung", "Softwareentwicklung", "App-Entwicklung",
      "IT-Support", "Netzwerkadministration", "Datenbankentwicklung",
      "IT-Beratung", "Webdesign", "UX/UI Design",
      "Systemintegration", "Cloud Computing", "Cybersecurity"
    ]
  },
  {
    title: "Marketing & Vertrieb",
    subcategories: [
      "Online Marketing", "Social Media Marketing", "Content Marketing"
    ]
  },
  {
    title: "Finanzen & Recht",
    subcategories: [
      "Buchhaltung", "Steuerberatung (freiberuflich)", "Rechtsberatung (freiberuflich)",
      "Finanzberatung", "Versicherungsberatung", "Übersetzungen (juristisch/wirtschaftlich)",
      "Lektorat (juristisch/wirtschaftlich)"
    ]
  },
  {
    title: "Gesundheit & Wellness",
    subcategories: [
      "Physiotherapie (selbstständig)", "Ergotherapie (selbstständig)",
      "Heilpraktiker", "Coaching (Gesundheit/Wellness)", "Yoga-Lehrer",
      "Pilates-Lehrer", "Massage-Therapeut", "Ernährungsberatung"
    ]
  },
  {
    title: "Bildung & Nachhilfe",
    subcategories: [
      "Nachhilfelehrer (verschiedene Fächer)", "Sprachlehrer",
      "Dozenten (freiberuflich)", "Trainer (Soft Skills etc.)",
      "Musikunterricht", "Kunstunterricht"
    ]
  },
  {
    title: "Kunst & Kultur",
    subcategories: [
      "Musiker (freiberuflich)", "Künstler (freiberuflich)", "Fotografen",
      "Videografen", "Texter (kreativ)", "Lektoren (Belletristik)",
      "Übersetzer (literarisch)", "Grafikdesigner (künstlerisch)"
    ]
  },
  {
    title: "Veranstaltungen & Events",
    subcategories: [
      "Eventplanung", "Catering (klein)", "DJ (freiberuflich)",
      "Fotografen (Event)", "Videografen (Event)", "Servicekräfte (Mietbasis)"
    ]
  },
  {
    title: "Tiere & Pflanzen",
    subcategories: [
      "Tierbetreuung (Hundesitter etc.)", "Gartenpflege",
      "Landschaftsgärtner (klein)", "Hundetrainer (freiberuflich)"
    ]
  },
];

export default function GetStartedPage() {
  const router = useRouter();
  const registration = useRegistration();

  const [selectedType, setSelectedTypeState] = useState<'private' | 'business' | null>(registration.customerType || null);
  const [selectedCategory, setSelectedCategoryState] = useState<string | null>(registration.selectedCategory || null);
  const [selectedSubcategoryState, setSelectedSubcategoryState] = useState<string | null>(registration.selectedSubcategory || null);
  const [description, setDescriptionState] = useState(registration.description || '');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (registration.customerType !== selectedType) setSelectedTypeState(registration.customerType);
    if (registration.selectedCategory !== selectedCategory) setSelectedCategoryState(registration.selectedCategory);
    if (registration.selectedSubcategory !== selectedSubcategoryState) {
      setSelectedSubcategoryState(registration.selectedSubcategory);
    } else if (!registration.selectedSubcategory) {
      const storedSubcategory = localStorage.getItem('selectedSubcategory');
      if (storedSubcategory) {
        setSelectedSubcategoryState(storedSubcategory);
        registration.setSelectedSubcategory(storedSubcategory);
      }
    }
    if (registration.description !== description) setDescriptionState(registration.description);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const unsubscribe = onAuthStateChanged(auth, (_user: User | null) => {
      // Logic for currentUserId removed as it's not used
    });
    return () => unsubscribe();
  }, [registration, selectedType, selectedCategory, selectedSubcategoryState, description]);

  const stepsCompleted = [
    !!selectedType,
    !!selectedCategory,
    !!selectedSubcategoryState,
    description.trim().length > 0,
  ];
  const currentStep = stepsCompleted.filter(Boolean).length;

  const handleCustomerTypeChange = (type: 'private' | 'business') => {
    setSelectedTypeState(type);
    registration.setCustomerType(type);
  };

  const handleCategoryChange = (categoryValue: string) => {
    setSelectedCategoryState(categoryValue);
    registration.setSelectedCategory(categoryValue);
    setSelectedSubcategoryState(null);
    registration.setSelectedSubcategory(null);
  };

  const handleSubcategoryChange = (subcategoryValue: string) => {
    setSelectedSubcategoryState(subcategoryValue);
    registration.setSelectedSubcategory(subcategoryValue);
    localStorage.setItem('selectedSubcategory', subcategoryValue);
  };

  const handleDescriptionChange = (descValue: string) => {
    setDescriptionState(descValue);
    registration.setDescription(descValue);
  };

  const availableSubcategories =
    categories.find((cat) => cat.title === selectedCategory)?.subcategories || [];

  const showDescriptionField =
    selectedType && selectedCategory && selectedSubcategoryState;

  const handleNextClick = () => {
    setError(null);

    if (!selectedType || !selectedCategory || !selectedSubcategoryState || description.trim().length === 0) {
      setError('Bitte füllen Sie alle Felder aus.');
      return;
    }

    console.log('GetStartedPage: Daten im Context sind aktuell. Navigiere zu Adresse-Seite.');
    console.log('Context Daten für nächste Seite:', {
      customerType: registration.customerType,
      selectedCategory: registration.selectedCategory,
      selectedSubcategory: registration.selectedSubcategory,
      description: registration.description
    });

    const encodedSubcategory = encodeURIComponent(selectedSubcategoryState!);

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
            Finden Sie die Dienstleistung, die Sie benötigen, um geprüfte Handwerker in Ihrer Nähe zu kontaktieren.
          </p>

          <div className="w-full max-w-4xl mx-auto mt-6">
            <ProgressBar currentStep={currentStep} totalSteps={steps.length} />
          </div>

          <div className="flex justify-between items-center mt-4 text-sm text-[#14ad9f] font-medium">
            <p>Schritt {currentStep}/{steps.length}</p>
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
                ${selectedType === 'private' ? 'bg-[#ecfdfa] border-[#14ad9f]' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              <h2 className="text-xl font-semibold text-primary">Ich bin Privatkunde</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Dienstleister für mein Zuhause finden und buchen.
              </p>
            </button>

            <button
              onClick={() => handleCustomerTypeChange('business')}
              className={`w-full rounded-xl border p-6 shadow transition flex flex-col items-center justify-center text-center gap-2 min-h-[140px] sm:min-h-[160px]
                ${selectedType === 'business' ? 'bg-[#ecfdfa] border-[#14ad9f]' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              <h2 className="text-xl font-semibold text-primary">Ich bin ein Unternehmen</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Für mein Unternehmen Hilfe buchen (B2B).
              </p>
            </button>
          </div>

          {selectedType && (
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

          {selectedCategory && (
            <div className="mt-6 w-full">
              <Label className="text-base font-medium text-gray-800 dark:text-white">
                Wähle eine Unterkategorie
              </Label>
              <Combobox
                options={availableSubcategories}
                placeholder="z. B. Elektriker, Umzugshelfer …"
                selected={selectedSubcategoryState}
                onChange={handleSubcategoryChange}
              />
            </div>
          )}

          {showDescriptionField && (
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

          {currentStep === steps.length && (
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