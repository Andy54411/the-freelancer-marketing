// src/app/dashboard/company/[uid]/orders/[orderId]/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/contexts/AuthContext';
import { db, auth, functions } from '@/firebase/clients';

// Icons für UI
import {
  Loader2 as FiLoader,
  AlertCircle as FiAlertCircle,
  MessageSquare as FiMessageSquare,
  ArrowLeft as FiArrowLeft,
  AlertTriangle as FiAlertTriangle,
  Slash as FiSlash,
  Clock as FiClock,
  CheckCircle as FiCheckCircle,
} from 'lucide-react';

// Komponenten
import UserInfoCard from '@/components/UserInfoCard';
import TimeTrackingManager from '@/components/TimeTrackingManager';
// Die Chat-Komponente
import ChatComponent from '@/components/ChatComponent';
// Rechnungsbereich
import OrderInvoiceSection from '@/components/orders/OrderInvoiceSection';
// Kunden-Rechnungsdaten
import CustomerBillingInfo from '@/components/orders/CustomerBillingInfo';
// Stunden-Übersicht Komponente
import HoursBillingOverview from '@/components/HoursBillingOverview';
// Escrow Payment-Komponente
import { EscrowPaymentComponent } from '@/components/EscrowPaymentComponent';
// Provider Storno-Warnung
import ProviderStornoWarning from '@/components/storno/ProviderStornoWarning';
// Complete Order Modal
import CompleteOrderModal from '@/components/modals/CompleteOrderModal';

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
  orderDate?: string; // ISO string nach Konvertierung
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
  timeTracking?: {
    originalPlannedHours?: number;
    timeEntries?: Array<{
      id: string;
      userId: string;
      userName: string;
      startTime: string;
      endTime: string;
      duration: number;
      description: string;
      category: 'original' | 'additional';
      status: 'pending' | 'approved' | 'rejected';
      submittedAt: string;
      reviewedAt?: string;
      reviewedBy?: string;
    }>;
  };
}

