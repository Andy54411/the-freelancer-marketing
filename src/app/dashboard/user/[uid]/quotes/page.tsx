'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft as FiArrowLeft,
  Clock as FiClock,
  FileText as FiFileText,
  AlertCircle as FiAlertCircle,
  Eye as FiEye,
  Loader2 as FiLoader,
  Euro as FiEuro,
  Building as FiBuilding,
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
  createdAt?: Date | { _seconds: number; _nanoseconds: number };
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
  const params = useParams();
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'ALLE' | 'WARTEND' | 'ANGEBOTE' | 'ANGENOMMEN' | 'ABGELEHNT'
  >('ALLE');

  const uid = params?.uid as string;

  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Korrigierter API-Pfad
      const response = await fetch(`/api/quotes/customer/${uid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        setQuotes(result.quotes || []);
      } else {
        setError(result.error || 'Fehler beim Laden der Angebote');
      }
    } catch (err) {
      setError(
        `Fehler beim Laden der Angebote: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`
      );
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (!user || !uid) return;

    // Sicherheitsüberprüfung
    if (user.uid !== uid) {
      setError('Zugriff verweigert. Sie sind nicht berechtigt, diese Angebote einzusehen.');
      setLoading(false);
      return;
    }

    fetchQuotes();
  }, [user, uid, fetchQuotes]);

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
      <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 flex items-center justify-center">
        <FiLoader className="animate-spin h-8 w-8 text-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative -m-4 lg:-m-6 -mt-16">
        <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
        <div className="relative z-10 pt-20 px-4 lg:px-6 pb-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <FiAlertCircle className="mx-auto h-12 w-12 text-white/80" />
              <h3 className="mt-2 text-sm font-medium text-white">Fehler</h3>
              <p className="mt-1 text-sm text-white/80">{error}</p>
              <div className="mt-6">
                <Link
                  href={`/dashboard/user/${uid}`}
                  className="inline-flex items-center px-4 py-2 border border-white/30 shadow-sm text-sm font-medium rounded-md text-white bg-white/20 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-all"
                >
                  <FiArrowLeft className="-ml-1 mr-2 h-4 w-4" />
                  Zurück zum Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative -m-4 lg:-m-6 -mt-16">
      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
      <div className="relative z-10 pt-20 px-4 lg:px-6 pb-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href={`/dashboard/user/${uid}`}
              className="inline-flex items-center text-sm text-white/80 hover:text-white mb-4 transition-colors"
            >
              <FiArrowLeft className="mr-1 h-4 w-4" />
              Zurück zum Dashboard
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Meine Angebotsanfragen</h1>
                <p className="mt-1 text-sm text-white/80">
                  Verwalten Sie Ihre Angebotsanfragen und eingegangene Angebote
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-white/30">
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
                    onClick={() =>
                      setActiveTab(
                        tab.key as 'ALLE' | 'WARTEND' | 'ANGEBOTE' | 'ANGENOMMEN' | 'ABGELEHNT'
                      )
                    }
                    className={`${
                      activeTab === tab.key
                        ? 'border-white text-white'
                        : 'border-transparent text-white/70 hover:text-white hover:border-white/50'
                    } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
                  >
                    {tab.label}
                    <span
                      className={`ml-2 py-0.5 px-2 rounded-full text-xs font-medium ${
                        activeTab === tab.key
                          ? 'bg-white/20 text-white'
                          : 'bg-white/10 text-white/80'
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
              <FiFileText className="mx-auto h-12 w-12 text-white/60" />
              <h3 className="mt-2 text-sm font-medium text-white">Keine Angebotsanfragen</h3>
              <p className="mt-1 text-sm text-white/80">
                Sie haben noch keine Angebotsanfragen gestellt.
              </p>
            </div>
          ) : (
            <div className="bg-white/95 shadow-2xl overflow-hidden sm:rounded-lg border border-white/20">
              <ul role="list" className="divide-y divide-gray-200">
                {filteredQuotes.map(quote => (
                  <li key={quote.id}>
                    <Link
                      href={`/dashboard/user/${uid}/quotes/${quote.id}`}
                      className="block hover:bg-gray-50/80 px-4 py-4 sm:px-6 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-[#14ad9f] truncate">
                              {quote.projectTitle || quote.service || 'Angebotsanfrage'}
                            </p>
                            <div className="ml-2 shrink-0 flex space-x-2">
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
                                <FiBuilding className="shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                {quote.projectCategory && quote.projectSubcategory
                                  ? `${quote.projectCategory} - ${quote.projectSubcategory}`
                                  : 'Kategorie nicht angegeben'}
                              </p>
                              {quote.budgetRange && (
                                <p className="flex items-center text-sm text-gray-500">
                                  <FiEuro className="shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                  Budget: {quote.budgetRange}
                                </p>
                              )}
                              <p className="flex items-center text-sm text-gray-500">
                                <FiClock className="shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                {quote.createdAt
                                  ? new Date(
                                      typeof quote.createdAt === 'object' && '_seconds' in quote.createdAt
                                        ? quote.createdAt._seconds * 1000
                                        : quote.createdAt
                                    ).toLocaleDateString('de-DE')
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
                        <div className="ml-4 shrink-0">
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
      </div>
    </div>
  );
}
