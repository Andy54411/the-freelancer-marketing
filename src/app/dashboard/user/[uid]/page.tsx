'use client';

import React, { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, orderBy } from 'firebase/firestore';

import { db, app } from '../../../../firebase/clients';

import { WelcomeBox } from './components/WelcomeBox';
import { BookingOverview } from './components/BookingOverview';
import { ProfileShortcut } from './components/ProfileShortcut';
import { HelpCard } from './components/HelpCard';

import { FiLoader, FiCreditCard, FiMapPin, FiPlus, FiEdit, FiTrash2, FiAlertCircle, FiLogOut, FiMessageSquare, FiPlusCircle } from 'react-icons/fi';

import Modal from '@/app/dashboard/user/[uid]/components/Modal';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import AddPaymentMethodForm from './components/AddPaymentMethodForm';
import AddressForm from './components/AddressForm';
import { getFunctions, httpsCallable } from 'firebase/functions';

import CreateOrderModal from './components/CreateOrderModal';

// KORREKTUR: Interfaces aus ZENTRALER Typendatei importieren
import { SavedPaymentMethod, SavedAddress, UserProfileData, OrderListItem } from '@/types/types';


const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY');

const auth = getAuth(app);
const functionsInstance = getFunctions(app);

// Callable Functions (Typisierung entsprechend Ihrer callable_stripe.ts)
const createSetupIntentCallable = httpsCallable<{ firebaseUserId?: string }, { clientSecret: string }>(functionsInstance, 'createSetupIntent');
const getSavedPaymentMethodsCallable = httpsCallable<Record<string, never>, { savedPaymentMethods: SavedPaymentMethod[] }>(functionsInstance, 'getSavedPaymentMethods');
const detachPaymentMethodCallable = httpsCallable<{ paymentMethodId: string }, { success: boolean; message?: string }>(functionsInstance, 'detachPaymentMethod');


export default function UserDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const uid = typeof params.uid === 'string' ? params.uid : '';

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);

  const [showAddPaymentMethodModal, setShowAddPaymentMethodModal] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);


  const [clientSecretForSetupIntent, setClientSecretForSetupIntent] = useState<string | null>(null);
  const [loadingSetupIntent, setLoadingSetupIntent] = useState(false);
  const [setupIntentError, setSetupIntentError] = useState<string | null>(null);

  const [userOrders, setUserOrders] = useState<OrderListItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true); // Korrigiert
  const [ordersError, setOrdersError] = useState<string | null>(null);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.uid !== uid) {
          router.replace(`/dashboard/user/${user.uid}`);
          return;
        }
        setCurrentUser(user);
        setLoading(true);
        setError(null);

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
        router.replace(`/login?redirectTo=/dashboard/user/${uid}`);
      }
    });

    return () => unsubscribe();
  }, [uid, router]);


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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <BookingOverview />
            <ProfileShortcut />
            <HelpCard />
          </div>

          {/* Abschnitt: Meine Aufträge */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
              <FiMessageSquare className="mr-2" /> Meine Aufträge
            </h2>
            {loadingOrders ? (
              <div className="flex justify-center items-center py-8">
                <FiLoader className="animate-spin text-3xl text-[#14ad9f]" />
                <span className="ml-3 text-gray-600">Lade Aufträge...</span>
              </div>
            ) : ordersError ? (
              <div className="text-center p-4 text-red-600">
                <FiAlertCircle className="mr-2 h-5 w-5 inline-block" /> {ordersError}
              </div>
            ) : userOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Sie haben noch keine Aufträge erstellt. Klicken Sie auf "Neuen Auftrag erstellen", um zu beginnen!</p>
            ) : (
              <ul className="space-y-4">
                {userOrders.map((order) => (
                  <li key={order.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border border-gray-200 rounded-md">
                    <div className="flex-1 mb-2 md:mb-0">
                      <p className="font-medium text-lg text-gray-800">{order.selectedSubcategory}</p>
                      <p className="text-sm text-gray-600">
                        Am {order.jobDateFrom} um {order.jobTimePreference || 'Uhrzeit nicht angegeben'}
                      </p>
                      <p className="text-sm text-gray-600">Preis: {(order.totalPriceInCents / 100).toFixed(2)} EUR</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${order.status === 'bezahlt' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      <button
                        onClick={() => router.push(`/dashboard/user/${currentUser?.uid}/orders/${order.id}`)}
                        className="px-4 py-2 bg-[#14ad9f] text-white rounded-md hover:bg-[#129a8f] transition-colors flex items-center gap-1 text-sm"
                      >
                        <FiMessageSquare size={16} /> Chat & Details
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Abschnitt: Meine Zahlungsmethoden */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
              <FiCreditCard className="mr-2" /> Meine Zahlungsmethoden
            </h2>
            {userProfile.savedPaymentMethods && userProfile.savedPaymentMethods.length > 0 ? (
              <ul className="space-y-4">
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
              <p className="text-gray-500">Noch keine Zahlungsmethoden gespeichert.</p>
            )}
            <button
              onClick={handleOpenAddPaymentMethodModal}
              className="mt-6 flex items-center px-4 py-2 bg-[#14ad9f] text-white rounded-md hover:bg-[#129a8f] transition-colors disabled:opacity-50"
              disabled={loadingSetupIntent}
            >
              {loadingSetupIntent ? <FiLoader className="animate-spin mr-2" /> : <FiPlus className="mr-2" />}
              Zahlungsmethode hinzufügen
            </button>
            {setupIntentError && (
              <p className="mt-4 text-red-500 text-sm">{setupIntentError}</p>
            )}
          </div>

          {/* Abschnitt: Meine Adressen */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
              <FiMapPin className="mr-2" /> Meine Adressen
            </h2>
            {userProfile.savedAddresses && userProfile.savedAddresses.length > 0 ? (
              <ul className="space-y-4">
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
              <p className="text-gray-500">Noch keine Adressen gespeichert.</p>
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
        </div>
      </main>

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
            initialData={editingAddress ?? undefined} // KORREKTUR: Nullish Coalescing Operator verwenden
            onChange={editingAddress ? handleUpdateAddress : handleAddAddress} // KORREKTUR: 'onSave' zu 'onChange' geändert
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