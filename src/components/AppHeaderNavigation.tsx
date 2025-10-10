// /Users/andystaudinger/Taskilo/src/components/AppHeaderNavigation.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Menu, X, Grid } from 'lucide-react';
import { categories, Category } from '@/lib/categoriesData';
import { useAuth } from '@/contexts/AuthContext';

const AppHeaderNavigation: React.FC = () => {
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const { user } = useAuth();
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleMegaMenuEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setIsMegaMenuOpen(true);
  };

  const handleMegaMenuLeave = () => {
    const timeout = setTimeout(() => {
      setIsMegaMenuOpen(false);
    }, 150); // Kleine Verzögerung für bessere UX
    setHoverTimeout(timeout);
  };

  // Hover-Handler für einzelne Kategorien
  const handleCategoryEnter = (categoryTitle: string) => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setHoveredCategory(categoryTitle);
  };

  const handleCategoryLeave = () => {
    const timeout = setTimeout(() => {
      setHoveredCategory(null);
    }, 150); // Kleine Verzögerung für bessere UX
    setHoverTimeout(timeout);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  const toggleCategoryExpansion = (categoryTitle: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryTitle)) {
        newSet.delete(categoryTitle);
      } else {
        newSet.add(categoryTitle);
      }
      return newSet;
    });
  };

  // Liste der tatsächlich verfügbaren Subcategory-Forms
  const availableSubcategories = [
    'Autoreparatur',
    'Bodenleger',
    'Bodenreinigung',
    'Buchhaltung',
    'Catering',
    'Content Marketing',
    'DJ Service',
    'Dachdecker',
    'Dekoration',
    'Elektriker',
    'Ernährungsberatung',
    'Eventplanung',
    'Fahrer',
    'Fenster & Türenbau',
    'Fensterputzer',
    'Finanzberatung',
    'Fitness Training',
    'Fliesenleger',
    'Fotograf',
    'Friseur',
    'Gartenbau',
    'Gartenpflege',
    'Gebäudereiniger',
    'Glaser',
    'Grafiker',
    'Handwerker',
    'Haushaltshilfe',
    'Hausmeister',
    'Hausreinigung',
    'Heizung',
    'Heizung & Sanitär',
    'Hundetrainer',
    'Inventur',
    'Kinderbetreuung',
    'Klempner',
    'Kosmetik',
    'Kurierdienst',
    'Lagerlogistik',
    'Landschaftsgärtner',
    'Logistik',
    'Maler',
    'Marketingberater',
    'Marktforschung',
    'Massage',
    'Maurer',
    'Metallbauer',
    'Mietkellner',
    'Mietkoch',
    'Montageservice',
    'Musiker',
    'Musikunterricht',
    'Möbel Transportieren',
    'Nachhilfe',
    'Nachhilfelehrer',
    'Online Marketing',
    'Physiotherapie',
    'Recherche',
    'Rechnungswesen',
    'Rechtsberatung',
    'Reinigungskraft',
    'Schlosser',
    'Schreiner',
    'Seniorenbetreuung',
    'Sicherheitsdienst',
    'Social Media Marketing',
    'Spediteur',
    'Sprachlehrer',
    'Sprachunterricht',
    'Steuerberatung',
    'Steuerfachangestellter',
    'Schwimmtrainer',
    'Telefonservice',
    'Teppichreinigung',
    'Texter',
    'Tierarzt Assistenz',
    'Tierbetreuung',
    'Tierpflege',
    'Tischler',
    'Transportdienstleistungen',
    'Trockenbauer',
    'Umzugshelfer',
    'Unternehmensberatung',
    'Versicherungsberatung',
    'Verwaltung',
    'Videograf',
    'Zimmerer',
    'Übersetzer',
  ];

  // Helper function to get the correct service URL - Zu Services-Seiten mit korrekter URL-Kodierung
  const getServiceUrl = (category: string, subcategory?: string) => {
    if (!user?.uid) return '/login';

    if (subcategory) {
      // Für Subcategorien führen wir zu den Services-Seiten mit Anbietern
      const categorySlug = category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'und');
      const subcategorySlug = subcategory.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'und');
      return `/services/${categorySlug}/${subcategorySlug}`;
    }

    // Für Kategorien führen wir zu den Category-Services-Seiten
    const categorySlug = category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'und');
    return `/services/${categorySlug}`;
  }; // Filtere Kategorien und zeige nur Subcategories mit verfügbaren Forms
  const getFilteredCategories = () => {
    return categories
      .map(category => ({
        ...category,
        subcategories: category.subcategories.filter(sub => availableSubcategories.includes(sub)),
      }))
      .filter(category => category.subcategories.length > 0);
  };

  // Helper function um Subkategorien für eine spezifische Kategorie zu bekommen
  const getSubcategoriesForCategory = (categoryTitle: string) => {
    const category = categories.find(cat => cat.title === categoryTitle);
    if (!category) return [];
    return category.subcategories.filter(sub => availableSubcategories.includes(sub));
  };

  // Organize categories into columns for mega menu - mehr Spalten für breiteres Layout
  const filteredCategories = getFilteredCategories();
  const megaMenuColumns = Array.isArray(filteredCategories)
    ? [
        filteredCategories.slice(0, Math.ceil(filteredCategories.length / 4)),
        filteredCategories.slice(
          Math.ceil(filteredCategories.length / 4),
          Math.ceil((filteredCategories.length * 2) / 4)
        ),
        filteredCategories.slice(
          Math.ceil((filteredCategories.length * 2) / 4),
          Math.ceil((filteredCategories.length * 3) / 4)
        ),
        filteredCategories.slice(Math.ceil((filteredCategories.length * 3) / 4)),
      ]
    : [[], [], [], []];

  return (
    <nav className="bg-white relative">
      {/* Desktop Navigation - Modernes Design mit besserer Visualisierung */}
      <div className="hidden lg:block">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-3">
            {/* Beliebte Kategorien mit Mega-Menü */}
            <div className="flex items-center gap-1 text-sm relative">
              {/* Handwerk */}
              <div
                onMouseEnter={() => handleCategoryEnter('Handwerk')}
                onMouseLeave={handleCategoryLeave}
              >
                <Link
                  href={getServiceUrl('Handwerk')}
                  className="text-gray-700 hover:text-white hover:bg-[#14ad9f] px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-transparent hover:border-[#14ad9f]"
                >
                  Handwerk
                </Link>
              </div>

              {/* Haushalt */}
              <div
                onMouseEnter={() => handleCategoryEnter('Haushalt')}
                onMouseLeave={handleCategoryLeave}
              >
                <Link
                  href={getServiceUrl('Haushalt')}
                  className="text-gray-700 hover:text-white hover:bg-[#14ad9f] px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-transparent hover:border-[#14ad9f]"
                >
                  Haushalt
                </Link>
              </div>

              {/* IT & Digital */}
              <div
                onMouseEnter={() => handleCategoryEnter('IT & Digital')}
                onMouseLeave={handleCategoryLeave}
              >
                <Link
                  href={getServiceUrl('IT & Digital')}
                  className="text-gray-700 hover:text-white hover:bg-[#14ad9f] px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-transparent hover:border-[#14ad9f]"
                >
                  IT & Digital
                </Link>
              </div>

              {/* Transport */}
              <div
                onMouseEnter={() => handleCategoryEnter('Transport')}
                onMouseLeave={handleCategoryLeave}
              >
                <Link
                  href={getServiceUrl('Transport')}
                  className="text-gray-700 hover:text-white hover:bg-[#14ad9f] px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-transparent hover:border-[#14ad9f]"
                >
                  Transport
                </Link>
              </div>

              {/* Garten */}
              <div
                onMouseEnter={() => handleCategoryEnter('Garten')}
                onMouseLeave={handleCategoryLeave}
              >
                <Link
                  href={getServiceUrl('Garten')}
                  className="text-gray-700 hover:text-white hover:bg-[#14ad9f] px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-transparent hover:border-[#14ad9f]"
                >
                  Garten
                </Link>
              </div>

              {/* Wellness */}
              <div
                onMouseEnter={() => handleCategoryEnter('Wellness')}
                onMouseLeave={handleCategoryLeave}
              >
                <Link
                  href={getServiceUrl('Wellness')}
                  className="text-gray-700 hover:text-white hover:bg-[#14ad9f] px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-transparent hover:border-[#14ad9f]"
                >
                  Wellness
                </Link>
              </div>

              {/* Marketing & Vertrieb */}
              <div
                onMouseEnter={() => handleCategoryEnter('Marketing & Vertrieb')}
                onMouseLeave={handleCategoryLeave}
              >
                <Link
                  href={getServiceUrl('Marketing & Vertrieb')}
                  className="text-gray-700 hover:text-white hover:bg-[#14ad9f] px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-transparent hover:border-[#14ad9f]"
                >
                  Marketing
                </Link>
              </div>

              {/* Finanzen & Recht */}
              <div
                onMouseEnter={() => handleCategoryEnter('Finanzen & Recht')}
                onMouseLeave={handleCategoryLeave}
              >
                <Link
                  href={getServiceUrl('Finanzen & Recht')}
                  className="text-gray-700 hover:text-white hover:bg-[#14ad9f] px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-transparent hover:border-[#14ad9f]"
                >
                  Finanzen
                </Link>
              </div>

              {/* Bildung & Unterstützung */}
              <div
                onMouseEnter={() => handleCategoryEnter('Bildung & Unterstützung')}
                onMouseLeave={handleCategoryLeave}
              >
                <Link
                  href={getServiceUrl('Bildung & Unterstützung')}
                  className="text-gray-700 hover:text-white hover:bg-[#14ad9f] px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-transparent hover:border-[#14ad9f]"
                >
                  Bildung
                </Link>
              </div>

              {/* Hotel & Gastronomie */}
              <div
                onMouseEnter={() => handleCategoryEnter('Hotel & Gastronomie')}
                onMouseLeave={handleCategoryLeave}
              >
                <Link
                  href={getServiceUrl('Hotel & Gastronomie')}
                  className="text-gray-700 hover:text-white hover:bg-[#14ad9f] px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-transparent hover:border-[#14ad9f]"
                >
                  Hotel & Gastronomie
                </Link>
              </div>

              {/* Alle Services Button - Direkter Link zu Services-Seite */}
              <Link
                href="/services"
                className="flex items-center text-white bg-[#14ad9f] hover:bg-[#129488] px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg border border-[#14ad9f]"
              >
                Alle Services
              </Link>
            </div>
          </div>
        </div>

        {/* Zentrales Mega-Menü - immer in der Mitte */}
        {hoveredCategory && (
          <div
            className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-8 z-50 w-[900px] max-w-6xl"
            onMouseEnter={() => handleCategoryEnter(hoveredCategory)}
            onMouseLeave={handleCategoryLeave}
          >
            {(() => {
              const subcategories = getSubcategoriesForCategory(hoveredCategory);
              const gridCols =
                subcategories.length <= 6
                  ? 'grid-cols-3'
                  : subcategories.length <= 12
                    ? 'grid-cols-4'
                    : 'grid-cols-5';

              return (
                <>
                  <h4 className="text-xl font-bold text-gray-900 mb-6 text-center border-b border-gray-100 pb-3">
                    {hoveredCategory} Services
                  </h4>
                  <div className={`grid ${gridCols} gap-4`}>
                    {subcategories.map((subcategory, index) => (
                      <Link
                        key={index}
                        href={getServiceUrl(hoveredCategory, subcategory)}
                        className="block px-4 py-3 text-sm text-gray-700 hover:text-[#14ad9f] hover:bg-gray-50 rounded-lg transition-colors duration-200 text-center border border-gray-100 hover:border-[#14ad9f] hover:shadow-md"
                        onClick={() => setHoveredCategory(null)}
                      >
                        {subcategory}
                      </Link>
                    ))}
                  </div>
                  <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                    <Link
                      href={getServiceUrl(hoveredCategory)}
                      className="inline-block bg-[#14ad9f] text-white px-8 py-3 rounded-lg font-medium hover:bg-[#129488] transition-colors duration-200 shadow-md hover:shadow-lg"
                      onClick={() => setHoveredCategory(null)}
                    >
                      Alle {hoveredCategory} Services anzeigen
                    </Link>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Mobile Navigation - Verbessertes Design */}
      <div className="lg:hidden">
        <div className="container mx-auto px-4 py-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center justify-between w-full text-gray-700 hover:text-[#14ad9f] hover:bg-gray-50 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 border border-gray-200"
          >
            <span className="flex items-center">
              <Grid className="w-4 h-4 mr-2" />
              Alle Kategorien durchsuchen
            </span>
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Mobile Menu Content - Modernes Design */}
          {isMobileMenuOpen && (
            <div className="mt-3 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="py-2 max-h-96 overflow-y-auto">
                {getFilteredCategories().map((category: Category) => (
                  <div key={category.title} className="border-b border-gray-100 last:border-b-0">
                    <Link
                      href={getServiceUrl(category.title)}
                      className="font-medium text-gray-900 hover:text-[#14ad9f] hover:bg-gray-50 block px-4 py-3 transition-all duration-200"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {category.title}
                    </Link>
                    <div className="bg-gray-50 px-4 pb-3">
                      <div className="grid grid-cols-2 gap-1">
                        {category.subcategories.slice(0, 6).map(subcategory => (
                          <Link
                            key={subcategory}
                            href={getServiceUrl(category.title, subcategory)}
                            className="block py-2 px-3 text-xs text-gray-600 hover:text-[#14ad9f] hover:bg-white rounded transition-all duration-200"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            {subcategory}
                          </Link>
                        ))}
                      </div>
                      {category.subcategories.length > 6 && (
                        <Link
                          href={getServiceUrl(category.title)}
                          className="block text-sm text-[#14ad9f] font-medium mt-2 px-3 py-1 hover:underline"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          + {category.subcategories.length - 6} weitere anzeigen
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default AppHeaderNavigation;
