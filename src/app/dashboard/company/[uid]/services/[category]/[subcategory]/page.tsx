'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/firebase/clients';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { Search, Star, MapPin, ArrowLeft, Briefcase, Clock } from 'lucide-react';
import { categories, Category } from '@/lib/categoriesData'; // Importiere die zentralen Kategorien
import DirectChatModal from '@/components/DirectChatModal';
import { ResponseTimeBadge } from '@/components/ResponseTimeDisplay';
import { useAuth } from '@/contexts/AuthContext';

// Simple translation hook fallback for existing pages
const useSimpleTranslations = () => {
  // Default German translations (fallback)
  const translations = {
    title: 'Service-Anbieter finden',
    subtitle: 'Finden Sie qualifizierte Anbieter für Ihre Anfrage',
    searchPlaceholder: 'Nach Anbietern suchen...',
    sortBy: 'Sortieren nach',
    sortOptions: {
      rating: 'Bewertung',
      reviews: 'Bewertungen',
      price: 'Preis',
      newest: 'Neueste',
    },
    noResults: 'Keine Anbieter gefunden',
    noResultsDescription: 'Versuchen Sie, Ihre Suchkriterien anzupassen.',
    loading: 'Lade Anbieter...',
    provider: {
      company: 'Unternehmen',
      freelancer: 'Freelancer',
      rating: 'Bewertung',
      reviews: 'Bewertungen',
      completedJobs: 'Abgeschlossene Aufträge',
      responseTime: 'Antwortzeit',
      location: 'Standort',
      skills: 'Fähigkeiten',
      contactNow: 'Jetzt kontaktieren',
      viewProfile: 'Profil ansehen',
      unavailable: 'Nicht verfügbar',
    },
  };

  // Detect language from navigator if available
  if (typeof window !== 'undefined') {
    const browserLang = navigator.language.split('-')[0];

    if (browserLang === 'en') {
      return {
        title: 'Find Service Providers',
        subtitle: 'Find qualified providers for your request',
        searchPlaceholder: 'Search for providers...',
        sortBy: 'Sort by',
        sortOptions: {
          rating: 'Rating',
          reviews: 'Reviews',
          price: 'Price',
          newest: 'Newest',
        },
        noResults: 'No providers found',
        noResultsDescription: 'Try adjusting your search criteria.',
        loading: 'Loading providers...',
        provider: {
          company: 'Company',
          freelancer: 'Freelancer',
          rating: 'Rating',
          reviews: 'Reviews',
          completedJobs: 'Completed Jobs',
          responseTime: 'Response Time',
          location: 'Location',
          skills: 'Skills',
          contactNow: 'Contact Now',
          viewProfile: 'View Profile',
          unavailable: 'Unavailable',
        },
      };
    }
  }

  return translations;
};

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
  hourlyRate?: number;
}

