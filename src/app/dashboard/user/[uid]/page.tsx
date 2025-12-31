'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  collectionGroup,
  limit,
} from 'firebase/firestore';
import {
  db,
  functions,
  auth,
  onAuthStateChanged,
  signOut,
  type User as FirebaseUser,
} from '@/firebase/clients';
import { WelcomeBox } from './components/WelcomeBox';
import {
  Loader2 as FiLoader,
  AlertCircle as FiAlertCircle,
  MessageSquare as FiMessageSquare,
  PlusCircle as FiPlusCircle,
  HelpCircle as FiHelpCircle,
  Briefcase,
  ArrowRight,
  RotateCw,
} from 'lucide-react';
import Modal from './components/Modal';
import AddressForm from './components/AddressForm';
import { httpsCallable } from 'firebase/functions';
import { toast } from 'sonner'; // Importiere toast
import ProfilePictureUploadModal from './components/ProfilePictureUploadModal'; // Pfad korrigiert
import CreateOrderModal from './components/CreateOrderModal';
import SupportChatInterface from './components/Support/SupportChatInterface';
import TaskiloProjectAssistant from '@/components/TaskiloProjectAssistant';
import { SavedPaymentMethod, SavedAddress, UserProfileData, OrderListItem } from '@/types/types';
import FaqSection from './components/FaqSection'; // FAQ Sektion importieren
import TimeTrackingOverview from '@/components/TimeTrackingOverview';
import BillingHistory from '@/components/BillingHistory';
import JobBoardPromoModal from './components/JobBoardPromoModal';

// Stripe wurde durch Escrow-System ersetzt - keine stripePromise mehr benötigt

const PAGE_LOG = 'UserDashboardPage:'; // Für Logging

const createSetupIntentCallable = httpsCallable<
  { firebaseUserId?: string },
  { clientSecret: string }
>(functions, 'createSetupIntent');
const getSavedPaymentMethodsCallable = httpsCallable<
  Record<string, never>,
  { savedPaymentMethods: SavedPaymentMethod[] }
>(functions, 'getSavedPaymentMethods');
const detachPaymentMethodCallable = httpsCallable<
  { paymentMethodId: string },
  { success: boolean; message?: string }
>(functions, 'detachPaymentMethod');

