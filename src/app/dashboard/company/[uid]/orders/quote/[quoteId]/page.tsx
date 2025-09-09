'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import QuoteFormToggle from '@/components/quotes/QuoteFormToggle';
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
    serviceItems?: Array<{
      id: string;
      description: string;
      quantity: number;
      unitPrice: number;
      unit: string;
    }>;
    additionalNotes?: string;
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
      setError('Fehler beim Laden der Angebotsanfrage');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (action: 'accept' | 'decline') => {
    if (!quote) return;

    try {
      setResponding(true);
      const payload = {
        quoteId: quote.id,
        action,
      };

      const response = await fetch('/api/quotes/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        await fetchQuoteDetails();
      } else {
        setError(result.error || 'Fehler beim Bearbeiten der Angebotsanfrage');
      }
    } catch (err) {
      setError('Fehler beim Bearbeiten der Angebotsanfrage');
    } finally {
      setResponding(false);
    }
  };

  const handleQuoteSubmit = async (responseData: any) => {
    if (!quote) return;

    try {
      setResponding(true);
      const payload = {
        quoteId: quote.id,
        action: 'respond',
        response: responseData,
      };

      const response = await fetch('/api/quotes/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        await fetchQuoteDetails();
        setShowResponseForm(false);
      } else {
        setError(result.error || 'Fehler beim Senden des Angebots');
      }
    } catch (err) {
      setError('Fehler beim Senden des Angebots');
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
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nachricht</label>
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                    {quote.response.message}
                  </p>
                </div>

                {/* Service Items */}
                {quote.response.serviceItems && quote.response.serviceItems.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Leistungspositionen
                    </label>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Beschreibung
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Menge
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Einheit
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Einzelpreis
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Gesamtpreis
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {quote.response.serviceItems.map((item, index) => (
                            <tr key={item.id || index}>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {item.description}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.unit}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {item.unitPrice.toLocaleString('de-DE', {
                                  minimumFractionDigits: 2,
                                })}{' '}
                                €
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {(item.quantity * item.unitPrice).toLocaleString('de-DE', {
                                  minimumFractionDigits: 2,
                                })}{' '}
                                €
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-[#14ad9f]">
                            <td
                              colSpan={4}
                              className="px-4 py-3 text-sm font-medium text-white text-right"
                            >
                              Gesamtsumme:
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-white">
                              {quote.response.serviceItems
                                .reduce((total, item) => total + item.quantity * item.unitPrice, 0)
                                .toLocaleString('de-DE', {
                                  minimumFractionDigits: 2,
                                })}{' '}
                              €
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Legacy estimated price display (if no service items) */}
                {quote.response.estimatedPrice &&
                  (!quote.response.serviceItems || quote.response.serviceItems.length === 0) && (
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

                {quote.response.additionalNotes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Zusätzliche Notizen
                    </label>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                      {quote.response.additionalNotes}
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
            <>
              {!showResponseForm ? (
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Auf Anfrage antworten</h2>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowResponseForm(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
                    >
                      <FiSend className="mr-2 h-4 w-4" />
                      Angebot erstellen
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
                </div>
              ) : (
                <QuoteFormToggle
                  companyId={uid}
                  onSubmit={handleQuoteSubmit}
                  onCancel={() => setShowResponseForm(false)}
                  loading={responding}
                />
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Kundeninformationen */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Kundeninformationen</h2>

            {/* Kontaktdaten sind nur sichtbar wenn ein Angebot abgegeben wurde und der Auftrag angenommen wurde */}
            {quote.response && quote.status === 'accepted' ? (
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
            ) : (
              <div className="text-center py-6">
                <FiUser className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Kontaktdaten gesperrt</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {!quote.response
                    ? 'Geben Sie zuerst ein Angebot ab, um die Kundenkontaktdaten zu sehen.'
                    : quote.status !== 'accepted'
                      ? 'Die Kontaktdaten werden sichtbar, sobald der Kunde Ihr Angebot annimmt.'
                      : 'Kontaktdaten sind verfügbar.'}
                </p>
                <div className="mt-3">
                  <span className="text-xs font-medium text-gray-900">
                    Kunde: {quote.customerName || quote.requesterName}
                  </span>
                </div>
              </div>
            )}
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
          {quote.customerUid && quote.response && quote.status === 'accepted' && (
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
