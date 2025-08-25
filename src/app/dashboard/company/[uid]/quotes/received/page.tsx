'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Filter as FiFilter,
  Search as FiSearch,
  ChevronDown as FiChevronDown,
  Inbox as FiInbox,
  Loader2 as FiLoader,
  Building as FiBuilding,
  User as FiUser,
  FileText as FiFileText,
  Calendar as FiCalendar,
  CheckCircle as FiCheckCircle,
  Clock as FiClock,
  XCircle as FiXCircle,
  Eye as FiEye,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Interface für erhaltene Angebote
interface ReceivedQuote {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  status: 'pending' | 'responded' | 'accepted' | 'declined';
  budget?: string;
  budgetRange?: string;
  location?: string;
  urgency?: string;
  estimatedDuration?: string;
  preferredStartDate?: string;
  additionalNotes?: string;
  provider: {
    name: string;
    type: 'user' | 'company';
    email: string;
    avatar?: string;
    uid: string;
  };
  hasResponse: boolean;
  response?: any;
  responseDate?: Date;
  createdAt: Date;
  payment?: {
    provisionStatus: 'pending' | 'paid' | 'failed';
    provisionAmount: number;
    provisionPaymentIntentId?: string;
    paymentIntentId?: string;
    createdAt?: string;
    paidAt?: string;
  };
}

