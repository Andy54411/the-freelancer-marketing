'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/firebase/clients';
import { collection, query, getDocs, limit } from 'firebase/firestore';
import { Star, ArrowLeft, Briefcase, ChevronDown, Info } from 'lucide-react';
import { categories } from '@/lib/categoriesData';
import { ProviderBookingModal } from '@/app/dashboard/company/[uid]/provider/[id]/components/ProviderBookingModal';
import { HeroHeader } from '@/components/hero8-header';
import LoginPopup from '@/components/LoginPopup';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ServiceFilters, {
  ServiceFiltersState,
  matchesBudgetFilter,
  matchesEmployeeSizeFilter,
  matchesBusinessTypeFilter,
  matchesLanguageFilter,
  matchesLocationFilter,
} from '@/components/services/ServiceFilters';
import ProviderCard, { ProviderCardSkeleton } from '@/components/services/ProviderCard';
import { type TaskiloLevel } from '@/services/TaskiloLevelService';

interface Provider {
  id: string;
  companyName?: string;
  userName?: string;
  profilePictureFirebaseUrl?: string;
  profilePictureURL?: string;
  photoURL?: string;
  profileBannerImage?: string;
  profileVideoURL?: string;
  bio?: string;
  location?: string;
  skills?: string[];
  selectedCategory?: string;
  selectedSubcategory?: string;
  rating?: number;
  reviewCount?: number;
  completedJobs?: number;
  isCompany?: boolean;
  priceRange?: string;
  taskerLevel?: TaskiloLevel;
  hourlyRate?: number;
  responseTime?: string;
  // Filter fields
  languages?: Array<{ language: string; proficiency?: string }>;
  employees?: string;
  businessType?: string;
  city?: string;
  serviceAreas?: string[];
  adminApproved?: boolean;
  availabilityType?: string;
  // Internal ranking fields (not visible to users)
  _searchTags?: string[];
  _profileTitle?: string;
  _internalScore?: number;
  _companyRating?: number;
  _companyReviewCount?: number;
}

type SortOption = 'recommended' | 'rating' | 'reviews' | 'price-low' | 'price-high' | 'newest';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recommended', label: 'Empfohlen' },
  { value: 'rating', label: 'Beste Bewertung' },
  { value: 'reviews', label: 'Meiste Reviews' },
  { value: 'price-low', label: 'Niedrigster Preis' },
  { value: 'price-high', label: 'Höchster Preis' },
  { value: 'newest', label: 'Neueste' },
];

