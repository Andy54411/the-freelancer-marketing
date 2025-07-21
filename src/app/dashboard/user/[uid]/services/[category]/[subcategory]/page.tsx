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
  priceRange?: string;
  responseTime?: string;
  hourlyRate?: number;
}

export default function UserServiceSubcategoryPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = params.uid as string;
  const category = params.category as string;
  const subcategory = params.subcategory as string;

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

      const firmProviders: Provider[] = (firmSnapshot.docs || [])
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
            isVerified: data.stripeVerificationStatus === 'verified' || data.isVerified || false,
            priceRange: data.priceRange,
            responseTime: data.responseTime,
            hourlyRate: data.hourlyRate,
          };
        })
        // Filter nur explizit inaktive Firmen aus
        .filter(provider => {
          const data = (firmSnapshot.docs || []).find(doc => doc.id === provider.id)?.data();
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
          isVerified: data.stripeVerificationStatus === 'verified' || data.isVerified || false,
          priceRange: data.priceRange,
          responseTime: data.responseTime,
        };
      });

      console.log('[ServicePage] Providers mapped:', {
        firmProviders: firmProviders.length,
        userProviders: userProviders.length,
      });

      const allProviders = [...firmProviders, ...userProviders];

      console.log('[ServicePage] All providers:', allProviders.length);
      console.log('[ServicePage] Firma providers after filter:', firmProviders.length);

      // Log all providers with their categories for debugging
      console.log(
        '[ServicePage] All providers with categories:',
        allProviders.map(p => ({
          name: p.companyName || p.userName,
          selectedSubcategory: p.selectedSubcategory,
          selectedCategory: p.selectedCategory,
          isCompany: p.isCompany,
          skills: p.skills,
        }))
      );

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

      // Filter nach Subcategory
      let filteredProviders = allProviders.filter(provider => {
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

        // Für Freelancer: prüfe skills (fallback)
        const skillsMatch = provider.skills?.some(
          skill =>
            skill.toLowerCase().includes((subcategoryName || '').toLowerCase()) ||
            skill.toLowerCase().includes(subcategory.toLowerCase())
        );

        if (skillsMatch) {
          console.log('[ServicePage] Skills match found:', {
            name: provider.userName,
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
    <div className="min-h-screen bg-white">
      {/* Hero Section - Fiverr Style */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white">
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
                  className="w-full pl-12 pr-4 py-3 border-0 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-white/20 focus:outline-none shadow-lg"
                />
              </div>

              {/* Sortierung */}
              <select
                value={sortBy}
                onChange={e =>
                  setSortBy(e.target.value as 'rating' | 'reviews' | 'price' | 'newest')
                }
                className="px-4 py-3 border-0 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-white/20 focus:outline-none shadow-lg cursor-pointer"
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

      {/* Services Grid - Fiverr Style */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse"
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
            <div className="max-w-md mx-auto">
              <Briefcase className="w-20 h-20 text-gray-300 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Keine Services gefunden</h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Derzeit sind keine Anbieter für {subcategoryName} verfügbar.
                {searchQuery && (
                  <span className="block mt-2">Versuchen Sie, Ihre Suchkriterien anzupassen.</span>
                )}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setSearchQuery('')}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Suche zurücksetzen
                </button>
                <button
                  onClick={() => router.push(`/dashboard/user/${uid}`)}
                  className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-lg font-medium transition-colors"
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
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer"
                onClick={() => router.push(`/profile/${provider.id}`)}
              >
                {/* Service Image/Avatar */}
                <div className="relative aspect-video bg-gradient-to-br from-green-50 to-green-100 p-6 flex items-center justify-center">
                  <img
                    src={getProfileImage(provider)}
                    alt={getProviderName(provider)}
                    className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md group-hover:scale-110 transition-transform duration-300"
                    onError={e => {
                      (e.target as HTMLImageElement).src = '/images/default-avatar.png';
                    }}
                  />
                  {provider.isCompany && (
                    <div className="absolute top-3 right-3">
                      <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                        Pro
                      </span>
                    </div>
                  )}
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
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-green-600 transition-colors">
                    {provider.bio || `${subcategoryName} Service von ${getProviderName(provider)}`}
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
                        <span className="text-xs text-gray-400 px-2 py-1">
                          +{provider.skills.length - 3}
                        </span>
                      )}
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
                        <div className="text-sm font-bold text-gray-900">{provider.priceRange}</div>
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
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                    >
                      Kontakt
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        router.push(`/profile/${provider.id}`);
                      }}
                      className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
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
  );
}
