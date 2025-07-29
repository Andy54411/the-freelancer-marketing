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

  // Helper function to get the correct service URL
  const getServiceUrl = (category: string, subcategory?: string) => {
    if (!user?.uid) return '/login';

    const categorySlug = category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '%26');

    if (subcategory) {
      const subcategorySlug = subcategory.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '%26');
      return `/services/${encodeURIComponent(categorySlug)}/${encodeURIComponent(subcategorySlug)}`;
    }
    return `/services/${encodeURIComponent(categorySlug)}`;
  };

  // Organize categories into columns for mega menu
  const megaMenuColumns = Array.isArray(categories)
    ? [
        categories.slice(0, Math.ceil(categories.length / 3)),
        categories.slice(Math.ceil(categories.length / 3), Math.ceil((categories.length * 2) / 3)),
        categories.slice(Math.ceil((categories.length * 2) / 3)),
      ]
    : [[], [], []];

  return (
    <nav className="bg-white border-t border-gray-100 shadow-sm relative">
      {/* Desktop Navigation - Modernes Design mit besserer Visualisierung */}
      <div className="hidden lg:block">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-3">
            {/* Beliebte Kategorien - direkt sichtbar mit modernem Design */}
            <div className="flex items-center gap-1 text-sm">
              <Link
                href={getServiceUrl('Handwerk')}
                className="text-gray-700 hover:text-white hover:bg-[#14ad9f] px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-transparent hover:border-[#14ad9f]"
              >
                🔧 Handwerk
              </Link>
              <Link
                href={getServiceUrl('Haushalt')}
                className="text-gray-700 hover:text-white hover:bg-[#14ad9f] px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-transparent hover:border-[#14ad9f]"
              >
                🏠 Haushalt
              </Link>
              <Link
                href={getServiceUrl('IT & Digital')}
                className="text-gray-700 hover:text-white hover:bg-[#14ad9f] px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-transparent hover:border-[#14ad9f]"
              >
                💻 IT & Digital
              </Link>
              <Link
                href={getServiceUrl('Transport')}
                className="text-gray-700 hover:text-white hover:bg-[#14ad9f] px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-transparent hover:border-[#14ad9f]"
              >
                🚚 Transport
              </Link>
              <Link
                href={getServiceUrl('Garten')}
                className="text-gray-700 hover:text-white hover:bg-[#14ad9f] px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-transparent hover:border-[#14ad9f]"
              >
                🌱 Garten
              </Link>
              <Link
                href={getServiceUrl('Wellness')}
                className="text-gray-700 hover:text-white hover:bg-[#14ad9f] px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-transparent hover:border-[#14ad9f]"
              >
                💆 Wellness
              </Link>

              {/* Alle Services Button mit Mega-Menü - Modernes Design */}
              <div
                className="relative mega-menu-container"
                onMouseEnter={handleMegaMenuEnter}
                onMouseLeave={handleMegaMenuLeave}
              >
                <button className="flex items-center text-white bg-[#14ad9f] hover:bg-[#129488] px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg border border-[#14ad9f]">
                  <Grid className="w-4 h-4 mr-2" />
                  Alle Services
                  <ChevronDown className="ml-2 h-4 w-4" />
                </button>

                {/* Mega Menu Dropdown - Verbessertes Design */}
                {isMegaMenuOpen && (
                  <div
                    className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-screen max-w-5xl bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
                    onMouseEnter={handleMegaMenuEnter}
                    onMouseLeave={handleMegaMenuLeave}
                  >
                    <div className="p-6">
                      <div className="grid grid-cols-3 gap-8">
                        {megaMenuColumns.map((columnCategories, columnIndex) => (
                          <div key={columnIndex} className="space-y-6">
                            {columnCategories.map((category: Category) => (
                              <div key={category.title} className="group">
                                <Link
                                  href={getServiceUrl(category.title)}
                                  className="font-semibold text-gray-900 hover:text-[#14ad9f] transition-colors block mb-2 text-base border-b border-gray-100 pb-1"
                                  onClick={() => setIsMegaMenuOpen(false)}
                                >
                                  {category.title}
                                </Link>
                                <ul className="space-y-1">
                                  {(expandedCategories.has(category.title)
                                    ? category.subcategories
                                    : category.subcategories.slice(0, 5)
                                  ).map((subcategory, index) => (
                                    <li key={subcategory}>
                                      <Link
                                        href={getServiceUrl(category.title, subcategory)}
                                        className={`text-sm text-gray-600 hover:text-[#14ad9f] hover:bg-gray-50 transition-all duration-200 block px-2 py-1 rounded ${
                                          expandedCategories.has(category.title) && index >= 5
                                            ? 'pl-4 border-l-2 border-[#14ad9f] ml-2'
                                            : ''
                                        }`}
                                        onClick={() => setIsMegaMenuOpen(false)}
                                      >
                                        {subcategory}
                                      </Link>
                                    </li>
                                  ))}
                                  {category.subcategories.length > 5 && (
                                    <li className="pt-2">
                                      <button
                                        onClick={e => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          toggleCategoryExpansion(category.title);
                                        }}
                                        className="text-sm text-[#14ad9f] hover:text-[#129488] hover:underline font-medium cursor-pointer focus:outline-none transition-colors px-2 py-1 rounded hover:bg-gray-50"
                                      >
                                        {expandedCategories.has(category.title)
                                          ? '▲ weniger anzeigen'
                                          : `▼ ${category.subcategories.length - 5} weitere`}
                                      </button>
                                    </li>
                                  )}
                                </ul>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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
                {categories.map((category: Category) => (
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
