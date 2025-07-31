// src/app/dashboard/company/[uid]/orders/[orderId]/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { db, functions, auth } from '@/firebase/clients';
import { httpsCallable } from 'firebase/functions';

// Icons für UI
import {
  Loader2 as FiLoader,
  AlertCircle as FiAlertCircle,
  MessageSquare as FiMessageSquare,
  ArrowLeft as FiArrowLeft,
  AlertTriangle as FiAlertTriangle,
  Slash as FiSlash,
  Clock as FiClock,
} from 'lucide-react';

// Komponenten
import UserInfoCard from '@/components/UserInfoCard';
import TimeTrackingManager from '@/components/TimeTrackingManager';
// Die Chat-Komponente
import ChatComponent from '@/components/ChatComponent';

interface ParticipantDetails {
  id: string;
  name: string;
  avatarUrl: string | null;
}

// Interface für ein Auftragsdokument
interface OrderData {
  id: string;
  serviceTitle: string;
  // Provider-Informationen
  providerId: string;
  providerName: string;
  providerAvatarUrl?: string | null;
  // Kunden-Informationen
  customerId: string;
  customerName: string;
  customerAvatarUrl?: string | null;
  orderDate?: { _seconds: number; _nanoseconds: number } | string;
  priceInCents: number;
  status: string;
  selectedCategory?: string;
  selectedSubcategory?: string;
  jobTotalCalculatedHours?: number;
  jobDurationString?: string | number; // Stunden pro Tag
  beschreibung?: string;
  jobDateFrom?: string;
  jobDateTo?: string;
  jobTimePreference?: string;
}

