'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/firebase/clients';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Star, MapPin, ArrowLeft, Briefcase, Clock, Users, MessageCircle, Calendar } from 'lucide-react';
import DirectChatModal from '@/components/DirectChatModal';
import ResponseTimeDisplay from '@/components/ResponseTimeDisplay';
import ProviderReviews from '@/components/ProviderReviews';
import { useAuth } from '@/contexts/AuthContext';

interface Provider {
    id: string;
    companyName?: string;
    userName?: string;
    profilePictureFirebaseUrl?: string;
    profilePictureURL?: string;
    photoURL?: string;
    bio?: string;
    description?: string;
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
    email?: string;
    phone?: string;
    website?: string;
    founded?: string;
    teamSize?: string;
    languages?: string[];
    portfolio?: any[];
    services?: string[];
}

export default function CompanyProviderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const companyUid = params.uid as string;
    const providerId = params.id as string;

    const [provider, setProvider] = useState<Provider | null>(null);
    const [loading, setLoading] = useState(true);
    const [actualRating, setActualRating] = useState<number>(0);
    const [actualReviewCount, setActualReviewCount] = useState<number>(0);

    // Chat Modal State
    const [chatModalOpen, setChatModalOpen] = useState(false);
    const [companyName, setCompanyName] = useState<string>('');

    useEffect(() => {
        loadProviderData();
        loadCompanyData();
        loadReviewStats();
    }, [providerId]);

    const loadProviderData = async () => {
        try {
            setLoading(true);

            // Erst in der firma Collection suchen
            const firmaDoc = await getDoc(doc(db, 'firma', providerId));

            if (firmaDoc.exists()) {
                const data = firmaDoc.data();
                setProvider({
                    id: firmaDoc.id,
                    companyName: data.companyName,
                    profilePictureFirebaseUrl: data.profilePictureFirebaseUrl,
                    profilePictureURL: data.profilePictureURL,
                    photoURL: data.photoURL,
                    bio: data.description || data.bio,
                    description: data.description,
                    location: data.location || `${data.companyCity || ''}, ${data.companyCountry || ''}`.trim().replace(/^,\s*/, ''),
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
                    email: data.email,
                    phone: data.phone,
                    website: data.website,
                    founded: data.founded,
                    teamSize: data.teamSize,
                    languages: data.languages || [],
                    portfolio: data.portfolio || [],
                    services: data.services || []
                });
            } else {
                // Falls nicht in firma gefunden, in users suchen
                const userDoc = await getDoc(doc(db, 'users', providerId));

                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setProvider({
                        id: userDoc.id,
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
                        hourlyRate: data.hourlyRate,
                        email: data.email,
                        phone: data.phone,
                        website: data.website,
                        languages: data.languages || [],
                        portfolio: data.portfolio || []
                    });
                } else {
                    console.error('Provider nicht gefunden');
                    router.push(`/dashboard/company/${companyUid}`);
                }
            }
        } catch (error) {
            console.error('Fehler beim Laden der Provider-Daten:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadCompanyData = async () => {
        if (!companyUid) return;

        try {
            const firmaDoc = await getDoc(doc(db, 'firma', companyUid));
            if (firmaDoc.exists()) {
                const data = firmaDoc.data();
                setCompanyName(data.companyName || 'Unbekanntes Unternehmen');
            }
        } catch (error) {
            console.error('Fehler beim Laden der Unternehmensdaten:', error);
        }
    };

    const loadReviewStats = async () => {
        try {
            const reviewsQuery = query(
                collection(db, 'reviews'),
                where('providerId', '==', providerId)
            );

            const reviewsSnapshot = await getDocs(reviewsQuery);
            const reviews = reviewsSnapshot.docs.map(doc => doc.data());

            if (reviews.length > 0) {
                const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
                const averageRating = totalRating / reviews.length;

                setActualRating(averageRating);
                setActualReviewCount(reviews.length);

                console.log(`Loaded ${reviews.length} reviews with average rating: ${averageRating.toFixed(2)}`);
            } else {
                setActualRating(0);
                setActualReviewCount(0);
            }
        } catch (error) {
            console.error('Fehler beim Laden der Review-Statistiken:', error);
            setActualRating(0);
            setActualReviewCount(0);
        }
    };

    const openChatWithProvider = () => {
        if (provider) {
            setChatModalOpen(true);
        }
    };

    const getProfileImage = () => {
        return provider?.profilePictureFirebaseUrl ||
            provider?.profilePictureURL ||
            provider?.photoURL ||
            '/images/default-avatar.jpg';
    };

    const getProviderName = () => {
        return provider?.companyName || provider?.userName || 'Unbekannter Anbieter';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="animate-pulse">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 mb-6">
                            <div className="flex items-start gap-6">
                                <div className="w-24 h-24 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                                <div className="flex-1 space-y-4">
                                    <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
                                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!provider) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
                <div className="max-w-2xl mx-auto text-center">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        Anbieter nicht gefunden
                    </h1>
                    <button
                        onClick={() => router.push(`/dashboard/company/${companyUid}`)}
                        className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mx-auto"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Zurück zum Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-[#14ad9f] to-teal-700 shadow-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="text-white/80 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-white">
                                Anbieter-Profil
                            </h1>
                            <p className="text-white/80 mt-1">
                                Detailierte Informationen und Bewertungen
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Provider Header Card - Enhanced */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
                            <div className="flex flex-col gap-6">
                                {/* Top Row: Profile Image and Basic Info */}
                                <div className="flex flex-col sm:flex-row items-start gap-6">
                                    <div className="relative group flex-shrink-0">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-[#14ad9f] to-teal-600 rounded-full opacity-75 group-hover:opacity-100 transition duration-300 blur"></div>
                                        <img
                                            src={getProfileImage()}
                                            alt={getProviderName()}
                                            className="relative w-28 h-28 rounded-full object-cover ring-4 ring-white dark:ring-gray-700"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = '/images/default-avatar.jpg';
                                            }}
                                        />
                                        {provider.isCompany && (
                                            <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-[#14ad9f] to-teal-600 text-white text-xs px-3 py-1 rounded-full shadow-lg font-bold">
                                                PRO
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                                            {getProviderName()}
                                        </h1>

                                        {provider.location && (
                                            <div className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded-lg">
                                                <MapPin className="w-4 h-4 text-[#14ad9f]" />
                                                {provider.location}
                                            </div>
                                        )}
                                    </div>

                                    {/* Price Box - Moved to separate column */}
                                    <div className="flex-shrink-0 sm:ml-auto">
                                        {provider.hourlyRate && (
                                            <div className="text-center bg-gradient-to-br from-[#14ad9f] to-teal-600 text-white p-4 rounded-xl shadow-lg">
                                                <div className="text-3xl font-bold">
                                                    €{provider.hourlyRate}
                                                </div>
                                                <div className="text-sm opacity-90">
                                                    pro Stunde
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Rating Section - Full width */}
                                {actualRating > 0 && (
                                    <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 px-4 py-3 rounded-xl border border-yellow-200 dark:border-yellow-800">
                                        <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`w-6 h-6 ${i < Math.floor(actualRating)
                                                        ? 'text-yellow-500 fill-current drop-shadow-sm'
                                                        : 'text-gray-300 dark:text-gray-600'}`}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl font-bold text-gray-900 dark:text-white">
                                                {actualRating.toFixed(1)}
                                            </span>
                                            <span className="text-gray-500 dark:text-gray-400 font-medium">
                                                ({actualReviewCount} Bewertungen)
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Stats Section - Full width */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                    {provider.completedJobs && provider.completedJobs > 0 && (
                                        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800">
                                            <Briefcase className="w-4 h-4 text-blue-600" />
                                            <span className="text-blue-800 dark:text-blue-300 font-medium">
                                                {provider.completedJobs} Projekte
                                            </span>
                                        </div>
                                    )}
                                    {provider.responseTime && (
                                        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg border border-green-200 dark:border-green-800">
                                            <Clock className="w-4 h-4 text-green-600" />
                                            <span className="text-green-800 dark:text-green-300 font-medium">
                                                {provider.responseTime}
                                            </span>
                                        </div>
                                    )}
                                    {provider.teamSize && (
                                        <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded-lg border border-purple-200 dark:border-purple-800">
                                            <Users className="w-4 h-4 text-purple-600" />
                                            <span className="text-purple-800 dark:text-purple-300 font-medium">
                                                {provider.teamSize} Team
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Action Button - Full width */}
                                <div className="pt-4">
                                    <button
                                        onClick={openChatWithProvider}
                                        className="w-full bg-gradient-to-r from-[#14ad9f] to-teal-600 hover:from-teal-600 hover:to-[#14ad9f] text-white px-8 py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                        Jetzt kontaktieren
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {(provider.bio || provider.description) && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 hover:shadow-xl transition-all duration-300">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-1 h-8 bg-gradient-to-b from-[#14ad9f] to-teal-600 rounded-full"></div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        Über {provider.isCompany ? 'das Unternehmen' : 'mich'}
                                    </h2>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
                                    {provider.bio || provider.description}
                                </p>
                            </div>
                        )}

                        {/* Skills & Services */}
                        {provider.skills && provider.skills.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 hover:shadow-xl transition-all duration-300">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-1 h-8 bg-gradient-to-b from-[#14ad9f] to-teal-600 rounded-full"></div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        Fähigkeiten & Services
                                    </h2>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {provider.skills.map((skill, index) => (
                                        <span
                                            key={index}
                                            className="bg-gradient-to-r from-[#14ad9f]/10 to-teal-600/10 text-[#14ad9f] px-4 py-2 rounded-full text-sm font-semibold border border-[#14ad9f]/20 hover:from-[#14ad9f]/20 hover:to-teal-600/20 transition-all duration-200 cursor-default"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Reviews */}
                        <ProviderReviews
                            providerId={providerId}
                            reviewCount={actualReviewCount}
                            averageRating={actualRating}
                        />
                    </div>

                    {/* Enhanced Sidebar */}
                    <div className="space-y-8">
                        {/* Contact Info */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-1 h-6 bg-gradient-to-b from-[#14ad9f] to-teal-600 rounded-full"></div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Kontaktinformationen
                                </h3>
                            </div>
                            <div className="space-y-4">
                                {provider.email && (
                                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <label className="text-sm font-semibold text-[#14ad9f] uppercase tracking-wide">
                                            E-Mail
                                        </label>
                                        <p className="text-gray-900 dark:text-white mt-1 font-medium">
                                            {provider.email}
                                        </p>
                                    </div>
                                )}
                                {provider.phone && (
                                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <label className="text-sm font-semibold text-[#14ad9f] uppercase tracking-wide">
                                            Telefon
                                        </label>
                                        <p className="text-gray-900 dark:text-white mt-1 font-medium">
                                            {provider.phone}
                                        </p>
                                    </div>
                                )}
                                {provider.website && (
                                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <label className="text-sm font-semibold text-[#14ad9f] uppercase tracking-wide">
                                            Website
                                        </label>
                                        <a
                                            href={provider.website.startsWith('http') ? provider.website : `https://${provider.website}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#14ad9f] hover:text-teal-600 break-all mt-1 block font-medium transition-colors"
                                        >
                                            {provider.website}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Antwortzeit-Garantie */}
                        <ResponseTimeDisplay
                            providerId={providerId}
                            guaranteeHours={24}
                            showDetailed={true}
                        />

                        {/* Additional Info */}
                        {(provider.founded || provider.languages?.length) && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl transition-all duration-300">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-1 h-6 bg-gradient-to-b from-[#14ad9f] to-teal-600 rounded-full"></div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                        Weitere Informationen
                                    </h3>
                                </div>
                                <div className="space-y-4">
                                    {provider.founded && (
                                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                            <label className="text-sm font-semibold text-[#14ad9f] uppercase tracking-wide">
                                                Gegründet
                                            </label>
                                            <p className="text-gray-900 dark:text-white mt-1 font-medium">
                                                {provider.founded}
                                            </p>
                                        </div>
                                    )}
                                    {provider.languages && provider.languages.length > 0 && (
                                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                            <label className="text-sm font-semibold text-[#14ad9f] uppercase tracking-wide mb-2 block">
                                                Sprachen
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {provider.languages.map((language, index) => (
                                                    <span
                                                        key={index}
                                                        className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600"
                                                    >
                                                        {language}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Enhanced Quick Actions */}
                        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-1 h-6 bg-gradient-to-b from-[#14ad9f] to-teal-600 rounded-full"></div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Schnellaktionen
                                </h3>
                            </div>
                            <div className="space-y-4">
                                <button
                                    onClick={openChatWithProvider}
                                    className="w-full bg-gradient-to-r from-[#14ad9f] to-teal-600 hover:from-teal-600 hover:to-[#14ad9f] text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105"
                                >
                                    <MessageCircle className="w-5 h-5" />
                                    Nachricht senden
                                </button>
                                <button
                                    onClick={() => {/* Implementiere Terminbuchung */ }}
                                    className="w-full border-2 border-[#14ad9f] text-[#14ad9f] hover:bg-gradient-to-r hover:from-[#14ad9f] hover:to-teal-600 hover:text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-3 hover:shadow-lg transform hover:scale-105"
                                >
                                    <Calendar className="w-5 h-5" />
                                    Termin buchen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Direct Chat Modal */}
            {provider && (
                <DirectChatModal
                    isOpen={chatModalOpen}
                    onClose={() => setChatModalOpen(false)}
                    providerId={provider.id}
                    providerName={getProviderName()}
                    companyId={companyUid}
                    companyName={companyName}
                />
            )}
        </div>
    );
}
