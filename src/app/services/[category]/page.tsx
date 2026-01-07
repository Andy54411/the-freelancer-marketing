'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Star, Briefcase, Play, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { categories } from '@/lib/categoriesData';
import { getFaqsForCategory } from '@/lib/categoryFaqs';
import { CategoryFAQ } from '@/components/services/CategoryFAQ';
import { HeroHeader } from '@/components/hero8-header';
import Link from 'next/link';
import { db } from '@/firebase/clients';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

interface SubcategoryStats {
  averagePrice: number;
  providerCount: number;
  averageRating: number;
}

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const category = (params?.category as string) || '';

  // States für Subcategory-Statistiken
  const [subcategoryStats, setSubcategoryStats] = useState<Record<string, SubcategoryStats>>({});
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // URL-Parameter dekodieren - handle both %26 and & cases
  const decodedCategory = decodeURIComponent(category);

  // Normalisierungsfunktion
  const normalizeToSlug = (str: string) =>
    str.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'und');

  // Finde die Kategorie durch Vergleich der normalisierten Namen
  const categoryInfo = categories.find(cat => {
    const expectedSlug = normalizeToSlug(cat.title);
    // Normalisiere auch die URL-Parameter für korrekten Vergleich
    const normalizedCategory = normalizeToSlug(category);
    const normalizedDecodedCategory = normalizeToSlug(decodedCategory);
    // Prüfe alle möglichen Varianten
    return (
      expectedSlug === category ||
      expectedSlug === decodedCategory ||
      expectedSlug === normalizedCategory ||
      expectedSlug === normalizedDecodedCategory
    );
  });

  // Funktion zum Laden der Subcategory-Statistiken
  const loadSubcategoryStats = async () => {
    if (!categoryInfo) return;

    setIsLoadingStats(true);
    const stats: Record<string, SubcategoryStats> = {};

    try {
      // Lade Daten für jede Subcategory
      for (const subcategory of categoryInfo.subcategories) {
        // 🔧 SAUBERE TRENNUNG: Nur companies collection verwenden
        const companiesQuery = query(
          collection(db, 'companies'),
          where('selectedSubcategory', '==', subcategory),
          limit(50)
        );

        const companiesSnapshot = await getDocs(companiesQuery);

        let totalPrice = 0;
        let priceCount = 0;
        let totalRating = 0;
        let ratingCount = 0;
        const totalProviders = companiesSnapshot.docs.length;

        // Sammle Preise und Bewertungen von Firmen
        companiesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.hourlyRate && typeof data.hourlyRate === 'number') {
            totalPrice += data.hourlyRate;
            priceCount++;
          }
          if (data.rating && typeof data.rating === 'number') {
            totalRating += data.rating;
            ratingCount++;
          }
        });

        // Berechne Durchschnittswerte
        const averagePrice = priceCount > 0 ? Math.round(totalPrice / priceCount) : 25; // Fallback auf 25€
        const averageRating =
          ratingCount > 0 ? Number((totalRating / ratingCount).toFixed(1)) : 4.8; // Fallback auf 4.8

        // Debug-Ausgabe

        stats[subcategory] = {
          averagePrice,
          providerCount: totalProviders,
          averageRating,
        };
      }

      setSubcategoryStats(stats);
    } catch {
      // Fallback-Werte bei Fehler
      const fallbackStats: Record<string, SubcategoryStats> = {};
      categoryInfo.subcategories.forEach(subcategory => {
        fallbackStats[subcategory] = {
          averagePrice: 25,
          providerCount: 50,
          averageRating: 4.8,
        };
      });
      setSubcategoryStats(fallbackStats);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Lade Statistiken beim Mount und wenn sich die Kategorie ändert
  useEffect(() => {
    if (categoryInfo) {
      loadSubcategoryStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryInfo]);

  // Scroll-Handler für den Carousel
  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScrollButtons, 300);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      return () => container.removeEventListener('scroll', checkScrollButtons);
    }
    return undefined;
  }, [categoryInfo]);

  if (!categoryInfo) {
    return (
      <>
        <HeroHeader />
        <div className="bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative -m-4 lg:-m-6 min-h-screen">
          <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
          <div className="relative z-10 pt-8">
            <div className="max-w-2xl mx-auto text-center p-8">
              <h1 className="text-2xl font-bold text-white mb-4">Kategorie nicht gefunden</h1>
              <button
                onClick={() => router.back()}
                className="text-white/80 hover:text-white flex items-center gap-2 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Zurück
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <HeroHeader />

      {/* Fiverr-Style Hero Banner */}
      <div className="relative bg-gradient-to-r from-[#0d8a7f] via-[#14ad9f] to-[#0d8a7f] overflow-hidden">
        {/* Decorative Pattern */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="white" opacity="0.3"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)"/>
          </svg>
        </div>
        
        {/* Decorative Circles */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute right-20 bottom-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-4">
            {categoryInfo.title}
          </h1>
          <p className="text-xl text-white/90 text-center max-w-2xl mx-auto">
            {`Professionelle ${categoryInfo.title} Services von verifizierten Experten`}
          </p>
          
          {/* How it works button */}
          <div className="flex justify-center mt-8">
            <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-full transition-all duration-200 border border-white/20">
              <Play className="w-4 h-4 fill-white" />
              <span className="font-medium">So funktioniert Taskilo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Most Popular Section - Fiverr Style Horizontal Scroll */}
      <div className="bg-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Beliebt in {categoryInfo.title}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                className={`p-2 rounded-full border transition-all duration-200 ${
                  canScrollLeft 
                    ? 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-600' 
                    : 'border-gray-200 text-gray-300 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                className={`p-2 rounded-full border transition-all duration-200 ${
                  canScrollRight 
                    ? 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-600' 
                    : 'border-gray-200 text-gray-300 cursor-not-allowed'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Horizontal Scroll Container */}
          <div 
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categoryInfo.subcategories.slice(0, 8).map((subcategory, index) => (
              <Link
                key={index}
                href={`/services/${normalizeToSlug(categoryInfo.title)}/${normalizeToSlug(subcategory)}`}
                className="flex-shrink-0 group"
              >
                <div className="flex items-center gap-4 px-6 py-4 bg-white border border-gray-200 rounded-lg hover:border-[#14ad9f] hover:shadow-md transition-all duration-200 min-w-[280px]">
                  {/* Icon */}
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-[#14ad9f]/10 transition-colors">
                    <span className="text-2xl font-bold text-gray-400 group-hover:text-[#14ad9f] transition-colors">
                      {subcategory.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {/* Text */}
                  <div className="flex-1">
                    <span className="font-semibold text-gray-900 group-hover:text-[#14ad9f] transition-colors">
                      {subcategory}
                    </span>
                  </div>
                  {/* Arrow */}
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#14ad9f] group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Big Project CTA - Fiverr Style */}
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(142.94deg, #FFFFFF 29.74%, #e6f7f5 69.63%, #14ad9f 99.92%)'
            }}
          >
            <div className="grid md:grid-cols-2 gap-0">
              {/* Left Content */}
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  Grosses Projekt?{' '}
                  <span className="text-[#14ad9f]">Wir helfen!</span>
                </h3>
                <p className="text-gray-600 text-lg mb-6">
                  Von der Anbietersuche bis zur Umsetzung - arbeiten Sie mit einem zertifizierten Projektmanager:
                </p>
                
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 text-gray-700 flex-shrink-0" />
                    <span>Verwaltet Projekte jeder Groesse professionell</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 text-gray-700 flex-shrink-0" />
                    <span>Sorgfaeltig ausgewaehlt und von Taskilo zertifiziert</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 text-gray-700 flex-shrink-0" />
                    <span>Nachgewiesene Expertise in Ihrer Branche</span>
                  </li>
                </ul>

                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Kostenlose Beratung buchen
                  </Link>
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Geld-zurueck-Garantie
                  </span>
                </div>
              </div>

              {/* Right - Fiverr Style 3D Photo Cards */}
              <div className="p-8 md:p-12 flex flex-col items-center justify-center">
                {/* 3D Cards Container */}
                <div 
                  className="flex items-end justify-center gap-0 mb-6"
                  style={{ 
                    perspective: '1000px',
                    filter: 'drop-shadow(0px 44px 54px rgba(20, 173, 159, 0.15))'
                  }}
                >
                  {/* Card 1 - Left (rotated) */}
                  <div 
                    className="bg-white rounded-2xl p-6 w-36 flex flex-col items-center shadow-xl relative z-10"
                    style={{ 
                      transform: 'rotateY(15deg) translateX(20px)',
                      transformOrigin: 'right center'
                    }}
                  >
                    <div className="w-24 h-24 mb-4 rounded-full overflow-hidden bg-[#8b9a6b] p-1">
                      <Image 
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face" 
                        alt="Projektmanager"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                    <p className="text-base font-bold text-gray-900 text-center whitespace-nowrap">Markus Weber</p>
                    <div className="mt-4 space-y-2 w-full">
                      <div className="h-2 bg-gray-200 rounded-full w-full"></div>
                      <div className="h-2 bg-gray-200 rounded-full w-3/4"></div>
                    </div>
                  </div>
                  
                  {/* Card 2 - Center (featured, larger) */}
                  <div 
                    className="bg-white rounded-2xl p-6 w-40 flex flex-col items-center shadow-2xl relative z-20"
                    style={{ 
                      transform: 'translateY(-10px) scale(1.05)',
                    }}
                  >
                    <div className="w-28 h-28 mb-4 rounded-full overflow-hidden bg-[#6b3a5b] p-1">
                      <Image 
                        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face" 
                        alt="Projektmanagerin"
                        width={112}
                        height={112}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                    <p className="text-lg font-bold text-gray-900 text-center whitespace-nowrap">Anna Mueller</p>
                    <div className="mt-4 space-y-2 w-full">
                      <div className="h-2 bg-gray-200 rounded-full w-full"></div>
                      <div className="h-2 bg-gray-200 rounded-full w-2/3"></div>
                    </div>
                  </div>
                  
                  {/* Card 3 - Right (rotated) */}
                  <div 
                    className="bg-white rounded-2xl p-6 w-36 flex flex-col items-center shadow-xl relative z-10"
                    style={{ 
                      transform: 'rotateY(-15deg) translateX(-20px)',
                      transformOrigin: 'left center'
                    }}
                  >
                    <div className="w-24 h-24 mb-4 rounded-full overflow-hidden bg-[#6b8b6b] p-1">
                      <Image 
                        src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face" 
                        alt="Projektmanager"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                    <p className="text-base font-bold text-gray-900 text-center whitespace-nowrap">Stefan Fischer</p>
                    <div className="mt-4 space-y-2 w-full">
                      <div className="h-2 bg-gray-200 rounded-full w-full"></div>
                      <div className="h-2 bg-gray-200 rounded-full w-4/5"></div>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-700">
                  Unsere Projektmanager, <span className="font-bold">zertifiziert</span> von Taskilo
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All Services Grid */}
      <div className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Alle {categoryInfo.title} Services
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {categoryInfo.subcategories.map((subcategory, index) => {
              const stats = subcategoryStats[subcategory];
              const isLoading = isLoadingStats || !stats;

              return (
                <Link
                  key={index}
                  href={`/services/${normalizeToSlug(categoryInfo.title)}/${normalizeToSlug(subcategory)}`}
                  className="group block"
                >
                  <div className="bg-white rounded-xl border border-gray-200 hover:border-[#14ad9f] hover:shadow-lg transition-all duration-300 overflow-hidden">
                    {/* Card Content */}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-11 h-11 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-[#14ad9f]/10 transition-colors">
                          <span className="text-xl font-bold text-gray-400 group-hover:text-[#14ad9f] transition-colors">
                            {subcategory.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          {isLoading ? (
                            <div className="animate-pulse bg-gray-200 h-4 w-8 rounded"></div>
                          ) : (
                            <span className="font-medium text-gray-900">{stats.averageRating}</span>
                          )}
                        </div>
                      </div>

                      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-[#14ad9f] transition-colors">
                        {subcategory}
                      </h3>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        {isLoading ? (
                          <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                        ) : (
                          <span>{stats.providerCount}+ Anbieter</span>
                        )}
                        {isLoading ? (
                          <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
                        ) : (
                          <span className="font-medium text-gray-900">ab {stats.averagePrice} Euro/h</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <CategoryFAQ
        categoryTitle={categoryInfo.title}
        faqs={getFaqsForCategory(categoryInfo.title)}
      />

      {/* Provider CTA */}
      <div className="bg-gradient-to-r from-[#14ad9f] to-[#0d8a7f] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">Sind Sie Experte in {categoryInfo.title}?</h3>
          <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
            Werden Sie Teil der Taskilo-Community und erreichen Sie tausende potenzielle Kunden.
          </p>
          <Link
            href="/register/company"
            className="inline-flex items-center gap-2 bg-white text-[#14ad9f] px-8 py-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-lg"
          >
            <Briefcase className="w-5 h-5" />
            Jetzt als Anbieter registrieren
          </Link>
        </div>
      </div>
    </>
  );
}
