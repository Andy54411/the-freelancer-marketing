'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft as FiArrowLeft,
  User as FiUser,
  Clock as FiClock,
  MessageSquare as FiMessageSquare,
  FileText as FiFileText,
  AlertCircle as FiAlertCircle,
  Check as FiCheck,
  X as FiX,
  Send as FiSend,
  Loader2 as FiLoader,
  Download as FiDownload,
  Calendar as FiCalendar,
  Euro as FiEuro,
  MapPin as FiMapPin,
  Phone as FiPhone,
  Mail as FiMail,
} from 'lucide-react';
import Link from 'next/link';

interface QuoteRequest {
  id: string;
  service?: string; // Legacy field
  projectTitle?: string; // New field
  description?: string; // Legacy field
  projectDescription?: string; // New field
  urgency: 'niedrig' | 'mittel' | 'hoch' | 'sofort' | 'normal';
  budget?: string;
  budgetRange?: string; // New field
  timeline?: string;
  estimatedDuration?: string; // New field
  location?: string;
  postalCode?: string; // New field
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  requesterName?: string; // Legacy field
  requestDate?: string;
  createdAt?: any; // Firebase timestamp
  status: 'pending' | 'received' | 'responded' | 'accepted' | 'declined' | 'expired';
  providerId: string;
  customerUid?: string;
  projectCategory?: string;
  projectSubcategory?: string;
  preferredStartDate?: string;
  additionalNotes?: string;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  response?: {
    message: string;
    estimatedPrice?: number;
    estimatedDuration?: string;
    availableFrom?: string;
    respondedAt: string;
  };
}

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [quote, setQuote] = useState<QuoteRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [showResponseForm, setShowResponseForm] = useState(false);

  // Response Form State
  const [responseMessage, setResponseMessage] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');

  const uid = params?.uid as string;
  const quoteId = params?.quoteId as string; // Korrigiert: quoteId statt orderId

  useEffect(() => {
    if (!user || !uid || !quoteId) return;

    fetchQuoteDetails();
  }, [user, uid, quoteId]);

  const fetchQuoteDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/quotes/details/${quoteId}`);
      const result = await response.json();

      if (result.success) {
        setQuote(result.quote);
      } else {
        setError(result.error || 'Angebotsanfrage nicht gefunden');
      }
    } catch (err) {
      console.error('Fehler beim Laden der Angebotsanfrage:', err);
      setError('Fehler beim Laden der Angebotsanfrage');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (action: 'accept' | 'decline' | 'respond') => {
    if (!quote) return;

    try {
      setResponding(true);
      const payload: any = {
        quoteId: quote.id,
        action,
      };

      if (action === 'respond') {
        payload.response = {
          message: responseMessage,
          estimatedPrice: estimatedPrice ? parseFloat(estimatedPrice) : undefined,
          estimatedDuration,
          availableFrom,
        };
      }

      const response = await fetch('/api/quotes/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh quote data
        await fetchQuoteDetails();
        setShowResponseForm(false);
        setResponseMessage('');
        setEstimatedPrice('');
        setEstimatedDuration('');
        setAvailableFrom('');
      } else {
        setError(result.error || 'Fehler beim Bearbeiten der Angebotsanfrage');
      }
    } catch (err) {
      console.error('Fehler beim Bearbeiten der Angebotsanfrage:', err);
      setError('Fehler beim Bearbeiten der Angebotsanfrage');
    } finally {
      setResponding(false);
    }
  };

  const getStatusColor = (status: QuoteRequest['status']) => {
    switch (status) {
      case 'pending':
      case 'received':
        return 'text-blue-600 bg-blue-100';
      case 'responded':
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
        return 'Ausstehend';
      case 'received':
        return 'Erhalten';
      case 'responded':
        return 'Beantwortet';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FiLoader className="animate-spin h-8 w-8 text-[#14ad9f]" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <FiAlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Fehler</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <div className="mt-6">
            <Link
              href={`/dashboard/company/${uid}/orders/overview`}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
            >
              <FiArrowLeft className="-ml-1 mr-2 h-4 w-4" />
              Zurück zur Übersicht
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
          href={`/dashboard/company/${uid}/orders/overview`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <FiArrowLeft className="mr-1 h-4 w-4" />
          Zurück zur Übersicht
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Angebotsanfrage Details</h1>
            <p className="mt-1 text-sm text-gray-500">ID: {quote.id}</p>
          </div>
          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(quote.status)}`}
            >
              {getStatusText(quote.status)}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getUrgencyColor(quote.urgency)}`}
            >
              Dringlichkeit: {quote.urgency}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Hauptinhalt */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Service Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Service</label>
                <p className="mt-1 text-sm text-gray-900">
                  {quote.service || quote.projectTitle || 'Nicht angegeben'}
                </p>
              </div>
              {(quote.projectCategory || quote.projectSubcategory) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kategorie</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {quote.projectCategory} - {quote.projectSubcategory}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Beschreibung</label>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                  {quote.description || quote.projectDescription || 'Keine Beschreibung'}
                </p>
              </div>
              {(quote.budget || quote.budgetRange) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Budget</label>
                  <p className="mt-1 text-sm text-gray-900">{quote.budget || quote.budgetRange}</p>
                </div>
              )}
              {(quote.timeline || quote.estimatedDuration) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Zeitrahmen</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {quote.timeline || quote.estimatedDuration}
                  </p>
                </div>
              )}
              {quote.preferredStartDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Gewünschter Starttermin
                  </label>
                  <p className="mt-1 text-sm text-gray-900 flex items-center">
                    <FiCalendar className="mr-1 h-4 w-4 text-gray-400" />
                    {new Date(quote.preferredStartDate).toLocaleDateString('de-DE')}
                  </p>
                </div>
              )}
              {(quote.location || quote.postalCode) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Standort</label>
                  <p className="mt-1 text-sm text-gray-900 flex items-center">
                    <FiMapPin className="mr-1 h-4 w-4 text-gray-400" />
                    {quote.location} {quote.postalCode && `(${quote.postalCode})`}
                  </p>
                </div>
              )}
              {quote.additionalNotes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Zusätzliche Notizen
                  </label>
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                    {quote.additionalNotes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Anhänge */}
          {quote.attachments && quote.attachments.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Anhänge</h2>
              <div className="space-y-2">
                {quote.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center">
                      <FiFileText className="mr-2 h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-900">{attachment.name}</span>
                    </div>
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-[#14ad9f] hover:text-[#129488]"
                    >
                      <FiDownload className="mr-1 h-4 w-4" />
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Response Section */}
          {quote.response && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Ihre Antwort</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nachricht</label>
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                    {quote.response.message}
                  </p>
                </div>
                {quote.response.estimatedPrice && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Geschätzter Preis
                    </label>
                    <p className="mt-1 text-sm text-gray-900 flex items-center">
                      <FiEuro className="mr-1 h-4 w-4 text-gray-400" />
                      {quote.response.estimatedPrice.toLocaleString('de-DE', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      €
                    </p>
                  </div>
                )}
                {quote.response.estimatedDuration && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Geschätzte Dauer
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{quote.response.estimatedDuration}</p>
                  </div>
                )}
                {quote.response.availableFrom && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Verfügbar ab</label>
                    <p className="mt-1 text-sm text-gray-900 flex items-center">
                      <FiCalendar className="mr-1 h-4 w-4 text-gray-400" />
                      {new Date(quote.response.availableFrom).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Beantwortet am</label>
                  <p className="mt-1 text-sm text-gray-500">
                    {new Date(quote.response.respondedAt).toLocaleString('de-DE')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Response Form */}
          {!quote.response && (quote.status === 'pending' || quote.status === 'received') && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Auf Anfrage antworten</h2>

              {!showResponseForm ? (
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowResponseForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
                  >
                    <FiSend className="mr-2 h-4 w-4" />
                    Angebot erstellen
                  </button>
                  <button
                    onClick={() => handleResponse('accept')}
                    disabled={responding}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {responding ? (
                      <FiLoader className="animate-spin mr-2 h-4 w-4" />
                    ) : (
                      <FiCheck className="mr-2 h-4 w-4" />
                    )}
                    Direkt annehmen
                  </button>
                  <button
                    onClick={() => handleResponse('decline')}
                    disabled={responding}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50"
                  >
                    {responding ? (
                      <FiLoader className="animate-spin mr-2 h-4 w-4" />
                    ) : (
                      <FiX className="mr-2 h-4 w-4" />
                    )}
                    Ablehnen
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="response-message"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Nachricht *
                    </label>
                    <textarea
                      id="response-message"
                      rows={4}
                      value={responseMessage}
                      onChange={e => setResponseMessage(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f] sm:text-sm"
                      placeholder="Beschreiben Sie Ihr Angebot..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="estimated-price"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Geschätzter Preis (€)
                      </label>
                      <input
                        type="number"
                        id="estimated-price"
                        min="0"
                        step="0.01"
                        value={estimatedPrice}
                        onChange={e => setEstimatedPrice(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f] sm:text-sm"
                        placeholder="z.B. 150.00"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="estimated-duration"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Geschätzte Dauer
                      </label>
                      <input
                        type="text"
                        id="estimated-duration"
                        value={estimatedDuration}
                        onChange={e => setEstimatedDuration(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f] sm:text-sm"
                        placeholder="z.B. 2-3 Stunden, 1 Tag"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="available-from"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Verfügbar ab
                    </label>
                    <input
                      type="date"
                      id="available-from"
                      value={availableFrom}
                      onChange={e => setAvailableFrom(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f] sm:text-sm"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => handleResponse('respond')}
                      disabled={responding || !responseMessage.trim()}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50"
                    >
                      {responding ? (
                        <FiLoader className="animate-spin mr-2 h-4 w-4" />
                      ) : (
                        <FiSend className="mr-2 h-4 w-4" />
                      )}
                      Angebot senden
                    </button>
                    <button
                      onClick={() => {
                        setShowResponseForm(false);
                        setResponseMessage('');
                        setEstimatedPrice('');
                        setEstimatedDuration('');
                        setAvailableFrom('');
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Kundeninformationen */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Kundeninformationen</h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <FiUser className="mr-2 h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-900">
                  {quote.customerName || quote.requesterName}
                </span>
              </div>
              {quote.customerEmail && (
                <div className="flex items-center">
                  <FiMail className="mr-2 h-5 w-5 text-gray-400" />
                  <a
                    href={`mailto:${quote.customerEmail}`}
                    className="text-sm text-[#14ad9f] hover:text-[#129488]"
                  >
                    {quote.customerEmail}
                  </a>
                </div>
              )}
              {quote.customerPhone && (
                <div className="flex items-center">
                  <FiPhone className="mr-2 h-5 w-5 text-gray-400" />
                  <a
                    href={`tel:${quote.customerPhone}`}
                    className="text-sm text-[#14ad9f] hover:text-[#129488]"
                  >
                    {quote.customerPhone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Zeitinformationen */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Zeitinformationen</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Angefragt am</label>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <FiClock className="mr-2 h-4 w-4 text-gray-400" />
                  {quote.requestDate
                    ? new Date(quote.requestDate).toLocaleString('de-DE')
                    : quote.createdAt
                      ? new Date(quote.createdAt._seconds * 1000).toLocaleString('de-DE')
                      : 'Unbekannt'}
                </p>
              </div>
              {quote.response?.respondedAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Beantwortet am</label>
                  <p className="mt-1 text-sm text-gray-900 flex items-center">
                    <FiClock className="mr-2 h-4 w-4 text-gray-400" />
                    {new Date(quote.response.respondedAt).toLocaleString('de-DE')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          {quote.customerUid && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Aktionen</h2>
              <div className="space-y-3">
                <button className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]">
                  <FiMessageSquare className="mr-2 h-4 w-4" />
                  Nachricht senden
                </button>
                <Link
                  href={`/profile/${quote.customerUid}`}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
                >
                  <FiUser className="mr-2 h-4 w-4" />
                  Kundenprofil anzeigen
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
