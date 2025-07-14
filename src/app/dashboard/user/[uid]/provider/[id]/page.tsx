'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { useAuth } from '@/contexts/AuthContext';
import {
  FiMapPin,
  FiMessageSquare,
  FiStar,
  FiBriefcase,
  FiClock,
  FiCheckCircle,
  FiUser,
  FiLoader,
  FiAlertCircle,
  FiArrowLeft,
  FiPhone,
  FiMail,
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
  projectPrice?: string;
  projectDuration?: string;
  isVerified?: boolean;
  isReturningCustomer?: boolean;
  helpfulVotes?: {
    yes: number;
    no: number;
  };
  providerResponse?: {
    text: string;
    date: any;
    providerName: string;
  };
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
            isActive: data.isActive,
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
              isActive: data.isActive,
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
          setReviews(reviewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Review));
        } catch (reviewError) {
          console.log('Keine Bewertungen gefunden:', reviewError);
          setReviews([]);
        }
      } catch (err) {
        console.error('Fehler beim Laden des Profils:', err);
        setError('Fehler beim Laden des Profils.');
      } finally {
        setLoading(false);
      }
    };

    fetchProviderData();
  }, [providerId]);

  const getProfileImage = () => {
    return (
      profile?.profilePictureFirebaseUrl ||
      profile?.profilePictureURL ||
      profile?.photoURL ||
      '/images/default-avatar.jpg'
    );
  };

  const getProviderName = () => {
    return (
      profile?.companyName ||
      profile?.displayName ||
      `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() ||
      'Unbekannter Anbieter'
    );
  };

  const getLocation = () => {
    if (profile?.companyCity && profile?.companyCountry) {
      return `${profile.companyCity}, ${profile.companyCountry}`;
    }
    return null;
  };

  const averageRating =
    reviews.length > 0
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
                        className={`w-4 h-4 ${
                          i < Math.floor(averageRating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
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
                    <div className="font-bold text-[#14ad9f] text-lg">€{profile.hourlyRate}/h</div>
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Bewertungen
              </h2>
              <div className="reviews-wrap">
                <ul className="review-list space-y-8">
                  {reviews.map(review => (
                    <li
                      key={review.id}
                      className="review-item-component border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0"
                    >
                      <div className="flex flex-col space-y-4">
                        {/* Benutzer-Header */}
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {review.reviewerName.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {review.reviewerName}
                              </p>
                              {review.isReturningCustomer && (
                                <span className="text-green-600 dark:text-green-400 font-medium text-sm">
                                  🔄 Wiederkehrender Kunde
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <img
                                className="w-4 h-4"
                                src="https://fiverr-dev-res.cloudinary.com/general_assets/flags/1f1e9-1f1ea.png"
                                alt="DE"
                              />
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Deutschland
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Bewertung und Datum */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <FiStar
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < review.rating
                                        ? 'text-yellow-400 fill-current'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <strong className="text-lg font-semibold ml-2">
                                {review.rating}
                              </strong>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {review.date?.toDate?.()?.toLocaleDateString('de-DE', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Bewertungstext */}
                        <div className="prose max-w-none">
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {review.text}
                          </p>
                        </div>

                        {/* Projektdetails */}
                        {(review.projectPrice || review.projectDuration) && (
                          <div className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                            <div className="flex items-center space-x-4">
                              {review.projectPrice && (
                                <div>
                                  <p className="font-semibold text-gray-900 dark:text-white">
                                    {review.projectPrice}
                                  </p>
                                  <p className="text-gray-500 dark:text-gray-400">Preis</p>
                                </div>
                              )}
                              {review.projectPrice && review.projectDuration && (
                                <div className="w-px h-8 bg-gray-300 dark:bg-gray-600"></div>
                              )}
                              {review.projectDuration && (
                                <div>
                                  <p className="font-semibold text-gray-900 dark:text-white">
                                    {review.projectDuration}
                                  </p>
                                  <p className="text-gray-500 dark:text-gray-400">Dauer</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Anbieter-Antwort */}
                        {review.providerResponse && (
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 ml-8">
                            <div className="flex items-start space-x-3">
                              <div className="w-8 h-8 bg-[#14ad9f] rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                A
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white mb-1">
                                  Antwort von {review.providerResponse.providerName}
                                </p>
                                <p className="text-gray-700 dark:text-gray-300 text-sm">
                                  {review.providerResponse.text}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Hilfreich-Buttons */}
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Hilfreich?</span>
                          <button className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                            <span>👍 Ja</span>
                            {review.helpfulVotes?.yes && (
                              <span className="text-xs">({review.helpfulVotes.yes})</span>
                            )}
                          </button>
                          <button className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                            <span>👎 Nein</span>
                            {review.helpfulVotes?.no && (
                              <span className="text-xs">({review.helpfulVotes.no})</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Empty State */}
                {reviews.length === 0 && (
                  <div className="text-center py-8">
                    <FiStar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Noch keine Bewertungen vorhanden.
                    </p>
                  </div>
                )}

                {/* Button für weitere Bewertungen */}
                {reviews.length > 0 && (
                  <div className="mt-6 text-center">
                    <button className="bg-[#14ad9f] hover:bg-teal-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                      Weitere Bewertungen anzeigen
                    </button>
                  </div>
                )}
              </div>
            </div>
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
                  <span
                    className={`font-medium ${profile.isActive ? 'text-green-600' : 'text-red-600'}`}
                  >
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
