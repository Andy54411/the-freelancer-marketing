'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { HeroHeader } from '@/components/hero8-header';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { FiStar, FiMapPin, FiClock, FiUser, FiFilter, FiGrid, FiList } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';

interface ServiceProvider {
    uid: string;
    username: string;
    displayName: string;
    companyName?: string;
    profilePictureFirebaseUrl?: string;
    profilePictureURL?: string;
    description: string;
    city: string;
    country: string;
    hourlyRate: number;
    selectedSubcategory: string;
    selectedCategory: string;
    averageRating?: number;
    totalReviews?: number;
    responseTime?: number;
    completionRate?: number;
    portfolio?: any[];
    isOnline?: boolean;
    user_type: string;
}

interface ServiceCategoryPageProps {
    params: {
        category: string;
        subcategory: string;
    };
}

const ServiceCategoryPage: React.FC<ServiceCategoryPageProps> = () => {
    const params = useParams();
    const router = useRouter();
    const [providers, setProviders] = useState<ServiceProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sortBy, setSortBy] = useState<'rating' | 'price' | 'responseTime'>('rating');
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 200]);

    const category = decodeURIComponent(params.category as string || '');
    const subcategory = decodeURIComponent(params.subcategory as string || '');
    
    // Konvertiere URL-Format zurück zu lesbarem Format
    const categoryName = category.replace(/-/g, ' ').replace(/%26/g, '&');
    const subcategoryName = subcategory.replace(/-/g, ' ').replace(/%26/g, '&');

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                setLoading(true);
                const usersRef = collection(db, 'users');
                
                // Query für Dienstleister mit der gewählten Unterkategorie
                const providersQuery = query(
                    usersRef,
                    where('user_type', '==', 'firma'),
                    where('selectedSubcategory', '==', subcategoryName),
                    orderBy('createdAt', 'desc')
                );

                const querySnapshot = await getDocs(providersQuery);
                const providersData: ServiceProvider[] = [];

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.selectedSubcategory === subcategoryName) {
                        providersData.push({
                            uid: doc.id,
                            username: data.username || '',
                            displayName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
                            companyName: data.companyName || '',
                            profilePictureFirebaseUrl: data.profilePictureFirebaseUrl,
                            profilePictureURL: data.profilePictureURL,
                            description: data.description || 'Professioneller Dienstleister',
                            city: data.city || '',
                            country: data.country || '',
                            hourlyRate: data.hourlyRate || 50,
                            selectedSubcategory: data.selectedSubcategory || '',
                            selectedCategory: data.selectedCategory || '',
                            averageRating: data.averageRating || 0,
                            totalReviews: data.totalReviews || 0,
                            responseTime: data.responseTime || 24,
                            completionRate: data.completionRate || 95,
                            portfolio: data.portfolio || [],
                            isOnline: data.isOnline ?? false,
                            user_type: data.user_type
                        });
                    }
                });

                // Sortierung anwenden
                const sortedProviders = providersData.sort((a, b) => {
                    switch (sortBy) {
                        case 'rating':
                            return (b.averageRating || 0) - (a.averageRating || 0);
                        case 'price':
                            return a.hourlyRate - b.hourlyRate;
                        case 'responseTime':
                            return (a.responseTime || 24) - (b.responseTime || 24);
                        default:
                            return 0;
                    }
                });

                setProviders(sortedProviders);
            } catch (err) {
                console.error('Fehler beim Laden der Dienstleister:', err);
                setError('Fehler beim Laden der Dienstleister');
            } finally {
                setLoading(false);
            }
        };

        if (subcategoryName) {
            fetchProviders();
        }
    }, [subcategoryName, sortBy]);

    const filteredProviders = providers.filter(provider => 
        provider.hourlyRate >= priceRange[0] && provider.hourlyRate <= priceRange[1]
    );

    const ServiceProviderCard = ({ provider }: { provider: ServiceProvider }) => {
        const profileImage = provider.profilePictureFirebaseUrl || 
                           provider.profilePictureURL || 
                           '/default-avatar.png';

        return (
            <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                    {provider.portfolio && provider.portfolio.length > 0 && provider.portfolio[0].imageUrl ? (
                        <Image
                            src={provider.portfolio[0].imageUrl}
                            alt="Portfolio"
                            width={300}
                            height={200}
                            className="w-full h-48 object-cover"
                        />
                    ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-[#14ad9f] to-teal-600 flex items-center justify-center">
                            <span className="text-white text-lg font-semibold">
                                {provider.companyName || provider.displayName}
                            </span>
                        </div>
                    )}
                    {provider.isOnline && (
                        <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                            Online
                        </span>
                    )}
                </div>
                
                <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <Image
                            src={profileImage}
                            alt={provider.displayName}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                            <h3 className="font-semibold text-gray-900">
                                {provider.companyName || provider.displayName}
                            </h3>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                                <FiMapPin size={12} />
                                {provider.city}, {provider.country}
                            </div>
                        </div>
                    </div>

                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {provider.description}
                    </p>

                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1">
                            <FiStar className="text-yellow-500 fill-current" size={16} />
                            <span className="font-medium">{provider.averageRating?.toFixed(1) || '0.0'}</span>
                            <span className="text-gray-500 text-sm">({provider.totalReviews || 0})</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                            <FiClock size={12} />
                            ~{provider.responseTime || 24}h
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                                Ab {provider.hourlyRate}€
                            </p>
                            <p className="text-xs text-gray-500">pro Stunde</p>
                        </div>
                        <Link
                            href={`/profile/${provider.username}`}
                            className="bg-[#14ad9f] text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors text-sm font-medium"
                        >
                            Profil ansehen
                        </Link>
                    </div>
                </div>
            </div>
        );
    };

    const ListViewCard = ({ provider }: { provider: ServiceProvider }) => {
        const profileImage = provider.profilePictureFirebaseUrl || 
                           provider.profilePictureURL || 
                           '/default-avatar.png';

        return (
            <div className="bg-white rounded-lg shadow-md p-6 flex gap-6 hover:shadow-lg transition-shadow">
                <div className="flex-shrink-0">
                    <Image
                        src={profileImage}
                        alt={provider.displayName}
                        width={80}
                        height={80}
                        className="w-20 h-20 rounded-full object-cover"
                    />
                </div>
                
                <div className="flex-grow">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900">
                                {provider.companyName || provider.displayName}
                            </h3>
                            <div className="flex items-center gap-2 text-gray-600 mb-2">
                                <FiMapPin size={14} />
                                {provider.city}, {provider.country}
                                {provider.isOnline && (
                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full ml-2">
                                        Online
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">
                                Ab {provider.hourlyRate}€
                            </p>
                            <p className="text-sm text-gray-500">pro Stunde</p>
                        </div>
                    </div>

                    <p className="text-gray-600 mb-4 line-clamp-2">
                        {provider.description}
                    </p>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-1">
                                <FiStar className="text-yellow-500 fill-current" />
                                <span className="font-medium">{provider.averageRating?.toFixed(1) || '0.0'}</span>
                                <span className="text-gray-500">({provider.totalReviews || 0})</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-600">
                                <FiClock size={16} />
                                ~{provider.responseTime || 24}h Antwortzeit
                            </div>
                            <div className="text-gray-600">
                                {provider.completionRate || 95}% Erfolgsrate
                            </div>
                        </div>
                        <Link
                            href={`/profile/${provider.username}`}
                            className="bg-[#14ad9f] text-white px-6 py-2 rounded-lg hover:bg-teal-600 transition-colors font-medium"
                        >
                            Profil ansehen
                        </Link>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <>
                <HeroHeader />
                <div className="min-h-screen bg-gray-50 py-8">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f]"></div>
                            <span className="ml-3 text-lg">Lade Dienstleister...</span>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    if (error) {
        return (
            <>
                <HeroHeader />
                <div className="min-h-screen bg-gray-50 py-8">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="text-center py-20">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Fehler beim Laden</h2>
                            <p className="text-gray-600">{error}</p>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <HeroHeader />
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4">
                    {/* Header */}
                    <div className="mb-8">
                        <nav className="text-sm text-gray-600 mb-4">
                            <Link href="/" className="hover:text-[#14ad9f]">Home</Link>
                            <span className="mx-2">›</span>
                            <Link href="/services" className="hover:text-[#14ad9f]">Services</Link>
                            <span className="mx-2">›</span>
                            <span className="capitalize">{categoryName}</span>
                            <span className="mx-2">›</span>
                            <span className="capitalize font-medium">{subcategoryName}</span>
                        </nav>
                        
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            {subcategoryName} Dienstleister
                        </h1>
                        <p className="text-gray-600">
                            {filteredProviders.length} professionelle {subcategoryName} Dienstleister verfügbar
                        </p>
                    </div>

                    {/* Filters and Controls */}
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Sortieren nach
                                    </label>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                                    >
                                        <option value="rating">Bewertung</option>
                                        <option value="price">Preis (niedrig zu hoch)</option>
                                        <option value="responseTime">Antwortzeit</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Preisspanne (€/Std)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={priceRange[0]}
                                            onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                                            className="w-20 border border-gray-300 rounded-md px-2 py-1"
                                            min="0"
                                        />
                                        <span>-</span>
                                        <input
                                            type="number"
                                            value={priceRange[1]}
                                            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                                            className="w-20 border border-gray-300 rounded-md px-2 py-1"
                                            min="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-[#14ad9f] text-white' : 'bg-gray-200 text-gray-600'}`}
                                >
                                    <FiGrid size={20} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-[#14ad9f] text-white' : 'bg-gray-200 text-gray-600'}`}
                                >
                                    <FiList size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Results */}
                    {filteredProviders.length === 0 ? (
                        <div className="text-center py-20">
                            <FiUser size={48} className="mx-auto text-gray-400 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                Keine Dienstleister gefunden
                            </h3>
                            <p className="text-gray-600 mb-6">
                                Derzeit sind keine {subcategoryName} Dienstleister in diesem Preisbereich verfügbar.
                            </p>
                            <Link
                                href="/register/company"
                                className="bg-[#14ad9f] text-white px-6 py-3 rounded-lg hover:bg-teal-600 transition-colors font-medium"
                            >
                                Als Dienstleister registrieren
                            </Link>
                        </div>
                    ) : (
                        <div className={
                            viewMode === 'grid' 
                                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                                : 'space-y-6'
                        }>
                            {filteredProviders.map((provider) => (
                                viewMode === 'grid' ? (
                                    <ServiceProviderCard key={provider.uid} provider={provider} />
                                ) : (
                                    <ListViewCard key={provider.uid} provider={provider} />
                                )
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ServiceCategoryPage;
