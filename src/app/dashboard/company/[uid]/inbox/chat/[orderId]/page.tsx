'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp for type checking
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/firebase/clients';
import { useAuth } from '@/contexts/AuthContext';

// Icons
import {
  Loader2 as FiLoader,
  AlertCircle as FiAlertCircle,
  ArrowLeft as FiArrowLeft,
  FileText as FiFileText,
  Calendar as FiCalendar,
  DollarSign as FiDollarSign,
  Clock as FiClock,
  Slash as FiSlash,
} from 'lucide-react';

import UserInfoCard from '@/components/UserInfoCard';
import ChatComponent from '@/components/ChatComponent';

// Interface für die Auftragsdaten, die auf dieser Seite benötigt werden
export interface OrderData {
  // Exporting for potential reuse
  id: string;
  serviceTitle: string;
  providerId: string; // This is the selectedAnbieterId
  customerId: string; // This is the kundeId or customerFirebaseUid
  customerName: string;
  customerAvatarUrl?: string;
  orderDate?: Timestamp | Date | string; // Use the official Timestamp type
  priceInCents: number;
  beschreibung?: string;
  jobDateFrom?: string;
  jobDateTo?: string;
  jobTimePreference?: string;
  status: string;
}

// Interface für die Teilnehmerdetails, die von der Cloud Function zurückgegeben werden
interface ParticipantDetails {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export default function CompanyChatPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = typeof params?.orderId === 'string' ? params.orderId : '';
  const companyUid = typeof params?.uid === 'string' ? params.uid : '';