export default function CompanyServiceSubcategoryPage() {
  const t = useSimpleTranslations();
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = (params?.uid as string) || '';
  const category = (params?.category as string) || '';
  const subcategory = (params?.subcategory as string) || '';

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'price' | 'newest'>('rating');

  // Chat Modal State
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [companyName, setCompanyName] = useState<string>('');

  // URL-Parameter dekodieren und Kategorie finden
  const decodedCategory = decodeURIComponent(category);
  const decodedSubcategory = decodeURIComponent(subcategory);

  // Normalisierungsfunktion (gleich wie in Navigation verwendet)
  const normalizeToSlug = (str: string) => str.toLowerCase().replace(/\s+/g, '-');

  // Finde die Kategorie durch Vergleich der normalisierten Namen
  const categoryInfo = categories.find(cat => {
    const expectedSlug = normalizeToSlug(cat.title);

    return expectedSlug === decodedCategory;
  });

  // Finde die Unterkategorie durch Vergleich der normalisierten Namen
  const subcategoryName = categoryInfo?.subcategories.find(sub => {
    const expectedSubSlug = normalizeToSlug(sub);

    return expectedSubSlug === decodedSubcategory;
  });

  useEffect(() => {
    if (!categoryInfo || !subcategoryName) return;
    loadProviders();
    loadCompanyData();
  }, [category, subcategory, sortBy]);

  // Lade Unternehmensdaten für Chat
  const loadCompanyData = async () => {
    if (!uid) return;

    try {
      const firmaDoc = await getDocs(query(collection(db, 'firma'), where('__name__', '==', uid)));
      if (!firmaDoc.empty) {
        const data = firmaDoc.docs[0].data();
        setCompanyName(data.companyName || 'Unbekanntes Unternehmen');
      }
    } catch (error) {

    }
  };

  // Chat mit Provider öffnen
  const openChatWithProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    setChatModalOpen(true);
  };

  const loadProviders = async () => {
    try {
      setLoading(true);

      // Query für Firmen mit besserer Fehlerbehandlung - erweitert um verschiedene Aktivitätszustände
      const firmCollectionRef = collection(db, 'firma');
      const firmQuery = query(
        firmCollectionRef,
        limit(20) // Reduziertes Limit für bessere Performance
      );

      // Query für Users/Freelancer mit besserer Fehlerbehandlung
      const userCollectionRef = collection(db, 'users');
      const userQuery = query(
        userCollectionRef,
        where('isFreelancer', '==', true),
        limit(20) // Reduziertes Limit für bessere Performance
      );

      const [firmSnapshot, userSnapshot] = await Promise.all([
        getDocs(firmQuery).catch(error => {

          return { docs: [] };
        }),
        getDocs(userQuery).catch(error => {

          return { docs: [] };
        }),
      ]);

      const firmProviders: Provider[] = ((firmSnapshot.docs || []) as any[])
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            companyName: data.companyName,
            profilePictureFirebaseUrl: data.profilePictureFirebaseUrl,
            profilePictureURL: data.profilePictureURL,
            photoURL: data.photoURL,
            bio: data.description || data.bio,
            location: data.location
              ? data.location
              : `${data.companyCity || ''}, ${data.companyCountry || ''}`
                  .trim()
                  .replace(/^,\s*/, ''),
            skills: data.services || data.skills || [],
            selectedCategory: data.selectedCategory,
            selectedSubcategory: data.selectedSubcategory,
            rating: data.averageRating || 0,
            reviewCount: data.reviewCount || 0,
            completedJobs: data.completedJobs || 0,
            isCompany: true,
            priceRange: data.priceRange,
            responseTime: data.responseTime,
            hourlyRate: data.hourlyRate,
          };
        })
        // Filter nur explizit inaktive Firmen aus
        .filter((provider: Provider) => {
          const data = ((firmSnapshot.docs || []) as any[])
            .find(doc => doc.id === provider.id)
            ?.data();
          // Zeige Provider wenn isActive nicht explizit false ist
          return data?.isActive !== false;
        });

      const userProviders: Provider[] = (userSnapshot.docs || []).map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userName: data.userName || data.displayName,
          profilePictureFirebaseUrl: data.profilePictureFirebaseUrl,
          profilePictureURL: data.profilePictureURL,
          photoURL: data.photoURL,
          bio: data.bio,
          location: data.location,
          skills: data.skills || [],
          rating: data.rating || 0,
          reviewCount: data.reviewCount || 0,
          completedJobs: data.completedJobs || 0,
          isCompany: false,
          priceRange: data.priceRange,
          responseTime: data.responseTime,
        };
      });

      const allProviders = [...firmProviders, ...userProviders];

      // Log specifically Mietkoch providers
      const mietkochers = allProviders.filter(
        p =>
          p.companyName?.toLowerCase().includes('mietkoch') ||
          p.selectedSubcategory?.toLowerCase().includes('mietkoch')
      );

      // Filter nach Subcategory
      let filteredProviders = allProviders.filter(provider => {
        // Für Firmen: prüfe selectedSubcategory
        if (provider.isCompany && provider.selectedSubcategory) {
          const matches =
            provider.selectedSubcategory.toLowerCase() === subcategoryName?.toLowerCase() ||
            provider.selectedSubcategory.toLowerCase() === subcategory.toLowerCase();

          if (matches) {

          }

          return matches;
        }

        // Für Freelancer: prüfe skills (fallback)
        const skillsMatch = provider.skills?.some(
          skill =>
            skill.toLowerCase().includes((subcategoryName || '').toLowerCase()) ||
            skill.toLowerCase().includes(subcategory.toLowerCase())
        );

        if (skillsMatch) {

        }

        return skillsMatch;
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

      // Zeige leere Liste bei Fehlern
      setProviders([]);
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

  const getProviderName = (provider: Provider) => {
    return provider.companyName || provider.userName || t.provider.unavailable;
  };

  // Debug logging für troubleshooting

  if (!categoryInfo || !subcategoryName) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Debug Header - Zeige immer einen Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => router.push(`/dashboard/company/${uid}`)}
                className="text-gray-600 dark:text-gray-400 hover:text-[#14ad9f] transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <div className="flex items-center gap-2 text-sm text-[#14ad9f] mb-1">
                  <span>{decodedCategory}</span>
                  <span>/</span>
                  <span className="font-medium">{decodedSubcategory}</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {decodedSubcategory}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Service-Kategorie nicht gefunden
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Kategorie nicht gefunden
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Die angeforderte Kategorie &quot;{decodedCategory}&quot; oder Unterkategorie &quot;
              {decodedSubcategory}&quot; konnte nicht gefunden werden.
            </p>
            <button
              onClick={() => router.push(`/dashboard/company/${uid}`)}
              className="bg-[#14ad9f] hover:bg-[#129488] text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Zurück zum Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Modern Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push(`/dashboard/company/${uid}`)}
              className="text-gray-600 dark:text-gray-400 hover:text-[#14ad9f] transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-sm text-[#14ad9f] mb-1">
                <span>{categoryInfo.title}</span>
                <span>/</span>
                <span className="font-medium">{subcategoryName}</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {subcategoryName}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {providers.length} {providers.length === 1 ? 'Anbieter' : 'Anbieter'} für{' '}
                {subcategoryName}
              </p>
            </div>
          </div>{' '}
          {/* Modern Filter Bar */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Suchfeld */}
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Nach Anbietern oder Skills suchen..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent transition-colors"
                />
              </div>

              {/* Sortierung */}
              <select
                value={sortBy}
                onChange={e =>
                  setSortBy(e.target.value as 'rating' | 'reviews' | 'price' | 'newest')
                }
                className="px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent transition-colors"
              >
                <option value="rating">Beste Bewertung</option>
                <option value="reviews">Meiste Bewertungen</option>
                <option value="price">Preis</option>
                <option value="newest">Neueste</option>
              </select>
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
              {t.noResults}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{t.noResultsDescription}</p>
            <button
              onClick={() => router.push(`/dashboard/company/${uid}`)}
              className="text-blue-600 hover:text-blue-700"
            >
              Zurück zum Dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {providers.map(provider => (
              <div
                key={provider.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 overflow-hidden group"
              >
                {/* Provider Card Header */}
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative">
                      <img
                        src={getProfileImage(provider)}
                        alt={getProviderName(provider)}
                        className="w-16 h-16 rounded-full object-cover"
                        onError={e => {
                          (e.target as HTMLImageElement).src = '/images/default-avatar.jpg';
                        }}
                      />
                      {provider.isCompany && (
                        <div className="absolute -bottom-1 -right-1 bg-[#14ad9f] text-white text-xs px-2 py-0.5 rounded-full">
                          PRO
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {getProviderName(provider)}
                      </h3>

                      {provider.location && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <MapPin className="w-3 h-3" />
                          {provider.location}
                        </div>
                      )}

                      {/* Rating */}
                      {(provider.rating ?? 0) > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < Math.floor(provider.rating ?? 0)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {(provider.rating ?? 0).toFixed(1)}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            ({provider.reviewCount})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      {provider.hourlyRate && (
                        <div className="text-lg font-bold text-[#14ad9f]">
                          €{provider.hourlyRate}/h
                        </div>
                      )}
                      {provider.responseTime && (
                        <div className="text-xs text-gray-500 mt-1">~{provider.responseTime}</div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {provider.bio && (
                    <p
                      className="text-gray-600 dark:text-gray-400 text-sm mb-4"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {provider.bio}
                    </p>
                  )}

                  {/* Skills Tags */}
                  {provider.skills && provider.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {provider.skills.slice(0, 4).map((skill, index) => (
                        <span
                          key={index}
                          className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                      {provider.skills.length > 4 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                          +{provider.skills.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <div className="flex items-center gap-3">
                      {provider.completedJobs && provider.completedJobs > 0 && (
                        <div className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {provider.completedJobs} Projekte
                        </div>
                      )}
                      {provider.responseTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {provider.responseTime} Antwort
                        </div>
                      )}
                    </div>
                    <ResponseTimeBadge providerId={provider.id} guaranteeHours={24} />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        router.push(`/dashboard/company/${uid}/provider/${provider.id}`)
                      }
                      className="flex-1 border border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white py-2 px-4 rounded-lg font-medium transition-colors text-sm"
                    >
                      Profil ansehen
                    </button>
                    <button
                      onClick={() => openChatWithProvider(provider)}
                      className="flex-1 bg-[#14ad9f] hover:bg-teal-600 text-white py-2 px-4 rounded-lg font-medium transition-colors text-sm"
                    >
                      Kontaktieren
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Direct Chat Modal */}
      {selectedProvider && (
        <DirectChatModal
          isOpen={chatModalOpen}
          onClose={() => setChatModalOpen(false)}
          providerId={selectedProvider.id}
          providerName={getProviderName(selectedProvider)}
          companyId={uid}
          companyName={companyName}
        />
      )}
    </div>
  );
}
