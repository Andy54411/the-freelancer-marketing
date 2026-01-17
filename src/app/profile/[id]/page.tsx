'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, getDocs, limit, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import {
  FiLoader,
  FiAlertCircle,
  FiMapPin,
  FiArrowLeft,
  FiClock,
  FiCheckCircle,
  FiHome,
} from 'react-icons/fi';
import { Star, Heart, Share2, MoreHorizontal, Flag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { DynamicHeader } from '@/components/DynamicHeader';
import CompanyReviewManagement from '@/components/CompanyReviewManagement';
import DirectChatModal from '@/components/DirectChatModal';
import ProviderReviews from '@/components/ProviderReviews';
import { ProviderBookingModal } from '@/app/dashboard/company/[uid]/provider/[id]/components/ProviderBookingModal';
import CreateOrderModal from '@/app/dashboard/user/[uid]/components/CreateOrderModal';
import RequestQuoteModal from '@/components/RequestQuoteModal';
import { auth } from '@/firebase/clients';
import { onAuthStateChanged, User } from 'firebase/auth';
import { UserProfileData } from '@/types/types';
import LoginPopup from '@/components/LoginPopup';
import { TaskiloLevelBadge } from '@/components/level/TaskiloLevelBadge';
import { type TaskiloLevel } from '@/services/TaskiloLevelService';

// Review Interface
interface Review {
  id: string;
  providerId: string;
  customerName?: string;
  userName?: string;
  rating: number;
  comment?: string;
  serviceType?: string;
  createdAt: Date | { toDate: () => Date } | string;
}

interface CompanyProfile {
  id: string;
  companyName: string;
  displayName?: string;
  profileTitle?: string;
  description?: string;
  country?: string;
  city?: string;
  hourlyRate?: number;
  photoURL?: string;
  profilePictureURL?: string;
  profilePictureFirebaseUrl?: string;
  username?: string;
  isVerified?: boolean;
  taskerLevel?: TaskiloLevel;
  // Portfolio und Skills
  portfolio?: PortfolioItem[];
  skills?: string[];
  specialties?: string[];
  languages?: { language: string; proficiency: string }[];
  education?: { school: string; degree: string; year: string }[];
  certifications?: { name: string; from: string; year: string }[];
  // FAQs
  faqs?: FAQ[];
  // Service Packages
  servicePackages?: ServicePackage[];
  // Metriken
  responseTime?: number;
  completionRate?: number;
  totalOrders?: number;
  ordersInProgress?: number; // Aufträge in Bearbeitung
  averageRating?: number;
  totalReviews?: number;
  completedJobs?: number;
  repeatCustomerRate?: number; // Prozentsatz wiederkehrender Kunden (0-100)
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
  // Zusätzliche öffentliche Unternehmensinformationen
  employees?: string;
  legalForm?: string;
  serviceAreas?: string[];
  maxTravelDistance?: number;
  businessType?: string;
  workMode?: 'vor-ort' | 'remote' | 'hybrid' | string;
  profileBannerImage?: string;
  foundingYear?: string;
}

interface AdditionalService {
  name: string;
  price: number;
  description?: string;
}

interface ServicePackage {
  id: string;
  title?: string;
  name?: string;
  packageType: 'basic' | 'standard' | 'premium';
  price: number;
  deliveryTime: number;
  deliveryUnit: string;
  description: string;
  features: string[];
  additionalServices?: AdditionalService[];
  addonsTotal?: number;
  totalPrice?: number;
  serviceId?: string;
  subcategory?: string;
  duration?: string;
  revisions?: number;
}

interface PortfolioItem {
  id?: string;
  title: string;
  description: string;
  imageUrl?: string;
  additionalImages?: string[]; // Array für zusätzliche Bilder
  projectUrl?: string;
  category?: string;
  featured?: boolean;
  order?: number;
  createdAt?: string;
  clientName?: string;
  projectDate?: string;
  technologies?: string[];
  location?: string;
  duration?: string;
  budget?: string;
  status?: 'completed' | 'in-progress' | 'cancelled';
  views?: number; // Echte View-Anzahl
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
  order?: number;
  featured?: boolean;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_isDescriptionExpanded, _setIsDescriptionExpanded] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showReviewManagement, _setShowReviewManagement] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewCarouselIndex, setReviewCarouselIndex] = useState(0);
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([]);
  const [activePackageTab, setActivePackageTab] = useState(0);
  
  // Favoriten und Action-Bar States
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'report' | null>(null);
  const [_bookingData, _setBookingData] = useState<{
    selection: { date?: string; time?: string; service?: string };
    time: string;
    durationString: string;
    description: string;
  } | null>(null);

  const companyId = params?.id as string;

  // Funktion zum Inkrementieren der Portfolio-Views
  const incrementPortfolioViews = async (providerId: string, portfolioItems: PortfolioItem[]) => {
    if (!portfolioItems || portfolioItems.length === 0) return;

    try {
      const companyRef = doc(db, 'companies', providerId);
      const companyDoc = await getDoc(companyRef);
      
      if (companyDoc.exists()) {
        const data = companyDoc.data();
        const currentPortfolio = data?.step3?.portfolio || [];
        
        // Inkrementiere Views für alle Portfolio-Items
        const updatedPortfolio = currentPortfolio.map((item: PortfolioItem) => ({
          ...item,
          views: (item.views || 0) + 1
        }));
        
        // Update in Datenbank
        await updateDoc(companyRef, {
          'step3.portfolio': updatedPortfolio
        });
        
        return updatedPortfolio;
      }
    } catch {
      // Fehler stillschweigend ignorieren - View-Tracking ist nicht kritisch
    }
    return portfolioItems;
  };

  // Funktion zum Laden der echten abgeschlossenen Aufträge aus der reviews Collection
  // Da Reviews nur für abgeschlossene Aufträge erstellt werden, können wir sie als Proxy verwenden
  const loadRealCompletedJobs = async (providerId: string): Promise<number> => {
    try {
      // Query für Reviews dieses Providers aus der Subcollection
      const reviewsQuery = query(
        collection(db, `companies/${providerId}/reviews`),
        limit(100) // Vernünftiges Limit für Performance
      );

      const reviewsSnapshot = await getDocs(reviewsQuery);

      // Jede Review entspricht einem abgeschlossenen Auftrag
      const completedCount = reviewsSnapshot.size;

      return completedCount;
    } catch {
      return 0;
    }
  };

  // Funktion zur Berechnung der Stammkunden-Rate (wiederkehrende Kunden)
  // Ein Stammkunde ist jemand, der mehr als einmal beim Anbieter bestellt hat
  const loadRepeatCustomerRate = async (providerId: string): Promise<number> => {
    try {
      // Lade alle Aufträge des Anbieters
      const ordersQuery = query(
        collection(db, `companies/${providerId}/auftraege`),
        limit(200)
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      
      if (ordersSnapshot.size < 3) {
        // Mindestens 3 Aufträge für aussagekräftige Statistik
        return 0;
      }

      // Zähle wie oft jeder Kunde bestellt hat
      const customerOrderCounts = new Map<string, number>();
      
      ordersSnapshot.docs.forEach(doc => {
        const order = doc.data();
        const customerId = order.customerId || order.userId || order.clientId;
        if (customerId) {
          customerOrderCounts.set(customerId, (customerOrderCounts.get(customerId) || 0) + 1);
        }
      });

      // Berechne wie viele Kunden mehr als einmal bestellt haben
      const totalCustomers = customerOrderCounts.size;
      if (totalCustomers === 0) return 0;

      let repeatCustomers = 0;
      customerOrderCounts.forEach(count => {
        if (count > 1) repeatCustomers++;
      });

      // Berechne Prozentsatz (wiederkehrende Kunden / alle Kunden * 100)
      const repeatRate = (repeatCustomers / totalCustomers) * 100;
      
      return Math.round(repeatRate);
    } catch {
      return 0;
    }
  };

  // Funktion zum Laden der Aufträge in Bearbeitung
  const loadOrdersInProgress = async (providerId: string): Promise<number> => {
    try {
      const ordersQuery = query(
        collection(db, `companies/${providerId}/auftraege`),
        limit(200)
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      
      // Zähle Aufträge mit Status "in Bearbeitung" oder ähnlich
      let inProgressCount = 0;
      ordersSnapshot.docs.forEach(doc => {
        const order = doc.data();
        const status = (order.status || '').toUpperCase();
        // Aktive Aufträge die noch nicht abgeschlossen sind
        if (status === 'AKTIV' || 
            status === 'IN BEARBEITUNG' || 
            status === 'IN_PROGRESS' ||
            status === 'ACCEPTED' ||
            status === 'CONFIRMED' ||
            status === 'STARTED') {
          inProgressCount++;
        }
      });

      return inProgressCount;
    } catch {
      return 0;
    }
  };

  // Funktion zum Laden der echten Bewertungen
  const loadRealRatingData = async (
    providerId: string
  ): Promise<{ averageRating: number; totalReviews: number }> => {
    try {
      const reviewsQuery = query(collection(db, `companies/${providerId}/reviews`), limit(100));

      const reviewsSnapshot = await getDocs(reviewsQuery);
      const reviews = reviewsSnapshot.docs.map(doc => doc.data());

      if (reviews.length === 0) {
        return { averageRating: 0, totalReviews: 0 };
      }

      // Berechne durchschnittliche Bewertung
      const totalRating = reviews.reduce((sum, review) => {
        const rating = Number(review.rating) || 0;

        return sum + rating;
      }, 0);

      const averageRating = totalRating / reviews.length;

      return {
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews: reviews.length,
      };
    } catch {
      return { averageRating: 0, totalReviews: 0 };
    }
  };

  // Funktion zum Laden der Service-Pakete für Profil-Seite
  const loadProfileServicePackages = async (providerId: string): Promise<ServicePackage[]> => {
    try {
      const servicePackagesQuery = query(collection(db, `companies/${providerId}/servicePackages`));

      const servicePackagesSnapshot = await getDocs(servicePackagesQuery);
      const servicePackages = servicePackagesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Ensure required fields
          packageType: data.packageType || 'basic',
          price: data.price || 0,
          totalPrice: data.totalPrice || data.price || 0,
          addonsTotal: data.addonsTotal || 0,
          features: data.features || [],
          additionalServices: data.additionalServices || [],
        } as ServicePackage;
      });

      return servicePackages;
    } catch (error) {
      console.error('Error loading service packages:', error);
      return [];
    }
  };

  // Funktion zum Starten eines neuen Chats
  const handleStartChat = () => {
    if (!currentUser) {
      // Benutzer zur Anmeldung weiterleiten
      window.location.href = `/?redirectTo=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    // Chat-Modal öffnen
    setShowChatModal(true);
  };

  // Funktionen für das Buchungsmodal
  const handleBookNow = async () => {
    if (!currentUser) {
      // Benutzer zur Anmeldung weiterleiten
      window.location.href = `/?redirectTo=${encodeURIComponent(window.location.pathname)}`;
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
    } catch {
      // Fehler beim Laden des User-Profils - stillschweigend ignorieren
    }
  };

  // Teilen-Funktion mit Web Share API oder Fallback
  const handleShare = async () => {
    const shareData = {
      title: profile?.companyName || 'Dienstleister bei Taskilo',
      text: `Schau dir ${profile?.companyName} auf Taskilo an!`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled share
      }
    } else {
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
      alert('Link in die Zwischenablage kopiert!');
    }
  };

  const handleBookingConfirm = async (
    _selection: { date?: string; time?: string; service?: string },
    _time: string,
    _durationString: string,
    _description: string
  ) => {
    try {
      // Prüfe ob Profile verfügbar ist
      if (!profile) {
        throw new Error('Provider-Profil nicht verfügbar');
      }

      setIsBookingModalOpen(false);
      setIsCreateOrderModalOpen(true);
    } catch {
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
    // Use setTimeout to defer unsubscribe and avoid Firestore internal assertion errors
    return () => { setTimeout(() => unsubscribe(), 0); };
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
      } catch {
        // Fehler beim Laden des User-Profils - stillschweigend ignorieren
      }
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let userData: Record<string, any> | null = null;

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

          // Extrahiere echte Beschreibung aus DB - MASTER ist step3.bio!
          const description =
            userData.step3?.bio ||
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

          // Lade echte Bewertungsdaten und abgeschlossene Aufträge
          const realRatingData = await loadRealRatingData(companyId);
          const realCompletedJobs = await loadRealCompletedJobs(companyId);
          const repeatCustomerRate = await loadRepeatCustomerRate(companyId);
          const ordersInProgress = await loadOrdersInProgress(companyId);

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

          // Verarbeite Sprachen aus Datenbank (Array von Objekten)
          const languages = (() => {
            // Prüfe ob userData.languages das korrekte Format hat (Array von Objekten)
            if (userData.languages && Array.isArray(userData.languages)) {
              interface LanguageInput {
                language?: string;
                proficiency?: string;
              }
              const validLanguages = (userData.languages as LanguageInput[]).filter(
                (lang: LanguageInput) =>
                  lang &&
                  typeof lang === 'object' &&
                  lang.language &&
                  typeof lang.language === 'string' &&
                  lang.language.trim() !== ''
              );

              if (validLanguages.length > 0) {
                return validLanguages.map((lang: LanguageInput) => ({
                  language: lang.language!.trim(),
                  proficiency: lang.proficiency || 'Fließend',
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

            // Keine Sprachen gefunden - leeres Array zurückgeben
            return [];
          })();

          // Extrahiere Portfolio und FAQs aus step3
          const portfolio = userData.step3?.portfolio || userData.portfolio || [];
          const faqs = userData.step3?.faqs || userData.faqs || [];

          // Load service packages
          const servicePackages = await loadProfileServicePackages(companyId);

          setProfile({
            id: companyId,
            companyName:
              userData.companyName ||
              userData.step2?.companyName ||
              'Professioneller Service-Anbieter',
            displayName:
              userData.companyName || userData.step2?.companyName || userData.displayName,
            profileTitle: userData.profileTitle || '',
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
            isVerified: userData.adminApproved === true,
            taskerLevel: userData.taskerLevel?.currentLevel as TaskiloLevel || 'new',
            // Zusätzliche öffentliche Unternehmensinformationen
            employees: userData.employees || userData.step1?.employees || undefined,
            legalForm: userData.legalForm || userData.step1?.legalForm || undefined,
            serviceAreas: userData.serviceAreas || userData.step4?.serviceAreas || [],
            maxTravelDistance: userData.maxTravelDistance || userData.step4?.maxTravelDistance || userData.radiusKm || undefined,
            businessType: userData.businessType || userData.step1?.businessType || undefined,
            workMode: userData.workMode || userData.step4?.workMode || undefined,
            profileBannerImage: userData.profileBannerImage || userData.step3?.profileBannerImage || undefined,
            hourlyRate:
              userData.hourlyRate ||
              userData.basePrice ||
              parseInt(userData.step3?.hourlyRate) ||
              41,
            radiusKm: userData.radiusKm || userData.maxTravelDistance || 30,
            stripeVerificationStatus: userData.stripeVerificationStatus,
            taskiloProfileUrl: userData.taskiloProfileUrl,
            // Realistische Metriken basierend auf echten Daten
            averageRating: realRatingData.averageRating,
            totalReviews: realRatingData.totalReviews,
            completedJobs: realCompletedJobs,
            ordersInProgress: ordersInProgress,
            repeatCustomerRate: repeatCustomerRate,
            responseTime:
              userData.responseTime ||
              userData.responseTimeGuarantee ||
              userData.advanceBookingHours,
            completionRate: userData.completionRate,
            totalOrders: realCompletedJobs + ordersInProgress,
            // Fähigkeiten und Portfolio
            skills,
            specialties,
            languages,
            portfolio: portfolio,
            faqs: faqs,
            servicePackages: servicePackages,
            certifications: userData.certifications || [],
            education: userData.education || [],
          });
        } else {
          // Fallback: Lade aus der companies-Sammlung
          const companyDocRef = doc(db, 'companies', companyId);
          const companyDoc = await getDoc(companyDocRef);

          if (companyDoc.exists()) {
            const companyData = companyDoc.data();

            // Load service packages for fallback too
            const servicePackages = await loadProfileServicePackages(companyId);

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
              isVerified: companyData.adminApproved === true,
              taskerLevel: companyData.taskerLevel?.currentLevel as TaskiloLevel || 'new',
              hourlyRate: companyData.hourlyRate,
              radiusKm: companyData.radiusKm,
              stripeVerificationStatus: companyData.stripeVerificationStatus,
              averageRating: companyData.averageRating,
              totalReviews: companyData.totalReviews,
              completedJobs: companyData.completedJobs,
              repeatCustomerRate: companyData.repeatCustomerRate,
              responseTime: companyData.responseTime,
              skills: companyData.skills,
              specialties: companyData.specialties,
              languages: companyData.languages,
              portfolio: companyData.portfolio,
              servicePackages: servicePackages,
              certifications: companyData.certifications,
              education: companyData.education,
            });
            
            // Lade Favoriten-Anzahl
            setFavoriteCount(companyData.favoriteCount || 0);
          } else {
            setError('Firma nicht gefunden');
          }
        }
      } catch {
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
        const { collection, query, getDocs, orderBy } = await import('firebase/firestore');

        const reviewsQuery = query(
          collection(db, `companies/${companyId}/reviews`),
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
      } catch {
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();

    // Service-Pakete laden
    const loadServicePackages = async () => {
      try {
        const packagesRef = collection(db, 'companies', companyId, 'servicePackages');
        const querySnapshot = await getDocs(packagesRef);
        const packagesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as ServicePackage[];
        setServicePackages(packagesData);
      } catch {
        // Fehler beim Laden der Service-Pakete - stillschweigend ignorieren
      }
    };

    loadServicePackages();
  }, [companyId]);

  // Portfolio Views inkrementieren wenn Profil geladen wurde
  useEffect(() => {
    const trackPortfolioViews = async () => {
      if (!profile?.portfolio || profile.portfolio.length === 0) return;
      
      // Nur einmal pro Session tracken (sessionStorage verwenden)
      const viewedKey = `portfolio_viewed_${companyId}`;
      if (sessionStorage.getItem(viewedKey)) return;
      
      try {
        const updatedPortfolio = await incrementPortfolioViews(companyId, profile.portfolio);
        if (updatedPortfolio) {
          // Portfolio mit aktualisierten Views setzen
          setProfile(prev => prev ? { ...prev, portfolio: updatedPortfolio } : null);
          sessionStorage.setItem(viewedKey, 'true');
        }
      } catch {
        // Fehler beim Tracken ignorieren
      }
    };

    trackPortfolioViews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

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
      <DynamicHeader />
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-teal-50/30 relative">
        {/* Hero Section with Gradient */}
        <div className="absolute top-0 left-0 right-0 h-[400px] bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-800 overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-teal-400/20 rounded-full translate-x-1/4 translate-y-1/4 blur-3xl" />
        </div>
        <div className="relative z-10 pt-20">
          <main>
            {/* Content with proper top spacing */}
            <div className="relative z-10">
              {/* Breadcrumb Navigation with Action Buttons */}
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex items-center justify-between">
                  {/* Left: Breadcrumb */}
                  <nav className="flex items-center gap-2 text-sm text-white/70">
                    <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
                      <FiHome size={14} />
                      <span>Startseite</span>
                    </Link>
                    <span className="text-white/50">/</span>
                    <Link href="/services" className="hover:text-white transition-colors">
                      Services
                    </Link>
                    {profile.selectedCategory && (
                      <>
                        <span className="text-white/50">/</span>
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
                        <span className="text-white/50">/</span>
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
                    <span className="text-white/50">/</span>
                    <span className="text-white font-medium">{profile.companyName}</span>
                  </nav>

                  {/* Right: Action Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Favorite Button */}
                    <button
                      onClick={() => setIsFavorite(!isFavorite)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
                      title={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufuegen'}
                    >
                      <Heart 
                        size={16} 
                        className={isFavorite ? 'fill-red-500 text-red-500' : ''} 
                      />
                      <span className="text-sm font-medium">{favoriteCount}</span>
                    </button>

                    {/* Share Button */}
                    <button
                      onClick={handleShare}
                      className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
                      title="Profil teilen"
                    >
                      <Share2 size={16} />
                    </button>

                    {/* More Options Button */}
                    <div className="relative">
                      <button
                        onClick={() => setShowMoreOptions(!showMoreOptions)}
                        className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
                        title="Weitere Optionen"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {showMoreOptions && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50">
                          <button
                            onClick={() => {
                              setShowMoreOptions(false);
                              if (!currentUser) {
                                // Benutzer muss eingeloggt sein - zeige Login Modal
                                setPendingAction('report');
                                setIsLoginModalOpen(true);
                                return;
                              }
                              // TODO: Problem melden Modal oeffnen
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3"
                          >
                            <Flag size={16} className="text-gray-500" />
                            Ein Problem melden
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8">
                {/* Grid Layout - wie bei Fiverr: Links Content, Rechts Sidebar von oben */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column - Main Content */}
                  <div className="lg:col-span-8 space-y-6">
                    {/* Fiverr-Style Gig Overview Header */}
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                      <div className="p-8">
                        {/* Main Service Title - Use profileTitle if available, otherwise fallback */}
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 leading-tight">
                          {profile.profileTitle 
                            ? profile.profileTitle
                            : profile.description 
                              ? (profile.description.replace(/<[^>]*>/g, '').split('.')[0] + '.').substring(0, 200)
                              : `Ich biete professionelle ${profile.selectedSubcategory || 'Dienstleistungen'} für Ihr Projekt.`}
                        </h1>

                    {/* Seller Overview */}
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      {/* Profile Image */}
                      <div className="shrink-0">
                        {profile.profilePictureFirebaseUrl ? (
                          <figure className="relative">
                            <Image
                              src={profile.profilePictureFirebaseUrl}
                              alt={profile.companyName}
                              width={64}
                              height={64}
                              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                            />
                          </figure>
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-[#14ad9f] flex items-center justify-center border-2 border-gray-200">
                            <span className="text-white text-xl font-bold">
                              {profile.companyName?.charAt(0) || 'T'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Seller Info */}
                      <div className="flex flex-col gap-3">
                        {/* Name and Level */}
                        <div className="flex flex-wrap items-center gap-3">
                          <button 
                            className="text-gray-900 font-bold hover:underline"
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                          >
                            {profile.companyName}
                          </button>
                          
                          {/* Level Badge */}
                          <TaskiloLevelBadge level={profile.taskerLevel || 'new'} size="sm" />

                          {/* Orders Stats */}
                          {((profile.completedJobs || 0) > 0 || (profile.ordersInProgress || 0) > 0) && (
                            <>
                              <span className="hidden md:block w-px h-4 bg-gray-300" />
                              <span className="text-gray-500 text-sm">
                                {(profile.completedJobs || 0) > 0 && `${profile.completedJobs} abgeschlossen`}
                                {(profile.completedJobs || 0) > 0 && (profile.ordersInProgress || 0) > 0 && ' | '}
                                {(profile.ordersInProgress || 0) > 0 && `${profile.ordersInProgress} in Bearbeitung`}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Rating and Reviews */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-gray-900 fill-current" />
                            <span className="font-bold text-gray-900">
                              {(profile.averageRating || 0).toFixed(1)}
                            </span>
                            <button className="text-gray-500 hover:text-gray-700 text-sm">
                              (<span className="underline">{profile.totalReviews || 0} Bewertungen</span>)
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Loyalty Banner - nur wenn hohe Stammkundenrate (>= 30%) */}
                    {(profile.repeatCustomerRate || 0) >= 30 && (
                      <div className="mt-4 flex items-start gap-3">
                        {/* Trophy with Repeat Icon - wie bei Fiverr */}
                        <div className="shrink-0 relative">
                          <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M5 3h14a1 1 0 011 1v3a5 5 0 01-3 4.58V13a4 4 0 01-4 4h-2a4 4 0 01-4-4v-1.42A5 5 0 014 7V4a1 1 0 011-1zm0 4a3 3 0 002 2.83V7H5zm14 0v2.83A3 3 0 0019 7zM12 19v2h-2v-2h2zm-4 0v2H6v-2h2zm8 0v2h-2v-2h2z"/>
                          </svg>
                          {/* Small repeat icon overlay */}
                          <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5">
                            <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className="font-semibold text-gray-900">Die Leute kommen immer wieder!</span>
                          <span className="text-gray-500 ml-2">{profile.companyName} hat eine außergewöhnlich hohe Anzahl an Stammkunden.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                    {/* Provider Quick Stats Card */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                      <div className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          {/* Location */}
                          {fullAddress && (
                            <div className="flex flex-col">
                              <span className="text-gray-500 text-sm mb-1">Standort</span>
                              <div className="flex items-center gap-1 text-gray-900 font-medium">
                                <FiMapPin size={14} className="text-[#14ad9f]" />
                                <span className="text-sm">{fullAddress}</span>
                              </div>
                            </div>
                          )}

                          {/* Completed Jobs */}
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-sm mb-1">Abgeschlossen</span>
                            <span className="text-gray-900 font-bold">
                              {profile.completedJobs || 0} Aufträge
                            </span>
                          </div>

                          {/* Response Time */}
                          {profile.responseTime && (
                            <div className="flex flex-col">
                              <span className="text-gray-500 text-sm mb-1">Antwortzeit</span>
                              <div className="flex items-center gap-1 text-gray-900 font-medium">
                                <FiClock size={14} className="text-[#14ad9f]" />
                                <span>~{profile.responseTime}h</span>
                              </div>
                            </div>
                          )}

                          {/* Verified Status */}
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-sm mb-1">Status</span>
                            <div className="flex items-center gap-1">
                              {profile.isVerified ? (
                                <>
                                  <FiCheckCircle size={14} className="text-green-500" />
                                  <span className="text-green-600 font-medium">Verifiziert</span>
                                </>
                              ) : (
                                <span className="text-gray-600">Nicht verifiziert</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Portfolio Section */}
                    {profile.portfolio && profile.portfolio.length > 0 && (
                      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300">
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-2xl font-bold text-gray-900">Portfolio</h2>
                          <span className="text-sm text-gray-500">
                            {profile.portfolio.length} Projekte
                          </span>
                        </div>

                        <div className="space-y-6">
                          {profile.portfolio
                            .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
                            .slice(0, 6)
                            .map((item, index) => (
                              <div key={item.id || index} className="group">
                                <div
                                  className={`bg-white border rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 ${
                                    item.featured
                                      ? 'border-[#14ad9f] ring-2 ring-[#14ad9f]/20'
                                      : 'border-gray-200'
                                  }`}
                                >
                                  {/* Horizontal Layout: Links Bild, Rechts Text */}
                                  <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
                                    {/* Linke Seite: Hauptbild - nimmt 2 Spalten */}
                                    <div className="relative md:col-span-2">
                                      {item.imageUrl && (
                                        <div className="aspect-4/3 bg-gray-100 overflow-hidden relative">
                                          <Image
                                            src={item.imageUrl}
                                            alt={item.title}
                                            fill
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                                          />

                                          {item.featured && (
                                            <div className="absolute top-3 left-3 bg-[#14ad9f] text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                                              Top Projekt
                                            </div>
                                          )}
                                          {/* Hover Overlay - nur über dem Bild */}
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 pointer-events-none" />
                                        </div>
                                      )}
                                    </div>

                                    {/* Rechte Seite: Text Content - nimmt 3 Spalten */}
                                    <div className="md:col-span-3 p-4 flex flex-col justify-between">
                                      <div>
                                        {/* Category Badge und Status */}
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                          {item.category && (
                                            <span className="inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wide">
                                              {item.category}
                                            </span>
                                          )}
                                          {item.status && (
                                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                              item.status === 'completed' 
                                                ? 'bg-green-100 text-green-700' 
                                                : item.status === 'in-progress' 
                                                  ? 'bg-yellow-100 text-yellow-700'
                                                  : 'bg-red-100 text-red-700'
                                            }`}>
                                              {item.status === 'completed' ? 'Abgeschlossen' : item.status === 'in-progress' ? 'In Bearbeitung' : 'Abgebrochen'}
                                            </span>
                                          )}
                                        </div>

                                        {/* Title */}
                                        <h3 className="font-bold text-gray-900 mb-2 text-lg leading-tight">
                                          {item.title}
                                        </h3>

                                        {/* Description */}
                                        <p className="text-gray-600 text-sm mb-3 leading-relaxed line-clamp-3">
                                          {item.description}
                                        </p>

                                        {/* Project Details Grid */}
                                        {(item.clientName || item.location || item.budget || item.projectDate) && (
                                          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                                            {item.clientName && (
                                              <div className="flex items-center gap-1.5 text-gray-600">
                                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                <span>{item.clientName}</span>
                                              </div>
                                            )}
                                            {item.location && (
                                              <div className="flex items-center gap-1.5 text-gray-600">
                                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span>{item.location}</span>
                                              </div>
                                            )}
                                            {item.budget && (
                                              <div className="flex items-center gap-1.5 text-gray-600">
                                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>{item.budget}</span>
                                              </div>
                                            )}
                                            {item.projectDate && (
                                              <div className="flex items-center gap-1.5 text-gray-600">
                                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span>{new Date(item.projectDate).toLocaleDateString('de-DE')}</span>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Technologies */}
                                        {item.technologies && item.technologies.length > 0 && (
                                          <div className="mb-4">
                                            <div className="flex flex-wrap gap-2">
                                              {item.technologies
                                                .slice(0, 5)
                                                .map((tech, techIndex) => (
                                                  <span
                                                    key={techIndex}
                                                    className="px-2 py-1 bg-[#14ad9f]/10 text-[#14ad9f] text-xs rounded-md font-medium"
                                                  >
                                                    {tech}
                                                  </span>
                                                ))}
                                              {item.technologies.length > 5 && (
                                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">
                                                  +{item.technologies.length - 5}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Project Meta Info - am unteren Rand */}
                                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                          {item.duration && (
                                            <div className="flex items-center gap-1">
                                              <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                              </svg>
                                              <span>{item.duration}</span>
                                            </div>
                                          )}
                                          <div className="flex items-center gap-1">
                                            <svg
                                              className="w-4 h-4"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                              />

                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                              />
                                            </svg>
                                            <span>
                                              {item.views || 0} Views
                                            </span>
                                          </div>
                                        </div>

                                        {/* Action Button */}
                                        {item.projectUrl && (
                                          <a
                                            href={item.projectUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 bg-[#14ad9f] hover:bg-taskilo-hover text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                                          >
                                            <span>Live ansehen</span>
                                            <svg
                                              className="w-3 h-3"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                              />
                                            </svg>
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Weitere Bilder aus additionalImages */}
                                  {item.additionalImages && item.additionalImages.length > 0 && (
                                    <div className="border-t border-gray-100 p-4">
                                      <p className="text-xs text-gray-500 mb-3 font-medium">
                                        Weitere Projektbilder:
                                      </p>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {item.additionalImages
                                          .slice(0, 4)
                                          .map((imageUrl, imgIndex) => (
                                            <div
                                              key={imgIndex}
                                              className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group cursor-pointer"
                                            >
                                              <Image
                                                src={imageUrl}
                                                alt={`${item.title} - Bild ${imgIndex + 1}`}
                                                fill
                                                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                                                className="object-cover group-hover:scale-110 transition-transform duration-300"
                                              />

                                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 pointer-events-none" />
                                              {/* Optional: Click to enlarge functionality */}
                                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                <div className="bg-white/90 rounded-full p-2">
                                                  <svg
                                                    className="w-4 h-4 text-gray-700"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                  >
                                                    <path
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                      strokeWidth={2}
                                                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                                                    />
                                                  </svg>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>

                        {/* Show more button */}
                        {profile.portfolio.length > 6 && (
                          <div className="text-center mt-8">
                            <button className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-[#14ad9f] text-[#14ad9f] rounded-lg hover:bg-[#14ad9f] hover:text-white transition-all duration-300 font-semibold">
                              <span>Alle {profile.portfolio.length} Projekte anzeigen</span>
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reviews Section - Fiverr Style */}
                    {!reviewsLoading && (
                      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-2xl font-bold text-gray-900">
                            Was Kunden an diesem Anbieter lieben
                          </h2>
                          {reviews && reviews.length > 0 && (
                            <button className="text-[#14ad9f] hover:text-[#0d8a7a] font-medium text-sm transition-colors">
                              Alle {reviews.length} Bewertungen ansehen
                            </button>
                          )}
                        </div>

                        {/* No Reviews State */}
                        {(!reviews || reviews.length === 0) && (
                          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Noch keine Bewertungen</h3>
                            <p className="text-gray-500 text-sm max-w-sm mx-auto">
                              Dieser Anbieter hat noch keine Kundenbewertungen erhalten. 
                              Sei der Erste, der eine Bewertung hinterlaesst!
                            </p>
                            <button 
                              onClick={() => setIsQuoteModalOpen(true)}
                              className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-[#14ad9f] text-white rounded-lg font-medium hover:bg-[#0d8a7a] transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              Jetzt Auftrag anfragen
                            </button>
                          </div>
                        )}

                        {/* Reviews Carousel - nur wenn Bewertungen vorhanden */}
                        {reviews && reviews.length > 0 && (
                          <div className="relative">
                            {/* Navigation Buttons */}
                            <div className="absolute -left-4 top-1/2 -translate-y-1/2 z-10">
                            <button
                              onClick={() => setReviewCarouselIndex(Math.max(0, reviewCarouselIndex - 1))}
                              disabled={reviewCarouselIndex === 0}
                              className={`w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center transition-all ${
                                reviewCarouselIndex === 0 
                                  ? 'opacity-50 cursor-not-allowed' 
                                  : 'hover:bg-gray-50 hover:shadow-xl'
                              }`}
                              aria-label="Vorherige Bewertung"
                            >
                              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                          </div>
                          <div className="absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                            <button
                              onClick={() => setReviewCarouselIndex(Math.min(reviews.length - 1, reviewCarouselIndex + 1))}
                              disabled={reviewCarouselIndex >= reviews.length - 1}
                              className={`w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center transition-all ${
                                reviewCarouselIndex >= reviews.length - 1 
                                  ? 'opacity-50 cursor-not-allowed' 
                                  : 'hover:bg-gray-50 hover:shadow-xl'
                              }`}
                              aria-label="Naechste Bewertung"
                            >
                              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>

                          {/* Reviews Slider */}
                          <div className="relative overflow-hidden">
                            <div 
                              className="flex transition-transform duration-300 ease-in-out"
                              style={{ transform: `translateX(-${reviewCarouselIndex * 100}%)` }}
                            >
                              {reviews.map((review, index) => (
                                <div 
                                  key={review.id || index}
                                  className="w-full shrink-0 px-4"
                                >
                                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                                  {/* Reviewer Info */}
                                  <div className="flex items-start gap-3 mb-4">
                                    {/* Avatar */}
                                    <div 
                                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                      style={{ backgroundColor: `hsl(${(review.customerName || review.userName || 'A').charCodeAt(0) * 10}, 60%, 50%)` }}
                                    >
                                      {(review.customerName || review.userName || 'A').charAt(0).toUpperCase()}
                                    </div>
                                    
                                    {/* Name, Location & Rating */}
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h6 className="font-semibold text-gray-900 text-sm">
                                          {review.customerName || review.userName || 'Anonymer Kunde'}
                                        </h6>
                                        <div className="flex items-center gap-1 text-gray-500 text-xs">
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                          </svg>
                                          <span>Deutschland</span>
                                        </div>
                                      </div>
                                      
                                      {/* Star Rating */}
                                      <div className="flex items-center gap-1 mt-1">
                                        {[...Array(5)].map((_, starIndex) => (
                                          <svg 
                                            key={starIndex}
                                            className={`w-4 h-4 ${starIndex < (review.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                            viewBox="0 0 16 15" 
                                            xmlns="http://www.w3.org/2000/svg"
                                          >
                                            <path 
                                              fillRule="evenodd" 
                                              clipRule="evenodd" 
                                              d="M16 5.81285C16 5.98299 15.875 6.14367 15.75 6.26654L12.2596 9.61248L13.0865 14.3384C13.0962 14.4045 13.0962 14.4612 13.0962 14.5274C13.0962 14.7732 12.9808 15 12.7019 15C12.5673 15 12.4327 14.9527 12.3173 14.8866L8 12.656L3.68269 14.8866C3.55769 14.9527 3.43269 15 3.29808 15C3.01923 15 2.89423 14.7732 2.89423 14.5274C2.89423 14.4612 2.90385 14.4045 2.91346 14.3384L3.74038 9.61248L0.240385 6.26654C0.125 6.14367 0 5.98299 0 5.81285C0 5.5293 0.298077 5.41588 0.538462 5.37807L5.36539 4.68809L7.52885 0.387524C7.61539 0.207939 7.77885 0 8 0C8.22115 0 8.38462 0.207939 8.47115 0.387524L10.6346 4.68809L15.4615 5.37807C15.6923 5.41588 16 5.5293 16 5.81285Z"
                                              fill="currentColor"
                                            />
                                          </svg>
                                        ))}
                                        <span className="font-bold text-gray-900 text-sm ml-1">{review.rating || 0}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Review Comment */}
                                  <div className="mb-3">
                                    <p className="text-gray-700 text-sm leading-relaxed line-clamp-4">
                                      {review.comment || 'Keine Bewertung verfuegbar.'}
                                    </p>
                                    {review.comment && review.comment.length > 200 && (
                                      <button className="text-[#14ad9f] text-sm font-medium mt-1 hover:underline">
                                        Mehr anzeigen
                                      </button>
                                    )}
                                  </div>

                                  {/* Service Type & Date */}
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    {review.serviceType && (
                                      <span className="bg-gray-100 px-2 py-1 rounded-full">
                                        {review.serviceType}
                                      </span>
                                    )}
                                    <time>
                                      {review.createdAt 
                                        ? typeof review.createdAt === 'string' 
                                          ? new Date(review.createdAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
                                          : 'toDate' in review.createdAt
                                            ? review.createdAt.toDate().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
                                            : new Date(review.createdAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
                                        : 'Kuerzlich'}
                                    </time>
                                  </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Pagination Dots */}
                          {reviews.length > 1 && (
                            <div className="flex justify-center gap-2 mt-4">
                              {reviews.slice(0, Math.min(reviews.length, 5)).map((_, index) => (
                                <button
                                  key={index}
                                  onClick={() => setReviewCarouselIndex(index)}
                                  className={`w-2 h-2 rounded-full transition-all ${
                                    reviewCarouselIndex === index 
                                      ? 'bg-[#14ad9f] w-6' 
                                      : 'bg-gray-300 hover:bg-gray-400'
                                  }`}
                                  aria-label={`Zur Bewertung ${index + 1}`}
                                />
                              ))}
                              {reviews.length > 5 && (
                                <span className="text-gray-500 text-xs ml-1">+{reviews.length - 5}</span>
                              )}
                            </div>
                          )}
                        </div>
                        )}
                      </div>
                    )}

                    {/* Reviews Loading State */}
                    {reviewsLoading && (
                      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                        <div className="animate-pulse">
                          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
                          <div className="bg-gray-100 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                              <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                              </div>
                            </div>
                            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* About Section */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">Über mich</h2>
                      <div className="prose prose-lg max-w-none">
                        <div className="text-gray-700 leading-relaxed space-y-4">
                          {profile.description ? (
                            <div 
                              className="prose prose-lg max-w-none prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700"
                              dangerouslySetInnerHTML={{ __html: profile.description }}
                            />
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
                      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300">
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

                    {/* FAQ Section - Fiverr Style - ALWAYS SHOW FOR DEBUG```
                              </button>
                            </div>
                          )}
                        </div>
                       )}
                       {/* FAQ Section */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                          Häufig gestellte Fragen
                        </h2>
                        <span className="text-sm text-gray-500">
                          {profile.faqs ? `${profile.faqs.length} FAQs` : 'Keine FAQs verfügbar'}
                        </span>
                      </div>

                      {profile.faqs && profile.faqs.length > 0 ? (
                        <div>
                          <div className="space-y-4">
                            {profile.faqs
                              .sort((a, b) => {
                                // Featured FAQs first
                                if (a.featured && !b.featured) return -1;
                                if (!a.featured && b.featured) return 1;
                                // Then by order
                                return (a.order || 0) - (b.order || 0);
                              })
                              .slice(0, 8)
                              .map((faq, index) => (
                                <div
                                  key={faq.id || index}
                                  className={`group border rounded-lg transition-all duration-200 hover:shadow-md ${
                                    faq.featured
                                      ? 'border-[#14ad9f] bg-[#14ad9f]/5'
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <details className="w-full">
                                    <summary className="flex items-center justify-between cursor-pointer p-5 hover:bg-gray-50/50 rounded-lg transition-colors">
                                      <div className="flex items-start gap-3 flex-1">
                                        {faq.featured && (
                                          <div className="shrink-0 mt-1">
                                            <div className="w-2 h-2 bg-[#14ad9f] rounded-full"></div>
                                          </div>
                                        )}
                                        <div className="flex-1">
                                          <h3
                                            className={`font-semibold text-left pr-4 leading-relaxed ${
                                              faq.featured ? 'text-[#14ad9f]' : 'text-gray-900'
                                            }`}
                                          >
                                            {faq.question}
                                          </h3>
                                          {faq.category && (
                                            <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                              {faq.category}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="shrink-0 ml-4">
                                        <svg
                                          className={`w-5 h-5 transform transition-transform group-open:rotate-180 ${
                                            faq.featured ? 'text-[#14ad9f]' : 'text-gray-400'
                                          }`}
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 9l-7 7-7-7"
                                          />
                                        </svg>
                                      </div>
                                    </summary>
                                    <div className="px-5 pb-5">
                                      <div
                                        className={`pl-5 border-l-2 ${
                                          faq.featured ? 'border-[#14ad9f]/30' : 'border-gray-200'
                                        }`}
                                      >
                                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                          {faq.answer}
                                        </p>
                                      </div>
                                    </div>
                                  </details>
                                </div>
                              ))}
                          </div>

                          {/* Show more FAQs button */}
                          {profile.faqs && profile.faqs.length > 8 && (
                            <div className="text-center mt-8">
                              <button className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-[#14ad9f] text-[#14ad9f] rounded-lg hover:bg-[#14ad9f] hover:text-white transition-all duration-300 font-semibold">
                                <span>Alle {profile.faqs.length} FAQs anzeigen</span>
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 9l4-4 4 4m0 6l-4 4-4-4"
                                  />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">
                            Dieser Anbieter hat noch keine FAQs erstellt.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Reviews Section - Using ProviderReviews Component */}
                    <ProviderReviews
                      providerId={companyId}
                      reviewCount={profile.totalReviews}
                      averageRating={profile.averageRating}
                    />
                  </div>

                  {/* Right Column - Contact Card - Sticky */}
                  <div className="lg:col-span-4">
                    <div className="lg:sticky lg:top-4 space-y-6">
                      {/* Contact Card */}
                      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
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

                        {/* Buttons mit modernen Taskilo-Farben */}
                        <div className="space-y-3 mb-5">
                          <button
                            onClick={() => setIsQuoteModalOpen(true)}
                            className="w-full bg-linear-to-r from-[#14ad9f] to-teal-600 text-white py-3.5 px-4 rounded-xl font-semibold hover:from-[#0d8a7a] hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          >
                            Angebot anfordern
                          </button>

                          <button
                            onClick={handleBookNow}
                            className="w-full bg-white text-[#14ad9f] border-2 border-[#14ad9f] py-3.5 px-4 rounded-xl font-semibold hover:bg-[#14ad9f]/5 transition-all duration-200"
                          >
                            Jetzt buchen
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
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Verifizierung
                          </h3>
                          <div className="flex items-center gap-3 p-3 rounded-xl bg-linear-to-r from-green-50 to-emerald-50">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${profile.stripeVerificationStatus === 'verified' ? 'bg-green-100' : 'bg-orange-100'}`}>
                              <FiCheckCircle
                                className={`${profile.stripeVerificationStatus === 'verified' ? 'text-green-600' : 'text-orange-500'}`}
                                size={20}
                              />
                            </div>
                            <span className="text-gray-700 font-medium">
                              {profile.stripeVerificationStatus === 'verified'
                                ? 'Identitaet verifiziert'
                                : 'Verifizierung in Bearbeitung'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Unternehmensdetails Card - Oeffentliche Informationen */}
                      {(profile.legalForm || profile.employees || profile.businessType || profile.workMode || (profile.serviceAreas && profile.serviceAreas.length > 0) || profile.maxTravelDistance) && (
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Unternehmensdetails
                          </h3>
                          <div className="space-y-3">
                            {/* Rechtsform */}
                            {profile.legalForm && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Rechtsform:</span>
                                <span className="text-gray-900 font-medium">{profile.legalForm}</span>
                              </div>
                            )}
                            
                            {/* Zielgruppe (B2B/B2C) */}
                            {profile.businessType && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Zielgruppe:</span>
                                <span className="text-gray-900 font-medium">
                                  {profile.businessType === 'b2b' ? 'Geschäftskunden (B2B)' : 
                                   profile.businessType === 'b2c' ? 'Privatkunden (B2C)' : 
                                   profile.businessType === 'hybrid' ? 'Privat- & Geschäftskunden' : profile.businessType}
                                </span>
                              </div>
                            )}
                            
                            {/* Arbeitsweise (Vor-Ort/Remote) */}
                            {profile.workMode && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Arbeitsweise:</span>
                                <span className="text-gray-900 font-medium">
                                  {profile.workMode === 'vor-ort' ? 'Vor-Ort' : 
                                   profile.workMode === 'remote' ? 'Remote' : 
                                   profile.workMode === 'hybrid' ? 'Vor-Ort & Remote' : profile.workMode}
                                </span>
                              </div>
                            )}
                            
                            {/* Mitarbeiter */}
                            {profile.employees && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Team:</span>
                                <span className="text-gray-900 font-medium">
                                  {profile.employees === '1' ? 'Einzelunternehmer' :
                                   profile.employees === '2-5' ? '2-5 Mitarbeiter' :
                                   profile.employees === '6-10' ? '6-10 Mitarbeiter' :
                                   profile.employees === '11-50' ? '11-50 Mitarbeiter' :
                                   profile.employees === '50+' ? '50+ Mitarbeiter' : profile.employees}
                                </span>
                              </div>
                            )}
                            
                            {/* Maximale Reisedistanz */}
                            {profile.maxTravelDistance && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Max. Anfahrt:</span>
                                <span className="text-gray-900 font-medium">{profile.maxTravelDistance} km</span>
                              </div>
                            )}
                            
                            {/* Servicegebiete */}
                            {profile.serviceAreas && profile.serviceAreas.length > 0 && (
                              <div className="pt-2 border-t border-gray-100">
                                <span className="text-gray-500 text-sm block mb-2">Servicegebiete:</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {profile.serviceAreas.map((area, index) => (
                                    <span 
                                      key={index}
                                      className="inline-flex items-center px-2.5 py-1 bg-[#14ad9f]/10 text-[#14ad9f] text-xs font-medium rounded-full"
                                    >
                                      <FiMapPin size={10} className="mr-1" />
                                      {area}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Education & Certifications */}
                      {((profile.education && profile.education.length > 0) ||
                        (profile.certifications && profile.certifications.length > 0)) && (
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
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

                      {/* Service Packages */}
                      {servicePackages && servicePackages.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                          {/* Hidden Radio Inputs */}
                          {servicePackages.map((_, index) => (
                            <input
                              key={index}
                              id={`package-tab-${index}`}
                              name="package-tab-group"
                              type="radio"
                              className="hidden"
                              defaultChecked={index === 0}
                              onChange={() => setActivePackageTab(index)}
                            />
                          ))}

                          {/* Tab Navigation */}
                          <div className="flex border-b border-gray-200">
                            {servicePackages.map((pkg, index) => (
                              <label
                                key={pkg.id || index}
                                htmlFor={`package-tab-${index}`}
                                className={`flex-1 px-4 py-3 text-sm font-medium cursor-pointer transition-colors text-center ${
                                  activePackageTab === index
                                    ? 'bg-[#14ad9f] text-white border-b-2 border-[#14ad9f]'
                                    : 'text-gray-600 hover:text-[#14ad9f] hover:bg-gray-50'
                                }`}
                                role="tab"
                                aria-selected={activePackageTab === index}
                                tabIndex={0}
                              >
                                {pkg.packageType === 'basic'
                                  ? 'Basic'
                                  : pkg.packageType === 'standard'
                                    ? 'Standard'
                                    : pkg.packageType === 'premium'
                                      ? 'Premium'
                                      : pkg.name || pkg.title || `Paket ${index + 1}`}
                              </label>
                            ))}
                          </div>

                          {/* Package Content */}
                          <div className="package-content">
                            {servicePackages[activePackageTab] && (
                              <div className="p-6">
                                {/* Package Header with Price */}
                                <header className="mb-6">
                                  <h3 className="mb-4">
                                    <div className="price-wrapper mb-2">
                                      <span className="text-3xl font-bold text-gray-900">
                                        €
                                        {servicePackages[activePackageTab].totalPrice ||
                                          servicePackages[activePackageTab].price}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                      <strong>
                                        {servicePackages[activePackageTab].packageType === 'basic'
                                          ? 'Basic'
                                          : servicePackages[activePackageTab].packageType ===
                                              'standard'
                                            ? 'Standard'
                                            : servicePackages[activePackageTab].packageType ===
                                                'premium'
                                              ? 'Premium'
                                              : servicePackages[activePackageTab].name}
                                      </strong>{' '}
                                      {servicePackages[activePackageTab].title ||
                                        servicePackages[activePackageTab].description}
                                    </p>
                                  </h3>
                                </header>

                                {/* Package Details */}
                                <article className="mb-6">
                                  <div className="additional-info flex gap-6 mb-4">
                                    {/* Service Duration - für zeitbasierte Services wie Mietkoch, Friseur etc. */}
                                    {servicePackages[activePackageTab].duration &&
                                      [
                                        'Mietkoch',
                                        'Friseur',
                                        'Kosmetik',
                                        'Massage',
                                        'Fitness',
                                        'Reinigung',
                                      ].includes(
                                        servicePackages[activePackageTab].subcategory || ''
                                      ) && (
                                        <div className="duration-wrapper flex items-center gap-2">
                                          <FiClock className="text-gray-600" size={16} />
                                          <span className="text-sm font-medium text-gray-900">
                                            {servicePackages[activePackageTab].duration}
                                          </span>
                                        </div>
                                      )}

                                    {/* Delivery Time - nur für Projekte/Produkte */}
                                    {servicePackages[activePackageTab].deliveryTime &&
                                      servicePackages[activePackageTab].deliveryTime > 0 &&
                                      ![
                                        'Mietkoch',
                                        'Friseur',
                                        'Kosmetik',
                                        'Massage',
                                        'Fitness',
                                        'Reinigung',
                                      ].includes(
                                        servicePackages[activePackageTab].subcategory || ''
                                      ) && (
                                        <div className="delivery-wrapper flex items-center gap-2">
                                          <FiClock className="text-gray-600" size={16} />
                                          <span className="text-sm font-medium text-gray-900">
                                            {servicePackages[activePackageTab].deliveryTime} Tag(e)
                                            Lieferzeit
                                          </span>
                                        </div>
                                      )}

                                    {/* Revisions - nur für Design/Entwicklung etc. */}
                                    {servicePackages[activePackageTab].revisions &&
                                      servicePackages[activePackageTab].revisions > 0 &&
                                      ![
                                        'Friseur',
                                        'Kosmetik',
                                        'Massage',
                                        'Fitness',
                                        'Reinigung',
                                        'Mietkoch',
                                      ].includes(
                                        servicePackages[activePackageTab].subcategory || ''
                                      ) && (
                                        <div className="revisions-wrapper flex items-center gap-2">
                                          <svg
                                            className="w-4 h-4 text-gray-600"
                                            fill="currentColor"
                                            viewBox="0 0 16 16"
                                            xmlns="http://www.w3.org/2000/svg"
                                          >
                                            <path d="M4.50001 11.4999C6.40001 13.3999 9.60001 13.3999 11.5 11.4999C12.2 10.7999 12.7 9.7999 12.9 8.7999L14.9 9.0999C14.7 10.5999 14 11.8999 13 12.8999C10.3 15.5999 5.90001 15.5999 3.10001 12.8999L0.900012 15.0999L0.200012 8.6999L6.60001 9.3999L4.50001 11.4999Z"></path>
                                            <path d="M15.8 7.2999L9.40001 6.5999L11.5 4.4999C9.60001 2.5999 6.40001 2.5999 4.50001 4.4999C3.80001 5.1999 3.30001 6.1999 3.10001 7.1999L1.10001 6.8999C1.30001 5.3999 2.00001 4.0999 3.00001 3.0999C4.40001 1.6999 6.10001 1.0999 7.90001 1.0999C9.70001 1.0999 11.5 1.7999 12.8 3.0999L15 0.899902L15.8 7.2999Z"></path>
                                          </svg>
                                          <span className="text-sm font-medium text-gray-900">
                                            {servicePackages[activePackageTab].revisions} Revisionen
                                          </span>
                                        </div>
                                      )}
                                  </div>

                                  {/* Features List */}
                                  <ul className="features space-y-2 mb-4">
                                    {servicePackages[activePackageTab].features &&
                                      servicePackages[activePackageTab].features.map(
                                        (feature: string, idx: number) => (
                                          <li key={idx} className="flex items-center gap-2">
                                            <FiCheckCircle
                                              className="text-green-500 shrink-0"
                                              size={16}
                                            />
                                            <span className="text-sm text-gray-700">{feature}</span>
                                          </li>
                                        )
                                      )}
                                  </ul>

                                  {/* Additional Services - Optional Extras */}
                                  {servicePackages[activePackageTab].additionalServices &&
                                    servicePackages[activePackageTab].additionalServices.length >
                                      0 && (
                                      <div className="additional-services mt-4 pt-4 border-t border-gray-200">
                                        <h5 className="text-sm font-medium text-gray-900 mb-2">
                                          Zusätzliche Services (optional):
                                        </h5>
                                        <ul className="space-y-2">
                                          {servicePackages[activePackageTab].additionalServices.map(
                                            (service: AdditionalService, idx: number) => (
                                              <li
                                                key={idx}
                                                className="flex items-center justify-between gap-2 text-sm"
                                              >
                                                <div className="flex items-center gap-2">
                                                  <svg
                                                    className="w-3.5 h-3.5 text-[#14ad9f] shrink-0"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                  >
                                                    <path
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                      strokeWidth={2}
                                                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                                    />
                                                  </svg>
                                                  <span className="text-gray-700">
                                                    {service.name}
                                                  </span>
                                                </div>
                                                <span className="text-[#14ad9f] font-medium">
                                                  +€{service.price}
                                                </span>
                                              </li>
                                            )
                                          )}
                                        </ul>
                                      </div>
                                    )}
                                </article>

                                {/* Footer with Action Button */}
                                <footer className="tab-footer">
                                  <div className="flex flex-col gap-3">
                                    {/* Contact Button */}
                                    <button
                                      onClick={handleStartChat}
                                      className={`w-full border font-medium py-2 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                                        currentUser
                                          ? 'border-gray-300 hover:border-[#14ad9f] text-gray-700 hover:text-[#14ad9f]'
                                          : 'border-gray-300 text-gray-500 cursor-pointer hover:border-orange-400 hover:text-orange-600'
                                      }`}
                                      title={!currentUser ? 'Anmeldung erforderlich' : ''}
                                    >
                                      <span>
                                        {currentUser
                                          ? 'Kontaktiere mich'
                                          : 'Anmelden zum Kontaktieren'}
                                      </span>
                                      <svg
                                        className="w-3 h-3"
                                        fill="currentColor"
                                        viewBox="0 0 14 9"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path d="M.19 1.272.81.653a.375.375 0 0 1 .53 0L7 6.3 12.66.653a.375.375 0 0 1 .53 0l.62.62a.375.375 0 0 1 0 .53L7.264 8.346a.375.375 0 0 1-.53 0L.19 1.802a.375.375 0 0 1 0-.53Z"></path>
                                      </svg>
                                    </button>
                                  </div>
                                </footer>
                              </div>
                            )}
                          </div>
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
                <CreateOrderModal
                  onClose={handleCloseCreateOrderModal}
                  onSuccess={handleCreateOrderSuccess}
                  currentUser={currentUser}
                  userProfile={userProfile}
                  preselectedProviderId={profile.id}
                  preselectedCategory={profile.selectedCategory}
                  preselectedSubcategory={profile.selectedSubcategory}
                />
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Login Modal */}
      <LoginPopup
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          setPendingAction(null);
        }}
        onLoginSuccess={() => {
          setIsLoginModalOpen(false);
          if (pendingAction === 'report') {
            // TODO: Problem melden Modal oeffnen
            setPendingAction(null);
          }
        }}
      />
    </>
  );
}
