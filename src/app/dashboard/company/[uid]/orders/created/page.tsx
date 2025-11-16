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
}

type OrderStatusFilter = 'ALLE' | 'AKTIV' | 'ABGESCHLOSSEN' | 'STORNIERT';

const CreatedOrdersPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uidFromParams = params.uid as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OrderStatusFilter>('ALLE');
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
        // Lade erstellte Aufträge (wo Company der Kunde ist)
        const createdResult = await callHttpsFunction(
          'getUserOrders',
          { userId: uidFromParams },
          'GET'
        );

        if (createdResult && Array.isArray(createdResult.orders)) {
          const visibleCreatedOrders = createdResult.orders.filter(
            (order: any) => order.status !== 'abgelehnt_vom_anbieter'
          );
          setOrders(visibleCreatedOrders);
        } else {
          setOrders([]);
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
    let filtered = orders;

    // Filter nach Status
    if (activeTab !== 'ALLE') {
      filtered = filtered.filter(order => {
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
    }

    // Filter nach Suchbegriff
    if (searchTerm) {
      filtered = filtered.filter(
        order =>
          order.providerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.selectedSubcategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.projectTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.projectName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
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
      case 'AKTIV':
      case 'IN BEARBEITUNG':
        return 'bg-blue-100 text-blue-800';
      case 'ABGESCHLOSSEN':
        return 'bg-green-100 text-green-800';
      case 'STORNIERT':
        return 'bg-red-100 text-red-800';
      case 'FEHLENDE DETAILS':
        return 'bg-orange-100 text-orange-800';
      case 'BEZAHLT':
      case 'ZAHLUNG_ERHALTEN_CLEARING':
      case 'zahlung_erhalten_clearing':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ZAHLUNG_ERHALTEN_CLEARING':
      case 'zahlung_erhalten_clearing':
        return 'Zahlung erhalten (Clearing)';
      case 'FEHLENDE DETAILS':
        return 'Fehlende Details';
      case 'IN BEARBEITUNG':
        return 'In Bearbeitung';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mb-4" />
        <p className="text-gray-600">Lade erstellte Aufträge...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Erstellte Aufträge</h1>
            <p className="text-gray-600 mt-1">
              Aufträge, die von Ihrem Unternehmen erstellt wurden
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
          {/* Status Filter Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {(['ALLE', 'AKTIV', 'ABGESCHLOSSEN', 'STORNIERT'] as OrderStatusFilter[]).map(
              status => (
                <button
                  key={status}
                  onClick={() => setActiveTab(status)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === status
                      ? 'bg-[#14ad9f] text-white'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              )
            )}
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
          <FiInbox className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Aufträge gefunden</h3>
          <p className="text-gray-600">
            {searchTerm
              ? 'Keine Aufträge entsprechen Ihren Suchkriterien.'
              : 'Sie haben noch keine erstellten Aufträge.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Anbieter
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
                    Datum
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
                          {order.providerName ? (
                            <FiUser className="h-10 w-10 text-gray-400 bg-gray-100 rounded-full p-2" />
                          ) : (
                            <FiUser className="h-10 w-10 text-gray-400 bg-gray-100 rounded-full p-2" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {order.providerName || 'Unbekannter Anbieter'}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.orderDate)}
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

export default CreatedOrdersPage;
