'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, app } from '@/firebase/clients';
import { WelcomeBox } from './components/WelcomeBox';
import { ProfileShortcut } from './components/ProfileShortcut';
import { HelpCard } from './components/Support/HelpCard'; // KORRIGIERTER IMPORTPFAD
import { FiLoader, FiCreditCard, FiMapPin, FiPlus, FiEdit, FiTrash2, FiAlertCircle, FiLogOut, FiMessageSquare, FiPlusCircle } from 'react-icons/fi';
import Modal from '@/app/dashboard/user/[uid]/components/Modal';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js'; // KORRIGIERTER IMPORT
import AddPaymentMethodForm from './components/AddPaymentMethodForm';
import AddressForm from './components/AddressForm';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner'; // Importiere toast
import CreateOrderModal from './components/CreateOrderModal';
import SupportChatInterface from './components/Support/SupportChatInterface'; // PFAD GEÄNDERT ZU RELATIV
import { SavedPaymentMethod, SavedAddress, UserProfileData, OrderListItem } from '@/types/types';
import FooterSection from '@/components/footer';
import Header from '@/components/Header'; // Importiere die Header-Komponente


const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

const PAGE_LOG = "UserDashboardPage:"; // Für Logging
const auth = getAuth(app);
const functionsInstance = getFunctions(app);

const createSetupIntentCallable = httpsCallable<{ firebaseUserId?: string }, { clientSecret: string }>(functionsInstance, 'createSetupIntent');
const getSavedPaymentMethodsCallable = httpsCallable<Record<string, never>, { savedPaymentMethods: SavedPaymentMethod[] }>(functionsInstance, 'getSavedPaymentMethods');
const detachPaymentMethodCallable = httpsCallable<{ paymentMethodId: string }, { success: boolean; message?: string }>(functionsInstance, 'detachPaymentMethod');


