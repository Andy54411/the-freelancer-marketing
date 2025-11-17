'use client';

import type { Metadata } from 'next';
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

  // Category Icons Mapping für bessere visuelle Darstellung
  const getCategoryIcon = (title: string) => {
    const iconMap: { [key: string]: string } = {
      Handwerk: '🔧',
      Haushalt: '🏠',
      Transport: '🚚',
      'IT & Digital': '💻',
      Garten: '🌱',
      Wellness: '💆',
      'Hotel & Gastronomie': '🍽️',
      'Marketing & Vertrieb': '📈',
      'Finanzen & Recht': '💼',
      'Bildung & Unterstützung': '🎓',
      'Tiere & Pflanzen': '🐕',
      'Kreativ & Kunst': '🎨',
      'Event & Veranstaltung': '🎉',
      'Büro & Administration': '📋',
    };
    return iconMap[title] || '💼';
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-[#129488] to-[#0f8a7e]">
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative z-10 py-20">
          <div className="max-w-7xl mx-auto px-6">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-6xl font-bold text-white drop-shadow-lg mb-6">
                Professionelle Services buchen
              </h1>
              <p className="text-xl text-white/90 drop-shadow-lg mb-8 max-w-4xl mx-auto">
                Entdecken Sie qualifizierte Dienstleister auf Taskilo - Ihre Plattform für lokale
                Handwerker, digitale Freelancer und Business-Experten. Von einfachen
                Haushalts-Services bis zu komplexen B2B-Projekten.
              </p>

              {/* Value Propositions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="text-3xl mb-3">⚡</div>
                  <h2 className="font-semibold text-white mb-2 text-lg">Sofort verfügbar</h2>
                  <p className="text-white/80 text-sm">
                    Lokale Anbieter in Ihrer Nähe finden und direkt buchen
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="text-3xl mb-3">🛡️</div>
                  <h2 className="font-semibold text-white mb-2 text-lg">Geprüft & Sicher</h2>
                  <p className="text-white/80 text-sm">
                    Verifizierte Anbieter mit Bewertungssystem und Stripe-Payment
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="text-3xl mb-3">🎯</div>
                  <h2 className="font-semibold text-white mb-2 text-lg">B2C & B2B</h2>
                  <p className="text-white/80 text-sm">
                    Für Privatpersonen und Unternehmen - flexible Abrechnung
                  </p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-2xl mx-auto mb-8">
                <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-400 h-6 w-6" />
                <input
                  type="text"
                  placeholder="Service, Anbieter oder Kategorie suchen..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-16 pr-6 py-5 rounded-2xl border-0 shadow-xl text-gray-900 placeholder-gray-500 focus:ring-4 focus:ring-[#14ad9f]/30 focus:outline-none text-lg"
                />
              </div>
            </div>

            {/* Categories Grid */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white text-center drop-shadow-lg mb-12">
                Service-Kategorien
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCategories.map((category, index) => (
                <Link
                  key={index}
                  href={`/services/${normalizeToSlug(category.title)}`}
                  className="group"
                >
                  <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-[#14ad9f] hover:shadow-2xl transition-all duration-300 transform hover:scale-105 h-full">
                    {/* Category Icon */}
                    <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">
                      {getCategoryIcon(category.title)}
                    </div>

                    {/* Category Title */}
                    <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-[#14ad9f] transition-colors duration-300">
                      {category.title}
                    </h3>

                    {/* Category Description */}
                    <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                      {category.title === 'Handwerk' &&
                        'Erfahrene Handwerker für Reparaturen, Renovierungen und Installationen in Ihrer Nähe.'}
                      {category.title === 'IT & Digital' &&
                        'Professionelle Webentwicklung, App-Entwicklung und IT-Support für Ihr digitales Business.'}
                      {category.title === 'Marketing & Vertrieb' &&
                        'Marketing-Experten für Online-Marketing, Social Media und Vertriebsstrategien.'}
                      {category.title === 'Finanzen & Recht' &&
                        'Steuerberater, Rechtsanwälte und Finanzexperten für Ihr Business.'}
                      {![
                        'Handwerk',
                        'IT & Digital',
                        'Marketing & Vertrieb',
                        'Finanzen & Recht',
                      ].includes(category.title) &&
                        `Qualifizierte Dienstleister für ${category.title} - professionell und zuverlässig.`}
                    </p>

                    {/* Subcategories Preview */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {category.subcategories.slice(0, 3).map((sub, subIndex) => (
                        <span
                          key={subIndex}
                          className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full group-hover:bg-[#14ad9f]/10 group-hover:text-[#14ad9f] transition-colors duration-300"
                        >
                          {sub}
                        </span>
                      ))}
                      {category.subcategories.length > 3 && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full group-hover:bg-[#14ad9f]/10 group-hover:text-[#14ad9f] transition-colors duration-300">
                          +{category.subcategories.length - 3} weitere
                        </span>
                      )}
                    </div>

                    {/* Services Count & CTA */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        {category.subcategories.length} Services
                      </div>
                      <div className="text-[#14ad9f] text-sm font-medium group-hover:text-taskilo-hover transition-colors duration-300">
                        Anzeigen →
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* No Results */}
            {filteredCategories.length === 0 && (
              <div className="text-center py-16">
                <div className="bg-white rounded-2xl p-12 max-w-md mx-auto border border-gray-100">
                  <div className="text-6xl mb-6">🔍</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Keine Services gefunden</h3>
                  <p className="text-gray-600 mb-6">
                    Versuchen Sie einen anderen Suchbegriff oder durchstöbern Sie alle Kategorien.
                  </p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="bg-[#14ad9f] text-white px-6 py-3 rounded-xl font-medium hover:bg-taskilo-hover transition-colors duration-300"
                  >
                    Alle Kategorien anzeigen
                  </button>
                </div>
              </div>
            )}

            {/* Popular Services Section */}
            {filteredCategories.length > 0 && (
              <div className="mt-20">
                <div className="bg-white rounded-3xl p-12 border border-gray-100">
                  <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">
                      Beliebteste Services auf Taskilo
                    </h2>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                      Diese Services werden am häufigsten gebucht - von Privatkunden und Unternehmen
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {[
                      { name: 'Klempner', icon: '🔧', category: 'Handwerk' },
                      { name: 'Webentwicklung', icon: '💻', category: 'IT & Digital' },
                      { name: 'Reinigungskraft', icon: '🏠', category: 'Haushalt' },
                      { name: 'Mietkoch', icon: '🍽️', category: 'Hotel & Gastronomie' },
                      { name: 'Fotograf', icon: '📸', category: 'Kreativ & Kunst' },
                      { name: 'Buchhaltung', icon: '💼', category: 'Finanzen & Recht' },
                    ].map((service, index) => (
                      <Link
                        key={index}
                        href={`/services/${normalizeToSlug(service.category)}/${normalizeToSlug(service.name)}`}
                        className="group text-center p-4 rounded-xl hover:bg-gray-50 transition-colors duration-300"
                      >
                        <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">
                          {service.icon}
                        </div>
                        <div className="text-sm font-medium text-gray-900 group-hover:text-[#14ad9f] transition-colors duration-300">
                          {service.name}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CTA Section */}
            <div className="mt-20">
              <div className="bg-linear-to-r from-[#14ad9f] to-[#129488] rounded-3xl p-12 text-center">
                <h2 className="text-4xl font-bold text-white mb-4">Als Anbieter registrieren</h2>
                <p className="text-white/90 mb-8 max-w-2xl mx-auto text-lg">
                  Werden Sie Teil der Taskilo Community! Bieten Sie Ihre Services an und erreichen
                  Sie neue Kunden - sowohl Privatpersonen als auch Unternehmen.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/register/company"
                    className="bg-white text-[#14ad9f] px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-colors duration-300 shadow-lg"
                  >
                    Als Anbieter registrieren
                  </Link>
                  <Link
                    href="/contact"
                    className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-[#14ad9f] transition-colors duration-300"
                  >
                    Beratung anfragen
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
