'use client';

import React, { useState, useEffect, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft as FiArrowLeft,
  Calendar as FiCalendar,
  Clock as FiClock,
  Euro as FiEuro,
  MapPin as FiMapPin,
  User as FiUser,
  Building as FiBuilding,
  FileText as FiFileText,
  MessageSquare as FiMessageSquare,
  CheckCircle as FiCheckCircle,
  XCircle as FiXCircle,
  Loader2 as FiLoader,
  AlertTriangle as FiAlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ContractTermsModal from '@/components/quotes/ContractTermsModal';

// Interface für erhaltenes Angebot Detail
interface ReceivedQuoteDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  status: 'pending' | 'responded' | 'accepted' | 'declined';
  budget?: string;
  budgetRange?: string;
  location?: string;
  postalCode?: string;
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
  response?: {
    message: string;
    serviceItems: Array<{
      description: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      totalPrice: number;
    }>;
    totalAmount: number;
    estimatedDuration: string;
    availableFrom: string;
    additionalNotes: string;
    respondedAt: string;
  };
  contactExchange?: {
    exchangedAt: Date;
    customerData: {
      name: string;
      email: string;
      phone?: string;
      address?: string;
      postalCode?: string;
      city?: string;
      country?: string;
      type: 'company' | 'individual';
      uid: string;
    };
    providerData: {
      name: string;
      email: string;
      phone?: string;
      address?: string;
      postalCode?: string;
      city?: string;
      country?: string;
      type: 'company' | 'individual';
      uid: string;
    };
    status: 'exchanged';
  };
  payment?: {
    provisionStatus: 'pending' | 'paid' | 'failed';
    provisionAmount: number;
    provisionPaymentIntentId?: string;
    paymentIntentId?: string;
    createdAt?: string;
    paidAt?: string;
  };
  responseDate?: Date;
  createdAt: Date;
}

