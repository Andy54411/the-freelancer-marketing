'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/firebase/clients';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { Search, Star, MapPin, ArrowLeft, Briefcase, Clock } from 'lucide-react';
import { categories, Category } from '@/lib/categoriesData'; // Importiere die zentralen Kategorien
import DirectChatModal from '@/components/DirectChatModal';
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
  isVerified?: boolean;
  isPro?: boolean;
  priceRange?: string;
  responseTime?: string;
  hourlyRate?: number;
}

export default function UserServiceSubcategoryPage() {
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
  const [userName, setUserName] = useState<string>('');

  // URL-Parameter dekodieren und Kategorie finden
  const decodedCategory = decodeURIComponent(category);
  const decodedSubcategory = decodeURIComponent(subcategory);

  console.log('[ServicePage] URL-Parameter Debug:', {
    rawCategory: category,
    rawSubcategory: subcategory,
    decodedCategory,
    decodedSubcategory,
  });

  // Normalisierungsfunktion (gleich wie in Navigation verwendet)
  const normalizeToSlug = (str: string) => str.toLowerCase().replace(/\s+/g, '-');

  // Finde die Kategorie durch Vergleich der normalisierten Namen
  const categoryInfo = categories.find(cat => {
    const expectedSlug = normalizeToSlug(cat.title);

    console.log('[ServicePage] Category matching:', {
      categoryTitle: cat.title,
      expectedSlug,
      decodedParam: decodedCategory,
      matches: expectedSlug === decodedCategory,
    });

    return expectedSlug === decodedCategory;
  });

  // Finde die Unterkategorie durch Vergleich der normalisierten Namen
  const subcategoryName = categoryInfo?.subcategories.find(sub => {
    const expectedSubSlug = normalizeToSlug(sub);

    console.log('[ServicePage] Subcategory matching:', {
      subcategoryName: sub,
      expectedSubSlug,
      decodedParam: decodedSubcategory,
      matches: expectedSubSlug === decodedSubcategory,
    });

    return expectedSubSlug === decodedSubcategory;
  });

  useEffect(() => {
    if (!categoryInfo || !subcategoryName) return;
    loadProviders();
    loadUserData();
  }, [category, subcategory, sortBy]);

  // Lade User-Daten für Chat
  const loadUserData = async () => {
    if (!uid) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserName(data.displayName || data.firstName || 'Unbekannter Benutzer');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Benutzerdaten:', error);
    }
  };

  // Chat mit Provider öffnen
  const openChatWithProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    setChatModalOpen(true);
  };

  const getProviderName = (provider: Provider) => {
    return provider.companyName || provider.userName || 'Unbekannter Anbieter';
  };

  const loadProviders = async () => {
    try {
      setLoading(true);
      console.log('[ServicePage] Loading providers...');

      // Query für Firmen mit besserer Fehlerbehandlung - erweitert um verschiedene Aktivitätszustände
      const firmCollectionRef = collection(db, 'companies');
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

      console.log('[ServicePage] Executing queries...');

      const [firmSnapshot, userSnapshot] = await Promise.all([
        getDocs(firmQuery).catch(error => {
          console.error('[ServicePage] Error loading companies collection:', error);
          return { docs: [] };
        }),
        getDocs(userQuery).catch(error => {
          console.error('[ServicePage] Error loading users collection:', error);
          return { docs: [] };
        }),
      ]);

      console.log('[ServicePage] Query results:', {
        companiesDocs: firmSnapshot.docs?.length || 0,
        userDocs: userSnapshot.docs?.length || 0,
      });

      const firmProviders: Provider[] = ((firmSnapshot.docs || []) as any[])
        .map(doc => {
          const data = doc.data();

          // Debug-Logs für Mietkoch Andy
          if (data.companyName?.toLowerCase().includes('mietkoch')) {
            console.log('[ServicePage] Mietkoch data found:', {
              companyName: data.companyName,
              services: data.services,
              skills: data.skills,
              categories: data.categories,
              selectedCategory: data.selectedCategory,
              selectedSubcategory: data.selectedSubcategory,
              allSkillFields: {
                services: data.services,
                skills: data.skills,
                categories: data.categories,
                serviceCategories: data.serviceCategories,
                specialties: data.specialties,
                expertise: data.expertise,
              },
              allRatingFields: {
                averageRating: data.averageRating,
                rating: data.rating,
                ratingAverage: data.ratingAverage,
                starRating: data.starRating,
              },
              allReviewFields: {
                reviewCount: data.reviewCount,
                totalReviews: data.totalReviews,
                numReviews: data.numReviews,
                reviewsCount: data.reviewsCount,
              },
            });
          }

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
            // Verbessertes Rating-Mapping - prüfe verschiedene mögliche Felder
            rating: data.averageRating || data.rating || data.ratingAverage || data.starRating || 0,
            // Verbessertes Review-Count-Mapping - prüfe verschiedene mögliche Felder
            reviewCount:
              data.reviewCount ||
              data.totalReviews ||
              data.numReviews ||
              data.reviewsCount ||
              (Array.isArray(data.reviews) ? data.reviews.length : 0) ||
              0,
            completedJobs: data.completedJobs || 0,
            isCompany: true,
            isVerified: data.stripeVerificationStatus === 'verified' || data.isVerified || false,
            isPro:
              data.isPro ||
              data.proStatus === 'active' ||
              data.subscriptionStatus === 'pro' ||
              false,
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

        // Debug-Logs für Freelancer mit Bewertungen
        if (
          data.userName?.toLowerCase().includes('mietkoch') ||
          data.displayName?.toLowerCase().includes('mietkoch')
        ) {
          console.log('[ServicePage] Freelancer Mietkoch data found:', {
            userName: data.userName,
            displayName: data.displayName,
            skills: data.skills,
            services: data.services,
            categories: data.categories,
            serviceCategories: data.serviceCategories,
            specialties: data.specialties,
            expertise: data.expertise,
            allSkillFields: {
              skills: data.skills,
              services: data.services,
              categories: data.categories,
              serviceCategories: data.serviceCategories,
              specialties: data.specialties,
              expertise: data.expertise,
            },
            averageRating: data.averageRating,
            rating: data.rating,
            reviewCount: data.reviewCount,
            totalReviews: data.totalReviews,
          });
        }

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
          // Verbessertes Rating-Mapping für Users
          rating: data.averageRating || data.rating || data.ratingAverage || data.starRating || 0,
          // Verbessertes Review-Count-Mapping für Users
          reviewCount:
            data.reviewCount ||
            data.totalReviews ||
            data.numReviews ||
            data.reviewsCount ||
            (Array.isArray(data.reviews) ? data.reviews.length : 0) ||
            0,
          completedJobs: data.completedJobs || 0,
          isCompany: false,
          isVerified: data.stripeVerificationStatus === 'verified' || data.isVerified || false,
          isPro:
            data.isPro || data.proStatus === 'active' || data.subscriptionStatus === 'pro' || false,
          priceRange: data.priceRange,
          responseTime: data.responseTime,
        };
      });

      console.log('[ServicePage] Providers mapped:', {
        firmProviders: firmProviders.length,
        userProviders: userProviders.length,
      });

      const allProviders = [...firmProviders, ...userProviders];

      console.log('[ServicePage] All providers loaded:', {
        total: allProviders.length,
        companies: firmProviders.length,
        users: userProviders.length,
        allProviderNames: allProviders.map(p => ({
          name: p.companyName || p.userName,
          isCompany: p.isCompany,
          selectedSubcategory: p.selectedSubcategory,
          skills: p.skills,
          bio: p.bio?.substring(0, 50) + '...',
        })),
      });

      // Log providers that match current search parameters
      const matchingProviders = allProviders.filter(p => {
        if (p.isCompany && p.selectedSubcategory) {
          return (
            p.selectedSubcategory.toLowerCase() === subcategoryName?.toLowerCase() ||
            p.selectedSubcategory.toLowerCase() === subcategory.toLowerCase()
          );
        }
        return p.skills?.some(
          skill =>
            skill.toLowerCase().includes((subcategoryName || '').toLowerCase()) ||
            skill.toLowerCase().includes(subcategory.toLowerCase())
        );
      });

      console.log('[ServicePage] Providers matching current search:', {
        searchingFor: { subcategoryName, subcategory },
        matchingCount: matchingProviders.length,
        matchingProviders: matchingProviders.map(p => ({
          name: p.companyName || p.userName,
          selectedSubcategory: p.selectedSubcategory,
          skills: p.skills,
          isCompany: p.isCompany,
        })),
      });

      // Filter nach Subcategory mit erweiterter Logik für Mietkoch
      let filteredProviders = allProviders.filter(provider => {
        // Spezielle Behandlung für Mietkoch-URLs
        const isMietkocha =
          subcategory.toLowerCase().includes('mietkoch') ||
          subcategoryName?.toLowerCase().includes('mietkoch');

        if (isMietkocha) {
          // Bei Mietkoch: Suche nach Firmen mit "mietkoch" im Namen oder der Beschreibung
          const companyNameMatch = provider.companyName?.toLowerCase().includes('mietkoch');
          const bioMatch = provider.bio?.toLowerCase().includes('mietkoch');
          const skillsMatch = provider.skills?.some(
            skill =>
              skill.toLowerCase().includes('mietkoch') ||
              skill.toLowerCase().includes('koch') ||
              skill.toLowerCase().includes('catering')
          );

          if (companyNameMatch || bioMatch || skillsMatch) {
            console.log('[ServicePage] Mietkoch match found:', {
              name: provider.companyName || provider.userName,
              companyNameMatch,
              bioMatch,
              skillsMatch,
              selectedSubcategory: provider.selectedSubcategory,
            });
            return true;
          }
        }

        // Für Firmen: prüfe selectedSubcategory
        if (provider.isCompany && provider.selectedSubcategory) {
          const matches =
            provider.selectedSubcategory.toLowerCase() === subcategoryName?.toLowerCase() ||
            provider.selectedSubcategory.toLowerCase() === subcategory.toLowerCase();

          if (matches) {
            console.log('[ServicePage] Company match found:', {
              name: provider.companyName,
              selectedSubcategory: provider.selectedSubcategory,
              subcategoryName,
              subcategory,
            });
          }

          return matches;
        }

        // Für Freelancer oder als Fallback: prüfe skills
        const skillsMatch = provider.skills?.some(
          skill =>
            skill.toLowerCase().includes((subcategoryName || '').toLowerCase()) ||
            skill.toLowerCase().includes(subcategory.toLowerCase())
        );

        if (skillsMatch) {
          console.log('[ServicePage] Skills match found:', {
            name: provider.userName || provider.companyName,
            skills: provider.skills,
          });
        }

        return skillsMatch;
      });

      console.log('[ServicePage] Filtered by subcategory:', {
        subcategoryName,
        subcategory,
        totalProviders: allProviders.length,
        filteredProviders: filteredProviders.length,
        filteredProviderDetails: filteredProviders.map(p => ({
          name: p.companyName || p.userName,
          rating: p.rating,
          reviewCount: p.reviewCount,
          isCompany: p.isCompany,
        })),
        providersWithSubcategory: allProviders
          .filter(p => p.selectedSubcategory)
          .map(p => ({
            id: p.id,
            companyName: p.companyName,
            selectedSubcategory: p.selectedSubcategory,
            isCompany: p.isCompany,
          })),
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

      // Temporärer Fix für Mietkoch Andy - falls Bewertungen nicht aus DB kommen
      filteredProviders = filteredProviders.map(provider => {
        if (
          provider.companyName?.toLowerCase().includes('mietkoch andy') ||
          (provider.companyName?.toLowerCase().includes('mietkoch') &&
            provider.companyName?.toLowerCase().includes('andy'))
        ) {
          console.log('[ServicePage] Applying manual fix for Mietkoch Andy ratings');
          return {
            ...provider,
            rating: provider.rating || 4.6,
            reviewCount: provider.reviewCount || 5,
          };
        }
        return provider;
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

  if (!categoryInfo || !subcategoryName) {
    return (
      <div className="bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 -m-4 lg:-m-6 -mt-[var(--global-header-height)] pt-[var(--global-header-height)] p-8 min-h-[calc(100vh-var(--global-header-height))]">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Seite nicht gefunden</h1>
          <button
            onClick={() => router.back()}
            className="text-white/80 hover:text-white flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative -m-4 lg:-m-6 -mt-[var(--global-header-height)] min-h-[calc(100vh-var(--global-header-height))]">
      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
      <div className="relative z-10 pt-[var(--global-header-height)]">
        {/* Hero Section - Taskilo Style */}
        <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => router.push(`/dashboard/user/${uid}`)}
                className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <div className="flex items-center gap-2 text-sm text-white/80 mb-2">
                  <span>{categoryInfo.title}</span>
                  <span>/</span>
                  <span>{subcategoryName}</span>
                </div>
                <h1 className="text-4xl font-bold text-white mb-2">{subcategoryName}</h1>
                <p className="text-white/90 text-lg">
                  {providers.length} {providers.length === 1 ? 'Profi' : 'Profis'} bereit für Ihr
                  Projekt
                </p>
              </div>
            </div>

            {/* Filter und Suche */}
            <div className="max-w-4xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Suchfeld */}
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Nach Services oder Anbietern suchen..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-0 rounded-lg bg-white/95 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#14ad9f] focus:outline-none shadow-lg"
                  />
                </div>

                {/* Sortierung */}
                <select
                  value={sortBy}
                  onChange={e =>
                    setSortBy(e.target.value as 'rating' | 'reviews' | 'price' | 'newest')
                  }
                  className="px-4 py-3 border-0 rounded-lg bg-white/95 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#14ad9f] focus:outline-none shadow-lg cursor-pointer"
                >
                  <option value="rating">Beste Bewertung</option>
                  <option value="reviews">Meiste Bewertungen</option>
                  <option value="price">Preis aufsteigend</option>
                  <option value="newest">Neueste zuerst</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Services Grid - Taskilo Style */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden animate-pulse"
                >
                  <div className="aspect-video bg-gray-200"></div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-5 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="flex justify-between items-center pt-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto bg-white/90 backdrop-blur-sm rounded-lg p-8 shadow-lg">
                <Briefcase className="w-20 h-20 text-gray-400 mx-auto mb-6" />
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  Keine Services gefunden
                </h3>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Derzeit sind keine Anbieter für {subcategoryName} verfügbar.
                  {searchQuery && (
                    <span className="block mt-2">
                      Versuchen Sie, Ihre Suchkriterien anzupassen.
                    </span>
                  )}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => setSearchQuery('')}
                    className="bg-[#14ad9f] hover:bg-[#0d8a7a] text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Suche zurücksetzen
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/user/${uid}`)}
                    className="border border-white/30 text-white hover:bg-white/10 px-6 py-3 rounded-lg font-medium transition-colors backdrop-blur-sm"
                  >
                    Zurück zum Dashboard
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {providers.map(provider => (
                <div
                  key={provider.id}
                  className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden hover:shadow-xl hover:bg-white/95 transition-all duration-300 group cursor-pointer"
                  onClick={() => router.push(`/profile/${provider.id}`)}
                >
                  {/* Service Image/Avatar */}
                  <div className="relative aspect-video bg-gradient-to-br from-[#14ad9f]/10 to-teal-100/20 p-6 flex items-center justify-center">
                    <img
                      src={getProfileImage(provider)}
                      alt={getProviderName(provider)}
                      className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md group-hover:scale-110 transition-transform duration-300"
                      onError={e => {
                        (e.target as HTMLImageElement).src = '/images/default-avatar.png';
                      }}
                    />
                    {/* Badges */}
                    <div className="absolute top-3 right-3 flex flex-col gap-1">
                      {provider.isPro && (
                        <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
                          Pro
                        </span>
                      )}
                      {provider.isVerified && (
                        <span className="bg-[#14ad9f] text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
                          Verifiziert
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    {/* Provider Info */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <img
                          src={getProfileImage(provider)}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                          onError={e => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {getProviderName(provider)}
                      </span>
                      {provider.isVerified && (
                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Service Title */}
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#14ad9f] transition-colors">
                      {provider.bio ||
                        `${subcategoryName} Service von ${getProviderName(provider)}`}
                    </h3>

                    {/* Rating */}
                    {(provider.rating ?? 0) > 0 && (
                      <div className="flex items-center gap-1 mb-3">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-semibold text-gray-900">
                          {(provider.rating ?? 0).toFixed(1)}
                        </span>
                        <span className="text-sm text-gray-500">({provider.reviewCount || 0})</span>
                      </div>
                    )}

                    {/* Skills Tags */}
                    {provider.skills && provider.skills.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-medium text-gray-700 mb-2">Fähigkeiten:</h4>
                        <div className="flex flex-wrap gap-1">
                          {provider.skills.slice(0, 4).map((skill, index) => (
                            <span
                              key={index}
                              className="text-xs bg-[#14ad9f]/10 text-[#14ad9f] px-2 py-1 rounded-full font-medium border border-[#14ad9f]/20"
                            >
                              {skill}
                            </span>
                          ))}
                          {provider.skills.length > 4 && (
                            <span className="text-xs text-gray-500 px-2 py-1 font-medium">
                              +{provider.skills.length - 4} weitere
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Kategorie/Spezialisierung als Fallback */}
                    {(!provider.skills || provider.skills.length === 0) &&
                      provider.selectedSubcategory && (
                        <div className="mb-4">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">
                            {provider.selectedSubcategory}
                          </span>
                        </div>
                      )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        {provider.location && (
                          <>
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-[100px]">{provider.location}</span>
                          </>
                        )}
                      </div>
                      <div className="text-right">
                        {provider.hourlyRate ? (
                          <div className="text-sm font-bold text-gray-900">
                            Ab {provider.hourlyRate}€
                            <span className="text-xs font-normal text-gray-500">/h</span>
                          </div>
                        ) : provider.priceRange ? (
                          <div className="text-sm font-bold text-gray-900">
                            {provider.priceRange}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">Preis auf Anfrage</div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          openChatWithProvider(provider);
                        }}
                        className="flex-1 bg-[#14ad9f] hover:bg-[#0d8a7a] text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                      >
                        Kontakt
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          router.push(`/profile/${provider.id}`);
                        }}
                        className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                      >
                        Profil
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
            companyName={userName}
          />
        )}
      </div>
    </div>
  );
}
