'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  ArrowRight,
  CheckCircle2,
  Shield,
  Zap,
  BadgeCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { categories } from '@/lib/categoriesData';
import { HeroHeader } from '@/components/hero8-header';
import ProviderCTA from '@/components/provider-cta';
import Link from 'next/link';
import Image from 'next/image';


const illustrations: { [key: string]: string } = {
  'Handwerk': '/categorie/handwerk.png',
  'Haushalt': '/categorie/haushalt.png',
  'Transport': '/categorie/transport.png',
  'IT & Digital': '/categorie/it-digital.png',
  'Garten': '/categorie/garten.png',
  'Wellness': '/categorie/wellness.png',
  'Hotel & Gastronomie': '/categorie/hotel-gastronomie.png',
  'Marketing & Vertrieb': '/categorie/marketing-vertrieb.png',
  'Finanzen & Recht': '/categorie/finanzen-recht.png',
  'Bildung & Unterstützung': '/categorie/bildung-unterstuetzung.png',
  'Tiere & Pflanzen': '/categorie/tiere-pflanzen.png',
  'Kreativ & Kunst': '/categorie/kreativ-kunst.png',
  'Event & Veranstaltung': '/categorie/event-veranstaltung.png',
  'Büro & Administration': '/categorie/buero-administration.png',
};

export const categoryIllustrations: { [key: string]: string } = illustrations;

// Hintergrundfarben für die neuen 3D-Karten (als Hex-Werte für zuverlässige Darstellung)
const categoryBgColors: { [key: string]: string } = {
  'Handwerk': '#dbeafe',        // blue-100
  'Haushalt': '#ffe4e6',        // rose-100
  'Transport': '#fef3c7',       // amber-100
  'IT & Digital': '#d1fae5',    // emerald-100
  'Garten': '#dcfce7',          // green-100
  'Wellness': '#fce7f3',        // pink-100
  'Hotel & Gastronomie': '#ffedd5', // orange-100
  'Marketing & Vertrieb': '#e0e7ff', // indigo-100
  'Finanzen & Recht': '#f3e8ff',    // purple-100
  'Bildung & Unterstützung': '#ede9fe', // violet-100
  'Tiere & Pflanzen': '#ecfccb',    // lime-100
  'Kreativ & Kunst': '#fae8ff',     // fuchsia-100
  'Event & Veranstaltung': '#fee2e2', // red-100
  'Büro & Administration': '#cffafe', // cyan-100
};

// Funktion um Hintergrundfarbe zu holen
const getCategoryBgColor = (title: string): string => {
  return categoryBgColors[title] || '#ccfbf1'; // teal-100 als Fallback
};

