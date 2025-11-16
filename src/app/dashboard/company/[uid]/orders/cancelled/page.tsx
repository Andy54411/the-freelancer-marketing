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
  XCircle as FiXCircle,
  AlertTriangle as FiAlertTriangle,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { callHttpsFunction } from '@/lib/httpsFunctions';
import { useAuth } from '@/contexts/AuthContext';

// Interface für Auftragsdaten
interface Order {
  id: string;
  selectedSubcategory: string;
  customerName: string;
  customerAvatarUrl?: string;
  projectName?: string;
  projectTitle?: string;
  providerName?: string;
  orderedBy: string;
  orderDate?: { _seconds: number; _nanoseconds: number } | string;
  cancelledDate?: { _seconds: number; _nanoseconds: number } | string;
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
  uid: string;
  projectId?: string;
  currency?: string;
  paymentType?: string;
  customerType?: string;
  cancellationReason?: string;
  refundAmount?: number;
  refundStatus?: 'pending' | 'completed' | 'failed';
  orderType?: 'EINGEGANGEN' | 'ERSTELLT';
}

type OrderTypeFilter = 'ALLE' | 'EINGEGANGEN' | 'ERSTELLT';

const CancelledOrdersPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uidFromParams = params.uid as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OrderTypeFilter>('ALLE');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) {
      setError('Bitte melden Sie sich an, um Ihre Aufträge anzuzeigen.');
      setIsLoading(false);
      return;
    }

    if (uidFromParams && user.uid !== uidFromParams) {
      setError('Zugriff verweigert. Sie sind nicht berechtigt, diese Aufträge einzusehen.');
      setIsLoading(false);
      return;
    }

    const fetchOrders = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let allOrders: Order[] = [];

        // Lade eingegangene Aufträge (wo Company der Anbieter ist)
        const providerResult = await callHttpsFunction(
          'getProviderOrders',
          { providerId: uidFromParams },
          'GET'
        );

        if (providerResult && Array.isArray(providerResult.orders)) {
          const cancelledProviderOrders = providerResult.orders
            .filter(
              (order: any) =>
                order.status === 'STORNIERT' || order.status === 'abgelehnt_vom_anbieter'
            )
            .map((order: any) => ({ ...order, orderType: 'EINGEGANGEN' }));
          allOrders = [...allOrders, ...cancelledProviderOrders];
        }

        // Lade erstellte Aufträge (wo Company der Kunde ist)
        const customerResult = await callHttpsFunction(
          'getUserOrders',
          { userId: uidFromParams },
          'GET'
        );

        if (customerResult && Array.isArray(customerResult.orders)) {
          const cancelledCustomerOrders = customerResult.orders
            .filter((order: any) => order.status === 'STORNIERT')
            .map((order: any) => ({ ...order, orderType: 'ERSTELLT' }));
          allOrders = [...allOrders, ...cancelledCustomerOrders];
        }

        // Sortiere nach Stornierungsdatum (neueste zuerst)
        allOrders.sort((a, b) => {
          const dateA = a.cancelledDate || a.orderDate;
          const dateB = b.cancelledDate || b.orderDate;

          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;

          const timestampA =
            typeof dateA === 'string' ? new Date(dateA).getTime() : dateA._seconds * 1000;
          const timestampB =
            typeof dateB === 'string' ? new Date(dateB).getTime() : dateB._seconds * 1000;

          return timestampB - timestampA;
        });

        setOrders(allOrders);
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
    let filtered = orders;

    // Filter nach Order-Typ
    if (activeTab !== 'ALLE') {
      filtered = filtered.filter(order => order.orderType === activeTab);
    }

    // Filter nach Suchbegriff
    if (searchTerm) {
      filtered = filtered.filter(order => {
        const searchIn =
          activeTab === 'ERSTELLT' || order.orderType === 'ERSTELLT'
            ? order.providerName // Bei erstellten Aufträgen suche nach Anbieter
            : order.customerName; // Bei eingegangenen Aufträgen suche nach Kunde

        return (
          searchIn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.selectedSubcategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.projectTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.cancellationReason?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    return filtered;
  }, [orders, activeTab, searchTerm]);

  const formatDate = (
    dateInput: { _seconds: number; _nanoseconds: number } | string | undefined
  ) => {
    if (!dateInput) return 'Unbekannt';

    let date: Date;
    if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else {
      date = new Date(dateInput._seconds * 1000);
    }

    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'STORNIERT':
        return 'bg-red-100 text-red-800';
      case 'abgelehnt_vom_anbieter':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'abgelehnt_vom_anbieter':
        return 'Vom Anbieter abgelehnt';
      case 'STORNIERT':
        return 'Storniert';
      default:
        return status;
    }
  };

  const getRefundStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRefundStatusText = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'Erstattet';
      case 'pending':
        return 'Erstattung ausstehend';
      case 'failed':
        return 'Erstattung fehlgeschlagen';
      default:
        return 'Keine Erstattung';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mb-4" />
        <p className="text-gray-600">Lade stornierte Aufträge...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Fehler beim Laden der Aufträge</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiXCircle className="text-red-600" />
              Stornierte Aufträge
            </h1>
            <p className="text-gray-600 mt-1">
              Übersicht aller stornierten und abgelehnten Aufträge
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              {filteredOrders.length} von {orders.length} Aufträgen
            </span>
          </div>
        </div>
      </div>

      {/* Filter und Suche */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Order Type Filter Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {(['ALLE', 'EINGEGANGEN', 'ERSTELLT'] as OrderTypeFilter[]).map(type => (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === type ? 'bg-[#14ad9f] text-white' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Suchfeld */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Aufträge durchsuchen..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f] w-full lg:w-64"
            />
          </div>
        </div>
      </div>

      {/* Aufträge Liste */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FiXCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Keine stornierten Aufträge gefunden
          </h3>
          <p className="text-gray-600">
            {searchTerm
              ? 'Keine Aufträge entsprechen Ihren Suchkriterien.'
              : 'Sie haben keine stornierten Aufträge.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {activeTab === 'ERSTELLT'
                      ? 'Anbieter'
                      : activeTab === 'EINGEGANGEN'
                        ? 'Kunde'
                        : 'Partner'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Betrag
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Erstattung
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Storniert am
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Typ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="shrink-0 h-10 w-10">
                          <FiUser className="h-10 w-10 text-gray-400 bg-gray-100 rounded-full p-2" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {order.orderType === 'ERSTELLT'
                              ? order.providerName || 'Unbekannter Anbieter'
                              : order.customerName || 'Unbekannter Kunde'}
                          </div>
                          {order.paymentType === 'b2b_project' && (
                            <div className="text-xs text-blue-600 font-medium">B2B Projekt</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {order.projectTitle || order.projectName || order.selectedSubcategory}
                      </div>
                      {order.selectedSubcategory && order.projectTitle && (
                        <div className="text-xs text-gray-500">{order.selectedSubcategory}</div>
                      )}
                      {order.cancellationReason && (
                        <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <FiAlertTriangle className="h-3 w-3" />
                          {order.cancellationReason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(order.totalAmountPaidByBuyer, order.currency)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {getStatusText(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRefundStatusColor(
                          order.refundStatus
                        )}`}
                      >
                        {getRefundStatusText(order.refundStatus)}
                      </span>
                      {order.refundAmount && (
                        <div className="text-xs text-gray-500 mt-1">
                          {formatCurrency(order.refundAmount, order.currency)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.cancelledDate || order.orderDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          order.orderType === 'EINGEGANGEN'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {order.orderType === 'EINGEGANGEN' ? 'Eingegangen' : 'Erstellt'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/dashboard/company/${uidFromParams}/orders/${order.id}`}
                        className="text-[#14ad9f] hover:text-[#129488] transition-colors"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CancelledOrdersPage;
