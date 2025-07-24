'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { User as FirebaseUser, getAuth } from 'firebase/auth';
import Image from 'next/image';
import Link from 'next/link';
import {
  FiMapPin,
  FiMessageSquare,
  FiStar,
  FiAward,
  FiBriefcase,
  FiClock,
  FiCheckCircle,
  FiTrendingUp,
  FiZap,
  FiUser,
  FiLoader,
  FiAlertCircle,
  FiShare2,
  FiEye,
  FiHeart,
  FiCalendar,
  FiGlobe,
  FiPhone,
  FiMail,
  FiArrowLeft,
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
  city?: string;
  country?: string;
  hourlyRate?: number;
  responseTime?: number;
  completionRate?: number;
  totalOrders?: number;
  isOnline?: boolean;
  badges?: string[];
  selectedCategory?: string;
  selectedSubcategory?: string;
  skills?: string[];
  services?: string[];
  languages?: { language: string; proficiency: string }[];
  portfolio?: { title: string; description: string; imageUrl?: string; projectUrl?: string }[];
  phoneNumber?: string;
  email?: string;
  createdAt?: any;
  isActive?: boolean;
}

interface Review {
  id: string;
  reviewerName: string;
  reviewerImage?: string;
  rating: number;
  comment: string;
  date: any;
}

