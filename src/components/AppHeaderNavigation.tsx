// /Users/andystaudinger/Taskilo/src/components/AppHeaderNavigation.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Menu, X } from 'lucide-react';
import { categories, Category } from '@/lib/categoriesData';
import { useAuth } from '@/contexts/AuthContext';

const AppHeaderNavigation: React.FC = () => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  const handleMouseEnter = (categoryTitle: string) => {
    setOpenDropdown(categoryTitle);
  };

  const handleMouseLeave = () => {
    setOpenDropdown(null);
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

  // Group categories for better organization
  const primaryCategories = categories.slice(0, 8); // Erste 8 Kategorien
  const remainingCategories = categories.slice(8); // Restliche Kategorien

  return (
    <nav className="bg-white border-t border-gray-200">
      {/* Desktop Navigation */}
      <div className="hidden lg:block">
        <div className="container mx-auto px-4 py-2">
          <ul className="flex flex-wrap items-center justify-center gap-1">
            {/* Hauptkategorien */}
            {primaryCategories.map((category: Category) => (
              <li
                key={category.title}
                className="relative group"
                onMouseEnter={() => handleMouseEnter(category.title)}
                onMouseLeave={handleMouseLeave}
              >
                <Link
                  href={getServiceUrl(category.title)}
                  className="flex items-center text-gray-700 hover:text-[#14ad9f] px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {category.title}
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Link>

                {/* Dropdown für Unterkategorien */}
                {openDropdown === category.title && category.subcategories.length > 0 && (
                  <div className="absolute left-0 mt-1 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-30">
                    <div className="py-2 max-h-96 overflow-y-auto">
                      {category.subcategories.map(subcategory => (
                        <Link
                          key={subcategory}
                          href={getServiceUrl(category.title, subcategory)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-[#14ad9f] transition-colors"
                        >
                          {subcategory}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}

            {/* "Mehr" Dropdown für restliche Kategorien */}
            {remainingCategories.length > 0 && (
              <li
                className="relative group"
                onMouseEnter={() => handleMouseEnter('mehr')}
                onMouseLeave={handleMouseLeave}
              >
                <button className="flex items-center text-gray-700 hover:text-[#14ad9f] px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Mehr
                  <ChevronDown className="ml-1 h-3 w-3" />
                </button>

                {openDropdown === 'mehr' && (
                  <div className="absolute left-0 mt-1 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-30">
                    <div className="py-2 max-h-96 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-1">
                        {remainingCategories.map((category: Category) => (
                          <div key={category.title} className="p-2">
                            <Link
                              href={getServiceUrl(category.title)}
                              className="block text-sm font-medium text-gray-900 hover:text-[#14ad9f] mb-1"
                            >
                              {category.title}
                            </Link>
                            <div className="space-y-1">
                              {category.subcategories.slice(0, 3).map(subcategory => (
                                <Link
                                  key={subcategory}
                                  href={getServiceUrl(category.title, subcategory)}
                                  className="block text-xs text-gray-600 hover:text-[#14ad9f] pl-2"
                                >
                                  {subcategory}
                                </Link>
                              ))}
                              {category.subcategories.length > 3 && (
                                <Link
                                  href={getServiceUrl(category.title)}
                                  className="block text-xs text-[#14ad9f] pl-2 font-medium"
                                >
                                  +{category.subcategories.length - 3} weitere
                                </Link>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            )}
          </ul>
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
