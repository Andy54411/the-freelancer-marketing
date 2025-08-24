'use client';

import React, { useState, useEffect, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import {
  ArrowLeft as FiArrowLeft,
  Building as FiBuilding,
  User as FiUser,
  Calendar as FiCalendar,
  MapPin as FiMapPin,
  Clock as FiClock,
  DollarSign as FiDollarSign,
  FileText as FiFileText,
  Send as FiSend,
  Check as FiCheck,
  CheckCircle as FiCheckCircle,
  X as FiX,
  Loader2 as FiLoader,
  AlertCircle as FiAlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import QuoteFormToggle from '@/components/quotes/QuoteFormToggle';
import ContractTermsModal from '@/components/quotes/ContractTermsModal';

// Interface für Angebots-Anfrage Details
interface QuoteRequest {
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
  budgetRange?: string; // String format like "1.000€ - 2.500€"
  timeline?: string;
  startDate?: string;
  endDate?: string;
  deadline?: string;
  location?: string | { type?: string; address?: string; coordinates?: any };
  urgency?: string;
  isRemote?: boolean;
  requiredSkills?: string[];
  subcategoryData?: any;
  serviceDetails?: {
    guestCount?: string;
    duration?: string;
    cuisine?: string;
    accommodation?: string;
    kitchenEquipment?: string;
    serviceType?: string;
    eventType?: string;
    timeframe?: string;
    dietaryRestrictions?: string[];
    cuisineType?: string[];
  };
  requirements?: string[];
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  customer: {
    name: string;
    type: 'user' | 'company';
    email: string;
    avatar?: string;
    uid: string;
  };
  contactExchange?: {
    customerData?: {
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
      address?: string;
      postalCode?: string;
      city?: string;
      country?: string;
    };
    providerData?: {
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
      address?: string;
      postalCode?: string;
      city?: string;
      country?: string;
    };
    exchangedAt?: Date;
  };
  payment?: {
    provisionStatus?: 'pending' | 'paid' | 'failed';
    provisionAmount?: number;
    provisionPaymentIntentId?: string;
    paymentIntentId?: string;
    createdAt?: string;
    paidAt?: string;
  };
  customerDecision?: {
    action: 'accepted' | 'declined';
    timestamp: Date;
    message?: string;
  };
  response?: QuoteResponse;
  createdAt: Date;
  customerType?: string;
  customerUid?: string;
  customerCompanyUid?: string;
}

// Interface für Angebots-Antwort
interface QuoteResponse {
  serviceItems: Array<{
    title: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    // Neue Felder für zeitbasierte Projekte
    isTimeBasedProject?: boolean;
    startDate?: string;
    endDate?: string;
    hoursPerDay?: number;
    workingDays?: string[];
  }>;
  totalAmount: number;
  currency: string;
  timeline: string;
  terms: string;
  validUntil: string;
  notes: string;
}

export default function QuoteResponsePage({
  params,
}: {
  params: Promise<{ uid: string; quoteId: string }>;
}) {
  const [quote, setQuote] = useState<QuoteRequest | null>(null);
  const [response, setResponse] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const router = useRouter();
  const { firebaseUser } = useAuth();
  const stripe = useStripe();
  const elements = useElements();

  // Unwrap params promise using React.use()
  const resolvedParams = use(params);

  // Helper function to ensure we get a string from params
  const getCompanyId = (): string => {
    return Array.isArray(resolvedParams.uid) ? resolvedParams.uid[0] : resolvedParams.uid;
  };

  const getQuoteId = (): string => {
    return Array.isArray(resolvedParams.quoteId)
      ? resolvedParams.quoteId[0]
      : resolvedParams.quoteId;
  };

  // View-Count erhöhen
  const incrementViewCount = async (quoteId: string, token: string) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}/view`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ View-Count erhöht:`, data);
      } else {
        console.warn('⚠️ View-Count konnte nicht erhöht werden');
      }
    } catch (error) {
      console.error('❌ Fehler beim Erhöhen des View-Counts:', error);
    }
  };

  // Lade Angebots-Anfrage Details
  const fetchQuoteDetails = async () => {
    try {
      if (!firebaseUser) return;

      const token = await firebaseUser.getIdToken();
      if (!token) return;

      const companyId = getCompanyId();
      const quoteId = getQuoteId();

      console.log('🔍 Fetching quote details:', { companyId, quoteId });

      const apiResponse = await fetch(`/api/company/${companyId}/quotes/incoming/${quoteId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('📡 API Response status:', apiResponse.status);

      if (apiResponse.ok) {
        const data = await apiResponse.json();
        console.log('✅ Quote data received:', data);
        setQuote(data.quote);

        // View-Count erhöhen (nach erfolgreichem Laden)
        await incrementViewCount(quoteId, token);
      } else {
        const errorData = await apiResponse.json().catch(() => ({}));
        console.error('❌ Fehler beim Laden der Angebots-Anfrage:', {
          status: apiResponse.status,
          statusText: apiResponse.statusText,
          error: errorData,
        });

        if (apiResponse.status === 404) {
          console.error('📋 Quote nicht gefunden - ID:', quoteId);
        }

        // Nicht automatisch weiterleiten, sondern Fehler anzeigen
        // router.push(`/dashboard/company/${companyId}/quotes/incoming`);
      }
    } catch (error) {
      console.error('💥 Fehler beim Laden der Angebots-Anfrage:', error);
      // Nicht automatisch weiterleiten bei Fehlern
      // router.push(`/dashboard/company/${getCompanyId()}/quotes/incoming`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const quoteId = getQuoteId();
    if (firebaseUser && quoteId) {
      fetchQuoteDetails();
    }
  }, [firebaseUser]);

  // Angebot senden
  const submitResponse = async (responseData?: any) => {
    try {
      setSubmitting(true);

      if (!firebaseUser) return;
      const token = await firebaseUser.getIdToken();

      // Verwende responseData falls vorhanden, sonst die globale response Variable
      const dataToSend = responseData || response;

      if (!dataToSend) {
        console.error('Keine Antwortdaten vorhanden');
        return;
      }

      const quoteId = getQuoteId();
      const requestPayload = {
        quoteId: quoteId,
        action: 'respond',
        response: dataToSend,
      };

      console.log('Sende Quote Response:', {
        url: '/api/quotes/respond',
        payload: requestPayload,
        hasToken: !!token,
      });

      const apiResponse = await fetch(`/api/quotes/respond`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      console.log('API Response Status:', apiResponse.status);

      if (apiResponse.ok) {
        const responseData = await apiResponse.json();
        console.log('Antwort erfolgreich gesendet:', responseData);
        const companyId = getCompanyId();
        router.push(`/dashboard/company/${companyId}/quotes/incoming`);
      } else {
        const errorText = await apiResponse.text();
        console.error('API Fehler Details:', {
          status: apiResponse.status,
          statusText: apiResponse.statusText,
          url: apiResponse.url,
          errorText: errorText,
        });

        try {
          const errorData = JSON.parse(errorText);
          console.error('Parsed Error Data:', errorData);
        } catch (parseError) {
          console.error('Error Response ist kein JSON:', errorText);
        }
      }
    } catch (error) {
      console.error('Network/Parse Fehler beim Senden der Antwort:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
        stack: error instanceof Error ? error.stack : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Angebot direkt ablehnen
  const declineQuote = async () => {
    try {
      setSubmitting(true);

      if (!firebaseUser) return;
      const token = await firebaseUser.getIdToken();

      const quoteId = getQuoteId();
      const apiResponse = await fetch(`/api/quotes/respond`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteId: quoteId,
          action: 'decline',
        }),
      });

      if (apiResponse.ok) {
        const companyId = getCompanyId();
        router.push(`/dashboard/company/${companyId}/quotes/incoming`);
      } else {
        console.error('Fehler beim Ablehnen');
      }
    } catch (error) {
      console.error('Fehler beim Ablehnen:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Provision zahlen mit Stripe
  const handlePayProvision = async (provisionAmount: number) => {
    if (!stripe || !elements) {
      alert('Stripe noch nicht geladen. Bitte warten Sie einen Moment.');
      return false;
    }

    try {
      setSubmitting(true);

      if (!firebaseUser) return false;
      const token = await firebaseUser.getIdToken();

      const companyId = getCompanyId();
      const quoteId = getQuoteId();

      console.log('[Frontend] Starting provision payment:', {
        companyId,
        quoteId,
        provisionAmount,
      });

      // Erstelle Payment Intent
      const response = await fetch(`/api/company/${companyId}/quotes/received/${quoteId}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'create_payment_intent',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.clientSecret) {
          console.log('[Frontend] Payment Intent created:', result);

          // Führe die Stripe Zahlung durch
          const cardElement = elements.getElement(CardElement);
          if (!cardElement) {
            throw new Error('Kreditkarten-Element nicht gefunden');
          }

          const { error, paymentIntent } = await stripe.confirmCardPayment(result.clientSecret, {
            payment_method: {
              card: cardElement,
            },
          });

          if (error) {
            throw new Error(error.message || 'Stripe-Zahlung fehlgeschlagen');
          }

          if (paymentIntent?.status === 'succeeded') {
            // Bestätige die Zahlung im Backend
            const confirmResponse = await fetch(
              `/api/company/${companyId}/quotes/received/${quoteId}/payment`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  action: 'confirm_payment',
                  paymentIntentId: paymentIntent.id,
                }),
              }
            );

            if (confirmResponse.ok) {
              const confirmResult = await confirmResponse.json();
              if (confirmResult.success) {
                alert('Provision erfolgreich bezahlt! Kontaktdaten werden ausgetauscht.');
                fetchQuoteDetails(); // Lade Quote neu
                return true;
              }
            }
          }
        } else {
          throw new Error(result.error || 'Fehler beim Erstellen des Payment Intents');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Netzwerkfehler');
      }
    } catch (error) {
      console.error('[Frontend] Error paying provision:', error);
      alert(`Fehler beim Zahlen der Provision: ${error.message}`);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Vertragsbedingungen akzeptieren und Provision zahlen
  const handleContractAccept = async () => {
    try {
      if (!quote?.response?.totalAmount) {
        console.error('Angebotssumme nicht verfügbar');
        return;
      }

      const totalAmountValue = quote.response.totalAmount;
      const totalAmount =
        typeof totalAmountValue === 'number'
          ? totalAmountValue
          : parseFloat(String(totalAmountValue) || '0');

      const provisionAmount = totalAmount * 0.05; // 5% Provision

      // Provision zahlen
      const success = await handlePayProvision(provisionAmount);

      // Modal nur schließen wenn Zahlung erfolgreich war
      if (success) {
        setShowPaymentModal(false);
      }
    } catch (error) {
      console.error('Fehler beim Vertragsabschluss:', error);
    }
  };

  // Format Datum
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

    // Handle string budget (like "1.000€ - 2.500€")
    if (typeof budget === 'string') {
      return budget;
    }

    // Handle object budget
    return `${budget.min.toLocaleString('de-DE')} - ${budget.max.toLocaleString('de-DE')} ${budget.currency}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FiLoader className="animate-spin h-8 w-8 text-[#14ad9f]" />
        <span className="ml-2 text-gray-600">Lade Angebots-Anfrage...</span>
      </div>
    );
  }

  if (!quote) {
    const quoteId = getQuoteId();
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FiAlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Angebots-Anfrage nicht gefunden
          </h2>
          <p className="text-gray-600 mb-2">
            Die angeforderte Angebots-Anfrage konnte nicht gefunden werden.
          </p>
          <p className="text-gray-500 text-sm mb-4">Quote-ID: {quoteId}</p>
          <button
            onClick={() => router.push(`/dashboard/company/${getCompanyId()}/quotes/incoming`)}
            className="bg-[#14ad9f] hover:bg-[#129488] text-white px-4 py-2 rounded-lg"
          >
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/dashboard/company/${getCompanyId()}/quotes/incoming`)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <FiArrowLeft className="mr-2 h-4 w-4" />
            Zurück zu eingehenden Anfragen
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{quote.title}</h1>
              <p className="text-gray-600 mt-1">
                {quote.serviceCategory} • {quote.serviceSubcategory}
              </p>
            </div>

            {quote.status === 'pending' && (
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowResponseForm(true)}
                  className="bg-[#14ad9f] hover:bg-[#129488] text-white px-4 py-2 rounded-lg flex items-center"
                >
                  <FiSend className="mr-2 h-4 w-4" />
                  Angebot erstellen
                </button>
                <button
                  onClick={declineQuote}
                  disabled={submitting}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center"
                >
                  <FiX className="mr-2 h-4 w-4" />
                  Ablehnen
                </button>
              </div>
            )}

            {quote.status === 'responded' && (
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  Angebot abgegeben
                </div>
                <button
                  onClick={declineQuote}
                  disabled={submitting}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center"
                >
                  <FiX className="mr-2 h-4 w-4" />
                  Zurückziehen
                </button>
              </div>
            )}

            {quote.status === 'accepted' && (
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                ✅ Angebot angenommen
              </div>
            )}

            {quote.status === 'declined' && (
              <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                ❌ Angebot abgelehnt
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hauptinhalt */}
          <div className="lg:col-span-2 space-y-6">
            {/* Projektbeschreibung */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Projektbeschreibung</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{quote.description}</p>

              {quote.requirements && quote.requirements.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-900 mb-2">Anforderungen:</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {quote.requirements.map((req, index) => (
                      <li key={index}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Projektdetails */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Projektdetails</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center text-gray-600 mb-2">
                    <FiDollarSign className="mr-2 h-4 w-4" />
                    Budget
                  </div>
                  <p className="text-gray-900 font-medium">
                    {formatBudget(quote.budgetRange || quote.budget)}
                  </p>
                </div>

                <div>
                  <div className="flex items-center text-gray-600 mb-2">
                    <FiClock className="mr-2 h-4 w-4" />
                    Projekttyp
                  </div>
                  <p className="text-gray-900 font-medium">
                    {quote.projectType === 'fixed_price'
                      ? 'Festpreis'
                      : quote.projectType === 'hourly'
                        ? 'Stundenbasis'
                        : 'Projekt'}
                  </p>
                </div>

                {quote.timeline && (
                  <div>
                    <div className="flex items-center text-gray-600 mb-2">
                      <FiCalendar className="mr-2 h-4 w-4" />
                      Zeitrahmen
                    </div>
                    <p className="text-gray-900 font-medium">{quote.timeline}</p>
                  </div>
                )}

                {(quote.startDate || quote.endDate) && (
                  <div>
                    <div className="flex items-center text-gray-600 mb-2">
                      <FiCalendar className="mr-2 h-4 w-4" />
                      Zeitplan
                    </div>
                    <p className="text-gray-900 font-medium">
                      {quote.startDate && quote.endDate
                        ? `${new Date(quote.startDate).toLocaleDateString('de-DE')} - ${new Date(quote.endDate).toLocaleDateString('de-DE')}`
                        : quote.startDate
                          ? `Ab ${new Date(quote.startDate).toLocaleDateString('de-DE')}`
                          : quote.endDate
                            ? `Bis ${new Date(quote.endDate).toLocaleDateString('de-DE')}`
                            : 'Nicht angegeben'}
                    </p>
                  </div>
                )}

                {quote.urgency && (
                  <div>
                    <div className="flex items-center text-gray-600 mb-2">
                      <FiClock className="mr-2 h-4 w-4" />
                      Priorität
                    </div>
                    <p className="text-gray-900 font-medium">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          quote.urgency === 'high'
                            ? 'bg-red-100 text-red-800'
                            : quote.urgency === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {quote.urgency === 'high'
                          ? 'Dringend'
                          : quote.urgency === 'medium'
                            ? 'Normal'
                            : 'Niedrig'}
                      </span>
                    </p>
                  </div>
                )}

                {quote.deadline && (
                  <div>
                    <div className="flex items-center text-gray-600 mb-2">
                      <FiCalendar className="mr-2 h-4 w-4" />
                      Deadline
                    </div>
                    <p className="text-gray-900 font-medium">{formatDate(quote.deadline)}</p>
                  </div>
                )}

                {quote.location && (
                  <div>
                    <div className="flex items-center text-gray-600 mb-2">
                      <FiMapPin className="mr-2 h-4 w-4" />
                      Standort
                    </div>
                    <p className="text-gray-900 font-medium">
                      {typeof quote.location === 'string'
                        ? quote.location
                        : quote.location.address || 'Standort angegeben'}
                    </p>
                  </div>
                )}

                {quote.isRemote !== undefined && (
                  <div>
                    <div className="flex items-center text-gray-600 mb-2">
                      <FiMapPin className="mr-2 h-4 w-4" />
                      Arbeitsweise
                    </div>
                    <p className="text-gray-900 font-medium">
                      {quote.isRemote ? 'Remote möglich' : 'Vor Ort erforderlich'}
                    </p>
                  </div>
                )}
              </div>

              {/* Service-spezifische Details für Mietkoch */}
              {quote.serviceDetails && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Service-Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quote.serviceDetails.guestCount && (
                      <div>
                        <div className="text-gray-600 mb-1">Gästeanzahl</div>
                        <p className="text-gray-900 font-medium">
                          {quote.serviceDetails.guestCount} Personen
                        </p>
                      </div>
                    )}

                    {quote.serviceDetails.duration && (
                      <div>
                        <div className="text-gray-600 mb-1">Dauer</div>
                        <p className="text-gray-900 font-medium">
                          {quote.serviceDetails.duration === 'halbtag'
                            ? 'Halbtag'
                            : quote.serviceDetails.duration === 'ganztag'
                              ? 'Ganztag'
                              : quote.serviceDetails.duration}
                        </p>
                      </div>
                    )}

                    {quote.serviceDetails.cuisine && (
                      <div>
                        <div className="text-gray-600 mb-1">Küche</div>
                        <p className="text-gray-900 font-medium">{quote.serviceDetails.cuisine}</p>
                      </div>
                    )}

                    {quote.serviceDetails.accommodation && (
                      <div>
                        <div className="text-gray-600 mb-1">Übernachtung</div>
                        <p className="text-gray-900 font-medium">
                          {quote.serviceDetails.accommodation === 'mit_übernachtung'
                            ? 'Mit Übernachtung'
                            : quote.serviceDetails.accommodation === 'ohne_übernachtung'
                              ? 'Ohne Übernachtung'
                              : quote.serviceDetails.accommodation}
                        </p>
                      </div>
                    )}

                    {quote.serviceDetails.kitchenEquipment && (
                      <div>
                        <div className="text-gray-600 mb-1">Küchenausstattung</div>
                        <p className="text-gray-900 font-medium">
                          {quote.serviceDetails.kitchenEquipment === 'vorhanden'
                            ? 'Vorhanden'
                            : quote.serviceDetails.kitchenEquipment === 'nicht_vorhanden'
                              ? 'Nicht vorhanden'
                              : quote.serviceDetails.kitchenEquipment}
                        </p>
                      </div>
                    )}

                    {quote.serviceDetails.serviceType && (
                      <div>
                        <div className="text-gray-600 mb-1">Service-Typ</div>
                        <p className="text-gray-900 font-medium">
                          {quote.serviceDetails.serviceType === 'hotel'
                            ? 'Hotel'
                            : quote.serviceDetails.serviceType === 'privat'
                              ? 'Privat'
                              : quote.serviceDetails.serviceType}
                        </p>
                      </div>
                    )}

                    {quote.serviceDetails.eventType && (
                      <div>
                        <div className="text-gray-600 mb-1">Event-Typ</div>
                        <p className="text-gray-900 font-medium">
                          {quote.serviceDetails.eventType}
                        </p>
                      </div>
                    )}
                  </div>

                  {quote.serviceDetails.cuisineType &&
                    quote.serviceDetails.cuisineType.length > 0 && (
                      <div className="mt-4">
                        <div className="text-gray-600 mb-2">Küchen-Arten</div>
                        <div className="flex flex-wrap gap-2">
                          {quote.serviceDetails.cuisineType.map((cuisine, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {cuisine}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {quote.serviceDetails.dietaryRestrictions &&
                    quote.serviceDetails.dietaryRestrictions.length > 0 && (
                      <div className="mt-4">
                        <div className="text-gray-600 mb-2">Diät-Beschränkungen</div>
                        <div className="flex flex-wrap gap-2">
                          {quote.serviceDetails.dietaryRestrictions.map((restriction, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                            >
                              {restriction}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {quote.requiredSkills && quote.requiredSkills.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-md font-semibold text-gray-900 mb-3">
                    Benötigte Fähigkeiten
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {quote.requiredSkills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#14ad9f] bg-opacity-10 text-[#14ad9f]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Anlagen */}
            {quote.attachments && quote.attachments.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Anlagen</h2>
                <div className="space-y-2">
                  {quote.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center">
                        <FiFileText className="mr-3 h-5 w-5 text-gray-400" />
                        <span className="text-gray-900">{attachment.name}</span>
                      </div>
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#14ad9f] hover:text-[#129488]"
                      >
                        Herunterladen
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Seitenleiste */}
          <div className="space-y-6">
            {/* Kundeninformationen */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Kundeninformationen</h2>

              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 h-12 w-12">
                  {quote.customer.avatar ? (
                    <img className="h-12 w-12 rounded-full" src={quote.customer.avatar} alt="" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                      {quote.customer.type === 'company' ? (
                        <FiBuilding className="h-6 w-6 text-gray-600" />
                      ) : (
                        <FiUser className="h-6 w-6 text-gray-600" />
                      )}
                    </div>
                  )}
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">{quote.customer.name}</div>
                  <div className="text-sm text-gray-500">
                    {quote.customer.type === 'company' ? 'Unternehmen' : 'Privatkunde'}
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p>Anfrage eingegangen:</p>
                <p className="font-medium text-gray-900">{formatDate(quote.createdAt)}</p>
              </div>
            </div>

            {/* Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>

              <div className="space-y-3">
                <div
                  className={`p-3 rounded-lg ${
                    quote.status === 'pending'
                      ? 'bg-yellow-50 border border-yellow-200'
                      : quote.status === 'responded'
                        ? 'bg-blue-50 border border-blue-200'
                        : quote.status === 'accepted'
                          ? quote.payment?.provisionStatus === 'paid'
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-yellow-50 border border-yellow-200'
                          : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-center">
                    <div
                      className={`flex-shrink-0 h-2 w-2 rounded-full ${
                        quote.status === 'pending'
                          ? 'bg-yellow-400'
                          : quote.status === 'responded'
                            ? 'bg-blue-400'
                            : quote.status === 'accepted'
                              ? quote.payment?.provisionStatus === 'paid'
                                ? 'bg-green-400'
                                : 'bg-yellow-400'
                              : 'bg-red-400'
                      }`}
                    />
                    <span
                      className={`ml-3 text-sm font-medium ${
                        quote.status === 'pending'
                          ? 'text-yellow-800'
                          : quote.status === 'responded'
                            ? 'text-blue-800'
                            : quote.status === 'accepted'
                              ? quote.payment?.provisionStatus === 'paid'
                                ? 'text-green-800'
                                : 'text-yellow-800'
                              : 'text-red-800'
                      }`}
                    >
                      {quote.status === 'pending'
                        ? 'Wartend auf Antwort'
                        : quote.status === 'responded'
                          ? 'Angebot gesendet'
                          : quote.status === 'accepted'
                            ? quote.payment?.provisionStatus === 'paid'
                              ? 'Angebot angenommen'
                              : 'Zahlung ausstehend'
                            : 'Angebot abgelehnt'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Kontaktdaten (nur bei angenommenen Angeboten UND bezahlter Provision) - Eigenständiger Container */}
        {quote.status === 'accepted' &&
          quote.payment?.provisionStatus === 'paid' &&
          quote.contactExchange && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <FiCheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Kontaktdaten ausgetauscht</h2>
                  <p className="text-sm text-gray-600">
                    Sie können nun direkt mit dem Kunden kommunizieren
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Kundendaten */}
                {quote.contactExchange.customerData && (
                  <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center text-lg">
                      <FiUser className="h-5 w-5 mr-3 text-blue-600" />
                      Kundendaten
                    </h3>
                    <div className="space-y-4">
                      {quote.contactExchange.customerData.name && (
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                          <span className="font-medium text-gray-700 mb-1 sm:mb-0 min-w-0 sm:w-24">
                            Name:
                          </span>
                          <span className="text-gray-900 font-medium break-words">
                            {quote.contactExchange.customerData.name}
                          </span>
                        </div>
                      )}
                      {quote.contactExchange.customerData.email && (
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                          <span className="font-medium text-gray-700 mb-1 sm:mb-0 min-w-0 sm:w-24">
                            Email:
                          </span>
                          <a
                            href={`mailto:${quote.contactExchange.customerData.email}`}
                            className="text-[#14ad9f] hover:text-[#129488] hover:underline font-medium break-all"
                          >
                            {quote.contactExchange.customerData.email}
                          </a>
                        </div>
                      )}
                      {quote.contactExchange.customerData.phone && (
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                          <span className="font-medium text-gray-700 mb-1 sm:mb-0 min-w-0 sm:w-24">
                            Telefon:
                          </span>
                          <a
                            href={`tel:${quote.contactExchange.customerData.phone}`}
                            className="text-[#14ad9f] hover:text-[#129488] hover:underline font-medium"
                          >
                            {quote.contactExchange.customerData.phone}
                          </a>
                        </div>
                      )}
                      {quote.contactExchange.customerData.address && (
                        <div className="bg-white rounded-lg p-3 border border-blue-200">
                          <span className="font-medium text-gray-700 block mb-2">Adresse:</span>
                          <div className="space-y-1">
                            <span className="text-gray-900 font-medium block">
                              {quote.contactExchange.customerData.address}
                            </span>
                            {(quote.contactExchange.customerData.postalCode ||
                              quote.contactExchange.customerData.city) && (
                              <span className="text-gray-700 text-sm block">
                                {quote.contactExchange.customerData.postalCode &&
                                  quote.contactExchange.customerData.postalCode}
                                {quote.contactExchange.customerData.postalCode &&
                                  quote.contactExchange.customerData.city &&
                                  ' '}
                                {quote.contactExchange.customerData.city &&
                                  quote.contactExchange.customerData.city}
                              </span>
                            )}
                            {quote.contactExchange.customerData.country &&
                              quote.contactExchange.customerData.country !== 'DE' && (
                                <span className="text-gray-600 text-sm block">
                                  {quote.contactExchange.customerData.country}
                                </span>
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Ihre Daten */}
                {quote.contactExchange.providerData && (
                  <div className="bg-green-50 rounded-xl p-6 border border-green-100">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center text-lg">
                      <FiBuilding className="h-5 w-5 mr-3 text-green-600" />
                      Ihre freigegebenen Daten
                    </h3>
                    <div className="space-y-4">
                      {quote.contactExchange.providerData.name && (
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                          <span className="font-medium text-gray-700 mb-1 sm:mb-0 min-w-0 sm:w-24">
                            Name:
                          </span>
                          <span className="text-gray-900 font-medium break-words">
                            {quote.contactExchange.providerData.name}
                          </span>
                        </div>
                      )}
                      {quote.contactExchange.providerData.email && (
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                          <span className="font-medium text-gray-700 mb-1 sm:mb-0 min-w-0 sm:w-24">
                            Email:
                          </span>
                          <span className="text-gray-900 font-medium break-all">
                            {quote.contactExchange.providerData.email}
                          </span>
                        </div>
                      )}
                      {quote.contactExchange.providerData.phone && (
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                          <span className="font-medium text-gray-700 mb-1 sm:mb-0 min-w-0 sm:w-24">
                            Telefon:
                          </span>
                          <span className="text-gray-900 font-medium">
                            {quote.contactExchange.providerData.phone}
                          </span>
                        </div>
                      )}
                      {quote.contactExchange.providerData.address && (
                        <div className="bg-white rounded-lg p-3 border border-green-200">
                          <span className="font-medium text-gray-700 block mb-2">Adresse:</span>
                          <div className="space-y-1">
                            <span className="text-gray-900 font-medium block">
                              {quote.contactExchange.providerData.address}
                            </span>
                            {(quote.contactExchange.providerData.postalCode ||
                              quote.contactExchange.providerData.city) && (
                              <span className="text-gray-700 text-sm block">
                                {quote.contactExchange.providerData.postalCode &&
                                  quote.contactExchange.providerData.postalCode}
                                {quote.contactExchange.providerData.postalCode &&
                                  quote.contactExchange.providerData.city &&
                                  ' '}
                                {quote.contactExchange.providerData.city &&
                                  quote.contactExchange.providerData.city}
                              </span>
                            )}
                            {quote.contactExchange.providerData.country &&
                              quote.contactExchange.providerData.country !== 'DE' && (
                                <span className="text-gray-600 text-sm block">
                                  {quote.contactExchange.providerData.country}
                                </span>
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {quote.contactExchange.exchangedAt && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center text-xs text-gray-500">
                    <FiCalendar className="w-3 h-3 mr-1" />
                    Kontaktdaten ausgetauscht am:{' '}
                    {(() => {
                      try {
                        const date = quote.contactExchange.exchangedAt;
                        if (date && typeof date === 'object' && '_seconds' in date) {
                          // Firestore timestamp format
                          const seconds = date._seconds as number;
                          return new Date(seconds * 1000).toLocaleString('de-DE');
                        } else if (date) {
                          // Regular Date format
                          return new Date(date).toLocaleString('de-DE');
                        }
                        return 'Unbekannt';
                      } catch (error) {
                        console.error('Error formatting exchanged date:', error);
                        return 'Unbekannt';
                      }
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

        {/* Payment Section für angenommene Angebote */}
        {quote.status === 'accepted' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <FiCheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Angebot angenommen!</h2>
                <p className="text-sm text-gray-600">Der Kunde hat Ihr Angebot angenommen.</p>
              </div>
            </div>

            {/* Payment Status */}
            {!quote.payment?.provisionStatus || quote.payment.provisionStatus === 'pending' ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <FiAlertCircle className="h-6 w-6 text-yellow-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-medium text-yellow-800">Provision erforderlich</h3>
                    <p className="text-sm text-yellow-700">
                      Bevor die Kontaktdaten ausgetauscht werden können, müssen Sie eine Provision
                      von 5% zahlen.
                    </p>
                  </div>
                </div>

                {(() => {
                  // Hole totalAmount aus response
                  const response = quote as any; // Temporärer Cast
                  const totalAmount = response.response?.totalAmount
                    ? typeof response.response.totalAmount === 'number'
                      ? response.response.totalAmount
                      : parseFloat(response.response.totalAmount?.toString() || '0')
                    : 0;
                  const provisionAmount = totalAmount * 0.05; // 5% Provision

                  return totalAmount > 0 ? (
                    <div className="bg-white rounded-lg p-4 border border-yellow-100">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-2">
                          Angebotssumme: <strong>{totalAmount.toFixed(2)} €</strong>
                        </p>
                        <p className="text-lg font-semibold text-yellow-800 mb-4">
                          Zu zahlende Provision: <strong>{provisionAmount.toFixed(2)} €</strong>
                        </p>

                        <button
                          onClick={() => setShowPaymentModal(true)}
                          disabled={submitting}
                          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? (
                            <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                          ) : (
                            <FiDollarSign className="-ml-1 mr-2 h-4 w-4" />
                          )}
                          Provision jetzt zahlen
                        </button>

                        <p className="text-xs text-gray-500 mt-2">
                          Nach der Zahlung werden die Kontaktdaten automatisch ausgetauscht.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-yellow-700">
                      <p>Angebotssumme konnte nicht ermittelt werden.</p>
                    </div>
                  );
                })()}
              </div>
            ) : quote.payment.provisionStatus === 'paid' ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center justify-center mb-2">
                  <FiCheckCircle className="h-8 w-8 text-green-600 mr-3" />
                  <div className="text-left">
                    <h3 className="text-lg font-medium text-green-800">Provision bezahlt</h3>
                    <p className="text-sm text-green-700">
                      Die Kontaktdaten wurden automatisch ausgetauscht.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Provision bezahlt am:{' '}
                  {quote.payment.paidAt
                    ? new Date(quote.payment.paidAt).toLocaleDateString('de-DE')
                    : 'Unbekannt'}
                </p>
              </div>
            ) : quote.payment.provisionStatus === 'failed' ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center justify-center mb-2">
                  <FiAlertCircle className="h-8 w-8 text-red-600 mr-3" />
                  <div className="text-left">
                    <h3 className="text-lg font-medium text-red-800">Zahlung fehlgeschlagen</h3>
                    <p className="text-sm text-red-700">
                      Die Provision konnte nicht bezahlt werden. Bitte versuchen Sie es erneut.
                    </p>
                  </div>
                </div>

                <div className="text-center mt-4">
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    disabled={submitting}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    ) : (
                      <FiDollarSign className="-ml-1 mr-2 h-4 w-4" />
                    )}
                    Erneut versuchen
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Angebot erstellen Modal */}
        {showResponseForm && (
          <div className="fixed inset-0 bg-transparent backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Angebot erstellen</h2>
                  <button
                    onClick={() => setShowResponseForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="h-6 w-6" />
                  </button>
                </div>

                <QuoteFormToggle
                  companyId={getCompanyId()}
                  onSubmit={async data => {
                    try {
                      console.log('📊 Received form data:', data);

                      let quoteData;

                      // Prüfe, ob es zeitbasierte Projekte sind (TimeBasedQuoteForm)
                      if (data.timeBasedProjects && Array.isArray(data.timeBasedProjects)) {
                        console.log('🕒 Processing time-based projects:', data.timeBasedProjects);

                        quoteData = {
                          message:
                            data.message ||
                            data.additionalNotes ||
                            'Zeitbasiertes Angebot erstellt',
                          serviceItems: data.timeBasedProjects.map((project: any) => ({
                            title: project.title || 'Zeitbasiertes Projekt',
                            description:
                              project.description || project.title || 'Zeitbasiertes Projekt',
                            quantity: 1,
                            unitPrice: project.totalAmount || 0,
                            total: project.totalAmount || 0,
                            // Zeitbasierte Projekt-Daten
                            isTimeBasedProject: true,
                            startDate: project.startDate,
                            endDate: project.endDate,
                            hoursPerDay: project.hoursPerDay,
                            workingDays: project.workingDays,
                          })),
                          totalAmount: data.timeBasedProjects.reduce(
                            (sum: number, project: any) => sum + (project.totalAmount || 0),
                            0
                          ),
                          currency: 'EUR',
                          timeline: data.timeline || '',
                          terms: data.terms || '',
                          validUntil: data.validUntil || '',
                          notes: data.additionalNotes || '',
                        };
                      }
                      // Standard-Angebot (QuoteResponseForm)
                      else if (data.serviceItems && Array.isArray(data.serviceItems)) {
                        console.log('📦 Processing standard service items:', data.serviceItems);

                        quoteData = {
                          message:
                            data.message || data.additionalNotes || 'Standard-Angebot erstellt',
                          serviceItems: data.serviceItems.map((item: any) => ({
                            title: item.description || item.title || 'Service',
                            description: item.description || item.title || 'Service',
                            quantity: item.quantity || 1,
                            unitPrice: item.unitPrice || 0,
                            total: (item.quantity || 1) * (item.unitPrice || 0),
                          })),
                          totalAmount: data.serviceItems.reduce(
                            (sum: number, item: any) =>
                              sum + (item.quantity || 1) * (item.unitPrice || 0),
                            0
                          ),
                          currency: 'EUR',
                          timeline: data.estimatedDuration || data.timeline || '',
                          terms: data.terms || '',
                          validUntil: data.availableFrom || data.validUntil || '',
                          notes: data.additionalNotes || data.notes || '',
                        };
                      }
                      // Fallback für andere Datenstrukturen
                      else {
                        console.log('🔄 Processing fallback data structure');

                        quoteData = {
                          message: data.message || data.additionalNotes || 'Angebot erstellt',
                          serviceItems: [
                            {
                              title: 'Standard Service',
                              description: data.description || 'Standard Service',
                              quantity: 1,
                              unitPrice: data.estimatedPrice || 0,
                              total: data.estimatedPrice || 0,
                            },
                          ],
                          totalAmount: data.estimatedPrice || 0,
                          currency: 'EUR',
                          timeline: data.estimatedDuration || data.timeline || '',
                          terms: data.terms || '',
                          validUntil: data.availableFrom || data.validUntil || '',
                          notes: data.additionalNotes || data.notes || '',
                        };
                      }

                      console.log('📋 Converted quote data:', quoteData);

                      // Direkt mit den konvertierten Daten senden
                      await submitResponse(quoteData);
                    } catch (error) {
                      console.error('❌ Fehler beim Verarbeiten der Form-Daten:', error);
                      console.error('📊 Original data:', data);
                    }
                  }}
                  onCancel={() => setShowResponseForm(false)}
                  loading={submitting}
                />
              </div>
            </div>
          </div>
        )}

        {/* Contract Terms Modal for Provision Payment */}
        {quote && quote.status === 'accepted' && showPaymentModal && (
          <ContractTermsModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            onAccept={handleContractAccept}
            userType="provider"
            quoteAmount={quote.response?.totalAmount || 0}
            quoteTitle={quote.title}
          />
        )}
      </div>
    </div>
  );
}
