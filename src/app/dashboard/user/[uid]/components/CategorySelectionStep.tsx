// src/app/dashboard/user/[uid]/components/QuickJobCreationSteps/CategorySelectionStep.tsx
'use client';

import React, { useState } from 'react';
import { useRegistration } from '@/contexts/Registration-Context';
import { FiChevronRight } from 'react-icons/fi';

interface CategorySelectionStepProps {
    onNext: () => void;
}

interface ServiceCategory {
    title: string;
    description: string;
    skill: string;
    subcategories: string[];
}

const ALL_SERVICE_CATEGORIES: ServiceCategory[] = [
    { title: "Handwerk", description: "Spezialisiert auf Handwerksarbeiten", skill: "Handwerk", subcategories: ["Tischler", "Klempner", "Maler & Lackierer", "Elektriker", "Heizungsbau & Sanitär", "Fliesenleger", "Dachdecker", "Maurer", "Trockenbauer", "Schreiner", "Zimmerer", "Bodenleger", "Glaser", "Schlosser", "Metallbauer", "Fenster- & Türenbauer"] },
    { title: "Haushalt & Reinigung", description: "Dienstleistungen rund um den Haushalt", skill: "Haushalt & Reinigung", subcategories: ["Reinigungskraft", "Garten und Landschaftspflege", "Haushaltshilfe", "Fensterputzer", "Umzugshelfer", "Entrümpelung", "Hausmeisterdienste", "Teppichreinigung", "Bodenreinigung", "Hausreinigung"] },
    { title: "Transport & Logistik", description: "Experten für Transport & Logistik", skill: "Transport & Logistik", subcategories: ["Möbelmontage", "Umzugshelfer", "Fahrer", "Kurierdienste", "Transportdienstleistungen", "Lagerlogistik", "Frachtführer", "Speditionsdienstleistungen", "Kurierfahrer", "Frachtlogistik"] },
    { title: "Hotel & Gastronomie", description: "Dienstleistungen im Bereich Hotel & Gastronomie", skill: "Hotel & Gastronomie", subcategories: ["Mietkoch", "Mietkellner"] },
    { title: "IT & Technik", description: "Experten für Informationstechnologie und technische Dienstleistungen", skill: "IT & Technik", subcategories: ["Webentwicklung", "Softwareentwicklung", "App-Entwicklung", "IT-Support", "Netzwerkadministration", "Datenbankentwicklung", "IT-Beratung", "Webdesign", "UX/UI Design", "Systemintegration", "Cloud Computing", "Cybersecurity"] },
    { title: "Marketing & Vertrieb", description: "Dienstleistungen im Bereich Marketing und Vertrieb", skill: "Marketing & Vertrieb", subcategories: ["Online Marketing", "Social Media Marketing", "Content Marketing"] },
    { title: "Finanzen & Recht", description: "Experten für Finanz- und Rechtsdienstleistungen", skill: "Finanzen & Recht", subcategories: ["Buchhaltung", "Steuerberatung (freiberuflich)", "Rechtsberatung (freiberuflich)", "Finanzberatung", "Versicherungsberatung", "Übersetzungen (juristisch/wirtschaftlich)", "Lektorat (juristisch/wirtschaftlich)"] },
    { title: "Gesundheit & Wellness", description: "Dienstleistungen im Bereich Gesundheit und Wohlbefinden", skill: "Gesundheit & Wellness", subcategories: ["Physiotherapie (selbstständig)", "Ergotherapie (selbstständig)", "Heilpraktiker", "Coaching (Gesundheit/Wellness)", "Yoga-Lehrer", "Pilates-Lehrer", "Massage-Therapeut", "Ernährungsberatung"] },
    { title: "Bildung & Nachhilfe", description: "Dienstleistungen im Bildungsbereich", skill: "Bildung & Nachhilfe", subcategories: ["Nachhilfelehrer (verschiedene Fächer)", "Sprachlehrer", "Dozenten (freiberuflich)", "Trainer (Soft Skills etc.)", "Musikunterricht", "Kunstunterricht"] },
    { title: "Kunst & Kultur", description: "Dienstleistungen im künstlerischen und kulturellen Bereich", skill: "Kunst & Kultur", subcategories: ["Musiker (freiberuflich)", "Künstler (freiberuflich)", "Fotografen", "Videografen", "Texter (kreativ)", "Lektoren (Belletristik)", "Übersetzer (literarisch)", "Grafikdesigner (künstlerisch)"] },
    { title: "Veranstaltungen & Events", description: "Dienstleistungen rund um Veranstaltungen und Events", skill: "Veranstaltungen & Events", subcategories: ["Eventplanung", "Catering (klein)", "DJ (freiberuflich)", "Fotografen (Event)", "Videografen (Event)", "Servicekräfte (Mietbasis)"] },
    { title: "Tiere & Pflanzen", description: "Dienstleistungen rund um Tiere und Pflanzen", skill: "Tiere & Pflanzen", subcategories: ["Tierbetreuung (Hundesitter etc.)", "Gartenpflege", "Landschaftsgärtner (klein)", "Hundetrainer (freiberuflich)"] }
];


export function CategorySelectionStep({ onNext }: CategorySelectionStepProps) {
    const registration = useRegistration();

    const [selectedCategoryTitle, setSelectedCategoryTitle] = useState<string | null>(registration.selectedCategory || null);
    const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(registration.selectedSubcategory || null);

    const currentCategory = ALL_SERVICE_CATEGORIES.find(
        (cat) => cat.title === selectedCategoryTitle
    );

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const categoryTitle = e.target.value;
        setSelectedCategoryTitle(categoryTitle);
        setSelectedSubcategory(null);
        registration.setSelectedCategory(categoryTitle);
        registration.setSelectedSubcategory(null);
    };

    const handleSubcategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const subcategory = e.target.value;
        setSelectedSubcategory(subcategory);
        registration.setSelectedSubcategory(subcategory);
    };

    const canProceed = selectedCategoryTitle && selectedSubcategory;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (canProceed) {
            onNext();
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Wählen Sie Ihren Service</h3>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Kategorie
                    </label>
                    <select
                        id="category"
                        value={selectedCategoryTitle || ''}
                        onChange={handleCategoryChange}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                    >
                        <option value="" disabled>Kategorie auswählen</option>
                        {ALL_SERVICE_CATEGORIES.map((category) => (
                            <option key={category.title} value={category.title}>{category.title}</option>
                        ))}
                    </select>
                </div>

                {selectedCategoryTitle && currentCategory && (
                    <div>
                        <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Unterkategorie
                        </label>
                        <select
                            id="subcategory"
                            value={selectedSubcategory || ''}
                            onChange={handleSubcategoryChange}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            required
                        >
                            <option value="" disabled>Unterkategorie auswählen</option>
                            {currentCategory.subcategories.map((sub) => (
                                <option key={sub} value={sub}>{sub}</option>
                            ))}
                        </select>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={!canProceed}
                    className="mt-6 w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Weiter zum nächsten Schritt <FiChevronRight className="ml-2 -mr-1 text-lg" />
                </button>
            </form>
        </div>
    );
}