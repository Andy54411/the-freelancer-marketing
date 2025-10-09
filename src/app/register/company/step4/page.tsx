'use client';

import React, { useState, useCallback, useEffect } from 'react'; // useEffect hinzugefügt
import { useRouter } from 'next/navigation';
import ProgressBar from '@/components/ProgressBar';
import { FiX, FiInfo, FiCheck } from 'react-icons/fi';
import PopupModal from '@/app/register/company/step4/components/PopupModal';
import { useRegistration } from '@/contexts/Registration-Context';

// --- Daten für die Kategorien und Unterkategorien ---
interface CardData {
  title: string;
  description: string;
  skill: string;
  subcategories: string[];
}

const categoriesData: CardData[] = [
  {
    title: 'Handwerk',
    description: 'Spezialisiert auf Handwerksarbeiten',
    skill: 'Handwerk',
    subcategories: [
      'Tischler',
      'Klempner',
      'Maler & Lackierer',
      'Elektriker',
      'Heizungsbau & Sanitär',
      'Fliesenleger',
      'Dachdecker',
      'Maurer',
      'Trockenbauer',
      'Schreiner',
      'Zimmerer',
      'Bodenleger',
      'Glaser',
      'Schlosser',
      'Metallbauer',
      'Fenster- & Türenbauer',
    ],
  },
  {
    title: 'Haushalt & Reinigung',
    description: 'Dienstleistungen rund um den Haushalt',
    skill: 'Haushalt & Reinigung',
    subcategories: [
      'Reinigungskraft',
      'Garten und Landschaftspflege',
      'Haushaltshilfe',
      'Fensterputzer',
      'Umzugshelfer',
      'Entrümpelung',
      'Hausmeisterdienste',
      'Teppichreinigung',
      'Bodenreinigung',
      'Hausreinigung',
    ],
  },
  {
    title: 'Transport & Logistik',
    description: 'Experten für Transport & Logistik',
    skill: 'Transport & Logistik',
    subcategories: [
      'Möbelmontage',
      'Umzugshelfer',
      'Fahrer',
      'Kurierdienste',
      'Transportdienstleistungen',
      'Lagerlogistik',
      'Frachtführer',
      'Speditionsdienstleistungen',
      'Kurierfahrer',
      'Frachtlogistik',
    ],
  },
  {
    title: 'Hotel & Gastronomie',
    description: 'Dienstleistungen im Bereich Hotel & Gastronomie',
    skill: 'Hotel & Gastronomie',
    subcategories: ['Mietkoch', 'Mietkellner'],
  },
  {
    title: 'IT & Technik',
    description: 'Experten für Informationstechnologie und technische Dienstleistungen',
    skill: 'IT & Technik',
    subcategories: [
      'Webentwicklung',
      'Softwareentwicklung',
      'App-Entwicklung',
      'IT-Support',
      'Netzwerkadministration',
      'Datenbankentwicklung',
      'IT-Beratung',
      'Webdesign',
      'UX/UI Design',
      'Systemintegration',
      'Cloud Computing',
      'Cybersecurity',
    ],
  },
  {
    title: 'Marketing & Vertrieb',
    description: 'Dienstleistungen im Bereich Marketing und Vertrieb',
    skill: 'Marketing & Vertrieb',
    subcategories: ['Online Marketing', 'Social Media Marketing', 'Content Marketing'],
  },
  {
    title: 'Finanzen & Recht',
    description: 'Experten für Finanz- und Rechtsdienstleistungen',
    skill: 'Finanzen & Recht',
    subcategories: [
      'Buchhaltung',
      'Steuerberatung (freiberuflich)',
      'Rechtsberatung (freiberuflich)',
      'Finanzberatung',
      'Versicherungsberatung',
      'Übersetzungen (juristisch/wirtschaftlich)',
      'Lektorat (juristisch/wirtschaftlich)',
    ],
  },
  {
    title: 'Gesundheit & Wellness',
    description: 'Dienstleistungen im Bereich Gesundheit und Wohlbefinden',
    skill: 'Gesundheit & Wellness',
    subcategories: [
      'Physiotherapie (selbstständig)',
      'Ergotherapie (selbstständig)',
      'Heilpraktiker',
      'Coaching (Gesundheit/Wellness)',
      'Yoga-Lehrer',
      'Pilates-Lehrer',
      'Massage-Therapeut',
      'Ernährungsberatung',
    ],
  },
  {
    title: 'Bildung & Nachhilfe',
    description: 'Dienstleistungen im Bildungsbereich',
    skill: 'Bildung & Nachhilfe',
    subcategories: [
      'Nachhilfelehrer (verschiedene Fächer)',
      'Sprachlehrer',
      'Dozenten (freiberuflich)',
      'Trainer (Soft Skills etc.)',
      'Musikunterricht',
      'Kunstunterricht',
    ],
  },
  {
    title: 'Kunst & Kultur',
    description: 'Dienstleistungen im künstlerischen und kulturellen Bereich',
    skill: 'Kunst & Kultur',
    subcategories: [
      'Musiker (freiberuflich)',
      'Künstler (freiberuflich)',
      'Fotografen',
      'Videografen',
      'Texter (kreativ)',
      'Lektoren (Belletristik)',
      'Übersetzer (literarisch)',
      'Grafikdesigner (künstlerisch)',
    ],
  },
  {
    title: 'Veranstaltungen & Events',
    description: 'Dienstleistungen rund um Veranstaltungen und Events',
    skill: 'Veranstaltungen & Events',
    subcategories: [
      'Eventplanung',
      'Catering (klein)',
      'DJ (freiberuflich)',
      'Fotografen (Event)',
      'Videografen (Event)',
      'Servicekräfte (Mietbasis)',
    ],
  },
  {
    title: 'Tiere & Pflanzen',
    description: 'Dienstleistungen rund um Tiere und Pflanzen',
    skill: 'Tiere & Pflanzen',
    subcategories: [
      'Tierbetreuung (Hundesitter etc.)',
      'Gartenpflege',
      'Landschaftsgärtner (klein)',
      'Hundetrainer (freiberuflich)',
    ],
  },
];

