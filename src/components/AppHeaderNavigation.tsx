// /Users/andystaudinger/Taskilo/src/components/AppHeaderNavigation.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Menu, X, Grid } from 'lucide-react';
import { categories, Category } from '@/lib/categoriesData';
import { useAuth } from '@/contexts/AuthContext';

const AppHeaderNavigation: React.FC = () => {
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  const handleMegaMenuEnter = () => {
    setIsMegaMenuOpen(true);
  };

  const handleMegaMenuLeave = () => {
    setIsMegaMenuOpen(false);
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
  const megaMenuColumns = [
    categories.slice(0, Math.ceil(categories.length / 3)),
    categories.slice(Math.ceil(categories.length / 3), Math.ceil((categories.length * 2) / 3)),
    categories.slice(Math.ceil((categories.length * 2) / 3)),
  ];

  return (
    <nav className="bg-gray-50 border-t border-gray-200 relative">
      {/* Desktop Navigation - Ultra kompakt mit Mega-Menü */}
      <div className="hidden lg:block">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-1">
            {/* Beliebte Kategorien - direkt sichtbar */}
            <div className="flex items-center gap-1 text-xs">
              <Link
                href={getServiceUrl('Handwerk')}
                className="text-gray-700 hover:text-[#14ad9f] px-2 py-1 rounded transition-colors"
              >
                Handwerk
              </Link>
              <Link
                href={getServiceUrl('Haushalt & Reinigung')}
                className="text-gray-700 hover:text-[#14ad9f] px-2 py-1 rounded transition-colors"
              >
                Haushalt
              </Link>
              <Link
                href={getServiceUrl('IT & Digital')}
                className="text-gray-700 hover:text-[#14ad9f] px-2 py-1 rounded transition-colors"
              >
                IT & Digital
              </Link>
              <Link
                href={getServiceUrl('Transport & Umzug')}
                className="text-gray-700 hover:text-[#14ad9f] px-2 py-1 rounded transition-colors"
              >
                Transport
              </Link>

              {/* Alle Services Button mit Mega-Menü */}
              <div
                className="relative"
                onMouseEnter={handleMegaMenuEnter}
                onMouseLeave={handleMegaMenuLeave}
              >
                <button className="flex items-center text-gray-700 hover:text-[#14ad9f] px-2 py-1 rounded transition-colors font-medium text-xs">
                  <Grid className="w-3 h-3 mr-1" />
                  Alle Services
                  <ChevronDown className="ml-1 h-3 w-3" />
                </button>

                {/* Mega Menu Dropdown */}
                {isMegaMenuOpen && (
                  <div className="absolute left-1/2 transform -translate-x-1/2 mt-1 w-screen max-w-4xl bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="p-4">
                      <div className="grid grid-cols-3 gap-6">
                        {megaMenuColumns.map((columnCategories, columnIndex) => (
                          <div key={columnIndex} className="space-y-3">
                            {columnCategories.map((category: Category) => (
                              <div key={category.title} className="group">
                                <Link
                                  href={getServiceUrl(category.title)}
                                  className="font-semibold text-gray-900 hover:text-[#14ad9f] transition-colors block mb-1 text-sm"
                                >
                                  {category.title}
                                </Link>
                                <ul className="space-y-0.5">
                                  {category.subcategories.slice(0, 4).map(subcategory => (
                                    <li key={subcategory}>
                                      <Link
                                        href={getServiceUrl(category.title, subcategory)}
                                        className="text-xs text-gray-600 hover:text-[#14ad9f] transition-colors block"
                                      >
                                        {subcategory}
                                      </Link>
                                    </li>
                                  ))}
                                  {category.subcategories.length > 4 && (
                                    <li>
                                      <Link
                                        href={getServiceUrl(category.title)}
                                        className="text-xs text-[#14ad9f] hover:underline font-medium"
                                      >
                                        + {category.subcategories.length - 4} weitere
                                      </Link>
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

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <div className="container mx-auto px-4 py-2">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center justify-between w-full text-gray-700 hover:text-[#14ad9f] px-3 py-2 rounded-md text-sm font-medium"
          >
            <span>Alle Kategorien</span>
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          {/* Mobile Menu Content */}
          {isMobileMenuOpen && (
            <div className="mt-2 bg-white rounded-md shadow-lg border border-gray-200">
              <div className="py-2 max-h-96 overflow-y-auto">
                {categories.map((category: Category) => (
                  <div
                    key={category.title}
                    className="px-4 py-2 border-b border-gray-100 last:border-b-0"
                  >
                    <Link
                      href={getServiceUrl(category.title)}
                      className="font-medium text-gray-900 hover:text-[#14ad9f] block mb-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {category.title}
                    </Link>
                    <div className="pl-4 space-y-1">
                      {category.subcategories.slice(0, 4).map(subcategory => (
                        <Link
                          key={subcategory}
                          href={getServiceUrl(category.title, subcategory)}
                          className="block text-sm text-gray-600 hover:text-[#14ad9f]"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {subcategory}
                        </Link>
                      ))}
                      {category.subcategories.length > 4 && (
                        <Link
                          href={getServiceUrl(category.title)}
                          className="block text-sm text-[#14ad9f] font-medium"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          + {category.subcategories.length - 4} weitere anzeigen
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

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <div className="container mx-auto px-4 py-2">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center justify-between w-full text-gray-700 hover:text-[#14ad9f] px-3 py-2 rounded-md text-sm font-medium"
          >
            <span>Alle Kategorien</span>
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          {/* Mobile Dropdown */}
          {isMobileMenuOpen && (
            <div className="mt-2 bg-white border border-gray-200 rounded-md shadow-lg max-h-96 overflow-y-auto">
              {categories.map((category: Category) => (
                <div key={category.title} className="border-b border-gray-100 last:border-b-0">
                  <Link
                    href={getServiceUrl(category.title)}
                    className="block px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {category.title}
                  </Link>
                  <div className="bg-gray-50 px-4 pb-2">
                    {category.subcategories.map(subcategory => (
                      <Link
                        key={subcategory}
                        href={getServiceUrl(category.title, subcategory)}
                        className="block py-1 px-2 text-xs text-gray-600 hover:text-[#14ad9f]"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {subcategory}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default AppHeaderNavigation;
