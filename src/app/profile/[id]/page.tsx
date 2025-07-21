'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import {
  FiLoader,
  FiAlertCircle,
  FiMapPin,
  FiUser,
  FiArrowLeft,
  FiStar,
  FiClock,
  FiCheckCircle,
  FiHome,
  FiAward,
} from 'react-icons/fi';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import ReviewList from '@/components/ReviewList';
import CompanyReviewManagement from '@/components/CompanyReviewManagement';
import { auth } from '@/firebase/clients';
import { onAuthStateChanged, User } from 'firebase/auth';

interface CompanyProfile {
  id: string;
  companyName: string;
  displayName?: string;
  description?: string;
  country?: string;
  city?: string;
  hourlyRate?: number;
  photoURL?: string;
  profilePictureURL?: string;
  profilePictureFirebaseUrl?: string;
  username?: string;
  isVerified?: boolean;
  // Portfolio und Skills
  portfolio?: PortfolioItem[];
  skills?: string[];
  specialties?: string[];
  languages?: { language: string; proficiency: string }[];
  education?: { school: string; degree: string; year: string }[];
  certifications?: { name: string; from: string; year: string }[];
  // Metriken
  responseTime?: number;
  completionRate?: number;
  totalOrders?: number;
  averageRating?: number;
  totalReviews?: number;
  completedJobs?: number;
  stripeVerificationStatus?: string;
  // Legacy Backend-Felder als Fallback
  companyCityForBackend?: string;
  companyPostalCodeForBackend?: string;
  companyCountryForBackend?: string;
  companyAddressLine1ForBackend?: string;
  selectedSubcategory?: string;
  selectedCategory?: string;
  radiusKm?: number;
}