export default function ReceivedQuotesPage() {
  const params = useParams();
  const router = useRouter();
  const { firebaseUser } = useAuth();

  const [quotes, setQuotes] = useState<ReceivedQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Lade erhaltene Angebote
  const fetchReceivedQuotes = async () => {
    try {
      if (!firebaseUser || !params?.uid) return;

      const token = await firebaseUser.getIdToken();
      if (!token) return;

      const response = await fetch(`/api/company/${params.uid}/quotes/received`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.quotes) {
          const validQuotes = data.quotes.filter((quote: any) => quote && quote.id);

          setQuotes(validQuotes);
        }
      } else {

      }
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (firebaseUser && params?.uid) {
      fetchReceivedQuotes();
    }
  }, [firebaseUser, params?.uid]);

  // Filter Angebote
  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch =
      quote.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.provider?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.category?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    const matchesType = typeFilter === 'all' || quote.provider?.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Statistiken
  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === 'pending').length,
    responded: quotes.filter(q => q.hasResponse).length,
    fromCompanies: quotes.filter(q => q.provider?.type === 'company').length,
    fromUsers: quotes.filter(q => q.provider?.type === 'user').length,
  };

  // Format Date
  const formatDate = (date: Date | string | number | undefined | null) => {
    if (!date) return 'Unbekannt';

    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return 'Unbekannt';
      }

      return new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(dateObj);
    } catch (error) {

      return 'Unbekannt';
    }
  };

  // Format Budget
  const formatBudget = (budget?: { min: number; max: number; currency: string } | string) => {
    if (!budget) return 'Nicht angegeben';

    // Handle string budget (like "1.000€ - 2.500€")
    if (typeof budget === 'string') {
      return budget;
    }

    // Handle object budget
    return `${budget.min.toLocaleString('de-DE')} - ${budget.max.toLocaleString('de-DE')} ${budget.currency}`;
  };

  // Status Badge
  const getStatusBadge = (status: string, hasResponse: boolean, paymentStatus?: string) => {
    if (hasResponse) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
          <FiCheckCircle className="mr-1 h-3 w-3" />
          Angebot erhalten
        </span>
      );
    }

    // Special handling for accepted status - check payment
    if (status === 'accepted') {
      if (paymentStatus === 'paid') {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
            <FiCheckCircle className="mr-1 h-3 w-3" />
            Angenommen
          </span>
        );
      } else {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            <FiClock className="mr-1 h-3 w-3" />
            Wird verarbeitet
          </span>
        );
      }
    }

    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      responded: 'bg-blue-100 text-blue-800 border-blue-200',
      accepted: 'bg-green-100 text-green-800 border-green-200',
      declined: 'bg-red-100 text-red-800 border-red-200',
    };

    const statusLabels = {
      pending: 'Wartend',
      responded: 'Beantwortet',
      accepted: 'Angenommen',
      declined: 'Abgelehnt',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[status] || statusStyles.pending}`}
      >
        <FiClock className="mr-1 h-3 w-3" />
        {statusLabels[status] || 'Unbekannt'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FiLoader className="animate-spin h-8 w-8 text-[#14ad9f]" />
        <span className="ml-2 text-gray-600">Lade erhaltene Angebote...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Erhaltene Angebote</h1>
            <p className="mt-1 text-gray-500">
              Angebote die andere Dienstleister Ihnen gesendet haben
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-[#14ad9f]">{stats.total}</div>
            <div className="text-sm text-gray-500">Angebote erhalten</div>
          </div>
        </div>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <FiClock className="h-5 w-5 text-yellow-600" />
            <div className="ml-3">
              <div className="text-lg font-semibold text-gray-900">{stats.pending}</div>
              <div className="text-sm text-gray-500">Wartend</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <FiCheckCircle className="h-5 w-5 text-blue-600" />
            <div className="ml-3">
              <div className="text-lg font-semibold text-gray-900">{stats.responded}</div>
              <div className="text-sm text-gray-500">Beantwortet</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <FiBuilding className="h-5 w-5 text-purple-600" />
            <div className="ml-3">
              <div className="text-lg font-semibold text-gray-900">{stats.fromCompanies}</div>
              <div className="text-sm text-gray-500">Von Unternehmen</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <FiUser className="h-5 w-5 text-green-600" />
            <div className="ml-3">
              <div className="text-lg font-semibold text-gray-900">{stats.fromUsers}</div>
              <div className="text-sm text-gray-500">Von Einzelpersonen</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <FiFileText className="h-5 w-5 text-[#14ad9f]" />
            <div className="ml-3">
              <div className="text-lg font-semibold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Gesamt</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter und Suche */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Suchen nach Projekt, Anbieter oder Kategorie..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            >
              <option value="all">Alle Status</option>
              <option value="pending">Wartend</option>
              <option value="responded">Beantwortet</option>
              <option value="accepted">Angenommen</option>
              <option value="declined">Abgelehnt</option>
            </select>

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            >
              <option value="all">Alle Typen</option>
              <option value="company">Von Unternehmen</option>
              <option value="user">Von Einzelpersonen</option>
            </select>
          </div>
        </div>
      </div>

      {/* Angebote Liste */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredQuotes.length === 0 ? (
          <div className="text-center py-12">
            <FiInbox className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Angebote gefunden</h3>
            <p className="mt-1 text-sm text-gray-500">
              {quotes.length === 0
                ? 'Sie haben noch keine Angebote erhalten.'
                : 'Keine Angebote entsprechen den aktuellen Filterkriterien.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projekt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Anbieter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Eingegangen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredQuotes.map(quote => (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{quote.title}</div>
                          {quote.description && (
                            <div className="text-sm text-gray-500 max-w-xs truncate">
                              {quote.description}
                            </div>
                          )}
                          {quote.category && (
                            <div className="text-xs text-gray-400">
                              {quote.category} {quote.subcategory && `- ${quote.subcategory}`}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          {quote.provider?.avatar ? (
                            <img
                              className="h-8 w-8 rounded-full object-cover"
                              src={quote.provider.avatar}
                              alt=""
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              {quote.provider?.type === 'company' ? (
                                <FiBuilding className="h-4 w-4 text-gray-600" />
                              ) : (
                                <FiUser className="h-4 w-4 text-gray-600" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {quote.provider?.name || 'Unbekannter Anbieter'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {quote.provider?.type === 'company' ? 'Unternehmen' : 'Einzelperson'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatBudget(quote.budgetRange || quote.budget)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(
                        quote.status,
                        quote.hasResponse,
                        quote.payment?.provisionStatus
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(quote.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() =>
                          router.push(
                            `/dashboard/company/${params?.uid}/quotes/received/${quote.id}`
                          )
                        }
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-[#14ad9f] bg-[#14ad9f]/10 hover:bg-[#14ad9f]/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
                      >
                        <FiEye className="mr-1 h-3 w-3" />
                        Details ansehen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
