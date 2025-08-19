'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Filter as FiFilter,
  MoreVertical as FiMoreVertical,
  Clock as FiClock,
  Search as FiSearch,
  ChevronDown as FiChevronDown,
  Inbox as FiInbox,
  Loader2 as FiLoader,
  Building as FiBuilding,
  User as FiUser,
  FileText as FiFileText,
  Calendar as FiCalendar,
  AlertCircle as FiAlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Interface für Angebots-Anfragen
interface IncomingQuote {
  id: string;
  title: string;
  description: string;
  serviceCategory: string;
  serviceSubcategory: string;
  projectType: 'fixed_price' | 'hourly' | 'project';
  status: 'pending' | 'responded' | 'accepted' | 'declined';
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
  deadline?: string;
  location?: string;
  customer: {
    name: string;
    type: 'user' | 'company';
    email: string;
    avatar?: string;
    uid: string;
  };
  createdAt: Date;
  customerType?: string;
  customerUid?: string;
  customerCompanyUid?: string;
}

export default function IncomingQuotesPage() {
  const params = useParams();
  const router = useRouter();
  const { firebaseUser } = useAuth();

  const [quotes, setQuotes] = useState<IncomingQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Safe params access
  const uid = params?.uid as string;

  // Lade eingehende Angebots-Anfragen
  const fetchIncomingQuotes = async () => {
    try {
      if (!firebaseUser || !uid) return;

      const token = await firebaseUser.getIdToken();
      if (!token) return;

      const response = await fetch(`/api/company/${uid}/quotes/incoming`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQuotes(data.quotes || []);
      } else {
        console.error('Fehler beim Laden der Angebots-Anfragen');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Angebots-Anfragen:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (firebaseUser && uid) {
      fetchIncomingQuotes();
    }
  }, [firebaseUser, uid]);

  // Filter Angebots-Anfragen
  const filteredQuotes = quotes.filter(quote => {
    // Null-Checks hinzufügen
    if (!quote || !quote.customer) return false;

    const matchesSearch =
      (quote.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quote.customer.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quote.serviceCategory || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || quote.status === filterStatus;
    const matchesType =
      filterType === 'all' || (quote.customer.type && quote.customer.type === filterType);

    return matchesSearch && matchesStatus && matchesType;
  });

  // Format Datum
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  // Format Budget
  const formatBudget = (budget?: { min: number; max: number; currency: string }) => {
    if (!budget) return 'Nicht angegeben';
    return `${budget.min.toLocaleString('de-DE')} - ${budget.max.toLocaleString('de-DE')} ${budget.currency}`;
  };

  // Status Badge
  const getStatusBadge = (status: string) => {
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
        className={`px-2 py-1 rounded-full text-xs font-medium border ${statusStyles[status as keyof typeof statusStyles] || statusStyles.pending}`}
      >
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FiLoader className="animate-spin h-8 w-8 text-[#14ad9f]" />
        <span className="ml-2 text-gray-600">Lade Angebots-Anfragen...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <FiInbox className="mr-3 h-6 w-6 text-[#14ad9f]" />
                Eingehende Angebots-Anfragen
              </h1>
              <p className="text-gray-600 mt-1">
                Verwalten Sie eingehende B2B und B2C Angebots-Anfragen
              </p>
            </div>
          </div>
        </div>

        {/* Filter und Suche */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Suchfeld */}
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Suchen nach Projekt, Kunde oder Kategorie..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              >
                <option value="all">Alle Status</option>
                <option value="pending">Wartend</option>
                <option value="responded">Beantwortet</option>
                <option value="accepted">Angenommen</option>
                <option value="declined">Abgelehnt</option>
              </select>
              <FiChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            </div>

            {/* Typ Filter */}
            <div className="relative">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              >
                <option value="all">Alle Typen</option>
                <option value="user">B2C (Privatkunden)</option>
                <option value="company">B2B (Unternehmen)</option>
              </select>
              <FiChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Statistiken */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiClock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Wartend</p>
                <p className="text-lg font-semibold text-gray-900">
                  {quotes.filter(q => q.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiFileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Beantwortet</p>
                <p className="text-lg font-semibold text-gray-900">
                  {quotes.filter(q => q.status === 'responded').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiBuilding className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">B2B Anfragen</p>
                <p className="text-lg font-semibold text-gray-900">
                  {quotes.filter(q => q.customer.type === 'company').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiUser className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">B2C Anfragen</p>
                <p className="text-lg font-semibold text-gray-900">
                  {quotes.filter(q => q.customer.type === 'user').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Angebots-Anfragen Liste */}
        {filteredQuotes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <FiInbox className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Keine Angebots-Anfragen gefunden
            </h3>
            <p className="text-gray-500">
              {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                ? 'Keine Angebots-Anfragen entsprechen Ihren Filterkriterien.'
                : 'Sie haben noch keine eingehenden Angebots-Anfragen erhalten.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Projekt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kunde
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
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredQuotes.map(quote => (
                    <tr key={quote.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{quote.title}</div>
                          <div className="text-sm text-gray-500">
                            {quote.serviceCategory} • {quote.serviceSubcategory}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            {quote.customer.avatar ? (
                              <img
                                className="h-8 w-8 rounded-full"
                                src={quote.customer.avatar}
                                alt=""
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                {quote.customer.type === 'company' ? (
                                  <FiBuilding className="h-4 w-4 text-gray-600" />
                                ) : (
                                  <FiUser className="h-4 w-4 text-gray-600" />
                                )}
                              </div>
                            )}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {quote.customer.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {quote.customer.type === 'company' ? 'Unternehmen' : 'Privatkunde'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatBudget(quote.budget)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(quote.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(quote.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() =>
                            router.push(`/dashboard/company/${uid}/quotes/incoming/${quote.id}`)
                          }
                          className="text-[#14ad9f] hover:text-[#129488] font-medium"
                        >
                          Details ansehen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
