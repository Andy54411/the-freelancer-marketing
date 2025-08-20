'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  deadline?: string;
  location?: string;
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
  customerDecision?: {
    action: 'accepted' | 'declined';
    timestamp: Date;
    message?: string;
  };
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

export default function IncomingQuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { firebaseUser } = useAuth();

  const [quote, setQuote] = useState<QuoteRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showResponseForm, setShowResponseForm] = useState(false);

  // Angebots-Antwort State - nur für submitResponse Funktion benötigt
  const [response, setResponse] = useState<QuoteResponse>({
    serviceItems: [],
    totalAmount: 0,
    currency: 'EUR',
    timeline: '',
    terms: '',
    validUntil: '',
    notes: '',
  });

  // Lade Angebots-Anfrage Details
  const fetchQuoteDetails = async () => {
    try {
      if (!firebaseUser) return;

      const token = await firebaseUser.getIdToken();
      if (!token) return;

      const apiResponse = await fetch(
        `/api/company/${params.uid}/quotes/incoming/${params.quoteId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (apiResponse.ok) {
        const data = await apiResponse.json();
        setQuote(data.quote);
      } else {
        console.error('Fehler beim Laden der Angebots-Anfrage');
        router.push(`/dashboard/company/${params.uid}/quotes/incoming`);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Angebots-Anfrage:', error);
      router.push(`/dashboard/company/${params.uid}/quotes/incoming`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (firebaseUser && params.quoteId) {
      fetchQuoteDetails();
    }
  }, [firebaseUser, params.quoteId]);

  // Angebot senden
  const submitResponse = async () => {
    try {
      setSubmitting(true);

      if (!firebaseUser) return;
      const token = await firebaseUser.getIdToken();

      const apiResponse = await fetch(`/api/quotes/${params.quoteId}/respond`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'respond',
          response: response,
        }),
      });

      if (apiResponse.ok) {
        router.push(`/dashboard/company/${params.uid}/quotes/incoming`);
      } else {
        console.error('Fehler beim Senden der Antwort');
      }
    } catch (error) {
      console.error('Fehler beim Senden der Antwort:', error);
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

      const apiResponse = await fetch(`/api/quotes/${params.quoteId}/respond`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'decline',
        }),
      });

      if (apiResponse.ok) {
        router.push(`/dashboard/company/${params.uid}/quotes/incoming`);
      } else {
        console.error('Fehler beim Ablehnen');
      }
    } catch (error) {
      console.error('Fehler beim Ablehnen:', error);
    } finally {
      setSubmitting(false);
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FiAlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Angebots-Anfrage nicht gefunden
          </h2>
          <p className="text-gray-600 mb-4">
            Die angeforderte Angebots-Anfrage konnte nicht gefunden werden.
          </p>
          <button
            onClick={() => router.push(`/dashboard/company/${params.uid}/quotes/incoming`)}
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
            onClick={() => router.push(`/dashboard/company/${params.uid}/quotes/incoming`)}
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
                    <p className="text-gray-900 font-medium">{quote.location}</p>
                  </div>
                )}
              </div>
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
                          ? 'bg-green-50 border border-green-200'
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
                              ? 'bg-green-400'
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
                              ? 'text-green-800'
                              : 'text-red-800'
                      }`}
                    >
                      {quote.status === 'pending'
                        ? 'Wartend auf Antwort'
                        : quote.status === 'responded'
                          ? 'Angebot gesendet'
                          : quote.status === 'accepted'
                            ? 'Angebot angenommen'
                            : 'Angebot abgelehnt'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Kontaktdaten (nur bei angenommenen Angeboten) - Eigenständiger Container */}
        {quote.status === 'accepted' && quote.contactExchange && (
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
                  companyId={params.uid}
                  onSubmit={async data => {
                    // Konvertiere die FormData in das erwartete Format
                    const quoteData = {
                      serviceItems: data.serviceItems.map(item => ({
                        title: item.description,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        total: item.quantity * item.unitPrice,
                      })),
                      totalAmount: data.serviceItems.reduce(
                        (sum, item) => sum + item.quantity * item.unitPrice,
                        0
                      ),
                      currency: 'EUR',
                      timeline: data.estimatedDuration || '',
                      terms: '',
                      validUntil: data.availableFrom || '',
                      notes: data.additionalNotes || '',
                    };
                    setResponse(quoteData);
                    await submitResponse();
                  }}
                  onCancel={() => setShowResponseForm(false)}
                  loading={submitting}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
