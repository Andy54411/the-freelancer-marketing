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
import CheckoutForm from '@/components/quotes/CheckoutForm';
import ContractTermsModal from '@/components/quotes/ContractTermsModal';
import QuotePaymentModal from '@/components/quotes/QuotePaymentModal';
import { ContactExchangeDisplay } from '@/components/quotes/ContactExchangeDisplay';
import QuoteChat from '@/components/chat/QuoteChat';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Interface für erhaltenes Angebot Detail
interface ReceivedQuoteDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  status: 'pending' | 'responded' | 'accepted' | 'declined' | 'paid' | 'contacts_exchanged';
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
  hasProposals?: boolean; // Neue Property für Subcollection-Support
  proposals?: Array<{
    // Neue Property für Proposals aus Subcollection
    id: string;
    providerId: string;
    totalAmount: number;
    message: string;
    status: string;
    submittedAt: string;
  }>;
  providerUid?: string; // Neue Property für Provider-ID
  providerId?: string; // Alternative Provider-ID
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
    status: 'completed';
    completedAt: string;
    contactsExchanged: boolean;
    exchangeReason?: string;
    customerContact?: {
      type: string;
      name: string;
      email: string;
      phone: string | null;
      address: string;
      contactPerson: string;
      uid: string;
    };
    providerContact?: {
      type: string;
      name: string;
      email: string;
      phone: string | null;
      address: string;
      contactPerson: string;
      uid: string;
    };
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

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
      if (!firebaseUser) {
        return;
      }

      const quoteId = getQuoteId();
      const companyId = getCompanyId();

      const token = await firebaseUser.getIdToken();
      if (!token) {
        return;
      }

      // Lade spezifische Quote-Details von der Detail-API
      const apiUrl = `/api/company/${companyId}/quotes/received/${quoteId}`;

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.quote) {
          setQuote(data.quote);
        } else {
          setError('Angebot nicht gefunden');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Fehler beim Laden des Angebots');
      }
    } catch (error) {
      setError('Fehler beim Laden des Angebots');
    } finally {
      setLoading(false);
    }
  };

  // Lade Payment Intent für Quote
  const createPaymentIntent = async () => {
    setPaymentLoading(true);

    try {
      if (!firebaseUser) {
        return;
      }

      if (!quote) {
        return;
      }

      const quoteId = getQuoteId();
      const companyId = getCompanyId();

      const token = await firebaseUser.getIdToken();

      // API Call zur Payment Route
      const paymentUrl = `/api/company/${companyId}/quotes/received/${quoteId}/payment`;

      // Finde den Provider aus den Proposals oder Response
      let proposalId = '';
      if (quote.proposals && quote.proposals.length > 0) {
        proposalId = quote.proposals[0].providerId || quote.proposals[0].id || '';
      } else if (quote.response) {
        proposalId = quote.providerUid || quote.providerId || '';
      }

      const requestBody = {
        action: 'create_payment_intent',
        proposalId: proposalId,
        quoteTitle: quote.title,
        quoteDescription: quote.description,
        amount: quote.proposals?.[0]?.totalAmount || quote.response?.totalAmount || 0,
        currency: 'eur',
        companyName: quote.provider?.name || 'Provider',
        customerFirebaseId: companyId,
        customerStripeId: '', // Will be handled by API
      };

      const response = await fetch(paymentUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setError('Fehler beim Erstellen der Zahlung');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));

        setError(errorData.error || 'Fehler beim Erstellen der Zahlung');
      }
    } catch (error: any) {
      setError('Fehler beim Erstellen der Zahlung');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Angebot annehmen - öffnet Payment Modal und startet Payment Intent
  const handleAcceptOffer = () => {
    setShowPaymentModal(true);
    createPaymentIntent(); // Payment Intent direkt erstellen
  };

  useEffect(() => {
    const companyId = getCompanyId();
    const quoteId = getQuoteId();
    if (firebaseUser && companyId && quoteId) {
      fetchQuoteDetail();
    }
  }, [firebaseUser]);

  // Format Date
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Nicht verfügbar';

    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return 'Ungültiges Datum';
      }

      return new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(dateObj);
    } catch (error) {
      return 'Ungültiges Datum';
    }
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

      {/* Chat - nur wenn Kontakte ausgetauscht oder bezahlt */}
      {(quote.status === 'contacts_exchanged' ||
        (quote.status === 'accepted' && quote.payment?.provisionStatus === 'paid')) &&
        (quote.provider?.uid || quote.providerUid || quote.providerId) && (
          <QuoteChat
            quoteId={quote.id}
            customerId={getCompanyId()}
            providerId={quote.provider?.uid || quote.providerUid || quote.providerId || ''}
            customerName="Kunde"
            providerName={quote.provider?.name || 'Anbieter'}
            currentUserType="customer"
          />
        )}

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

          {/* Annahme/Ablehnung Buttons - nur anzeigen wenn noch nicht entschieden UND kein 'responded' Status */}
          {quote.status !== 'accepted' &&
            quote.status !== 'declined' &&
            quote.status !== 'responded' &&
            quote.status !== ('contacts_exchanged' as any) && (
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
                    onClick={() => {
                      setShowPaymentModal(true);
                      createPaymentIntent();
                    }}
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
          {(quote.status === 'accepted' ||
            quote.status === 'declined' ||
            (quote.status as any) === 'contacts_exchanged') && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="text-center">
                {quote.status === 'accepted' || (quote.status as any) === 'contacts_exchanged' ? (
                  <div>
                    {/* Status für erfolgreich ausgetauschte Kontakte */}
                    {(quote.status as any) === 'contacts_exchanged' ? (
                      <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200 mb-4">
                        <FiCheckCircle className="mr-2 h-4 w-4" />
                        Bezahlt - Kontakte ausgetauscht
                      </div>
                    ) : quote.payment?.provisionStatus === 'paid' ? (
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
                    {(quote.status as any) === 'contacts_exchanged' ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <div className="flex items-center justify-center mb-2">
                          <FiCheckCircle className="h-8 w-8 text-green-600 mr-3" />
                          <div className="text-left">
                            <h3 className="text-lg font-medium text-green-800">
                              Zahlung erfolgreich!
                            </h3>
                            <p className="text-sm text-green-700">
                              Kontaktdaten wurden ausgetauscht. Sie können nun direkt kommunizieren.
                            </p>
                          </div>
                        </div>
                        {(quote.payment?.paidAt || quote.contactExchange?.completedAt) && (
                          <p className="text-xs text-gray-500 text-center">
                            Bezahlt am:{' '}
                            {quote.payment?.paidAt
                              ? new Date(quote.payment.paidAt).toLocaleDateString('de-DE')
                              : quote.contactExchange?.completedAt
                                ? new Date(quote.contactExchange.completedAt).toLocaleDateString(
                                    'de-DE'
                                  )
                                : 'Unbekannt'}
                          </p>
                        )}
                      </div>
                    ) : !quote.payment?.provisionStatus ||
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

          {/* KONTAKTAUSTAUSCH - Provider kann Kundendaten erst nach Provisionszahlung sehen */}
          {(quote.status === 'contacts_exchanged' || quote.payment?.provisionStatus === 'paid') && (
            <ContactExchangeDisplay
              contactExchange={quote.contactExchange}
              currentUserUid={getCompanyId()}
              customerUid={getCompanyId()}
              providerUid={quote.provider?.uid || quote.providerUid || quote.providerId}
              status={quote.status}
              provisionPaid={quote.payment?.provisionStatus === 'paid'}
            />
          )}

          {/* Actions Section - nur anzeigen wenn Status 'responded' ist */}
          {quote.status === 'responded' && (
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowDeclineModal(true)}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Angebot ablehnen
              </button>
              <button
                onClick={handleAcceptOffer}
                disabled={paymentLoading}
                className="flex-1 bg-[#14ad9f] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#129488] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {paymentLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Lädt...
                  </>
                ) : (
                  'Angebot annehmen'
                )}
              </button>
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

      {/* Payment Modal */}
      {quote && showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Zahlung bestätigen</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {paymentLoading ? (
              <div className="mb-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Zahlung wird vorbereitet...</p>
                <p className="font-semibold">{quote.title}</p>
                <p className="text-lg font-bold text-[#14ad9f] mt-2">
                  {quote.response?.totalAmount?.toFixed(2)} €
                </p>
              </div>
            ) : clientSecret ? (
              <div>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Zahlung für:</p>
                  <p className="font-semibold">{quote.title}</p>
                  <p className="text-lg font-bold text-[#14ad9f] mt-2">
                    {quote.response?.totalAmount?.toFixed(2)} €
                  </p>
                </div>
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#14ad9f',
                      },
                    },
                    loader: 'auto',
                  }}
                >
                  <CheckoutForm
                    clientSecret={clientSecret}
                    quoteDetails={{
                      quoteId: quote.id,
                      quoteTitle: quote.title,
                      proposalAmount:
                        quote.proposals?.[0]?.totalAmount || quote.response?.totalAmount || 0,
                      companyName: quote.provider?.name || 'Unbekannt',
                      userUid: getCompanyId(),
                    }}
                    paymentDetails={{
                      amount: quote.proposals?.[0]?.totalAmount || quote.response?.totalAmount || 0,
                      currency: 'eur',
                      description: `Zahlung für: ${quote.title}`,
                      quoteId: quote.id,
                      totalAmount:
                        quote.proposals?.[0]?.totalAmount || quote.response?.totalAmount || 0,
                    }}
                    onSuccess={paymentIntentId => {
                      setShowPaymentModal(false);
                      setClientSecret(null);
                      // Refresh quote data to show paid status
                      fetchQuoteDetail();
                      alert('✅ Zahlung erfolgreich abgeschlossen!');
                    }}
                    onError={error => {
                      alert(`Fehler bei der Zahlung: ${error}`);
                    }}
                    onProcessing={isProcessing => {}}
                  />
                </Elements>
              </div>
            ) : (
              <div className="mb-4 text-center">
                <p className="text-red-600">Fehler beim Laden der Zahlung</p>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="mt-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Schließen
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contract Terms Modal */}
      {quote && (
        <ContractTermsModal
          isOpen={showContractModal}
          onClose={() => setShowContractModal(false)}
          onAccept={async () => {
            setShowContractModal(false);
            // Erst Quote akzeptieren, dann SOFORT Payment starten
            await processQuoteAction('accept');
            // Payment Modal öffnen und SOFORT Payment Intent erstellen
            setShowPaymentModal(true);
            setPaymentLoading(true);
            await createPaymentIntent();
          }}
          userType="customer"
          quoteAmount={quote.response?.totalAmount || 0}
          quoteTitle={quote.title}
        />
      )}
    </div>
  );
}