  const { user: currentUser, loading: authLoading } = useAuth();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!currentUser) {
      const currentPath = window.location.pathname + window.location.search;
      router.replace(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (!orderId || !companyUid) {
      setError('Auftrags- oder Firmen-ID in der URL fehlt.');
      setLoading(false);
      return;
    }

    if (currentUser.uid !== companyUid) {
      setError('Zugriff verweigert. Sie sind nicht berechtigt, diese Seite anzuzeigen.');
      setLoading(false);
      return;
    }

    const fetchOrderAndParticipants = async () => {
      setLoading(true);
      setError(null);
      let orderDataFromDb;

      // Step 1: Fetch the order with its own error handling
      try {
        const orderDocRef = doc(db, 'auftraege', orderId);
        const orderDocSnap = await getDoc(orderDocRef);

        if (!orderDocSnap.exists()) {
          setError('Auftrag nicht gefunden.');
          setLoading(false);
          return;
        }
        orderDataFromDb = orderDocSnap.data();
      } catch (err: any) {

        if (err.code === 'permission-denied') {
          setError(
            'Zugriff auf diesen Auftrag verweigert. Dies liegt wahrscheinlich an inkonsistenten Auftragsdaten (z.B. eine fehlende Anbieter-ID). Bitte kontaktieren Sie den Support.'
          );
        } else {
          setError(`Fehler beim Laden des Auftrags: ${err.message || 'Unbekannter Fehler'}`);
        }
        setLoading(false);
        return;
      }

      // Step 2: Fetch customer details using a secure Cloud Function to bypass client-side security rule limitations.
      try {
        const getOrderParticipantDetails = httpsCallable<
          { orderId: string },
          { provider: ParticipantDetails; customer: ParticipantDetails }
        >(functions, 'getOrderParticipantDetails');

        const result = await getOrderParticipantDetails({ orderId });
        const { customer: customerDetails } = result.data;

        const customerId = orderDataFromDb.customerFirebaseUid || orderDataFromDb.kundeId;
        if (!customerId) {
          setError('Kundeninformationen im Auftrag unvollständig.');
          setLoading(false);
          return;
        }

        const orderData: OrderData = {
          id: orderId,
          serviceTitle: orderDataFromDb.selectedSubcategory || 'Dienstleistung',
          providerId: orderDataFromDb.selectedAnbieterId,
          customerId: customerId,
          customerName: customerDetails.name, // Use name from the Cloud Function
          customerAvatarUrl: customerDetails.avatarUrl || undefined, // Use avatar from the Cloud Function
          orderDate: orderDataFromDb.paidAt || orderDataFromDb.createdAt,
          priceInCents: orderDataFromDb.jobCalculatedPriceInCents || 0,
          status: orderDataFromDb.status || 'unbekannt',
          beschreibung: orderDataFromDb.description || 'Keine Beschreibung vorhanden.',
          jobDateFrom: orderDataFromDb.jobDateFrom,
          jobDateTo: orderDataFromDb.jobDateTo,
          jobTimePreference: orderDataFromDb.jobTimePreference,
        };

        setOrder(orderData);
      } catch (err: any) {

        if (err.code === 'permission-denied' || err.code === 'functions/permission-denied') {
          setError(
            'Zugriff auf Kundendetails verweigert. Dies kann an fehlenden Berechtigungen (Custom Claims) für Ihr Firmenkonto liegen. Bitte kontaktieren Sie den Support.'
          );
        } else {
          setError(`Fehler beim Laden der Kundendetails: ${err.message || 'Unbekannter Fehler'}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrderAndParticipants();
  }, [authLoading, currentUser, orderId, router, companyUid]);

  const formatPrice = (priceInCents: number): string => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
      priceInCents / 100
    );
  };

  const formatOrderDate = (date: OrderData['orderDate']): string => {
    if (!date) return 'Unbekannt';

    if (date instanceof Timestamp) {
      return date
        .toDate()
        .toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (date instanceof Date) {
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (typeof date === 'string') {
      return new Date(date).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }

    return 'Unbekannt';
  };

  const formatJobDateRange = (from?: string, to?: string, time?: string): string => {
    if (!from) return 'Kein Datum angegeben';
    const fromDate = new Date(from).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
    const toDate =
      to && to !== from
        ? new Date(to).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
        : null;
    const timeString = time ? ` um ${time} Uhr` : '';
    return toDate ? `${fromDate} - ${toDate}${timeString}` : `${fromDate}${timeString}`;
  };

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-screen pt-[var(--global-header-height)]">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        Lade Chat...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen pt-[var(--global-header-height)] p-4 text-center">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md"
          role="alert"
        >
          <FiAlertCircle size={24} className="inline mr-2" />
          <strong className="font-bold">Fehler:</strong>
          <span className="block sm:inline ml-1">{error}</span>
        </div>
      </div>
    );
  }

  if (!order) {
    return null; // Should be handled by error state
  }

  return (
    <Suspense fallback={<div>Lade Chat-Interface...</div>}>
      <main className="flex flex-1 bg-gray-50 overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-white">
            <button
              onClick={() => router.back()}
              className="text-[#14ad9f] hover:underline flex items-center gap-2 mb-2 text-sm"
            >
              <FiArrowLeft /> Zurück zum Posteingang
            </button>
            <h1 className="text-xl font-semibold text-gray-800 truncate">{order.serviceTitle}</h1>
            <p className="text-sm text-gray-500">Mit {order.customerName}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {['abgelehnt_vom_anbieter', 'STORNIERT', 'zahlung_erhalten_clearing'].includes(
              order.status
            ) ? (
              <div className="flex h-full flex-col items-center justify-center text-center bg-gray-100 rounded-lg p-4">
                <FiSlash className="text-4xl text-gray-400 mb-3" />
                <h3 className="text-lg font-semibold text-gray-700">Chat deaktiviert</h3>
                <p className="text-gray-500 text-sm">
                  {order.status === 'zahlung_erhalten_clearing'
                    ? 'Bitte nehmen Sie den Auftrag zuerst an, um den Chat zu aktivieren.'
                    : 'Für diesen Auftrag ist der Chat nicht verfügbar.'}
                </p>
              </div>
            ) : (
              <ChatComponent
                orderId={orderId}
                participants={{ customerId: order.customerId, providerId: order.providerId }}
                orderStatus={order.status}
              />
            )}
          </div>
        </div>

        {/* Order Details Sidebar */}
        <aside className="w-80 border-l border-gray-200 bg-white p-6 flex-col hidden lg:flex">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Auftragsdetails</h2>
          <div className="space-y-4 text-sm text-gray-600">
            <div className="flex items-center">
              <FiFileText className="mr-3 text-gray-400 flex-shrink-0" />
              <span className="truncate">Auftrag #{order.id}</span>
            </div>
            <div className="flex items-center">
              <FiDollarSign className="mr-3 text-gray-400 flex-shrink-0" />
              <span>{formatPrice(order.priceInCents)}</span>
            </div>
            <div className="flex items-center">
              <FiCalendar className="mr-3 text-gray-400 flex-shrink-0" />
              <span>Bestellt am: {formatOrderDate(order.orderDate)}</span>
            </div>
            <div className="flex items-center">
              <FiClock className="mr-3 text-gray-400 flex-shrink-0" />
              <span>
                {formatJobDateRange(order.jobDateFrom, order.jobDateTo, order.jobTimePreference)}
              </span>
            </div>
            <div className="pt-2">
              <p className="font-semibold text-gray-700 mb-1">Beschreibung:</p>
              <p className="text-gray-600 whitespace-pre-wrap break-words">{order.beschreibung}</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-base font-semibold text-gray-800 mb-3">Kunde</h3>
            <UserInfoCard
              userId={order.customerId}
              userName={order.customerName}
              userAvatarUrl={order.customerAvatarUrl}
              userRole="customer"
            />
          </div>
        </aside>
      </main>
    </Suspense>
  );
}
