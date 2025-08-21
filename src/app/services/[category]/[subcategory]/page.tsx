'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/firebase/clients';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Search, Star, MapPin, ArrowLeft, Briefcase, Clock } from 'lucide-react';
import { categories, Category } from '@/lib/categoriesData'; // Importiere die zentralen Kategorien
import { ProviderBookingModal } from '@/app/dashboard/company/[uid]/provider/[id]/components/ProviderBookingModal';
import Header from '@/components/Header';
import ServiceHeader from '@/components/ServiceHeader';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Provider {
  id: string;
  companyName?: string;
  userName?: string;
  profilePictureFirebaseUrl?: string;
  profilePictureURL?: string;
  photoURL?: string;
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
  const { user } = useAuth(); // Auth Context für intelligente Payment-Weiterleitung
  const category = (params?.category as string) || '';
  const subcategory = (params?.subcategory as string) || '';

  // URL-Parameter dekodieren
  const decodedCategory = decodeURIComponent(category);
  const decodedSubcategory = decodeURIComponent(subcategory);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'price' | 'newest'>('rating');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Normalisierungsfunktion
  const normalizeToSlug = (str: string) =>
    str.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'und');

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

  // Lade echte Bewertungen für Provider
  const enrichProvidersWithReviews = async (providers: Provider[]): Promise<Provider[]> => {
    const enrichedProviders = await Promise.all(
      providers.map(async provider => {
        try {
          // Lade Bewertungen für diesen Provider
          const reviewsQuery = query(
            collection(db, 'reviews'),
            where('providerId', '==', provider.id)
          );
          const reviewsSnapshot = await getDocs(reviewsQuery);

          if (reviewsSnapshot.docs.length > 0) {
            const reviews = reviewsSnapshot.docs.map(doc => doc.data());
            const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
            const averageRating = totalRating / reviews.length;

            return {
              ...provider,
              rating: averageRating,
              reviewCount: reviews.length,
            };
          }

          // Fallback auf ursprüngliche Daten
          return provider;
        } catch (error) {
          console.error(`[ServicePage] Error loading reviews for provider ${provider.id}:`, error);
          return provider;
        }
      })
    );

    return enrichedProviders;
  };

  useEffect(() => {
    if (!categoryInfo || !subcategoryName) return;
    loadProviders();
  }, [category, subcategory, sortBy]);

  const loadProviders = async () => {
    try {
      setLoading(true);

      console.log('[ServicePage] Loading providers for:', {
        category,
        subcategory,
        subcategoryName,
      });

      // Query für Firmen - erweitert um verschiedene Aktivitätszustände
      const firmCollectionRef = collection(db, 'companies');
      const firmQuery = query(firmCollectionRef, limit(50));

      // Query für Users/Freelancer
      const userCollectionRef = collection(db, 'users');
      const userQuery = query(userCollectionRef, where('isFreelancer', '==', true), limit(50));

      const [firmSnapshot, userSnapshot] = await Promise.all([
        getDocs(firmQuery),
        getDocs(userQuery),
      ]);

      console.log('[ServicePage] Query results:', {
        firmDocs: firmSnapshot.docs.length,
        userDocs: userSnapshot.docs.length,
      });

      const firmProviders: Provider[] = firmSnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            companyName: data.companyName,
            profilePictureFirebaseUrl: data.profilePictureFirebaseUrl,
            profilePictureURL: data.profilePictureURL,
            photoURL: data.photoURL,
            bio: data.description || data.bio,
            location: data.location,
            hourlyRate: data.hourlyRate || data.pricePerHour || data.baseRate,
            skills:
              data.services ||
              data.skills ||
              data.categories ||
              data.serviceCategories ||
              data.specialties ||
              data.expertise ||
              (data.selectedSubcategory ? [data.selectedSubcategory] : []),
            selectedCategory: data.selectedCategory,
            selectedSubcategory: data.selectedSubcategory,
            rating: data.averageRating || data.rating || data.ratingAverage || data.starRating || 0,
            reviewCount:
              data.reviewCount ||
              data.totalReviews ||
              data.numReviews ||
              data.reviewsCount ||
              (Array.isArray(data.reviews) ? data.reviews.length : 0) ||
              0,
            completedJobs: data.completedJobs || 0,
            isCompany: true,
            priceRange: data.priceRange,
            responseTime: data.responseTime,
          };
        })
        // Filter nur inaktive Firmen aus (aber zeige Firmen ohne isActive Feld)
        .filter(provider => {
          const data = firmSnapshot.docs.find(doc => doc.id === provider.id)?.data();
          // Zeige Provider wenn isActive nicht explizit false ist
          return data?.isActive !== false;
        });

      const userProviders: Provider[] = userSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userName: data.userName || data.displayName,
          profilePictureFirebaseUrl: data.profilePictureFirebaseUrl,
          profilePictureURL: data.profilePictureURL,
          photoURL: data.photoURL,
          bio: data.bio,
          location: data.location,
          hourlyRate: data.hourlyRate || data.pricePerHour || data.baseRate,
          skills:
            data.skills ||
            data.services ||
            data.categories ||
            data.serviceCategories ||
            data.specialties ||
            data.expertise ||
            (data.selectedSubcategory ? [data.selectedSubcategory] : []),
          selectedCategory: data.selectedCategory,
          selectedSubcategory: data.selectedSubcategory,
          rating: data.averageRating || data.rating || data.ratingAverage || data.starRating || 0,
          reviewCount:
            data.reviewCount ||
            data.totalReviews ||
            data.numReviews ||
            data.reviewsCount ||
            (Array.isArray(data.reviews) ? data.reviews.length : 0),
          completedJobs: data.completedJobs || 0,
          isCompany: false,
          priceRange: data.priceRange,
          responseTime: data.responseTime,
        };
      });

      const allProviders = [...firmProviders, ...userProviders];

      console.log('[ServicePage] All providers before enrichment:', allProviders.length);

      // Anreichern mit echten Bewertungen
      const enrichedProviders = await enrichProvidersWithReviews(allProviders);

      console.log('[ServicePage] Providers after enrichment:', enrichedProviders.length);

      // Filter nach Subcategory - erweiterte und allgemeine Prüfung
      let filteredProviders = enrichedProviders.filter(provider => {
        // Für Firmen: prüfe selectedSubcategory mit verschiedenen Matching-Strategien
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

        // Für alle Provider: Prüfe Skills/Services Array
        const skillsMatch = provider.skills?.some(
          skill =>
            skill.toLowerCase().includes((subcategoryName || '').toLowerCase()) ||
            skill.toLowerCase().includes(subcategory.toLowerCase())
        );

        // Für Provider ohne explizite Skills/Subcategory: Prüfe Namen und Bio
        const nameMatch =
          provider.companyName?.toLowerCase().includes(subcategory.toLowerCase()) ||
          provider.userName?.toLowerCase().includes(subcategory.toLowerCase()) ||
          provider.companyName?.toLowerCase().includes(subcategoryName?.toLowerCase() || '') ||
          provider.userName?.toLowerCase().includes(subcategoryName?.toLowerCase() || '');

        const bioMatch =
          provider.bio?.toLowerCase().includes(subcategory.toLowerCase()) ||
          provider.bio?.toLowerCase().includes(subcategoryName?.toLowerCase() || '');

        return skillsMatch || nameMatch || bioMatch;
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
    } catch (error) {
      console.error('Fehler beim Laden der Anbieter:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProfileImage = (provider: Provider) => {
    return (
      provider.profilePictureFirebaseUrl ||
      provider.profilePictureURL ||
      provider.photoURL ||
      '/images/default-avatar.png'
    );
  };

  const getProviderName = (provider: Provider) => {
    return provider.companyName || provider.userName || 'Unbekannter Anbieter';
  };

  // Debug logging für troubleshooting
  console.log('[ServicePage] Debug Info:', {
    category,
    subcategory,
    decodedCategory,
    decodedSubcategory,
    categoryInfo: categoryInfo?.title,
    subcategoryName,
    hasValidData: !!(categoryInfo && subcategoryName),
    availableCategories: categories.map(c => ({ title: c.title, slug: normalizeToSlug(c.title) })),
  });

  const handleBookNow = (provider: Provider) => {
    console.log('handleBookNow called with provider:', provider);

    // Auth-Check: Wenn nicht eingeloggt, zur Registrierung weiterleiten
    if (!user) {
      console.log('User not logged in - redirecting to login page');
      router.push('/login');
      return;
    }

    // Wenn eingeloggt, Modal öffnen
    setSelectedProvider(provider);
    setIsBookingModalOpen(true);
    console.log('Modal state set - isBookingModalOpen:', true);
  };

  const handleBookingConfirm = async (
    selection: any,
    time: string,
    durationString: string,
    description: string
  ) => {
    try {
      console.log('Intelligent Payment Routing:', {
        provider: selectedProvider,
        user: user?.role,
        isLoggedIn: !!user,
        selection,
        time,
        durationString,
        description,
      });

      // Schließe das Modal
      setIsBookingModalOpen(false);
      setSelectedProvider(null);

      // Intelligente Weiterleitung basierend auf User-Typ
      if (!user) {
        // Nicht eingeloggt → Login/Registrierung
        console.log('User not logged in - redirecting to login');
        router.push(
          `/auftrag/get-started?provider=${selectedProvider?.id}&category=${categoryInfo?.title}&subcategory=${subcategoryName}`
        );
        return;
      }

      if (user.role === 'firma') {
        // Firma → B2B Payment im Company Dashboard
        console.log('Firma user - redirecting to B2B payment');
        router.push(`/dashboard/company/${user.uid}/provider/${selectedProvider?.id}?booking=true`);
        return;
      }

      if (user.role === 'kunde') {
        // Kunde → B2C Payment Flow
        console.log('Kunde user - redirecting to B2C payment');
        router.push(
          `/auftrag/get-started?provider=${selectedProvider?.id}&category=${categoryInfo?.title}&subcategory=${subcategoryName}`
        );
        return;
      }

      // Fallback für unbekannte Rollen
      console.log('Unknown user role - redirecting to get-started');
      router.push(
        `/auftrag/get-started?provider=${selectedProvider?.id}&category=${categoryInfo?.title}&subcategory=${subcategoryName}`
      );
    } catch (error) {
      console.error('Fehler bei der intelligenten Payment-Weiterleitung:', error);
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
          showAuthBanner={!user}
          onLoginClick={() => router.push('/login')}
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
                    {/* Provider Image & Rating */}
                    <div className="relative group/image">
                      <img
                        src={getProfileImage(provider)}
                        alt={getProviderName(provider)}
                        className="w-full h-48 object-cover"
                        onError={e => {
                          (e.target as HTMLImageElement).src = '/images/default-avatar.png';
                        }}
                      />

                      {/* Rating Badge */}
                      {(provider.rating ?? 0) > 0 && (
                        <div className="absolute top-3 right-3 bg-white rounded-full px-3 py-1 shadow-sm">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="text-sm font-semibold text-gray-900">
                              {(provider.rating ?? 0).toFixed(1)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Hover Overlay for Profile View - only on image hover */}
                      <div
                        className="absolute inset-0 bg-black bg-opacity-0 group-hover/image:bg-opacity-40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover/image:opacity-100 cursor-pointer"
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();

                          // Auth-Check für Profil-Ansicht
                          if (!user) {
                            console.log(
                              'User not logged in - redirecting to login page for profile view'
                            );
                            router.push('/login');
                            return;
                          }

                          router.push(`/profile/${provider.id}`);
                        }}
                      >
                        <button className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium shadow-lg transform translate-y-2 group-hover/image:translate-y-0 transition-transform">
                          {user ? 'Profil anzeigen' : 'Anmelden für Profil'}
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
                            (e.target as HTMLImageElement).src = '/images/default-avatar.png';
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
                              <span>{provider.rating.toFixed(1)}</span>
                              {provider.reviewCount && provider.reviewCount > 0 && (
                                <span className="ml-1">({provider.reviewCount})</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-gray-300" />
                              <span className="text-gray-400">Noch keine Bewertungen</span>
                            </div>
                          )}
                          {provider.completedJobs && provider.completedJobs > 0 && (
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
                      </div>{' '}
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
                          className="bg-[#14ad9f] hover:bg-[#129488] text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                          type="button"
                        >
                          {user ? 'Jetzt buchen' : 'Registrieren & buchen'}
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
    </>
  );
}