export default function UserDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const pageUid = typeof params?.uid === 'string' ? params.uid : ''; // Umbenannt, um Konflikt mit user.uid zu vermeiden

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);

  const [showAddPaymentMethodModal, setShowAddPaymentMethodModal] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false); // Beibehalten, da es für den "Neuen Auftrag erstellen"-Button verwendet wird
  const [showSupportChatModal, setShowSupportChatModal] = useState(false); // NEU: State für Support-Chat
  // const [activeView, setActiveView] = useState<"dashboard" | "settings">("dashboard"); // Nicht mehr benötigt, da Header die Navigation übernimmt

  const [clientSecretForSetupIntent, setClientSecretForSetupIntent] = useState<string | null>(null);
  const [_loadingSetupIntent, setLoadingSetupIntent] = useState(false);
  const [_setupIntentError, setSetupIntentError] = useState<string | null>(null);

  const [userOrders, setUserOrders] = useState<OrderListItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  // Job Board & Applications State
  const [matchingJobsCount, setMatchingJobsCount] = useState<number | null>(null);
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [hasJobFilter, setHasJobFilter] = useState(false);
  const [showJobBoardPromo, setShowJobBoardPromo] = useState(false);
  const [isJobCardFlipped, setIsJobCardFlipped] = useState(false);
  const [isApplicationsCardFlipped, setIsApplicationsCardFlipped] = useState(false);
  const [isSupportCardFlipped, setIsSupportCardFlipped] = useState(false);

  const loadInitialDashboardData = useCallback(async (user: FirebaseUser) => {
    setLoading(true);
    setError(null);

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        setError('Benutzerprofil nicht gefunden. Bitte kontaktieren Sie den Support.');
        setLoading(false);
        return;
      }
      const profileData = userDocSnap.data() as UserProfileData;

      // Check if we should show the promo modal
      if (!profileData.hideJobBoardPromo) {
        setShowJobBoardPromo(true);
      }

      const paymentMethodsResult = await getSavedPaymentMethodsCallable({});
      if (paymentMethodsResult.data?.savedPaymentMethods) {
        profileData.savedPaymentMethods = paymentMethodsResult.data.savedPaymentMethods;
      } else {
        profileData.savedPaymentMethods = [];
      }

      profileData.savedAddresses = (profileData.savedAddresses as SavedAddress[]) || [];

      setUserProfile(profileData);
      console.log('User Profile Data Loaded:', profileData); // Debug Log

      setLoadingOrders(true);
      setOrdersError(null);
      const ordersCollectionRef = collection(db, 'auftraege');

      // Zwei separate Abfragen für beide möglichen User-ID Felder
      const q1 = query(
        ordersCollectionRef,
        where('customerFirebaseUid', '==', user.uid),
        orderBy('paidAt', 'desc')
      );

      const q2 = query(
        ordersCollectionRef,
        where('kundeId', '==', user.uid),
        orderBy('paidAt', 'desc')
      );

      // Beide Abfragen parallel ausführen
      const [querySnapshot1, querySnapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);

      // Ergebnisse kombinieren und Duplikate entfernen
      const allOrderDocs = new Map();
      [...querySnapshot1.docs, ...querySnapshot2.docs].forEach(doc => {
        allOrderDocs.set(doc.id, doc);
      });

      const ordersData = Array.from(allOrderDocs.values()).map(doc => {
        const data = doc.data() as any; // Temporär any verwenden für Debugging
        // Debug-Log hinzufügen

        // Mapping der korrekten Felder
        return {
          id: doc.id,
          selectedSubcategory: data.selectedSubcategory || 'Unbekannt',
          status: data.status || 'unbekannt',
          totalPriceInCents: data.jobCalculatedPriceInCents || data.totalPriceInCents || 0,
          jobDateFrom: data.jobDateFrom || null,
          jobTimePreference: data.jobTimePreference || null,
          selectedAnbieterId: data.selectedAnbieterId || null,
          providerName: data.providerName || null,
        } as OrderListItem & { selectedAnbieterId?: string };
      });

      // 1. Collect all unique provider IDs that don't already have a providerName
      const providerIdsToFetch = [
        ...new Set(
          ordersData
            .filter(order => !order.providerName && order.selectedAnbieterId)
            .map(order => order.selectedAnbieterId!)
        ),
      ];

      const providerNameCache = new Map<string, string>();

      // 2. Fetch provider names individually from users collection
      if (providerIdsToFetch.length > 0) {
        await Promise.all(
          providerIdsToFetch.map(async providerId => {
            try {
              const userDocRef = doc(db, 'users', providerId);
              const userDocSnap = await getDoc(userDocRef);

              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                // Use companyName for Firma users, or firstName/lastName for individual users
                const name =
                  userData.companyName ||
                  `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
                  'Unbekannter Anbieter';
                providerNameCache.set(providerId, name);
              }
            } catch (error) {
              providerNameCache.set(providerId, 'Unbekannter Anbieter');
            }
          })
        );
      }

      // 3. Map over the original orders data and populate the provider names
      const resolvedOrders = ordersData.map(order => ({
        ...order,
        providerName:
          order.providerName || providerNameCache.get(order.selectedAnbieterId!) || 'Anbieter',
      }));

      // Filtere Aufträge mit dem Status 'abgelehnt_vom_anbieter' heraus,
      // da diese in der Dashboard-Vorschau nicht angezeigt werden sollen.
      const visibleOrders = resolvedOrders.filter(
        order => order.status !== 'abgelehnt_vom_anbieter'
      );
      setUserOrders(visibleOrders);
      setLoadingOrders(false);
    } catch (err: any) {
      setError(
        `Fehler beim Laden der Daten: ${err.message || 'Ein unbekannter Fehler ist aufgetreten.'}`
      );
      setLoadingOrders(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
      if (user) {
        if (user.uid !== pageUid) {
          router.replace(`/dashboard/user/${user.uid}`);
          return;
        }
        setCurrentUser(user);
        loadInitialDashboardData(user); // Lade Dashboard-Daten
      } else {
        router.replace(`/?redirectTo=/dashboard/user/${pageUid}`);
      }
    });
    return () => unsubscribe();
  }, [pageUid, router, loadInitialDashboardData]);

  // NEU: useEffect Hook zur Behandlung von Stripe Redirects
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const setupRedirect = urlParams.get('setup_redirect');
    const redirectStatus = urlParams.get('redirect_status');
    const setupIntentClientSecret = urlParams.get('setup_intent_client_secret');

    if (setupRedirect === 'true' && setupIntentClientSecret) {
      if (redirectStatus === 'succeeded') {
        toast.success('Zahlungsmethode erfolgreich hinzugefügt!');
        handlePaymentMethodAdded(); // Lade Zahlungsmethoden neu
      } else if (redirectStatus === 'failed' || redirectStatus === 'canceled') {
        toast.error('Einrichtung der Zahlungsmethode fehlgeschlagen oder abgebrochen.');
        // Optional: Stripe.retrieveSetupIntent verwenden, um mehr Details zum Fehler zu bekommen
      }
      // Entferne die Query-Parameter aus der URL, um zu verhindern,
      // dass die Nachricht bei jedem Neuladen erneut angezeigt wird.
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Nur einmal beim Mounten ausführen, um die URL zu prüfen

  // Fetch Job Board Data
  useEffect(() => {
    const fetchJobData = async () => {
      if (!currentUser?.uid) return;

      try {
        // 1. Fetch Applications
        const appsQuery = query(
          collection(db, 'users', currentUser.uid, 'job_applications'),
          orderBy('appliedAt', 'desc'),
          limit(3)
        );
        const appsSnap = await getDocs(appsQuery);
        const apps = appsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecentApplications(apps);

        // 2. Fetch Job Preferences & Matches
        const prefDoc = await getDoc(doc(db, 'users', currentUser.uid, 'preferences', 'jobboard'));
        if (prefDoc.exists()) {
          setHasJobFilter(true);
          const prefs = prefDoc.data();

          // Build query based on prefs (simplified version of JobBoard logic)
          const q = query(
            collectionGroup(db, 'jobs'),
            where('status', '==', 'active'),
            orderBy('postedAt', 'desc'),
            limit(50) // Fetch some recent jobs to check relevance
          );

          const jobsSnap = await getDocs(q);
          // Simple client-side filter for the "Quick Match" count
          const relevantJobs = jobsSnap.docs.filter(doc => {
            const job = doc.data();
            // Check location
            if (
              prefs.location &&
              !job.location?.toLowerCase().includes(prefs.location.toLowerCase())
            )
              return false;
            // Check title/searchPhrase
            if (prefs.searchPhrase) {
              const phrase = prefs.searchPhrase.toLowerCase();
              const titleMatch = job.title?.toLowerCase().includes(phrase);
              if (!titleMatch) return false;
            }
            return true;
          });

          setMatchingJobsCount(relevantJobs.length);
        } else {
          setHasJobFilter(false);
          setMatchingJobsCount(null);
        }
      } catch (error) {
        console.error('Error fetching job dashboard data', error);
      }
    };

    fetchJobData();
  }, [currentUser]);

  const handleProfilePictureUploaded = (newUrl: string) => {
    // Update local state to reflect the change immediately
    setUserProfile(prev =>
      prev ? { ...prev, profilePictureURL: newUrl, profilePictureFirebaseUrl: newUrl } : null
    );
    // Dispatch an event for other components like the header to listen to
    window.dispatchEvent(
      new CustomEvent('profileUpdated', { detail: { profilePictureURL: newUrl } })
    );
    setShowUploadModal(false);
  };

  const _handleOpenAddPaymentMethodModal = async () => {
    if (!currentUser || !userProfile?.stripeCustomerId) {
      setError(
        'Nutzer nicht authentifiziert oder Stripe Customer ID fehlt. Bitte versuchen Sie, die Seite neu zu laden.'
      );
      return;
    }
    setLoadingSetupIntent(true);
    setSetupIntentError(null);
    try {
      const result = await createSetupIntentCallable({});
      setClientSecretForSetupIntent(result.data.clientSecret);
      setShowAddPaymentMethodModal(true);
    } catch (err: any) {
      setSetupIntentError(
        `Fehler beim Vorbereiten der Zahlungsmethode: ${err.message || 'Unbekannter Fehler'}`
      ); // Typ für msg wird in der Komponente selbst behandelt
    } finally {
      setLoadingSetupIntent(false);
    }
  };

  const handlePaymentMethodAdded = async () => {
    setShowAddPaymentMethodModal(false);
    setClientSecretForSetupIntent(null);
    setSetupIntentError(null);

    try {
      const paymentMethodsResult = await getSavedPaymentMethodsCallable({});
      if (paymentMethodsResult.data?.savedPaymentMethods) {
        // Hier den Fehler in der Zuweisung beheben: savedPaymentMethods aktualisieren, nicht savedAddresses
        setUserProfile(prev => ({
          ...prev!,
          savedPaymentMethods: paymentMethodsResult.data.savedPaymentMethods,
        }));
      }
    } catch (err: any) {
      setError(
        `Fehler beim Aktualisieren der Zahlungsmethoden: ${err.message || 'Unbekannter Fehler'}`
      );
    }
  };

  const _handleRemovePaymentMethod = async (paymentMethodId: string) => {
    if (!currentUser) return;
    if (confirm('Sind Sie sicher, dass Sie diese Zahlungsmethode entfernen möchten?')) {
      try {
        const result = await detachPaymentMethodCallable({ paymentMethodId });

        if (result.data.success) {
          setUserProfile(prev => ({
            ...prev!,
            savedPaymentMethods:
              prev!.savedPaymentMethods?.filter(pm => pm.id !== paymentMethodId) || [],
          }));
          alert('Zahlungsmethode erfolgreich entfernt.');
        } else {
          alert(
            `Fehler beim Entfernen der Zahlungsmethode: ${result.data.message || 'Unbekannter Fehler'}`
          );
        }
      } catch (err: any) {
        alert(`Fehler beim Entfernen: ${err.message || 'Unbekannter Fehler'}`);
        setError(
          `Fehler beim Entfernen der Zahlungsmethode: ${err.message || 'Unbekannter Fehler'}`
        );
      }
    }
  };

  const handleAddAddress = async (newAddress: SavedAddress) => {
    if (!currentUser) return;
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      // Validierung auf eindeutigen Namen (außer bei der bearbeiteten Adresse selbst)
      if (
        userProfile?.savedAddresses?.some(
          addr => addr.name === newAddress.name && addr.id !== newAddress.id
        )
      ) {
        alert(
          'Eine Adresse mit diesem Namen existiert bereits. Bitte wählen Sie einen anderen Namen.'
        );
        return;
      }
      const addressId = `addr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const addressToAdd = { ...newAddress, id: addressId };

      await updateDoc(userDocRef, {
        savedAddresses: arrayUnion(addressToAdd),
      });
      setUserProfile(prev => ({
        ...prev!,
        savedAddresses: [...(prev?.savedAddresses || []), addressToAdd],
      }));
      setShowAddAddressModal(false);
      setEditingAddress(null);
      alert('Adresse erfolgreich hinzugefügt.');
    } catch (err: any) {
      setError(`Fehler beim Hinzufügen der Adresse: ${err.message || 'Unbekannter Fehler'}`);
    }
  };

  const handleUpdateAddress = async (updatedAddress: SavedAddress) => {
    if (!currentUser || !userProfile) return;
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const updatedAddresses =
        userProfile.savedAddresses?.map(addr =>
          addr.id === updatedAddress.id ? updatedAddress : addr
        ) || [];

      // Validierung auf eindeutige Namen (außer bei der bearbeiteten Adresse selbst)
      if (
        updatedAddresses.some(
          addr => addr.name === updatedAddress.name && addr.id !== updatedAddress.id
        )
      ) {
        alert(
          'Eine andere Adresse mit diesem Namen existiert bereits. Bitte wählen Sie einen eindeutigen Namen.'
        );
        return;
      }

      await updateDoc(userDocRef, {
        savedAddresses: updatedAddresses,
      });
      setUserProfile(prev => ({ ...prev!, savedAddresses: updatedAddresses }));
      setShowAddAddressModal(false);
      setEditingAddress(null);
      alert('Adresse erfolgreich aktualisiert.');
    } catch (err: any) {
      setError(`Fehler beim Aktualisieren der Adresse: ${err.message || 'Unbekannter Fehler'}`);
    }
  };

  const _handleDeleteAddress = async (addressId: string) => {
    if (!currentUser || !userProfile) return;
    if (confirm('Sind Sie sicher, dass Sie diese Adresse entfernen möchten?')) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const addressToDelete = userProfile.savedAddresses?.find(addr => addr.id === addressId);

        if (!addressToDelete) {
          return;
        }

        await updateDoc(userDocRef, {
          savedAddresses: arrayRemove(addressToDelete),
        });
        // FIX: Filter savedAddresses, nicht savedPaymentMethods
        setUserProfile(prev => ({
          ...prev!,
          savedAddresses: prev!.savedAddresses?.filter(addr => addr.id !== addressId) || [],
        }));
        alert('Adresse erfolgreich entfernt.');
      } catch (err: any) {
        alert(`Fehler beim Löschen: ${err.message || 'Unbekannter Fehler'}`);
        setError(`Fehler beim Löschen der Adresse: ${err.message || 'Unbekannter Fehler'}`);
      }
    }
  };

  const _handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (err: any) {
      alert(`Fehler beim Abmelden: ${err.message || 'Unbekannter Fehler'}`);
    }
  };

  const handleCreateNewOrder = () => {
    setShowCreateOrderModal(true);
  };

  const handleOpenSupportChat = () => {
    // Hier könnte später Logik zum Laden/Erstellen einer Chat-Session hinzukommen
    setShowSupportChatModal(true);
  };

  const handleOrderCreationSuccess = useCallback(() => {
    setShowCreateOrderModal(false); // Schließt das Modal
    if (currentUser) {
      toast.success('Auftrag erfolgreich erstellt! Die Daten werden aktualisiert.');
      loadInitialDashboardData(currentUser); // Lädt die Auftragsliste neu
    }
  }, [currentUser, loadInitialDashboardData]);

  const handlePromoClose = async (dontShowAgain: boolean) => {
    setShowJobBoardPromo(false);
    if (dontShowAgain && currentUser) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          hideJobBoardPromo: true,
        });
        // Update local state
        if (userProfile) {
          setUserProfile({ ...userProfile, hideJobBoardPromo: true });
        }
        toast.success('Einstellung gespeichert.');
      } catch (error) {
        console.error('Error saving preference:', error);
        toast.error('Einstellung konnte nicht gespeichert werden.');
      }
    }
  };

  if (loading || loadingOrders) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <FiLoader className="animate-spin text-6xl text-white mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Lade Dashboard...</h2>
          <p className="text-white/80">Einen Moment bitte</p>
        </div>
      </div>
    );
  }

  if (error || ordersError) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl rounded-2xl p-8 max-w-md text-center mx-4">
          <FiAlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">Fehler aufgetreten</h3>
          <p className="text-gray-600 mb-6">{error || ordersError}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-3 bg-linear-to-r from-[#14ad9f] to-teal-600 text-white rounded-xl hover:from-[#129a8f] hover:to-teal-700 transition-all duration-300 font-semibold"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser || !userProfile) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600">
        <div className="text-center">
          <FiLoader className="animate-spin text-6xl text-white mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Weiterleitung...</h2>
          <p className="text-white/80">Sie werden angemeldet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
      <div className="relative z-10 p-4 lg:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <WelcomeBox
            firstname={
              (userProfile as any)?.firstName ||
              (userProfile as any)?.firstname ||
              (userProfile as any)?.profile?.firstName ||
              (userProfile as any)?.step1?.firstName ||
              (userProfile as any)?.displayName?.split(' ')[0] ||
              (currentUser?.displayName ? currentUser.displayName.split(' ')[0] : '') ||
              'Benutzer'
            }
            profilePictureUrl={
              (typeof userProfile?.profilePictureURL === 'string'
                ? userProfile.profilePictureURL
                : null) ||
              (typeof userProfile?.profilePictureFirebaseUrl === 'string'
                ? userProfile.profilePictureFirebaseUrl
                : null) ||
              (typeof (userProfile as any)?.profileImage === 'string'
                ? (userProfile as any).profileImage
                : null) ||
              (typeof (userProfile as any)?.photoURL === 'string'
                ? (userProfile as any).photoURL
                : null) ||
              (typeof (userProfile as any)?.profile?.profilePictureURL === 'string'
                ? (userProfile as any).profile.profilePictureURL
                : null) ||
              (typeof (userProfile as any)?.step1?.profilePictureURL === 'string'
                ? (userProfile as any).step1.profilePictureURL
                : null) ||
              currentUser?.photoURL
            }
            onProfilePictureClick={() => setShowUploadModal(true)}
          />
          {/* VERBESSERTE GRID-LAYOUT mit Taskilo-Design */}
          <div className="space-y-6">
            {/* Info Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Jobbörse Flip Card */}
              <div
                className="relative h-full min-h-[200px] cursor-pointer group perspective-1000"
                onClick={() => setIsJobCardFlipped(!isJobCardFlipped)}
              >
                <div
                  className="relative w-full h-full transition-all duration-500 transform-style-3d"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isJobCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}
                >
                  {/* Front Face */}
                  <div
                    className="absolute inset-0 backface-hidden bg-linear-to-br from-[#14ad9f] to-teal-700 text-white shadow-2xl rounded-2xl p-5 overflow-hidden flex flex-col justify-between"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Briefcase size={80} />
                    </div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                        <Briefcase className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-bold text-xl mb-2">Jobbörse</h3>
                      <p className="text-teal-50 text-sm">
                        Entdecken Sie spannende Karrieremöglichkeiten.
                      </p>
                    </div>
                    <div className="relative z-10 flex items-center text-sm font-medium text-teal-100 mt-2">
                      <RotateCw size={16} className="mr-2" />
                      Klicken zum Umdrehen
                    </div>
                  </div>

                  {/* Back Face */}
                  <div
                    className="absolute inset-0 backface-hidden bg-white text-gray-800 shadow-2xl rounded-2xl p-5 overflow-hidden flex flex-col justify-between"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <div>
                      <h3 className="font-bold text-lg text-[#14ad9f] mb-2">Dein Job-Feed</h3>
                      {hasJobFilter && matchingJobsCount !== null ? (
                        <div className="flex flex-col items-center justify-center py-2">
                          <span className="text-5xl font-bold text-gray-800 mb-1">
                            {matchingJobsCount}
                          </span>
                          <span className="text-sm text-gray-500">neue Treffer</span>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600 mb-4">
                          Vervollständige dein Profil, um passende Jobs zu sehen.
                        </p>
                      )}
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        router.push(`/dashboard/user/${currentUser?.uid}/career`);
                      }}
                      className="w-full py-2 bg-[#14ad9f] text-white rounded-lg font-semibold text-sm hover:bg-teal-600 transition-colors flex items-center justify-center gap-2"
                    >
                      {hasJobFilter ? 'Jobs anzeigen' : 'Jobbörse öffnen'}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Meine Bewerbungen Flip Card */}
              <div
                className="relative h-full min-h-[200px] cursor-pointer group perspective-1000"
                onClick={() => setIsApplicationsCardFlipped(!isApplicationsCardFlipped)}
              >
                <div
                  className="relative w-full h-full transition-all duration-500 transform-style-3d"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isApplicationsCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}
                >
                  {/* Front Face */}
                  <div
                    className="absolute inset-0 backface-hidden bg-linear-to-br from-[#14ad9f] to-teal-700 text-white shadow-2xl rounded-2xl p-5 overflow-hidden flex flex-col justify-between"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Briefcase size={80} />
                    </div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                        <Briefcase className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-bold text-xl mb-2">Bewerbungen</h3>
                      <p className="text-teal-50 text-sm">
                        {recentApplications.length > 0
                          ? `${recentApplications.length} aktive Bewerbungen`
                          : 'Keine aktiven Bewerbungen'}
                      </p>
                    </div>
                    <div className="relative z-10 flex items-center text-sm font-medium text-teal-100 mt-2">
                      <RotateCw size={16} className="mr-2" />
                      Klicken zum Umdrehen
                    </div>
                  </div>

                  {/* Back Face */}
                  <div
                    className="absolute inset-0 backface-hidden bg-white text-gray-800 shadow-2xl rounded-2xl p-4 overflow-hidden flex flex-col"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    {recentApplications.length > 0 ? (
                      <>
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center shrink-0">
                          <Briefcase className="w-5 h-5 text-[#14ad9f] mr-2" />
                          Meine Bewerbungen
                        </h3>
                        <div className="space-y-2 overflow-y-auto grow pr-1">
                          {recentApplications.map((app: any) => (
                            <div
                              key={app.id}
                              className="p-2 bg-gray-50 rounded-lg border border-gray-100 hover:border-teal-200 transition-colors cursor-pointer"
                              onClick={e => {
                                e.stopPropagation();
                                router.push(
                                  `/dashboard/user/${currentUser?.uid}/career/applications`
                                );
                              }}
                            >
                              <p className="font-semibold text-gray-900 text-xs truncate">
                                {app.jobTitle || 'Bewerbung'}
                              </p>
                              <p className="text-[10px] text-gray-500 truncate">
                                {app.companyName}
                              </p>
                              <div className="flex justify-between items-center mt-1">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                    app.status === 'accepted'
                                      ? 'bg-green-100 text-green-700'
                                      : app.status === 'rejected'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {app.status === 'pending'
                                    ? 'Offen'
                                    : app.status === 'reviewed'
                                      ? 'Gesehen'
                                      : app.status === 'interview'
                                        ? 'Interview'
                                        : app.status === 'accepted'
                                          ? 'Zusage'
                                          : app.status === 'rejected'
                                            ? 'Absage'
                                            : app.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            router.push(`/dashboard/user/${currentUser?.uid}/career/applications`);
                          }}
                          className="w-full mt-2 py-1.5 text-xs text-[#14ad9f] font-medium hover:bg-teal-50 rounded-lg transition-colors shrink-0"
                        >
                          Alle anzeigen
                        </button>
                      </>
                    ) : (
                      <div className="h-full flex flex-col justify-center items-center text-center">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                          <Briefcase className="w-5 h-5 text-gray-400" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800 mb-1">
                          Keine Bewerbungen
                        </h3>
                        <p className="text-xs text-gray-500 mb-3">
                          Du hast dich noch auf keine Jobs beworben.
                        </p>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            router.push('/jobs');
                          }}
                          className="text-xs text-[#14ad9f] font-medium hover:underline"
                        >
                          Jetzt Jobs finden
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Support Flip Card */}
              <div
                className="md:col-span-2 relative h-full min-h-[200px] cursor-pointer group perspective-1000"
                onClick={() => setIsSupportCardFlipped(!isSupportCardFlipped)}
              >
                <div
                  className="relative w-full h-full transition-all duration-500 transform-style-3d"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isSupportCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}
                >
                  {/* Front Face */}
                  <div
                    className="absolute inset-0 backface-hidden bg-linear-to-br from-[#14ad9f] to-teal-700 text-white shadow-2xl rounded-2xl p-5 overflow-hidden flex flex-col justify-between"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <FiHelpCircle size={80} />
                    </div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                        <FiHelpCircle className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-bold text-xl mb-2">Hilfe & Support</h3>
                      <p className="text-teal-50 text-sm max-w-md">
                        Benötigen Sie Hilfe? Unser Support-Team ist 24/7 für Sie da.
                      </p>
                    </div>
                    <div className="relative z-10 flex items-center text-sm font-medium text-teal-100 mt-2">
                      <RotateCw size={16} className="mr-2" />
                      Klicken zum Umdrehen
                    </div>
                  </div>

                  {/* Back Face */}
                  <div
                    className="absolute inset-0 backface-hidden bg-white text-gray-800 shadow-2xl rounded-2xl p-5 overflow-hidden flex flex-col justify-center items-center"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <div className="text-center w-full max-w-md">
                      <div className="w-12 h-12 mx-auto mb-3 bg-linear-to-r from-[#14ad9f] to-teal-600 rounded-full flex items-center justify-center">
                        <FiHelpCircle className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">Wir sind für Sie da</h3>
                      <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                        Haben Sie Fragen zu einer Bestellung oder unserem Service? Starten Sie jetzt
                        einen Chat mit unserem Support.
                      </p>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleOpenSupportChat();
                        }}
                        className="px-6 py-2 bg-linear-to-r from-[#14ad9f] to-teal-600 text-white rounded-xl hover:from-[#129a8f] hover:to-teal-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl text-sm"
                      >
                        Support Chat starten
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hauptbereich: Meine Aufträge - nimmt volle Breite ein */}
            <div className="w-full">
              <div className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl rounded-2xl p-6 hover:shadow-3xl transition-all duration-300 h-fit">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold bg-linear-to-r from-[#14ad9f] to-teal-600 bg-clip-text text-transparent flex items-center">
                    <FiMessageSquare className="mr-3 text-[#14ad9f]" />
                    Meine Aufträge
                  </h2>
                  <div className="px-3 py-1 bg-linear-to-r from-[#14ad9f] to-teal-600 text-white text-sm font-medium rounded-full">
                    {userOrders.length} {userOrders.length === 1 ? 'Auftrag' : 'Aufträge'}
                  </div>
                </div>

                {loadingOrders ? (
                  <div className="flex justify-center items-center py-8">
                    <FiLoader className="animate-spin text-4xl text-[#14ad9f]" />
                    <span className="ml-3 text-gray-600 text-lg">Lade Aufträge...</span>
                  </div>
                ) : ordersError ? (
                  <div className="text-center p-6 text-red-600 bg-red-50 rounded-xl border border-red-200">
                    <FiAlertCircle className="mx-auto h-8 w-8 mb-3" />
                    <p className="font-medium">{ordersError}</p>
                  </div>
                ) : userOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-linear-to-r from-[#14ad9f] to-teal-600 rounded-full flex items-center justify-center">
                      <FiMessageSquare className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Noch keine Aufträge
                    </h3>
                    <p className="text-gray-500 mb-6 text-sm">
                      Erstellen Sie Ihren ersten Auftrag und entdecken Sie die besten Services.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {userOrders.map(order => (
                      <div
                        key={order.id}
                        className="bg-linear-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-300 hover:border-[#14ad9f]/30"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold text-lg text-gray-800">
                                {order.selectedSubcategory}
                              </h3>
                              <span className="text-xs bg-[#14ad9f]/10 text-[#14ad9f] px-2 py-1 rounded-full font-medium">
                                Service
                              </span>
                            </div>
                            {order.providerName && (
                              <p className="text-sm text-gray-600 mb-1 flex items-center">
                                <span className="w-2 h-2 bg-[#14ad9f] rounded-full mr-2"></span>
                                Anbieter: {order.providerName}
                              </p>
                            )}
                            <p className="text-sm text-gray-600 flex items-center">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                              {order.jobDateFrom
                                ? `${new Date(order.jobDateFrom).toLocaleDateString('de-DE', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  })} um ${order.jobTimePreference || '09:00'} Uhr`
                                : 'Datum noch nicht festgelegt'}
                            </p>
                          </div>

                          <div className="text-right ml-4">
                            <div className="text-xl font-bold text-gray-800 mb-1">
                              {order.totalPriceInCents && !isNaN(order.totalPriceInCents)
                                ? (order.totalPriceInCents / 100).toLocaleString('de-DE', {
                                    style: 'currency',
                                    currency: 'EUR',
                                  })
                                : '0,00 €'}
                            </div>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                order.status === 'bezahlt' ||
                                order.status === 'zahlung_erhalten_clearing'
                                  ? 'bg-green-100 text-green-800 border border-green-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {order.status
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleCreateNewOrder}
                    className="flex-1 flex items-center justify-center px-4 py-3 bg-linear-to-r from-[#14ad9f] to-teal-600 text-white rounded-xl hover:from-[#129a8f] hover:to-teal-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
                  >
                    <FiPlusCircle className="mr-2 w-4 h-4" />
                    Neuen Auftrag erstellen
                  </button>

                  {userOrders.length > 0 && (
                    <button
                      onClick={() =>
                        router.push(`/dashboard/user/${currentUser?.uid}/orders/overview`)
                      }
                      className="flex items-center justify-center px-4 py-3 bg-white border-2 border-[#14ad9f] text-[#14ad9f] rounded-xl hover:bg-[#14ad9f] hover:text-white transition-all duration-300 font-semibold"
                    >
                      <FiMessageSquare className="mr-2 w-4 h-4" />
                      Alle anzeigen
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Kombinierter Bereich für TimeTracking und Billing - über FAQ */}
          {currentUser && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* TimeTracking Overview - Kompakter */}
              <div className="bg-white/90 backdrop-blur-sm border border-white/15 shadow-lg rounded-xl p-4 hover:shadow-xl transition-all duration-300">
                <TimeTrackingOverview customerId={currentUser.uid} onRequestsUpdated={() => {}} />
              </div>

              {/* Billing History - Kompakter */}
              <div className="bg-white/90 backdrop-blur-sm border border-white/15 shadow-lg rounded-xl p-4 hover:shadow-xl transition-all duration-300">
                <BillingHistory customerId={currentUser.uid} />
              </div>
            </div>
          )}

          {/* FAQ Section - Kompakter */}
          <div className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl rounded-2xl p-6 hover:shadow-3xl transition-all duration-300">
            <FaqSection />
          </div>
        </div>

        {/* Modals */}
        {showUploadModal && currentUser && (
          <ProfilePictureUploadModal
            currentUser={currentUser}
            onClose={() => setShowUploadModal(false)}
            onSuccess={handleProfilePictureUploaded}
          />
        )}
        {/* Modal für Neuen Auftrag erstellen */}
        {showCreateOrderModal && (
          <Modal onClose={() => setShowCreateOrderModal(false)} title="Neuen Auftrag erstellen">
            <CreateOrderModal
              onClose={() => setShowCreateOrderModal(false)}
              onSuccess={handleOrderCreationSuccess}
              currentUser={currentUser!}
              userProfile={userProfile!}
            />
          </Modal>
        )}
        {/* Modal für Support Chat */}
        {showSupportChatModal && currentUser && userProfile && (
          <Modal onClose={() => setShowSupportChatModal(false)} title="Support">
            <SupportChatInterface onClose={() => setShowSupportChatModal(false)} />
          </Modal>
        )}
        {showAddPaymentMethodModal && (
          <Modal
            onClose={() => setShowAddPaymentMethodModal(false)}
            title="Zahlungsmethode"
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiLoader className="text-3xl text-[#14ad9f]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Sichere Treuhand-Zahlungen
              </h3>
              <p className="text-gray-600 mb-4">
                Taskilo verwendet jetzt ein sicheres Treuhand-System für alle Zahlungen. 
                Zahlungen werden direkt bei der Auftragserstellung abgewickelt.
              </p>
              <p className="text-sm text-gray-500">
                Unterstützte Zahlungsmethoden: SEPA-Überweisung, Revolut Business
              </p>
            </div>
          </Modal>
        )}
        {showAddAddressModal && (
          <Modal
            onClose={() => setShowAddAddressModal(false)}
            title={editingAddress ? 'Adresse bearbeiten' : 'Adresse hinzufügen'}
          >
            <AddressForm
              initialData={editingAddress ?? undefined}
              onChange={editingAddress ? handleUpdateAddress : handleAddAddress}
              onCancel={() => {
                setShowAddAddressModal(false);
                setEditingAddress(null);
              }}
            />
          </Modal>
        )}
        {showJobBoardPromo && currentUser && (
          <JobBoardPromoModal onClose={handlePromoClose} uid={currentUser.uid} />
        )}
        {/* Taskilo KI-Projekt-Assistent */}
        {currentUser?.uid && (
          <TaskiloProjectAssistant
            userId={currentUser.uid}
            onOrderCreate={orderData => {
              toast.success('Auftrag erfolgreich erstellt!');
              // Optional: Refresh der Seite oder Navigation
              window.location.reload();
            }}
          />
        )}
      </div>
    </div>
  );
}