export default function SubcategoryPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const category = (params?.category as string) || '';
  const subcategory = (params?.subcategory as string) || '';

  // URL-Parameter dekodieren
  const decodedCategory = decodeURIComponent(category);
  const decodedSubcategory = decodeURIComponent(subcategory);

  // States
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [filters, setFilters] = useState<ServiceFiltersState>({
    budgetRanges: [],
    languages: [],
    businessTypes: [],
    employeeSizes: [],
    locations: [],
    verifiedOnly: false,
    instantAvailable: false,
  });

  // Normalisierungsfunktion
  const normalizeToSlug = (str: string) =>
    str
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/&/g, 'und')
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss');

  // Finde die Kategorie
  const categoryInfo = categories.find(cat => {
    const expectedSlug = normalizeToSlug(cat.title);
    return expectedSlug === decodedCategory || expectedSlug === category;
  });

  // Finde die Unterkategorie
  const subcategoryName = categoryInfo?.subcategories.find(sub => {
    const expectedSlug = normalizeToSlug(sub);
    return expectedSlug === decodedSubcategory || expectedSlug === subcategory;
  });

  // Berechne verfügbare Filter-Optionen aus geladenen Providern
  const { availableLanguages, availableLocations, averageRating, totalReviews } = useMemo(() => {
    const languages = new Set<string>();
    const locations = new Set<string>();
    let totalRating = 0;
    let ratingCount = 0;
    let reviewSum = 0;

    providers.forEach(p => {
      // Sprachen sammeln
      p.languages?.forEach(l => languages.add(l.language));

      // Standorte sammeln
      if (p.city) locations.add(p.city);
      p.serviceAreas?.forEach(area => locations.add(area));

      // Rating berechnen
      if (p.rating && p.rating > 0) {
        totalRating += p.rating;
        ratingCount++;
      }
      reviewSum += p.reviewCount || 0;
    });

    return {
      availableLanguages: Array.from(languages).sort(),
      availableLocations: Array.from(locations).sort(),
      averageRating: ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : '0',
      totalReviews: reviewSum,
    };
  }, [providers]);

  // Filter und Sortieren der Provider
  const filteredAndSortedProviders = useMemo(() => {
    const result = providers.filter(provider => {
      // Budget Filter
      if (!matchesBudgetFilter(provider.hourlyRate, filters.budgetRanges)) return false;

      // Employee Size Filter
      if (!matchesEmployeeSizeFilter(provider.employees, filters.employeeSizes)) return false;

      // Business Type Filter
      if (!matchesBusinessTypeFilter(provider.businessType, filters.businessTypes)) return false;

      // Language Filter
      if (!matchesLanguageFilter(provider.languages, filters.languages)) return false;

      // Location Filter
      if (!matchesLocationFilter(provider.city, provider.serviceAreas, filters.locations))
        return false;

      // Verified Only Filter
      if (filters.verifiedOnly && !provider.adminApproved) return false;

      // Instant Available Filter
      if (filters.instantAvailable && provider.availabilityType !== 'flexible') return false;

      return true;
    });

    // Sortieren
    result.sort((a, b) => {
      switch (sortBy) {
        case 'recommended':
          // Internes Ranking basierend auf kombiniertem Score
          // Formel mit 4 Komponenten + Level-Boost:
          // - SEO-Score: 25% (Profil-Vollständigkeit)
          // - Service-Bewertungen: 35% (Rating nach Aufträgen)
          // - Firmenbewertungen: 25% (Generelle Firmenbewertung)
          // - Review-Anzahl: 15% (Mehr Bewertungen = mehr Vertrauen)
          // - Level-Boost: 0-50% Bonus basierend auf Tasker-Level
          const getLevelBoost = (level?: TaskiloLevel): number => {
            switch (level) {
              case 'top_rated': return 1.5; // +50%
              case 'level2': return 1.25; // +25%
              case 'level1': return 1.1; // +10%
              default: return 1.0; // kein Boost
            }
          };
          
          const seoA = (a._internalScore || 0) * 0.25;
          const serviceRatingA = ((a.rating || 0) * 20) * 0.35;
          const companyRatingA = ((a._companyRating || 0) * 20) * 0.25;
          const reviewCountA = (Math.min((a.reviewCount || 0) + (a._companyReviewCount || 0), 30) * 1.5) * 0.15;
          const levelBoostA = getLevelBoost(a.taskerLevel);
          const scoreA = (seoA + serviceRatingA + companyRatingA + reviewCountA) * levelBoostA;
          
          const seoB = (b._internalScore || 0) * 0.25;
          const serviceRatingB = ((b.rating || 0) * 20) * 0.35;
          const companyRatingB = ((b._companyRating || 0) * 20) * 0.25;
          const reviewCountB = (Math.min((b.reviewCount || 0) + (b._companyReviewCount || 0), 30) * 1.5) * 0.15;
          const levelBoostB = getLevelBoost(b.taskerLevel);
          const scoreB = (seoB + serviceRatingB + companyRatingB + reviewCountB) * levelBoostB;
          
          return scoreB - scoreA;
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'reviews':
          return (b.reviewCount || 0) - (a.reviewCount || 0);
        case 'price-low':
          return (a.hourlyRate || Infinity) - (b.hourlyRate || Infinity);
        case 'price-high':
          return (b.hourlyRate || 0) - (a.hourlyRate || 0);
        case 'newest':
          return 0; // Would need createdAt field
        default:
          return 0;
      }
    });

    return result;
  }, [providers, filters, sortBy]);

  // Lade echte Bewertungen für Provider (Service-Bewertungen + Firmenbewertungen)
  const enrichProvidersWithReviews = async (providersList: Provider[]): Promise<Provider[]> => {
    try {
      // Lade alle Firmenbewertungen einmal
      const companyReviewsSnapshot = await getDocs(collection(db, 'companyReviews'));
      const companyReviewsMap: Record<string, { totalRating: number; count: number }> = {};
      
      companyReviewsSnapshot.forEach(doc => {
        const data = doc.data();
        const providerId = data.providerId;
        const avgRating = data.averageRating || 0;
        
        if (providerId) {
          if (!companyReviewsMap[providerId]) {
            companyReviewsMap[providerId] = { totalRating: 0, count: 0 };
          }
          companyReviewsMap[providerId].totalRating += avgRating;
          companyReviewsMap[providerId].count += 1;
        }
      });
      
      for (const provider of providersList) {
        try {
          // Service-Bewertungen laden
          const reviewsQuery = query(collection(db, `companies/${provider.id}/reviews`), limit(50));
          const reviewsSnapshot = await getDocs(reviewsQuery);

          const providerReviews: { rating: number }[] = [];
          reviewsSnapshot.forEach(doc => {
            providerReviews.push(doc.data() as { rating: number });
          });

          if (providerReviews.length > 0) {
            const totalRating = providerReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
            provider.rating = parseFloat((totalRating / providerReviews.length).toFixed(1));
            provider.reviewCount = providerReviews.length;
            provider.completedJobs = providerReviews.length;
          }
          
          // Firmenbewertungen hinzufügen
          const companyReviewData = companyReviewsMap[provider.id];
          if (companyReviewData && companyReviewData.count > 0) {
            provider._companyRating = parseFloat((companyReviewData.totalRating / companyReviewData.count).toFixed(1));
            provider._companyReviewCount = companyReviewData.count;
          }
        } catch {
          // Skip on error
        }
      }
      return providersList;
    } catch {
      return providersList;
    }
  };

  // Lade Provider
  useEffect(() => {
    if (!categoryInfo || !subcategoryName) return;

    const loadProviders = async () => {
      try {
        setLoading(true);

        const companiesQuery = query(collection(db, 'companies'), limit(100));
        const companiesSnapshot = await getDocs(companiesQuery);

        const companyProviders: Provider[] = companiesSnapshot.docs
          .map(doc => {
            const data = doc.data();
            
            // Berechne internen SEO-Score basierend auf Profil-Vollständigkeit
            // Diese Berechnung ist vereinfacht - der echte Score wird vom KeywordAnalysisService berechnet
            let internalScore = 0;
            
            // Profil-Titel vorhanden? (15 Punkte)
            const profileTitle = data.profileTitle || '';
            if (profileTitle.length >= 30) internalScore += 15;
            else if (profileTitle.length >= 20) internalScore += 10;
            else if (profileTitle.length > 0) internalScore += 5;
            
            // Beschreibung vorhanden und ausreichend lang? (20 Punkte)
            const description = data.description || data.bio || '';
            const descLength = description.replace(/<[^>]*>/g, '').length;
            if (descLength >= 500) internalScore += 20;
            else if (descLength >= 200) internalScore += 15;
            else if (descLength >= 100) internalScore += 10;
            else if (descLength > 0) internalScore += 5;
            
            // Such-Tags vorhanden? (15 Punkte - 3 pro Tag)
            const searchTags = data.searchTags || [];
            internalScore += Math.min(15, searchTags.length * 3);
            
            // Skills vorhanden? (15 Punkte)
            const skills = data.skills || data.step3?.skills || [];
            if (skills.length >= 5) internalScore += 15;
            else if (skills.length >= 3) internalScore += 10;
            else if (skills.length > 0) internalScore += 5;
            
            // Profilbild vorhanden? (10 Punkte)
            if (data.step3?.profilePictureURL || data.profilePictureURL) internalScore += 10;
            
            // Verifiziert? (15 Punkte)
            if (data.adminApproved === true) internalScore += 15;
            
            // Standort angegeben? (10 Punkte)
            if (data.location || data.city || data.companyCity) internalScore += 10;
            
            return {
              id: doc.id,
              companyName: data.companyName,
              profilePictureFirebaseUrl: data.step3?.profilePictureURL || data.profilePictureURL,
              profilePictureURL: data.step3?.profilePictureURL || data.profilePictureURL,
              photoURL: data.step3?.profilePictureURL || data.profilePictureURL,
              profileBannerImage: data.profileBannerImage || data.step3?.profileBannerImage,
              profileVideoURL: data.profileVideoURL || data.step3?.profileVideoURL,
              bio: data.description || data.bio,
              location:
                data.location ||
                (data.companyCity && data.companyPostalCode
                  ? `${data.companyCity}, ${data.companyPostalCode}`
                  : data.companyCity),
              hourlyRate: data.hourlyRate || data.step4?.hourlyRate,
              skills: data.skills || data.step3?.skills || [],
              selectedCategory: data.selectedCategory,
              selectedSubcategory: data.selectedSubcategory,
              rating: 0,
              reviewCount: 0,
              completedJobs: data.completedJobs || 0,
              isCompany: true,
              responseTime: data.responseTime,
              // Filter fields
              languages: data.languages || data.step3?.languages || [],
              employees: data.employees,
              businessType: data.businessType,
              city: data.city || data.companyCity,
              serviceAreas: data.serviceAreas || data.step4?.serviceAreas || [],
              adminApproved: data.adminApproved === true,
              availabilityType: data.availabilityType || data.step4?.availabilityType,
              // Tasker Level
              taskerLevel: data.taskerLevel?.currentLevel as TaskiloLevel | undefined,
              // Internal ranking fields (not visible to users)
              _searchTags: searchTags,
              _profileTitle: profileTitle,
              _internalScore: internalScore,
            };
          })
          .filter(provider => {
            const data = companiesSnapshot.docs.find(doc => doc.id === provider.id)?.data();
            
            // Nur inaktive Anbieter ausfiltern, nicht suspendierte (die können noch angezeigt werden)
            if (data?.status === 'inactive') {
              return false;
            }
            // Ausfiltern wenn accountSuspended explizit true ist
            if (data?.accountSuspended === true) {
              return false;
            }

            // Filter nach Subcategory
            if (provider.selectedSubcategory) {
              const matches = 
                provider.selectedSubcategory === subcategoryName ||
                provider.selectedSubcategory.toLowerCase() === subcategoryName?.toLowerCase();
              if (matches) {
                return true;
              }
            }

            // Skills check
            const skillsMatch = provider.skills?.some(
              skill =>
                skill.toLowerCase().includes((subcategoryName || '').toLowerCase()) ||
                skill.toLowerCase().includes(subcategory.toLowerCase())
            );

            return skillsMatch;
          });

        const enrichedProviders = await enrichProvidersWithReviews(companyProviders);
        setProviders(enrichedProviders);
      } catch {
        setProviders([]);
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, subcategory]);

  // Booking Handler
  const handleBookClick = (provider: Provider) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setSelectedProvider(provider);
    setIsBookingModalOpen(true);
  };

  if (!categoryInfo) {
    return (
      <>
        <HeroHeader />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Kategorie nicht gefunden</h1>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <HeroHeader />

      {/* Hero Section - Fiverr Style */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/" className="hover:text-teal-600 transition-colors">
              Startseite
            </Link>
            <span>/</span>
            <Link href="/services" className="hover:text-teal-600 transition-colors">
              Services
            </Link>
            <span>/</span>
            <Link
              href={`/services/${normalizeToSlug(categoryInfo.title)}`}
              className="hover:text-teal-600 transition-colors"
            >
              {categoryInfo.title}
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{subcategoryName}</span>
          </nav>

          {/* Title Section */}
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{subcategoryName}</h1>
            <p className="text-lg text-gray-600">
              Finden Sie professionelle {subcategoryName}-Dienstleister in Ihrer Nähe
            </p>
          </div>

          {/* Rating Badge - Like Fiverr */}
          {totalReviews > 0 && (
            <div className="inline-flex items-center gap-3 bg-gray-50 rounded-full px-4 py-2 border border-gray-200 mb-6">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(Number(averageRating))
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-gray-200 text-gray-200'
                    }`}
                  />
                ))}
              </div>
              <span className="font-semibold text-gray-900">{averageRating}/5</span>
              <span className="text-gray-500 text-sm">
                Durchschnittsbewertung basierend auf {totalReviews.toLocaleString('de-DE')} Reviews
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Basierend auf verifizierten Kundenbewertungen</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Related Subcategories Pills - Like Fiverr */}
          {categoryInfo.subcategories.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {categoryInfo.subcategories.slice(0, 8).map(sub => {
                const isActive = sub === subcategoryName;
                return (
                  <Link
                    key={sub}
                    href={`/services/${normalizeToSlug(categoryInfo.title)}/${normalizeToSlug(sub)}`}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      isActive
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-teal-500 hover:text-teal-600'
                    }`}
                  >
                    {sub}
                  </Link>
                );
              })}
              {categoryInfo.subcategories.length > 8 && (
                <span className="px-4 py-2 text-sm text-gray-500">
                  +{categoryInfo.subcategories.length - 8} weitere
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <ServiceFilters
        filters={filters}
        onFiltersChange={setFilters}
        availableLanguages={availableLanguages}
        availableLocations={availableLocations}
        resultCount={filteredAndSortedProviders.length}
      />

      {/* Results Section */}
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">
              <span className="font-semibold text-gray-900">
                {filteredAndSortedProviders.length.toLocaleString('de-DE')}
              </span>{' '}
              Ergebnisse
            </p>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  Sortieren: {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {SORT_OPTIONS.map(option => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={sortBy === option.value ? 'bg-teal-50 text-teal-700' : ''}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Provider Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <ProviderCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredAndSortedProviders.length === 0 ? (
            <div className="text-center py-16">
              <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Keine Anbieter gefunden
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Leider gibt es aktuell keine Anbieter, die Ihren Filterkriterien entsprechen.
                Versuchen Sie, Ihre Filter anzupassen.
              </p>
              <Button
                variant="outline"
                onClick={() =>
                  setFilters({
                    budgetRanges: [],
                    languages: [],
                    businessTypes: [],
                    employeeSizes: [],
                    locations: [],
                    verifiedOnly: false,
                    instantAvailable: false,
                  })
                }
              >
                Filter zurücksetzen
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedProviders.map(provider => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  onBookClick={handleBookClick}
                />
              ))}
            </div>
          )}

          {/* CTA Section */}
          <div className="mt-16 bg-linear-to-r from-teal-600 to-teal-500 rounded-2xl p-8 text-center text-white">
            <h3 className="text-2xl font-bold mb-4">
              Sind Sie {subcategoryName}?
            </h3>
            <p className="text-white/90 mb-6 max-w-2xl mx-auto">
              Werden Sie Teil der Taskilo-Community und erreichen Sie tausende potenzielle Kunden.
              Professionelle Tools, faire Provisionen, transparente Abrechnung.
            </p>
            <Link
              href="/register/company"
              className="inline-flex items-center gap-2 bg-white text-teal-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              <Briefcase className="w-5 h-5" />
              Jetzt als Anbieter registrieren
            </Link>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedProvider && (
        <ProviderBookingModal
          provider={{
            id: selectedProvider.id,
            companyName: selectedProvider.companyName || selectedProvider.userName || '',
          }}
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedProvider(null);
          }}
          onConfirm={async (_dateSelection, _time, _duration, _description) => {
            // Booking confirmation handled by modal
            setIsBookingModalOpen(false);
            setSelectedProvider(null);
          }}
        />
      )}

      <LoginPopup 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={() => setIsAuthModalOpen(false)}
      />
    </>
  );
}
