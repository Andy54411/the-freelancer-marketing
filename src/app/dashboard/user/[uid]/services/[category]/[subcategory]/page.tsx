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

      console.log('[ServicePage] Executing queries...');

      const [firmSnapshot, userSnapshot] = await Promise.all([
        getDocs(firmQuery).catch(error => {
          console.error('[ServicePage] Error loading firma collection:', error);
          return { docs: [] };
        }),
        getDocs(userQuery).catch(error => {
          console.error('[ServicePage] Error loading users collection:', error);
          return { docs: [] };
        }),
      ]);

      console.log('[ServicePage] Query results:', {
        firmDocs: firmSnapshot.docs?.length || 0,
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
          priceRange: data.priceRange,
          responseTime: data.responseTime,
        };
      });

      console.log('[ServicePage] Providers mapped:', {
        firmProviders: firmProviders.length,
        userProviders: userProviders.length,
      });

      console.log('[ServicePage] Providers mapped:', {
        firmProviders: firmProviders.length,
        userProviders: userProviders.length,
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push(`/dashboard/user/${uid}`)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                <span>{categoryInfo.title}</span>
                <span>/</span>
                <span>{subcategoryName}</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {subcategoryName}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {providers.length} {providers.length === 1 ? 'Anbieter' : 'Anbieter'} für{' '}
                {subcategoryName}
              </p>
            </div>
          </div>

          {/* Filter und Suche */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Suchfeld */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Nach Anbietern oder Skills suchen..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Sortierung */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'rating' | 'reviews' | 'price' | 'newest')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="rating">Beste Bewertung</option>
              <option value="reviews">Meiste Bewertungen</option>
              <option value="price">Preis</option>
              <option value="newest">Neueste</option>
            </select>
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
              {searchQuery && (
                <span className="block mt-2">Versuchen Sie, Ihre Suchkriterien anzupassen.</span>
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setSearchQuery('')}
                className="text-blue-600 hover:text-blue-700 px-4 py-2 rounded-lg border border-blue-200 hover:bg-blue-50"
              >
                Suche zurücksetzen
              </button>
              <button
                onClick={() => router.push(`/dashboard/user/${uid}`)}
                className="text-gray-600 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                Zurück zum Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {providers.map(provider => (
              <div
                key={provider.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-6">
                  <img
                    src={getProfileImage(provider)}
                    alt={getProviderName(provider)}
                    className="w-20 h-20 rounded-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).src = '/images/default-avatar.png';
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {getProviderName(provider)}
                          {provider.isCompany && (
                            <span className="ml-3 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                              Firma
                            </span>
                          )}
                        </h3>

                        <div className="flex items-center gap-4 mt-2">
                          {provider.location && (
                            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                              <MapPin className="w-4 h-4" />
                              {provider.location}
                            </div>
                          )}

                          {(provider.rating ?? 0) > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {(provider.rating ?? 0).toFixed(1)}
                              </span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                ({provider.reviewCount} Bewertungen)
                              </span>
                            </div>
                          )}

                          {provider.completedJobs && provider.completedJobs > 0 && (
                            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                              <Briefcase className="w-4 h-4" />
                              {provider.completedJobs} Aufträge
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        {provider.priceRange && (
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {provider.priceRange}
                          </div>
                        )}
                        {provider.responseTime && (
                          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <Clock className="w-4 h-4" />
                            {provider.responseTime}
                          </div>
                        )}
                      </div>
                    </div>

                    {provider.bio && (
                      <p className="text-gray-600 dark:text-gray-400 mt-3 line-clamp-2">
                        {provider.bio}
                      </p>
                    )}

                    {provider.skills && provider.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {provider.skills.slice(0, 6).map((skill, index) => (
                          <span
                            key={index}
                            className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                        {provider.skills.length > 6 && (
                          <span className="text-sm text-gray-500 dark:text-gray-400 px-3 py-1">
                            +{provider.skills.length - 6} weitere
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-4">
                      <button className="bg-[#14ad9f] hover:bg-teal-600 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                        Kontaktieren
                      </button>
                      <button
                        onClick={() =>
                          router.push(`/dashboard/user/${uid}/provider/${provider.id}`)
                        }
                        className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
                      >
                        Profil anzeigen
                      </button>
                    </div>
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
