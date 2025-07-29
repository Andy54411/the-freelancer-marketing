'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/firebase/clients';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Search, Star, MapPin, ArrowLeft, Briefcase, Clock } from 'lucide-react';
import { categories, Category } from '@/lib/categoriesData'; // Importiere die zentralen Kategorien
import { ProviderBookingModal } from '@/app/dashboard/company/[uid]/provider/[id]/components/ProviderBookingModal';
import Link from 'next/link';

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
  responseTime?: string;
}

export default function SubcategoryPage() {
  const params = useParams();
  const router = useRouter();
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

      console.log('[ServicePage] All providers:', allProviders.length);
      console.log('[ServicePage] Firma providers after filter:', firmProviders.length);

      // Log specifically Mietkoch providers
      const mietkochers = allProviders.filter(
        p =>
          p.companyName?.toLowerCase().includes('mietkoch') ||
          p.selectedSubcategory?.toLowerCase().includes('mietkoch')
      );
      console.log(
        '[ServicePage] Mietkoch providers found:',
        mietkochers.map(p => ({
          name: p.companyName || p.userName,
          selectedSubcategory: p.selectedSubcategory,
          selectedCategory: p.selectedCategory,
          isCompany: p.isCompany,
        }))
      );

      // Debug logging
      console.log('[ServicePage] Searching for subcategory:', subcategoryName);
      console.log('[ServicePage] URL subcategory:', subcategory);
      console.log('[ServicePage] All providers found:', allProviders.length);
      console.log(
        '[ServicePage] Providers with selectedSubcategory:',
        allProviders.filter(p => p.selectedSubcategory).length
      );

      // Log all providers with their subcategory data for debugging
      allProviders.forEach(provider => {
        if (
          provider.selectedSubcategory ||
          provider.companyName?.toLowerCase().includes('mietkoch')
        ) {
          console.log('[ServicePage] Provider:', {
            name: provider.companyName || provider.userName,
            selectedSubcategory: provider.selectedSubcategory,
            selectedCategory: provider.selectedCategory,
            isCompany: provider.isCompany,
          });
        }
      });

      // Filter nach Subcategory - erweiterte und allgemeine Prüfung
      let filteredProviders = allProviders.filter(provider => {
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

  const handleBookNow = (provider: Provider) => {
    console.log('handleBookNow called with provider:', provider);
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
      console.log('Buchung bestätigt:', {
        provider: selectedProvider,
        selection,
        time,
        durationString,
        description,
      });

      // Hier würden Sie die Buchungslogik implementieren
      // z.B. Weiterleitung zur Zahlung oder zur Auftragserstellung

      setIsBookingModalOpen(false);
      setSelectedProvider(null);

      // Optional: Erfolgsbenachrichtigung anzeigen
      alert('Buchungsanfrage erfolgreich gesendet!');
    } catch (error) {
      console.error('Fehler bei der Buchung:', error);
      alert('Fehler bei der Buchung. Bitte versuchen Sie es erneut.');
    }
  };

  const handleCloseBookingModal = () => {
    setIsBookingModalOpen(false);
    setSelectedProvider(null);
  };

  if (!categoryInfo || !subcategoryName) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Seite nicht gefunden
          </h1>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
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
            <Link
              href={`/services/${decodedCategory}`}
              className="hover:text-[#14ad9f] transition-colors"
            >
              {categoryInfo.title}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium">{subcategoryName}</span>
          </nav>

          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.push(`/services/${decodedCategory}`)}
              className="text-gray-600 hover:text-[#14ad9f] p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">{subcategoryName}</h1>
              <p className="text-xl text-gray-600 mb-4">
                {providers.length}{' '}
                {providers.length === 1 ? 'professioneller Anbieter' : 'professionelle Anbieter'}{' '}
                für {subcategoryName}
              </p>

              {/* Stats Pills */}
              <div className="flex flex-wrap gap-3">
                <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium border border-green-200">
                  ✓ Sofort verfügbar
                </div>
                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-200">
                  ✓ Ab €25/Stunde
                </div>
                <div className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-medium border border-purple-200">
                  ✓ Verifizierte Profile
                </div>
              </div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Anbieter durchsuchen..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] bg-white"
                />
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] bg-white"
              >
                <option value="rating">Beste Bewertung</option>
                <option value="reviews">Meiste Bewertungen</option>
                <option value="price">Preis</option>
                <option value="newest">Neueste</option>
              </select>

              {/* Filter Button */}
              <button className="bg-[#14ad9f] text-white px-6 py-3 rounded-lg hover:bg-[#129488] transition-colors font-medium">
                Filter anwenden
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Anbieter Liste */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
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
            <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Keine Anbieter gefunden
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Derzeit sind keine Anbieter für {subcategoryName} verfügbar.
            </p>
            <button
              onClick={() => router.push(`/dashboard/services/${category}`)}
              className="text-blue-600 hover:text-blue-700"
            >
              Alle {categoryInfo.title} Anbieter anzeigen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {providers.map(provider => (
              <div
                key={provider.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group border border-gray-200 overflow-hidden"
              >
                {/* Provider Image & Rating */}
                <div className="relative">
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

                  {/* Company Badge */}
                  {provider.isCompany && (
                    <div className="absolute top-3 left-3 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                      PRO
                    </div>
                  )}
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
                        <span className="text-xs text-gray-400">+{provider.skills.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Stats Row */}
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-3">
                      {provider.reviewCount && provider.reviewCount > 0 && (
                        <span>({provider.reviewCount})</span>
                      )}
                      {provider.completedJobs && provider.completedJobs > 0 && (
                        <div className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          <span>{provider.completedJobs}</span>
                        </div>
                      )}
                    </div>
                    {provider.responseTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">{provider.responseTime}</span>
                      </div>
                    )}
                  </div>

                  {/* Price & Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="text-right">
                      <span className="text-sm text-gray-500">Ab</span>
                      <div className="text-lg font-bold text-gray-900">
                        {provider.priceRange || '€25/h'}
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
                      Jetzt buchen
                    </button>
                  </div>
                </div>

                {/* Hover Overlay for Profile View */}
                <div
                  className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100"
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/profile/${provider.id}`);
                  }}
                >
                  <button className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                    Profil anzeigen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Professional Booking Modal */}
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
  );
}
