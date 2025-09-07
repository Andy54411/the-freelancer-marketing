// src/app/dashboard/user/[uid]/orders/[orderId]/page.tsx
'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth, UserProfile } from '@/contexts/AuthContext';
import { functions, db } from '@/firebase/clients';
import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { getSingleOrder } from '@/app/api/getSingleOrder';
import { getOrderParticipantDetails } from '@/app/api/getOrderParticipantDetails';

// Icons für UI
import {
  FiLoader,
  FiAlertCircle,
  FiMessageSquare,
  FiArrowLeft,
  FiUser,
  FiSlash,
  FiCheckCircle,
} from 'react-icons/fi'; // FiUser hinzugefügt

import UserInfoCard from '@/components/UserInfoCard';

// Die Chat-Komponente
import ChatComponent from '@/components/ChatComponent';
// Payment-Komponente
import InlinePaymentComponent from '@/components/InlinePaymentComponent';
// Stunden-Übersicht Komponente
import HoursBillingOverview from '@/components/HoursBillingOverview';
// Order Completion Komponente
import OrderCompletionModal from '@/components/orders/OrderCompletionModal';
// Storno-Komponente
import StornoButtonSection from '@/components/storno/StornoButtonSection';

interface ParticipantDetails {
  id: string;
  name: string;
  avatarUrl: string | null;
}

