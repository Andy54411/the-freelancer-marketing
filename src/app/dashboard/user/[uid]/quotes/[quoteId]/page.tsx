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
  Loader2 as FiLoader,
  Download as FiDownload,
  Calendar as FiCalendar,
  Euro as FiEuro,
  MapPin as FiMapPin,
  Building as FiBuilding,
  Star as FiStar,
} from 'lucide-react';
import Link from 'next/link';
import QuoteChat from '@/components/chat/QuoteChat';

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
    respondedAt?: string;
  };
  // Provider information (to be fetched separately)
  providerName?: string;
  providerCompany?: string;
  providerRating?: number;
  providerProfileImage?: string;
}

export default function CustomerQuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [quote, setQuote] = useState<QuoteRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  const uid = params?.uid as string;
  const quoteId = params?.quoteId as string;

  useEffect(() => {
    if (!user || !uid || !quoteId) return;

    // Sicherheitsüberprüfung
    if (user.uid !== uid) {
      setError('Zugriff verweigert. Sie sind nicht berechtigt, dieses Angebot einzusehen.');
      setLoading(false);
      return;
    }

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

  const handleQuoteAction = async (action: 'accept' | 'decline') => {
    if (!quote) return;

    const setLoadingState = action === 'accept' ? setAccepting : setDeclining;

    try {
      setLoadingState(true);
      const payload = {
        quoteId: quote.id,
        action,
        customerAction: true, // Flag to indicate customer action
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
        // Redirect to success page or show success message
        if (action === 'accept') {
          router.push(`/dashboard/user/${uid}/quotes?accepted=${quote.id}`);
        }
      } else {
        setError(
          result.error ||
            `Fehler beim ${action === 'accept' ? 'Annehmen' : 'Ablehnen'} des Angebots`
        );
      }
    } catch (err) {

      setError(`Fehler beim ${action === 'accept' ? 'Annehmen' : 'Ablehnen'} des Angebots`);
    } finally {
      setLoadingState(false);
    }
  };

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

  const calculateTotalPrice = () => {
    if (!quote?.response?.serviceItems) return quote?.response?.estimatedPrice || 0;

    return quote.response.serviceItems.reduce((total, item) => {
      return total + item.quantity * item.unitPrice;
    }, 0);
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
              href={`/dashboard/user/${uid}/quotes`}
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
          href={`/dashboard/user/${uid}/quotes`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <FiArrowLeft className="mr-1 h-4 w-4" />
          Zurück zur Übersicht
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Angebotsdetails</h1>
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
            <h2 className="text-lg font-medium text-gray-900 mb-4">Ihre Anfrage</h2>
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
                  <label className="block text-sm font-medium text-gray-700">Ihr Budget</label>
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

          {/* Angebotene Lösung (wenn vorhanden) */}
          {quote.response && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Erhaltenes Angebot</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nachricht vom Anbieter
                  </label>
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
                              {calculateTotalPrice().toLocaleString('de-DE', {
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

                {quote.response.estimatedPrice && !quote.response.serviceItems && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Geschätzter Preis
                    </label>
                    <p className="mt-1 text-2xl font-bold text-[#14ad9f]">
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
                      Zusätzliche Notizen vom Anbieter
                    </label>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                      {quote.response.additionalNotes}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Angebot erhalten am
                  </label>
                  <p className="mt-1 text-sm text-gray-500">
                    {new Date(quote.response.respondedAt).toLocaleString('de-DE')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons für Angebot */}
          {quote.response && quote.status === 'responded' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Angebot bewerten</h2>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleQuoteAction('accept')}
                  disabled={accepting || declining}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50"
                >
                  {accepting ? (
                    <FiLoader className="animate-spin mr-2 h-4 w-4" />
                  ) : (
                    <FiCheck className="mr-2 h-4 w-4" />
                  )}
                  Angebot annehmen
                </button>
                <button
                  onClick={() => handleQuoteAction('decline')}
                  disabled={accepting || declining}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50"
                >
                  {declining ? (
                    <FiLoader className="animate-spin mr-2 h-4 w-4" />
                  ) : (
                    <FiX className="mr-2 h-4 w-4" />
                  )}
                  Ablehnen
                </button>
              </div>
            </div>
          )}

          {/* Erfolgsnachricht bei angenommenem Angebot */}
          {quote.status === 'accepted' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex">
                <FiCheck className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Angebot erfolgreich angenommen!
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>
                      Sie haben das Angebot angenommen. Der Anbieter wird sich in Kürze bei Ihnen
                      melden, um die Details zu besprechen.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Anbieter-Informationen */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Anbieter</h2>
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                <FiUser className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {quote.providerCompany || 'Anbieter'}
                </p>
                <div className="flex items-center">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <FiStar
                        key={i}
                        className={`h-4 w-4 ${
                          i < (quote.providerRating || 0)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="ml-1 text-sm text-gray-500">
                    ({quote.providerRating || 'Keine Bewertungen'})
                  </span>
                </div>
              </div>
            </div>
            <Link
              href={`/provider/${quote.providerId}`}
              className="inline-flex items-center text-sm text-[#14ad9f] hover:text-[#129488]"
            >
              <FiBuilding className="mr-1 h-4 w-4" />
              Anbieterprofil anzeigen
            </Link>
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
                  <label className="block text-sm font-medium text-gray-700">
                    Angebot erhalten am
                  </label>
                  <p className="mt-1 text-sm text-gray-900 flex items-center">
                    <FiClock className="mr-2 h-4 w-4 text-gray-400" />
                    {quote.response.respondedAt 
                      ? new Date(quote.response.respondedAt).toLocaleString('de-DE')
                      : 'Unbekannt'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          {quote.status === 'accepted' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Aktionen</h2>
              <div className="space-y-3">
                <button className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]">
                  <FiMessageSquare className="mr-2 h-4 w-4" />
                  Nachricht senden
                </button>
                <Link
                  href={`/dashboard/user/${uid}/orders`}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
                >
                  <FiFileText className="mr-2 h-4 w-4" />
                  Zu Aufträgen
                </Link>
              </div>
            </div>
          )}

          {/* Chat - nur wenn Angebot angenommen */}
          {quote.status === 'accepted' && (
            <QuoteChat
              quoteId={quote.id}
              customerId={quote.customerUid || uid}
              providerId={quote.providerId}
              customerName={quote.customerName}
              providerName={quote.providerName || quote.providerCompany || 'Anbieter'}
              currentUserType="customer"
            />
          )}
        </div>
      </div>
    </div>
  );
}
