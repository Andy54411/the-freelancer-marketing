'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { categories } from '@/lib/categoriesData';
import Header from '@/components/Header';
import Link from 'next/link';

export default function ServicesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter Kategorien basierend auf Suchbegriff
  const filteredCategories = categories.filter(
    category =>
      category.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.subcategories.some(sub => sub.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Normalisierungsfunktion für URLs
  const normalizeToSlug = (str: string) =>
    str.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '%26');

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600">
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 py-20">
          <div className="max-w-6xl mx-auto px-6">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold text-white drop-shadow-lg mb-6">
                Alle Services auf einen Blick
              </h1>
              <p className="text-xl text-white/90 drop-shadow-lg mb-8 max-w-3xl mx-auto">
                Entdecken Sie unser komplettes Angebot an professionellen Dienstleistungen. Von
                Webentwicklung bis Grafikdesign - finden Sie den perfekten Service für Ihr Projekt.
              </p>

              {/* Search Bar */}
              <div className="relative max-w-lg mx-auto mb-8">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Service oder Kategorie suchen..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border-0 shadow-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-white/20 focus:outline-none"
                />
              </div>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCategories.map((category, index) => (
                <Link
                  key={index}
                  href={`/services/${normalizeToSlug(category.title)}`}
                  className="group"
                >
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
                    {/* Category Icon */}
                    <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">
                      📋
                    </div>

                    {/* Category Title */}
                    <h3 className="text-2xl font-bold text-white drop-shadow-lg mb-3 group-hover:text-yellow-300 transition-colors duration-300">
                      {category.title}
                    </h3>

                    {/* Category Description */}
                    <p className="text-white/80 drop-shadow-lg mb-4 line-clamp-3">
                      Entdecken Sie professionelle Dienstleistungen in der Kategorie{' '}
                      {category.title}
                    </p>

                    {/* Subcategories Preview */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {category.subcategories.slice(0, 3).map((sub, subIndex) => (
                        <span
                          key={subIndex}
                          className="text-xs bg-white/20 text-white px-2 py-1 rounded-full"
                        >
                          {sub}
                        </span>
                      ))}
                      {category.subcategories.length > 3 && (
                        <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full">
                          +{category.subcategories.length - 3} weitere
                        </span>
                      )}
                    </div>

                    {/* Services Count */}
                    <div className="text-sm text-white/70 drop-shadow-lg">
                      {category.subcategories.length} Unterkategorien verfügbar
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* No Results */}
            {filteredCategories.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-bold text-white drop-shadow-lg mb-2">
                  Keine Services gefunden
                </h3>
                <p className="text-white/80 drop-shadow-lg">
                  Versuchen Sie einen anderen Suchbegriff oder durchstöbern Sie alle Kategorien.
                </p>
              </div>
            )}

            {/* CTA Section */}
            <div className="mt-16 text-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
                <h2 className="text-3xl font-bold text-white drop-shadow-lg mb-4">
                  Ihren Service nicht gefunden?
                </h2>
                <p className="text-white/90 drop-shadow-lg mb-6 max-w-2xl mx-auto">
                  Kontaktieren Sie uns! Wir helfen Ihnen gerne dabei, den perfekten Dienstleister
                  für Ihr individuelles Projekt zu finden.
                </p>
                <Link
                  href="/contact"
                  className="inline-block bg-white text-teal-600 px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors duration-300 shadow-lg"
                >
                  Jetzt Kontakt aufnehmen
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
