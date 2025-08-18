'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/firebase/clients';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  Star,
  MapPin,
  ArrowLeft,
  Briefcase,
  Clock,
  Users,
  MessageCircle,
  Calendar,
} from 'lucide-react';
import { format, differenceInCalendarDays, isValid } from 'date-fns';
import { de } from 'date-fns/locale';
import DirectChatModal from '@/components/DirectChatModal';
import ResponseTimeDisplay from '@/components/ResponseTimeDisplay';
import ProviderReviews from '@/components/ProviderReviews';
import {
  DateTimeSelectionPopup,
  DateTimeSelectionPopupProps,
} from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/DateTimeSelectionPopup';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfileData, SavedAddress } from '@/types/types';

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
  stripeAccountId?: string;
}

export default function CompanyProviderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, firebaseUser } = useAuth();
  const companyUid = (params?.uid as string) || '';
  const providerId = (params?.id as string) || '';

  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);

  // Chat Modal State
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState<string>('');

  // Direct Booking Modal State
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    loadProviderData();
    loadCompanyData();
    loadUserProfile();
  }, [providerId, firebaseUser]);

  const loadProviderData = async () => {
    try {
      setLoading(true);

      // Erst in der firma Collection suchen
      const firmaDoc = await getDoc(doc(db, 'firma', providerId));

      if (firmaDoc.exists()) {
        const data = firmaDoc.data();
        // Real-time Rating berechnen
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('providerId', '==', firmaDoc.id)
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);

        let calculatedRating = 0;
        let calculatedCount = 0;

        if (!reviewsSnapshot.empty) {
          const ratings = reviewsSnapshot.docs
            .map((doc: any) => doc.data().rating)
            .filter((rating: any) => rating);
          calculatedCount = ratings.length;
          if (calculatedCount > 0) {
            calculatedRating =
              ratings.reduce((sum: number, rating: number) => sum + rating, 0) / calculatedCount;
          }
        }

        // DEBUG: Log loaded provider data from firma collection
        console.log('🔍 [Provider Debug] Firma collection data:', {
          id: firmaDoc.id,
          companyName: data.companyName,
          stripeAccountId: data.stripeAccountId,
          stripeAccountIdType: typeof data.stripeAccountId,
          allKeys: Object.keys(data).filter(key => key.includes('stripe')),
          step4StripeAccountId: data.step4?.stripeAccountId,
          allData: data, // VOLLSTÄNDIGE DATEN ZUR DIAGNOSE
        });

        setProvider({
          id: firmaDoc.id,
          companyName: data.companyName,
          profilePictureFirebaseUrl: data.profilePictureFirebaseUrl,
          profilePictureURL: data.profilePictureURL,
          photoURL: data.photoURL,
          bio: data.description || data.bio,
          description: data.description,
          location:
            data.location ||
            `${data.companyCity || ''}, ${data.companyCountry || ''}`.trim().replace(/^,\s*/, ''),
          skills: data.services || data.skills || [],
          selectedCategory: data.selectedCategory,
          selectedSubcategory: data.selectedSubcategory,
          rating: calculatedRating, // Verwende berechnetn Wert
          reviewCount: calculatedCount, // Verwende berechneten Wert
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
          services: data.services || [],
          stripeAccountId: data.stripeAccountId, // Top-level field from database
        });
      } else {
        // Falls nicht in firma gefunden, in users suchen
        const userDoc = await getDoc(doc(db, 'users', providerId));

        if (userDoc.exists()) {
          const data = userDoc.data();

          // Real-time Rating berechnen für User
          const reviewsQuery = query(
            collection(db, 'reviews'),
            where('providerId', '==', userDoc.id)
          );
          const reviewsSnapshot = await getDocs(reviewsQuery);

          let calculatedRating = 0;
          let calculatedCount = 0;

          if (!reviewsSnapshot.empty) {
            const ratings = reviewsSnapshot.docs
              .map((doc: any) => doc.data().rating)
              .filter((rating: any) => rating);
            calculatedCount = ratings.length;
            if (calculatedCount > 0) {
              calculatedRating =
                ratings.reduce((sum: number, rating: number) => sum + rating, 0) / calculatedCount;
            }
          }

          // DEBUG: Log loaded provider data from users collection
          console.log('🔍 [Provider Debug] Users collection data:', {
            id: userDoc.id,
            userName: data.userName,
            stripeAccountId: data.stripeAccountId,
            stripeAccountIdType: typeof data.stripeAccountId,
            allKeys: Object.keys(data).filter(key => key.includes('stripe')),
            step4StripeAccountId: data.step4?.stripeAccountId,
            allData: data, // VOLLSTÄNDIGE DATEN ZUR DIAGNOSE
          });

          setProvider({
            id: userDoc.id,
            userName: data.userName || data.displayName,
            profilePictureFirebaseUrl: data.profilePictureFirebaseUrl,
            profilePictureURL: data.profilePictureURL,
            photoURL: data.photoURL,
            bio: data.bio,
            location: data.location,
            skills: data.skills || [],
            rating: calculatedRating, // Verwende berechneten Wert
            reviewCount: calculatedCount, // Verwende berechneten Wert
            completedJobs: data.completedJobs || 0,
            isCompany: false,
            priceRange: data.priceRange,
            responseTime: data.responseTime,
            hourlyRate: data.hourlyRate,
            email: data.email,
            phone: data.phone,
            website: data.website,
            languages: data.languages || [],
            portfolio: data.portfolio || [],
            stripeAccountId: data.stripeAccountId, // Top-level field from database
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

  const loadUserProfile = async () => {
    if (!firebaseUser?.uid) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserProfile(data as UserProfileData);
      }
    } catch (error) {
      console.error('Fehler beim Laden des Benutzerprofils:', error);
    }
  };

  const openChatWithProvider = () => {
    if (provider) {
      setChatModalOpen(true);
    }
  };

  const openBookingModal = () => {
    if (provider) {
      setDatePickerOpen(true);
    }
  };

  const handleDateTimeConfirm: DateTimeSelectionPopupProps['onConfirm'] = async (
    selection,
    time,
    durationString
  ) => {
    setDatePickerOpen(false);

    if (!selection || !time || !durationString || !provider || !firebaseUser || !userProfile) {
      console.error('Unvollständige Buchungsdaten:', {
        selection,
        time,
        durationString,
        provider: !!provider,
        user: !!firebaseUser,
        userProfile: !!userProfile,
      });
      alert('Unvollständige Buchungsdaten. Bitte versuchen Sie es erneut.');
      return;
    }

    // Validierung der Stripe-Voraussetzungen
    if (!provider.stripeAccountId) {
      alert(
        'Dieser Anbieter kann derzeit keine Zahlungen empfangen. Bitte kontaktieren Sie den Anbieter direkt oder wählen Sie einen anderen Anbieter.'
      );
      return;
    }

    if (!provider.hourlyRate || provider.hourlyRate <= 0) {
      alert(
        'Dieser Anbieter hat keinen gültigen Stundensatz. Bitte kontaktieren Sie den Anbieter direkt.'
      );
      return;
    }

    // Automatische Erstellung von BEIDEN Stripe-Profilen wenn sie fehlen
    if (!userProfile.stripeCustomerId || !userProfile.stripeAccountId) {
      console.log('User profile ohne vollständige Stripe-Profile:', {
        hasCustomerId: !!userProfile.stripeCustomerId,
        hasAccountId: !!userProfile.stripeAccountId,
        profile: userProfile,
      });

      try {
        console.log('🔄 Erstelle automatisch fehlende Stripe-Profile...');
        const createProfilesResponse = await fetch('/api/create-company-stripe-profiles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyName: userProfile.companyName || userProfile.displayName || 'Unternehmen',
            email: userProfile.email,
            uid: userProfile.uid,
            userType: 'company',
          }),
        });

        if (!createProfilesResponse.ok) {
          const errorData = await createProfilesResponse.json();
          throw new Error(errorData.error || 'Stripe-Profile-Erstellung fehlgeschlagen');
        }

        const profileData = await createProfilesResponse.json();
        console.log('✅ Stripe-Profile erfolgreich erstellt:', profileData);

        // Update das lokale userProfile mit den neuen IDs
        if (profileData.stripeCustomerId) {
          userProfile.stripeCustomerId = profileData.stripeCustomerId;
        }
        if (profileData.stripeAccountId) {
          userProfile.stripeAccountId = profileData.stripeAccountId;
        }
      } catch (profileError) {
        console.error('❌ Fehler beim Erstellen der Stripe-Profile:', profileError);
        const setupPayment = confirm(
          'Ihre Zahlungsprofile konnten nicht automatisch erstellt werden. Möchten Sie jetzt zu den Einstellungen gehen, um die Zahlungsmethoden manuell einzurichten?'
        );
        if (setupPayment) {
          router.push(`/dashboard/company/${companyUid}/settings`);
        }
        return;
      }
    }

    // Prüfe ob Adressdaten vorhanden sind
    if (!userProfile.savedAddresses || userProfile.savedAddresses.length === 0) {
      const setupAddress = confirm(
        'Sie haben noch keine Rechnungsadresse hinterlegt. Möchten Sie jetzt zu den Einstellungen gehen, um eine Adresse hinzuzufügen?'
      );
      if (setupAddress) {
        router.push(`/dashboard/company/${companyUid}/settings`);
      }
      return;
    }

    try {
      // Standardadresse für Billing-Daten
      const defaultAddress = userProfile.savedAddresses?.[0];

      // Datum formatieren
      let dateFromFormatted: string,
        dateToFormatted: string,
        calculatedNumberOfDays = 1;

      if (selection instanceof Date && isValid(selection)) {
        dateFromFormatted = format(selection, 'yyyy-MM-dd');
        dateToFormatted = dateFromFormatted;
      } else if (selection && 'from' in selection && selection.from && isValid(selection.from)) {
        const { from, to } = selection;
        dateFromFormatted = format(from, 'yyyy-MM-dd');
        dateToFormatted = to && isValid(to) ? format(to, 'yyyy-MM-dd') : dateFromFormatted;
        calculatedNumberOfDays = to && isValid(to) ? differenceInCalendarDays(to, from) + 1 : 1;
      } else {
        throw new Error('Ungültiges Datum ausgewählt. Bitte versuchen Sie es erneut.');
      }

      // Dauer parsen
      const parseDurationStringToHours = (durationStr: string): number | null => {
        const match = durationStr.match(/(\d+(\.\d+)?)/);
        if (match && match[1]) {
          const hours = parseFloat(match[1]);
          return isNaN(hours) ? null : hours;
        }
        return null;
      };

      const hoursInput = parseDurationStringToHours(durationString);
      if (!hoursInput || hoursInput <= 0) {
        throw new Error('Ungültige Dauer ausgewählt.');
      }

      // Preisberechnung mit korrekter Multi-Tag-Behandlung
      const hourlyRateNum = provider.hourlyRate;

      // KRITISCHE KORREKTUR: Multi-Tag-Aufträge müssen korrekt berechnet werden
      // Ermittle Buchungscharakteristiken für die Kategorie
      let totalHours = hoursInput; // Standard: direkte Stunden

      // Prüfe, ob es ein Multi-Tag Auftrag ist (verschiedene Daten)
      if (calculatedNumberOfDays > 1) {
        // Multi-Tag Auftrag: hoursInput sind Stunden pro Tag
        totalHours = hoursInput * calculatedNumberOfDays;
        console.log(
          `KORREKTUR Provider-Buchung: ${calculatedNumberOfDays} Tage × ${hoursInput}h = ${totalHours}h total`
        );
      }

      const servicePrice = totalHours * hourlyRateNum;
      const servicePriceInCents = Math.round(servicePrice * 100);
      const totalPriceInCents = servicePriceInCents;

      if (totalPriceInCents <= 0) {
        throw new Error('Der berechnete Auftragswert muss positiv sein.');
      }

      // Temporäre Job-Draft-ID generieren
      const tempJobDraftId = crypto.randomUUID();

      // Auftragsdetails für Backend
      const orderDetailsForBackend = {
        customerEmail: firebaseUser.email || userProfile.email || '',
        customerFirebaseUid: firebaseUser.uid,
        customerFirstName: userProfile.firstname || '',
        customerLastName: userProfile.lastname || '',
        customerType: userProfile.user_type || 'private',
        description: `Buchung für ${provider.companyName || provider.userName} - ${provider.selectedSubcategory || provider.selectedCategory || 'Allgemeine Dienstleistung'}`,
        jobCalculatedPriceInCents: servicePriceInCents,
        jobCity: defaultAddress?.city || 'Unbekannt',
        jobCountry: defaultAddress?.country || 'Deutschland',
        jobDateFrom: dateFromFormatted,
        jobDateTo: dateToFormatted,
        jobDurationString: durationString,
        jobPostalCode: defaultAddress?.postal_code || '00000',
        jobStreet: defaultAddress?.line1 || 'Keine Adresse angegeben',
        jobTimePreference: time,
        jobTotalCalculatedHours: totalHours,
        kundeId: firebaseUser.uid,
        selectedAnbieterId: provider.id,
        selectedCategory: provider.selectedCategory || null,
        selectedSubcategory: provider.selectedSubcategory || null,
        totalPriceInCents: totalPriceInCents,
        addressName: defaultAddress?.name || 'Standard-Adresse',
      };

      // Billing Details für Stripe - verwende gespeicherte Adresse oder Standardwerte
      const billingDetailsForApi = {
        name:
          `${userProfile.firstname || ''} ${userProfile.lastname || ''}`.trim() ||
          'Unbekannter Name',
        email: firebaseUser.email || userProfile.email || '',
        phone: (userProfile as any).phoneNumber || (userProfile as any).phone || undefined,
        address: {
          line1: defaultAddress?.line1 || 'Keine Adresse angegeben',
          line2: defaultAddress?.line2 || undefined,
          city: defaultAddress?.city || 'Unbekannt',
          postal_code: defaultAddress?.postal_code || '00000',
          country: defaultAddress?.country || 'Deutschland',
        },
      };

      // Temporären Job-Entwurf speichern
      const tempDraftToSave = {
        ...orderDetailsForBackend,
        providerName: provider.companyName || provider.userName,
        providerId: provider.id,
        status: 'initial_draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'temporaryJobDrafts', tempJobDraftId), tempDraftToSave);
      console.log(`Temporärer Job-Entwurf ${tempJobDraftId} erfolgreich gespeichert.`);

      // Stripe Payment Intent erstellen
      console.log('Erstelle Payment Intent...');
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalPriceInCents,
          jobPriceInCents: servicePriceInCents,
          currency: 'eur',
          connectedAccountId: provider.stripeAccountId || '',
          taskId: tempJobDraftId,
          firebaseUserId: firebaseUser.uid,
          stripeCustomerId: userProfile.stripeCustomerId,
          orderDetails: orderDetailsForBackend,
          billingDetails: billingDetailsForApi,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        console.error('API-Antwort Fehler:', data.error);
        throw new Error(
          data.error?.message || 'Fehler bei der Kommunikation mit dem Zahlungsserver.'
        );
      }

      console.log('Payment Intent erfolgreich erstellt:', data.clientSecret);

      // Erfolgreiche Buchung mit Payment Intent
      alert(
        `Buchungsanfrage erstellt!\n\nProvider: ${provider.companyName || provider.userName}\nDatum: ${dateFromFormatted}\nUhrzeit: ${time}\nDauer: ${durationString}\nGesamtpreis: €${(totalPriceInCents / 100).toFixed(2)}\n\nDie Zahlung wird über Stripe abgewickelt.`
      );

      // Weiterleitung zur Zahlungsseite oder zurück zum Dashboard
      router.push(`/dashboard/company/${companyUid}`);
    } catch (error) {
      console.error('Fehler beim Erstellen der Buchung:', error);
      alert(
        `Fehler beim Buchen des Termins: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      );
    }
  };

  const getProfileImage = () => {
    return (
      provider?.profilePictureFirebaseUrl ||
      provider?.profilePictureURL ||
      provider?.photoURL ||
      '/images/default-avatar.jpg'
    );
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-2xl mx-auto text-center py-16">
          <h1
            className="text-2xl font-bold text-gray-900 dark:text-white mb-4"
            data-translatable
            data-translation-key="provider.not.found.title"
          >
            Anbieter nicht gefunden
          </h1>
          <button
            onClick={() => router.push(`/dashboard/company/${companyUid}`)}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mx-auto"
            data-translatable
            data-translation-key="provider.not.found.back"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-gray-600 dark:text-gray-400 hover:text-[#14ad9f] transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1
              className="text-3xl font-bold text-gray-900 dark:text-white"
              data-translatable
              data-translation-key="provider.profile.title"
            >
              Anbieter-Profil
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Provider Header Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="relative">
                  <img
                    src={getProfileImage()}
                    alt={getProviderName()}
                    className="w-24 h-24 rounded-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).src = '/images/default-avatar.jpg';
                    }}
                  />
                  {provider.isCompany && (
                    <div className="absolute -bottom-2 -right-2 bg-[#14ad9f] text-white text-xs px-2 py-1 rounded-full">
                      PRO
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {getProviderName()}
                  </h1>

                  {provider.location && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-3">
                      <MapPin className="w-4 h-4" />
                      {provider.location}
                    </div>
                  )}

                  {/* Rating */}
                  {(provider.rating ?? 0) > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i < Math.floor(provider.rating ?? 0)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-lg font-medium text-gray-900 dark:text-white">
                        {(provider.rating ?? 0).toFixed(1)}
                      </span>{' '}
                      <span
                        className="text-gray-500 dark:text-gray-400"
                        data-translatable
                        data-translation-key="provider.reviews.count"
                      >
                        ({provider.reviewCount} Bewertungen)
                      </span>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex flex-wrap gap-6 text-sm text-gray-600 dark:text-gray-400">
                    {provider.completedJobs && provider.completedJobs > 0 && (
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        <span data-translatable data-translation-key="provider.stats.projects">
                          {provider.completedJobs} Projekte abgeschlossen
                        </span>
                      </div>
                    )}
                    {provider.responseTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span data-translatable data-translation-key="provider.stats.response">
                          Antwortet in {provider.responseTime}
                        </span>
                      </div>
                    )}
                    {provider.teamSize && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span data-translatable data-translation-key="provider.stats.team">
                          {provider.teamSize} Mitarbeiter
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 sm:items-end">
                  {provider.hourlyRate && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#14ad9f]">
                        €{provider.hourlyRate}/h
                      </div>
                      <div
                        className="text-sm text-gray-500"
                        data-translatable
                        data-translation-key="provider.hourly.rate"
                      >
                        Stundensatz
                      </div>
                    </div>
                  )}

                  <button
                    onClick={openChatWithProvider}
                    className="bg-[#14ad9f] hover:bg-teal-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                    data-translatable
                    data-translation-key="provider.contact.button"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Jetzt kontaktieren
                  </button>
                </div>
              </div>
            </div>

            {/* Description */}
            {(provider.bio || provider.description) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2
                  className="text-xl font-semibold text-gray-900 dark:text-white mb-4"
                  data-translatable
                  data-translation-key="provider.about.title"
                >
                  Über {provider.isCompany ? 'das Unternehmen' : 'mich'}
                </h2>
                <p
                  className="text-gray-600 dark:text-gray-400 leading-relaxed"
                  data-translatable
                  data-translation-key="provider.about.description"
                >
                  {provider.bio || provider.description}
                </p>
              </div>
            )}

            {/* Skills & Services */}
            {provider.skills && Array.isArray(provider.skills) && provider.skills.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2
                  className="text-xl font-semibold text-gray-900 dark:text-white mb-4"
                  data-translatable
                  data-translation-key="provider.skills.title"
                >
                  Fähigkeiten & Services
                </h2>
                <div className="flex flex-wrap gap-2">
                  {provider.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="bg-[#14ad9f]/10 text-[#14ad9f] px-3 py-1 rounded-full text-sm font-medium"
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
              reviewCount={provider.reviewCount}
              averageRating={provider.rating}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3
                className="text-lg font-semibold text-gray-900 dark:text-white mb-4"
                data-translatable
                data-translation-key="provider.contact.title"
              >
                Kontaktinformationen
              </h3>
              <div className="space-y-3">
                {provider.email && (
                  <div>
                    <label
                      className="text-sm font-medium text-gray-500 dark:text-gray-400"
                      data-translatable
                      data-translation-key="provider.contact.email"
                    >
                      E-Mail
                    </label>
                    <p className="text-gray-900 dark:text-white">{provider.email}</p>
                  </div>
                )}
                {provider.phone && (
                  <div>
                    <label
                      className="text-sm font-medium text-gray-500 dark:text-gray-400"
                      data-translatable
                      data-translation-key="provider.contact.phone"
                    >
                      Telefon
                    </label>
                    <p className="text-gray-900 dark:text-white">{provider.phone}</p>
                  </div>
                )}
                {provider.website && (
                  <div>
                    <label
                      className="text-sm font-medium text-gray-500 dark:text-gray-400"
                      data-translatable
                      data-translation-key="provider.contact.website"
                    >
                      Website
                    </label>
                    <a
                      href={
                        provider.website.startsWith('http')
                          ? provider.website
                          : `https://${provider.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#14ad9f] hover:text-teal-600 break-all"
                    >
                      {provider.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Antwortzeit-Garantie */}
            <ResponseTimeDisplay providerId={providerId} guaranteeHours={24} showDetailed={true} />

            {/* Additional Info */}
            {(provider.founded ||
              (provider.languages &&
                Array.isArray(provider.languages) &&
                provider.languages.length > 0)) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3
                  className="text-lg font-semibold text-gray-900 dark:text-white mb-4"
                  data-translatable
                  data-translation-key="provider.additional.title"
                >
                  Weitere Informationen
                </h3>
                <div className="space-y-3">
                  {provider.founded && (
                    <div>
                      <label
                        className="text-sm font-medium text-gray-500 dark:text-gray-400"
                        data-translatable
                        data-translation-key="provider.additional.founded"
                      >
                        Gegründet
                      </label>
                      <p className="text-gray-900 dark:text-white">{provider.founded}</p>
                    </div>
                  )}
                  {provider.languages &&
                    Array.isArray(provider.languages) &&
                    provider.languages.length > 0 && (
                      <div>
                        <label
                          className="text-sm font-medium text-gray-500 dark:text-gray-400"
                          data-translatable
                          data-translation-key="provider.additional.languages"
                        >
                          Sprachen
                        </label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {provider.languages.map((language, index) => (
                            <span
                              key={index}
                              className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-sm"
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

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3
                className="text-lg font-semibold text-gray-900 dark:text-white mb-4"
                data-translatable
                data-translation-key="provider.actions.title"
              >
                Schnellaktionen
              </h3>
              <div className="space-y-3">
                <button
                  onClick={openChatWithProvider}
                  className="w-full bg-[#14ad9f] hover:bg-teal-600 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  data-translatable
                  data-translation-key="provider.actions.message"
                >
                  <MessageCircle className="w-4 h-4" />
                  Nachricht senden
                </button>
                <button
                  onClick={openBookingModal}
                  className="w-full border border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  data-translatable
                  data-translation-key="provider.actions.appointment"
                >
                  <Calendar className="w-4 h-4" />
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

      {/* Direct Booking DatePicker */}
      {provider && (
        <DateTimeSelectionPopup
          isOpen={datePickerOpen}
          onClose={() => setDatePickerOpen(false)}
          onConfirm={handleDateTimeConfirm}
          bookingSubcategory={provider.selectedSubcategory || provider.selectedCategory || null}
          contextCompany={{
            id: provider.id,
            companyName: provider.companyName || provider.userName || 'Unbekannter Anbieter',
            hourlyRate: provider.hourlyRate || 0,
            profilePictureURL: getProfileImage(),
            description: provider.bio || provider.description,
            selectedSubcategory: provider.selectedSubcategory,
            // Weitere erforderliche Felder für AnbieterDetails können hier hinzugefügt werden
          }}
        />
      )}
    </div>
  );
}
