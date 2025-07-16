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

interface CompanyProfile {
  id: string;
  companyName: string;
  selectedSubcategory?: string;
  selectedCategory?: string;
  profilePictureFirebaseUrl?: string;
  profilePictureUrl?: string;
  profilePictureURL?: string;
  isVerified?: boolean;
  hourlyRate?: number;
  radiusKm?: number;
  // Adresse aus companyCityForBackend und companyPostalCodeForBackend
  companyCityForBackend?: string;
  companyPostalCodeForBackend?: string;
  companyCountryForBackend?: string;
  companyAddressLine1ForBackend?: string;
  // Zusätzliche Felder für die Anzeige
  averageRating?: number;
  totalReviews?: number;
  responseTime?: string;
  completedJobs?: number;
  stripeVerificationStatus?: string;
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
        // Versuche zuerst das companies-Dokument zu laden
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
            responseTime: companyData.responseTime || 'Unbekannt',
            completedJobs: companyData.completedJobs || 0,
          });
        } else {
          // Fallback: Lade aus dem users-Dokument
          const userDocRef = doc(db, 'users', companyId);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();

            // Prüfe alle möglichen Profilbild-URLs
            const profilePicture =
              userData.profilePictureFirebaseUrl ||
              userData.profilePictureUrl ||
              userData.profilePictureURL ||
              userData.step3?.profilePictureURL;

            setProfile({
              id: companyId,
              companyName:
                userData.companyName ||
                userData.firstName + ' ' + userData.lastName ||
                'Unbekannte Firma',
              selectedSubcategory: userData.selectedSubcategory,
              selectedCategory: userData.selectedCategory,
              profilePictureFirebaseUrl: profilePicture,
              companyCityForBackend: userData.companyCityForBackend,
              companyPostalCodeForBackend: userData.companyPostalCodeForBackend,
              companyCountryForBackend: userData.companyCountryForBackend,
              companyAddressLine1ForBackend: userData.companyAddressLine1ForBackend,
              isVerified: userData.stripeVerificationStatus === 'verified',
              hourlyRate: userData.hourlyRate,
              radiusKm: userData.radiusKm,
              stripeVerificationStatus: userData.stripeVerificationStatus,
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
  } // Formatiere die Adresse aus den Backend-Feldern
  const fullAddress = [
    profile.companyAddressLine1ForBackend,
    profile.companyPostalCodeForBackend && profile.companyCityForBackend
      ? `${profile.companyPostalCodeForBackend} ${profile.companyCityForBackend}`
      : null,
    profile.companyCountryForBackend === 'DE' ? 'Deutschland' : profile.companyCountryForBackend,
  ]
    .filter(Boolean)
    .join(', ');

  return (
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

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-[#14ad9f] to-[#0d8a7a] p-6 text-white">
            <div className="flex items-center gap-4">
              {profile.profilePictureFirebaseUrl ? (
                <Image
                  src={profile.profilePictureFirebaseUrl}
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
                <p className="text-white/90 text-lg">{profile.selectedSubcategory || 'Anbieter'}</p>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Linke Spalte - Service-Informationen */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Service-Informationen</h2>

                {fullAddress && (
                  <div className="flex items-start gap-3">
                    <FiMapPin className="text-gray-500 mt-1 flex-shrink-0" size={18} />
                    <div>
                      <p className="text-gray-700">{fullAddress}</p>
                      <p className="text-sm text-gray-500">Standort</p>
                    </div>
                  </div>
                )}

                {profile.hourlyRate && (
                  <div className="flex items-start gap-3">
                    <FiAward className="text-gray-500 mt-1 flex-shrink-0" size={18} />
                    <div>
                      <p className="text-gray-700">{profile.hourlyRate}€/Stunde</p>
                      <p className="text-sm text-gray-500">Stundensatz</p>
                    </div>
                  </div>
                )}

                {profile.radiusKm && (
                  <div className="flex items-start gap-3">
                    <FiMapPin className="text-gray-500 mt-1 flex-shrink-0" size={18} />
                    <div>
                      <p className="text-gray-700">{profile.radiusKm} km</p>
                      <p className="text-sm text-gray-500">Arbeitsradius</p>
                    </div>
                  </div>
                )}

                {profile.selectedCategory && (
                  <div className="flex items-start gap-3">
                    <FiUser className="text-gray-500 mt-1 flex-shrink-0" size={18} />
                    <div>
                      <p className="text-gray-700">{profile.selectedCategory}</p>
                      <p className="text-sm text-gray-500">Kategorie</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Rechte Spalte - Statistiken */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Statistiken</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {profile.averageRating !== undefined && profile.averageRating > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <FiStar className="text-yellow-500" size={18} />
                        <span className="font-semibold text-gray-800">
                          {profile.averageRating.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {profile.totalReviews} Bewertung{profile.totalReviews !== 1 ? 'en' : ''}
                      </p>
                    </div>
                  )}

                  {profile.completedJobs !== undefined && profile.completedJobs > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <FiCheckCircle className="text-green-500" size={18} />
                        <span className="font-semibold text-gray-800">{profile.completedJobs}</span>
                      </div>
                      <p className="text-sm text-gray-600">Abgeschlossene Aufträge</p>
                    </div>
                  )}

                  {profile.responseTime && profile.responseTime !== 'Unbekannt' && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <FiClock className="text-blue-500" size={18} />
                        <span className="font-semibold text-gray-800">{profile.responseTime}</span>
                      </div>
                      <p className="text-sm text-gray-600">Antwortzeit</p>
                    </div>
                  )}

                  {profile.stripeVerificationStatus && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <FiCheckCircle
                          className={`${profile.stripeVerificationStatus === 'verified' ? 'text-green-500' : 'text-orange-500'}`}
                          size={18}
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
          </div>
        </div>
      </div>
    </main>
  );
}
