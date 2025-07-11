'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { HeroHeader } from '@/components/hero8-header';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { FiGrid, FiUsers, FiArrowRight, FiStar } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';

interface ServiceSubcategory {
    name: string;
    slug: string;
    providerCount: number;
    averageRating: number;
    startingPrice: number;
    imageUrl?: string;
    description: string;
}

interface ServiceCategoryPageProps {
    params: {
        category: string;
    };
}

const ServiceCategoryPage: React.FC<ServiceCategoryPageProps> = () => {
    const params = useParams();
    const router = useRouter();
    const [subcategories, setSubcategories] = useState<ServiceSubcategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalProviders, setTotalProviders] = useState(0);

    const categoryParam = decodeURIComponent(params.category as string || '');
    const categoryName = categoryParam.replace(/-/g, ' ').replace(/%26/g, '&');

    useEffect(() => {
        const fetchSubcategories = async () => {
            try {
                setLoading(true);
                const usersRef = collection(db, 'users');
                
                // Query für alle Dienstleister dieser Kategorie
                const providersQuery = query(
                    usersRef,
                    where('user_type', '==', 'firma'),
                    where('selectedCategory', '==', categoryName)
                );

                const querySnapshot = await getDocs(providersQuery);
                const subcategoriesMap = new Map<string, {
                    providers: any[];
                    totalRating: number;
                    minPrice: number;
                }>();

                let totalCount = 0;

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    const subcategory = data.selectedSubcategory;
                    
                    if (subcategory) {
                        totalCount++;
                        
                        if (!subcategoriesMap.has(subcategory)) {
                            subcategoriesMap.set(subcategory, {
                                providers: [],
                                totalRating: 0,
                                minPrice: Infinity
                            });
                        }
                        
                        const subcatData = subcategoriesMap.get(subcategory)!;
                        subcatData.providers.push(data);
                        subcatData.totalRating += (data.averageRating || 0);
                        subcatData.minPrice = Math.min(subcatData.minPrice, data.hourlyRate || 50);
                    }
                });

                setTotalProviders(totalCount);

                // Konvertiere zu Array und berechne Durchschnittswerte
                const subcategoriesArray: ServiceSubcategory[] = Array.from(subcategoriesMap.entries()).map(([name, data]) => ({
                    name,
                    slug: name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '%26'),
                    providerCount: data.providers.length,
                    averageRating: data.providers.length > 0 ? data.totalRating / data.providers.length : 0,
                    startingPrice: data.minPrice === Infinity ? 50 : data.minPrice,
                    description: `Professionelle ${name} Dienstleister`,
                    imageUrl: data.providers[0]?.portfolio?.[0]?.imageUrl || undefined
                })).sort((a, b) => b.providerCount - a.providerCount);

                setSubcategories(subcategoriesArray);
            } catch (err) {
                console.error('Fehler beim Laden der Unterkategorien:', err);
                setError('Fehler beim Laden der Unterkategorien');
            } finally {
                setLoading(false);
            }
        };

        if (categoryName) {
            fetchSubcategories();
        }
    }, [categoryName]);

    const SubcategoryCard = ({ subcategory }: { subcategory: ServiceSubcategory }) => (
        <Link
            href={`/services/${categoryParam}/${subcategory.slug}`}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
        >
            <div className="relative">
                {subcategory.imageUrl ? (
                    <Image
                        src={subcategory.imageUrl}
                        alt={subcategory.name}
                        width={300}
                        height={200}
                        className="w-full h-48 object-cover"
                    />
                ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-[#14ad9f] to-teal-600 flex items-center justify-center">
                        <FiGrid size={48} className="text-white opacity-50" />
                    </div>
                )}
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
                    <div className="flex items-center gap-1 text-sm">
                        <FiUsers size={14} />
                        <span className="font-medium">{subcategory.providerCount}</span>
                    </div>
                </div>
            </div>
            
            <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {subcategory.name}
                </h3>
                
                <p className="text-gray-600 text-sm mb-4">
                    {subcategory.description}
                </p>
                
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1">
                        <FiStar className="text-yellow-500 fill-current" size={16} />
                        <span className="font-medium">{subcategory.averageRating.toFixed(1)}</span>
                        <span className="text-gray-500 text-sm">Durchschnitt</span>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                            Ab {subcategory.startingPrice}€
                        </p>
                        <p className="text-xs text-gray-500">pro Stunde</p>
                    </div>
                </div>
                
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                        {subcategory.providerCount} Dienstleister
                    </span>
                    <div className="flex items-center gap-1 text-[#14ad9f] font-medium">
                        <span>Entdecken</span>
                        <FiArrowRight size={16} />
                    </div>
                </div>
            </div>
        </Link>
    );

    if (loading) {
        return (
            <>
                <HeroHeader />
                <div className="min-h-screen bg-gray-50 py-8">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f]"></div>
                            <span className="ml-3 text-lg">Lade Kategorien...</span>
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
                            <span className="capitalize font-medium">{categoryName}</span>
                        </nav>
                        
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">
                            {categoryName} Services
                        </h1>
                        <p className="text-xl text-gray-600 mb-2">
                            Professionelle {categoryName} Dienstleister für Ihr Projekt
                        </p>
                        <p className="text-gray-500">
                            {totalProviders} Dienstleister in {subcategories.length} Kategorien verfügbar
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-[#14ad9f] mb-2">{totalProviders}</div>
                                <div className="text-gray-600">Verfügbare Dienstleister</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-[#14ad9f] mb-2">{subcategories.length}</div>
                                <div className="text-gray-600">Service Kategorien</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-[#14ad9f] mb-2">
                                    {subcategories.length > 0 ? 
                                        (subcategories.reduce((sum, sub) => sum + sub.averageRating, 0) / subcategories.length).toFixed(1) 
                                        : '0.0'
                                    }
                                </div>
                                <div className="text-gray-600">Durchschnittsbewertung</div>
                            </div>
                        </div>
                    </div>

                    {/* Subcategories Grid */}
                    {subcategories.length === 0 ? (
                        <div className="text-center py-20">
                            <FiGrid size={48} className="mx-auto text-gray-400 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                Keine Unterkategorien gefunden
                            </h3>
                            <p className="text-gray-600 mb-6">
                                Derzeit sind keine Dienstleister in der Kategorie "{categoryName}" verfügbar.
                            </p>
                            <Link
                                href="/register/company"
                                className="bg-[#14ad9f] text-white px-6 py-3 rounded-lg hover:bg-teal-600 transition-colors font-medium"
                            >
                                Als Dienstleister registrieren
                            </Link>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                Wählen Sie eine Kategorie
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {subcategories.map((subcategory) => (
                                    <SubcategoryCard key={subcategory.slug} subcategory={subcategory} />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default ServiceCategoryPage;