const ProviderProfilePage = () => {
  const router = useRouter();
  const params = useParams();
  const providerId = typeof params?.id === 'string' ? params.id : '';

  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!providerId) return;

    const fetchProviderData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Zuerst in der firma Collection suchen
        const firmaDoc = await getDoc(doc(db, 'firma', providerId));

        if (firmaDoc.exists()) {
          const firmaData = firmaDoc.data() as ProviderProfile;
          setProfile({ ...firmaData, uid: firmaDoc.id });
        } else {
          // Fallback: in der users Collection suchen
          const userDoc = await getDoc(doc(db, 'users', providerId));
          if (userDoc.exists()) {
            const userData = userDoc.data() as ProviderProfile;
            setProfile({ ...userData, uid: userDoc.id });
          } else {
            setError('Anbieter-Profil nicht gefunden.');
            setLoading(false);
            return;
          }
        }

        // Bewertungen laden (falls vorhanden)
        const reviewsRef = collection(db, 'reviews');
        const reviewsQuery = query(
          reviewsRef,
          where('providerId', '==', providerId),
          orderBy('date', 'desc'),
          limit(10)
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);
        setReviews(reviewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Review));
      } catch (err) {
        console.error('Fehler beim Laden des Profils:', err);
        setError('Fehler beim Laden des Profils.');
      } finally {
        setLoading(false);
      }
    };

    fetchProviderData();
  }, [providerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <FiLoader className="animate-spin text-4xl text-[#14ad9f] mx-auto mb-4" />
          <p className="text-gray-600">Profil wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <FiAlertCircle className="text-4xl text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error || 'Profil nicht gefunden'}</p>
          <button
            onClick={() => router.back()}
            className="text-[#14ad9f] hover:text-teal-600 flex items-center gap-2 mx-auto"
          >
            <FiArrowLeft /> Zurück
          </button>
        </div>
      </div>
    );
  }

  const getProfileImage = () => {
    return (
      profile.profilePictureFirebaseUrl ||
      profile.profilePictureURL ||
      profile.photoURL ||
      '/images/default-avatar.png'
    );
  };

  const getProviderName = () => {
    return (
      profile.companyName ||
      profile.displayName ||
      `${profile.firstName || ''} ${profile.lastName || ''}`.trim() ||
      'Unbekannter Anbieter'
    );
  };

  const getLocation = () => {
    const city = profile.companyCity || profile.city;
    const country = profile.companyCountry || profile.country;
    if (city && country) return `${city}, ${country}`;
    if (city) return city;
    if (country) return country;
    return 'Standort nicht angegeben';
  };

  const averageRating =
    reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <FiArrowLeft /> Zurück zur Suche
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Linke Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-6">
              {/* Profilbild und Grundinfos */}
              <div className="text-center mb-6">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <Image
                    src={getProfileImage()}
                    alt={getProviderName()}
                    fill
                    className="rounded-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).src = '/images/default-avatar.png';
                    }}
                  />
                  {profile.isOnline && (
                    <span className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></span>
                  )}
                </div>

                <h1 className="text-xl font-bold text-gray-800 mb-1">{getProviderName()}</h1>

                {profile.selectedSubcategory && (
                  <p className="text-sm text-gray-600 mb-2">{profile.selectedSubcategory}</p>
                )}

                <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-3">
                  <FiMapPin size={14} />
                  {getLocation()}
                </div>

                {/* Badges */}
                {profile.badges && profile.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center mb-4">
                    {profile.badges.slice(0, 3).map(badge => (
                      <span
                        key={badge}
                        className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                )}

                {/* Online Status */}
                {profile.isOnline && (
                  <div className="flex items-center justify-center gap-2 text-sm text-green-600 mb-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Online
                  </div>
                )}
              </div>

              {/* Kontakt Buttons */}
              <div className="space-y-3 mb-6">
                <button className="w-full bg-[#14ad9f] text-white py-3 px-4 rounded-lg font-medium hover:bg-teal-600 transition-colors flex items-center justify-center gap-2">
                  <FiMessageSquare size={16} />
                  Nachricht senden
                </button>
                <button className="w-full border border-[#14ad9f] text-[#14ad9f] py-2 px-4 rounded-lg font-medium hover:bg-[#14ad9f] hover:text-white transition-colors flex items-center justify-center gap-2">
                  <FiHeart size={16} />
                  Favoriten
                </button>
              </div>

              {/* Statistiken */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-800 mb-3">Statistiken</h3>
                <div className="space-y-3 text-sm">
                  {reviews.length > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Bewertung:</span>
                      <div className="flex items-center gap-1">
                        <FiStar className="text-yellow-500 fill-current" size={14} />
                        <span className="font-medium">{averageRating.toFixed(1)}</span>
                        <span className="text-gray-500">({reviews.length})</span>
                      </div>
                    </div>
                  )}

                  {profile.responseTime && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Antwortzeit:</span>
                      <span className="font-medium text-green-600">~{profile.responseTime}h</span>
                    </div>
                  )}

                  {profile.completionRate && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Erfolgsrate:</span>
                      <span className="font-medium text-green-600">{profile.completionRate}%</span>
                    </div>
                  )}

                  {profile.totalOrders && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Projekte:</span>
                      <span className="font-medium">{profile.totalOrders}</span>
                    </div>
                  )}

                  {profile.hourlyRate && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Stundensatz:</span>
                      <span className="font-medium text-[#14ad9f]">€{profile.hourlyRate}/h</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Kontaktinfo */}
              {(profile.email || profile.phoneNumber) && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Kontakt</h3>
                  <div className="space-y-2 text-sm">
                    {profile.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiMail size={14} />
                        <span>{profile.email}</span>
                      </div>
                    )}
                    {profile.phoneNumber && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiPhone size={14} />
                        <span>{profile.phoneNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hauptinhalt */}
          <div className="lg:col-span-2">
            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm border mb-6">
              <div className="flex border-b">
                {[
                  { id: 'overview', label: 'Übersicht', icon: FiUser },
                  { id: 'reviews', label: `Bewertungen (${reviews.length})`, icon: FiStar },
                  { id: 'portfolio', label: 'Portfolio', icon: FiBriefcase },
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'text-[#14ad9f] border-b-2 border-[#14ad9f]'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Beschreibung */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Über {getProviderName()}</h3>
                      <p className="text-gray-700 leading-relaxed">
                        {profile.description || profile.bio || 'Keine Beschreibung verfügbar.'}
                      </p>
                    </div>

                    {/* Skills */}
                    {(profile.skills || profile.services) && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Fähigkeiten</h3>
                        <div className="flex flex-wrap gap-2">
                          {(profile.skills || profile.services || []).map((skill, index) => (
                            <span
                              key={index}
                              className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sprachen */}
                    {profile.languages && profile.languages.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Sprachen</h3>
                        <div className="space-y-2">
                          {profile.languages.map((lang, index) => (
                            <div key={index} className="flex justify-between">
                              <span className="font-medium">{lang.language}</span>
                              <span className="text-gray-600">{lang.proficiency}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="space-y-4">
                    {reviews.length > 0 ? (
                      reviews.map(review => (
                        <div key={review.id} className="border-b pb-4 last:border-b-0">
                          <div className="flex items-start gap-3">
                            <Image
                              src={review.reviewerImage || '/images/default-avatar.png'}
                              alt={review.reviewerName}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{review.reviewerName}</span>
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <FiStar
                                      key={i}
                                      size={14}
                                      className={
                                        i < review.rating
                                          ? 'text-yellow-500 fill-current'
                                          : 'text-gray-300'
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-gray-700 text-sm">{review.comment}</p>
                              <p className="text-gray-500 text-xs mt-1">
                                {review.date?.toDate
                                  ? review.date.toDate().toLocaleDateString('de-DE')
                                  : 'Datum unbekannt'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FiStar size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>Noch keine Bewertungen vorhanden.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'portfolio' && (
                  <div className="space-y-4">
                    {profile.portfolio && profile.portfolio.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profile.portfolio.map((item, index) => (
                          <div
                            key={index}
                            className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                          >
                            {item.imageUrl && (
                              <div className="relative h-48">
                                <Image
                                  src={item.imageUrl}
                                  alt={item.title}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <div className="p-4">
                              <h4 className="font-semibold mb-2">{item.title}</h4>
                              <p className="text-gray-600 text-sm">{item.description}</p>
                              {item.projectUrl && (
                                <a
                                  href={item.projectUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[#14ad9f] hover:text-teal-600 text-sm mt-2"
                                >
                                  <FiEye size={14} />
                                  Projekt ansehen
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FiBriefcase size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>Noch keine Portfolio-Einträge vorhanden.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderProfilePage;
