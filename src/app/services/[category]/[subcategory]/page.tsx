'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/firebase/clients';
import { collection, query, getDocs, limit } from 'firebase/firestore';
import { Star, MapPin, ArrowLeft, Briefcase, Clock } from 'lucide-react';
import { categories } from '@/lib/categoriesData'; // Importiere die zentralen Kategorien
import { SERVICE_TAG_MAPPING } from '@/lib/serviceTagMapping';
import { ProviderBookingModal } from '@/app/dashboard/company/[uid]/provider/[id]/components/ProviderBookingModal';
import Header from '@/components/Header';
import ServiceHeader from '@/components/ServiceHeader';
import AuthModal from '@/components/AuthModal';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Provider {
  id: string;
  companyName?: string;
  userName?: string;
  profilePictureFirebaseUrl?: string;
  profilePictureURL?: string;
  photoURL?: string;
  profileBannerImage?: string; // Banner-Bild für Hero-Bereich
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
  hourlyRate?: number;
  responseTime?: string;
}

export default function SubcategoryPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth(); // Auth Context für intelligente Payment-Weiterleitung
  const category = (params?.category as string) || '';
  const subcategory = (params?.subcategory as string) || '';

  // URL-Parameter dekodieren
  const decodedCategory = decodeURIComponent(category);
  const decodedSubcategory = decodeURIComponent(subcategory);

  // Tag-basierte Navigation Parameter
  const fromTag = searchParams?.get('tag') || '';
  const filteredByTag = searchParams?.get('filtered') === 'true';

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'price' | 'newest'>('rating');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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

  // Finde die Kategorie durch Vergleich der normalisierten Namen - handle both %26 and & cases
  const categoryInfo = categories.find(cat => {
    const expectedSlug = normalizeToSlug(cat.title);
    // Auch prüfen ob die URL bereits %26 enthält (von der Navigation)
    const urlSlug = category.includes('%26') ? category : normalizeToSlug(cat.title);
    return expectedSlug === decodedCategory || expectedSlug === category || urlSlug === category;
  });

  // Finde die Unterkategorie durch Vergleich der normalisierten Namen
  const subcategoryName = categoryInfo?.subcategories.find(sub => {
    const expectedSlug = normalizeToSlug(sub);
    // Auch prüfen ob die URL bereits %26 enthält (von der Navigation)
    const urlSlug = subcategory.includes('%26') ? subcategory : normalizeToSlug(sub);
    return (
      expectedSlug === decodedSubcategory || expectedSlug === subcategory || urlSlug === subcategory
    );
  });

  // Lade echte Bewertungen und abgeschlossene Aufträge für Provider
  const enrichProvidersWithReviews = async (providers: Provider[]): Promise<Provider[]> => {
    try {
      // Get all reviews from collection with improved query and limit
      const reviewsQuery = query(
        collection(db, 'reviews'),
        limit(500) // Reasonable limit for performance
      );
      const allReviewsSnapshot = await getDocs(reviewsQuery);

      // Create a map of providerId to reviews for efficient lookup
      const reviewsMap = new Map<string, any[]>();
      // Create a map of providerId to completed jobs count (based on reviews)
      const completedJobsMap = new Map<string, number>();

      allReviewsSnapshot.forEach(doc => {
        const data = doc.data();
        const providerId = data.providerId;

        if (!reviewsMap.has(providerId)) {
          reviewsMap.set(providerId, []);
        }

        reviewsMap.get(providerId)!.push({
          id: doc.id,
          ...data,
        });

        // Jede Review entspricht einem abgeschlossenen Auftrag
        const currentCompletedJobs = completedJobsMap.get(providerId) || 0;
        completedJobsMap.set(providerId, currentCompletedJobs + 1);
      });

      // Enrich each provider with their reviews and completed jobs
      const enrichedProviders = providers.map(provider => {
        const providerReviews = reviewsMap.get(provider.id) || [];
        const completedJobs = completedJobsMap.get(provider.id) || 0;

        // Calculate average rating
        let averageRating = 0;
        let totalRating = 0;

        if (providerReviews.length > 0) {
          totalRating = providerReviews.reduce((sum, review) => {
            const rating = Number(review.rating) || 0;

            return sum + rating;
          }, 0);

          averageRating = totalRating / providerReviews.length;
        } else {
        }

        return {
          ...provider,
          rating: parseFloat(averageRating.toFixed(1)),
          reviewCount: providerReviews.length,
          completedJobs: completedJobs,
        };
      });

      return enrichedProviders;
    } catch (error) {
      console.error('🚨 DEBUG: Error in enrichProvidersWithReviews:', error);
      return providers.map(provider => ({
        ...provider,
        rating: provider.rating || 0,
        reviewCount: provider.reviewCount || 0,
        completedJobs: provider.completedJobs || 0,
      }));
    }
  };

  useEffect(() => {
    if (!categoryInfo || !subcategoryName) return;
    loadProviders();
  }, [category, subcategory, sortBy]);

  const loadProviders = async () => {
    try {
      setLoading(true);

      // 🔧 SAUBERE TRENNUNG: Nur companies collection verwenden
      const companiesCollectionRef = collection(db, 'companies');
      const companiesQuery = query(companiesCollectionRef, limit(50));

      const companiesSnapshot = await getDocs(companiesQuery);

      const companyProviders: Provider[] = companiesSnapshot.docs
        .map(doc => {
          const data = doc.data();

          return {
            id: doc.id,
            companyName: data.companyName,
            profilePictureFirebaseUrl: data.step3?.profilePictureURL || data.profilePictureURL,
            profilePictureURL: data.step3?.profilePictureURL || data.profilePictureURL,
            photoURL: data.step3?.profilePictureURL || data.profilePictureURL,
            // Banner-Bild für Hero-Bereich
            profileBannerImage: data.profileBannerImage || data.step3?.profileBannerImage,
            bio: data.description || data.bio,
            location:
              data.location ||
              (data.companyCity && data.companyPostalCode
                ? `${data.companyCity}, ${data.companyPostalCode}`
                : data.companyCity ||
                  (data.serviceAreas && data.serviceAreas.length > 0
                    ? data.serviceAreas[0]
                    : null)),
            hourlyRate:
              data.hourlyRate ||
              data.step4?.hourlyRate ||
              data.step5?.hourlyRate ||
              (data.step1?.hourlyRate ? Number(data.step1.hourlyRate) : null) ||
              // Fallback: Suche in allen Step-Daten nach hourlyRate
              Object.values(data).find(val => val && typeof val === 'object' && val.hourlyRate)
                ?.hourlyRate ||
              null,
            skills: data.skills || data.step3?.skills || [],
            selectedCategory: data.selectedCategory || 'Hotel & Gastronomie', // Fallback basierend auf Skills
            selectedSubcategory:
              data.selectedSubcategory ||
              (data.skills?.some(skill => skill.toLowerCase().includes('koch'))
                ? 'Mietkoch'
                : null),
            // Diese werden später durch echte Reviews überschrieben - Standardwerte auf 0 setzen
            rating: 0,
            reviewCount: 0,
            completedJobs: data.completedJobs || 0,
            isCompany: true,
            priceRange: data.priceRange,
            responseTime: data.responseTime,
          };
        })
        // Filter nur inaktive Firmen aus (aber zeige Firmen ohne isActive Feld)
        .filter(provider => {
          const data = companiesSnapshot.docs.find(doc => doc.id === provider.id)?.data();
          // Zeige Provider wenn status nicht 'inactive' ist
          return data?.status !== 'inactive';
        });

      // 🔧 SAUBERE TRENNUNG: Nur companies verwenden, keine users mehr
      const allProviders = companyProviders;

      // Anreichern mit echten Bewertungen
      const enrichedProviders = await enrichProvidersWithReviews(allProviders);

      // Filter nach Subcategory - erweiterte und allgemeine Prüfung
      let filteredProviders = enrichedProviders.filter(provider => {
        // 🔧 PRIORITÄT 1: Exakte Kategorie/Unterkategorie Übereinstimmung
        if (provider.isCompany && provider.selectedSubcategory) {
          // Exakte Übereinstimmung
          if (provider.selectedSubcategory === subcategoryName) {
            return true;
          }

          // Case-insensitive Übereinstimmung
          if (provider.selectedSubcategory.toLowerCase() === subcategoryName?.toLowerCase()) {
            return true;
          }

          // URL-Parameter Übereinstimmung
          if (provider.selectedSubcategory.toLowerCase() === subcategory.toLowerCase()) {
            return true;
          }
        }

        // 🔧 PRIORITÄT 2: Skills Array Übereinstimmung
        const skillsMatch = provider.skills?.some(
          skill =>
            skill.toLowerCase().includes((subcategoryName || '').toLowerCase()) ||
            skill.toLowerCase().includes(subcategory.toLowerCase())
        );

        if (skillsMatch) {
          return true;
        }

        // 🔧 PRIORITÄT 3: Nur sehr spezifische Matches für Namen/Bio
        // Für Provider ohne explizite Skills/Subcategory: Prüfe Namen und Bio (STRIKTERE MATCHING)
        const nameMatch =
          // Nur exakte Wort-Matches, keine Teilstring-Matches
          provider.companyName
            ?.toLowerCase()
            .split(' ')
            .some(
              word => word === subcategory.toLowerCase() || word === subcategoryName?.toLowerCase()
            ) ||
          provider.userName
            ?.toLowerCase()
            .split(' ')
            .some(
              word => word === subcategory.toLowerCase() || word === subcategoryName?.toLowerCase()
            );

        const bioMatch =
          // Nur wenn die komplette Subcategory im Bio-Text vorkommt
          provider.bio?.toLowerCase().includes(subcategory.toLowerCase()) ||
          provider.bio?.toLowerCase().includes(subcategoryName?.toLowerCase() || '');

        // 🔧 SPEZIAL-MATCHING: Für "Mietkoch" - prüfe auch ob im Namen "Koch" vorkommt
        const specialMietkochMatch =
          (subcategoryName?.toLowerCase() === 'mietkoch' ||
            subcategory.toLowerCase() === 'mietkoch') &&
          (provider.companyName?.toLowerCase().includes('koch') ||
            provider.companyName?.toLowerCase().includes('mietkoch') ||
            provider.userName?.toLowerCase().includes('koch') ||
            provider.userName?.toLowerCase().includes('mietkoch'));

        // 🔧 ANTI-MATCH: Verhindere Cross-Category Matches
        // Wenn Provider explizit eine andere Kategorie hat, nicht matchen
        if (provider.selectedCategory && provider.selectedSubcategory) {
          const providerCategory = provider.selectedCategory.toLowerCase();
          const targetCategory = categoryInfo?.title.toLowerCase();

          // Wenn Provider aus völlig anderer Kategorie kommt, ausschließen
          if (providerCategory !== targetCategory && !specialMietkochMatch && !skillsMatch) {
            return false;
          }
        }

        // Tag-basierte Filterung wenn verfügbar
        let tagMatch = false;
        if (fromTag && filteredByTag) {
          const tagMapping = SERVICE_TAG_MAPPING[fromTag];
          if (tagMapping) {
            // Prüfe ob Provider zu den Filtern aus dem Tag Mapping passt
            const filterMatch = tagMapping.filters?.some(
              filter =>
                provider.companyName?.toLowerCase().includes(filter.toLowerCase()) ||
                provider.userName?.toLowerCase().includes(filter.toLowerCase()) ||
                provider.bio?.toLowerCase().includes(filter.toLowerCase()) ||
                provider.skills?.some(skill => skill.toLowerCase().includes(filter.toLowerCase()))
            );

            // Zusätzlich prüfe Kategorie/Unterkategorie Match
            const categoryMatch =
              provider.selectedCategory?.toLowerCase() === tagMapping.category.toLowerCase() ||
              provider.selectedSubcategory?.toLowerCase() === tagMapping.subcategory.toLowerCase();

            tagMatch = filterMatch || categoryMatch;
          }
        }

        const finalMatch =
          skillsMatch ||
          nameMatch ||
          bioMatch ||
          specialMietkochMatch ||
          (filteredByTag ? tagMatch : true);

        return finalMatch;
      });

      // Suchfilter
      if (searchQuery) {
        filteredProviders = filteredProviders.filter(
          provider =>
            provider.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            provider.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            provider.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            provider.skills?.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }

      // Sortierung
      filteredProviders.sort((a, b) => {
        switch (sortBy) {
          case 'rating':
            return (b.rating || 0) - (a.rating || 0);
          case 'reviews':
            return (b.reviewCount || 0) - (a.reviewCount || 0);
          case 'price':
            // Hier könnte eine Preissortierung implementiert werden
            return 0;
          case 'newest':
            return 0; // Könnte mit createdAt implementiert werden
          default:
            return 0;
        }
      });

      setProviders(filteredProviders);
    } catch (_error) {
    } finally {
      setLoading(false);
    }
  };

  const getProfileImage = (provider: Provider) => {
    return (
      provider.profilePictureFirebaseUrl ||
      provider.profilePictureURL ||
      provider.photoURL ||
      '/images/default-avatar.jpg'
    );
  };

  const getBannerImage = (provider: Provider) => {
    // 🔧 FIX: Da Banner-Bilder derzeit als Blob-URLs gespeichert werden (nicht gültig),
    // verwenden wir kategorie-spezifische Banner-Bilder

    // Zuerst versuchen wir ein echtes Banner-Bild (falls es jemals korrekt hochgeladen wird)
    const bannerImage =
      (provider as any).profileBannerImage || (provider as any).step3?.profileBannerImage;

    if (bannerImage && !bannerImage.startsWith('blob:')) {
      return bannerImage;
    }

    // Kategorie-spezifische Banner-Bilder als Fallback
    const categoryBanners = {
      'Hotel & Gastronomie': '/images/banners/gastronomy-banner.jpg',
      Handwerk: '/images/banners/handwerk-banner.jpg',
      'IT & Technik': '/images/banners/it-banner.jpg',
      'Marketing & Vertrieb': '/images/banners/marketing-banner.jpg',
      default: '/images/banners/default-service-banner.jpg',
    };

    const categoryBanner =
      categoryBanners[provider.selectedCategory as keyof typeof categoryBanners] ||
      categoryBanners.default;

    // Fallback auf Profilbild wenn kein Banner existiert
    return categoryBanner || getProfileImage(provider);
  };

  const getProviderName = (provider: Provider) => {
    return provider.companyName || provider.userName || 'Unbekannter Anbieter';
  };

  // Debug logging für troubleshooting

  const handleBookNow = (provider: Provider) => {
    // Auth-Check: Wenn nicht eingeloggt, Auth-Modal öffnen
    if (!user) {
      setSelectedProvider(provider);
      setIsAuthModalOpen(true);
      return;
    }

    // Wenn eingeloggt, Booking-Modal öffnen
    setSelectedProvider(provider);
    setIsBookingModalOpen(true);
  };

  const handleBookingConfirm = async (
    _selection: any,
    _time: string,
    _durationString: string,
    _description: string
  ) => {
    try {
      // Schließe das Modal
      setIsBookingModalOpen(false);
      setSelectedProvider(null);

      // Intelligente Weiterleitung basierend auf User-Typ
      if (!user) {
        // Nicht eingeloggt → Login/Registrierung

        router.push(
          `/auftrag/get-started?provider=${selectedProvider?.id}&category=${categoryInfo?.title}&subcategory=${subcategoryName}`
        );
        return;
      }

      // Prüfe ob User eine Firma ist (B2B) oder Kunde (B2C)
      // TODO: Implementiere korrekte User-Type-Detection
      const isCompany = (user as any).isCompany || (user as any).role === 'firma';

      if (isCompany) {
        // Firma → B2B Payment im Company Dashboard

        router.push(`/dashboard/company/${user.uid}/provider/${selectedProvider?.id}?booking=true`);
        return;
      }

      // Standardfall: B2C Payment Flow für normale Kunden
      router.push(
        `/auftrag/get-started?provider=${selectedProvider?.id}&category=${categoryInfo?.title}&subcategory=${subcategoryName}`
      );
    } catch (error) {
      alert('Fehler bei der Weiterleitung. Bitte versuchen Sie es erneut.');
    }
  };

  const handleCloseBookingModal = () => {
    setIsBookingModalOpen(false);
    setSelectedProvider(null);
  };

  if (!categoryInfo || !subcategoryName) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        {/* Debug Header - Zeige immer einen Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Breadcrumb Navigation */}
            <nav className="text-sm text-gray-500 mb-6">
              <Link href="/" className="hover:text-[#14ad9f] transition-colors">
                Startseite
              </Link>
              <span className="mx-2">/</span>
              <Link href="/services" className="hover:text-[#14ad9f] transition-colors">
                Services
              </Link>
              <span className="mx-2">/</span>
              <span className="text-gray-900 font-medium">{decodedCategory}</span>
              <span className="mx-2">/</span>
              <span className="text-gray-900 font-medium">{decodedSubcategory}</span>
            </nav>

            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/services')}
                className="text-gray-600 hover:text-[#14ad9f] transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{decodedSubcategory}</h1>
                <p className="text-gray-600 mt-1">Service-Kategorie nicht gefunden</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Kategorie nicht gefunden</h2>
            <p className="text-gray-600 mb-4">
              Die angeforderte Kategorie &quot;{decodedCategory}&quot; oder Unterkategorie &quot;
              {decodedSubcategory}&quot; konnte nicht gefunden werden.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Verfügbare Kategorien:</p>
              <div className="text-sm text-gray-400">
                {categories.map(c => normalizeToSlug(c.title)).join(', ')}
              </div>
            </div>
            <button
              onClick={() => router.push('/services')}
              className="mt-6 bg-[#14ad9f] hover:bg-[#129488] text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Zu allen Services
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Dynamic Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 -z-10"></div>
      <div className="fixed inset-0 bg-black/20 -z-10"></div>

      <div className="min-h-screen relative z-10">
        <Header />

        <ServiceHeader
          categoryTitle={categoryInfo.title}
          subcategoryName={subcategoryName}
          decodedCategory={decodedCategory}
          providerCount={providers.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          fromTag={fromTag}
          filteredByTag={filteredByTag}
        />

        {/* Anbieter Liste - mit Gradient Hintergrund */}
        <div className="relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {loading ? (
              <div className="space-y-6">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-6 animate-pulse"
                  >
                    <div className="flex items-start gap-6">
                      <div className="w-20 h-20 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                      <div className="flex-1 space-y-3">
                        <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : providers.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm p-8 border border-white/20 max-w-md mx-auto">
                  <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Keine Anbieter gefunden
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Derzeit sind keine Anbieter für {subcategoryName} verfügbar.
                  </p>
                  <button
                    onClick={() => router.push(`/services/${decodedCategory}`)}
                    className="text-[#14ad9f] hover:text-[#129488] font-medium"
                  >
                    Alle {categoryInfo.title} Anbieter anzeigen
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {providers.map(provider => (
                  <div
                    key={provider.id}
                    className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 group border border-white/20 overflow-hidden"
                  >
                    {/* Provider Image */}
                    <div className="relative group/image">
                      <img
                        src={getBannerImage(provider)}
                        alt={getProviderName(provider)}
                        className="w-full h-48 object-cover"
                        onError={e => {
                          (e.target as HTMLImageElement).src = '/images/default-avatar.jpg';
                        }}
                      />

                      {/* Hover Overlay for Profile View - only on image hover */}
                      <div
                        className="absolute inset-0 bg-black bg-opacity-0 group-hover/image:bg-opacity-40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover/image:opacity-100 cursor-pointer"
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();

                          // Profil-Ansicht für alle User ermöglichen
                          router.push(`/profile/${provider.id}`);
                        }}
                      >
                        <button className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium shadow-lg transform translate-y-2 group-hover/image:translate-y-0 transition-transform">
                          Profil anzeigen
                        </button>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5">
                      {/* Provider Info */}
                      <div className="flex items-start gap-3 mb-4">
                        <img
                          src={getProfileImage(provider)}
                          alt={getProviderName(provider)}
                          className="w-10 h-10 rounded-full object-cover"
                          onError={e => {
                            (e.target as HTMLImageElement).src = '/images/default-avatar.jpg';
                          }}
                        />

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-base truncate group-hover:text-[#14ad9f] transition-colors">
                            {getProviderName(provider)}
                          </h3>
                          {provider.location && (
                            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{provider.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Service Title */}
                      <h4 className="text-gray-900 font-medium text-sm mb-3 line-clamp-2 leading-5">
                        {provider.bio
                          ? provider.bio.length > 60
                            ? `${provider.bio.substring(0, 60)}...`
                            : provider.bio
                          : `Professionelle ${subcategoryName} Services`}
                      </h4>
                      {/* Skills/Tags */}
                      {provider.skills && provider.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {provider.skills.slice(0, 3).map((skill, index) => (
                            <span
                              key={index}
                              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                            >
                              {skill}
                            </span>
                          ))}
                          {provider.skills.length > 3 && (
                            <span className="text-xs text-gray-400">
                              +{provider.skills.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Stats Row - Immer anzeigen mit Fallback-Werten */}
                      {/* Stats Row - Immer anzeigen, echte Bewertungen oder Fallback */}
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-3">
                          {provider.rating && provider.rating > 0 ? (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-400 fill-current" />
                              <span className="font-medium text-gray-900">
                                {provider.rating.toFixed(1)}
                              </span>
                              {provider.reviewCount && provider.reviewCount > 0 && (
                                <span className="text-gray-500">({provider.reviewCount})</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-gray-300" />
                              <span className="text-gray-400">Noch keine Bewertungen</span>
                            </div>
                          )}
                          {(provider.completedJobs ?? 0) > 0 && (
                            <div className="flex items-center gap-1">
                              <Briefcase className="w-3 h-3" />
                              <span>{provider.completedJobs} Aufträge</span>
                            </div>
                          )}
                        </div>
                        {provider.responseTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span className="text-xs">Antwort in {provider.responseTime}h</span>
                          </div>
                        )}
                      </div>
                      {/* Price & Action */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            <span className="text-sm text-gray-500 font-normal">Ab </span>
                            {provider.hourlyRate
                              ? `€${provider.hourlyRate}/h`
                              : provider.priceRange || 'Preis auf Anfrage'}
                          </div>
                        </div>
                        <button
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleBookNow(provider);
                          }}
                          className="bg-[#14ad9f] hover:bg-[#129488] text-white px-3 py-1.5 rounded-lg font-medium transition-colors text-xs whitespace-nowrap"
                          type="button"
                        >
                          {user ? 'Jetzt buchen' : 'Anmelden & buchen'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Intelligent Booking Modal - Unterscheidet automatisch zwischen B2B und B2C */}
          {/* B2C: Weiterleitung zu get-started | B2B (Firma): Weiterleitung zu Company Dashboard */}
          {isBookingModalOpen && selectedProvider && (
            <ProviderBookingModal
              isOpen={isBookingModalOpen}
              onClose={handleCloseBookingModal}
              provider={selectedProvider}
              onConfirm={handleBookingConfirm}
            />
          )}

          {/* Debug Info - können Sie später entfernen */}
          {process.env.NODE_ENV === 'development' && (
            <div
              style={{
                position: 'fixed',
                bottom: '10px',
                right: '10px',
                background: 'black',
                color: 'white',
                padding: '10px',
                fontSize: '12px',
                borderRadius: '5px',
                zIndex: 9999,
              }}
            >
              <div>Selected Provider: {selectedProvider ? 'Yes' : 'No'}</div>
              <div>Modal Open: {isBookingModalOpen ? 'Yes' : 'No'}</div>
            </div>
          )}
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setSelectedProvider(null);
        }}
        providerName={selectedProvider?.companyName || selectedProvider?.userName}
        service={subcategoryName}
      />
    </>
  );
}
