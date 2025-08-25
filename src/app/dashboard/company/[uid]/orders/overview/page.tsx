'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Filter as FiFilter,
  MoreVertical as FiMoreVertical,
  Package as FiPackage,
  Clock as FiClock,
  Search as FiSearch,
  ChevronDown as FiChevronDown,
  Inbox as FiInbox,
  Loader2 as FiLoader,
  Folder as FiFolder,
  User as FiUser,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { callHttpsFunction } from '@/lib/httpsFunctions';
import { useAuth } from '@/contexts/AuthContext';

// Vereinfachtes Interface für Auftragsdaten aus Anbietersicht
interface Order {
  id: string;
  selectedSubcategory: string;
  customerName: string; // Name des Kunden
  customerAvatarUrl?: string; // Profilbild des Kunden
  projectName?: string; // Falls vorhanden
  projectTitle?: string; // B2B Project Title
  providerName?: string; // Name des Anbieters (für erstellte Aufträge)
  orderedBy: string; // customerFirebaseUid
  orderDate?: { _seconds: number; _nanoseconds: number } | string;
  totalAmountPaidByBuyer: number;
  status:
    | 'AKTIV'
    | 'ABGESCHLOSSEN'
    | 'STORNIERT'
    | 'FEHLENDE DETAILS'
    | 'IN BEARBEITUNG'
    | 'BEZAHLT'
    | 'ZAHLUNG_ERHALTEN_CLEARING'
    | 'zahlung_erhalten_clearing'
    | 'abgelehnt_vom_anbieter';
  uid: string; // Die UID des Anbieters (dieses Unternehmens)
  projectId?: string;
  currency?: string;
  paymentType?: string; // B2B payment type
  customerType?: string; // 'firma' for B2B
}

type OrderStatusFilter = 'ALLE' | 'AKTIV' | 'ABGESCHLOSSEN' | 'STORNIERT';
type OrderTypeFilter = 'EINGEGANGEN' | 'ERSTELLT';

const CompanyOrdersOverviewPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uidFromParams = params?.uid as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [createdOrders, setCreatedOrders] = useState<Order[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OrderStatusFilter>('ALLE');
  const [orderType, setOrderType] = useState<OrderTypeFilter>('EINGEGANGEN');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) {
      setError('Bitte melden Sie sich an, um Ihre Aufträge anzuzeigen.');
      setIsLoading(false);
      return;
    }

    // Sicherheitsüberprüfung: Nur der Inhaber des Dashboards darf seine Aufträge sehen
    if (uidFromParams && user.uid !== uidFromParams) {
      setError('Zugriff verweigert. Sie sind nicht berechtigt, diese Aufträge einzusehen.');
      setIsLoading(false);
      return;
    }

    const fetchOrders = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Lade eingegangene Aufträge (wo Company der Anbieter ist)
        const incomingResult = await callHttpsFunction(
          'getProviderOrders',
          { providerId: uidFromParams },
          'GET'
        );

        if (incomingResult && Array.isArray(incomingResult.orders)) {
          const visibleIncomingOrders = incomingResult.orders.filter(
            (order: any) => order.status !== 'abgelehnt_vom_anbieter'
          );
          setOrders(visibleIncomingOrders);
        } else {
          setOrders([]);
        }

        // Lade erstellte Aufträge (wo Company der Kunde ist)
        const createdResult = await callHttpsFunction(
          'getUserOrders',
          { userId: uidFromParams },
          'GET'
        );

        if (createdResult && Array.isArray(createdResult.orders)) {
          // Filtere B2B-Aufträge (customerType === 'firma')
          const b2bOrders = createdResult.orders.filter(
            (order: any) => order.customerType === 'firma' || order.paymentType === 'b2b_project'
          );
          setCreatedOrders(b2bOrders);
        } else {
          setCreatedOrders([]);
        }

        // Lade Angebotsanfragen für diesen Anbieter
        try {
          const response = await fetch(`/api/quote-requests/${uidFromParams}`);
          const quoteResult = await response.json();

          if (quoteResult.success && Array.isArray(quoteResult.quoteRequests)) {
            setQuoteRequests(quoteResult.quoteRequests);
          } else {
            setQuoteRequests([]);
          }
        } catch (quoteErr) {

          setQuoteRequests([]);
        }
      } catch (err: any) {
        const errorMessage = err.message || 'Ein unbekannter Fehler ist aufgetreten.';
        setError(`Aufträge konnten nicht geladen werden: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, [user, uidFromParams, router]);

  const filteredOrders = useMemo(() => {
    let currentOrders: any[] = [];

    if (orderType === 'EINGEGANGEN') {
      currentOrders = orders;
    } else if (orderType === 'ERSTELLT') {
      currentOrders = createdOrders;
    }

    if (activeTab === 'ALLE') return currentOrders;

    // Original Filter-Logik für Aufträge
    return currentOrders.filter(order => {
      if (activeTab === 'AKTIV')
        return (
          order.status === 'AKTIV' ||
          order.status === 'IN BEARBEITUNG' ||
          order.status === 'FEHLENDE DETAILS' ||
          order.status === 'BEZAHLT' ||
          order.status === 'ZAHLUNG_ERHALTEN_CLEARING' ||
          order.status === 'zahlung_erhalten_clearing'
        );
      return order.status === activeTab;
    });
  }, [orders, createdOrders, quoteRequests, activeTab, orderType]);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'ABGESCHLOSSEN':
        return 'text-green-600 bg-green-100';
      case 'AKTIV':
      case 'IN BEARBEITUNG':
      case 'BEZAHLT':
      case 'ZAHLUNG_ERHALTEN_CLEARING':
      case 'zahlung_erhalten_clearing':
        return 'text-blue-600 bg-blue-100';
      case 'STORNIERT':
        return 'text-red-600 bg-red-100';
      case 'FEHLENDE DETAILS':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatOrderDate = (date: Order['orderDate']): string => {
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

  const formatPrice = (priceInCents: number, currency?: string | null): string => {
    const amount = (priceInCents || 0) / 100; // Add fallback for safety to prevent NaN
    const validCurrency = currency || 'EUR';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: validCurrency }).format(
      amount
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <FiLoader className="animate-spin text-3xl text-teal-500" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-[var(--global-header-height)]">
      {' '}
      {/* Füge Padding für den sticky Header hinzu */}
      <h1 className="text-3xl font-semibold text-gray-800 mb-6">Aufträge</h1>
      {/* Order Type Tabs - Eingegangene vs Erstellte Aufträge */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Order Types">
          {(['EINGEGANGEN', 'ERSTELLT'] as OrderTypeFilter[]).map(type => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm
                ${
                  orderType === type
                    ? 'border-[#14ad9f] text-[#14ad9f]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {type === 'EINGEGANGEN' ? 'Eingegangene Aufträge' : 'Erstellte Aufträge'}
              <span
                className={`ml-2 py-0.5 px-2 rounded-full text-xs font-medium ${
                  orderType === type
                    ? 'bg-[#14ad9f]/10 text-[#14ad9f]'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {type === 'EINGEGANGEN'
                  ? orders.length
                  : type === 'ERSTELLT'
                    ? createdOrders.length
                    : quoteRequests.length}
              </span>
            </button>
          ))}
        </nav>
      </div>
      {/* Status Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {(['ALLE', 'AKTIV', 'ABGESCHLOSSEN', 'STORNIERT'] as OrderStatusFilter[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${
                  activeTab === tab
                    ? 'border-[#14ad9f] text-[#14ad9f]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
              <span
                className={`ml-2 py-0.5 px-2 rounded-full text-xs font-medium ${
                  activeTab === tab ? 'bg-[#14ad9f]/10 text-[#14ad9f]' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {(() => {
                  if (tab === 'ALLE') {
                    if (orderType === 'EINGEGANGEN') return orders.length;
                    if (orderType === 'ERSTELLT') return createdOrders.length;
                    return 0;
                  }

                  // Für spezifische Status-Filter
                  let currentData: any[] = [];
                  if (orderType === 'EINGEGANGEN') currentData = orders;
                  else if (orderType === 'ERSTELLT') currentData = createdOrders;

                  // Filter für Aufträge
                  return currentData.filter(o => {
                    if (tab === 'AKTIV')
                      return (
                        o.status === 'AKTIV' ||
                        o.status === 'IN BEARBEITUNG' ||
                        o.status === 'FEHLENDE DETAILS' ||
                        o.status === 'BEZAHLT' ||
                        o.status === 'ZAHLUNG_ERHALTEN_CLEARING' ||
                        o.status === 'zahlung_erhalten_clearing'
                      );
                    return o.status === tab;
                  }).length;
                })()}
              </span>
            </button>
          ))}
        </nav>
      </div>
      {/* Filterleiste (vereinfacht) */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="search"
            placeholder="Aufträge durchsuchen..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
          />
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <FiFilter size={16} /> Filter
          <FiChevronDown size={16} />
        </Button>
      </div>
      {/* Auftragsliste */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <FiInbox size={48} className="mx-auto mb-4 text-gray-400" />
          {orderType === 'EINGEGANGEN'
            ? 'Keine eingegangenen Aufträge in dieser Ansicht gefunden.'
            : orderType === 'ERSTELLT'
              ? 'Keine erstellten Aufträge in dieser Ansicht gefunden.'
              : 'Keine Angebotsanfragen in dieser Ansicht gefunden.'}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul role="list" className="divide-y divide-gray-200">
            {filteredOrders.map(order => (
              <li key={order.id}>
                {/* Darstellung für Aufträge */}
                <Link
                  href={`/dashboard/company/${uidFromParams}/orders/${order.id}`}
                  className="block hover:bg-gray-50"
                >
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-[#14ad9f] truncate w-2/3">
                        {order.selectedSubcategory}
                        {order.projectTitle && (
                          <span className="ml-2 text-gray-600">- {order.projectTitle}</span>
                        )}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}
                        >
                          {order.status.replace(/_/g, ' ').charAt(0).toUpperCase() +
                            order.status.replace(/_/g, ' ').slice(1)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          <FiUser className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                          {orderType === 'EINGEGANGEN'
                            ? order.customerName
                            : 'Anbieter: ' + (order.providerName || 'Unbekannt')}
                        </p>
                        {order.projectName && (
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            <FiFolder className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                            Projekt: {order.projectName}
                          </p>
                        )}
                        {order.paymentType === 'b2b_project' && (
                          <p className="mt-2 flex items-center text-sm text-blue-600 sm:mt-0 sm:ml-6">
                            <FiPackage className="flex-shrink-0 mr-1.5 h-5 w-5 text-blue-400" />
                            B2B-Projekt
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <FiClock className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        <p>
                          {orderType === 'EINGEGANGEN' ? 'Bestellt' : 'Erstellt'} am{' '}
                          <time
                            dateTime={
                              order.orderDate
                                ? typeof order.orderDate === 'string'
                                  ? order.orderDate
                                  : new Date(order.orderDate._seconds * 1000).toISOString()
                                : undefined
                            }
                          >
                            {formatOrderDate(order.orderDate)}
                          </time>
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <p className="text-sm text-gray-900 font-semibold">
                        {formatPrice(order.totalAmountPaidByBuyer, order.currency)}
                      </p>
                      <div className="relative">
                        <button
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            alert(`Aktionen für Auftrag ${order.id}`);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <FiMoreVertical size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Paginierung (vereinfacht) */}
      {filteredOrders.length > 0 && (
        <div className="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button variant="outline">Vorherige</Button>
            <Button variant="outline" className="ml-3">
              Nächste
            </Button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Zeige <span className="font-medium">1</span> bis{' '}
                <span className="font-medium">{Math.min(10, filteredOrders.length)}</span> von{' '}
                <span className="font-medium">{filteredOrders.length}</span> Ergebnissen
              </p>
            </div>
            <div>
              <nav
                className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                aria-label="Pagination"
              >
                <Button variant="outline" className="rounded-r-none">
                  Vorherige
                </Button>
                <Button variant="outline" className="rounded-l-none">
                  Nächste
                </Button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Hilfs-Button-Komponente
const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'outline' | 'default';
    className?: string;
  }
> = ({ children, variant = 'default', className = '', ...props }) => {
  const baseStyle =
    'inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  const variantStyle =
    variant === 'outline'
      ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-teal-500'
      : 'border-teal-600 bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500';

  return (
    <button className={`${baseStyle} ${variantStyle} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default CompanyOrdersOverviewPage;
