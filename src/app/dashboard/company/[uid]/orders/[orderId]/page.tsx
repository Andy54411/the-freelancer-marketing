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
  CheckCircle as FiCheckCircle,
} from 'lucide-react';

// Komponenten
import UserInfoCard from '@/components/UserInfoCard';
import TimeTrackingManager from '@/components/TimeTrackingManager';
// Die Chat-Komponente
import ChatComponent from '@/components/ChatComponent';
// Stunden-Übersicht Komponente
import HoursBillingOverview from '@/components/HoursBillingOverview';
// Payment-Komponente
import InlinePaymentComponent from '@/components/InlinePaymentComponent';

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

  // Payment Modal States - für HoursBillingOverview
  const [showInlinePayment, setShowInlinePayment] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentHours, setPaymentHours] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
          // Korrigiertes Date-Mapping für Firestore Timestamps
          orderDate: (() => {
            // Priorität: paidAt -> createdAt -> lastUpdated -> lastUpdatedAt
            const dateField =
              orderDataFromDb.paidAt ||
              orderDataFromDb.createdAt ||
              orderDataFromDb.lastUpdated ||
              orderDataFromDb.lastUpdatedAt;

            if (!dateField) return undefined;

            // Firestore Timestamp hat toDate() Methode
            if (dateField && typeof dateField === 'object' && 'toDate' in dateField) {
              return dateField.toDate().toISOString();
            }

            // Firestore Timestamp als Object mit _seconds
            if (dateField && typeof dateField === 'object' && '_seconds' in dateField) {
              return new Date(dateField._seconds * 1000).toISOString();
            }

            // String ISO Date
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
              // Fallback: Berechne Stunden basierend auf Preis (Standard B2B Rate 42€/h)
              const priceInEur =
                (orderDataFromDb.jobCalculatedPriceInCents ||
                  orderDataFromDb.totalAmountPaidByBuyer ||
                  0) / 100;
              const standardHourlyRate = 42; // B2B Standard Rate
              return Math.round(priceInEur / standardHourlyRate);
            })(),
          jobDurationString: orderDataFromDb.jobDurationString,
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

  const handleCompleteOrder = async () => {
    if (!order) return;
    
    const confirmation = window.confirm(
      'Sind Sie sicher, dass Sie diesen Auftrag als erledigt markieren möchten?\n\n' +
      'Nach der Markierung:\n' +
      '• Auftrag wird als "PROVIDER_COMPLETED" markiert\n' +
      '• Kunde muss den Abschluss bestätigen und bewerten\n' +
      '• Geld wird erst nach Kundenbestätigung freigegeben\n' +
      '• Der Kunde erhält eine Benachrichtigung'
    );
    
    if (!confirmation) return;
    
    setIsActionLoading(true);
    setActionError(null);

    try {
      // Debug: Prüfe Auth Status
      console.log('Debug: Completing order for user:', currentUser);

      if (!currentUser) {
        throw new Error('Benutzer ist nicht angemeldet');
      }

      // Debug: Hole ID Token für HTTP Request
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error('Firebase currentUser ist null');
      }

      const idToken = await firebaseUser.getIdToken();
      console.log('Debug: Completing order with ID Token');

      // HTTP Request zur completeOrder Function
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
            completionNote: 'Auftrag wurde vom Anbieter als abgeschlossen markiert.'
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'HTTP Error beim Abschließen des Auftrags');
      }

      const result = await response.json();
      console.log('Complete Order Success:', result);

      // Update local state
      setOrder(prev => (prev ? { ...prev, status: 'PROVIDER_COMPLETED' } : null));
      
      // Success message
      setSuccessMessage(
        'Auftrag als erledigt markiert! Der Kunde wurde benachrichtigt und muss jetzt den Abschluss bestätigen und bewerten. Das Geld wird nach der Kundenbestätigung freigegeben.'
      );
      
    } catch (err: any) {
      console.error('Fehler beim Abschließen des Auftrags:', err);
      setActionError(err.message || 'Fehler beim Abschließen des Auftrags.');
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

  // Payment Modal Handler - für HoursBillingOverview
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

      // Berechne echte Payment Hours aus OrderDetails
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
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      // Order data neu laden nach erfolgreichem Payment
      window.location.reload();
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
                        order.status === 'ABGESCHLOSSEN' ? 'text-green-600' :
                        order.status === 'bezahlt' || order.status === 'zahlung_erhalten_clearing' || order.status === 'AKTIV' ? 'text-blue-600' : 
                        'text-yellow-600'
                      }`}
                    >
                      {(() => {
                        switch(order.status) {
                          case 'ABGESCHLOSSEN':
                            return '✅ ABGESCHLOSSEN';
                          case 'AKTIV':
                            return '🔄 AKTIV';
                          case 'zahlung_erhalten_clearing':
                            return '💰 ZAHLUNG ERHALTEN';
                          case 'bezahlt':
                            return '✅ BEZAHLT';
                          default:
                            return order.status?.replace(/_/g, ' ').charAt(0).toUpperCase() + order.status?.replace(/_/g, ' ').slice(1);
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

              {/* Auftrag abschließen - Box für aktive Aufträge */}
              {order.status === 'AKTIV' && isViewerProvider && (
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <FiCheckCircle className="h-6 w-6 text-green-500" aria-hidden="true" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">Auftrag als erledigt markieren</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Haben Sie die Arbeit erfolgreich abgeschlossen? Markieren Sie den Auftrag als erledigt. 
                        Der Kunde muss dann den Abschluss bestätigen und bewerten, bevor das Geld freigegeben wird.
                      </p>
                      <div className="mt-3 p-3 bg-amber-50 rounded-md">
                        <h4 className="text-sm font-medium text-amber-800">Was passiert beim Markieren:</h4>
                        <ul className="mt-1 text-sm text-amber-700 list-disc list-inside">
                          <li>Auftrag wird als "erledigt" markiert</li>
                          <li>Kunde erhält Benachrichtigung zur Bestätigung</li>
                          <li>Kunde muss bewerten und Abschluss bestätigen</li>
                          <li>Geld wird erst nach Kundenbestätigung freigegeben</li>
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
                    <div className="flex-shrink-0">
                      <FiClock className="h-6 w-6 text-amber-500" aria-hidden="true" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">Wartet auf Kundenbestätigung</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Sie haben den Auftrag als erledigt markiert. Der Kunde wurde benachrichtigt und 
                        muss jetzt den Abschluss bestätigen und eine Bewertung abgeben.
                      </p>
                      <div className="mt-3 p-3 bg-amber-50 rounded-md">
                        <h4 className="text-sm font-medium text-amber-800">Nächste Schritte:</h4>
                        <ul className="mt-1 text-sm text-amber-700 list-disc list-inside">
                          <li>Kunde prüft die erledigte Arbeit</li>
                          <li>Kunde gibt Bewertung ab (1-5 Sterne + Text)</li>
                          <li>Kunde bestätigt den Abschluss</li>
                          <li>Geld wird für Ihre Auszahlung freigegeben</li>
                        </ul>
                      </div>
                      <div className="mt-3 p-3 bg-blue-50 rounded-md">
                        <p className="text-blue-700 text-sm">
                          💡 <strong>Tipp:</strong> Die Auszahlung erfolgt automatisch 1-2 Werktage nach der Kundenbestätigung.
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

              {/* Status-Anzeige für abgeschlossene Aufträge */}
              {order.status === 'ABGESCHLOSSEN' && (
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <FiCheckCircle className="h-6 w-6 text-green-500" aria-hidden="true" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-green-800">Auftrag abgeschlossen</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Dieser Auftrag wurde erfolgreich abgeschlossen. Das Geld wurde über unser Treuhand-System freigegeben.
                      </p>
                      <div className="mt-3 p-3 bg-green-50 rounded-md">
                        <h4 className="text-sm font-medium text-green-800">Status-Informationen:</h4>
                        <ul className="mt-1 text-sm text-green-700 list-disc list-inside">
                          <li>✅ Auftrag erfolgreich abgeschlossen</li>
                          <li>✅ Geld für Auszahlungen freigegeben</li>
                          <li>✅ Kunde wurde benachrichtigt</li>
                          <li>✅ Bewertungssystem ist aktiviert</li>
                        </ul>
                      </div>
                      {isViewerProvider && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-md">
                          <p className="text-sm text-blue-700">
                            <strong>Auszahlung:</strong> Das Geld wird über unser Treuhand-System automatisch ausgezahlt. 
                            Standard-Auszahlungszeiten: 1-2 Werktage für SEPA-Überweisungen.
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