export default function UserDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const pageUid = typeof params.uid === 'string' ? params.uid : ''; // Umbenannt, um Konflikt mit user.uid zu vermeiden

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);

  const [showAddPaymentMethodModal, setShowAddPaymentMethodModal] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [showSupportChatModal, setShowSupportChatModal] = useState(false); // NEU: State für Support-Chat


  const [clientSecretForSetupIntent, setClientSecretForSetupIntent] = useState<string | null>(null);
  const [loadingSetupIntent, setLoadingSetupIntent] = useState(false);
  const [setupIntentError, setSetupIntentError] = useState<string | null>(null);

  const [userOrders, setUserOrders] = useState<OrderListItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);


  const loadInitialDashboardData = useCallback(async (user: User) => {
    setLoading(true);
    setError(null);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.uid !== pageUid) {
          router.replace(`/dashboard/user/${user.uid}`);
          return;
        }
        setCurrentUser(user);

        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (!userDocSnap.exists()) {
            setError("Benutzerprofil nicht gefunden. Bitte kontaktieren Sie den Support.");
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

          profileData.savedAddresses = (profileData.savedAddresses as SavedAddress[] || []);

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
          const fetchedOrders: OrderListItem[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            fetchedOrders.push({
              id: doc.id,
              selectedSubcategory: data.selectedSubcategory,
              status: data.status,
              totalPriceInCents: data.totalPriceInCents,
              jobDateFrom: data.jobDateFrom,
              jobTimePreference: data.jobTimePreference,
              providerName: data.providerName, // Dieses Feld MUSS im OrderListItem Interface existieren!
            });
          });
          setUserOrders(fetchedOrders);
          setLoadingOrders(false);
        } catch (err: any) {
          console.error("Fehler beim Laden des Benutzerprofils oder der Daten:", err);
          setError(`Fehler beim Laden der Daten: ${err.message || 'Ein unbekannter Fehler ist aufgetreten.'}`);
          setLoadingOrders(false);
        } finally {
          setLoading(false);
        }
      } else {
        router.replace(`/login?redirectTo=/dashboard/user/${pageUid}`);
      }
    });

    return () => unsubscribe();
  }, [pageUid, router]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
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
      console.log(PAGE_LOG, "Stripe SetupIntent Redirect erkannt. Status:", redirectStatus);
      if (redirectStatus === 'succeeded') {
        toast.success("Zahlungsmethode erfolgreich hinzugefügt!");
        handlePaymentMethodAdded(); // Lade Zahlungsmethoden neu
      } else if (redirectStatus === 'failed' || redirectStatus === 'canceled') {
        toast.error("Einrichtung der Zahlungsmethode fehlgeschlagen oder abgebrochen.");
        // Optional: Stripe.retrieveSetupIntent verwenden, um mehr Details zum Fehler zu bekommen
      }
      // Entferne die Query-Parameter aus der URL, um zu verhindern,
      // dass die Nachricht bei jedem Neuladen erneut angezeigt wird.
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Nur einmal beim Mounten ausführen, um die URL zu prüfen

  const handleOpenAddPaymentMethodModal = async () => {
    if (!currentUser || !userProfile?.stripeCustomerId) {
      setError("Nutzer nicht authentifiziert oder Stripe Customer ID fehlt. Bitte versuchen Sie, die Seite neu zu laden.");
      return;
    }
    setLoadingSetupIntent(true);
    setSetupIntentError(null);
    try {
      const result = await createSetupIntentCallable({});
      setClientSecretForSetupIntent(result.data.clientSecret);
      setShowAddPaymentMethodModal(true);
    } catch (err: any) {
      console.error("Fehler beim Abrufen des SetupIntent Client Secrets:", err);
      setSetupIntentError(`Fehler beim Vorbereiten der Zahlungsmethode: ${err.message || 'Unbekannter Fehler'}`);
    } finally {
      setLoadingSetupIntent(false);
    }
  };

  const handlePaymentMethodAdded = async () => {
    console.log("Zahlungsmethode erfolgreich hinzugefügt (Webhook sollte Firestore aktualisieren). Lade neu...");
    setShowAddPaymentMethodModal(false);
    setClientSecretForSetupIntent(null);
    setSetupIntentError(null);

    try {
      const paymentMethodsResult = await getSavedPaymentMethodsCallable({});
      if (paymentMethodsResult.data?.savedPaymentMethods) {
        // Hier den Fehler in der Zuweisung beheben: savedPaymentMethods aktualisieren, nicht savedAddresses
        setUserProfile(prev => ({ ...prev!, savedPaymentMethods: paymentMethodsResult.data.savedPaymentMethods }));
      }
    } catch (err: any) {
      console.error("Fehler beim Neuladen der Zahlungsmethoden nach Hinzufügen:", err);
      setError(`Fehler beim Aktualisieren der Zahlungsmethoden: ${err.message || 'Unbekannter Fehler'}`);
    }
  };

  const handleRemovePaymentMethod = async (paymentMethodId: string) => {
    if (!currentUser) return;
    if (confirm("Sind Sie sicher, dass Sie diese Zahlungsmethode entfernen möchten?")) {
      try {
        const result = await detachPaymentMethodCallable({ paymentMethodId });

        if (result.data.success) {
          setUserProfile(prev => ({
            ...prev!,
            savedPaymentMethods: prev!.savedPaymentMethods?.filter(pm => pm.id !== paymentMethodId) || [],
          }));
          alert("Zahlungsmethode erfolgreich entfernt.");
        } else {
          alert(`Fehler beim Entfernen der Zahlungsmethode: ${result.data.message || 'Unbekannter Fehler'}`);
        }
      } catch (err: any) {
        console.error("Fehler beim Entfernen der Zahlungsmethode:", err);
        alert(`Fehler beim Entfernen: ${err.message || 'Unbekannter Fehler'}`);
        setError(`Fehler beim Entfernen der Zahlungsmethode: ${err.message || 'Unbekannter Fehler'}`);
      }
    }
  };

  const handleAddAddress = async (newAddress: SavedAddress) => {
    if (!currentUser) return;
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      // Validierung auf eindeutigen Namen (außer bei der bearbeiteten Adresse selbst)
      if (userProfile?.savedAddresses?.some(addr => addr.name === newAddress.name && addr.id !== newAddress.id)) {
        alert("Eine Adresse mit diesem Namen existiert bereits. Bitte wählen Sie einen anderen Namen.");
        return;
      }
      const addressId = `addr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const addressToAdd = { ...newAddress, id: addressId };

      await updateDoc(userDocRef, {
        savedAddresses: arrayUnion(addressToAdd)
      });
      setUserProfile(prev => ({
        ...prev!,
        savedAddresses: [...(prev?.savedAddresses || []), addressToAdd]
      }));
      setShowAddAddressModal(false);
      setEditingAddress(null);
      alert("Adresse erfolgreich hinzugefügt.");
    } catch (err: any) {
      console.error("Fehler beim Hinzufügen der Adresse:", err);
      setError(`Fehler beim Hinzufügen der Adresse: ${err.message || 'Unbekannter Fehler'}`);
    }
  };

  const handleUpdateAddress = async (updatedAddress: SavedAddress) => {
    if (!currentUser || !userProfile) return;
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const updatedAddresses = userProfile.savedAddresses?.map(addr =>
        addr.id === updatedAddress.id ? updatedAddress : addr
      ) || [];

      // Validierung auf eindeutigen Namen (außer bei der bearbeiteten Adresse selbst)
      if (updatedAddresses.some(addr => addr.name === updatedAddress.name && addr.id !== updatedAddress.id)) {
        alert("Eine andere Adresse mit diesem Namen existiert bereits. Bitte wählen Sie einen eindeutigen Namen.");
        return;
      }

      await updateDoc(userDocRef, {
        savedAddresses: updatedAddresses
      });
      setUserProfile(prev => ({ ...prev!, savedAddresses: updatedAddresses }));
      setShowAddAddressModal(false);
      setEditingAddress(null);
      alert("Adresse erfolgreich aktualisiert.");
    } catch (err: any) {
      console.error("Fehler beim Aktualisieren der Adresse:", err);
      setError(`Fehler beim Aktualisieren der Adresse: ${err.message || 'Unbekannter Fehler'}`);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!currentUser || !userProfile) return;
    if (confirm("Sind Sie sicher, dass Sie diese Adresse entfernen möchten?")) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const addressToDelete = userProfile.savedAddresses?.find(addr => addr.id === addressId);

        if (!addressToDelete) {
          console.warn("Versuch, nicht existierende Adresse zu löschen:", addressId);
          return;
        }

        await updateDoc(userDocRef, {
          savedAddresses: arrayRemove(addressToDelete)
        });
        // FIX: Filter savedAddresses, nicht savedPaymentMethods
        setUserProfile(prev => ({
          ...prev!,
          savedAddresses: prev!.savedAddresses?.filter(addr => addr.id !== addressId) || []
        }));
        alert("Adresse erfolgreich entfernt.");
      } catch (err: any) {
        console.error("Fehler beim Löschen der Adresse:", err);
        alert(`Fehler beim Löschen: ${err.message || 'Unbekannter Fehler'}`);
        setError(`Fehler beim Löschen der Adresse: ${err.message || 'Unbekannter Fehler'}`);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
      console.log("Benutzer erfolgreich abgemeldet.");
    } catch (err: any) {
      console.error("Fehler beim Abmelden:", err);
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


  if (loading || loadingOrders) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        Lade dein persönliches Dashboard...
      </div>
    );
  }

  if (error || ordersError) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4 text-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md" role="alert">
          <FiAlertCircle size={24} className="inline mr-2" />
          <strong className="font-bold">Fehler:</strong>
          <span className="block sm:inline ml-1">{error || ordersError}</span>
          <p className="mt-2 text-sm">Bitte laden Sie die Seite neu oder kontaktieren Sie den Support.</p>
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
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" /> Lade Benutzeroberfläche...
      </div>
    }>
      <>
        <Header /> {/* Das Menü wird hier eingefügt */}
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Header Bereich mit Logout und Neuem Auftrag Button */}
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={handleCreateNewOrder}
                className="flex items-center px-4 py-2 bg-[#14ad9f] text-white rounded-md hover:bg-[#129a8f] transition-colors"
              >
                <FiPlusCircle className="mr-2" /> Neuen Auftrag erstellen
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                <FiLogOut className="mr-2" /> Abmelden
              </button>
            </div>

            <WelcomeBox firstname={userProfile.firstname} />

            {/* HIER ÄNDERT SICH DAS LAYOUT: EINZELNER GRID-CONTAINER FÜR ALLE KARTEN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Abschnitt: Meine Aufträge */}
              <div className="bg-white shadow rounded-lg p-6 flex flex-col h-full min-h-[250px]">
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
                  <p className="text-gray-500 text-center py-8 flex-grow">Sie haben noch keine Aufträge erstellt.</p>
                ) : (
                  <ul className="space-y-4 flex-grow overflow-y-auto max-h-[min(300px, 40vh)]">
                    {userOrders.map((order) => (
                      <li key={order.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 border border-gray-200 rounded-md">
                        {/* Details Section */}
                        <div className="flex-grow">
                          <p className="font-medium text-lg text-gray-800">
                            {order.selectedSubcategory}
                            {order.providerName && order.providerName !== order.selectedSubcategory && (
                              <span className="text-sm font-normal text-gray-600 ml-1">({order.providerName})</span>
                            )}
                            {order.providerName && order.providerName === order.selectedSubcategory && (
                              <span className="text-sm font-normal text-gray-600 ml-1">(durch {order.providerName})</span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Am {order.jobDateFrom ? new Date(order.jobDateFrom).toLocaleDateString('de-DE') : 'Datum nicht angegeben'} um {order.jobTimePreference || 'Uhrzeit nicht angegeben'}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">Preis: {(order.totalPriceInCents / 100).toFixed(2)} EUR</p>
                        </div>

                        {/* Status Section */}
                        <div className="mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${order.status === 'bezahlt' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {/* HIER WIRD DER BUTTON ANGEPASST: NUR EIN BUTTON, DER BEDINGT IST */}
                {userOrders.length === 0 && (
                  <button
                    onClick={handleCreateNewOrder}
                    className="mt-4 flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors text-sm"
                  >
                    <FiPlusCircle className="mr-2" /> Neuen Auftrag erstellen
                  </button>
                )}
                {userOrders.length > 0 && (
                  <button
                    onClick={() => router.push(`/dashboard/user/${currentUser?.uid}/orders/${userOrders[0].id}`)}
                    className="mt-4 flex items-center justify-center w-full px-4 py-2 bg-[#14ad9f] text-white rounded-md hover:bg-[#129a8f] transition-colors text-sm"
                  >
                    <FiMessageSquare className="mr-2" /> Chat & Details (Neuester Auftrag)
                  </button>
                )}
              </div>

              {/* Profil Card */}
              <div className="bg-white shadow rounded-lg p-6 flex flex-col h-full min-h-[250px]">
                <ProfileShortcut />
              </div>

              {/* Support Card */}
              <div className="bg-white shadow rounded-lg p-6 flex flex-col h-full min-h-[250px]">
                <HelpCard onOpenSupportChat={handleOpenSupportChat} /> {/* NEU: Prop an HelpCard übergeben */}
              </div>

              {/* Abschnitt: Meine Zahlungsmethoden (NEU HIER PLATZIERT IM EIGENEN GRID) */}
              {/* Hier ist der äußere Container, der das 2-Spalten-Layout steuert */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 col-span-full">
                <div className="bg-white shadow rounded-lg p-6 flex flex-col h-full min-h-[250px]">
                  <h2 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
                    <FiCreditCard className="mr-2" /> Meine Zahlungsmethoden
                  </h2>
                  {userProfile.savedPaymentMethods && userProfile.savedPaymentMethods.length > 0 ? (
                    <ul className="space-y-4 flex-grow overflow-y-auto max-h-[min(200px, 25vh)]">
                      {userProfile.savedPaymentMethods.map((pm) => (
                        <li key={pm.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
                          <div className="flex items-center">
                            <span className="text-xl mr-3">💳</span>
                            <div>
                              <p className="font-medium">{pm.brand ? pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1) : 'Karte'} **** {pm.last4}</p>
                              {pm.exp_month && pm.exp_year && (
                                <p className="text-sm text-gray-500">Gültig bis {pm.exp_month}/{pm.exp_year % 100}</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemovePaymentMethod(pm.id)}
                            className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                            title="Zahlungsmethode entfernen"
                          >
                            <FiTrash2 />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 flex-grow text-center flex items-center justify-center">Noch keine Zahlungsmethoden gespeichert.</p>
                  )}
                  <button
                    onClick={handleOpenAddPaymentMethodModal}
                    className="mt-6 flex items-center px-4 py-2 bg-[#14ad9f] text-white rounded-md hover:bg-[#129a8f] transition-colors disabled:opacity-50"
                    disabled={loadingSetupIntent}
                  >
                    {loadingSetupIntent ? <FiLoader className="mr-2 animate-spin" /> : <FiPlus className="mr-2" />}
                    Zahlungsmethode hinzufügen
                  </button>
                  {setupIntentError && (
                    <p className="mt-4 text-red-500 text-sm">{setupIntentError}</p>
                  )}
                </div>

                {/* Abschnitt: Meine Adressen (NEU HIER PLATZIERT IM GLEICHEN GRID) */}
                <div className="bg-white shadow rounded-lg p-6 flex flex-col h-full min-h-[250px]">
                  <h2 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
                    <FiMapPin className="mr-2" /> Meine Adressen
                  </h2>
                  {userProfile.savedAddresses && userProfile.savedAddresses.length > 0 ? (
                    <ul className="space-y-4 flex-grow overflow-y-auto max-h-[min(200px, 25vh)]">
                      {userProfile.savedAddresses.map((address) => (
                        <li key={address.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
                          <div>
                            <p className="font-medium">{address.name} {address.isDefault && <span className="text-xs bg-gray-200 px-2 py-1 rounded-full ml-2">Standard</span>}</p>
                            <p className="text-sm text-gray-700">{address.line1} {address.line2}</p>
                            <p className="text-sm text-gray-700">{address.postal_code} {address.city}</p>
                            <p className="text-sm text-gray-700">{address.country}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setEditingAddress(address);
                                setShowAddAddressModal(true);
                              }}
                              className="text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                              title="Adresse bearbeiten"
                            >
                              <FiEdit />
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(address.id)}
                              className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                              title="Adresse entfernen"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 flex-grow text-center flex items-center justify-center">Noch keine Adressen gespeichert.</p>
                  )}
                  <button
                    onClick={() => {
                      setEditingAddress(null);
                      setShowAddAddressModal(true);
                    }}
                    className="mt-6 flex items-center px-4 py-2 bg-[#14ad9f] text-white rounded-md hover:bg-[#129a8f] transition-colors"
                  >
                    <FiPlus className="mr-2" /> Adresse hinzufügen
                  </button>
                </div>
              </div> {/* <-- HIER SCHLIESST DER FEHLENDE GRID-CONTAINER --> */}
            </div> {/* <-- SCHLIESSENDES TAG FÜR grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 */}
          </div> {/* Closes the div starting at line 299 */}
          <FooterSection />
        </main>
      </>

      {/* Modal für Neuen Auftrag erstellen */}
      {showCreateOrderModal && (
        <Modal onClose={() => setShowCreateOrderModal(false)} title="Neuen Auftrag erstellen">
          <CreateOrderModal
            onClose={() => setShowCreateOrderModal(false)}
            currentUser={currentUser!}
            userProfile={userProfile!}
          />
        </Modal>
      )}

      {/* Modal für Support Chat */}
      {showSupportChatModal && currentUser && (
        <Modal onClose={() => setShowSupportChatModal(false)} title="Support Chat">
          <SupportChatInterface
            currentUser={currentUser}
            onClose={() => setShowSupportChatModal(false)}
          // Hier könnten Sie eine chatId übergeben, falls Sie Chat-Sessions verwalten
          />
        </Modal>
      )}


      {showAddPaymentMethodModal && (
        <Modal onClose={() => setShowAddPaymentMethodModal(false)} title="Zahlungsmethode hinzufügen">
          {clientSecretForSetupIntent ? (
            <Elements stripe={stripePromise} options={{ clientSecret: clientSecretForSetupIntent }}>
              <AddPaymentMethodForm
                onSuccess={handlePaymentMethodAdded}
                onError={(msg) => setSetupIntentError(msg)}
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
        <Modal onClose={() => setShowAddAddressModal(false)} title={editingAddress ? "Adresse bearbeiten" : "Adresse hinzufügen"}>
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
    </Suspense>
  );
}
