'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FiFilter,
  FiPackage,
  FiClock,
  FiSearch,
  FiChevronDown,
  FiInbox,
  FiFolder,
} from 'react-icons/fi';
import Link from 'next/link';
import { Button } from '@/components/ui/button'; // Importiere die Button-Komponente
import { useAuth } from '@/contexts/AuthContext';
import { getUserOrders } from '@/app/api/getUserOrders'; // Import für die HTTP API

// Dieses Interface sollte exakt dem Rückgabetyp der `getUserOrders`-Funktion entsprechen.
// Die Backend-Funktion liefert bereits alle benötigten Felder in einem sauberen Format.
interface Order {
  id: string;
  selectedSubcategory: string;
  providerName: string;
  totalAmountPaidByBuyer: number; // Verwende das Feld für den Gesamtpreis
  status:
    | 'AKTIV'
    | 'ABGESCHLOSSEN'
    | 'STORNIERT'
    | 'FEHLENDE DETAILS'
    | 'IN BEARBEITUNG'
    | 'zahlung_erhalten_clearing'
    | 'abgelehnt_vom_anbieter';
  selectedAnbieterId: string;
  currency?: string;
  paidAt?: { _seconds: number; _nanoseconds: number } | string; // Verwende das spezifische Feld
  projectName?: string;
}

type OrderStatusFilter = 'ALLE' | 'AKTIV' | 'ABGESCHLOSSEN' | 'STORNIERT';

const TABS: OrderStatusFilter[] = ['ALLE', 'AKTIV', 'ABGESCHLOSSEN', 'STORNIERT'];

