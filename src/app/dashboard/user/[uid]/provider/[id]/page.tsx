'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { useAuth } from '@/contexts/AuthContext';
import {
    FiMapPin, FiMessageSquare, FiStar, FiBriefcase,
    FiClock, FiCheckCircle, FiUser, FiLoader, FiAlertCircle,
    FiArrowLeft, FiPhone, FiMail
} from 'react-icons/fi';

interface ProviderProfile {
    uid: string;
    companyName?: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    profilePictureFirebaseUrl?: string;
    profilePictureURL?: string;
    photoURL?: string;
    description?: string;
    bio?: string;
    companyCity?: string;
    companyCountry?: string;
    hourlyRate?: number;
    responseTime?: number;
    completionRate?: number;
    totalOrders?: number;
    selectedCategory?: string;
    selectedSubcategory?: string;
    skills?: string[];
    services?: string[];
    phoneNumber?: string;
    email?: string;
    isActive?: boolean;
}

interface Review {
    id: string;
    reviewerId: string;
    reviewerName: string;
    rating: number;
    text: string;
    date: any;
}

export default function UserProviderProfilePage() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const providerId = params.id as string;
    const userUid = params.uid as string;

    const [profile, setProfile] = useState<ProviderProfile | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProviderData = async () => {
            try {
                setLoading(true);

                // Versuche zuerst in der firma Collection
                const firmaDoc = await getDoc(doc(db, 'firma', providerId));
                if (firmaDoc.exists()) {
                    const data = firmaDoc.data();
                    setProfile({
                        uid: firmaDoc.id,
                        companyName: data.companyName,
                        profilePictureFirebaseUrl: data.profilePictureFirebaseUrl,
                        profilePictureURL: data.profilePictureURL,
                        photoURL: data.photoURL,
                        description: data.description,
                        bio: data.bio,
                        companyCity: data.companyCity,
                        companyCountry: data.companyCountry,
                        hourlyRate: data.hourlyRate,
                        responseTime: data.responseTime,
                        completionRate: data.completionRate,
                        totalOrders: data.totalOrders,
                        selectedCategory: data.selectedCategory,
                        selectedSubcategory: data.selectedSubcategory,
                        skills: data.services || data.skills || [],
                        phoneNumber: data.phoneNumber,
                        email: data.email,
                        isActive: data.isActive
                    });
                } else {
                    // Fallback: Versuche in der users Collection
                    const userDoc = await getDoc(doc(db, 'users', providerId));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setProfile({
                            uid: userDoc.id,
                            displayName: data.displayName,
                            firstName: data.firstName,
                            lastName: data.lastName,
                            profilePictureFirebaseUrl: data.profilePictureFirebaseUrl,
                            profilePictureURL: data.profilePictureURL,
                            photoURL: data.photoURL,
                            bio: data.bio,
                            hourlyRate: data.hourlyRate,
                            responseTime: data.responseTime,
                            completionRate: data.completionRate,
                            totalOrders: data.totalOrders,
                            skills: data.skills || [],
                            phoneNumber: data.phoneNumber,
                            email: data.email,
                            isActive: data.isActive
                        });
                    } else {
                        setError('Anbieter-Profil nicht gefunden.');
                        setLoading(false);
                        return;
                    }
                }

                // Lade Bewertungen (vereinfacht)
                try {
                    const reviewsRef = collection(db, 'reviews');
                    const reviewsQuery = query(
                        reviewsRef,
                        where('providerId', '==', providerId),
                        orderBy('date', 'desc'),
                        limit(5) // Nur 5 neueste Bewertungen
                    );
                    const reviewsSnapshot = await getDocs(reviewsQuery);
                    setReviews(reviewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
                } catch (reviewError) {
                    console.log('Keine Bewertungen gefunden:', reviewError);
                    setReviews([]);
                }

            } catch (err) {
                console.error("Fehler beim Laden des Profils:", err);
                setError('Fehler beim Laden des Profils.');
            } finally {
                setLoading(false);
            }
        };

        fetchProviderData();
    }, [providerId]);

    const getProfileImage = () => {
        return profile?.profilePictureFirebaseUrl ||
            profile?.profilePictureURL ||
            profile?.photoURL ||
            '/images/default-avatar.jpg';
    };

    const getProviderName = () => {
        return profile?.companyName ||
            profile?.displayName ||
            `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() ||
            'Unbekannter Anbieter';
    };

    const getLocation = () => {
        if (profile?.companyCity && profile?.companyCountry) {
            return `${profile.companyCity}, ${profile.companyCountry}`;
        }
        return null;
    };

    const averageRating = reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0;

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
                <div className="text-center">
                    <FiLoader className="w-8 h-8 animate-spin mx-auto mb-4 text-[#14ad9f]" />
                    <p className="text-gray-600 dark:text-gray-400">Lade Profil...</p>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
                <div className="text-center">
                    <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Profil nicht gefunden
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {error || 'Das angeforderte Profil konnte nicht geladen werden.'}
                    </p>
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#14ad9f] hover:bg-teal-600 text-white rounded-lg transition-colors"
                    >
                        <FiArrowLeft className="w-4 h-4" />
                        Zurück
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-[#14ad9f] transition-colors mb-6"
                    >
                        <FiArrowLeft className="w-4 h-4" />
                        Zurück
                    </button>

                    {/* Provider Info */}
                    <div className="flex items-start gap-6 mb-6">
                        <img
                            src={getProfileImage()}
                            alt={getProviderName()}
                            className="w-24 h-24 rounded-full object-cover"
                        />
                        
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                {getProviderName()}
                            </h1>
                            
                            {getLocation() && (
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-3">
                                    <FiMapPin className="w-4 h-4" />
                                    {getLocation()}
                                </div>
                            )}

                            {/* Rating */}
                            {reviews.length > 0 && (
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex items-center gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <FiStar
                                                key={i}
                                                className={`w-4 h-4 ${i < Math.floor(averageRating)
                                                    ? 'text-yellow-400 fill-current'
                                                    : 'text-gray-300'}`}
                                            />
                                        ))}
                                    </div>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {averageRating.toFixed(1)}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400">
                                        ({reviews.length} Bewertungen)
                                    </span>
                                </div>
                            )}

                            {/* Key Stats */}
                            <div className="flex gap-6 text-sm">
                                {profile.hourlyRate && (
                                    <div className="text-center">
                                        <div className="font-bold text-[#14ad9f] text-lg">
                                            €{profile.hourlyRate}/h
                                        </div>
                                        <div className="text-gray-500">Stundensatz</div>
                                    </div>
                                )}
                                {profile.totalOrders && (
                                    <div className="text-center">
                                        <div className="font-bold text-gray-900 dark:text-white text-lg">
                                            {profile.totalOrders}
                                        </div>
                                        <div className="text-gray-500">Aufträge</div>
                                    </div>
                                )}
                                {profile.responseTime && (
                                    <div className="text-center">
                                        <div className="font-bold text-gray-900 dark:text-white text-lg">
                                            {profile.responseTime}
                                        </div>
                                        <div className="text-gray-500">Antwortzeit</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Contact Button */}
                    <div className="flex gap-3">
                        <button className="flex-1 bg-[#14ad9f] hover:bg-teal-600 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                            <FiMessageSquare className="w-4 h-4" />
                            Nachricht senden
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* About */}
                        {(profile.description || profile.bio) && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                                    Über {getProviderName()}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                    {profile.description || profile.bio}
                                </p>
                            </div>
                        )}

                        {/* Skills */}
                        {profile.skills && profile.skills.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                                    Fähigkeiten
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {profile.skills.map((skill, index) => (
                                        <span
                                            key={index}
                                            className="bg-[#14ad9f] bg-opacity-10 text-[#14ad9f] px-3 py-1 rounded-full text-sm font-medium"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Reviews */}
                        {reviews.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                                    Bewertungen
                                </h2>
                                <div className="space-y-4">
                                    {reviews.map((review) => (
                                        <div key={review.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0 pb-4 last:pb-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="flex">
                                                    {[...Array(5)].map((_, i) => (
                                                        <FiStar
                                                            key={i}
                                                            className={`w-4 h-4 ${i < review.rating
                                                                ? 'text-yellow-400 fill-current'
                                                                : 'text-gray-300'}`}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {review.reviewerName}
                                                </span>
                                                <span className="text-gray-500 dark:text-gray-400 text-sm">
                                                    {review.date?.toDate?.()?.toLocaleDateString('de-DE')}
                                                </span>
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-400">
                                                {review.text}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Quick Stats */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Statistiken
                            </h3>
                            <div className="space-y-3">
                                {profile.completionRate && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Erfolgsrate</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {profile.completionRate}%
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Kategorie</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {profile.selectedSubcategory || profile.selectedCategory || 'Nicht angegeben'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Status</span>
                                    <span className={`font-medium ${profile.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                        {profile.isActive ? 'Aktiv' : 'Inaktiv'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
