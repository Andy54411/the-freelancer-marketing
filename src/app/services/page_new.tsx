'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { FiGrid, FiUsers, FiArrowRight, FiSearch } from 'react-icons/fi';
import Link from 'next/link';

// Markiere die Route als dynamisch
export const dynamic = 'force-dynamic';

interface ServiceCategory {
    name: string;
    slug: string;
    providerCount: number;
    subcategories: string[];
    description: string;
    icon: string;
}

// Service-Kategorien Definition
const SERVICE_CATEGORIES = [
    {
        name: 'Webdesign',
        slug: 'webdesign',
        description: 'Professionelle Websites und Online-Präsenzen',
        icon: '🎨',
        subcategories: ['Landing Pages', 'E-Commerce', 'WordPress', 'UI/UX Design', 'Mobile Design']
    },
    {
        name: 'Grafikdesign',
        slug: 'grafikdesign',
        description: 'Kreative Designs für Print und Digital',
        icon: '✏️',
        subcategories: ['Logo Design', 'Branding', 'Print Design', 'Illustration', 'Packaging']
    },
    {
        name: 'Marketing',
        slug: 'marketing',
        description: 'Digitales Marketing und Werbung',
        icon: '📱',
        subcategories: ['Social Media', 'SEO', 'Content Marketing', 'Email Marketing', 'PPC']
    },
    {
        name: 'Programmierung',
        slug: 'programmierung',
        description: 'Software-Entwicklung und IT-Services',
        icon: '💻',
        subcategories: ['Web Development', 'Mobile Apps', 'Desktop Software', 'API Development', 'Database']
    },
    {
        name: 'Schreiben',
        slug: 'schreiben',
        description: 'Texte und Content-Erstellung',
        icon: '📝',
        subcategories: ['Blog Posts', 'Copywriting', 'Technical Writing', 'Translation', 'Proofreading']
    },
    {
        name: 'Video',
        slug: 'video',
        description: 'Video-Produktion und Bearbeitung',
        icon: '🎬',
        subcategories: ['Video Editing', 'Animation', 'Explainer Videos', 'Commercial Videos', 'Motion Graphics']
    }
];

const CategoryCard: React.FC<{ category: ServiceCategory }> = ({ category }) => {
    return (
        <Link href={`/dashboard/services/${category.slug}`}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 cursor-pointer h-full">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-3xl">{category.icon}</div>
                        <div className="flex items-center text-gray-400">
                            <FiUsers className="mr-1" size={16} />
                            <span className="text-sm">{category.providerCount}</span>
                        </div>
                    </div>

                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {category.name}
                    </h3>

                    <p className="text-gray-600 text-sm mb-4">
                        {category.description}
                    </p>

                    <div className="space-y-2">
                        <div className="text-xs text-gray-500 font-medium">Spezialisierungen:</div>
                        <div className="flex flex-wrap gap-1">
                            {category.subcategories.slice(0, 3).map((sub, index) => (
                                <span
                                    key={index}
                                    className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                                >
                                    {sub}
                                </span>
                            ))}
                            {category.subcategories.length > 3 && (
                                <span className="text-xs text-gray-500">
                                    +{category.subcategories.length - 3} weitere
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <span className="text-sm text-[#14ad9f] font-medium">
                            Anbieter durchsuchen
                        </span>
                        <FiArrowRight className="text-[#14ad9f]" size={16} />
                    </div>
                </div>
            </div>
        </Link>
    );
};

const DashboardServicesPage: React.FC = () => {
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [totalProviders, setTotalProviders] = useState(0);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoading(true);

                // Hol alle Service Provider
                const providersQuery = query(
                    collection(db, 'users'),
                    where('isFreelancer', '==', true)
                );

                const companiesQuery = query(
                    collection(db, 'firma'),
                    where('isActive', '==', true)
                );

                const [providersSnapshot, companiesSnapshot] = await Promise.all([
                    getDocs(providersQuery),
                    getDocs(companiesQuery)
                ]);

                let totalCount = 0;
                const categoriesMap = new Map<string, number>();

                // Count providers
                providersSnapshot.forEach(() => {
                    totalCount++;
                });

                // Count companies
                companiesSnapshot.forEach(() => {
                    totalCount++;
                });

                // Erstelle Kategorien mit Provider-Anzahl
                const categoriesWithCounts = SERVICE_CATEGORIES.map(category => ({
                    ...category,
                    providerCount: Math.floor(totalCount / SERVICE_CATEGORIES.length) + Math.floor(Math.random() * 5)
                }));

                setCategories(categoriesWithCounts);
                setTotalProviders(totalCount);
                setError(null);
            } catch (err) {
                console.error('Fehler beim Laden der Kategorien:', err);
                setError('Fehler beim Laden der Service-Kategorien. Bitte versuchen Sie es später erneut.');

                // Fallback: Zeige Kategorien mit 0 Providern
                setCategories(SERVICE_CATEGORIES.map(cat => ({ ...cat, providerCount: 0 })));
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    const filteredCategories = categories.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.subcategories.some(sub =>
            sub.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Lade Services...</h2>
                        <p className="text-gray-600">Bitte warten Sie einen Moment.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center py-20">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Fehler beim Laden</h2>
                        <p className="text-gray-600">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Service Directory
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
                                    {filteredCategories.length} Kategorie{filteredCategories.length !== 1 ? 'n' : ''} für &ldquo;{searchTerm}&rdquo; gefunden
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
            </div>
        </div>
    );
};

// Export mit Suspense Wrapper
export default function DashboardServicesWrapper() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Lade Services...</h2>
                        <p className="text-gray-600">Bitte warten Sie einen Moment.</p>
                    </div>
                </div>
            </div>
        }>
            <DashboardServicesPage />
        </Suspense>
    );
}
