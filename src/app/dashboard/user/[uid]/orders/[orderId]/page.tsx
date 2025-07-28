// src/app/dashboard/user/[uid]/orders/[orderId]/page.tsx
'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth, UserProfile } from '@/contexts/AuthContext';
import { db, functions, auth } from '@/firebase/clients';
import { httpsCallable } from 'firebase/functions';

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

import UserInfoCard from '@/components/UserInfoCard'; // Importiere die neue, generische Komponente

// Die Chat-Komponente
import ChatComponent from '@/components/ChatComponent';
// Payment-Komponente
import InlinePaymentComponent from '@/components/InlinePaymentComponent';
// Stunden-Übersicht Komponente
import HoursBillingOverview from '@/components/HoursBillingOverview';

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
  priceInCents: number; // Mapped from jobCalculatedPriceInCents
  status: string;
  selectedCategory?: string; // Direkt aus Firestore, optional gemacht
  selectedSubcategory?: string; // Direkt aus Firestore, optional gemacht
  jobTotalCalculatedHours?: number; // Direkt aus Firestore (bereits vorhanden)
  jobDurationString?: string | number; // Stunden pro Tag
  beschreibung?: string; // Mapped from description
  jobDateFrom?: string; // Datum
  jobDateTo?: string; // Datum
  jobTimePreference?: string; // Uhrzeit
  // Fügen Sie hier alle relevanten Felder aus Ihrem Auftragsdokument hinzu
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = typeof params?.orderId === 'string' ? params.orderId : '';
  const { user: currentUser, loading: authLoading } = useAuth(); // KORREKTUR: useAuth Hook korrekt verwenden

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

  useEffect(() => {
    // Warten, bis der Auth-Status endgültig geklärt ist.
    if (authLoading) {
      // KORREKTUR: Den 'loading'-State aus dem AuthContext verwenden
      return;
    }

    // Wenn nach dem Laden kein Benutzer da ist, zum Login weiterleiten.
    if (!currentUser) {
      console.log('OrderDetailPage: Nicht authentifiziert, leite zu Login weiter.');
      const currentPath = window.location.pathname + window.location.search;
      router.replace(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
      return;
    }

    // Wenn die orderId fehlt, ist das ein Fehler.
    if (!orderId) {
      setError('Auftrags-ID in der URL fehlt.');
      setLoadingOrder(false);
      return;
    }

    fetchOrder();
  }, [authLoading, currentUser, orderId, router]);

  // Payment Modal State Monitor
  useEffect(() => {
    console.log('🔍 PAYMENT STATE CHANGE:', {
      showInlinePayment,
      paymentClientSecret: paymentClientSecret ? 'SET' : 'NULL',
      paymentAmount,
      paymentHours,
      timestamp: new Date().toISOString(),
    });
  }, [showInlinePayment, paymentClientSecret, paymentAmount, paymentHours]);

  // NEU: Die Logik zum Laden des Auftrags in eine useCallback-Funktion extrahiert,
  // damit wir sie nach einer Aktion erneut aufrufen können.
  const fetchOrder = useCallback(
    async (retryCount = 0) => {
      if (!currentUser || !orderId) return;

      setLoadingOrder(true);
      setError(null);
      try {
        const orderDocRef = doc(db, 'auftraege', orderId);
        const orderDocSnap = await getDoc(orderDocRef);

        if (!orderDocSnap.exists()) {
          throw new Error('Auftrag nicht gefunden.');
        }

        const data = orderDocSnap.data();
        if (currentUser.uid !== data.kundeId && currentUser.uid !== data.selectedAnbieterId) {
          throw new Error('Keine Berechtigung für diesen Auftrag.');
        }

        const getOrderParticipantDetails = httpsCallable<
          { orderId: string },
          { provider: ParticipantDetails; customer: ParticipantDetails }
        >(functions, 'getOrderParticipantDetails');

        const result = await getOrderParticipantDetails({ orderId });
        const { provider: providerDetails, customer: customerDetails } = result.data;

        const orderData: OrderData = {
          id: orderDocSnap.id,
          serviceTitle: data.selectedSubcategory || 'Dienstleistung',
          providerId: data.selectedAnbieterId,
          providerName: providerDetails.name,
          providerAvatarUrl: providerDetails.avatarUrl,
          customerId: data.kundeId,
          customerName: customerDetails.name,
          customerAvatarUrl: customerDetails.avatarUrl,
          orderDate: data.paidAt || data.createdAt,
          priceInCents: data.jobCalculatedPriceInCents || 0,
          status: data.status || 'unbekannt',
          selectedCategory: data.selectedCategory,
          selectedSubcategory: data.selectedSubcategory,
          jobTotalCalculatedHours: data.jobTotalCalculatedHours,
          beschreibung: data.description,
          jobDateFrom: data.jobDateFrom,
          jobDateTo: data.jobDateTo,
          jobTimePreference: data.jobTimePreference,
        };
        setOrder(orderData);
        console.log('✅ Order data loaded successfully');
      } catch (err: any) {
        console.error('❌ Fehler beim Laden des Auftrags:', err);

        // Retry-Logik für transiente Fehler nach Bezahlung
        if (
          retryCount < 3 &&
          (err.message?.includes('network') || err.message?.includes('timeout'))
        ) {
          console.log(`🔄 Retrying fetchOrder (attempt ${retryCount + 1}/3)...`);
          setTimeout(() => fetchOrder(retryCount + 1), 1000 * (retryCount + 1));
          return;
        }

        setError(`Fehler beim Laden des Auftrags: ${err.message || 'Unbekannter Fehler'}`);
      } finally {
        setLoadingOrder(false);
      }
    },
    [currentUser, orderId]
  );

  // NEU: Beispiel-Handler für den "Auftrag annehmen"-Button
  const handleAcceptOrder = async () => {
    if (!orderId) return;
    setIsUpdating(true);
    setError(null);
    try {
      // Debug: Auth Status prüfen
      const firebaseUser = auth.currentUser;
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
      console.log('Accept Order Success:', result);

      // Nach erfolgreichem Aufruf die Daten neu laden, um einen konsistenten Zustand zu gewährleisten.
      await fetchOrder();
    } catch (err: any) {
      console.error('Fehler beim Annehmen des Auftrags:', err);
      setError(err.message || 'Ein Fehler ist beim Annehmen des Auftrags aufgetreten.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Payment Modal Handler - kann von CustomerApprovalInterface aufgerufen werden
  const handlePaymentRequest = (clientSecret: string, amount: number, hours: number) => {
    console.log('🔄 CRITICAL: Payment request received from CustomerApprovalInterface:', {
      clientSecret,
      amount,
      hours,
    });

    setPaymentClientSecret(clientSecret);
    setPaymentAmount(amount);
    setPaymentHours(hours);
    setShowInlinePayment(true);

    console.log('🔓 CRITICAL: Payment modal state set:', {
      showInlinePayment: true,
      paymentClientSecret: clientSecret,
      paymentAmount: amount,
      paymentHours: hours,
    });
  };

  // Direct Payment Modal Handler - Echte Billing-Daten verwenden
  const handleOpenPayment = async () => {
    if (!orderId) return;

    try {
      console.log('🔄 DIRECT: Starting payment process for order:', orderId);

      // Import TimeTracker dynamisch
      const { TimeTracker } = await import('@/lib/timeTracker');

      // Stelle echte Stripe-Abrechnung für genehmigte Stunden
      const billingResult = await TimeTracker.billApprovedHours(orderId);

      console.log('✅ DIRECT: Real billing data received:', {
        paymentIntentId: billingResult.paymentIntentId,
        customerPays: billingResult.customerPays,
        clientSecret: billingResult.clientSecret,
      });

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

      console.log('🔍 DIRECT: Payment hours calculation:', {
        allAdditionalEntries: orderDetails?.timeTracking?.timeEntries?.filter(
          (e: any) => e.category === 'additional'
        ),
        filteredForPayment: orderDetails?.timeTracking?.timeEntries?.filter((e: any) => {
          return (
            e.category === 'additional' &&
            (e.status === 'customer_approved' || e.status === 'billing_pending')
          );
        }),
        calculatedHours: paymentHours,
      });

      // Setze echte Daten
      setPaymentClientSecret(billingResult.clientSecret);
      setPaymentAmount(billingResult.customerPays);
      setPaymentHours(paymentHours);
      setShowInlinePayment(true);

      console.log('✅ DIRECT: Real payment modal opened with:', {
        amount: billingResult.customerPays / 100,
        hours: paymentHours,
      });
    } catch (error) {
      console.error('❌ DIRECT: Error creating payment:', error);
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
    console.log('✅ Payment successful!');
    setShowInlinePayment(false);

    // Success-Nachricht anzeigen
    setSuccessMessage('Zahlung erfolgreich! Die Daten werden aktualisiert...');

    // Warte kurz, damit Webhooks Zeit haben die Datenbank zu aktualisieren
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      // Reload order data mit Retry-Logik
      await fetchOrder();
      console.log('✅ Order data reloaded after payment success');
      setSuccessMessage('Zahlung erfolgreich abgeschlossen! ✅');

      // Success-Nachricht nach 5 Sekunden ausblenden
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error('❌ Error reloading order data after payment:', error);
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
    console.log('❌ Payment cancelled');
    setShowInlinePayment(false);
  };

  const overallLoading = loadingOrder || authLoading; // KORREKTUR: Gesamt-Ladezustand

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
                        const hours =
                          order.jobTotalCalculatedHours || order.jobDurationString || 'N/A';
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
              console.log('Payment successful:', paymentIntentId);
              handlePaymentSuccess();
            }}
            onError={(error: string) => {
              console.error('Payment error:', error);
              handlePaymentCancel();
            }}
          />
        )}
      </main>
    </Suspense>
  );
}