export default function ServicesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoSectionRef = useRef<HTMLDivElement>(null);

  // Video Intersection Observer - startet Video wenn Sektion sichtbar wird
  useEffect(() => {
    const videoElement = videoRef.current;
    const sectionElement = videoSectionRef.current;
    
    if (!videoElement || !sectionElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoElement.play();
          } else {
            videoElement.pause();
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(sectionElement);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Suchlogik bleibt unverändert
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
setShowDropdown(value.length > 0);
  };

  const filteredCategories = categories.filter(
    category =>
      category.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.subcategories.some(sub => sub.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const matchingSubcategories = searchTerm.length > 0 
    ? categories.flatMap(cat => 
        cat.subcategories
          .filter(sub => sub.toLowerCase().includes(searchTerm.toLowerCase()))
          .map(sub => ({ category: cat.title, subcategory: sub }))
      ).slice(0, 6)
    : [];

  const normalizeToSlug = (str: string) =>
    str.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'und');

  const popularCategories = ['Handwerk', 'IT & Digital', 'Haushalt', 'Marketing & Vertrieb'];

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 300; // Angepasst für die neuen Karten
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <>
      <HeroHeader />
      <div className="min-h-screen bg-white">
        
        {/* Hero Section - Unverändert */}
        <section className="bg-gradient-to-br from-teal-50 via-white to-teal-50 pt-32 pb-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                  Finden Sie <span className="text-[#14ad9f]">professionelle</span> Dienstleister
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                  Über 1.000 verifizierte Experten für Ihr Projekt. Von Handwerk bis IT - alles aus einer Hand.
                </p>

                {/* Search Bar */}
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Was suchen Sie? z.B. Elektriker, Webdesigner..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={() => searchTerm.length > 0 && setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none text-base shadow-sm"
                  />
                  
                  {/* Dropdown */}
                  {showDropdown && matchingSubcategories.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
                      {matchingSubcategories.map((item, idx) => (
                        <Link
                          key={idx}
                          href={`/services/${normalizeToSlug(item.category)}/${normalizeToSlug(item.subcategory)}`}
                          className="flex items-center justify-between px-4 py-3 hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <Search className="w-4 h-4 text-[#14ad9f]" />
                            <div className="text-left">
                              <span className="font-medium text-gray-900">{item.subcategory}</span>
                              <span className="text-gray-500 text-sm ml-2">in {item.category}</span>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Tags */}
                <div className="flex flex-wrap gap-2 mb-8">
                  <span className="text-gray-500 text-sm">Beliebt:</span>
                  {popularCategories.map((cat) => (
                    <Link
                      key={cat}
                      href={`/services/${normalizeToSlug(cat)}`}
                      className="text-sm text-gray-700 bg-white border border-gray-200 hover:border-[#14ad9f] hover:text-[#14ad9f] px-3 py-1 rounded-full transition-colors shadow-sm"
                    >
                      {cat}
                    </Link>
                  ))}
                </div>

                {/* Feature List - Unverändert */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#14ad9f]/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-[#14ad9f]" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Verifizierte Experten</p>
                      <p className="text-sm text-gray-500">Geprüfte Qualifikationen</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#14ad9f]/10 flex items-center justify-center shrink-0">
                      <Shield className="w-4 h-4 text-[#14ad9f]" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Sichere Zahlung</p>
                      <p className="text-sm text-gray-500">Escrow-Schutz inklusive</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#14ad9f]/10 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 text-[#14ad9f]" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Schnelle Antwort</p>
                      <p className="text-sm text-gray-500">In unter 24 Stunden</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#14ad9f]/10 flex items-center justify-center shrink-0">
                      <BadgeCheck className="w-4 h-4 text-[#14ad9f]" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Zufriedenheitsgarantie</p>
                      <p className="text-sm text-gray-500">100% Geld-zurück</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Hero Illustration - Unverändert */}
              <div className="hidden lg:flex justify-center items-center">
                <div className="relative">
                  <div className="w-[400px] h-[400px] relative">
                    <Image
                      src="https://illustrations.popsy.co/amber/remote-work.svg"
                      alt="Taskilo Services"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <div className="absolute -bottom-4 -left-8 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#14ad9f] rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">1.200+</p>
                        <p className="text-xs text-gray-500">Experten verfügbar</p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -top-4 -right-8 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                        <span className="text-amber-600 font-bold">4.9</span>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">Top Bewertung</p>
                        <p className="text-xs text-gray-500">Kundenzufriedenheit</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Kategorien Section mit 3D-Illustrationen */}
        <section ref={categoriesRef} className="py-12 bg-white scroll-mt-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">
                  {searchTerm ? `Ergebnisse für "${searchTerm}"` : 'Entdecken Sie unsere Kategorien'}
                </h2>
                <p className="text-gray-500 mt-1">
                  Finden Sie den passenden Experten für jedes Projekt.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => scrollCarousel('left')}
                  className="w-10 h-10 rounded-full border border-gray-200 bg-white hover:border-gray-300 flex items-center justify-center transition-colors shadow-sm"
                  aria-label="Nach links scrollen"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => scrollCarousel('right')}
                  className="w-10 h-10 rounded-full border border-gray-200 bg-white hover:border-gray-300 flex items-center justify-center transition-colors shadow-sm"
                  aria-label="Nach rechts scrollen"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Carousel für Kategorien */}
            <div 
              ref={carouselRef}
              className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-4 -mx-6 px-6"
            >
              {categories.map((category, index) => (
                <Link
                  key={index}
                  href={`/services/${normalizeToSlug(category.title)}`}
                  className="group flex-shrink-0"
                >
                  <div 
                    className="w-48 h-60 rounded-2xl border border-gray-200/50 overflow-hidden transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-2 relative flex flex-col justify-between p-4"
                    style={{ backgroundColor: getCategoryBgColor(category.title) }}
                  >
                    <h3 className="font-semibold text-gray-800 text-sm leading-tight z-10 h-8">
                      {category.title}
                    </h3>
                    <div className="relative w-full h-36 bg-white rounded-xl overflow-hidden shadow-sm">
                      <Image
                        src={categoryIllustrations[category.title] || '/categorie/handwerk.png'}
                        alt={category.title}
                        fill
                        className="object-contain p-2 group-hover:scale-110 transition-transform duration-300 ease-in-out"
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Suchergebnisse als Grid */}
            {searchTerm && (
              <div className="mt-12">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Gefundene Kategorien
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                  {filteredCategories.map((category, index) => (
                    <Link
                      key={index}
                      href={`/services/${normalizeToSlug(category.title)}`}
                      className="group"
                    >
                      <div 
                        className="rounded-2xl border border-gray-200/50 overflow-hidden transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-2 relative flex flex-col justify-between p-4 h-60"
                        style={{ backgroundColor: getCategoryBgColor(category.title) }}
                      >
                        <h3 className="font-semibold text-gray-800 text-sm leading-tight z-10 h-8">
                          {category.title}
                        </h3>
                        <div className="relative w-full h-36 bg-white rounded-xl overflow-hidden shadow-sm">
                          <Image
                            src={categoryIllustrations[category.title] || '/categorie/handwerk.png'}
                            alt={category.title}
                            fill
                            className="object-contain p-2 group-hover:scale-110 transition-transform duration-300 ease-in-out"
                          />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {/* Kein Ergebnis Fall */}
            {filteredCategories.length === 0 && searchTerm && (
              <div className="text-center py-16">
                <div className="bg-gray-50 rounded-2xl p-8 max-w-md mx-auto">
                  <div className="relative w-40 h-40 mx-auto mb-4">
                    <Image 
                      src="https://illustrations.popsy.co/amber/page-not-found.svg"
                      alt="Keine Ergebnisse"
                      fill
                      unoptimized
                    />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Keine Ergebnisse</h3>
                  <p className="text-gray-500 mb-6">
                    Für &quot;{searchTerm}&quot; konnten wir leider nichts finden. Versuchen Sie es mit einem anderen Begriff.
                  </p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="bg-[#14ad9f] text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
                  >
                    Alle Kategorien anzeigen
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Taskilo Business Section - Fiverr Pro Style */}
        <section className="py-20" style={{ backgroundColor: '#f5f5f5' }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Left Content */}
              <div className="py-8">
                {/* Logo */}
                <div className="flex items-center gap-1 mb-6">
                  <span className="text-gray-900 text-xl font-bold">taskilo</span>
                  <span className="text-xl font-bold" style={{ color: '#14ad9f' }}>business</span>
                </div>
                
                {/* Headline */}
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2 leading-tight">
                  Die <em className="not-italic" style={{ color: '#14ad9f' }}>Premium</em>-Lösung
                </h2>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-12 leading-tight">
                  für Unternehmen
                </h2>
                
                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-10">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-5 h-5" style={{ color: '#14ad9f' }} />
                      <h6 className="font-semibold text-gray-900">Rechnungen & Angebote</h6>
                    </div>
                    <p className="text-gray-600 text-sm pl-7">GoBD-konforme Dokumente erstellen und verwalten</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-5 h-5" style={{ color: '#14ad9f' }} />
                      <h6 className="font-semibold text-gray-900">Geschäftspartner CRM</h6>
                    </div>
                    <p className="text-gray-600 text-sm pl-7">Kunden und Lieferanten zentral verwalten</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-5 h-5" style={{ color: '#14ad9f' }} />
                      <h6 className="font-semibold text-gray-900">Banking & Zahlungen</h6>
                    </div>
                    <p className="text-gray-600 text-sm pl-7">Revolut-Integration und Online-Zahlungen</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-5 h-5" style={{ color: '#14ad9f' }} />
                      <h6 className="font-semibold text-gray-900">7 Tage kostenlos testen</h6>
                    </div>
                    <p className="text-gray-600 text-sm pl-7">Alle Features unverbindlich ausprobieren</p>
                  </div>
                </div>
                
                {/* CTA Button */}
                <Link
                  href="/register/company"
                  className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-lg hover:opacity-90"
                  style={{ backgroundColor: '#14ad9f' }}
                >
                  Jetzt starten
                </Link>
              </div>

              {/* Right Side - Image with Floating Stats like Fiverr */}
              <div className="hidden lg:block relative">
                <div className="relative ml-16">
                  {/* Main Image Container */}
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                    <div className="relative h-[450px] w-[380px]">
                      <Image
                        src="/images/office.jpeg"
                        alt="Taskilo Business - Team arbeitet zusammen"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                  
                  {/* Floating Line Chart Card - Half outside, half inside image */}
                  <div 
                    className="absolute bg-white rounded-2xl p-5 shadow-xl z-10 animate-float" 
                    style={{ left: '-90px', bottom: '10px' }}
                  >
                    <div className="flex flex-col w-[180px]">
                      {/* Value Bubble with dotted line */}
                      <div className="relative mb-1">
                        <div className="absolute left-[52px] top-6 w-px h-10 border-l border-dashed border-gray-300"></div>
                        <div className="inline-block bg-white border border-gray-200 rounded-lg px-3 py-1 shadow-sm ml-6">
                          <p className="font-bold text-gray-900 text-sm">4.250 EUR</p>
                        </div>
                      </div>
                      {/* Line Chart SVG */}
                      <div className="h-14 w-full mt-2">
                        <svg viewBox="0 0 180 50" className="w-full h-full">
                          {/* Line path with draw animation */}
                          <path 
                            d="M 10 40 Q 30 38, 50 35 T 90 25 T 130 20 T 160 8" 
                            fill="none" 
                            stroke="#1f2937" 
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeDasharray="200"
                            strokeDashoffset="0"
                          >
                            <animate 
                              attributeName="stroke-dashoffset" 
                              from="200" 
                              to="0" 
                              dur="2s" 
                              fill="freeze"
                              repeatCount="1"
                            />
                          </path>
                          {/* Dot at end with pulse */}
                          <circle cx="160" cy="8" r="4" fill="#14ad9f">
                            <animate 
                              attributeName="r" 
                              values="4;6;4" 
                              dur="2s" 
                              repeatCount="indefinite"
                              begin="2s"
                            />
                            <animate 
                              attributeName="opacity" 
                              values="1;0.7;1" 
                              dur="2s" 
                              repeatCount="indefinite"
                              begin="2s"
                            />
                          </circle>
                        </svg>
                      </div>
                      {/* Months */}
                      <div className="flex justify-between mt-1 text-xs text-gray-400">
                        <span>Jan</span>
                        <span>Feb</span>
                        <span>Mär</span>
                        <span>Apr</span>
                        <span>Mai</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Floating Project Status Card - Top Right */}
                  <div className="absolute -top-4 right-0 bg-white rounded-2xl p-4 shadow-xl z-10 animate-float-delayed">
                    <div className="flex items-center gap-3">
                      {/* Progress Ring */}
                      <div className="relative w-12 h-12">
                        <svg className="w-12 h-12 transform -rotate-90">
                          <circle cx="24" cy="24" r="20" stroke="#e5e7eb" strokeWidth="4" fill="none" />
                          <circle 
                            cx="24" 
                            cy="24" 
                            r="20" 
                            stroke="#14ad9f" 
                            strokeWidth="4" 
                            fill="none"
                            strokeDasharray="125.6"
                            strokeDashoffset="12.56"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">Projektstatus</p>
                        <p className="text-xs text-gray-500">90% | 9 von 10</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Success Story Video Section - Fiverr Style */}
        <section ref={videoSectionRef} className="py-20 bg-white">
          <div className="max-w-[1400px] mx-auto px-6">
            <div className="flex flex-col items-start gap-4 mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
                So sieht Erfolg auf Taskilo aus
              </h2>
              <p className="text-lg text-gray-600">
                Unternehmen nutzen Taskilo, um ihre Visionen Wirklichkeit werden zu lassen.
              </p>
            </div>
            
            {/* Video Container - Native Controls like Fiverr */}
            <video 
              ref={videoRef}
              className="w-full rounded-lg"
              controls
              playsInline
              muted
              preload="auto"
              poster="/hero_bild_video.png"
              style={{ maxHeight: '589px' }}
            >
              <source src="https://mail.taskilo.de/webmail-api/static/videos/office-video.mov" type="video/mp4" />
              Ihr Browser unterstützt das Video-Tag nicht.
            </video>
          </div>
        </section>

        <ProviderCTA />

        {/* Beliebte Services Section - Fiverr Style */}
        <section className="py-16 bg-white">
          <div className="max-w-[1400px] mx-auto px-6">
            <h3 className="text-2xl font-semibold text-gray-600 mb-8">
              Beliebte Services auf Taskilo
            </h3>
            
            <div className="relative">
              {/* Navigation Buttons */}
              <button
                onClick={() => {
                  const container = document.getElementById('trusted-services-carousel');
                  if (container) container.scrollBy({ left: -260, behavior: 'smooth' });
                }}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
                aria-label="Nach links scrollen"
              >
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <button
                onClick={() => {
                  const container = document.getElementById('trusted-services-carousel');
                  if (container) container.scrollBy({ left: 260, behavior: 'smooth' });
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
                aria-label="Nach rechts scrollen"
              >
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>

              {/* Services Carousel */}
              <div 
                id="trusted-services-carousel"
                className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
              >
                {[
                  { name: 'Webentwicklung', category: 'IT & Digital', icon: '/categorie/it-digital-nobg.png' },
                  { name: 'Logo Design', category: 'Kreativ & Kunst', icon: '/categorie/kreativ-kunst-nobg.png' },
                  { name: 'Elektriker', category: 'Handwerk', icon: '/categorie/handwerk-nobg.png' },
                  { name: 'Social Media Marketing', category: 'Marketing & Vertrieb', icon: '/categorie/marketing-vertrieb-nobg.png' },
                  { name: 'Buchhaltung', category: 'Finanzen & Recht', icon: '/categorie/finanzen-recht-nobg.png' },
                  { name: 'Reinigungskraft', category: 'Haushalt', icon: '/categorie/haushalt-nobg.png' },
                  { name: 'Catering', category: 'Event & Veranstaltung', icon: '/categorie/event-veranstaltung-nobg.png' },
                  { name: 'Nachhilfe', category: 'Bildung & Unterstützung', icon: '/categorie/bildung-unterstuetzung-nobg.png' },
                ].map((service, index) => (
                  <Link
                    key={index}
                    href={`/services/${normalizeToSlug(service.category)}/${normalizeToSlug(service.name)}`}
                    className="flex-shrink-0 group"
                  >
                    <div className="w-56 h-44 bg-gray-50 rounded-2xl border border-gray-100 p-6 flex flex-col items-center justify-center gap-4 transition-all hover:shadow-lg hover:border-gray-200">
                      <div className="relative w-20 h-20">
                        <Image
                          src={service.icon}
                          alt={service.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <p className="text-sm font-medium text-gray-800 text-center leading-tight">
                        {service.name}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Make it happen Section - Fiverr Style */}
        <section className="py-16 bg-white">
          <div className="max-w-[1400px] mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 tracking-tight">
              Mit Taskilo alles möglich machen
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              {/* Feature 1 - Categories */}
              <div className="flex flex-col items-start gap-4">
                <svg width="52" height="52" viewBox="0 0 64 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.9375 9.5625H9.5625V18.9375H18.9375V9.5625Z" stroke="#14ad9f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M36.6875 9.5625H27.3125V18.9375H36.6875V9.5625Z" stroke="#14ad9f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M36.6875 27.3125H27.3125V36.6875H36.6875V27.3125Z" stroke="#14ad9f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M54.4375 9.5625H45.0625V18.9375H54.4375V9.5625Z" stroke="#14ad9f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.9375 27.3125H9.5625V36.6875H18.9375V27.3125Z" stroke="#14ad9f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.9375 45.0625H9.5625V54.4375H18.9375V45.0625Z" stroke="#14ad9f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M27.3125 49.75H36.6875" stroke="#14ad9f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M32 45.0625V54.4375" stroke="#14ad9f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M45.0625 49.75H54.4375" stroke="#14ad9f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M49.75 45.0625V54.4375" stroke="#14ad9f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M45.0625 32H54.4375" stroke="#14ad9f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M49.75 27.3125V36.6875" stroke="#14ad9f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-base text-gray-800 leading-relaxed max-w-[232px]">
                  Zugang zu Top-Talenten in über 100 Kategorien
                </p>
              </div>

              {/* Feature 2 - Matching */}
              <div className="flex flex-col items-start gap-4">
                <svg width="52" height="52" viewBox="0 0 64 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M31.818 57.062C17.8946 57.062 6.60005 45.7764 6.60005 31.844C6.60005 25.4353 8.98406 19.5886 12.9181 15.1469" stroke="#14ad9f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14.0518 19.0085L13.9793 13.6603L8.9756 15.5458" stroke="#14ad9f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M31.7822 6.62634C45.7055 6.62634 57.0001 17.9119 57.0001 31.8443C57.0001 38.253 54.6161 44.0997 50.682 48.5414" stroke="#14ad9f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M49.5494 44.6801L49.6219 50.0282L54.6166 48.1337" stroke="#14ad9f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M31.7545 48.6143C41.0161 48.6143 48.5242 41.1063 48.5242 31.8447C48.5242 22.583 41.0161 15.075 31.7545 15.075C22.4929 15.075 14.9849 22.583 14.9849 31.8447C14.9849 41.1063 22.4929 48.6143 31.7545 48.6143Z" stroke="#14ad9f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M25.6365 31.0608L29.9274 35.8414L37.9728 27.4754" stroke="#14ad9f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-base text-gray-800 leading-relaxed max-w-[232px]">
                  Einfaches und benutzerfreundliches Matching-Erlebnis
                </p>
              </div>

              {/* Feature 3 - Fast & Budget */}
              <div className="flex flex-col items-start gap-4">
                <svg width="52" height="52" viewBox="0 0 64 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.01547 10.9923C10.129 10.9923 11.0316 10.1039 11.0316 9.00809C11.0316 7.91227 10.129 7.02393 9.01547 7.02393C7.90197 7.02393 6.9993 7.91227 6.9993 9.00809C6.9993 10.1039 7.90197 10.9923 9.01547 10.9923Z" stroke="#14ad9f" strokeWidth="1.6" strokeMiterlimit="10"/>
                  <path d="M9.01525 57.0247C10.1288 57.0247 11.0314 56.1364 11.0314 55.0406C11.0314 53.9447 10.1288 53.0564 9.01525 53.0564C7.90175 53.0564 6.99908 53.9447 6.99908 55.0406C6.99908 56.1364 7.90175 57.0247 9.01525 57.0247Z" stroke="#14ad9f" strokeWidth="1.6" strokeMiterlimit="10"/>
                  <path d="M54.9836 10.9923C56.0971 10.9923 56.9998 10.1039 56.9998 9.00809C56.9998 7.91227 56.0971 7.02393 54.9836 7.02393C53.8701 7.02393 52.9674 7.91227 52.9674 9.00809C52.9674 10.1039 53.8701 10.9923 54.9836 10.9923Z" stroke="#14ad9f" strokeWidth="1.6" strokeMiterlimit="10"/>
                  <path d="M54.9836 57.0247C56.0971 57.0247 56.9998 56.1364 56.9998 55.0406C56.9998 53.9447 56.0971 53.0564 54.9836 53.0564C53.8701 53.0564 52.9674 53.9447 52.9674 55.0406C52.9674 56.1364 53.8701 57.0247 54.9836 57.0247Z" stroke="#14ad9f" strokeWidth="1.6" strokeMiterlimit="10"/>
                  <path d="M11.0317 9.40527H52.5648" stroke="#14ad9f" strokeWidth="1.6" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M11.435 54.6433H52.9681" stroke="#14ad9f" strokeWidth="1.6" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M55.1854 11.5873L55.1854 52.4611" stroke="#14ad9f" strokeWidth="1.6" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.21703 11.5873L9.21702 52.4611" stroke="#14ad9f" strokeWidth="1.6" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M36.3292 17.6012H24.4239L20.0947 33.8357H28.7531L26.5885 46.8232L43.9053 27.3419H34.1646L36.3292 17.6012Z" stroke="#14ad9f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-base text-gray-800 leading-relaxed max-w-[232px]">
                  Qualitätsarbeit schnell und im Budget erledigt
                </p>
              </div>

              {/* Feature 4 - Pay when happy */}
              <div className="flex flex-col items-start gap-4">
                <svg width="52" height="52" viewBox="0 0 64 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="8" y="8" width="32" height="28" rx="4" stroke="#14ad9f" strokeWidth="1.6"/>
                  <circle cx="24" cy="18" r="2" fill="#14ad9f"/>
                  <circle cx="16" cy="18" r="2" fill="#14ad9f"/>
                  <path d="M16 26C16 26 18 30 24 30C30 30 32 26 32 26" stroke="#14ad9f" strokeWidth="1.6" strokeLinecap="round"/>
                  <rect x="36" y="28" width="20" height="20" rx="4" stroke="#14ad9f" strokeWidth="1.6"/>
                  <path d="M46 34V42" stroke="#14ad9f" strokeWidth="1.6" strokeLinecap="round"/>
                  <path d="M43 36.5H49C49 36.5 50 36.5 50 37.5C50 38.5 49 38.5 49 38.5H44" stroke="#14ad9f" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M43 39.5H49C49 39.5 50 39.5 50 40.5C50 41.5 49 41.5 49 41.5H43" stroke="#14ad9f" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-base text-gray-800 leading-relaxed max-w-[232px]">
                  Zahlen Sie nur, wenn Sie zufrieden sind
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex justify-center">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-[#14ad9f] text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-600 transition-colors"
              >
                Jetzt registrieren
              </Link>
            </div>
          </div>
        </section>

        {/* Taskilo KI-Assistent Section - Fiverr Logo Maker Style */}
        <section className="py-16 bg-white">
          <div className="max-w-[1400px] mx-auto px-6">
            <div 
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: 'rgba(20, 173, 159, 0.15)' }}
            >
              <div className="grid lg:grid-cols-2 gap-12 items-center py-12 px-10">
                {/* Left Content */}
                <div className="flex flex-col gap-6">
                  {/* Logo */}
                  <div className="flex items-center gap-1">
                    <span className="text-gray-900 text-xl font-bold">taskilo</span>
                    <span className="text-xl font-light italic text-gray-700">KI-Assistent.</span>
                  </div>
                  
                  {/* Headline */}
                  <h2 className="text-4xl md:text-5xl font-normal text-gray-900 leading-tight">
                    Finde den perfekten<br/>
                    Dienstleister <em className="not-italic" style={{ color: '#14ad9f' }}>in Sekunden</em>
                  </h2>
                  
                  {/* Description */}
                  <p className="text-lg text-gray-600">
                    Unser KI-Assistent analysiert dein Projekt und findet die besten Experten für dich.
                  </p>
                  
                  {/* CTA Button */}
                  <Link
                    href="/services/ki-assistent"
                    className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-lg hover:bg-teal-600 w-fit"
                    style={{ backgroundColor: '#14ad9f' }}
                  >
                    KI-Assistent testen
                  </Link>
                </div>
                
                {/* Right Side - Image Grid like Fiverr */}
                <div className="hidden lg:flex justify-end items-center gap-4">
                  {/* Left Image - Small on darker teal background */}
                  <div className="flex flex-col gap-4">
                    <div 
                      className="w-40 h-48 rounded-2xl flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: 'rgba(20, 173, 159, 0.35)' }}
                    >
                      <div className="relative w-32 h-32">
                        <Image
                          src="/CTA_sektion/Fokus%20auf%20AI/KI-nobg.png"
                          alt="KI Assistent"
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>
                    {/* Small logo variants */}
                    <div className="flex gap-2">
                      <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center">
                        <div className="relative w-8 h-8">
                          <Image src="/categorie/handwerk-nobg.png" alt="" fill className="object-contain" />
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center">
                        <div className="relative w-8 h-8">
                          <Image src="/categorie/kreativ-kunst-nobg.png" alt="" fill className="object-contain" />
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center">
                        <div className="relative w-8 h-8">
                          <Image src="/categorie/marketing-vertrieb-nobg.png" alt="" fill className="object-contain" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Image - Large on slightly darker teal background */}
                  <div 
                    className="w-80 h-96 rounded-2xl flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: 'rgba(20, 173, 159, 0.25)' }}
                  >
                    <div className="relative w-72 h-72">
                      <Image
                        src="/CTA_sektion/Fokus%20auf%20Menschen-nobg.png"
                        alt="Taskilo Services Team"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}