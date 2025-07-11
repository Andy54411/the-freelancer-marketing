'use client';

import React, { useState, useEffect } from 'react';
import { HeroHeader } from '@/components/hero8-header';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { FiGrid, FiUsers, FiArrowRight, FiSearch } from 'react-icons/fi';
import Link from 'next/link';

interface ServiceCategory {
    name: string;
    slug: string;
    providerCount: number;
    subcategories: string[];
    description: string;
    icon: string;
}

const ServicesOverviewPage: React.FC = () => {
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [totalProviders, setTotalProviders] = useState(0);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoading(true);
                const usersRef = collection(db, 'users');
                
                // Query für alle Dienstleister
                const providersQuery = query(
                    usersRef,
                    where('user_type', '==', 'firma')
                );

                const querySnapshot = await getDocs(providersQuery);
                const categoriesMap = new Map<string, {
                    providers: any[];
                    subcategories: Set<string>;
                }>();

                let totalCount = 0;

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    const category = data.selectedCategory;
                    const subcategory = data.selectedSubcategory;
                    
                    if (category) {
                        totalCount++;
                        
                        if (!categoriesMap.has(category)) {
                            categoriesMap.set(category, {
                                providers: [],
                                subcategories: new Set()
                            });
                        }
                        
                        const categoryData = categoriesMap.get(category)!;
                        categoryData.providers.push(data);
                        
                        if (subcategory) {
                            categoryData.subcategories.add(subcategory);
                        }
                    }
                });

                setTotalProviders(totalCount);

                // Konvertiere zu Array
                const categoriesArray: ServiceCategory[] = Array.from(categoriesMap.entries()).map(([name, data]) => ({
                    name,
                    slug: name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '%26'),
                    providerCount: data.providers.length,
                    subcategories: Array.from(data.subcategories),
                    description: getCategoryDescription(name),
                    icon: getCategoryIcon(name)
                })).sort((a, b) => b.providerCount - a.providerCount);

                setCategories(categoriesArray);
            } catch (err) {
                console.error('Fehler beim Laden der Kategorien:', err);
                setError('Fehler beim Laden der Kategorien');
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    const getCategoryDescription = (category: string): string => {
        const descriptions: { [key: string]: string } = {
            'transport & logistik': 'Professionelle Transport-, Logistik- und Lieferservices für Privatpersonen und Unternehmen',
            'hotel': 'Hochwertige Hoteldienstleistungen, Reinigung und Gastronomie-Services',
            'it': 'Umfassende IT-Services von Webentwicklung bis Systemadministration',
            'marketing': 'Kreative Marketing- und Werbelösungen für Ihr Unternehmen',
            'handwerk': 'Qualifizierte Handwerker für alle Reparatur- und Bauarbeiten',
            'beratung': 'Professionelle Beratungsdienstleistungen in verschiedenen Bereichen',
            'design': 'Kreative Design-Services für Print, Web und Corporate Identity',
            'gesundheit': 'Gesundheits- und Wellnessdienstleistungen von qualifizierten Fachkräften'
        };
        return descriptions[category.toLowerCase()] || `Professionelle ${category} Dienstleistungen`;
    };

    const getCategoryIcon = (category: string): string => {
        const icons: { [key: string]: string } = {
            'transport & logistik': '🚛',
            'hotel': '🏨',
            'it': '💻',
            'marketing': '📈',
            'handwerk': '🔨',
            'beratung': '💼',
            'design': '🎨',
            'gesundheit': '🏥'
        };
        return icons[category.toLowerCase()] || '🔧';
    };

    const filteredCategories = categories.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.subcategories.some(sub => sub.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const CategoryCard = ({ category }: { category: ServiceCategory }) => (
        <Link
            href={`/services/${category.slug}`}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
        >
            <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="text-4xl">{category.icon}</div>
                    <div className="flex-grow">
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">
                            {category.name}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                            <FiUsers size={14} />
                            <span>{category.providerCount} Dienstleister</span>
                        </div>
                    </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {category.description}
                </p>
                
                <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Verfügbare Services:</h4>
                    <div className="flex flex-wrap gap-1">
                        {category.subcategories.slice(0, 3).map((subcategory) => (
                            <span
                                key={subcategory}
                                className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                            >
                                {subcategory}
                            </span>
                        ))}
                        {category.subcategories.length > 3 && (
                            <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                                +{category.subcategories.length - 3} weitere
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                        {category.subcategories.length} Kategorien
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
                            <span className="ml-3 text-lg">Lade Services...</span>
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
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">
                            Alle Services entdecken
                        </h1>
                        <p className="text-xl text-gray-600 mb-8">
                            Finden Sie den perfekten Dienstleister für Ihr Projekt
                        </p>
                        
                        {/* Search */}
                        <div className="max-w-md mx-auto relative">
                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Service suchen..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-[#14ad9f] mb-2">{totalProviders}</div>
                                <div className="text-gray-600">Registrierte Dienstleister</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-[#14ad9f] mb-2">{categories.length}</div>
                                <div className="text-gray-600">Service Kategorien</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-[#14ad9f] mb-2">
                                    {categories.reduce((sum, cat) => sum + cat.subcategories.length, 0)}
                                </div>
                                <div className="text-gray-600">Spezialisierungen</div>
                            </div>
                        </div>
                    </div>

                    {/* Categories Grid */}
                    {filteredCategories.length === 0 ? (
                        <div className="text-center py-20">
                            <FiGrid size={48} className="mx-auto text-gray-400 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                Keine Services gefunden
                            </h3>
                            <p className="text-gray-600 mb-6">
                                {searchTerm ? `Keine Services für "${searchTerm}" gefunden.` : 'Derzeit sind keine Services verfügbar.'}
                            </p>
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="bg-[#14ad9f] text-white px-6 py-3 rounded-lg hover:bg-teal-600 transition-colors font-medium"
                                >
                                    Alle Services anzeigen
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {searchTerm && (
                                <div className="mb-6">
                                    <p className="text-gray-600">
                                        {filteredCategories.length} Kategorie{filteredCategories.length !== 1 ? 'n' : ''} für "{searchTerm}" gefunden
                                    </p>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredCategories.map((category) => (
                                    <CategoryCard key={category.slug} category={category} />
                                ))}
                            </div>
                        </>
                    )}

                    {/* Call to Action */}
                    <div className="bg-white rounded-lg shadow-sm p-8 mt-12 text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            Ihr Service ist nicht dabei?
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Registrieren Sie sich als Dienstleister und erreichen Sie neue Kunden auf unserer Plattform.
                        </p>
                        <Link
                            href="/register/company"
                            className="bg-[#14ad9f] text-white px-8 py-3 rounded-lg hover:bg-teal-600 transition-colors font-medium inline-block"
                        >
                            Als Dienstleister registrieren
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ServicesOverviewPage;
