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
  FiClock,
  FiCheckCircle,
  FiHome,
  FiAward,
} from 'react-icons/fi';
import { Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import CompanyReviewManagement from '@/components/CompanyReviewManagement';
import DirectChatModal from '@/components/DirectChatModal';
import { ProviderBookingModal } from '@/app/dashboard/company/[uid]/provider/[id]/components/ProviderBookingModal';
import CreateOrderModal from '@/app/dashboard/user/[uid]/components/CreateOrderModal';
import RequestQuoteModal from '@/components/RequestQuoteModal';
import { auth } from '@/firebase/clients';
import { onAuthStateChanged, User } from 'firebase/auth';
import { UserProfileData } from '@/types/types';

// Review Interface
interface Review {
  id: string;
  providerId: string;
  customerName?: string;
  userName?: string;
  rating: number;
  comment?: string;
  serviceType?: string;
  createdAt: any;
}

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
  // Profil URL von Taskilo
  taskiloProfileUrl?: string;
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
  const [showChatModal, setShowChatModal] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [bookingData, setBookingData] = useState<{
    selection: any;
    time: string;
    durationString: string;
    description: string;
  } | null>(null);

  const companyId = params?.id as string;

  // Funktion zum Starten eines neuen Chats
  const handleStartChat = () => {
    if (!currentUser) {
      // Benutzer zur Anmeldung weiterleiten
      window.location.href = `/login?redirectTo=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    // Chat-Modal öffnen
    setShowChatModal(true);
  };

  // Funktionen für das Buchungsmodal
  const handleBookNow = async () => {
    if (!currentUser) {
      // Benutzer zur Anmeldung weiterleiten
      window.location.href = `/login?redirectTo=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    // User-Profil laden falls noch nicht vorhanden
    if (!userProfile) {
      await loadUserProfile();
    }

    // Direkt CreateOrderModal öffnen
    setIsCreateOrderModalOpen(true);
  };

  // Hilfsfunktion zum Laden des User-Profils
  const loadUserProfile = async () => {
    if (!currentUser) return;

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfileData);
      }
    } catch (error) {}
  };

  const handleBookingConfirm = async (
    selection: any,
    time: string,
    durationString: string,
    description: string
  ) => {
    try {
      // Prüfe ob Profile verfügbar ist
      if (!profile) {
        throw new Error('Provider-Profil nicht verfügbar');
      }

      setIsBookingModalOpen(false);
      setIsCreateOrderModalOpen(true);
    } catch (error) {
      alert('Fehler bei der Buchung. Bitte versuchen Sie es erneut.');
    }
  };

  const handleCloseBookingModal = () => {
    setIsBookingModalOpen(false);
  };

  // Handler für das CreateOrderModal
  const handleCreateOrderSuccess = () => {
    setIsCreateOrderModalOpen(false);
    // Optional: Success-Nachricht anzeigen oder zur Auftragsübersicht navigieren
  };

  const handleCloseCreateOrderModal = () => {
    setIsCreateOrderModalOpen(false);
  };

  // Hilfsfunktion für Kategorie-URLs
  const getCategoryUrl = (category: string) => {
    // Normalisiere Kategorie-Namen für URLs (Leerzeichen zu Bindestrichen, & zu "und")
    const normalizedCategory = category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'und');
    return `/services/${normalizedCategory}`;
  };

  const getSubcategoryUrl = (category: string, subcategory: string) => {
    // Normalisiere beide für URLs (& zu "und")
    const normalizedCategory = category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'und');
    const normalizedSubcategory = subcategory.toLowerCase().replace(/\s+/g, '-');
    return `/services/${normalizedCategory}/${normalizedSubcategory}`;
  };

  // Auth State überwachen
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // User-Profil laden wenn User angemeldet ist
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUser) {
        setUserProfile(null);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfileData);
        }
      } catch (error) {}
    };

    fetchUserProfile();
  }, [currentUser]);

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      if (!companyId) {
        setError('Ungültige Firma-ID');
        setLoading(false);
        return;
      }

      try {
        let userData = null;

        // Priorität 1: Lade aus der companies Collection (Hauptquelle für Unternehmensdaten)
        const companyDocRef = doc(db, 'companies', companyId);
        const companyDoc = await getDoc(companyDocRef);

        if (companyDoc.exists()) {
          userData = companyDoc.data();
        } else {
          // Fallback: Lade aus der users Collection
          const userDocRef = doc(db, 'users', companyId);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            userData = userDoc.data();
          }
        }

        if (userData) {
          // Extrahiere Profilbild aus verschiedenen möglichen Quellen
          const profilePicture =
            userData.profilePictureFirebaseUrl ||
            userData.profilePictureURL ||
            userData.companyLogo ||
            userData.photoURL ||
            userData.step3?.profilePictureURL ||
            '';

          // Extrahiere echte Beschreibung aus DB (nicht den Mock-Text)
          const description =
            userData.publicDescription ||
            userData.description ||
            userData.step2?.description ||
            'Kein Beschreibungstext verfügbar.';

          // Extrahiere Standort-Informationen (basierend auf echten DB-Daten)
          const city =
            userData.city ||
            userData.companyCity ||
            userData.companyCityForBackend ||
            userData.step2?.city ||
            userData.personalCity ||
            userData.step1?.personalCity ||
            'Sellin';

          const country =
            userData.country === 'DE'
              ? 'Deutschland'
              : userData.country || userData.companyCountryForBackend === 'DE'
                ? 'Deutschland'
                : userData.companyCountryForBackend || userData.step2?.country === 'DE'
                  ? 'Deutschland'
                  : userData.step2?.country || 'Deutschland';

          // Extrahiere Bewertungsdaten aus der DB (keine Mock-Daten)
          const averageRating = userData.averageRating || 0;
          const totalReviews = userData.totalReviews || 0;
          const completedJobs = userData.completedJobs || 0;

          // Verarbeite Skills aus verschiedenen Quellen
          const skills = userData.skills || [];

          // Verarbeite echte Spezialgebiete (nicht skills duplizieren)
          const specialties = (() => {
            if (userData.specialties && userData.specialties.length > 0) {
              return userData.specialties;
            }
            // Keine Fallback-Duplizierung - leer lassen wenn keine echten Spezialgebiete vorhanden
            return [];
          })();

          // Verarbeite Sprachen (repariere kaputte Datenstrukturen)
          const languages = (() => {
            // Filtere kaputte "[object Object]" Einträge aus
            if (userData.languages && Array.isArray(userData.languages)) {
              const validLanguages = userData.languages.filter(
                (lang: any) =>
                  lang &&
                  typeof lang === 'string' &&
                  lang !== '[object Object]' &&
                  lang.trim() !== ''
              );

              if (validLanguages.length > 0) {
                return validLanguages.map((lang: string) => ({
                  language: lang.trim(),
                  proficiency: 'Fließend',
                }));
              }
            }

            // Fallback von step2.languages String
            if (userData.step2?.languages && typeof userData.step2.languages === 'string') {
              return userData.step2.languages.split(',').map((lang: string) => ({
                language: lang.trim(),
                proficiency: 'Fließend',
              }));
            }

            // Demo-Fallback
            return [{ language: 'Deutsch', proficiency: 'Muttersprache' }];
          })();

          setProfile({
            id: companyId,
            companyName:
              userData.companyName ||
              userData.step2?.companyName ||
              'Professioneller Service-Anbieter',
            displayName:
              userData.companyName || userData.step2?.companyName || userData.displayName,
            description,
            selectedSubcategory: userData.selectedSubcategory,
            selectedCategory: userData.selectedCategory,
            profilePictureFirebaseUrl: profilePicture,
            photoURL: profilePicture,
            city,
            country,
            companyCityForBackend: userData.companyCityForBackend,
            companyPostalCodeForBackend: userData.companyPostalCodeForBackend,
            companyCountryForBackend: userData.companyCountryForBackend,
            companyAddressLine1ForBackend: userData.companyAddressLine1ForBackend,
            isVerified: userData.stripeVerificationStatus === 'verified',
            hourlyRate:
              userData.hourlyRate ||
              userData.basePrice ||
              parseInt(userData.step3?.hourlyRate) ||
              41,
            radiusKm: userData.radiusKm || userData.maxTravelDistance || 30,
            stripeVerificationStatus: userData.stripeVerificationStatus,
            taskiloProfileUrl: userData.taskiloProfileUrl,
            // Realistische Metriken basierend auf echten Daten
            averageRating,
            totalReviews,
            completedJobs,
            responseTime:
              userData.responseTime ||
              userData.responseTimeGuarantee ||
              userData.advanceBookingHours ||
              24,
            completionRate: 98, // Standard hohe Abschlussrate
            totalOrders: completedJobs,
            // Fähigkeiten und Portfolio
            skills,
            specialties,
            languages,
            portfolio: userData.portfolio || [],
            certifications: userData.certifications || [],
            education: userData.education || [],
          });
        } else {
          // Fallback: Lade aus der companies-Sammlung
          const companyDocRef = doc(db, 'companies', companyId);
          const companyDoc = await getDoc(companyDocRef);

          if (companyDoc.exists()) {
            const companyData = companyDoc.data();

            setProfile({
              id: companyId,
              companyName:
                companyData.companyName ||
                companyData.step2?.companyName ||
                companyData.step1?.companyName ||
                companyData.firstName
                  ? `${companyData.firstName} ${companyData.lastName || ''}`.trim()
                  : companyData.email?.split('@')[0] || 'Unbenanntes Unternehmen',
              description: companyData.description || companyData.publicDescription || '',
              selectedSubcategory: companyData.selectedSubcategory,
              selectedCategory: companyData.selectedCategory,
              profilePictureFirebaseUrl:
                companyData.profilePictureFirebaseUrl ||
                companyData.profilePictureURL ||
                companyData.photoURL,
              city: companyData.city || companyData.companyCity,
              country: companyData.country === 'DE' ? 'Deutschland' : companyData.country,
              isVerified: companyData.stripeVerificationStatus === 'verified',
              hourlyRate: companyData.hourlyRate || 0,
              radiusKm: companyData.radiusKm || 30,
              stripeVerificationStatus: companyData.stripeVerificationStatus,
              averageRating: companyData.averageRating || 4.8,
              totalReviews: companyData.totalReviews || 12,
              completedJobs: companyData.completedJobs || 15,
              responseTime: companyData.responseTime || 24,
              skills: companyData.skills || [],
              specialties: companyData.specialties || [],
              languages: companyData.languages || [],
              portfolio: companyData.portfolio || [],
              certifications: companyData.certifications || [],
              education: companyData.education || [],
            });
          } else {
            setError('Firma nicht gefunden');
          }
        }
      } catch (err) {
        setError('Fehler beim Laden des Firmenprofils');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyProfile();

    // Lade echte Bewertungen
    const fetchReviews = async () => {
      try {
        setReviewsLoading(true);
        const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');

        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('providerId', '==', companyId),
          orderBy('createdAt', 'desc')
        );

        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviewsData: Review[] = reviewsSnapshot.docs.map(doc => ({
          id: doc.id,
          providerId: doc.data().providerId,
          customerName: doc.data().customerName,
          userName: doc.data().userName,
          rating: doc.data().rating || 0,
          comment: doc.data().comment,
          serviceType: doc.data().serviceType,
          createdAt: doc.data().createdAt,
        }));

        setReviews(reviewsData);

        // Berechne echte Bewertungsstatistiken
        if (reviewsData.length > 0) {
          const totalRating = reviewsData.reduce((sum, review) => sum + (review.rating || 0), 0);
          const averageRating = totalRating / reviewsData.length;

          // Aktualisiere Profile mit echten Bewertungsdaten
          setProfile(prevProfile =>
            prevProfile
              ? {
                  ...prevProfile,
                  averageRating: averageRating,
                  totalReviews: reviewsData.length,
                }
              : null
          );
        }
      } catch (error) {
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
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
      <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
        <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
        <div className="relative z-10 pt-20">
          <main>
            {/* Content with proper top spacing */}
            <div className="relative z-10">
              {/* Breadcrumb Navigation - Klickbarer Text-Pfad */}
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="text-sm text-white/80">
                  <Link href="/" className="hover:text-white transition-colors">
                    Startseite
                  </Link>
                  <span> / </span>
                  <Link href="/services" className="hover:text-white transition-colors">
                    Services
                  </Link>
                  {profile.selectedCategory && (
                    <>
                      <span> / </span>
                      <Link
                        href={getCategoryUrl(profile.selectedCategory)}
                        className="hover:text-white transition-colors"
                      >
                        {profile.selectedCategory}
                      </Link>
                    </>
                  )}
                  {profile.selectedSubcategory && (
                    <>
                      <span> / </span>
                      <Link
                        href={getSubcategoryUrl(
                          profile.selectedCategory!,
                          profile.selectedSubcategory
                        )}
                        className="hover:text-white transition-colors"
                      >
                        {profile.selectedSubcategory}
                      </Link>
                    </>
                  )}
                  <span> / </span>
                  <span className="text-white font-medium">{profile.companyName}</span>
                </div>
              </div>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column - Main Content */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Provider Header Card */}
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden">
                      <div className="p-8">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-6">
                            {/* Profile Image */}
                            <div className="flex-shrink-0">
                              {profile.profilePictureFirebaseUrl ? (
                                <Image
                                  src={profile.profilePictureFirebaseUrl}
                                  alt={profile.companyName}
                                  width={120}
                                  height={120}
                                  className="w-30 h-30 rounded-full object-cover border-4 border-gray-100"
                                />
                              ) : (
                                <div className="w-30 h-30 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-100">
                                  <FiUser size={48} className="text-gray-400" />
                                </div>
                              )}
                            </div>

                            {/* Provider Info */}
                            <div className="flex-grow">
                              <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold text-gray-900">
                                  {profile.companyName}
                                </h1>
                                {profile.isVerified && (
                                  <FiCheckCircle className="text-green-500" size={24} />
                                )}
                              </div>

                              <p className="text-gray-600 text-lg mb-4">
                                {profile.selectedSubcategory || 'Professioneller Service'}
                              </p>

                              {/* Rating and Location */}
                              <div className="flex items-center gap-6 mb-4 flex-wrap">
                                <div className="flex items-center gap-1 whitespace-nowrap">
                                  <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-4 h-4 ${
                                          i < Math.floor(profile.averageRating || 0)
                                            ? 'text-yellow-400 fill-current'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="font-semibold text-gray-900 ml-1">
                                    {(profile.averageRating || 0).toFixed(1)}
                                  </span>
                                  <span className="text-gray-500 text-sm ml-1">
                                    ({profile.totalReviews || 0} Bewertungen)
                                  </span>
                                </div>

                                {fullAddress && (
                                  <div className="flex items-center gap-1 text-gray-600">
                                    <FiMapPin size={16} />
                                    <span>{fullAddress}</span>
                                  </div>
                                )}
                              </div>

                              {/* Stats */}
                              <div className="flex items-center gap-8 text-sm text-gray-600">
                                <span>{profile.completedJobs || 0} Aufträge abgeschlossen</span>
                                {profile.responseTime && (
                                  <div className="flex items-center gap-1">
                                    <FiClock size={14} />
                                    <span>Antwortet in ~{profile.responseTime}h</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* About Section */}
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-8">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">Über mich</h2>
                      <div className="prose prose-lg max-w-none">
                        <div className="text-gray-700 leading-relaxed space-y-4">
                          {profile.description ? (
                            profile.description.split('\n').map(
                              (paragraph, index) =>
                                paragraph.trim() && (
                                  <p key={index} className="break-words">
                                    {paragraph.trim()}
                                  </p>
                                )
                            )
                          ) : (
                            <p className="text-gray-500 italic">
                              Noch keine Beschreibung verfügbar.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Skills and Expertise */}
                    {profile.skills && profile.skills.length > 0 && (
                      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">
                          Fähigkeiten und Expertise
                        </h2>

                        {/* Main Skills */}
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Hauptkompetenzen
                          </h3>
                          <div className="flex flex-wrap gap-3">
                            {profile.skills.map((skill, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full"
                              >
                                <span className="text-gray-800 font-medium">{skill}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Specialties - nur anzeigen wenn echte Spezialgebiete vorhanden */}
                        {profile.specialties && profile.specialties.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                              Spezialgebiete
                            </h3>
                            <div className="flex flex-wrap gap-3">
                              {profile.specialties.map((specialty, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2 px-4 py-2 bg-[#14ad9f] text-white rounded-full"
                                >
                                  <span className="font-medium">{specialty}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Languages */}
                        {profile.languages && profile.languages.length > 0 && (
                          <div className="mt-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sprachen</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {profile.languages.map((lang, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <span className="font-medium text-gray-800">{lang.language}</span>
                                  <span className="text-gray-500">- {lang.proficiency}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reviews Section */}
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-8">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                          Bewertungen{' '}
                          {reviews.length > 0 && (
                            <span className="text-lg font-normal text-gray-500">
                              ({reviews.length})
                            </span>
                          )}
                        </h2>
                        {reviews.length > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-5 h-5 ${
                                    i < Math.floor(profile.averageRating || 0)
                                      ? 'text-yellow-400 fill-current'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="font-semibold text-gray-900">
                              {(profile.averageRating || 0).toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>

                      {reviewsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <FiLoader className="animate-spin text-2xl text-[#14ad9f] mr-2" />
                          <span className="text-gray-600">Lade Bewertungen...</span>
                        </div>
                      ) : reviews.length > 0 ? (
                        <div className="space-y-6">
                          {reviews.map(review => (
                            <div
                              key={review.id}
                              className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0"
                            >
                              <div className="flex items-start gap-4">
                                <div className="flex-shrink-0">
                                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                                    <FiUser className="text-gray-400 text-lg" />
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <h4 className="font-medium text-gray-900">
                                        {review.customerName || review.userName || 'Anonymer Kunde'}
                                      </h4>
                                      <div className="flex items-center gap-2 mt-1">
                                        <div className="flex">
                                          {[...Array(5)].map((_, i) => (
                                            <Star
                                              key={i}
                                              className={`w-4 h-4 ${
                                                i < (review.rating || 0)
                                                  ? 'text-yellow-400 fill-current'
                                                  : 'text-gray-300'
                                              }`}
                                            />
                                          ))}
                                        </div>
                                        <span className="text-sm text-gray-500">
                                          {review.rating}/5
                                        </span>
                                      </div>
                                    </div>
                                    <time className="text-sm text-gray-500">
                                      {review.createdAt?.toDate
                                        ? review.createdAt.toDate().toLocaleDateString('de-DE')
                                        : new Date(review.createdAt).toLocaleDateString('de-DE')}
                                    </time>
                                  </div>
                                  {review.comment && (
                                    <p className="text-gray-700 leading-relaxed">
                                      {review.comment}
                                    </p>
                                  )}
                                  {review.serviceType && (
                                    <div className="mt-3">
                                      <span className="inline-block bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                                        {review.serviceType}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="mb-4">
                            <FiAward className="mx-auto text-4xl text-gray-300" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Noch keine Bewertungen vorhanden
                          </h3>
                          <p className="text-gray-500">
                            Seien Sie der Erste, der eine Bewertung für {profile.companyName}{' '}
                            abgibt.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Portfolio Section */}
                    {profile.portfolio && profile.portfolio.length > 0 && (
                      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Portfolio</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {profile.portfolio.map((item, index) => (
                            <div key={item.id || index} className="group cursor-pointer">
                              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300">
                                {item.imageUrl && (
                                  <div className="aspect-video bg-gray-200 overflow-hidden relative">
                                    <Image
                                      src={item.imageUrl}
                                      alt={item.title}
                                      fill
                                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    {/* Play button overlay for videos */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center group-hover:bg-black/70 transition-colors">
                                        <svg
                                          className="w-6 h-6 text-white ml-1"
                                          fill="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path d="M8 5v14l11-7z" />
                                        </svg>
                                      </div>
                                    </div>
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
                                    <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
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
                  </div>

                  {/* Right Column - Contact Card */}
                  <div className="lg:col-span-1">
                    <div className="sticky top-8 space-y-6">
                      {/* Contact Card */}
                      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6">
                        {/* Provider Summary - Kompakter */}
                        <div className="text-center mb-4 border-b border-gray-200 pb-4">
                          <h2 className="text-lg font-bold text-gray-900 mb-1">
                            {profile.companyName}
                          </h2>
                          <p className="text-gray-600 text-sm mb-2">
                            {profile.selectedSubcategory || 'Professioneller Service'}
                          </p>

                          {/* Kompakte Rating-Zeile */}
                          <div className="flex items-center justify-center gap-3 mb-2">
                            <div className="flex items-center gap-1">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3.5 h-3.5 ${
                                      i < Math.floor(profile.averageRating || 0)
                                        ? 'text-yellow-400 fill-current'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="font-semibold text-gray-900 text-sm">
                                {(profile.averageRating || 0).toFixed(1)}
                              </span>
                            </div>

                            <span className="text-xs text-gray-500">
                              ({profile.totalReviews || 0} Bewertungen)
                            </span>
                          </div>

                          {/* Kompakte Location + Jobs */}
                          <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
                            {fullAddress && (
                              <div className="flex items-center gap-1">
                                <FiMapPin size={12} />
                                <span>{fullAddress}</span>
                              </div>
                            )}
                            <span>{profile.completedJobs || 0} Aufträge</span>
                          </div>
                        </div>

                        {/* Preis-Anzeige - kompakter */}
                        <div className="text-center mb-4">
                          <div className="text-2xl font-bold text-gray-900">
                            {profile.hourlyRate ? (
                              <>
                                Ab {profile.hourlyRate}€
                                <span className="text-base font-normal text-gray-500">/Std</span>
                              </>
                            ) : (
                              'Preis auf Anfrage'
                            )}
                          </div>
                        </div>

                        {/* Buttons mit Taskilo-Farben */}
                        <div className="space-y-2 mb-4">
                          <button
                            onClick={() => setIsQuoteModalOpen(true)}
                            className="w-full bg-[#14ad9f] text-white py-2.5 px-4 rounded-lg font-medium hover:bg-[#0d8a7a] transition-colors text-sm"
                          >
                            Angebot anfordern
                          </button>

                          <button
                            onClick={handleBookNow}
                            className="w-full bg-[#14ad9f]/10 text-[#14ad9f] border border-[#14ad9f]/20 py-2.5 px-4 rounded-lg font-medium hover:bg-[#14ad9f]/20 transition-colors text-sm"
                          >
                            Jetzt buchen
                          </button>

                          <button
                            onClick={handleStartChat}
                            className="w-full border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
                          >
                            Kontakt
                          </button>
                        </div>

                        {/* Quick Info - kompakter */}
                        <div className="pt-4 border-t space-y-2">
                          {profile.taskiloProfileUrl && (
                            <div className="flex flex-col text-xs">
                              <span className="text-gray-500 mb-1">Profil-URL:</span>
                              <a
                                href={profile.taskiloProfileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#14ad9f] hover:text-[#0d8a7a] break-all font-medium"
                              >
                                {profile.taskiloProfileUrl}
                              </a>
                            </div>
                          )}

                          {profile.responseTime && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Antwortzeit:</span>
                              <span className="text-gray-900 font-medium">
                                ~{profile.responseTime}h
                              </span>
                            </div>
                          )}

                          {profile.radiusKm && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Arbeitsradius:</span>
                              <span className="text-gray-900 font-medium">
                                {profile.radiusKm} km
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Verification Card */}
                      {profile.stripeVerificationStatus && (
                        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Verifizierung
                          </h3>
                          <div className="flex items-center gap-3">
                            <FiCheckCircle
                              className={`${
                                profile.stripeVerificationStatus === 'verified'
                                  ? 'text-green-500'
                                  : 'text-orange-500'
                              }`}
                              size={20}
                            />
                            <span className="text-gray-700">
                              {profile.stripeVerificationStatus === 'verified'
                                ? 'Identität verifiziert'
                                : 'Verifizierung in Bearbeitung'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Education & Certifications */}
                      {((profile.education && profile.education.length > 0) ||
                        (profile.certifications && profile.certifications.length > 0)) && (
                        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Qualifikationen
                          </h3>

                          {/* Education */}
                          {profile.education && profile.education.length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-medium text-gray-900 mb-3">Ausbildung</h4>
                              <div className="space-y-3">
                                {profile.education.map((edu, index) => (
                                  <div key={index} className="text-sm">
                                    <div className="font-medium text-gray-900">{edu.degree}</div>
                                    <div className="text-gray-600">{edu.school}</div>
                                    <div className="text-gray-500">{edu.year}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Certifications */}
                          {profile.certifications && profile.certifications.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3">Zertifikate</h4>
                              <div className="space-y-3">
                                {profile.certifications.map((cert, index) => (
                                  <div key={index} className="text-sm">
                                    <div className="font-medium text-gray-900">{cert.name}</div>
                                    <div className="text-gray-600">{cert.from}</div>
                                    <div className="text-gray-500">{cert.year}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Request Quote Modal */}
              {isQuoteModalOpen && profile && (
                <RequestQuoteModal
                  isOpen={isQuoteModalOpen}
                  onClose={() => setIsQuoteModalOpen(false)}
                  provider={{
                    id: profile.id,
                    companyName: profile.companyName,
                    displayName: profile.displayName,
                    selectedCategory: profile.selectedCategory,
                    selectedSubcategory: profile.selectedSubcategory,
                    hourlyRate: profile.hourlyRate,
                    profilePictureFirebaseUrl: profile.profilePictureFirebaseUrl,
                    profilePictureURL: profile.profilePictureURL,
                    photoURL: profile.photoURL,
                    description: profile.description,
                    location: profile.city,
                    completedJobs: profile.completedJobs,
                    rating: profile.averageRating,
                    responseTime: profile.responseTime,
                    radiusKm: profile.radiusKm,
                  }}
                  preselectedCategory={profile.selectedCategory}
                  preselectedSubcategory={profile.selectedSubcategory}
                />
              )}

              {/* Review Management Modal */}
              {showReviewManagement && (
                <CompanyReviewManagement companyId={companyId} companyName={profile.companyName} />
              )}

              {/* Chat Modal */}
              {showChatModal && currentUser && (
                <DirectChatModal
                  isOpen={showChatModal}
                  onClose={() => setShowChatModal(false)}
                  providerId={companyId}
                  providerName={profile.companyName}
                  companyId={currentUser.uid}
                  companyName={currentUser.displayName || 'Kunde'}
                />
              )}

              {/* Booking Modal */}
              {profile && (
                <ProviderBookingModal
                  isOpen={isBookingModalOpen}
                  onClose={handleCloseBookingModal}
                  provider={{
                    id: profile.id,
                    companyName: profile.companyName,
                    userName: profile.displayName,
                    hourlyRate: profile.hourlyRate || 50,
                    profilePictureFirebaseUrl: profile.profilePictureFirebaseUrl,
                    profilePictureURL: profile.profilePictureURL,
                    photoURL: profile.photoURL,
                    selectedCategory: profile.selectedCategory,
                    selectedSubcategory: profile.selectedSubcategory,
                    bio: profile.description,
                    description: profile.description,
                  }}
                  onConfirm={handleBookingConfirm}
                />
              )}

              {/* Create Order Modal */}
              {isCreateOrderModalOpen && currentUser && userProfile && (
                <div className="fixed inset-0 bg-transparent backdrop-blur-md z-50 flex items-start justify-center p-4 overflow-y-auto">
                  <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8 max-h-[calc(100vh-4rem)] flex flex-col">
                    {/* Fixed Header */}
                    <div className="flex items-center justify-between p-6 border-b bg-white rounded-t-lg flex-shrink-0 sticky top-0 z-10">
                      <h2 className="text-2xl font-bold text-gray-900">Auftrag erstellen</h2>
                      <button
                        onClick={handleCloseCreateOrderModal}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded"
                        aria-label="Modal schließen"
                      >
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto">
                      <CreateOrderModal
                        onClose={handleCloseCreateOrderModal}
                        onSuccess={handleCreateOrderSuccess}
                        currentUser={currentUser}
                        userProfile={userProfile}
                        preselectedProviderId={profile.id}
                        preselectedCategory={profile.selectedCategory}
                        preselectedSubcategory={profile.selectedSubcategory}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
