'use client';

import { useState } from 'react';
import { Search, Zap, Shield, Target, Wrench, Home, Truck, Laptop, Leaf, Sparkles, Utensils, TrendingUp, Briefcase, GraduationCap, Dog, Palette, PartyPopper, FileText } from 'lucide-react';
import { categories } from '@/lib/categoriesData';
import { HeroHeader } from '@/components/hero8-header';
import ProviderCTA from '@/components/provider-cta';
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

  // Category Icons Mapping mit Lucide Icons
  const getCategoryIcon = (title: string) => {
    const iconMap: { [key: string]: React.ElementType } = {
      'Handwerk': Wrench,
      'Haushalt': Home,
      'Transport': Truck,
      'IT & Digital': Laptop,
      'Garten': Leaf,
      'Wellness': Sparkles,
      'Hotel & Gastronomie': Utensils,
      'Marketing & Vertrieb': TrendingUp,
      'Finanzen & Recht': Briefcase,
      'Bildung & Unterstützung': GraduationCap,
      'Tiere & Pflanzen': Dog,
      'Kreativ & Kunst': Palette,
      'Event & Veranstaltung': PartyPopper,
      'Büro & Administration': FileText,
    };
    return iconMap[title] || Briefcase;
  };

  return (
    <>
      <HeroHeader />
      <div className="min-h-screen">
        {/* Hero Section */}
        <div className="bg-linear-to-br from-[#14ad9f] to-teal-600 text-white pt-32 pb-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-6xl font-bold drop-shadow-lg mb-6">
                Professionelle Services buchen
              </h1>
              <p className="text-lg md:text-xl text-white/90 drop-shadow-lg mb-8 max-w-4xl mx-auto">
                Entdecken Sie qualifizierte Dienstleister auf Taskilo - Ihre Plattform für lokale
                Handwerker, digitale Freelancer und Business-Experten. Von einfachen
                Haushalts-Services bis zu komplexen B2B-Projekten.
              </p>

              {/* Value Propositions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <Zap className="w-10 h-10 mx-auto mb-3 text-white" />
                  <h2 className="font-semibold text-white mb-2 text-lg">Sofort verfügbar</h2>
                  <p className="text-white/80 text-sm">
                    Lokale Anbieter in Ihrer Nähe finden und direkt buchen
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <Shield className="w-10 h-10 mx-auto mb-3 text-white" />
                  <h2 className="font-semibold text-white mb-2 text-lg">Geprüft & Sicher</h2>
                  <p className="text-white/80 text-sm">
                    Verifizierte Anbieter mit Bewertungssystem und Stripe-Payment
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <Target className="w-10 h-10 mx-auto mb-3 text-white" />
                  <h2 className="font-semibold text-white mb-2 text-lg">B2C & B2B</h2>
                  <p className="text-white/80 text-sm">
                    Für Privatpersonen und Unternehmen - flexible Abrechnung
                  </p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-2xl mx-auto">
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
          </div>
        </div>

        {/* Categories Section */}
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
              Service-Kategorien
            </h2>
            <p className="text-gray-600 text-center max-w-2xl mx-auto">
              Wählen Sie aus über 14 Kategorien die passende Dienstleistung für Ihre Bedürfnisse
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCategories.map((category, index) => {
                const IconComponent = getCategoryIcon(category.title);
                return (
                  <Link
                    key={index}
                    href={`/services/${normalizeToSlug(category.title)}`}
                    className="group"
                  >
                    <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-[#14ad9f] hover:shadow-xl transition-all duration-300 h-full">
                      {/* Category Icon */}
                      <div className="mb-6 group-hover:scale-110 transition-transform duration-300">
                        <IconComponent className="w-12 h-12 text-[#14ad9f]" />
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
                        <div className="text-[#14ad9f] text-sm font-medium group-hover:text-teal-700 transition-colors duration-300">
                          Anzeigen →
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
          </div>

          {/* No Results */}
          {filteredCategories.length === 0 && (
            <div className="text-center py-16">
              <div className="bg-white rounded-2xl p-12 max-w-md mx-auto border border-gray-200 shadow-sm">
                <Search className="w-16 h-16 mx-auto mb-6 text-gray-400" />
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Keine Services gefunden</h3>
                <p className="text-gray-600 mb-6">
                  Versuchen Sie einen anderen Suchbegriff oder durchstöbern Sie alle Kategorien.
                </p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="bg-[#14ad9f] text-white px-6 py-3 rounded-xl font-medium hover:bg-teal-700 transition-colors duration-300"
                >
                  Alle Kategorien anzeigen
                </button>
              </div>
            </div>
          )}

          {/* Popular Services Section */}
          {filteredCategories.length > 0 && (
            <div className="mt-16 mb-16">
              <div className="bg-gray-50 rounded-2xl p-8 md:p-12">
                <div className="text-center mb-10">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                    Beliebteste Services
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Diese Services werden am häufigsten gebucht
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { name: 'Klempner', icon: Wrench, category: 'Handwerk' },
                    { name: 'Webentwicklung', icon: Laptop, category: 'IT & Digital' },
                    { name: 'Reinigungskraft', icon: Home, category: 'Haushalt' },
                    { name: 'Mietkoch', icon: Utensils, category: 'Hotel & Gastronomie' },
                    { name: 'Fotograf', icon: Palette, category: 'Kreativ & Kunst' },
                    { name: 'Buchhaltung', icon: Briefcase, category: 'Finanzen & Recht' },
                  ].map((service, index) => {
                    const ServiceIcon = service.icon;
                    return (
                      <Link
                        key={index}
                        href={`/services/${normalizeToSlug(service.category)}/${normalizeToSlug(service.name)}`}
                        className="group text-center p-4 bg-white rounded-xl hover:shadow-md transition-all duration-300 border border-gray-100"
                      >
                        <ServiceIcon className="w-8 h-8 mx-auto mb-2 text-[#14ad9f] group-hover:scale-110 transition-transform duration-300" />
                        <div className="text-sm font-medium text-gray-900 group-hover:text-[#14ad9f] transition-colors duration-300">
                          {service.name}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CTA Section */}
        <ProviderCTA />
      </div>
    </>
  );
}
