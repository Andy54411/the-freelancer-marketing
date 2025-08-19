'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft as FiArrowLeft,
  Clock as FiClock,
  MessageSquare as FiMessageSquare,
  FileText as FiFileText,
  AlertCircle as FiAlertCircle,
  Check as FiCheck,
  X as FiX,
  Eye as FiEye,
  Loader2 as FiLoader,
  Euro as FiEuro,
  Calendar as FiCalendar,
  Building as FiBuilding,
  User as FiUser,
} from 'lucide-react';
import Link from 'next/link';

interface QuoteRequest {
  id: string;
  service?: string;
  projectTitle?: string;
  description?: string;
  projectDescription?: string;
  urgency: 'niedrig' | 'mittel' | 'hoch' | 'sofort' | 'normal';
  budget?: string;
  budgetRange?: string;
  timeline?: string;
  estimatedDuration?: string;
  location?: string;
  postalCode?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  requesterName?: string;
  requestDate?: string;
  createdAt?: any;
  status: 'pending' | 'received' | 'responded' | 'accepted' | 'declined' | 'expired';
  providerId: string;
  customerUid?: string;
  projectCategory?: string;
  projectSubcategory?: string;
  preferredStartDate?: string;
  additionalNotes?: string;
  response?: {
    message: string;
    estimatedPrice?: number;
    estimatedDuration?: string;
    availableFrom?: string;
    serviceItems?: Array<{
      id: string;
      description: string;
      quantity: number;
      unitPrice: number;
      unit: string;
    }>;
    additionalNotes?: string;
    respondedAt?: string;
  };
}