interface PortfolioItem {
  id?: string;
  title: string;
  description: string;
  imageUrl?: string;
  projectUrl?: string;
  category: string;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showReviewManagement, setShowReviewManagement] = useState(false);

  const companyId = params?.id as string;

  // Auth State überwachen
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      if (!companyId) {
        setError('Ungültige Firma-ID');
        setLoading(false);
        return;
      }

      try {
        // Zuerst versuchen: companies-Dokument zu laden (Firmen-Profile)
        const companiesDocRef = doc(db, 'companies', companyId);
        const companiesDoc = await getDoc(companiesDocRef);

        if (companiesDoc.exists()) {
          const companyData = companiesDoc.data();

          // Prüfe alle möglichen Profilbild-URLs
          const profilePicture =
            companyData.profilePictureFirebaseUrl ||
            companyData.profilePictureUrl ||
            companyData.profilePictureURL ||
            companyData.step3?.profilePictureURL;

          setProfile({
            id: companyId,
            companyName: companyData.companyName || 'Unbekannte Firma',
            description: companyData.description || null,
            selectedSubcategory: companyData.selectedSubcategory,
            selectedCategory: companyData.selectedCategory,
            profilePictureFirebaseUrl: profilePicture,
            city: companyData.companyCity,
            country:
              companyData.companyCountryForBackend === 'DE'
                ? 'Deutschland'
                : companyData.companyCountryForBackend,
            companyCityForBackend: companyData.companyCityForBackend,
            companyPostalCodeForBackend: companyData.companyPostalCodeForBackend,
            companyCountryForBackend: companyData.companyCountryForBackend,
            companyAddressLine1ForBackend: companyData.companyAddressLine1ForBackend,
            isVerified: companyData.stripeVerificationStatus === 'verified',
            hourlyRate: companyData.hourlyRate,
            radiusKm: companyData.radiusKm,
            stripeVerificationStatus: companyData.stripeVerificationStatus,
            averageRating: companyData.averageRating || 0,
            totalReviews: companyData.totalReviews || 0,
            responseTime: companyData.responseTime || 24,
            completedJobs: companyData.completedJobs || 0,
            // Add missing fields
            specialties: companyData.specialties || [],
            languages: (() => {
              if (companyData.languages && Array.isArray(companyData.languages)) {
                // If it's an array of strings, convert to object format
                if (
                  companyData.languages.length > 0 &&
                  typeof companyData.languages[0] === 'string'
                ) {
                  return companyData.languages.map((lang: string) => ({
                    language: lang.trim(),
                    proficiency: 'Fließend',
                  }));
                }
                // If it's already in object format
                if (
                  companyData.languages.length > 0 &&
                  typeof companyData.languages[0] === 'object'
                ) {
                  return companyData.languages;
                }
              }
              return [];
            })(),
            skills: companyData.skills || [],
            portfolio: companyData.portfolio || [],
            certifications: companyData.certifications || [],
            education: companyData.education || [],
          });
        } else {
          // Fallback: Lade aus dem users-Dokument (Dashboard-Profil)
          const userDocRef = doc(db, 'users', companyId);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();

            // Prüfe alle möglichen Profilbild-URLs aus dem Dashboard-Profil
            const profilePicture =
              userData.photoURL || userData.profilePictureURL || userData.profilePictureFirebaseUrl;

            setProfile({
              id: companyId,
              companyName: userData.companyName || userData.displayName || 'Unbekannte Firma',
              displayName: userData.displayName,
              description: userData.description || userData['step2.description'] || null,
              country: userData.country,
              city: userData.city,
              hourlyRate: userData.hourlyRate,
              photoURL: profilePicture,
              username: userData.username,
              portfolio: userData.portfolio || [],
              skills: userData.skills || [],
              specialties: userData.specialties || [],
              languages: (() => {
                // First try step2.languages (most likely source)
                if (userData.step2?.languages) {
                  if (typeof userData.step2.languages === 'string') {
                    return userData.step2.languages.split(',').map((lang: string) => ({
                      language: lang.trim(),
                      proficiency: 'Fließend',
                    }));
                  }
                }

                // Fallback to step2.languages with dot notation
                if (userData['step2.languages']) {
                  if (typeof userData['step2.languages'] === 'string') {
                    return userData['step2.languages'].split(',').map((lang: string) => ({
                      language: lang.trim(),
                      proficiency: 'Fließend',
                    }));
                  }
                }

                // Check if languages already exist in correct format
                if (userData.languages && Array.isArray(userData.languages)) {
                  // If it's an array of objects with language/proficiency
                  if (
                    userData.languages.length > 0 &&
                    typeof userData.languages[0] === 'object' &&
                    userData.languages[0].language
                  ) {
                    return userData.languages;
                  }
                  // If it's an array of strings, convert to object format
                  if (userData.languages.length > 0 && typeof userData.languages[0] === 'string') {
                    return userData.languages.map((lang: string) => ({
                      language: lang.trim(),
                      proficiency: 'Fließend',
                    }));
                  }
                }

                return [];
              })(),
              education: userData.education || [],
              certifications: userData.certifications || [],
              responseTime: userData.responseTime || 24,
              completionRate: userData.completionRate || 95,
              totalOrders: userData.totalOrders || 0,
              averageRating: userData.averageRating || 0,
              totalReviews: userData.totalReviews || 0,
              isVerified: userData.stripeVerificationStatus === 'verified',
              stripeVerificationStatus: userData.stripeVerificationStatus,
              // Fallback zu Backend-Feldern
              selectedSubcategory: userData.selectedSubcategory,
              selectedCategory: userData.selectedCategory,
              radiusKm: userData.radiusKm,
              companyCityForBackend: userData.companyCityForBackend,
              companyPostalCodeForBackend: userData.companyPostalCodeForBackend,
              companyCountryForBackend: userData.companyCountryForBackend,
              companyAddressLine1ForBackend: userData.companyAddressLine1ForBackend,
            });
          } else {
            setError('Firma nicht gefunden');
          }
        }
      } catch (err) {
        console.error('Fehler beim Laden des Firmenprofils:', err);
        setError('Fehler beim Laden des Firmenprofils');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyProfile();
  }, [companyId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        <span>Lade Firmenprofil...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4 text-center">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md"
          role="alert"
        >
          <FiAlertCircle size={24} className="inline mr-2" />
          <strong className="font-bold">Fehler:</strong>
          <span className="block sm:inline ml-1">{error}</span>
        </div>
        <button
          onClick={() => router.back()}
          className="mt-4 text-[#14ad9f] hover:underline flex items-center gap-2"
        >
          <FiArrowLeft /> Zurück
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FiAlertCircle className="text-4xl text-gray-400 mr-3" />
        <span>Firmenprofil nicht gefunden</span>
      </div>
    );
  }

  // Formatiere die Adresse - zeige nur PLZ, Stadt, Land
  const fullAddress = (() => {
    // Primär: Dashboard-Daten verwenden
    if (profile.city && profile.country) {
      return `${profile.city}, ${profile.country}`;
    }

    // Fallback: Backend-Daten verwenden
    const postalCode = profile.companyPostalCodeForBackend;
    const city = profile.companyCityForBackend;
    const country =
      profile.companyCountryForBackend === 'DE' ? 'Deutschland' : profile.companyCountryForBackend;

    if (postalCode && city && country) {
      return `${postalCode} ${city}, ${country}`;
    }

    return null;
  })();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
        <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
        <div className="relative z-10">
          {/* Hero Section - Fiverr Style */}
          <div className="border-b border-white/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Left - Profile Info */}
                <div className="flex-1">
                  <div className="flex items-start gap-6">
                    {/* Profile Picture */}
                    <div className="flex-shrink-0">
                      {profile.photoURL || profile.profilePictureFirebaseUrl ? (
                        <Image
                          src={profile.photoURL || profile.profilePictureFirebaseUrl || ''}
                          alt={`Profilbild von ${profile.companyName}`}
                          width={120}
                          height={120}
                          className="rounded-full object-cover border-4 border-gray-100 shadow-lg"
                        />
                      ) : (
                        <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center border-4 border-gray-200">
                          <FiUser size={48} className="text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Profile Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-white">{profile.companyName}</h1>
                        {profile.isVerified && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            <FiCheckCircle className="mr-1" size={16} />
                            Verifiziert
                          </span>
                        )}
                      </div>

                      <p className="text-xl text-white/80 mb-3">
                        {profile.selectedSubcategory || 'Profi-Anbieter'}
                      </p>

                      {/* Rating und Location */}
                      <div className="flex items-center gap-6 mb-4">
                        {profile.averageRating !== undefined && profile.averageRating > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <FiStar
                                  key={i}
                                  className={`w-4 h-4 ${i < Math.floor(profile.averageRating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium text-white">
                              {profile.averageRating.toFixed(1)}
                            </span>
                            <span className="text-sm text-white/70">
                              ({profile.totalReviews} Bewertungen)
                            </span>
                          </div>
                        )}

                        {fullAddress && (
                          <div className="flex items-center gap-1 text-sm text-white/70">
                            <FiMapPin size={16} />
                            <span>{fullAddress}</span>
                          </div>
                        )}
                      </div>

                      {/* Quick Stats */}
                      <div className="flex items-center gap-6 text-sm text-white/80 mb-4">
                        {profile.totalOrders !== undefined && profile.totalOrders > 0 && (
                          <span>{profile.totalOrders} Aufträge abgeschlossen</span>
                        )}
                        {profile.responseTime && <span>Antwortet in ~{profile.responseTime}h</span>}
                      </div>

                      {/* Description in Hero */}
                      {profile.description && (
                        <div className="mt-4 pt-4 border-t border-white/20">
                          <div className="relative">
                            <p
                              className={`text-white/90 leading-relaxed text-sm transition-all duration-300 ${
                                isDescriptionExpanded ? '' : 'line-clamp-4'
                              }`}
                            >
                              {profile.description}
                            </p>

                            {/* Show expand/collapse button only if text is longer than 4 lines */}
                            {profile.description.length > 200 && (
                              <button
                                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                className="mt-2 text-white hover:text-white/80 text-sm font-medium transition-colors underline"
                              >
                                {isDescriptionExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right - Contact Card */}
                <div className="lg:w-80">
                  <div className="sticky top-4 bg-white/90 backdrop-blur-sm border border-white/20 rounded-lg p-6 shadow-lg">
                    <div className="text-center mb-4">
                      {profile.hourlyRate && (
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          ab {profile.hourlyRate}€
                          <span className="text-sm font-normal text-gray-500">/Stunde</span>
                        </div>
                      )}
                    </div>

                    <button className="w-full bg-[#14ad9f] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#0d8a7a] transition-colors mb-3">
                      Anfrage senden
                    </button>

                    <button className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                      Nachricht schreiben
                    </button>

                    {/* Quick Info */}
                    <div className="mt-4 pt-4 border-t space-y-2">
                      {profile.radiusKm && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Arbeitsradius:</span>
                          <span className="text-gray-900">{profile.radiusKm} km</span>
                        </div>
                      )}
                      {profile.completionRate !== undefined && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Erfolgsrate:</span>
                          <span className="text-gray-900">{profile.completionRate}%</span>
                        </div>
                      )}

                      {/* Specialties in Card */}
                      {profile.specialties && profile.specialties.length > 0 && (
                        <div className="pt-2">
                          <div className="text-sm text-gray-500 mb-2">Spezialitäten:</div>
                          <div className="flex flex-wrap gap-1">
                            {profile.specialties.map((specialty, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-[#14ad9f] text-white rounded text-xs"
                              >
                                {specialty}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Languages in Card */}
                      {profile.languages && profile.languages.length > 0 && (
                        <div className="pt-2">
                          <div className="text-sm text-gray-500 mb-2">Sprachen:</div>
                          <div className="space-y-1">
                            {profile.languages.map((lang, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span className="text-gray-700 font-medium">{lang.language}</span>
                                <span className="text-gray-500">{lang.proficiency}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Skills Section */}
                {profile.skills && profile.skills.length > 0 && (
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-white/20 p-6 shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Fähigkeiten</h2>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm border"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Portfolio Section */}
                {profile.portfolio && profile.portfolio.length > 0 && (
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-white/20 p-6 shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Portfolio</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {profile.portfolio.map((item, index) => (
                        <div key={item.id || index} className="group cursor-pointer">
                          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                            {item.imageUrl && (
                              <div className="aspect-video bg-gray-200 overflow-hidden">
                                <Image
                                  src={item.imageUrl}
                                  alt={item.title}
                                  width={400}
                                  height={225}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                            )}
                            <div className="p-4">
                              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                                {item.title}
                              </h3>
                              <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                                {item.description}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500 uppercase tracking-wide">
                                  {item.category}
                                </span>
                                {item.projectUrl && (
                                  <a
                                    href={item.projectUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#14ad9f] hover:text-[#0d8a7a] text-sm font-medium"
                                  >
                                    Ansehen →
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience Section */}
                {((profile.education && profile.education.length > 0) ||
                  (profile.certifications && profile.certifications.length > 0)) && (
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-white/20 p-6 shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Qualifikationen</h2>

                    {/* Education */}
                    {profile.education && profile.education.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ausbildung</h3>
                        <div className="space-y-4">
                          {profile.education.map((edu, index) => (
                            <div key={index} className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-2 h-2 bg-[#14ad9f] rounded-full mt-2"></div>
                              <div>
                                <h4 className="font-medium text-gray-900">{edu.degree}</h4>
                                <p className="text-gray-600">{edu.school}</p>
                                <p className="text-sm text-gray-500">{edu.year}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Certifications */}
                    {profile.certifications && profile.certifications.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Zertifikate</h3>
                        <div className="space-y-4">
                          {profile.certifications.map((cert, index) => (
                            <div key={index} className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                              <div>
                                <h4 className="font-medium text-gray-900">{cert.name}</h4>
                                <p className="text-gray-600">{cert.from}</p>
                                <p className="text-sm text-gray-500">{cert.year}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Reviews Section */}
                <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-white/20 p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Bewertungen{' '}
                      {profile.totalReviews &&
                        profile.totalReviews > 0 &&
                        `(${profile.totalReviews})`}
                    </h2>
                    {profile.averageRating !== undefined && profile.averageRating > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <FiStar
                              key={i}
                              className={`w-5 h-5 ${i < Math.floor(profile.averageRating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                        <span className="text-lg font-semibold text-gray-900">
                          {profile.averageRating.toFixed(1)}
                        </span>
                        <span className="text-gray-500">von 5</span>
                      </div>
                    )}
                  </div>

                  <ReviewList anbieterId={companyId} />
                </div>
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-6">
                {/* Verification */}
                {profile.stripeVerificationStatus && (
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-white/20 p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Verifizierung</h3>
                    <div className="flex items-center gap-3">
                      <FiCheckCircle
                        className={`${profile.stripeVerificationStatus === 'verified' ? 'text-green-500' : 'text-orange-500'}`}
                        size={20}
                      />
                      <span className="text-gray-700">
                        {profile.stripeVerificationStatus === 'verified'
                          ? 'Verifiziert'
                          : 'In Bearbeitung'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