// Interface für ein Auftragsdokument (basierend auf Ihrem Firestore-Screenshot)
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
  orderDate?: { _seconds: number; _nanoseconds: number } | string; // Mapped from paidAt or createdAt
  priceInCents: number; // Mapped from totalAmountPaidByBuyer as primary source
  status: string;
  selectedCategory?: string; // Direkt aus Firestore, optional gemacht
  selectedSubcategory?: string; // Direkt aus Firestore, optional gemacht
  jobTotalCalculatedHours?: number; // Direkt aus Firestore (bereits vorhanden)
  jobDurationString?: string | number; // Stunden pro Tag
  beschreibung?: string; // Mapped from description
  jobDateFrom?: string; // Datum
  jobDateTo?: string; // Datum
  jobTimePreference?: string; // Uhrzeit
  // Felder für Order Completion System
  totalAmountPaidByBuyer?: number; // Gesamtbetrag den Kunde gezahlt hat
  companyNetAmount?: number; // Netto-Betrag für das Unternehmen
  platformFeeAmount?: number; // Platform-Gebühr
  companyStripeAccountId?: string; // Stripe Connect Account des Unternehmens
  // Fügen Sie hier alle relevanten Felder aus Ihrem Auftragsdokument hinzu
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = typeof params?.orderId === 'string' ? params.orderId : '';
  const { user: currentUser, loading: authLoading, firebaseUser } = useAuth(); // KORREKTUR: useAuth Hook korrekt verwenden mit firebaseUser

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false); // NEU: Ladezustand für Aktionen
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // NEU: Success feedback

  // Payment Modal States
  const [showInlinePayment, setShowInlinePayment] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentHours, setPaymentHours] = useState(0);

  // Order Completion Modal States
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Verhindere Auto-Scroll der ChatComponent
  useEffect(() => {
    // Speichere die aktuelle Scroll-Position
    const currentScrollY = window.scrollY;

    // Verhindere Auto-Scroll
    const preventScroll = () => {
      window.scrollTo(0, currentScrollY);
    };

    // Überwache Scroll-Änderungen für die ersten 2 Sekunden nach dem Laden
    const timer = setTimeout(() => {
      window.removeEventListener('scroll', preventScroll);
    }, 2000);

    window.addEventListener('scroll', preventScroll);

    return () => {
      window.removeEventListener('scroll', preventScroll);
      clearTimeout(timer);
    };
  }, [orderId]); // Läuft neu, wenn sich die orderId ändert

  useEffect(() => {
    // Warten, bis der Auth-Status endgültig geklärt ist.
    if (authLoading) {
      return;
    }

    // Wenn nach dem Laden kein Benutzer da ist, zum Login weiterleiten.
    if (!currentUser) {
      console.log('❌ Kein currentUser gefunden, weiterleitung zum Login');
      const currentPath = window.location.pathname + window.location.search;
      router.replace(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
      return;
    }

    console.log('✅ CurrentUser geladen:', {
      uid: currentUser.uid,
      role: currentUser.role,
      email: currentUser.email,
    });

    // Wenn die orderId fehlt, ist das ein Fehler.
    if (!orderId) {
      setError('Auftrags-ID in der URL fehlt.');
      setLoadingOrder(false);
      return;
    }

    // Zuerst laden wir die Daten über die API (mit ordentlicher Autorisierung)
    // Dann starten wir den Realtime-Listener für Updates
    const initializeOrder = async () => {
      try {
        setLoadingOrder(true);
        setError(null);

        // Get ID token for authentication
        const idToken = await firebaseUser?.getIdToken();
        if (!idToken) {
          throw new Error('No authentication token available');
        }

        console.log('🔍 Lade Order über API:', orderId);

        // Load initial order data via API (with proper authorization)
        const orderData = await getSingleOrder(orderId, idToken);

        console.log('✅ Order über API geladen:', orderData);

        // Get participant details
        const { provider: providerDetails, customer: customerDetails } =
          await getOrderParticipantDetails(orderId, idToken);

        const mappedOrderData: OrderData = {
          id: orderData.id,
          serviceTitle: orderData.selectedSubcategory || 'Unbekannter Service',
          providerId: orderData.selectedAnbieterId || '',
          providerName: orderData.providerName || providerDetails?.name || 'Unbekannter Anbieter',
          providerAvatarUrl: providerDetails?.avatarUrl || null,
          customerId: orderData.kundeId || orderData.customerFirebaseUid || '',
          customerName: orderData.customerName || customerDetails?.name || 'Unbekannter Kunde',
          customerAvatarUrl: customerDetails?.avatarUrl || null,
          orderDate: orderData.paidAt || orderData.createdAt,
          priceInCents: orderData.totalAmountPaidByBuyer || 0,
          status: orderData.status || 'Unbekannt',
          selectedCategory: orderData.selectedCategory,
          selectedSubcategory: orderData.selectedSubcategory,
          jobTotalCalculatedHours: orderData.jobTotalCalculatedHours,
          jobDurationString: orderData.jobDurationString,
          beschreibung: orderData.description || orderData.beschreibung,
          jobDateFrom: orderData.jobDateFrom,
          jobDateTo: orderData.jobDateTo,
          jobTimePreference: orderData.jobTimePreference,
          totalAmountPaidByBuyer: orderData.totalAmountPaidByBuyer,
          companyNetAmount: orderData.companyNetAmount,
          platformFeeAmount: orderData.platformFeeAmount,
          companyStripeAccountId: orderData.companyStripeAccountId,
        };

        setOrder(mappedOrderData);
        setLoadingOrder(false);
      } catch (err: any) {
        console.error('❌ Fehler beim Laden der Order:', err);
        if (err.message?.includes('Access denied') || err.message?.includes('403')) {
          setError('Keine Berechtigung für diesen Auftrag.');
        } else if (err.message?.includes('not found') || err.message?.includes('404')) {
          setError('Auftrag nicht gefunden.');
        } else {
          setError('Fehler beim Laden des Auftrags: ' + err.message);
        }
        setLoadingOrder(false);
      }
    };

    initializeOrder();

    // Cleanup function für den useEffect
    return () => {
      // Hier könnte später ein Cleanup für Realtime-Listener stehen
      console.log('🧹 Order Detail Component cleanup');
    };
  }, [authLoading, currentUser, orderId, router, firebaseUser]);

  // Payment Modal State Monitor
  useEffect(() => {}, [showInlinePayment, paymentClientSecret, paymentAmount, paymentHours]);

  // Order Completion Handlers
  const handleCompleteOrder = () => {
    setShowCompletionModal(true);
  };

  const handleOrderCompleted = () => {
    // Order data wird automatisch über Realtime Listener aktualisiert
    setSuccessMessage(
      'Auftrag erfolgreich abgeschlossen! Das Geld wurde an den Anbieter ausgezahlt.'
    );
  };

  // NEU: Beispiel-Handler für den "Auftrag annehmen"-Button
  const handleAcceptOrder = async () => {
    if (!orderId) return;
    setIsUpdating(true);
    setError(null);
    try {
      // Debug: Auth Status prüfen
      if (!firebaseUser) {
        throw new Error('Benutzer ist nicht angemeldet');
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
          body: JSON.stringify({ orderId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'HTTP Error');
      }

      const result = await response.json();

      // Real-Time-Listener aktualisiert die Daten automatisch
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist beim Annehmen des Auftrags aufgetreten.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Payment Modal Handler - kann von CustomerApprovalInterface aufgerufen werden
  const handlePaymentRequest = (clientSecret: string, amount: number, hours: number) => {
    setPaymentClientSecret(clientSecret);
    setPaymentAmount(amount);
    setPaymentHours(hours);
    setShowInlinePayment(true);
  };

  // Direct Payment Modal Handler - Echte Billing-Daten verwenden
  const handleOpenPayment = async () => {
    if (!orderId) return;

    try {
      // Import TimeTracker dynamisch
      const { TimeTracker } = await import('@/lib/timeTracker');

      // Stelle echte Stripe-Abrechnung für genehmigte Stunden
      const billingResult = await TimeTracker.billApprovedHours(orderId);

      // Berechne echte Payment Hours aus OrderDetails - KORRIGIERT: Suche nach billing_pending Status
      const orderDetails = await TimeTracker.getOrderDetails(orderId);
      const paymentHours =
        orderDetails?.timeTracking?.timeEntries
          ?.filter((e: any) => {
            // Alle Stunden die genehmigt sind aber noch bezahlt werden müssen
            return (
              e.category === 'additional' &&
              (e.status === 'customer_approved' || e.status === 'billing_pending')
            );
          })
          ?.reduce((sum: number, e: any) => sum + e.hours, 0) || 0;

      // Setze echte Daten
      setPaymentClientSecret(billingResult.clientSecret);
      setPaymentAmount(billingResult.customerPays);
      setPaymentHours(paymentHours);
      setShowInlinePayment(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

      if (
        errorMessage.includes('PAYMENT SETUP ERFORDERLICH') ||
        errorMessage.includes('Stripe Connect')
      ) {
        alert(
          'Der Dienstleister muss seine Zahlungseinrichtung abschließen.\n\nBitte kontaktieren Sie den Support oder warten Sie, bis der Dienstleister seine Stripe Connect Einrichtung vollendet hat.'
        );
      } else {
        alert(`Fehler beim Erstellen der Zahlung: ${errorMessage}`);
      }
    }
  };

  const handlePaymentSuccess = async () => {
    setShowInlinePayment(false);

    // Success-Nachricht anzeigen
    setSuccessMessage('Zahlung erfolgreich! Die Daten werden aktualisiert...');

    // Warte kurz, damit Webhooks Zeit haben die Datenbank zu aktualisieren
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      // Real-Time-Listener aktualisiert die Daten automatisch

      // Prüfe, ob die Zahlung korrekt verarbeitet wurde
      const { TimeTracker } = await import('@/lib/timeTracker');
      const orderDetails = await TimeTracker.getOrderDetails(orderId);

      const billingPendingEntries =
        orderDetails?.timeTracking?.timeEntries?.filter(
          (e: any) => e.status === 'billing_pending' && e.paymentIntentId
        ) || [];

      if (billingPendingEntries.length > 0) {
        // Automatische Reparatur für billing_pending Einträge
        const entryIds = billingPendingEntries.map((e: any) => e.id);
        const paymentIntentId = billingPendingEntries[0].paymentIntentId;

        try {
          const fixResponse = await fetch('/api/fix-payment-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId,
              paymentIntentId,
            }),
          });

          if (fixResponse.ok) {
            setSuccessMessage('Zahlung erfolgreich! Daten werden automatisch korrigiert...');
            // Real-Time-Listener aktualisiert die Daten automatisch
          }
        } catch (fixError) {
          // Fehler beim Fix ignorieren - Real-Time-Listener wird trotzdem funktionieren
        }
      }

      setSuccessMessage('Zahlung erfolgreich abgeschlossen! ✅');

      // Success-Nachricht nach 5 Sekunden ausblenden
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
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

  const overallLoading = loadingOrder || authLoading; // KORREKTUR: Gesamt-Ladezustand

  if (overallLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 flex justify-center items-center">
        <FiLoader className="animate-spin text-4xl text-white mr-3" />
        {authLoading ? 'Authentifizierung wird geprüft...' : 'Lade Auftragsdetails...'}
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 flex flex-col justify-center items-center p-4 text-center">
        <div
          className="bg-white/90 border border-white/20 text-red-700 px-4 py-3 rounded relative max-w-md"
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
      <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 flex justify-center items-center">
        <FiAlertCircle className="text-4xl text-white mr-3" />
        Fehler: Auftrag konnte nicht angezeigt werden oder Sie sind nicht angemeldet.
      </div>
    );
  }

  // Bestimmen, welche Benutzerinformationen in der Karte angezeigt werden sollen.
  // Zeigt immer die *andere* Person im Auftrag an.
  const isViewerCustomer = currentUser.uid === order.customerId;
  const cardUser = isViewerCustomer
    ? {
        id: order.providerId,
        name: order.providerName,
        avatarUrl: order.providerAvatarUrl,
        role: 'provider' as const,
      }
    : {
        id: order.customerId,
        name: order.customerName,
        avatarUrl: order.customerAvatarUrl,
        role: 'customer' as const,
      };

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 flex justify-center items-center">
          <FiLoader className="animate-spin text-4xl text-white mr-3" /> Lade Benutzeroberfläche...
        </div>
      }
    >
      <main className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative -m-4 lg:-m-6 -mt-16">
        <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
        <div className="relative z-10 pt-20 px-4 lg:px-6 pb-6">
          <div className="max-w-7xl mx-auto">
            <button
              onClick={() => router.back()}
              className="text-white hover:text-white/80 flex items-center gap-2 mb-4 transition-colors"
            >
              <FiArrowLeft /> Zurück zur Übersicht
            </button>

            <h1 className="text-3xl font-semibold text-white mb-6">Auftrag #{orderId}</h1>

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
                {/* Auftragsdetails anzeigen */}
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
                        // Prioritätsbasierte Dauer-Berechnung
                        // 1. Wenn mehrere Tage: Berechne Gesamtstunden
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

                        // 2. jobTotalCalculatedHours verwenden (höchste Priorität)
                        if (order.jobTotalCalculatedHours && order.jobTotalCalculatedHours > 0) {
                          return `${order.jobTotalCalculatedHours} Stunden`;
                        }

                        // 3. jobDurationString verwenden
                        if (order.jobDurationString && order.jobDurationString !== '0') {
                          return `${order.jobDurationString} Stunden`;
                        }

                        // 4. Fallback: Aus Preis schätzen (bei 50€/Stunde)
                        if (order.priceInCents && order.priceInCents > 0) {
                          const estimatedHours = Math.round(order.priceInCents / 100 / 50);
                          if (estimatedHours > 0) {
                            return `${estimatedHours} Stunden `;
                          }
                        }

                        // 5. Letzter Fallback
                        return 'Nicht angegeben';
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

                    {/* NEU: Beispiel für den "Annehmen"-Button (anzuwenden auf der Company-Seite) */}
                    {currentUser.uid === order.providerId &&
                      order.status === 'zahlung_erhalten_clearing' && (
                        <div className="md:col-span-2 mt-4">
                          <button
                            onClick={handleAcceptOrder}
                            disabled={isUpdating}
                            className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700 disabled:bg-gray-400"
                          >
                            {isUpdating ? 'Wird angenommen...' : 'Auftrag annehmen'}
                          </button>
                        </div>
                      )}

                    {/* Order Completion Button für Kunden bei accepted */}
                    {currentUser.uid === order.customerId && order.status === 'accepted' && (
                      <div className="md:col-span-2 mt-4">
                        <button
                          onClick={handleCompleteOrder}
                          className="w-full bg-[#14ad9f] hover:bg-[#129488] text-white font-bold py-3 px-4 rounded transition-colors flex items-center justify-center gap-2"
                        >
                          <FiCheckCircle className="h-5 w-5" />
                          Auftrag als erledigt markieren
                        </button>
                        <p className="text-sm text-gray-600 mt-2 text-center">
                          Durch das Abschließen wird das Geld automatisch an den Anbieter
                          ausgezahlt.
                        </p>
                      </div>
                    )}

                    {/* STORNO BUTTONS - Implementiert nach Admin-Only System */}
                    {currentUser.uid === order.customerId && (
                      <StornoButtonSection
                        order={order}
                        currentUser={currentUser}
                        onStornoSuccess={() => {
                          setSuccessMessage(
                            'Storno-Anfrage wurde eingereicht und wird von einem Admin geprüft.'
                          );
                          // Realtime-Listener aktualisiert automatisch den Status
                        }}
                      />
                    )}

                    {/* Order Review/Confirm Button für Kunden bei PROVIDER_COMPLETED */}
                    {currentUser.uid === order.customerId &&
                      order.status === 'PROVIDER_COMPLETED' && (
                        <div className="md:col-span-2 mt-4">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                            <h3 className="text-lg font-semibold text-green-800 mb-2 flex items-center gap-2">
                              <FiCheckCircle className="h-5 w-5" />
                              Auftrag wurde vom Anbieter abgeschlossen
                            </h3>
                            <p className="text-green-700 text-sm mb-3">
                              Der Anbieter hat den Auftrag als erledigt markiert. Bitte prüfen Sie
                              die Arbeit und bestätigen Sie den Abschluss.
                            </p>
                          </div>
                          <button
                            onClick={handleCompleteOrder}
                            className="w-full bg-[#14ad9f] hover:bg-[#129488] text-white font-bold py-3 px-4 rounded transition-colors flex items-center justify-center gap-2"
                          >
                            <FiCheckCircle className="h-5 w-5" />
                            Auftrag bestätigen & bewerten
                          </button>
                          <p className="text-sm text-gray-600 mt-2 text-center">
                            Nach der Bestätigung wird das Geld an den Anbieter ausgezahlt und Sie
                            können eine Bewertung abgeben.
                          </p>
                        </div>
                      )}
                  </div>
                </div>

                {/* Stunden-Abrechnungsübersicht für Kunden */}
                {currentUser.uid === order.customerId && (
                  <HoursBillingOverview
                    orderId={orderId}
                    className=""
                    onPaymentRequest={handleOpenPayment}
                  />
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
                          ? 'Der Chat wird aktiviert, sobald der Anbieter den Auftrag angenommen hat.'
                          : 'Für diesen Auftrag ist der Chat nicht mehr verfügbar.'}
                      </p>
                    </div>
                  ) : (
                    <div
                      className="flex-1 min-h-0 max-h-96 overflow-y-auto"
                      style={{ scrollBehavior: 'auto' }}
                    >
                      <div className="h-full" onScroll={e => e.stopPropagation()}>
                        <ChatComponent
                          orderId={orderId}
                          participants={{
                            customerId: order.customerId,
                            providerId: order.providerId,
                          }}
                        />
                      </div>
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
                    userAvatarUrl={cardUser.avatarUrl || undefined}
                    userRole={cardUser.role}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Modal */}
          {showInlinePayment && paymentClientSecret && (
            <InlinePaymentComponent
              clientSecret={paymentClientSecret}
              orderId={orderId}
              totalAmount={paymentAmount}
              totalHours={paymentHours}
              customerId={order?.customerId}
              isOpen={showInlinePayment}
              onClose={handlePaymentCancel}
              onSuccess={(paymentIntentId: string) => {
                handlePaymentSuccess();
              }}
              onError={(error: string) => {
                handlePaymentCancel();
              }}
            />
          )}

          {/* Order Completion Modal */}
          {order && (
            <OrderCompletionModal
              isOpen={showCompletionModal}
              onClose={() => setShowCompletionModal(false)}
              order={{
                id: order.id,
                title: order.serviceTitle,
                description: order.beschreibung || '',
                selectedAnbieterId: order.providerId,
                companyName: order.providerName,
                totalAmountPaidByBuyer: order.priceInCents,
                companyNetAmount: Math.round(order.priceInCents * 0.955), // 95.5% nach 4.5% Platform Fee (wie in der Dokumentation)
                platformFeeAmount: Math.round(order.priceInCents * 0.045), // 4.5% Platform Fee (Standard)
                status: order.status,
              }}
              userId={currentUser?.uid || ''}
              onOrderCompleted={handleOrderCompleted}
            />
          )}
        </div>
      </main>
    </Suspense>
  );
}
