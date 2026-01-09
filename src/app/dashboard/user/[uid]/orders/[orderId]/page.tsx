// src/app/dashboard/user/[uid]/orders/[orderId]/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSingleOrder } from '@/app/api/getSingleOrder';
import { getOrderParticipantDetails } from '@/app/api/getOrderParticipantDetails';

// Icons für UI
import {
  FiAlertCircle,
  FiMessageSquare,
  FiArrowLeft,
  FiSlash,
  FiCheckCircle,
} from 'react-icons/fi'; // FiUser hinzugefügt

import UserInfoCard from '@/components/UserInfoCard';

// Die Chat-Komponente
import ChatComponent from '@/components/ChatComponent';
// Rechnungsbereich
import OrderInvoiceSection from '@/components/orders/OrderInvoiceSection';
// Escrow Payment-Komponente
import { EscrowPaymentComponent } from '@/components/EscrowPaymentComponent';
// Stunden-Übersicht Komponente
import HoursBillingOverview from '@/components/HoursBillingOverview';
// Order Completion Komponente
import OrderCompletionModal from '@/components/orders/OrderCompletionModal';
// Storno-Komponente
import StornoButtonSection from '@/components/storno/StornoButtonSection';

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

  // KORRIGIERT: Direktere Parameter-Extraktion für Next.js 15
  const [orderId, setOrderId] = useState<string>('');

  useEffect(() => {
    // Direkter Zugriff auf params.orderId mit Fallback-Strategie
    let extractedId = '';

    if (params?.orderId) {
      if (typeof params.orderId === 'string') {
        extractedId = params.orderId;
      } else if (Array.isArray(params.orderId)) {
        extractedId = params.orderId[0] || '';
      }
    }

    // Fallback: Extrahiere aus der aktuellen URL
    if (!extractedId && typeof window !== 'undefined') {
      const pathSegments = window.location.pathname.split('/');
      const orderIndex = pathSegments.findIndex(segment => segment === 'orders');
      if (orderIndex >= 0 && pathSegments[orderIndex + 1]) {
        extractedId = pathSegments[orderIndex + 1];
      }
    }

    if (extractedId && extractedId !== orderId) {
      setOrderId(extractedId);
    }
  }, [params, orderId]);

  const { user: currentUser, loading: authLoading, firebaseUser } = useAuth(); // KORREKTUR: useAuth Hook korrekt verwenden mit firebaseUser

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_isUpdating, setIsUpdating] = useState(false); // NEU: Ladezustand für Aktionen
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // NEU: Success feedback

  // Payment Modal States (Escrow-System)
  const [showInlinePayment, setShowInlinePayment] = useState(false);
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
      const currentPath = window.location.pathname + window.location.search;
      router.replace(`/?redirectTo=${encodeURIComponent(currentPath)}`);
      return;
    }

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

        // Load initial order data via API (with proper authorization)
        const orderData = await getSingleOrder(orderId, idToken);

        // Get participant details
        const { provider: providerDetails, customer: customerDetails } =
          await getOrderParticipantDetails(orderId, idToken);

        const mappedOrderData: OrderData = {
          id: orderData.id,
          serviceTitle: orderData.selectedSubcategory || orderData.unterkategorie || 'Unbekannter Service',
          providerId: orderData.selectedAnbieterId || '',
          providerName: orderData.providerName || providerDetails?.name || 'Unbekannter Anbieter',
          providerAvatarUrl: providerDetails?.avatarUrl || null,
          customerId: orderData.kundeId || orderData.customerFirebaseUid || '',
          customerName: orderData.customerName || customerDetails?.name || 'Unbekannter Kunde',
          customerAvatarUrl: customerDetails?.avatarUrl || null,
          orderDate: orderData.paidAt || orderData.createdAt,
          // Preis-Mapping: Verschiedene Quellen in korrekter Priorität
          priceInCents: orderData.jobCalculatedPriceInCents || orderData.totalPriceInCents || orderData.totalAmountPaidByBuyer || (orderData.price ? Math.round(orderData.price * 100) : 0) || (orderData.totalAmount ? Math.round(orderData.totalAmount * 100) : 0),
          status: orderData.status || 'Unbekannt',
          selectedCategory: orderData.selectedCategory || orderData.kategorie,
          selectedSubcategory: orderData.selectedSubcategory || orderData.unterkategorie,
          jobTotalCalculatedHours: orderData.jobTotalCalculatedHours,
          jobDurationString: orderData.jobDurationString || orderData.auftragsDauer,
          beschreibung: orderData.description || orderData.beschreibung,
          jobDateFrom: orderData.jobDateFrom,
          jobDateTo: orderData.jobDateTo,
          jobTimePreference: orderData.jobTimePreference || orderData.time,
          // Berechne totalAmountPaidByBuyer aus verfügbaren Preisfeldern
          totalAmountPaidByBuyer: orderData.totalAmountPaidByBuyer || orderData.jobCalculatedPriceInCents || orderData.totalPriceInCents || (orderData.price ? Math.round(orderData.price * 100) : 0),
          companyNetAmount: orderData.companyNetAmount,
          platformFeeAmount: orderData.platformFeeAmount,
          companyStripeAccountId: orderData.companyStripeAccountId,
        };

        setOrder(mappedOrderData);
        setLoadingOrder(false);
      } catch (err: any) {
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
    return () => {};
  }, [authLoading, currentUser?.uid, orderId, router]); // firebaseUser entfernt, da es sich häufig ändert

  // Payment Modal State Monitor (Escrow-System)
  useEffect(() => {}, [showInlinePayment, paymentAmount, paymentHours]);

  // Order Completion Handlers
  const handleCompleteOrder = () => {
    setShowCompletionModal(true);
  };

  const handleOrderCompleted = () => {
    // Lokaler Status-Update - kein Reload nötig
    setOrder(prev => prev ? { ...prev, status: 'completed' } : null);
    setShowCompletionModal(false);
    setSuccessMessage(
      'Auftrag erfolgreich abgeschlossen! Sie erhalten in Kürze eine E-Mail zur Bewertung.'
    );
  };

  // NEU: Beispiel-Handler für den "Auftrag annehmen"-Button
  const _handleAcceptOrder = async () => {
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

      const _result = await response.json();

      // Real-Time-Listener aktualisiert die Daten automatisch
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist beim Annehmen des Auftrags aufgetreten.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Payment Modal Handler - kann von CustomerApprovalInterface aufgerufen werden (Escrow-System)
  const _handlePaymentRequest = (_clientSecret: string, amount: number, hours: number) => {
    // clientSecret wird nicht mehr benötigt für Escrow-System
    setPaymentAmount(amount);
    setPaymentHours(hours);
    setShowInlinePayment(true);
  };

  // Direct Payment Modal Handler - Escrow-System
  const handleOpenPayment = async () => {
    if (!orderId) return;

    try {
      // Import TimeTracker dynamisch
      const { TimeTracker } = await import('@/lib/timeTracker');

      // Hole Order Details für Payment-Berechnung
      const orderDetails = await TimeTracker.getOrderDetails(orderId);
      
      // Berechne echte Payment Hours aus OrderDetails
      const calculatedPaymentHours =
        orderDetails?.timeTracking?.timeEntries
          ?.filter((e: any) => {
            // Alle Stunden die genehmigt sind aber noch bezahlt werden müssen
            return (
              e.category === 'additional' &&
              (e.status === 'customer_approved' || e.status === 'billing_pending')
            );
          })
          ?.reduce((sum: number, e: any) => sum + e.hours, 0) || 0;

      // Berechne den Betrag (Stunden * Stundensatz)
      const hourlyRate = order?.priceInCents ? Math.round(order.priceInCents / (order.jobTotalCalculatedHours || 1)) : 0;
      const calculatedAmount = calculatedPaymentHours * hourlyRate;

      // Setze Payment-Daten für Escrow
      setPaymentAmount(calculatedAmount > 0 ? calculatedAmount : order?.priceInCents || 0);
      setPaymentHours(calculatedPaymentHours);
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
        const _entryIds = billingPendingEntries.map((e: any) => e.id);
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
        } catch {
          // Fehler beim Fix ignorieren - Real-Time-Listener wird trotzdem funktionieren
        }
      }

      setSuccessMessage('Zahlung erfolgreich abgeschlossen!');

      // Success-Nachricht nach 5 Sekunden ausblenden
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      // Fehler loggen aber Erfolg anzeigen - Zahlung war erfolgreich
      console.error('[Payment] Daten-Update Fehler:', error);
      setSuccessMessage('Zahlung erfolgreich! Status wird automatisch aktualisiert.');
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handlePaymentCancel = () => {
    setShowInlinePayment(false);
  };

  const overallLoading = loadingOrder || authLoading; // KORREKTUR: Gesamt-Ladezustand

  if (overallLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-teal-500 via-teal-600 to-teal-700 flex justify-center items-center">
        <div className="text-center">
          {/* Animated Logo */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            {/* Outer rotating ring */}
            <svg className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: '3s' }} viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="2"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeDasharray="70 200"
                strokeLinecap="round"
              />
            </svg>
            {/* Inner pulsing circle */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="30"
                fill="rgba(255,255,255,0.1)"
                className="animate-pulse"
              />
            </svg>
            {/* Taskilo T Logo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-white">T</span>
            </div>
          </div>
          <p className="text-white text-lg font-medium">
            {authLoading ? 'Authentifizierung wird geprüft...' : 'Lade Auftragsdetails...'}
          </p>
          <div className="mt-3 flex justify-center gap-1">
            <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-teal-500 via-teal-600 to-teal-700 flex flex-col justify-center items-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Fehler aufgetreten</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Bitte überprüfen Sie die URL oder kontaktieren Sie den Support.
          </p>
        </div>
      </div>
    );
  }

  if (!order || !currentUser) {
    return (
      <div className="min-h-screen bg-linear-to-br from-teal-500 via-teal-600 to-teal-700 flex flex-col justify-center items-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Auftrag nicht gefunden</h2>
          <p className="text-gray-600">
            Der Auftrag konnte nicht angezeigt werden oder Sie sind nicht angemeldet.
          </p>
        </div>
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
        <div className="min-h-screen bg-linear-to-br from-teal-500 via-teal-600 to-teal-700 flex justify-center items-center">
          <div className="text-center">
            {/* Animated Logo */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              {/* Outer rotating ring */}
              <svg className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: '3s' }} viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="2"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeDasharray="70 200"
                  strokeLinecap="round"
                />
              </svg>
              {/* Inner pulsing circle */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="30"
                  fill="rgba(255,255,255,0.1)"
                  className="animate-pulse"
                />
              </svg>
              {/* Taskilo T Logo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">T</span>
              </div>
            </div>
            <p className="text-white text-lg font-medium">Lade Benutzeroberfläche...</p>
            <div className="mt-3 flex justify-center gap-1">
              <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        </div>
      }
    >
      <main className="min-h-screen bg-gray-50">
        {/* Header mit Taskilo Gradient */}
        <div className="bg-linear-to-r from-teal-500 via-teal-600 to-teal-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <FiArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-white">{order.serviceTitle}</h1>
                  <p className="text-sm text-white/70">Auftrag #{orderId.slice(-8).toUpperCase()}</p>
                </div>
              </div>
              
              {/* Status Badge */}
              <div className={`px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm ${
                order.status === 'completed' || order.status === 'abgeschlossen'
                  ? 'bg-green-500/20 text-white border border-green-300/30'
                  : order.status === 'accepted' || order.status === 'aktiv'
                  ? 'bg-white/20 text-white border border-white/30'
                  : order.status === 'PROVIDER_COMPLETED'
                  ? 'bg-amber-500/20 text-white border border-amber-300/30'
                  : order.status === 'STORNIERT' || order.status === 'abgebrochen'
                  ? 'bg-red-500/20 text-white border border-red-300/30'
                  : 'bg-white/20 text-white border border-white/30'
              }`}>
                {(() => {
                  const status = order.status?.toLowerCase();
                  switch (status) {
                    case 'aktiv':
                    case 'accepted':
                      return 'In Bearbeitung';
                    case 'bezahlt':
                    case 'zahlung_erhalten_clearing':
                      return 'Bezahlt';
                    case 'completed':
                    case 'abgeschlossen':
                      return 'Abgeschlossen';
                    case 'provider_completed':
                      return 'Wartet auf Bestätigung';
                    case 'storniert':
                    case 'abgebrochen':
                      return 'Storniert';
                    default:
                      return order.status?.replace(/_/g, ' ');
                  }
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <FiCheckCircle className="h-5 w-5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Order Details Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-linear-to-r from-teal-500 to-teal-600 px-6 py-4">
                  <h2 className="text-lg font-semibold text-white">Auftragsdetails</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Kategorie</p>
                      <p className="text-gray-900 font-medium">
                        {order.selectedCategory || 'Nicht angegeben'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Unterkategorie</p>
                      <p className="text-gray-900 font-medium">
                        {order.selectedSubcategory || 'Nicht angegeben'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Dauer</p>
                      <p className="text-gray-900 font-medium">
                        {order.jobTotalCalculatedHours 
                          ? `${order.jobTotalCalculatedHours} Stunden`
                          : order.jobDurationString 
                          ? `${order.jobDurationString} Stunden`
                          : 'Nicht angegeben'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Gesamtpreis</p>
                      <p className="text-gray-900 font-medium text-lg">
                        {(order.priceInCents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Ausführungsdatum</p>
                      <p className="text-gray-900 font-medium">
                        {order.jobDateFrom && order.jobDateTo && order.jobDateFrom !== order.jobDateTo
                          ? `${order.jobDateFrom} - ${order.jobDateTo}`
                          : order.jobDateFrom || 'Nach Absprache'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Uhrzeit</p>
                      <p className="text-gray-900 font-medium">
                        {order.jobTimePreference || 'Flexibel'}
                      </p>
                    </div>
                  </div>
                  
                  {order.beschreibung && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <p className="text-sm text-gray-500 mb-2">Beschreibung</p>
                      <p className="text-gray-700">{order.beschreibung}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {currentUser.uid === order.customerId && (order.status === 'accepted' || order.status === 'PROVIDER_COMPLETED') && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    {order.status === 'PROVIDER_COMPLETED' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <FiCheckCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                          <div>
                            <h3 className="font-medium text-amber-800">Anbieter hat den Auftrag abgeschlossen</h3>
                            <p className="text-sm text-amber-700 mt-1">
                              Bitte prüfen Sie die Arbeit und bestätigen Sie den Abschluss.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={handleCompleteOrder}
                      className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <FiCheckCircle className="h-5 w-5" />
                      {order.status === 'PROVIDER_COMPLETED' ? 'Arbeit bestätigen' : 'Auftrag abschließen'}
                    </button>
                    <p className="text-sm text-gray-500 mt-3 text-center">
                      Nach Bestätigung wird das Geld an den Anbieter ausgezahlt.
                    </p>
                  </div>
                </div>
              )}

              {/* Storno Section */}
              {currentUser.uid === order.customerId && (
                <StornoButtonSection
                  order={order}
                  currentUser={currentUser}
                  onStornoSuccess={() => {
                    setSuccessMessage('Storno-Anfrage wurde eingereicht und wird von einem Admin geprüft.');
                  }}
                />
              )}

              {/* Hours Billing Overview */}
              {currentUser.uid === order.customerId && (
                <HoursBillingOverview
                  orderId={orderId}
                  className="bg-white rounded-xl shadow-sm border border-gray-200"
                  onPaymentRequest={handleOpenPayment}
                  isCustomerView={true}
                />
              )}

              {/* Chat Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-linear-to-r from-teal-500 to-teal-600 px-6 py-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FiMessageSquare className="h-5 w-5 text-white/80" />
                    Nachrichten
                  </h2>
                </div>
                <div className="h-[500px]">
                  {['abgelehnt_vom_anbieter', 'STORNIERT', 'zahlung_erhalten_clearing'].includes(order.status) ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                      <FiSlash className="h-12 w-12 text-gray-300 mb-3" />
                      <h3 className="font-medium text-gray-700">Chat nicht verfügbar</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {order.status === 'zahlung_erhalten_clearing'
                          ? 'Der Chat wird aktiviert, sobald der Anbieter den Auftrag angenommen hat.'
                          : 'Für diesen Auftrag ist der Chat nicht mehr verfügbar.'}
                      </p>
                    </div>
                  ) : (
                    <ChatComponent
                      orderId={orderId}
                      participants={{
                        customerId: order.customerId,
                        providerId: order.providerId,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-6">
                {/* Provider/Customer Card - Taskilo Design */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-linear-to-r from-teal-500 to-teal-600 px-6 py-4">
                    <p className="text-white/80 text-sm font-medium">
                      {cardUser.role === 'provider' ? 'Ihr Dienstleister' : 'Auftraggeber'}
                    </p>
                  </div>
                  <div className="p-6">
                    <UserInfoCard
                      userId={cardUser.id}
                      userName={cardUser.name}
                      userAvatarUrl={cardUser.avatarUrl || undefined}
                      userRole={cardUser.role}
                      showReviews={cardUser.role === 'provider'}
                      showSkills={cardUser.role === 'provider'}
                      showLanguages={true}
                      showCustomerStats={cardUser.role === 'customer'}
                      showLinkButton={true}
                      linkText="Profil ansehen"
                      size="lg"
                      layout="vertical"
                      className="border-0 shadow-none p-0"
                    />
                  </div>
                </div>

                {/* Order Timeline */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-linear-to-r from-teal-500 to-teal-600 px-6 py-3">
                    <h3 className="font-semibold text-white">Bestellübersicht</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">Auftragsnummer</span>
                      <span className="text-gray-900 font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        #{orderId.slice(-8).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">Erstellt am</span>
                      <span className="text-gray-900 text-sm">
                        {order.orderDate 
                          ? new Date(typeof order.orderDate === 'string' ? order.orderDate : order.orderDate._seconds * 1000).toLocaleDateString('de-DE')
                          : 'Unbekannt'}
                      </span>
                    </div>
                    <div className="border-t border-gray-100 pt-4 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-medium">Gesamtbetrag</span>
                        <span className="text-lg font-bold text-teal-600">
                          {(order.priceInCents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rechnungsbereich - Kunde kann Rechnung anfordern und herunterladen */}
                {(order.status === 'completed' || order.status === 'abgeschlossen' || order.status === 'PROVIDER_COMPLETED') && (
                  <OrderInvoiceSection
                    orderId={orderId}
                    userRole="customer"
                    orderStatus={order.status}
                    _providerId={order.providerId}
                    _customerId={order.customerId}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Modal (Escrow-System) */}
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
              companyNetAmount: Math.round(order.priceInCents * 0.955),
              platformFeeAmount: Math.round(order.priceInCents * 0.045),
              status: order.status,
            }}
            userId={currentUser?.uid || ''}
            onOrderCompleted={handleOrderCompleted}
          />
        )}
      </main>
    </Suspense>
  );
}
