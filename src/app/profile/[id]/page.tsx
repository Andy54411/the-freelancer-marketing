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

  const companyId = params?.id as string;

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      if (!companyId) {
        setError('Ungültige Firma-ID');
        setLoading(false);
        return;
      }

      try {
        // Hauptquelle: Lade aus dem users-Dokument (Dashboard-Profil)
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
            description: userData.description,
            country: userData.country,
            city: userData.city,
            hourlyRate: userData.hourlyRate,
            photoURL: profilePicture,
            username: userData.username,
            portfolio: userData.portfolio || [],
            skills: userData.skills || [],
            languages: userData.languages || [],
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
          // Fallback: Versuche companies-Dokument zu laden
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
              selectedSubcategory: companyData.selectedSubcategory,
              selectedCategory: companyData.selectedCategory,
              profilePictureFirebaseUrl: profilePicture,
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

  // Formatiere die Adresse - prioritäre Verwendung von Dashboard-Daten
  const fullAddress = [
    // Primär: Dashboard-Daten
    profile.city && profile.country ? `${profile.city}, ${profile.country}` : null,
    // Fallback: Backend-Daten
    !profile.city && profile.companyAddressLine1ForBackend
      ? profile.companyAddressLine1ForBackend
      : null,
    !profile.city && profile.companyPostalCodeForBackend && profile.companyCityForBackend
      ? `${profile.companyPostalCodeForBackend} ${profile.companyCityForBackend}`
      : null,
    !profile.country && profile.companyCountryForBackend === 'DE'
      ? 'Deutschland'
      : profile.companyCountryForBackend,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
                  <FiHome size={20} className="mr-2" />
                  <span className="font-medium">Tasko</span>
                </Link>
              </div>
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
              >
                <FiArrowLeft size={18} />
                <span>Zurück</span>
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-[#14ad9f] to-[#0d8a7a] p-6 text-white">
              <div className="flex items-center gap-4">
                {profile.photoURL || profile.profilePictureFirebaseUrl ? (
                  <Image
                    src={profile.photoURL || profile.profilePictureFirebaseUrl || ''}
                    alt={`Profilbild von ${profile.companyName}`}
                    width={80}
                    height={80}
                    className="rounded-full object-cover border-4 border-white"
                  />
                ) : (
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                    <FiUser size={40} className="text-white" />
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-bold flex items-center gap-2">
                    {profile.companyName}
                    {profile.isVerified && <FiCheckCircle className="text-green-300" size={24} />}
                  </h1>
                  <p className="text-white/90 text-lg">
                    {profile.selectedSubcategory || 'Anbieter'}
                  </p>
                  {profile.username && <p className="text-white/70 text-sm">@{profile.username}</p>}
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Linke Spalte - Service & Kontakt */}
                <div className="lg:col-span-1 space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                      Service-Informationen
                    </h2>

                    {fullAddress && (
                      <div className="flex items-start gap-3 mb-4">
                        <FiMapPin className="text-gray-500 mt-1 flex-shrink-0" size={18} />
                        <div>
                          <p className="text-gray-700">{fullAddress}</p>
                          <p className="text-sm text-gray-500">Standort</p>
                        </div>
                      </div>
                    )}

                    {profile.hourlyRate && (
                      <div className="flex items-start gap-3 mb-4">
                        <FiAward className="text-gray-500 mt-1 flex-shrink-0" size={18} />
                        <div>
                          <p className="text-gray-700">{profile.hourlyRate}€/Stunde</p>
                          <p className="text-sm text-gray-500">Stundensatz</p>
                        </div>
                      </div>
                    )}

                    {profile.radiusKm && (
                      <div className="flex items-start gap-3 mb-4">
                        <FiMapPin className="text-gray-500 mt-1 flex-shrink-0" size={18} />
                        <div>
                          <p className="text-gray-700">{profile.radiusKm} km</p>
                          <p className="text-sm text-gray-500">Arbeitsradius</p>
                        </div>
                      </div>
                    )}

                    {profile.responseTime && (
                      <div className="flex items-start gap-3 mb-4">
                        <FiClock className="text-gray-500 mt-1 flex-shrink-0" size={18} />
                        <div>
                          <p className="text-gray-700">~{profile.responseTime}h</p>
                          <p className="text-sm text-gray-500">Antwortzeit</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sprachen */}
                  {profile.languages && profile.languages.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">Sprachen</h3>
                      <div className="space-y-2">
                        {profile.languages.map((lang, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-gray-700">{lang.language}</span>
                            <span className="text-sm text-gray-500">{lang.proficiency}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {profile.skills && profile.skills.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">Fähigkeiten</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Statistiken */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Statistiken</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {profile.averageRating !== undefined && profile.averageRating > 0 && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <FiStar className="text-yellow-500" size={16} />
                            <span className="font-semibold text-gray-800">
                              {profile.averageRating.toFixed(1)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {profile.totalReviews} Bewertung{profile.totalReviews !== 1 ? 'en' : ''}
                          </p>
                        </div>
                      )}

                      {profile.completionRate !== undefined && profile.completionRate > 0 && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <FiCheckCircle className="text-green-500" size={16} />
                            <span className="font-semibold text-gray-800">
                              {profile.completionRate}%
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">Erfolgsrate</p>
                        </div>
                      )}

                      {profile.totalOrders !== undefined && profile.totalOrders > 0 && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <FiAward className="text-blue-500" size={16} />
                            <span className="font-semibold text-gray-800">
                              {profile.totalOrders}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">Abgeschlossene Aufträge</p>
                        </div>
                      )}

                      {profile.stripeVerificationStatus && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <FiCheckCircle
                              className={`${profile.stripeVerificationStatus === 'verified' ? 'text-green-500' : 'text-orange-500'}`}
                              size={16}
                            />
                            <span className="font-semibold text-gray-800">
                              {profile.stripeVerificationStatus === 'verified'
                                ? 'Verifiziert'
                                : 'In Bearbeitung'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">Verifikationsstatus</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rechte Spalte - Beschreibung und Portfolio */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Beschreibung */}
                  {profile.description && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800 mb-4">Über uns</h2>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {profile.description}
                      </p>
                    </div>
                  )}

                  {/* Portfolio */}
                  {profile.portfolio && profile.portfolio.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800 mb-4">Portfolio</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {profile.portfolio.map((item, index) => (
                          <div
                            key={item.id || index}
                            className="bg-white border rounded-lg overflow-hidden shadow-sm"
                          >
                            {item.imageUrl && (
                              <div className="h-48 bg-gray-200">
                                <Image
                                  src={item.imageUrl}
                                  alt={item.title}
                                  width={300}
                                  height={192}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="p-4">
                              <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                              <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">{item.category}</span>
                                {item.projectUrl && (
                                  <a
                                    href={item.projectUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#14ad9f] hover:underline"
                                  >
                                    Projekt ansehen
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ausbildung */}
                  {profile.education && profile.education.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800 mb-4">Ausbildung</h2>
                      <div className="space-y-4">
                        {profile.education.map((edu, index) => (
                          <div key={index} className="border-l-4 border-[#14ad9f] pl-4">
                            <h3 className="font-semibold text-gray-900">{edu.degree}</h3>
                            <p className="text-gray-600">{edu.school}</p>
                            <p className="text-sm text-gray-500">{edu.year}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Zertifikate */}
                  {profile.certifications && profile.certifications.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800 mb-4">Zertifikate</h2>
                      <div className="space-y-4">
                        {profile.certifications.map((cert, index) => (
                          <div key={index} className="border-l-4 border-green-500 pl-4">
                            <h3 className="font-semibold text-gray-900">{cert.name}</h3>
                            <p className="text-gray-600">{cert.from}</p>
                            <p className="text-sm text-gray-500">{cert.year}</p>
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
      </main>
    </>
  );
}