export default function ReceivedQuoteDetailPage() {
  const params = useParams<{ uid: string; quoteId: string }>();
  const router = useRouter();
  const { firebaseUser } = useAuth();

  const [quote, setQuote] = useState<ReceivedQuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionType, setActionType] = useState<'accept' | 'decline' | null>(null);
  const [showContractModal, setShowContractModal] = useState(false);

  // Helper functions to ensure we get strings from params
  const getCompanyId = (): string => {
    if (!params?.uid) return '';
    return Array.isArray(params.uid) ? params.uid[0] : params.uid;
  };

  const getQuoteId = (): string => {
    if (!params?.quoteId) return '';
    return Array.isArray(params.quoteId) ? params.quoteId[0] : params.quoteId;
  };

  // Lade Quote-Details
  const fetchQuoteDetail = async () => {
    try {
      if (!firebaseUser) return;

      const quoteId = getQuoteId();
      const companyId = getCompanyId();

      const token = await firebaseUser.getIdToken();
      if (!token) return;

      // Für jetzt laden wir alle received quotes und filtern das spezifische
      const response = await fetch(`/api/company/${companyId}/quotes/received`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.quotes) {
          const foundQuote = data.quotes.find((q: any) => q.id === quoteId);
          if (foundQuote) {
            setQuote(foundQuote);
          } else {
            setError('Angebot nicht gefunden');
          }
        }
      } else {
        setError('Fehler beim Laden des Angebots');
      }
    } catch (error) {

      setError('Fehler beim Laden des Angebots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const companyId = getCompanyId();
    const quoteId = getQuoteId();
    if (firebaseUser && companyId && quoteId) {
      fetchQuoteDetail();
    }
  }, [firebaseUser]);

  // Format Date
  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  // Format Budget
  const formatBudget = (budget?: { min: number; max: number; currency: string } | string) => {
    if (!budget) return 'Nicht angegeben';

    if (typeof budget === 'string') {
      return budget;
    }

    return `${budget.min.toLocaleString('de-DE')} - ${budget.max.toLocaleString('de-DE')} ${budget.currency}`;
  };

  // Handle Quote Action (Accept/Decline)
  const handleQuoteAction = async (action: 'accept' | 'decline') => {
    if (action === 'accept') {
      // Bei Annahme zuerst Modal zeigen
      setShowContractModal(true);
      return;
    }

    // Bei Ablehnung direkt verarbeiten
    await processQuoteAction(action);
  };

  // Verarbeitung der Quote-Aktion nach Bestätigung
  const processQuoteAction = async (action: 'accept' | 'decline') => {
    if (!firebaseUser || !quote) return;

    setIsActionLoading(true);
    setActionType(action);

    try {
      const token = await firebaseUser.getIdToken();
      if (!token) return;

      const companyId = getCompanyId();
      const quoteId = getQuoteId();

      const response = await fetch(`/api/company/${companyId}/quotes/received/${quoteId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          quoteId: quoteId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update local state
          setQuote(prev =>
            prev ? { ...prev, status: action === 'accept' ? 'accepted' : 'declined' } : null
          );

          // Show success message
          alert(
            action === 'accept'
              ? 'Angebot erfolgreich angenommen!'
              : 'Angebot erfolgreich abgelehnt!'
          );

          // Optionally redirect back to list
          // router.push(`/dashboard/company/${params.uid}/quotes/received`);
        } else {
          throw new Error(result.error || 'Unbekannter Fehler');
        }
      } else {
        throw new Error('Netzwerkfehler beim Verarbeiten der Anfrage');
      }
    } catch (error) {

      alert(
        `Fehler beim ${action === 'accept' ? 'Annehmen' : 'Ablehnen'} des Angebots: ${error.message}`
      );
    } finally {
      setIsActionLoading(false);
      setActionType(null);
    }
  };

  // Status Badge
  const getStatusBadge = (status: string, hasResponse: boolean, paymentStatus?: string) => {
    if (hasResponse) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
          <FiCheckCircle className="mr-1 h-4 w-4" />
          Angebot erhalten
        </span>
      );
    }

    // Special handling for accepted status - check payment
    if (status === 'accepted') {
      if (paymentStatus === 'paid') {
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
            <FiCheckCircle className="mr-1 h-4 w-4" />
            Angebot angenommen
          </span>
        );
      } else {
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
            <FiClock className="mr-1 h-4 w-4" />
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
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusStyles[status] || statusStyles.pending}`}
      >
        <FiClock className="mr-1 h-4 w-4" />
        {statusLabels[status] || 'Unbekannt'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FiLoader className="animate-spin h-8 w-8 text-[#14ad9f]" />
        <span className="ml-2 text-gray-600">Lade Angebot...</span>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FiAlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Fehler</h3>
          <p className="mt-1 text-sm text-gray-500">{error || 'Angebot nicht gefunden'}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488]"
          >
            <FiArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push(`/dashboard/company/${getCompanyId()}/quotes/received`)}
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <FiArrowLeft className="mr-2 h-4 w-4" />
            Zurück zu erhaltenen Angeboten
          </button>
          {getStatusBadge(quote.status, quote.hasResponse, quote.payment?.provisionStatus)}
        </div>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{quote.title}</h1>
            <p className="mt-1 text-gray-600">{quote.description}</p>

            <div className="mt-4 flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <FiFileText className="mr-1 h-4 w-4" />
                {quote.category} {quote.subcategory && `- ${quote.subcategory}`}
              </div>
              <div className="flex items-center">
                <FiCalendar className="mr-1 h-4 w-4" />
                Angefragt am {formatDate(quote.createdAt)}
              </div>
              {quote.urgency && (
                <div className="flex items-center">
                  <FiClock className="mr-1 h-4 w-4" />
                  Dringlichkeit: {quote.urgency}
                </div>
              )}
            </div>
          </div>

          <div className="ml-6 text-right">
            <div className="text-lg font-semibold text-gray-900">
              {formatBudget(quote.budgetRange || quote.budget)}
            </div>
            <div className="text-sm text-gray-500">Budget</div>
          </div>
        </div>
      </div>

      {/* Provider Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Anbieter Information</h2>
        <div className="flex items-center">
          <div className="flex-shrink-0 h-12 w-12">
            {quote.provider?.avatar ? (
              <img
                className="h-12 w-12 rounded-full object-cover"
                src={quote.provider.avatar}
                alt=""
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                {quote.provider?.type === 'company' ? (
                  <FiBuilding className="h-6 w-6 text-gray-600" />
                ) : (
                  <FiUser className="h-6 w-6 text-gray-600" />
                )}
              </div>
            )}
          </div>
          <div className="ml-4">
            <div className="text-lg font-medium text-gray-900">
              {quote.provider?.name || 'Unbekannter Anbieter'}
            </div>
            <div className="text-sm text-gray-500">
              {quote.provider?.type === 'company' ? 'Unternehmen' : 'Einzelperson'}
            </div>
            <div className="text-sm text-gray-500">{quote.provider?.email}</div>
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Projekt Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quote.location && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Standort</label>
              <div className="flex items-center text-gray-900">
                <FiMapPin className="mr-2 h-4 w-4 text-gray-400" />
                {quote.location} {quote.postalCode && `(${quote.postalCode})`}
              </div>
            </div>
          )}

          {quote.estimatedDuration && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Geschätzte Dauer
              </label>
              <div className="flex items-center text-gray-900">
                <FiClock className="mr-2 h-4 w-4 text-gray-400" />
                {quote.estimatedDuration}
              </div>
            </div>
          )}

          {quote.preferredStartDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gewünschter Starttermin
              </label>
              <div className="flex items-center text-gray-900">
                <FiCalendar className="mr-2 h-4 w-4 text-gray-400" />
                {new Date(quote.preferredStartDate).toLocaleDateString('de-DE')}
              </div>
            </div>
          )}
        </div>

        {quote.additionalNotes && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zusätzliche Notizen
            </label>
            <div className="p-3 bg-gray-50 rounded-md text-gray-900 whitespace-pre-wrap">
              {quote.additionalNotes}
            </div>
          </div>
        )}
      </div>

      {/* Response */}
      {quote.hasResponse && quote.response ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Angebot vom Anbieter</h2>
            <span className="text-sm text-gray-500">
              Erhalten am {formatDate(quote.response.respondedAt)}
            </span>
          </div>

          {quote.response.message && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nachricht</label>
              <div className="p-3 bg-blue-50 rounded-md text-gray-900 whitespace-pre-wrap">
                {quote.response.message}
              </div>
            </div>
          )}

          {quote.response.serviceItems && quote.response.serviceItems.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Leistungspositionen
              </label>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Beschreibung
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Menge
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Einheit
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Einzelpreis
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Gesamtpreis
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quote.response.serviceItems.map((item, index) => {
                      const unitPrice =
                        typeof item.unitPrice === 'number'
                          ? item.unitPrice
                          : parseFloat(item.unitPrice || 0);
                      const quantity =
                        typeof item.quantity === 'number'
                          ? item.quantity
                          : parseFloat(item.quantity || 1);
                      const totalPrice =
                        typeof item.totalPrice === 'number' && item.totalPrice > 0
                          ? item.totalPrice
                          : unitPrice * quantity;

                      return (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.unit}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {unitPrice.toFixed(2)} €
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {totalPrice.toFixed(2)} €
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-right">
                <span className="text-lg font-semibold text-gray-900">
                  Gesamtsumme:{' '}
                  {(() => {
                    // Berechne Gesamtsumme falls totalAmount nicht korrekt ist
                    let calculatedTotal = 0;
                    if (quote.response.serviceItems) {
                      calculatedTotal = quote.response.serviceItems.reduce((sum, item) => {
                        const unitPrice =
                          typeof item.unitPrice === 'number'
                            ? item.unitPrice
                            : parseFloat(item.unitPrice || 0);
                        const quantity =
                          typeof item.quantity === 'number'
                            ? item.quantity
                            : parseFloat(item.quantity || 1);
                        const totalPrice =
                          typeof item.totalPrice === 'number' && item.totalPrice > 0
                            ? item.totalPrice
                            : unitPrice * quantity;
                        return sum + totalPrice;
                      }, 0);
                    }

                    const originalTotal =
                      typeof quote.response.totalAmount === 'number'
                        ? quote.response.totalAmount
                        : parseFloat(quote.response.totalAmount || 0);

                    const finalTotal = originalTotal > 0 ? originalTotal : calculatedTotal;
                    return finalTotal.toFixed(2);
                  })()}{' '}
                  €
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quote.response.estimatedDuration && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Geschätzte Dauer
                </label>
                <div className="text-gray-900">{quote.response.estimatedDuration}</div>
              </div>
            )}

            {quote.response.availableFrom && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Verfügbar ab</label>
                <div className="text-gray-900">
                  {new Date(quote.response.availableFrom).toLocaleDateString('de-DE')}
                </div>
              </div>
            )}
          </div>

          {quote.response.additionalNotes && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zusätzliche Notizen
              </label>
              <div className="p-3 bg-gray-50 rounded-md text-gray-900 whitespace-pre-wrap">
                {quote.response.additionalNotes}
              </div>
            </div>
          )}

          {/* Annahme/Ablehnung Buttons - nur anzeigen wenn noch nicht entschieden */}
          {quote.status !== 'accepted' && quote.status !== 'declined' && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <button
                  onClick={() => handleQuoteAction('decline')}
                  disabled={isActionLoading}
                  className="inline-flex items-center px-6 py-3 border border-red-300 text-base font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isActionLoading && actionType === 'decline' ? (
                    <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  ) : (
                    <FiXCircle className="-ml-1 mr-2 h-4 w-4" />
                  )}
                  Angebot ablehnen
                </button>

                <button
                  onClick={() => handleQuoteAction('accept')}
                  disabled={isActionLoading}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isActionLoading && actionType === 'accept' ? (
                    <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  ) : (
                    <FiCheckCircle className="-ml-1 mr-2 h-4 w-4" />
                  )}
                  Angebot annehmen
                </button>
              </div>
            </div>
          )}

          {/* Status-Anzeige wenn bereits entschieden */}
          {(quote.status === 'accepted' || quote.status === 'declined') && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="text-center">
                {quote.status === 'accepted' ? (
                  <div>
                    {/* Nur "Angebot angenommen" anzeigen wenn Zahlung erfolgt ist */}
                    {quote.payment?.provisionStatus === 'paid' ? (
                      <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200 mb-4">
                        <FiCheckCircle className="mr-2 h-4 w-4" />
                        Angebot angenommen
                      </div>
                    ) : (
                      <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200 mb-4">
                        <FiClock className="mr-2 h-4 w-4" />
                        Wird verarbeitet
                      </div>
                    )}

                    {/* Payment Section für Provider */}
                    {!quote.payment?.provisionStatus ||
                    quote.payment.provisionStatus === 'pending' ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <div className="flex items-center justify-center mb-4">
                          <FiClock className="h-8 w-8 text-blue-600 mr-3" />
                          <div className="text-center">
                            <h3 className="text-lg font-medium text-blue-800">
                              Verarbeitung läuft
                            </h3>
                            <p className="text-sm text-blue-700 mt-2">
                              Der Anbieter wurde benachrichtigt und bearbeitet Ihre Anfrage.
                            </p>
                            <p className="text-xs text-blue-600 mt-2">
                              Sie erhalten eine Benachrichtigung, sobald die Kontaktdaten verfügbar
                              sind.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : quote.payment.provisionStatus === 'paid' ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <div className="flex items-center justify-center mb-2">
                          <FiCheckCircle className="h-8 w-8 text-green-600 mr-3" />
                          <div className="text-left">
                            <h3 className="text-lg font-medium text-green-800">
                              Angebot bestätigt
                            </h3>
                            <p className="text-sm text-green-700">
                              Die Kontaktdaten können nun ausgetauscht werden.
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 text-center">
                          Bestätigt am:{' '}
                          {quote.payment.paidAt
                            ? new Date(quote.payment.paidAt).toLocaleDateString('de-DE')
                            : 'Unbekannt'}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                    <FiXCircle className="mr-2 h-4 w-4" />
                    Angebot abgelehnt
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Kontaktdaten-Austausch für angenommene Angebote - NUR wenn Zahlung erfolgt ist */}
          {quote.status === 'accepted' &&
            quote.payment?.provisionStatus === 'paid' &&
            quote.contactExchange && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <FiUser className="mr-2 h-5 w-5 text-[#14ad9f]" />
                  Kontaktdaten ausgetauscht
                </h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Anbieter Kontaktdaten */}
                    <div className="bg-white rounded-lg p-4 border border-green-100">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <FiBuilding className="mr-2 h-4 w-4 text-[#14ad9f]" />
                        Anbieter Kontaktdaten
                      </h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Name:</span>
                          <p className="text-sm text-gray-900">
                            {quote.contactExchange.providerData.name}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">E-Mail:</span>
                          <p className="text-sm text-gray-900">
                            <a
                              href={`mailto:${quote.contactExchange.providerData.email}`}
                              className="text-[#14ad9f] hover:text-[#129488]"
                            >
                              {quote.contactExchange.providerData.email}
                            </a>
                          </p>
                        </div>
                        {quote.contactExchange.providerData.phone && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Telefon:</span>
                            <p className="text-sm text-gray-900">
                              <a
                                href={`tel:${quote.contactExchange.providerData.phone}`}
                                className="text-[#14ad9f] hover:text-[#129488]"
                              >
                                {quote.contactExchange.providerData.phone}
                              </a>
                            </p>
                          </div>
                        )}
                        {quote.contactExchange.providerData.address && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Adresse:</span>
                            <p className="text-sm text-gray-900">
                              {quote.contactExchange.providerData.address}
                            </p>
                          </div>
                        )}
                        <div>
                          <span className="text-sm font-medium text-gray-700">Typ:</span>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                              quote.contactExchange.providerData.type === 'company'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {quote.contactExchange.providerData.type === 'company'
                              ? 'Unternehmen'
                              : 'Einzelperson'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ihre Kontaktdaten (für Transparenz) */}
                    <div className="bg-white rounded-lg p-4 border border-green-100">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <FiUser className="mr-2 h-4 w-4 text-[#14ad9f]" />
                        Ihre freigegebenen Kontaktdaten
                      </h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Name:</span>
                          <p className="text-sm text-gray-900">
                            {quote.contactExchange.customerData.name}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">E-Mail:</span>
                          <p className="text-sm text-gray-900">
                            {quote.contactExchange.customerData.email}
                          </p>
                        </div>
                        {quote.contactExchange.customerData.phone && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Telefon:</span>
                            <p className="text-sm text-gray-900">
                              {quote.contactExchange.customerData.phone}
                            </p>
                          </div>
                        )}
                        {quote.contactExchange.customerData.address && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Adresse:</span>
                            <p className="text-sm text-gray-900">
                              {quote.contactExchange.customerData.address}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-green-200">
                    <p className="text-sm text-green-700 flex items-center">
                      <FiCheckCircle className="mr-2 h-4 w-4" />
                      Kontaktdaten wurden am{' '}
                      {quote.contactExchange.exchangedAt
                        ? new Date(quote.contactExchange.exchangedAt).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Unbekanntem Datum'}{' '}
                      automatisch ausgetauscht.
                    </p>
                  </div>
                </div>
              </div>
            )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8">
            <FiMessageSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Noch kein Angebot erhalten</h3>
            <p className="mt-1 text-sm text-gray-500">
              Der Anbieter hat noch nicht auf Ihre Anfrage geantwortet.
            </p>
          </div>
        </div>
      )}

      {/* Contract Terms Modal */}
      {quote && (
        <ContractTermsModal
          isOpen={showContractModal}
          onClose={() => setShowContractModal(false)}
          onAccept={() => {
            setShowContractModal(false);
            processQuoteAction('accept');
          }}
          userType="customer"
          quoteAmount={quote.response?.totalAmount || 0}
          quoteTitle={quote.title}
        />
      )}
    </div>
  );
}
