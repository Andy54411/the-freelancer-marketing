'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/firebase/clients';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { Search, Filter, Users, Star, MapPin, ArrowLeft } from 'lucide-react';

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
    rating?: number;
    reviewCount?: number;
    completedJobs?: number;
    isCompany?: boolean;
}

const serviceCategories = {
    'webdesign': {
        name: 'Webdesign',
        subcategories: ['Landing Pages', 'E-Commerce', 'WordPress', 'UI/UX Design', 'Mobile Design']
    },
    'grafikdesign': {
        name: 'Grafikdesign',
        subcategories: ['Logo Design', 'Branding', 'Print Design', 'Illustration', 'Packaging']
    },
    'marketing': {
        name: 'Marketing',
        subcategories: ['Social Media', 'SEO', 'Content Marketing', 'Email Marketing', 'PPC']
    },
    'programmierung': {
        name: 'Programmierung',
        subcategories: ['Web Development', 'Mobile Apps', 'Desktop Software', 'API Development', 'Database']
    },
    'schreiben': {
        name: 'Schreiben',
        subcategories: ['Blog Posts', 'Copywriting', 'Technical Writing', 'Translation', 'Proofreading']
    },
    'video': {
        name: 'Video',
        subcategories: ['Video Editing', 'Animation', 'Explainer Videos', 'Commercial Videos', 'Motion Graphics']
    }
};

export default function CategoryPage() {
    const params = useParams();
    const router = useRouter();
    const category = params.category as string;

    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
    const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'newest'>('rating');

    const categoryInfo = serviceCategories[category as keyof typeof serviceCategories];

    useEffect(() => {
        if (!categoryInfo) return;
        loadProviders();
    }, [category, selectedSubcategory, sortBy]);

    const loadProviders = async () => {
        try {
            setLoading(true);

            // Query für Firmen
            const firmCollectionRef = collection(db, 'firma');
            let firmQuery = query(
                firmCollectionRef,
                where('isActive', '==', true),
                limit(20)
            );

            // Query für Users/Freelancer
            const userCollectionRef = collection(db, 'users');
            let userQuery = query(
                userCollectionRef,
                where('isFreelancer', '==', true),
                limit(20)
            );

            const [firmSnapshot, userSnapshot] = await Promise.all([
                getDocs(firmQuery),
                getDocs(userQuery)
            ]);

            const firmProviders: Provider[] = firmSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    companyName: data.companyName,
                    profilePictureFirebaseUrl: data.profilePictureFirebaseUrl,
                    profilePictureURL: data.profilePictureURL,
                    photoURL: data.photoURL,
                    bio: data.description || data.bio,
                    location: data.location,
                    skills: data.services || data.skills || [],
                    rating: data.averageRating || 0,
                    reviewCount: data.reviewCount || 0,
                    completedJobs: data.completedJobs || 0,
                    isCompany: true
                };
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
                    skills: data.skills || [],
                    rating: data.rating || 0,
                    reviewCount: data.reviewCount || 0,
                    completedJobs: data.completedJobs || 0,
                    isCompany: false
                };
            });

            const allProviders = [...firmProviders, ...userProviders];

            // Filter und sortieren
            let filteredProviders = allProviders;

            if (selectedSubcategory) {
                filteredProviders = allProviders.filter(provider =>
                    provider.skills?.some(skill =>
                        skill.toLowerCase().includes(selectedSubcategory.toLowerCase())
                    )
                );
            }

            if (searchQuery) {
                filteredProviders = filteredProviders.filter(provider =>
                    (provider.companyName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (provider.userName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (provider.bio?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (provider.skills?.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase())))
                );
            }

            // Sortierung
            filteredProviders.sort((a, b) => {
                switch (sortBy) {
                    case 'rating':
                        return (b.rating || 0) - (a.rating || 0);
                    case 'reviews':
                        return (b.reviewCount || 0) - (a.reviewCount || 0);
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
        return provider.profilePictureFirebaseUrl ||
            provider.profilePictureURL ||
            provider.photoURL ||
            '/images/default-avatar.png';
    };

    const getProviderName = (provider: Provider) => {
        return provider.companyName || provider.userName || 'Unbekannter Anbieter';
    };

    if (!categoryInfo) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
                <div className="max-w-2xl mx-auto text-center">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        Kategorie nicht gefunden
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
                            onClick={() => router.back()}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                {categoryInfo.name}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                                Finde qualifizierte Anbieter für {categoryInfo.name.toLowerCase()}
                            </p>
                        </div>
                    </div>

                    {/* Filter und Suche */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Suchfeld */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Anbieter suchen..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Subkategorie Filter */}
                        <select
                            value={selectedSubcategory}
                            onChange={(e) => setSelectedSubcategory(e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Alle Bereiche</option>
                            {categoryInfo.subcategories.map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                            ))}
                        </select>

                        {/* Sortierung */}
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'rating' | 'reviews' | 'newest')}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="rating">Beste Bewertung</option>
                            <option value="reviews">Meiste Bewertungen</option>
                            <option value="newest">Neueste</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Anbieter Liste */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : providers.length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            Keine Anbieter gefunden
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Versuche es mit anderen Suchbegriffen oder Filtern.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {providers.map(provider => (
                            <div key={provider.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer">
                                <div className="flex items-start gap-4">
                                    <img
                                        src={getProfileImage(provider)}
                                        alt={getProviderName(provider)}
                                        className="w-16 h-16 rounded-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = '/images/default-avatar.png';
                                        }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                            {getProviderName(provider)}
                                            {provider.isCompany && (
                                                <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                                    Firma
                                                </span>
                                            )}
                                        </h3>

                                        {provider.location && (
                                            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                <MapPin className="w-4 h-4" />
                                                {provider.location}
                                            </div>
                                        )}

                    {(provider.rating ?? 0) > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {(provider.rating ?? 0).toFixed(1)}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          ({provider.reviewCount} Bewertungen)
                        </span>
                      </div>
                    )}

                                        {provider.bio && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                                                {provider.bio}
                                            </p>
                                        )}

                                        {provider.skills && provider.skills.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-3">
                                                {provider.skills.slice(0, 3).map((skill, index) => (
                                                    <span
                                                        key={index}
                                                        className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded"
                                                    >
                                                        {skill}
                                                    </span>
                                                ))}
                                                {provider.skills.length > 3 && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        +{provider.skills.length - 3} weitere
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}