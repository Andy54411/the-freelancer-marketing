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
} from 'lucide-react';
import Modal from './components/Modal';
import { Elements } from '@stripe/react-stripe-js';
import AddPaymentMethodForm from './components/AddPaymentMethodForm';
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

import { stripePromise } from '@/lib/stripe';

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

      const paymentMethodsResult = await getSavedPaymentMethodsCallable({});
      if (paymentMethodsResult.data?.savedPaymentMethods) {
        profileData.savedPaymentMethods = paymentMethodsResult.data.savedPaymentMethods;
      } else {
        profileData.savedPaymentMethods = [];
      }

      profileData.savedAddresses = (profileData.savedAddresses as SavedAddress[]) || [];

      setUserProfile(profileData);

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
        router.replace(`/login?redirectTo=/dashboard/user/${pageUid}`);
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
      router.replace('/login');

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
            className="w-full px-4 py-3 bg-gradient-to-r from-[#14ad9f] to-teal-600 text-white rounded-xl hover:from-[#129a8f] hover:to-teal-700 transition-all duration-300 font-semibold"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser || !userProfile) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600">
        <div className="text-center">
          <FiLoader className="animate-spin text-6xl text-white mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Weiterleitung...</h2>
          <p className="text-white/80">Sie werden angemeldet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative -m-4 lg:-m-6 -mt-16">
      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
      <div className="relative z-10 pt-20 px-4 lg:px-6 pb-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <WelcomeBox
            firstname={typeof userProfile.firstName === 'string' ? userProfile.firstName : ''}
            profilePictureUrl={
              (typeof userProfile.profilePictureURL === 'string'
                ? userProfile.profilePictureURL
                : null) ||
              (typeof userProfile.profilePictureFirebaseUrl === 'string'
                ? userProfile.profilePictureFirebaseUrl
                : null)
            }
            onProfilePictureClick={() => setShowUploadModal(true)}
          />
          {/* VERBESSERTE GRID-LAYOUT mit Taskilo-Design */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Hauptbereich: Meine Aufträge - nimmt 2/3 des Platzes ein */}
            <div className="lg:col-span-2">
              <div className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl rounded-2xl p-6 hover:shadow-3xl transition-all duration-300 h-fit">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-[#14ad9f] to-teal-600 bg-clip-text text-transparent flex items-center">
                    <FiMessageSquare className="mr-3 text-[#14ad9f]" />
                    Meine Aufträge
                  </h2>
                  <div className="px-3 py-1 bg-gradient-to-r from-[#14ad9f] to-teal-600 text-white text-sm font-medium rounded-full">
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
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-[#14ad9f] to-teal-600 rounded-full flex items-center justify-center">
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
                        className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-300 hover:border-[#14ad9f]/30"
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
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${order.status === 'bezahlt' ||
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
                    className="flex-1 flex items-center justify-center px-4 py-3 bg-gradient-to-r from-[#14ad9f] to-teal-600 text-white rounded-xl hover:from-[#129a8f] hover:to-teal-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
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

            {/* Seitenleiste: Support & Schnellzugriff */}
            <div className="space-y-4">
              {/* Support Card */}
              <div className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl rounded-2xl p-4 hover:shadow-3xl transition-all duration-300 h-fit">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-r from-[#14ad9f] to-teal-600 rounded-full flex items-center justify-center">
                    <FiHelpCircle className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Hilfe & Support</h3>
                  <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                    Benötigen Sie Hilfe? Unser Support-Team ist 24/7 für Sie da.
                  </p>
                  <button
                    onClick={handleOpenSupportChat}
                    className="w-full px-3 py-2 bg-gradient-to-r from-[#14ad9f] to-teal-600 text-white rounded-xl hover:from-[#129a8f] hover:to-teal-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl text-sm"
                  >
                    Support kontaktieren
                  </button>
                </div>
              </div>

              {/* Quick Stats Card */}
              <div className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl rounded-2xl p-4 hover:shadow-3xl transition-all duration-300 h-fit">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                  <span className="w-3 h-3 bg-gradient-to-r from-[#14ad9f] to-teal-600 rounded-full mr-2"></span>
                  Übersicht
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <span className="text-sm font-medium text-gray-700">Aktive Aufträge</span>
                    <span className="text-lg font-bold text-green-600">
                      {
                        userOrders.filter(
                          order =>
                            order.status === 'zahlung_erhalten_clearing' ||
                            order.status === 'bezahlt' ||
                            order.status === 'in_bearbeitung' ||
                            order.status === 'angenommen'
                        ).length
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                    <span className="text-sm font-medium text-gray-700">Gesamt investiert</span>
                    <span className="text-lg font-bold text-blue-600">
                      {(
                        userOrders.reduce(
                          (total, order) => total + (order.totalPriceInCents || 0),
                          0
                        ) / 100
                      ).toLocaleString('de-DE', {
                        style: 'currency',
                        currency: 'EUR',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Kombinierter Bereich für TimeTracking und Billing - über FAQ */}
          {currentUser && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* TimeTracking Overview - Kompakter */}
              <div className="bg-white/90 backdrop-blur-sm border border-white/15 shadow-lg rounded-xl p-4 hover:shadow-xl transition-all duration-300">
                <TimeTrackingOverview
                  customerId={currentUser.uid}
                  onRequestsUpdated={() => {

                  }}
                />
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
            title="Zahlungsmethode hinzufügen"
          >
            {clientSecretForSetupIntent ? (
              <Elements
                stripe={stripePromise}
                options={{ clientSecret: clientSecretForSetupIntent }}
              >
                <AddPaymentMethodForm
                  onSuccess={handlePaymentMethodAdded}
                  onError={(msg: string) => setSetupIntentError(msg)}
                  clientSecret={clientSecretForSetupIntent}
                />
              </Elements>
            ) : (
              <div className="text-center p-4">
                <FiLoader className="animate-spin text-3xl text-[#14ad9f] mx-auto mb-3" />
                <p>Bereite Formular vor...</p>
              </div>
            )}
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
        {/* Taskilo KI-Projekt-Assistent */}
        {currentUser?.uid && (
          <TaskiloProjectAssistant
            userId={currentUser.uid}
            onOrderCreate={(orderData) => {
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