export default function CompanyOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = typeof params?.orderId === 'string' ? params.orderId : '';
  const companyUid = typeof params?.uid === 'string' ? params.uid : '';

  const { user: currentUser, loading: authLoading } = useAuth(); // KORREKTUR: 'user' aus dem AuthContext verwenden

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'provider' | 'customer' | null>(null); // Track user role for this order

  useEffect(() => {
    // Wait until the authentication process is complete.
    if (authLoading) {
      return;
    }

    if (!currentUser) {
      // If auth is done and there's no user, redirect.
      const currentPath = window.location.pathname + window.location.search;
      router.replace(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (!orderId || !companyUid) {
      setError('Auftrags- oder Firmen-ID in der URL fehlt.');
      setLoadingOrder(false);
      return;
    }

    // Security check: Ensure the logged-in user is the one whose dashboard is being viewed.
    if (currentUser.uid !== companyUid) {
      setError('Zugriff verweigert. Sie sind nicht berechtigt, diese Seite anzuzeigen.');
      setLoadingOrder(false);
      return;
    }

    const fetchOrder = async () => {
      setLoadingOrder(true);
      setError(null);
      let orderDataFromDb;
      try {
        const orderDocRef = doc(db, 'auftraege', orderId);
        const orderDocSnap = await getDoc(orderDocRef);

        if (!orderDocSnap.exists()) {
          setError('Auftrag nicht gefunden.');
          setLoadingOrder(false);
          return;
        }
        orderDataFromDb = orderDocSnap.data();
      } catch (err: any) {
        // --- NEU: Spezifische Fehlerbehandlung für 'permission-denied' ---
        // Dieser Fehler tritt auf, wenn die Firestore-Regeln den Zugriff verweigern.
        if (err.code === 'permission-denied') {
          console.error(
            'Fehler beim Laden des Auftrags: Zugriff verweigert. Dies deutet auf inkonsistente Daten hin (Anbieter-ID im Auftrag stimmt nicht mit dem angemeldeten Benutzer überein).'
          );
          setError(
            'Zugriff auf diesen Auftrag verweigert. Die Auftragsdaten sind möglicherweise einem anderen Anbieter zugeordnet.'
          );
          setLoadingOrder(false);
          return;
        }

        console.error('Fehler beim Laden des Auftrags:', err);
        if (err.code === 'permission-denied') {
          setError(
            'Zugriff auf diesen Auftrag verweigert. Dies liegt wahrscheinlich an inkonsistenten Auftragsdaten (z.B. eine fehlende Anbieter-ID). Bitte kontaktieren Sie den Support.'
          );
        } else {
          setError(`Fehler beim Laden des Auftrags: ${err.message || 'Unbekannter Fehler'}`);
        }
        setLoadingOrder(false);
        return;
      }

      // --- Erweiterte Validierung für B2B-Aufträge ---
      // Ein Unternehmen kann sowohl Kunde als auch Anbieter sein
      const isProvider = orderDataFromDb.selectedAnbieterId === companyUid;
      const isCustomer = orderDataFromDb.customerFirebaseUid === companyUid;

      if (!isProvider && !isCustomer) {
        setError(
          `Zugriff verweigert: Dieser Auftrag (${orderId}) gehört weder Ihnen als Anbieter (${orderDataFromDb.selectedAnbieterId}) noch als Kunde (${orderDataFromDb.customerFirebaseUid}) zu. Ihre ID: ${companyUid}.`
        );
        setLoadingOrder(false);
        return;
      }

      // Setze die Rolle für die UI
      setUserRole(isProvider ? 'provider' : 'customer');

      console.log('Raw Firestore data for orderId', orderId, ':', orderDataFromDb);
      console.log('Raw selectedCategory:', orderDataFromDb.selectedCategory);
      console.log('Raw selectedSubcategory:', orderDataFromDb.selectedSubcategory);
      console.log('Raw jobTimePreference:', orderDataFromDb.jobTimePreference);

      // Step 2: Fetch participant details with its own error handling
      // KORREKTUR: Verwende die neue, sichere Cloud Function
      try {
        const getOrderParticipantDetails = httpsCallable<
          { orderId: string },
          { provider: ParticipantDetails; customer: ParticipantDetails }
        >(functions, 'getOrderParticipantDetails');

        const result = await getOrderParticipantDetails({ orderId });
        const { provider: providerDetails, customer: customerDetails } = result.data;

        const orderData: OrderData = {
          id: orderId,
          serviceTitle: orderDataFromDb.selectedSubcategory || 'Dienstleistung',
          providerId: orderDataFromDb.selectedAnbieterId,
          providerName: providerDetails.name, // Name aus der Cloud Function
          providerAvatarUrl: providerDetails.avatarUrl,
          customerId: orderDataFromDb.kundeId,
          customerName: customerDetails.name, // Name aus der Cloud Function
          customerAvatarUrl: customerDetails.avatarUrl,
          orderDate: orderDataFromDb.paidAt || orderDataFromDb.createdAt,
          priceInCents: orderDataFromDb.jobCalculatedPriceInCents || 0,
          status: orderDataFromDb.status || 'unbekannt',
          selectedCategory: orderDataFromDb.selectedCategory,
          selectedSubcategory: orderDataFromDb.selectedSubcategory,
          jobTotalCalculatedHours: orderDataFromDb.jobTotalCalculatedHours,
          beschreibung: orderDataFromDb.description,
          jobDateFrom: orderDataFromDb.jobDateFrom,
          jobDateTo: orderDataFromDb.jobDateTo,
          jobTimePreference: orderDataFromDb.jobTimePreference,
        };

        console.log('Constructed orderData object:', orderData);
        setOrder(orderData);
      } catch (err: any) {
        console.error('Fehler beim Laden der Teilnehmerdetails:', err);
        if (err.code === 'permission-denied') {
          setError(
            'Zugriff auf Teilnehmerdetails verweigert. Dies kann an fehlenden Berechtigungen (Custom Claims) für Ihr Firmenkonto liegen. Bitte kontaktieren Sie den Support.'
          );
        } else {
          setError(
            `Fehler beim Laden der Teilnehmerdetails: ${err.message || 'Unbekannter Fehler'}`
          );
        }
      } finally {
        setLoadingOrder(false);
      }
    };

    fetchOrder();
  }, [authLoading, currentUser, orderId, router, companyUid]);

  const overallLoading = loadingOrder || authLoading; // Gesamt-Ladezustand

  const handleAcceptOrder = async () => {
    if (!order) return;
    setIsActionLoading(true);
    setActionError(null);

    try {
      // Debug: Prüfe Auth Status
      console.log('Debug: Current User:', currentUser);
      console.log('Debug: Auth Loading:', authLoading);

      if (!currentUser) {
        throw new Error('Benutzer ist nicht angemeldet');
      }

      // Debug: Hole ID Token für HTTP Request
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error('Firebase currentUser ist null');
      }

      const idToken = await firebaseUser.getIdToken();
      console.log('Debug: ID Token (erste 50 Zeichen):', idToken.substring(0, 50) + '...');

      // HTTP Request zur acceptOrderHTTP Function
      const response = await fetch(
        'https://europe-west1-tilvo-f142f.cloudfunctions.net/acceptOrderHTTP',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ orderId: order.id }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'HTTP Error');
      }

      const result = await response.json();
      console.log('Accept Order Success:', result);

      setOrder(prev => (prev ? { ...prev, status: 'AKTIV' } : null));
    } catch (err: any) {
      console.error('Fehler beim Annehmen des Auftrags:', err);
      setActionError(err.message || 'Fehler beim Annehmen des Auftrags.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!order) return;
    const reason = window.prompt(
      'Bitte geben Sie einen Grund für die Ablehnung an (wird dem Kunden mitgeteilt):'
    );
    if (!reason || reason.trim() === '') {
      return; // User cancelled or entered no reason
    }
    setIsActionLoading(true);
    setActionError(null);
    try {
      const rejectOrderCallable = httpsCallable(functions, 'rejectOrder');
      await rejectOrderCallable({ orderId: order.id, reason: reason.trim() });
      setOrder(prev => (prev ? { ...prev, status: 'abgelehnt_vom_anbieter' } : null));
    } catch (err: any) {
      console.error('Fehler beim Ablehnen des Auftrags:', err);
      let message = err.message || 'Fehler beim Ablehnen des Auftrags.';
      if (err.details) {
        message += ` Details: ${JSON.stringify(err.details)}`;
      }
      setActionError(message);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (overallLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        {authLoading ? 'Authentifizierung wird geprüft...' : 'Lade Auftragsdetails...'}
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
          <p className="mt-2 text-sm">
            Bitte überprüfen Sie die URL oder kontaktieren Sie den Support.
          </p>
        </div>
      </div>
    );
  }

  if (!order || !currentUser) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FiAlertCircle className="text-4xl text-gray-400 mr-3" />
        Fehler: Auftrag konnte nicht angezeigt werden oder Sie sind nicht angemeldet.
      </div>
    );
  }

  const isViewerProvider = currentUser.uid === order.providerId;
  const cardUser = isViewerProvider
    ? {
        id: order.customerId,
        name: order.customerName,
        avatarUrl: order.customerAvatarUrl,
        role: 'customer' as const,
      }
    : {
        id: order.providerId,
        name: order.providerName,
        avatarUrl: order.providerAvatarUrl,
        role: 'provider' as const,
      };

  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" /> Lade
          Benutzeroberfläche...
        </div>
      }
    >
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.back()}
            className="text-[#14ad9f] hover:underline flex items-center gap-2 mb-4"
          >
            <FiArrowLeft /> Zurück zur Übersicht
          </button>

          <h1 className="text-3xl font-semibold text-gray-800 mb-6">Auftrag #{orderId}</h1>

          {/* Layout mit Sidebar */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Hauptinhalt - Links */}
            <div className="flex-1 space-y-6">
              {/* Auftragsdetails */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">Details zum Auftrag</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                  <p>
                    <strong>Status:</strong>{' '}
                    <span
                      className={`font-semibold ${order.status === 'bezahlt' || order.status === 'zahlung_erhalten_clearing' ? 'text-green-600' : 'text-yellow-600'}`}
                    >
                      {order.status?.replace(/_/g, ' ').charAt(0).toUpperCase() +
                        order.status?.replace(/_/g, ' ').slice(1)}
                    </span>
                  </p>
                  <p>
                    <strong>Kategorie:</strong> {order.selectedCategory || 'N/A'} /{' '}
                    {order.selectedSubcategory || 'N/A'}
                  </p>
                  <p>
                    <strong>Dauer:</strong>{' '}
                    {(() => {
                      // Berechne korrekte Stunden basierend auf Datum
                      if (
                        order.jobDateFrom &&
                        order.jobDateTo &&
                        order.jobDateFrom !== order.jobDateTo
                      ) {
                        const startDate = new Date(order.jobDateFrom);
                        const endDate = new Date(order.jobDateTo);
                        const totalDays =
                          Math.ceil(
                            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                          ) + 1;
                        const hoursPerDay = parseFloat(String(order.jobDurationString || 8));
                        const totalHours = totalDays * hoursPerDay;
                        return `${totalDays} Tag${totalDays !== 1 ? 'e' : ''} (${totalHours} Stunden gesamt)`;
                      } else {
                        const hours = order.jobTotalCalculatedHours || 'N/A';
                        return `${hours} Stunden`;
                      }
                    })()}
                  </p>
                  <p>
                    <strong>Gesamtpreis:</strong> {(order.priceInCents / 100).toFixed(2)} EUR
                  </p>
                  <p>
                    <strong>Datum:</strong> {order.jobDateFrom || 'N/A'}{' '}
                    {order.jobDateTo && order.jobDateTo !== order.jobDateFrom
                      ? `- ${order.jobDateTo}`
                      : ''}
                  </p>
                  <p>
                    <strong>Uhrzeit:</strong> {order.jobTimePreference || 'Nicht angegeben'}
                  </p>
                  <p className="col-span-full">
                    <strong>Beschreibung:</strong>{' '}
                    {order.beschreibung || 'Keine Beschreibung vorhanden.'}
                  </p>
                </div>
              </div>

              {/* Time Tracking für aktive Aufträge */}
              {order.status === 'AKTIV' && isViewerProvider && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
                    <FiClock className="mr-2" /> Zeiterfassung
                  </h2>
                  <TimeTrackingManager
                    orderId={orderId}
                    customerName={order.customerName}
                    originalPlannedHours={(() => {
                      // Berechne korrekte Stunden basierend auf Datum
                      if (
                        order.jobDateFrom &&
                        order.jobDateTo &&
                        order.jobDateFrom !== order.jobDateTo
                      ) {
                        const startDate = new Date(order.jobDateFrom);
                        const endDate = new Date(order.jobDateTo);
                        const totalDays =
                          Math.ceil(
                            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                          ) + 1;
                        const hoursPerDay = parseFloat(String(order.jobDurationString || 8));
                        return totalDays * hoursPerDay;
                      } else {
                        return order.jobTotalCalculatedHours || 8;
                      }
                    })()}
                    hourlyRate={(() => {
                      // Berechne korrekten Stundensatz
                      const totalHours = (() => {
                        if (
                          order.jobDateFrom &&
                          order.jobDateTo &&
                          order.jobDateFrom !== order.jobDateTo
                        ) {
                          const startDate = new Date(order.jobDateFrom);
                          const endDate = new Date(order.jobDateTo);
                          const totalDays =
                            Math.ceil(
                              (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                            ) + 1;
                          const hoursPerDay = parseFloat(String(order.jobDurationString || 8));
                          return totalDays * hoursPerDay;
                        } else {
                          return order.jobTotalCalculatedHours || 8;
                        }
                      })();
                      return totalHours > 0 ? order.priceInCents / 100 / totalHours : 50;
                    })()}
                    onTimeSubmitted={() => {
                      // Optional: Reload order data or show success message
                      console.log('Time tracking updated');
                    }}
                  />
                </div>
              )}

              {/* Aktions-Box für den Anbieter */}
              {order.status === 'zahlung_erhalten_clearing' && isViewerProvider && (
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <FiAlertTriangle className="h-6 w-6 text-[#14ad9f]" aria-hidden="true" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">Aktion erforderlich</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Dieser Auftrag wurde vom Kunden bezahlt. Bitte nehmen Sie den Auftrag an, um
                        zu beginnen, oder lehnen Sie ihn ab, falls Sie ihn nicht ausführen können.
                        Bei Ablehnung wird dem Kunden der Betrag vollständig zurückerstattet.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-4">
                    <button
                      onClick={handleAcceptOrder}
                      disabled={isActionLoading}
                      className="inline-flex items-center justify-center rounded-md border border-transparent bg-[#14ad9f] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#129a8f] focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isActionLoading ? 'Wird angenommen...' : 'Auftrag annehmen'}
                    </button>
                    <button
                      onClick={handleRejectOrder}
                      disabled={isActionLoading}
                      className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isActionLoading ? '...' : 'Auftrag ablehnen'}
                    </button>
                  </div>
                  {actionError && <p className="text-red-600 mt-2 text-sm">{actionError}</p>}
                </div>
              )}

              {/* Chat-Bereich */}
              <div className="bg-white shadow rounded-lg p-6 h-[600px] flex flex-col">
                <h2 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
                  <FiMessageSquare className="mr-2" /> Chat zum Auftrag
                </h2>
                {['abgelehnt_vom_anbieter', 'STORNIERT', 'zahlung_erhalten_clearing'].includes(
                  order.status
                ) ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center bg-gray-50 rounded-lg p-4">
                    <FiSlash className="text-4xl text-gray-400 mb-3" />
                    <h3 className="text-lg font-semibold text-gray-700">Chat deaktiviert</h3>
                    <p className="text-gray-500 text-sm">
                      {order.status === 'zahlung_erhalten_clearing'
                        ? 'Bitte nehmen Sie den Auftrag zuerst an, um den Chat zu aktivieren.'
                        : 'Für diesen Auftrag ist der Chat nicht verfügbar.'}
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0">
                    <ChatComponent
                      orderId={orderId}
                      participants={{ customerId: order.customerId, providerId: order.providerId }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Rechte Sidebar - UserInfoCard */}
            <div className="w-full lg:w-80 lg:flex-shrink-0">
              <div className="lg:sticky lg:top-6">
                <UserInfoCard
                  userId={cardUser.id}
                  userName={cardUser.name}
                  userAvatarUrl={cardUser.avatarUrl}
                  userRole={cardUser.role}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </Suspense>
  );
}
