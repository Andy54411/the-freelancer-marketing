'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import ProgressBar from '@/components/ProgressBar';
import { X, Info, Check, ArrowRight, Wrench, Home, Truck, UtensilsCrossed, Monitor, Megaphone, Scale, Heart, GraduationCap, Palette, Calendar, PawPrint } from 'lucide-react';
import PopupModal from '@/app/register/company/step4/components/PopupModal';
import { useRegistration } from '@/contexts/Registration-Context';

// Icon mapping for categories
const categoryIcons: { [key: string]: React.ReactNode } = {
  'Handwerk': <Wrench className="w-8 h-8" />,
  'Haushalt & Reinigung': <Home className="w-8 h-8" />,
  'Transport & Logistik': <Truck className="w-8 h-8" />,
  'Hotel & Gastronomie': <UtensilsCrossed className="w-8 h-8" />,
  'IT & Technik': <Monitor className="w-8 h-8" />,
  'Marketing & Vertrieb': <Megaphone className="w-8 h-8" />,
  'Finanzen & Recht': <Scale className="w-8 h-8" />,
  'Gesundheit & Wellness': <Heart className="w-8 h-8" />,
  'Bildung & Nachhilfe': <GraduationCap className="w-8 h-8" />,
  'Kunst & Kultur': <Palette className="w-8 h-8" />,
  'Veranstaltungen & Events': <Calendar className="w-8 h-8" />,
  'Tiere & Pflanzen': <PawPrint className="w-8 h-8" />,
};

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
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-100 relative"
      >
        <div className="flex items-center justify-center mb-2">
          <div className="p-3 bg-[#14ad9f]/10 rounded-xl text-[#14ad9f]">
            {categoryIcons[category.skill]}
          </div>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6 text-center">
          {category.title}
        </h2>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-wrap justify-center gap-3 max-h-80 overflow-y-auto pr-2">
          {category.subcategories.map(subcat => (
            <button
              key={subcat}
              onClick={() => onSelect(subcat)}
              className={`px-4 py-3 border-2 rounded-xl text-center transition-all duration-200 ${
                selectedSubcategory === subcat
                  ? 'bg-[#14ad9f] text-white border-[#14ad9f] shadow-md'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-teal-50 hover:border-[#14ad9f] hover:text-[#14ad9f]'
              }`}
            >
              <span className="font-medium text-sm sm:text-base">{subcat}</span>
            </button>
          ))}
        </div>

        <div className="text-center mt-6">
          <button
            onClick={onClose}
            className="py-2.5 px-8 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            Schliessen
          </button>
        </div>
      </motion.div>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map(category => {
          const isSelected = selectedSkill === category.skill;
          const hasSelectedSubcategory = selectedSubcategorySkills[category.skill];

          return (
            <motion.div
              key={category.skill}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative bg-white rounded-xl border-2 p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-[#14ad9f] shadow-lg ring-2 ring-[#14ad9f]/20'
                  : 'border-gray-200 hover:border-[#14ad9f]/50 hover:shadow-md'
              }`}
              onClick={() => {
                onSkillSelect(category.skill);
                onOpenSubcategoryModal(category);
              }}
            >
              <div className={`p-3 rounded-xl mb-3 w-fit ${isSelected ? 'bg-[#14ad9f] text-white' : 'bg-gray-100 text-gray-600'}`}>
                {categoryIcons[category.skill]}
              </div>
              <h3 className={`font-bold text-base mb-1 ${isSelected ? 'text-[#14ad9f]' : 'text-gray-800'}`}>
                {category.title}
              </h3>
              <p className="text-xs text-gray-500 line-clamp-2">{category.description}</p>
              {hasSelectedSubcategory && (
                <div className="mt-2 flex items-center text-xs font-medium text-[#14ad9f] bg-teal-50 px-2 py-1 rounded-lg">
                  <Check className="w-3 h-3 mr-1" />
                  {hasSelectedSubcategory}
                </div>
              )}
            </motion.div>
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
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="relative bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-800 text-white">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: "url('/images/features/accounting-hero.png')" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Navigation */}
          <div className="flex justify-between items-center mb-6">
            <Link 
              href="/register/company/step3"
              className="flex items-center text-white/80 hover:text-white transition-colors"
            >
              <span className="mr-2">Zurueck</span>
            </Link>
            <Link 
              href="/"
              className="flex items-center text-white/80 hover:text-white transition-colors"
            >
              <span className="mr-2">Abbrechen</span>
              <X className="w-5 h-5" />
            </Link>
          </div>

          {/* Progress */}
          <div className="max-w-2xl mx-auto mb-6">
            <ProgressBar currentStep={4} totalSteps={5} />
          </div>

          {/* Title */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="flex items-center justify-center mb-4">
              <p className="text-lg text-white/80">Schritt 4 von 5</p>
              <button
                onClick={openStepsModal}
                className="ml-3 text-white/60 hover:text-white transition-colors"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Fähigkeiten auswählen
            </h1>
            <p className="text-lg text-white/80 max-w-xl mx-auto">
              Wählen Sie eine Hauptkategorie und dann eine passende Unterkategorie.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <HorizontalCardGrid
              categories={categoriesData}
              onSkillSelect={setSelectedSkill}
              selectedSkill={selectedSkill}
              onOpenSubcategoryModal={handleOpenSubcategoryModal}
              selectedSubcategorySkills={selectedSubcategorySkills}
            />

            {/* Selected Info */}
            {selectedSkill && selectedSubcategorySkills[selectedSkill] && (
              <div className="mt-8 bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-[#14ad9f]/10 rounded-lg text-[#14ad9f] mr-3">
                    {categoryIcons[selectedSkill]}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ihre Auswahl</p>
                    <p className="font-semibold text-gray-800">{selectedSkill} - {selectedSubcategorySkills[selectedSkill]}</p>
                  </div>
                </div>
                <Check className="w-6 h-6 text-[#14ad9f]" />
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-center mt-8">
              <button
                onClick={handleNext}
                disabled={!selectedSkill || !selectedSubcategorySkills[selectedSkill]}
                className="px-12 py-4 bg-linear-to-r from-[#14ad9f] to-teal-600 text-white rounded-xl hover:from-teal-600 hover:to-teal-700 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                Weiter zu Schritt 5
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>

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
    </div>
  );
}