export default function CompanyOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = typeof params?.orderId === 'string' ? params.orderId : '';
  const companyUid = typeof params?.uid === 'string' ? params.uid : '';

  const { user: currentUser, loading: authLoading } = useAuth(); // KORREKTUR: 'user' aus dem AuthContext verwenden

  const [order, setOrder] = useState<OrderData | null>(null);
  const [_timeTrackingData, _setTimeTrackingData] = useState<unknown>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [_userRole, setUserRole] = useState<'provider' | 'customer' | null>(null); // Track user role for this order - currently unused

  // Payment Modal States - für HoursBillingOverview (Escrow-System)
  const [showInlinePayment, setShowInlinePayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [_paymentHours, setPaymentHours] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Complete Order Modal State
  const [showCompleteOrderModal, setShowCompleteOrderModal] = useState(false);

  useEffect(() => {
    // Wait until the authentication process is complete.
    if (authLoading) {
      return;
    }

    if (!currentUser) {
      // If auth is done and there's no user, redirect.
      const currentPath = window.location.pathname + window.location.search;
      router.replace(`/?redirectTo=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (!orderId || !companyUid) {
      setError('Auftrags- oder Firmen-ID in der URL fehlt.');
      setLoadingOrder(false);
      return;
    }

    // Security check: Ensure the logged-in user is the owner OR an employee of this company.
    const isOwner = currentUser.uid === companyUid;
    const isEmployee = currentUser.user_type === 'mitarbeiter' && currentUser.companyId === companyUid;
    
    if (!isOwner && !isEmployee) {
      setError('Zugriff verweigert. Sie sind nicht berechtigt, diese Seite anzuzeigen.');
      setLoadingOrder(false);
      return;
    }

    // REALTIME: Setup Firestore onSnapshot listener
    const orderDocRef = doc(db, 'auftraege', orderId);

    const unsubscribe = onSnapshot(
      orderDocRef,
      async docSnapshot => {
        try {
          setLoadingOrder(true);
          setError(null);

          if (!docSnapshot.exists()) {
            setError('Auftrag nicht gefunden.');
            setLoadingOrder(false);
            return;
          }

          const orderDataFromDb = docSnapshot.data();

          // --- Erweiterte Validierung für B2B-Aufträge ---
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

          // Fetch participant details via API (ersetzt gelöschte Cloud Function)
          const token = await auth.currentUser?.getIdToken();
          const participantsResponse = await fetch('/api/getorderparticipantdetails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ orderId }),
          });

          if (!participantsResponse.ok) {
            throw new Error(`Teilnehmer-API Fehler: ${participantsResponse.status}`);
          }

          const { provider: providerDetails, customer: customerDetails } = await participantsResponse.json();

          const orderData: OrderData = {
            id: orderId,
            serviceTitle: orderDataFromDb.selectedSubcategory || 'Dienstleistung',
            providerId: orderDataFromDb.selectedAnbieterId,
            providerName: providerDetails.name,
            providerAvatarUrl: providerDetails.avatarUrl,
            customerId: orderDataFromDb.customerFirebaseUid || orderDataFromDb.kundeId,
            customerName: customerDetails.name,
            customerAvatarUrl: customerDetails.avatarUrl,
            orderDate: (() => {
              const dateField =
                orderDataFromDb.paidAt ||
                orderDataFromDb.createdAt ||
                orderDataFromDb.lastUpdated ||
                orderDataFromDb.lastUpdatedAt;

              if (!dateField) return undefined;

              if (dateField && typeof dateField === 'object' && 'toDate' in dateField) {
                return dateField.toDate().toISOString();
              }

              if (dateField && typeof dateField === 'object' && '_seconds' in dateField) {
                return new Date(dateField._seconds * 1000).toISOString();
              }

              if (typeof dateField === 'string') {
                return dateField;
              }

              return undefined;
            })(),
            priceInCents:
              orderDataFromDb.jobCalculatedPriceInCents ||
              orderDataFromDb.totalAmountPaidByBuyer ||
              0,
            status: orderDataFromDb.status || 'unbekannt',
            selectedCategory: orderDataFromDb.selectedCategory,
            selectedSubcategory: orderDataFromDb.selectedSubcategory,
            jobTotalCalculatedHours:
              orderDataFromDb.jobTotalCalculatedHours ||
              (() => {
                const priceInEur =
                  (orderDataFromDb.jobCalculatedPriceInCents ||
                    orderDataFromDb.totalAmountPaidByBuyer ||
                    0) / 100;
                const standardHourlyRate = 42;
                return Math.round(priceInEur / standardHourlyRate);
              })(),
            jobDurationString: orderDataFromDb.jobDurationString || orderDataFromDb.auftragsDauer,
            beschreibung: orderDataFromDb.beschreibung || orderDataFromDb.description || orderDataFromDb.jobDescription,
            jobDateFrom: orderDataFromDb.jobDateFrom,
            jobDateTo: orderDataFromDb.jobDateTo,
            jobTimePreference: orderDataFromDb.jobTimePreference,
          };

          setOrder(orderData);
        } catch (err: unknown) {
          const error = err as { code?: string; message?: string };
          if (error.code === 'permission-denied') {
            setError(
              'Zugriff auf Teilnehmerdetails verweigert. Dies kann an fehlenden Berechtigungen (Custom Claims) für Ihr Firmenkonto liegen. Bitte kontaktieren Sie den Support.'
            );
          } else {
            setError(
              `Fehler beim Laden der Teilnehmerdetails: ${error.message || 'Unbekannter Fehler'}`
            );
          }
        } finally {
          setLoadingOrder(false);
        }
      },
      error => {
        if (error.code === 'permission-denied') {
          setError(
            'Zugriff auf diesen Auftrag verweigert. Die Auftragsdaten sind möglicherweise einem anderen Anbieter zugeordnet.'
          );
        } else {
          setError(`Verbindungsfehler: ${error.message}`);
        }
        setLoadingOrder(false);
      }
    );

    // Cleanup function
    return () => {
      unsubscribe();
    };
  }, [authLoading, currentUser, orderId, router, companyUid]);

  const overallLoading = loadingOrder || authLoading; // Gesamt-Ladezustand

  const handleAcceptOrder = async () => {
    if (!order) return;
    setIsActionLoading(true);
    setActionError(null);

    try {
      // Debug: Prüfe Auth Status

      if (!currentUser) {
        throw new Error('Benutzer ist nicht angemeldet');
      }

      // Debug: Hole ID Token für HTTP Request
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error('Firebase currentUser ist null');
      }

      const idToken = await firebaseUser.getIdToken();

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
        const errorData = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(errorData.error || 'HTTP Error');
      }

      const _result = await response.json();

      setOrder(prev => (prev ? { ...prev, status: 'AKTIV' } : null));
    } catch (err: unknown) {
      const error = err as { message?: string };
      // Bessere Error-Messages für verschiedene Fehlertypen
      let errorMessage = 'Fehler beim Annehmen des Auftrags.';
      if (error.message?.includes('Failed to fetch')) {
        errorMessage =
          'Netzwerkfehler: Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.';
      } else if (error.message?.includes('HTTP 401')) {
        errorMessage = 'Autorisierungsfehler: Bitte loggen Sie sich erneut ein.';
      } else if (error.message?.includes('HTTP 404')) {
        errorMessage = 'Service nicht verfügbar: Bitte kontaktieren Sie den Support.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setActionError(errorMessage);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!order) return;

    // Öffne das Modal statt window.confirm
    setShowCompleteOrderModal(true);
  };

  const confirmCompleteOrder = async () => {
    if (!order) return;

    setIsActionLoading(true);
    setActionError(null);

    try {
      if (!currentUser) {
        throw new Error('Benutzer ist nicht angemeldet');
      }

      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error('Firebase currentUser ist null');
      }

      const idToken = await firebaseUser.getIdToken();

      const response = await fetch(
        'https://europe-west1-tilvo-f142f.cloudfunctions.net/completeOrderHTTP',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            orderId: order.id,
            providerId: currentUser.uid,
            completionNote: 'Auftrag wurde vom Anbieter als abgeschlossen markiert.',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'HTTP Error beim Abschließen des Auftrags');
      }

      const _result = await response.json();

      // Update local state
      setOrder(prev => (prev ? { ...prev, status: 'PROVIDER_COMPLETED' } : null));
      setShowCompleteOrderModal(false);

      // Success message
      setSuccessMessage(
        'Auftrag als erledigt markiert! Der Kunde wurde benachrichtigt und muss jetzt den Abschluss bestätigen und bewerten. Das Geld wird nach der Kundenbestätigung freigegeben.'
      );
    } catch (err: unknown) {
      const error = err as { message?: string };
      setActionError(error.message || 'Fehler beim Abschließen des Auftrags.');
      setShowCompleteOrderModal(false);
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
    } catch (err: unknown) {
      const error = err as { message?: string; details?: unknown };
      let message = error.message || 'Fehler beim Ablehnen des Auftrags.';
      if (error.details) {
        message += ` Details: ${JSON.stringify(error.details)}`;
      }
      setActionError(message);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Payment Modal Handler - für HoursBillingOverview (Escrow-System)
  const handleOpenPayment = async () => {
    if (!orderId) return;

    try {
      // Import TimeTracker dynamisch
      const { TimeTracker } = await import('@/lib/timeTracker');

      // Hole Order Details für Payment-Berechnung
      const orderDetails = await TimeTracker.getOrderDetails(orderId);
      
      // Berechne echte Payment Hours aus OrderDetails
      const paymentHours =
        orderDetails?.timeTracking?.timeEntries
          ?.filter((e: { category?: string; status?: string }) => {
            // Alle Stunden die genehmigt sind aber noch bezahlt werden müssen
            return (
              e.category === 'additional' &&
              (e.status === 'customer_approved' || e.status === 'billing_pending')
            );
          })
          ?.reduce((sum: number, e: { hours?: number }) => sum + (e.hours || 0), 0) || 0;

      // Berechne den Betrag (Stunden * Stundensatz)
      const hourlyRate = order?.priceInCents ? Math.round(order.priceInCents / (order.jobTotalCalculatedHours || 1)) : 0;
      const calculatedAmount = paymentHours * hourlyRate;

      // Setze Payment-Daten für Escrow
      setPaymentAmount(calculatedAmount > 0 ? calculatedAmount : order?.priceInCents || 0);
      setPaymentHours(paymentHours);
      setShowInlinePayment(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      alert(`Fehler beim Erstellen der Zahlung: ${errorMessage}`);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowInlinePayment(false);

    // Success-Nachricht anzeigen
    setSuccessMessage('Zahlung erfolgreich! Die Daten werden aktualisiert...');

    // Warte kurz, damit Webhooks Zeit haben die Datenbank zu aktualisieren
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      // Order data neu laden nach erfolgreichem Payment
      window.location.reload();
    } catch {
      setSuccessMessage(
        'Zahlung erfolgreich, aber Daten-Update fehlgeschlagen. Seite wird neu geladen...'
      );

      // Fallback: Seite nach 3 Sekunden neu laden
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
  };

  const handlePaymentCancel = () => {
    setShowInlinePayment(false);
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

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
              <div className="flex items-center">
                <FiCheckCircle className="mr-2" />
                {successMessage}
              </div>
            </div>
          )}

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
                      className={`font-semibold ${
                        order.status === 'ABGESCHLOSSEN'
                          ? 'text-green-600'
                          : order.status === 'bezahlt' ||
                              order.status === 'zahlung_erhalten_clearing' ||
                              order.status === 'AKTIV'
                            ? 'text-blue-600'
                            : 'text-yellow-600'
                      }`}
                    >
                      {(() => {
                        switch (order.status) {
                          case 'ABGESCHLOSSEN':
                            return '✅ ABGESCHLOSSEN';
                          case 'AKTIV':
                            return '🔄 AKTIV';
                          case 'zahlung_erhalten_clearing':
                            return '💰 ZAHLUNG ERHALTEN';
                          case 'bezahlt':
                            return '✅ BEZAHLT';
                          default:
                            return (
                              order.status?.replace(/_/g, ' ').charAt(0).toUpperCase() +
                              order.status?.replace(/_/g, ' ').slice(1)
                            );
                        }
                      })()}
                    </span>
                  </p>
                  <p>
                    <strong>Kategorie:</strong> {order.selectedCategory || 'N/A'} /{' '}
                    {order.selectedSubcategory || 'N/A'}
                  </p>
                  <p>
                    <strong>Dauer:</strong>{' '}
                    {(() => {
                      // FESTANGEBOT: Verwende die gleiche Datenquelle wie HoursBillingOverview
                      // Da es ein Festangebot ist, sind es die ursprünglich geplanten Stunden

                      // Mehrere Tage?
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
                      }

                      // Festangebot: jobDurationString ist meist der ursprüngliche Buchungswert
                      if (order.jobDurationString && order.jobDurationString !== '0') {
                        return `${order.jobDurationString} Stunden`;
                      }

                      // Als allerletzter Fallback: Standard 8h für Festangebote
                      return '8 Stunden (Festangebot)';
                    })()}
                  </p>
                  <p>
                    <strong>Gesamtpreis:</strong> {(order.priceInCents / 100).toFixed(2)} EUR
                  </p>
                  <p>
                    <strong>Erstellt am:</strong>{' '}
                    {(() => {
                      if (order.orderDate) {
                        // orderDate ist jetzt bereits ISO string nach Konvertierung
                        const date = new Date(order.orderDate);
                        return date.toLocaleDateString('de-DE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                      }
                      return 'Unbekanntes Datum';
                    })()}
                  </p>
                  <p>
                    <strong>Ausführungsdatum:</strong> {order.jobDateFrom || 'N/A'}{' '}
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

              {/* Stunden-Abrechnungsübersicht */}
              <HoursBillingOverview
                orderId={orderId}
                className=""
                onPaymentRequest={!isViewerProvider ? handleOpenPayment : undefined}
                isCustomerView={!isViewerProvider}
              />

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
                      // BESSERE LOGIK: Verwende timeTracking.originalPlannedHours aus Firebase, falls verfügbar

                      // 1. Prüfe, ob bereits in Firebase timeTracking gespeichert
                      if (
                        order.timeTracking?.originalPlannedHours &&
                        order.timeTracking.originalPlannedHours > 0
                      ) {
                        return order.timeTracking.originalPlannedHours;
                      }

                      // 2. FESTANGEBOT: Verwende die gleiche Logik wie die Dauer-Anzeige
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
                        const calculatedHours = totalDays * hoursPerDay;

                        return calculatedHours;
                      } else {
                        // 3. Versuche jobDurationString zu parsen (nur wenn es eine gültige Zahl ist)
                        const durationNumber = parseFloat(String(order.jobDurationString || '0'));
                        if (!isNaN(durationNumber) && durationNumber > 0) {
                          return durationNumber;
                        }

                        // 4. Fallback: 8h für Festangebote (Standard)

                        return 8;
                      }
                    })()}
                    hourlyRate={(() => {
                      // BESSERE LOGIK: Verwende die gleiche originalPlannedHours Berechnung für Konsistenz
                      const plannedHours = (() => {
                        // 1. Prüfe, ob bereits in Firebase timeTracking gespeichert
                        if (
                          order.timeTracking?.originalPlannedHours &&
                          order.timeTracking.originalPlannedHours > 0
                        ) {
                          return order.timeTracking.originalPlannedHours;
                        }

                        // 2. FESTANGEBOT: Verwende die gleiche Logik wie die Dauer-Anzeige
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
                          // 3. Versuche jobDurationString zu parsen (nur wenn es eine gültige Zahl ist)
                          const durationNumber = parseFloat(String(order.jobDurationString || '0'));
                          if (!isNaN(durationNumber) && durationNumber > 0) {
                            return durationNumber;
                          }

                          // 4. Fallback: 8h für Festangebote (Standard)
                          return 8;
                        }
                      })();

                      // Echter Stundensatz: Gesamtpreis ÷ geplante Stunden
                      const calculatedRate =
                        plannedHours > 0 ? order.priceInCents / 100 / plannedHours : 50;

                      return calculatedRate;
                    })()}
                    onTimeSubmitted={() => {
                      // Optional: Reload order data or show success message
                    }}
                    isCustomerView={!isViewerProvider} // Kunde wenn nicht Provider
                  />
                </div>
              )}

              {/* PROVIDER STORNO-WARNUNG bei überfälligen Aufträgen */}
              {isViewerProvider && <ProviderStornoWarning order={order} companyUid={companyUid} />}

              {/* Auftrag abschließen - Box für aktive Aufträge */}
              {order.status === 'AKTIV' && isViewerProvider && !successMessage && (
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-start">
                    <div className="shrink-0">
                      <FiCheckCircle className="h-6 w-6 text-green-500" aria-hidden="true" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Auftrag als erledigt markieren
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Haben Sie die Arbeit erfolgreich abgeschlossen? Markieren Sie den Auftrag
                        als erledigt, damit der Kunde die Leistung bewerten und freigeben kann.
                      </p>
                      <div className="mt-3 p-3 bg-blue-50 rounded-md">
                        <h4 className="text-sm font-medium text-blue-800">
                          So läuft der Abschluss ab:
                        </h4>
                        <ul className="mt-1 text-sm text-blue-700 list-disc list-inside">
                          <li>Kunde wird über den Abschluss benachrichtigt</li>
                          <li>Kunde bewertet Ihre Leistung</li>
                          <li>Nach der Bewertung erfolgt die Auszahlung</li>
                          <li>Sie erhalten eine E-Mail über die Auszahlung</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-4">
                    <button
                      onClick={handleCompleteOrder}
                      disabled={isActionLoading}
                      className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isActionLoading ? (
                        <>
                          <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                          Wird abgeschlossen...
                        </>
                      ) : (
                        <>
                          <FiCheckCircle className="-ml-1 mr-2 h-4 w-4" />
                          Auftrag als erledigt markieren
                        </>
                      )}
                    </button>
                  </div>
                  {actionError && (
                    <div className="mt-3 p-3 bg-red-50 rounded-md">
                      <p className="text-red-600 text-sm font-medium">Fehler:</p>
                      <p className="text-red-600 text-sm">{actionError}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Warten auf Kundenbestätigung - Box für provider_completed Aufträge */}
              {order.status === 'PROVIDER_COMPLETED' && isViewerProvider && (
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-start">
                    <div className="shrink-0">
                      <FiClock className="h-6 w-6 text-amber-500" aria-hidden="true" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Auftrag abgeschlossen - Warten auf Kundenbewertung
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Perfekt! Sie haben den Auftrag erfolgreich abgeschlossen. Der Kunde wurde
                        benachrichtigt und wird Ihre Leistung nun bewerten.
                      </p>
                      <div className="mt-3 p-3 bg-green-50 rounded-md">
                        <h4 className="text-sm font-medium text-green-800">Was passiert jetzt:</h4>
                        <ul className="mt-1 text-sm text-green-700 list-disc list-inside">
                          <li>Kunde bewertet Ihre Arbeit (1-5 Sterne)</li>
                          <li>Nach der Bewertung wird das Geld ausgezahlt</li>
                          <li>Sie erhalten eine E-Mail über die Auszahlung</li>
                          <li>Die Bewertung erscheint in Ihrem Profil</li>
                        </ul>
                      </div>
                      <div className="mt-3 p-3 bg-blue-50 rounded-md">
                        <p className="text-blue-700 text-sm">
                          � <strong>Auszahlung:</strong> Erfolgt automatisch 1-2 Werktage nach der
                          Kundenbewertung auf Ihr Bankkonto.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Aktions-Box für den Anbieter */}
              {order.status === 'zahlung_erhalten_clearing' && isViewerProvider && (
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-start">
                    <div className="shrink-0">
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

              {/* Status-Anzeige für abgeschlossene Aufträge */}
              {order.status === 'ABGESCHLOSSEN' && (
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-start">
                    <div className="shrink-0">
                      <FiCheckCircle className="h-6 w-6 text-green-500" aria-hidden="true" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-green-800">
                        Auftrag abgeschlossen
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Dieser Auftrag wurde erfolgreich abgeschlossen. Das Geld wurde über unser
                        Treuhand-System freigegeben.
                      </p>
                      <div className="mt-3 p-3 bg-green-50 rounded-md">
                        <h4 className="text-sm font-medium text-green-800">
                          Status-Informationen:
                        </h4>
                        <ul className="mt-1 text-sm text-green-700 list-disc list-inside">
                          <li>Auftrag erfolgreich abgeschlossen</li>
                          <li>Geld für Auszahlungen freigegeben</li>
                          <li>Kunde wurde benachrichtigt</li>
                          <li>Bewertungssystem ist aktiviert</li>
                        </ul>
                      </div>
                      {isViewerProvider && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-md">
                          <p className="text-sm text-blue-700">
                            <strong>Auszahlung:</strong> Das Geld wird über unser Treuhand-System
                            automatisch ausgezahlt. Standard-Auszahlungszeiten: 1-2 Werktage für
                            SEPA-Überweisungen.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
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

            {/* Rechte Sidebar - UserInfoCard + Rechnungsdaten + Rechnung */}
            <div className="w-full lg:w-80 lg:shrink-0">
              <div className="lg:sticky lg:top-6 space-y-4">
                <UserInfoCard
                  userId={cardUser.id}
                  userName={cardUser.name}
                  userAvatarUrl={cardUser.avatarUrl || undefined}
                  userRole={cardUser.role}
                  showReviews={cardUser.role === 'provider'}
                  showSkills={cardUser.role === 'provider'}
                  showLanguages={cardUser.role === 'provider'}
                  showCustomerStats={cardUser.role === 'customer'}
                  showLinkButton={true}
                  linkText="Profil ansehen"
                  layout="vertical"
                  size="lg"
                />

                {/* Kunden-Rechnungsdaten - für Anbieter bei angenommenen Aufträgen */}
                {isViewerProvider && cardUser.role === 'customer' && (
                  <CustomerBillingInfo
                    customerId={order.customerId}
                    orderId={orderId}
                    orderStatus={order.status}
                  />
                )}

                {/* Rechnungsbereich - Provider kann Rechnung hochladen */}
                {(order.status === 'completed' || order.status === 'abgeschlossen' || order.status === 'ABGESCHLOSSEN' || order.status === 'PROVIDER_COMPLETED' || order.status === 'AKTIV') && isViewerProvider && (
                  <OrderInvoiceSection
                    orderId={orderId}
                    userRole="provider"
                    orderStatus={order.status}
                    _providerId={order.providerId}
                    _customerId={order.customerId}
                    className="bg-white shadow rounded-lg"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Modal */}
        {showInlinePayment && order && (
          <EscrowPaymentComponent
            projectData={{
              projectId: orderId,
              projectTitle: order.serviceTitle || `Auftrag ${orderId.slice(-6).toUpperCase()}`,
              amount: paymentAmount,
              paymentType: 'order_payment',
              providerId: order.providerId,
            }}
            customerData={{
              customerId: order.customerId || '',
              name: order.customerName,
            }}
            isOpen={showInlinePayment}
            onClose={handlePaymentCancel}
            onSuccess={(_escrowId: string) => {
              handlePaymentSuccess();
            }}
            onError={(_error: string) => {
              handlePaymentCancel();
            }}
          />
        )}

        {/* Complete Order Modal */}
        <CompleteOrderModal
          isOpen={showCompleteOrderModal}
          onClose={() => setShowCompleteOrderModal(false)}
          onConfirm={confirmCompleteOrder}
          isLoading={isActionLoading}
        />
      </main>
    </Suspense>
  );
}
