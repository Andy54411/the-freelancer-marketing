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
  X as FiX,
  Loader2 as FiLoader,
  AlertCircle as FiAlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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

  // Angebots-Antwort State
  const [response, setResponse] = useState<QuoteResponse>({
    serviceItems: [{ title: '', description: '', quantity: 1, unitPrice: 0, total: 0 }],
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

      const apiResponse = await fetch(`/api/quotes/${params.quoteId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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

  // Service Item hinzufügen
  const addServiceItem = () => {
    setResponse(prev => ({
      ...prev,
      serviceItems: [
        ...prev.serviceItems,
        { title: '', description: '', quantity: 1, unitPrice: 0, total: 0 },
      ],
    }));
  };

  // Service Item entfernen
  const removeServiceItem = (index: number) => {
    setResponse(prev => ({
      ...prev,
      serviceItems: prev.serviceItems.filter((_, i) => i !== index),
    }));
  };

  // Service Item aktualisieren
  const updateServiceItem = (index: number, field: string, value: any) => {
    setResponse(prev => {
      const newItems = [...prev.serviceItems];
      newItems[index] = { ...newItems[index], [field]: value };

      // Berechne Total für dieses Item
      if (field === 'quantity' || field === 'unitPrice') {
        newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
      }

      // Berechne Gesamtsumme
      const totalAmount = newItems.reduce((sum, item) => sum + item.total, 0);

      return {
        ...prev,
        serviceItems: newItems,
        totalAmount,
      };
    });
  };

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
  const formatBudget = (budget?: { min: number; max: number; currency: string }) => {
    if (!budget) return 'Nicht angegeben';
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
                  <p className="text-gray-900 font-medium">{formatBudget(quote.budget)}</p>
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

                <div className="space-y-6">
                  {/* Service Items */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Leistungen</h3>
                      <button
                        onClick={addServiceItem}
                        className="bg-[#14ad9f] hover:bg-[#129488] text-white px-3 py-1 rounded text-sm"
                      >
                        Position hinzufügen
                      </button>
                    </div>

                    <div className="space-y-4">
                      {response.serviceItems.map((item, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="lg:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Titel
                              </label>
                              <input
                                type="text"
                                value={item.title}
                                onChange={e => updateServiceItem(index, 'title', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                                placeholder="z.B. Webdesign"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Menge
                              </label>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={e =>
                                  updateServiceItem(
                                    index,
                                    'quantity',
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                                min="1"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Einzelpreis (EUR)
                              </label>
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={e =>
                                  updateServiceItem(
                                    index,
                                    'unitPrice',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </div>

                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Beschreibung
                            </label>
                            <textarea
                              value={item.description}
                              onChange={e =>
                                updateServiceItem(index, 'description', e.target.value)
                              }
                              rows={2}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                              placeholder="Detaillierte Beschreibung der Leistung"
                            />
                          </div>

                          <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-gray-600">
                              Zwischensumme:{' '}
                              <span className="font-medium text-white">
                                {item.total.toLocaleString('de-DE', {
                                  style: 'currency',
                                  currency: 'EUR',
                                })}
                              </span>
                            </div>
                            {response.serviceItems.length > 1 && (
                              <button
                                onClick={() => removeServiceItem(index)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Entfernen
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-medium text-gray-900">Gesamtsumme:</span>
                        <span className="text-xl font-bold text-white">
                          {response.totalAmount.toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'EUR',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Weitere Angaben */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Zeitrahmen
                      </label>
                      <input
                        type="text"
                        value={response.timeline}
                        onChange={e => setResponse(prev => ({ ...prev, timeline: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                        placeholder="z.B. 2-3 Wochen"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gültig bis
                      </label>
                      <input
                        type="date"
                        value={response.validUntil}
                        onChange={e =>
                          setResponse(prev => ({ ...prev, validUntil: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bedingungen
                    </label>
                    <textarea
                      value={response.terms}
                      onChange={e => setResponse(prev => ({ ...prev, terms: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                      placeholder="Zahlungsbedingungen, Garantien, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Zusätzliche Notizen
                    </label>
                    <textarea
                      value={response.notes}
                      onChange={e => setResponse(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                      placeholder="Weitere Informationen für den Kunden"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowResponseForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={submitResponse}
                    disabled={
                      submitting ||
                      response.serviceItems.some(item => !item.title || item.unitPrice <= 0)
                    }
                    className="bg-[#14ad9f] hover:bg-[#129488] text-white px-6 py-2 rounded-lg flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <FiLoader className="animate-spin mr-2 h-4 w-4" />
                    ) : (
                      <FiSend className="mr-2 h-4 w-4" />
                    )}
                    Angebot senden
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
