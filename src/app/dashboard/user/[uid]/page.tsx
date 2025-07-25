'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute'; // Import ProtectedRoute
import { SidebarVisibilityProvider } from '@/contexts/SidebarVisibilityContext';
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
  documentId,
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
  const [loadingSetupIntent, setLoadingSetupIntent] = useState(false);
  const [setupIntentError, setSetupIntentError] = useState<string | null>(null);

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
      const q = query(
        ordersCollectionRef,
        where('kundeId', '==', user.uid),
        orderBy('paidAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const ordersData = querySnapshot.docs.map(doc => {
        const data = doc.data() as any; // Temporär any verwenden für Debugging
        console.log('Order data from Firestore:', data); // Debug-Log hinzufügen

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

      // 2. Efficiently fetch all required provider names in batches
      if (providerIdsToFetch.length > 0) {
        const CHUNK_SIZE = 30; // Firestore 'in' query limit
        for (let i = 0; i < providerIdsToFetch.length; i += CHUNK_SIZE) {
          const chunk = providerIdsToFetch.slice(i, i + CHUNK_SIZE);

          // First, try to get names from the 'companies' collection
          const companiesQuery = query(
            collection(db, 'companies'),
            where(documentId(), 'in', chunk)
          );
          const companiesSnapshot = await getDocs(companiesQuery);
          companiesSnapshot.forEach(doc => {
            providerNameCache.set(doc.id, doc.data().companyName || 'Unbekannter Anbieter');
          });

          // For any IDs not found in 'companies', look them up in 'users'
          const remainingIds = chunk.filter(id => !providerNameCache.has(id));
          if (remainingIds.length > 0) {
            const usersQuery = query(
              collection(db, 'users'),
              where(documentId(), 'in', remainingIds)
            );
            const usersSnapshot = await getDocs(usersQuery);
            usersSnapshot.forEach(doc => {
              const userData = doc.data();
              const name =
                `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
                'Unbekannter Anbieter';
              providerNameCache.set(doc.id, name);
            });
          }
        }
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
      console.error('Fehler beim Laden des Benutzerprofils oder der Daten:', err);
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
      console.log(PAGE_LOG, 'Stripe SetupIntent Redirect erkannt. Status:', redirectStatus);
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

  const handleOpenAddPaymentMethodModal = async () => {
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
      console.error('Fehler beim Abrufen des SetupIntent Client Secrets:', err);
      setSetupIntentError(
        `Fehler beim Vorbereiten der Zahlungsmethode: ${err.message || 'Unbekannter Fehler'}`
      ); // Typ für msg wird in der Komponente selbst behandelt
    } finally {
      setLoadingSetupIntent(false);
    }
  };

  const handlePaymentMethodAdded = async () => {
    console.log(
      'Zahlungsmethode erfolgreich hinzugefügt (Webhook sollte Firestore aktualisieren). Lade neu...'
    );
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
      console.error('Fehler beim Neuladen der Zahlungsmethoden nach Hinzufügen:', err);
      setError(
        `Fehler beim Aktualisieren der Zahlungsmethoden: ${err.message || 'Unbekannter Fehler'}`
      );
    }
  };

  const handleRemovePaymentMethod = async (paymentMethodId: string) => {
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
        console.error('Fehler beim Entfernen der Zahlungsmethode:', err);
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
      console.error('Fehler beim Hinzufügen der Adresse:', err);
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
      console.error('Fehler beim Aktualisieren der Adresse:', err);
      setError(`Fehler beim Aktualisieren der Adresse: ${err.message || 'Unbekannter Fehler'}`);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!currentUser || !userProfile) return;
    if (confirm('Sind Sie sicher, dass Sie diese Adresse entfernen möchten?')) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const addressToDelete = userProfile.savedAddresses?.find(addr => addr.id === addressId);

        if (!addressToDelete) {
          console.warn('Versuch, nicht existierende Adresse zu löschen:', addressId);
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
        console.error('Fehler beim Löschen der Adresse:', err);
        alert(`Fehler beim Löschen: ${err.message || 'Unbekannter Fehler'}`);
        setError(`Fehler beim Löschen der Adresse: ${err.message || 'Unbekannter Fehler'}`);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
      console.log('Benutzer erfolgreich abgemeldet.');
    } catch (err: any) {
      console.error('Fehler beim Abmelden:', err);
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
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        Lade Dashboard...
      </div>
    );
  }

  if (error || ordersError) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4 text-center">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md"
          role="alert"
        >
          <FiAlertCircle size={24} className="inline mr-2" />
          <strong className="font-bold">Fehler:</strong>
          <span className="block sm:inline ml-1">{error || ordersError}</span>
          <p className="mt-2 text-sm">
            Bitte versuchen Sie es erneut oder kontaktieren Sie den Support.
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser || !userProfile) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        Weiterleitung...
      </div>
    );
  }

  return (
    <SidebarVisibilityProvider>
      <ProtectedRoute>
        <div className="flex flex-col min-h-screen">
          {' '}
          {/* Hauptcontainer für das Benutzer-Dashboard ohne Sidebar */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {' '}
            {/* Hauptinhaltsbereich */}
            <Suspense
              fallback={
                <div className="flex justify-center items-center min-h-screen">
                  <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" /> Lade
                  Benutzeroberfläche...
                </div>
              }
            >
              <div className="max-w-5xl mx-auto space-y-6">
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
                {/* HIER ÄNDERT SICH DAS LAYOUT: EINZELNER GRID-CONTAINER FÜR ALLE KARTEN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Abschnitt: Meine Aufträge - Nimmt jetzt mehr Platz ein */}
                  <div className="bg-white shadow rounded-lg p-6 flex flex-col h-full min-h-[250px] sm:col-span-2 lg:col-span-2">
                    <h2 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
                      <FiMessageSquare className="mr-2" /> Meine Aufträge
                    </h2>
                    {loadingOrders ? (
                      <div className="flex justify-center items-center py-8 flex-grow">
                        <FiLoader className="animate-spin text-3xl text-[#14ad9f]" />
                        <span className="ml-3 text-gray-600">Lade Aufträge...</span>
                      </div>
                    ) : ordersError ? (
                      <div className="text-center p-4 text-red-600 flex-grow">
                        <FiAlertCircle className="mr-2 h-5 w-5 inline-block" /> {ordersError}
                      </div>
                    ) : userOrders.length === 0 ? (
                      <p className="text-gray-500 text-center py-8 flex-grow">
                        Sie haben noch keine Aufträge erstellt.
                      </p>
                    ) : (
                      <ul className="space-y-3 flex-grow overflow-y-auto max-h-[min(300px, 40vh)]">
                        {' '}
                        {/* Reduced space-y for tighter packing */}
                        {userOrders.map(order => (
                          <li key={order.id} className="p-4 border border-gray-200 rounded-md">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                              {/* Linke Spalte: Dienstleistung und Datum */}
                              <div className="flex flex-col">
                                <p className="font-semibold text-gray-800 text-base">
                                  {order.selectedSubcategory}
                                  {order.providerName && (
                                    <span className="text-sm font-normal text-gray-600 ml-1">
                                      ({order.providerName})
                                    </span>
                                  )}
                                </p>
                                <p className="text-sm text-gray-600 mt-0.5">
                                  {order.jobDateFrom
                                    ? `Am ${new Date(order.jobDateFrom).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric', year: 'numeric' })} um ${new Date(order.jobDateFrom).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`
                                    : 'Datum/Zeit nicht angegeben'}
                                </p>
                              </div>

                              {/* Rechte Spalte: Preis und Status */}
                              <div className="flex flex-col sm:items-end mt-2 sm:mt-0">
                                <p className="text-sm text-gray-700 font-medium">
                                  Preis:{' '}
                                  {order.totalPriceInCents && !isNaN(order.totalPriceInCents)
                                    ? (order.totalPriceInCents / 100).toFixed(2)
                                    : '0.00'}{' '}
                                  EUR
                                </p>
                                <div className="mt-1">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-semibold inline-block ${order.status === 'bezahlt' ||
                                        order.status === 'Zahlung_erhalten_clearing'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                      }`}
                                  >
                                    {order.status.replace(/_/g, ' ').charAt(0).toUpperCase() +
                                      order.status.replace(/_/g, ' ').slice(1)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    {/* Always show "Neuen Auftrag erstellen" button */}
                    <button
                      onClick={handleCreateNewOrder}
                      className={`mt-4 flex items-center justify-center w-full px-4 py-2 rounded-md transition-colors text-sm ${userOrders.length === 0
                          ? 'bg-[#14ad9f] text-white hover:bg-[#129a8f]' // Primary style if no orders
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-100' // Secondary style if orders exist
                        }`}
                    >
                      <FiPlusCircle className="mr-2" /> Neuen Auftrag erstellen
                    </button>

                    {/* Show "Chat & Details" button only if there are existing orders */}
                    {userOrders.length > 0 && (
                      <button
                        onClick={() =>
                          router.push(
                            `/dashboard/user/${currentUser?.uid}/orders/${userOrders[0].id}`
                          )
                        }
                        className="mt-2 flex items-center justify-center w-full px-4 py-2 bg-[#14ad9f] text-white rounded-md hover:bg-[#129a8f] transition-colors text-sm"
                      >
                        <FiMessageSquare className="mr-2" /> Chat & Details (Neuester Auftrag)
                      </button>
                    )}
                  </div>

                  {/* Support Card */}
                  <div className="bg-white shadow rounded-lg p-6 flex flex-col h-full min-h-[250px]">
                    {/* ERSETZT: HelpCard wurde durch direkten JSX-Code ersetzt, um den Fehler "nicht gefunden" zu beheben. */}
                    <div className="flex-grow">
                      <h2 className="text-2xl font-semibold text-gray-700 mb-2 flex items-center">
                        <FiHelpCircle className="mr-2" /> Hilfe & Support
                      </h2>
                      <p className="text-gray-500 text-sm">
                        Haben Sie Fragen zu einem Auftrag oder benötigen Sie Hilfe? Unser
                        Support-Team ist für Sie da.
                      </p>
                    </div>
                    <button
                      onClick={handleOpenSupportChat}
                      className="mt-4 flex items-center justify-center w-full px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      Support kontaktieren
                    </button>
                  </div>

                  {/* Die Abschnitte "Meine Zahlungsmethoden" und "Meine Adressen" wurden entfernt */}
                </div>{' '}
                {/* <-- SCHLIESSENDES TAG FÜR grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 */}
                {/* FAQ Section */}
                <div className="mt-12">
                  <FaqSection />
                </div>

                {/* TimeTracking Overview Section */}
                {currentUser && (
                  <div className="mt-12">
                    <TimeTrackingOverview
                      customerId={currentUser.uid}
                      onRequestsUpdated={() => {
                        // Optional: Refresh der Seite oder show success message
                        console.log('Time tracking requests updated');
                      }}
                    />
                  </div>
                )}

                {/* Billing History Section */}
                {currentUser && (
                  <div className="mt-12">
                    <BillingHistory
                      customerId={currentUser.uid}
                    />
                  </div>
                )}
              </div>{' '}
              {/* Schließt max-w-5xl mx-auto space-y-6 */}
            </Suspense>
          </main>
          {/* Modal für Profilbild-Upload */}
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
              {/* KORREKTUR: Die Props 'currentUser' und 'userProfile' wurden entfernt, da die Komponente sie jetzt intern über den AuthContext bezieht. */}
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
                    onError={(msg: string) => setSetupIntentError(msg)} // Typ für msg hinzugefügt
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
              onOrderCreate={orderData => {
                toast.success('Auftrag erfolgreich erstellt!');
                // Optional: Refresh der Seite oder Navigation
                window.location.reload();
              }}
            />
          )}
        </div>
      </ProtectedRoute>
    </SidebarVisibilityProvider>
  );
}