const OrdersOverviewPage = () => {
  const params = useParams();
  const router = useRouter();
  const authContext = useAuth(); // Hole den gesamten AuthContext
  const uidFromParams = (params?.uid as string) || ''; // Geändert von userId zu uid

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OrderStatusFilter>('ALLE');

  useEffect(() => {
    // authContext ist durch den useAuth-Hook garantiert nicht null.
    if (authContext.loading) {
      setIsLoading(true);
      return;
    }

    const currentUser = authContext.user;

    if (!currentUser) {
      // Optional: Weiterleitung zum Login, falls kein Benutzer angemeldet ist
      // router.push('/login');
      setIsLoading(false);
      setError('Bitte melden Sie sich an, um Ihre Aufträge anzuzeigen.');
      return;
    }

    // An dieser Stelle ist currentUser garantiert nicht null.
    if (uidFromParams && currentUser.uid !== uidFromParams) {
      // Geändert von userIdFromParams zu uidFromParams
      // Optional: Sicherheitsüberprüfung, ob der angemeldete Benutzer die Aufträge dieses Dashboards sehen darf
      // router.push('/dashboard'); // Oder eine Fehlerseite
      setIsLoading(false);
      setError('Zugriff verweigert.');
      return;
    }

    // Daten abrufen, da der Benutzer authentifiziert und autorisiert ist.
    const fetchOrders = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Get ID token for authentication
        const idToken = await authContext.firebaseUser?.getIdToken();
        if (!idToken) {
          throw new Error('No authentication token available');
        }

        // Use HTTP API instead of callable function
        const orders = await getUserOrders(uidFromParams, idToken, 'customer');

        if (Array.isArray(orders)) {
          // Filtere Aufträge mit dem Status 'abgelehnt_vom_anbieter' heraus,
          // da diese in der Übersicht nicht angezeigt werden sollen.
          const visibleOrders = (orders as Order[]).filter(
            order => order.status !== 'abgelehnt_vom_anbieter'
          );
          setOrders(visibleOrders);
        } else {
          setOrders([]);
        }
      } catch (err: unknown) {
        let detailedMessage = 'Ein unbekannter Fehler ist aufgetreten.';
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.includes('Token expired')) {
          detailedMessage = 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.';
        } else if (errorMessage.includes('Unauthorized')) {
          detailedMessage = 'Sie sind nicht berechtigt, diese Aufträge zu sehen.';
        } else if (errorMessage) {
          detailedMessage = errorMessage;
        }
        setError(`Aufträge konnten nicht geladen werden: ${detailedMessage}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, [authContext, uidFromParams, router]); // Geändert von userIdFromParams zu uidFromParams

  const orderCounts = useMemo(() => {
    const counts: Record<OrderStatusFilter, number> = {
      ALLE: orders.length,
      AKTIV: 0,
      ABGESCHLOSSEN: 0,
      STORNIERT: 0,
    };
    orders.forEach(order => {
      if (
        order.status === 'AKTIV' ||
        order.status === 'IN BEARBEITUNG' ||
        order.status === 'FEHLENDE DETAILS'
      ) {
        counts.AKTIV++;
      } else if (order.status === 'ABGESCHLOSSEN' || order.status === 'STORNIERT') {
        counts[order.status]++;
      }
    });
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (activeTab === 'ALLE') return orders;
    return orders.filter(order => {
      if (activeTab === 'AKTIV')
        return (
          order.status === 'AKTIV' ||
          order.status === 'IN BEARBEITUNG' ||
          order.status === 'FEHLENDE DETAILS'
        );
      return order.status === activeTab;
    });
  }, [orders, activeTab]);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'ABGESCHLOSSEN':
        return 'text-green-600 bg-green-100';
      case 'AKTIV':
      case 'IN BEARBEITUNG':
        return 'text-blue-600 bg-blue-100';
      case 'STORNIERT':
        return 'text-red-600 bg-red-100';
      case 'FEHLENDE DETAILS':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatOrderDate = (date: Order['paidAt']): string => {
    if (typeof date === 'string' && date) {
      return new Date(date).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
    if (date && typeof date === 'object' && '_seconds' in date) {
      return new Date(date._seconds * 1000).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
    return 'Unbekanntes Datum';
  };

  const formatPrice = (priceInCents: number, currency: string = 'EUR'): string => {
    const amount = priceInCents / 100;
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: currency }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 flex justify-center items-center">
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
          <p className="text-white text-lg font-medium">Lade Aufträge...</p>
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
      <div className="min-h-screen bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 flex flex-col justify-center items-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiInbox className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Fehler aufgetreten</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header mit Taskilo Gradient */}
      <div className="bg-gradient-to-r from-teal-500 via-teal-600 to-teal-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-semibold text-white">Meine Aufträge</h1>
          <p className="text-white/70 mt-1">Übersicht aller Ihrer gebuchten Dienstleistungen</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`p-4 rounded-xl border transition-all ${
                activeTab === tab
                  ? 'bg-white border-teal-500 shadow-md ring-2 ring-teal-500/20'
                  : 'bg-white border-gray-200 hover:border-teal-300 hover:shadow-sm'
              }`}
            >
              <p className={`text-2xl font-bold ${activeTab === tab ? 'text-teal-600' : 'text-gray-900'}`}>
                {orderCounts[tab]}
              </p>
              <p className={`text-sm ${activeTab === tab ? 'text-teal-600' : 'text-gray-500'}`}>
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
              </p>
            </button>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:max-w-xs">
              <input
                type="search"
                placeholder="Aufträge durchsuchen..."
                className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 placeholder-gray-400 transition-colors"
              />
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            <Button
              variant="outline"
              className="flex items-center gap-2 border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <FiFilter size={16} /> Filter
              <FiChevronDown size={16} />
            </Button>
          </div>
        </div>

        {/* Order List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiInbox className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Keine Aufträge gefunden</h3>
            <p className="text-gray-500">In dieser Ansicht wurden keine Aufträge gefunden.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">
                {activeTab === 'ALLE' ? 'Alle Aufträge' : `${activeTab.charAt(0) + activeTab.slice(1).toLowerCase()}e Aufträge`}
              </h2>
            </div>
            <ul role="list" className="divide-y divide-gray-100">
                {filteredOrders.map(order => (
                  <li key={order.id}>
                    <Link
                      href={`/dashboard/user/${uidFromParams}/orders/${order.id}`}
                      className="block hover:bg-gray-50 transition-colors"
                    >
                      <div className="px-6 py-5">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-medium text-gray-900 truncate">
                              {order.selectedSubcategory}
                            </p>
                            <div className="flex items-center gap-4 mt-1">
                              <p className="flex items-center text-sm text-gray-500">
                                <FiPackage className="shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                {order.providerName}
                              </p>
                              {order.projectName && (
                                <p className="flex items-center text-sm text-gray-500">
                                  <FiFolder className="shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                  {order.projectName}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="ml-4 flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-lg font-semibold text-gray-900">
                                {formatPrice(order.totalAmountPaidByBuyer, order.currency)}
                              </p>
                              <p className="flex items-center justify-end text-xs text-gray-500 mt-0.5">
                                <FiClock className="shrink-0 mr-1 h-3 w-3" />
                                {formatOrderDate(order.paidAt)}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}
                            >
                              {order.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pagination */}
          {filteredOrders.length > 0 && (
            <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-sm text-gray-600">
                  Zeige <span className="font-medium text-gray-900">1</span> bis{' '}
                  <span className="font-medium text-gray-900">{Math.min(10, filteredOrders.length)}</span> von{' '}
                  <span className="font-medium text-gray-900">{filteredOrders.length}</span> Ergebnissen
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Vorherige
                  </Button>
                  <Button
                    variant="outline"
                    className="border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Nächste
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
    </main>
  );
};

export default OrdersOverviewPage;