export default function CustomerQuotesOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'ALLE' | 'WARTEND' | 'ANGEBOTE' | 'ANGENOMMEN' | 'ABGELEHNT'
  >('ALLE');

  const uid = params?.uid as string;

  useEffect(() => {
    if (!user || !uid) return;

    // Sicherheitsüberprüfung
    if (user.uid !== uid) {
      setError('Zugriff verweigert. Sie sind nicht berechtigt, diese Angebote einzusehen.');
      setLoading(false);
      return;
    }

    fetchQuotes();
  }, [user, uid]);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/quotes/customer/${uid}`);
      const result = await response.json();

      if (result.success) {
        setQuotes(result.quotes || []);
      } else {
        setError(result.error || 'Fehler beim Laden der Angebote');
      }
    } catch (err) {
      console.error('Fehler beim Laden der Angebote:', err);
      setError('Fehler beim Laden der Angebote');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuotes = useMemo(() => {
    if (activeTab === 'ALLE') return quotes;

    if (activeTab === 'WARTEND') {
      return quotes.filter(quote => quote.status === 'pending' || quote.status === 'received');
    }
    if (activeTab === 'ANGEBOTE') {
      return quotes.filter(quote => quote.status === 'responded');
    }
    if (activeTab === 'ANGENOMMEN') {
      return quotes.filter(quote => quote.status === 'accepted');
    }
    if (activeTab === 'ABGELEHNT') {
      return quotes.filter(quote => quote.status === 'declined' || quote.status === 'expired');
    }

    return quotes;
  }, [quotes, activeTab]);

  const getStatusColor = (status: QuoteRequest['status']) => {
    switch (status) {
      case 'pending':
      case 'received':
        return 'text-blue-600 bg-blue-100';
      case 'responded':
        return 'text-[#14ad9f] bg-green-100';
      case 'accepted':
        return 'text-green-600 bg-green-100';
      case 'declined':
      case 'expired':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: QuoteRequest['status']) => {
    switch (status) {
      case 'pending':
        return 'Wartend';
      case 'received':
        return 'Erhalten';
      case 'responded':
        return 'Angebot erhalten';
      case 'accepted':
        return 'Angenommen';
      case 'declined':
        return 'Abgelehnt';
      case 'expired':
        return 'Abgelaufen';
      default:
        return 'Unbekannt';
    }
  };

  const getUrgencyColor = (urgency: QuoteRequest['urgency']) => {
    switch (urgency) {
      case 'sofort':
        return 'text-red-600 bg-red-100';
      case 'hoch':
        return 'text-orange-600 bg-orange-100';
      case 'mittel':
        return 'text-yellow-600 bg-yellow-100';
      case 'niedrig':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTabCount = (tab: string) => {
    if (tab === 'WARTEND') {
      return quotes.filter(q => q.status === 'pending' || q.status === 'received').length;
    }
    if (tab === 'ANGEBOTE') {
      return quotes.filter(q => q.status === 'responded').length;
    }
    if (tab === 'ANGENOMMEN') {
      return quotes.filter(q => q.status === 'accepted').length;
    }
    if (tab === 'ABGELEHNT') {
      return quotes.filter(q => q.status === 'declined' || q.status === 'expired').length;
    }
    return quotes.length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FiLoader className="animate-spin h-8 w-8 text-[#14ad9f]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <FiAlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Fehler</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <div className="mt-6">
            <Link
              href={`/dashboard/user/${uid}`}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
            >
              <FiArrowLeft className="-ml-1 mr-2 h-4 w-4" />
              Zurück zum Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/dashboard/user/${uid}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <FiArrowLeft className="mr-1 h-4 w-4" />
          Zurück zum Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meine Angebotsanfragen</h1>
            <p className="mt-1 text-sm text-gray-500">
              Verwalten Sie Ihre Angebotsanfragen und eingegangene Angebote
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'ALLE', label: 'Alle', count: quotes.length },
              { key: 'WARTEND', label: 'Wartend', count: getTabCount('WARTEND') },
              { key: 'ANGEBOTE', label: 'Neue Angebote', count: getTabCount('ANGEBOTE') },
              { key: 'ANGENOMMEN', label: 'Angenommen', count: getTabCount('ANGENOMMEN') },
              { key: 'ABGELEHNT', label: 'Abgelehnt', count: getTabCount('ABGELEHNT') },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`${
                  activeTab === tab.key
                    ? 'border-[#14ad9f] text-[#14ad9f]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                {tab.label}
                <span
                  className={`ml-2 py-0.5 px-2 rounded-full text-xs font-medium ${
                    activeTab === tab.key ? 'bg-[#14ad9f] text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      {filteredQuotes.length === 0 ? (
        <div className="text-center py-12">
          <FiFileText className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Angebotsanfragen</h3>
          <p className="mt-1 text-sm text-gray-500">
            Sie haben noch keine Angebotsanfragen gestellt.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul role="list" className="divide-y divide-gray-200">
            {filteredQuotes.map(quote => (
              <li key={quote.id}>
                <Link
                  href={`/dashboard/user/${uid}/quotes/${quote.id}`}
                  className="block hover:bg-gray-50 px-4 py-4 sm:px-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-[#14ad9f] truncate">
                          {quote.projectTitle || quote.service || 'Angebotsanfrage'}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex space-x-2">
                          {quote.response && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#14ad9f] text-white">
                              Angebot verfügbar
                            </span>
                          )}
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(quote.status)}`}
                          >
                            {getStatusText(quote.status)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex space-y-2 sm:space-y-0 sm:space-x-6">
                          <p className="flex items-center text-sm text-gray-500">
                            <FiBuilding className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            {quote.projectCategory && quote.projectSubcategory
                              ? `${quote.projectCategory} - ${quote.projectSubcategory}`
                              : 'Kategorie nicht angegeben'}
                          </p>
                          {quote.budgetRange && (
                            <p className="flex items-center text-sm text-gray-500">
                              <FiEuro className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                              Budget: {quote.budgetRange}
                            </p>
                          )}
                          <p className="flex items-center text-sm text-gray-500">
                            <FiClock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            {quote.createdAt
                              ? new Date(quote.createdAt._seconds * 1000).toLocaleDateString(
                                  'de-DE'
                                )
                              : 'Datum unbekannt'}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(quote.urgency)}`}
                          >
                            {quote.urgency}
                          </span>
                          {quote.response && quote.response.estimatedPrice && (
                            <span className="ml-4 flex items-center text-sm font-medium text-[#14ad9f]">
                              <FiEuro className="mr-1 h-4 w-4" />
                              {quote.response.estimatedPrice.toLocaleString('de-DE', {
                                minimumFractionDigits: 2,
                              })}{' '}
                              €
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <FiEye className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