// --- Neue Komponente: SubcategorySelectionModal ---
interface SubcategorySelectionModalProps {
  category: CardData;
  selectedSubcategory: string | null;
  onSelect: (subcategory: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

const SubcategorySelectionModal: React.FC<SubcategorySelectionModalProps> = ({
  category,
  selectedSubcategory,
  onSelect,
  onClose,
  isOpen,
}) => {
  // NEU: useEffect zur Steuerung des Body-Scrollens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'; // Scrollen des Body deaktivieren
    } else {
      document.body.style.overflow = ''; // Scrollen des Body wieder aktivieren
    }
    // Cleanup-Funktion: Stellt sicher, dass overflow beim Unmounten zurückgesetzt wird
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]); // Abhängigkeit von isOpen

  if (!isOpen) return null;

  return (
    // Overlay für den Hintergrund des Modals (mit Weichzeichner)
    <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-md flex justify-center items-center z-50 p-4">
      {/* KORREKTUR: max-w-lg zu max-w-2xl erhöht, um mehr Platz zu schaffen */}
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200 relative">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 text-center">
          Unterkategorien für &quot;{category.title}&quot;
        </h2>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors duration-200"
        >
          <FiX className="text-2xl" />
        </button>

        {/* KORREKTUR: Von grid zu flex, um dynamische Breiten zu ermöglichen */}
        <div className="flex flex-wrap justify-center gap-4 max-h-80 overflow-y-auto pr-2">
          {category.subcategories.map(subcat => (
            <button
              key={subcat}
              onClick={() => {
                onSelect(subcat);
              }}
              className={`
                px-6 py-4 border-2 rounded-lg text-center transition-all duration-200
                overflow-hidden // Behält Überlauf bei, lässt Text aber umbrechen
                ${
                  selectedSubcategory === subcat
                    ? 'bg-teal-500 text-white border-teal-500 shadow-md'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-teal-50 hover:text-teal-600'
                }
                // KEIN w-full, damit Breite sich an Inhalt anpasst
              `}
            >
              {/* KORREKTUR: Textgröße für bessere Anpassung, keine nowrap oder ellipsis auf h4 */}
              <h4 className="font-semibold text-base sm:text-lg">{subcat}</h4>
            </button>
          ))}
        </div>

        <div className="text-center mt-6">
          <button
            onClick={onClose}
            className="py-2 px-6 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors duration-200 font-semibold"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Angepasste Komponente: HorizontalCardGrid (jetzt ohne inline Subkategorien) ---
interface HorizontalCardGridProps {
  categories: CardData[];
  onSkillSelect: (skill: string) => void;
  selectedSkill: string | null;
  onOpenSubcategoryModal: (category: CardData) => void;
  selectedSubcategorySkills: { [key: string]: string | null };
}

const HorizontalCardGrid: React.FC<HorizontalCardGridProps> = ({
  categories,
  onSkillSelect,
  selectedSkill,
  onOpenSubcategoryModal,
  selectedSubcategorySkills,
}) => {
  return (
    <div className="w-full">
      <div className="flex flex-wrap justify-center gap-6 p-6">
        {categories.map(category => {
          const isSelected = selectedSkill === category.skill;
          const hasSelectedSubcategory = selectedSubcategorySkills[category.skill];

          return (
            <div
              key={category.skill}
              className={`
                w-full sm:w-[calc(50%-1.5rem)] // Auf kleinen Bildschirmen 2 Spalten
                lg:w-[calc(33.33%-1.5rem)] // KORREKTUR: Auf LG-Bildschirmen 3 Spalten (breitere Karten)
                xl:w-[calc(25%-1.5rem)] // KORREKTUR: Auf XL-Bildschirmen 4 Spalten
                h-48 shadow-lg rounded-xl overflow-hidden cursor-pointer
                transition-all flex flex-col items-center justify-center p-4 text-center
                transform hover:scale-105 duration-300
                ${
                  isSelected
                    ? 'bg-teal-600 text-white border-4 border-teal-800 ring-2 ring-teal-500'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }
              `}
              onClick={() => {
                onSkillSelect(category.skill);
                onOpenSubcategoryModal(category);
              }}
            >
              <h3 className="font-bold text-xl mb-2">{category.title}</h3>
              <p className="text-sm opacity-90">{category.description}</p>
              {hasSelectedSubcategory && (
                <div className="mt-2 text-xs font-semibold px-2 py-1 rounded-full bg-white bg-opacity-20 text-white">
                  {hasSelectedSubcategory} <FiCheck className="inline-block ml-1" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Hauptkomponente: Step4 ---
export default function Step4() {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [isStepsModalOpen, setIsStepsModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [currentSelectedCategory, setCurrentSelectedCategory] = useState<CardData | null>(null);

  const [selectedSubcategorySkills, setSelectedSubcategorySkills] = useState<{
    [key: string]: string | null;
  }>({});
  const router = useRouter();

  const {
    setSelectedHandwerkSkills,
    setSelectedHaushaltServices,
    setSelectedSubcategory,
    setSelectedCategory,
  } = useRegistration();

  const handleOpenSubcategoryModal = useCallback((category: CardData) => {
    setCurrentSelectedCategory(category);
    setIsSubcategoryModalOpen(true);
  }, []);

  const handleCloseSubcategoryModal = useCallback(() => {
    setIsSubcategoryModalOpen(false);
    setCurrentSelectedCategory(null);
  }, []);

  const handleSubcategorySelectInModal = useCallback(
    (subcategory: string) => {
      if (selectedSkill) {
        setSelectedSubcategorySkills(prev => ({
          ...prev,
          [selectedSkill]: subcategory,
        }));
        // 🔧 FIX: Auch die Hauptkategorie setzen!
        setSelectedCategory(selectedSkill);
        setSelectedSubcategory(subcategory);
        handleCloseSubcategoryModal(); // KORREKTUR: Modal hier schließen
      }
    },
    [selectedSkill, setSelectedCategory, setSelectedSubcategory, handleCloseSubcategoryModal]
  );

  const handleNext = () => {
    if (!selectedSkill) {
      alert('Bitte wähle eine Hauptkategorie aus.');
      return;
    }

    const selectedSubcategoryName = selectedSubcategorySkills[selectedSkill];
    if (!selectedSubcategoryName) {
      alert(`Bitte wähle eine Unterkategorie für "${selectedSkill}" aus.`);
      return;
    }

    localStorage.setItem('selectedSkill', selectedSkill);
    localStorage.setItem('selectedSubcategoryName', selectedSubcategoryName);

    // 🔧 FIX: Setze auch die Kategorie im Registration Context
    setSelectedCategory(selectedSkill);
    setSelectedSubcategory(selectedSubcategoryName);

    if (selectedSkill === 'Handwerk') {
      setSelectedHandwerkSkills?.(selectedSubcategoryName ? [selectedSubcategoryName] : null);
      setSelectedHaushaltServices?.(null);
    } else if (selectedSkill === 'Haushalt & Reinigung') {
      setSelectedHaushaltServices?.(selectedSubcategoryName ? [selectedSubcategoryName] : null);
      setSelectedHandwerkSkills?.(null);
    } else {
      setSelectedHandwerkSkills?.(null);
      setSelectedHaushaltServices?.(null);
    }

    router.push('/register/company/step5');
  };

  const openStepsModal = () => setIsStepsModalOpen(true);
  const closeStepsModal = () => setIsStepsModalOpen(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br p-4 sm:p-6 font-sans">
      {/* Top-Bereich */}
      <div className="w-full max-w-xl lg:max-w-4xl mx-auto mb-6 px-4">
        <div className="flex justify-between mb-4">
          <button
            onClick={() => router.push('/register/company/step3')}
            className="text-[#14ad9f] hover:text-[#129488] text-base sm:text-lg flex items-center transition-colors duration-200"
          >
            <span className="mr-2">← Zurück zu Schritt 3</span>
          </button>
          <button
            onClick={() => router.push('/')}
            className="text-[#14ad9f] hover:text-teal-700 text-base sm:text-lg flex items-center transition-colors duration-200"
          >
            <span className="mr-2">Abbrechen</span>
            <FiX className="text-xl" />
          </button>
        </div>
        <div className="mb-6">
          <ProgressBar currentStep={4} totalSteps={5} />
        </div>
        <div className="flex justify-between items-center mb-6">
          <p className="text-lg sm:text-xl text-teal-600 font-semibold">Schritt 4/5</p>
          <div className="flex items-center">
            <button
              onClick={openStepsModal}
              className="text-sm sm:text-base text-teal-600 hover:underline mr-2 cursor-pointer"
            >
              Schritte anzeigen
            </button>
            <FiInfo className="text-teal-600 text-xl sm:text-2xl" />
          </div>
        </div>
      </div>

      {/* Hauptinhalt der Seite */}
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 text-center">
        Fähigkeiten auswählen
      </h2>
      <p className="text-gray-600 text-center mb-8 max-w-xl">
        Wählen Sie eine Hauptkategorie und dann eine passende Unterkategorie.
      </p>

      <HorizontalCardGrid
        categories={categoriesData}
        onSkillSelect={setSelectedSkill}
        selectedSkill={selectedSkill}
        onOpenSubcategoryModal={handleOpenSubcategoryModal}
        selectedSubcategorySkills={selectedSubcategorySkills}
      />

      {/* Modals */}
      {isStepsModalOpen && (
        <PopupModal
          isOpen={isStepsModalOpen}
          onClose={closeStepsModal}
          steps={[
            'Firmenprofil anlegen',
            'Adresse eingeben',
            'Kontaktdaten angeben',
            'Fähigkeiten auswählen',
            'Zusammenfassung & Abschluss',
          ]}
        />
      )}
      {isSubcategoryModalOpen && currentSelectedCategory && (
        <SubcategorySelectionModal
          isOpen={isSubcategoryModalOpen}
          onClose={handleCloseSubcategoryModal}
          category={currentSelectedCategory}
          selectedSubcategory={selectedSubcategorySkills[currentSelectedCategory.skill] || null}
          onSelect={handleSubcategorySelectInModal}
        />
      )}

      {/* Weiter-Button */}
      <div className="flex justify-center mt-8 w-full max-w-xl">
        <button
          onClick={handleNext}
          className="w-full py-3 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
          disabled={!selectedSkill || !selectedSubcategorySkills[selectedSkill]}
        >
          Weiter zu Schritt 5
        </button>
      </div>
    </div>
  );
}
