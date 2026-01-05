'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import UserHeader from '@/components/UserHeader';
import {
  FiArrowLeft,
  FiLoader,
  FiAlertCircle,
  FiCheck,
  FiX,
  FiDollarSign,
  FiClock,
  FiCalendar,
  FiMapPin,
  FiUser,
  FiMail,
  FiPhone,
  FiCreditCard,
} from 'react-icons/fi';
import QuoteChat from '@/components/chat/QuoteChat';

interface Proposal {
  companyUid: string;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyLogo?: string;
  message: string;
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
  additionalNotes: string;
  status: 'pending' | 'accepted' | 'declined';
  submittedAt: string;
}

interface QuoteDetails {
  id: string;
  title: string;
  description: string;
  serviceCategory: string;
  serviceSubcategory: string;
  budget: any;
  budgetRange: string | { min: number; max: number; currency?: string };
  timeline: string;
  startDate?: string;
  endDate?: string;
  location: any;
  proposals: Proposal[];
  status: string;
  createdAt: string;
  customerUid: string;
  customerId?: string;
  customer?: { name: string };
}

export default function CustomerQuoteDetailsPage({
  params,
}: {
  params: Promise<{ uid: string; quoteId: string }>;
}) {
  const [quote, setQuote] = useState<QuoteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProposal, setPaymentProposal] = useState<Proposal | null>(null);

  const router = useRouter();
  const { firebaseUser } = useAuth();

  const [uid, setUid] = useState<string>('');
  const [quoteId, setQuoteId] = useState<string>('');

  useEffect(() => {
    params.then(resolvedParams => {
      setUid(resolvedParams.uid);
      setQuoteId(resolvedParams.quoteId);
    });
  }, [params]);

  useEffect(() => {
    if (uid && quoteId && firebaseUser) {
      fetchQuoteDetails();
    }
  }, [uid, quoteId, firebaseUser]);

  const fetchQuoteDetails = async () => {
    try {
      if (!firebaseUser) {
        return;
      }

      const token = await firebaseUser.getIdToken();

      const response = await fetch(`/api/user/${uid}/quotes/received/${quoteId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        setQuote(data.quote);
      } else {
        const errorData = await response.json();
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleProposalAction = async (proposalId: string, action: 'accept' | 'decline') => {
    try {
      setProcessing(true);

      if (!firebaseUser) return;

      if (action === 'accept') {
        // Find the proposal to accept
        const proposal = quote?.proposals?.find(p => p.companyUid === proposalId);
        if (!proposal) {
          alert('Angebot nicht gefunden');
          return;
        }

        // Open payment modal instead of directly accepting
        setPaymentProposal(proposal);
        setShowPaymentModal(true);
        setProcessing(false);
        return;
      }

      // Handle decline action as before
      const token = await firebaseUser.getIdToken();
      const response = await fetch(`/api/user/${uid}/quotes/received/${quoteId}/respond`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proposalId,
          action,
        }),
      });

      if (response.ok) {
        // Refresh quote details
        await fetchQuoteDetails();

        if (action === 'decline') {
          alert('Angebot abgelehnt.');
        }
      } else {
        const errorData = await response.json();
        alert(`Fehler: ${errorData.error}`);
      }
    } catch (error) {
      alert('Ein Fehler ist aufgetreten.');
    } finally {
      setProcessing(false);
    }
  };

  // Payment Handler Functions
  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      if (!firebaseUser || !paymentProposal) return;

      // Call API to complete the quote → order migration
      const token = await firebaseUser.getIdToken();
      const response = await fetch(`/api/user/${uid}/quotes/received/${quoteId}/payment`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
          proposalId: paymentProposal.companyUid,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        setShowPaymentModal(false);
        setPaymentProposal(null);

        // Refresh quote details to show new status
        await fetchQuoteDetails();

        alert(`Zahlung erfolgreich! Auftrag wurde erstellt: ${data.orderId}`);

        // Redirect to orders page
        router.push(`/dashboard/user/${uid}/orders`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler bei der Auftragsverarbeitung');
      }
    } catch (error) {
      handlePaymentError(error instanceof Error ? error.message : 'Unbekannter Fehler');
    }
  };

  const handleEscrowPayment = async (paymentMethod: 'card' | 'bank_transfer') => {
    if (!firebaseUser || !paymentProposal || !quote) return;
    
    setProcessing(true);
    
    try {
      const token = await firebaseUser.getIdToken();
      
      // Create Escrow via API
      const response = await fetch('/api/payment/escrow', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          orderId: quoteId,
          buyerId: uid,
          providerId: paymentProposal.companyUid,
          amount: paymentProposal.totalAmount,
          currency: paymentProposal.currency,
          description: quote.title,
          paymentMethod: paymentMethod === 'card' ? 'card' : 'bank_transfer',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Erstellen der Zahlung');
      }

      if (paymentMethod === 'card' && data.checkoutUrl) {
        // Redirect to Revolut Checkout - im neuen Tab öffnen
        window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
        alert('Checkout wurde in einem neuen Tab geöffnet.');
      } else if (paymentMethod === 'bank_transfer') {
        // Show bank transfer instructions
        alert(`Bitte überweisen Sie ${paymentProposal.totalAmount.toFixed(2)} ${paymentProposal.currency} an unser Treuhandkonto. Verwendungszweck: ${data.escrow?.id || quoteId}`);
        setShowPaymentModal(false);
        setPaymentProposal(null);
        await fetchQuoteDetails();
      }
    } catch (error) {
      handlePaymentError(error instanceof Error ? error.message : 'Zahlungsfehler');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentError = (error: string) => {
    alert(`Zahlungsfehler: ${error}`);
    setShowPaymentModal(false);
    setPaymentProposal(null);
  };

  const handlePaymentModalClose = () => {
    setShowPaymentModal(false);
    setPaymentProposal(null);
  };

  const formatDate = (dateString: string | any) => {
    if (!dateString) return 'Nicht verfügbar';

    let date: Date;

    // Handle Firestore Timestamp
    if (dateString && typeof dateString === 'object' && dateString.toDate) {
      date = dateString.toDate();
    }
    // Handle string dates
    else if (typeof dateString === 'string') {
      date = new Date(dateString);
    }
    // Handle Date objects
    else if (dateString instanceof Date) {
      date = dateString;
    }
    // Fallback
    else {
      return 'Ungültiges Datum';
    }

    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum';
    }

    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FiLoader className="animate-spin h-8 w-8 text-[#14ad9f]" />
        <span className="ml-2 text-gray-600">Lade Angebote...</span>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FiAlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Projekt nicht gefunden</h2>
          <p className="text-gray-600 mb-4">
            Das angeforderte Projekt konnte nicht gefunden werden.
          </p>
          <button
            onClick={() => router.push(`/dashboard/user/${uid}`)}
            className="bg-[#14ad9f] hover:bg-taskilo-hover text-white px-4 py-2 rounded-lg"
          >
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative -m-4 lg:-m-6">
      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
      <div className="relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push(`/dashboard/user/${uid}`)}
              className="flex items-center text-white hover:text-gray-200 mb-4"
            >
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Zurück zum Dashboard
            </button>

            <div>
              <h1 className="text-2xl font-bold text-white">{quote.title}</h1>
              <p className="text-gray-200 mt-1">
                {quote.serviceCategory} • {quote.serviceSubcategory}
              </p>
              <p className="text-sm text-gray-300 mt-1">
                Erstellt am {quote.createdAt ? formatDate(quote.createdAt) : 'Unbekannt'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Projektdetails */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Projektdetails</h2>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center text-gray-600 mb-1">
                      <FiDollarSign className="mr-2 h-4 w-4" />
                      Budget
                    </div>
                    <p className="text-gray-900 font-medium">
                      {typeof quote.budgetRange === 'object' && quote.budgetRange
                        ? `${quote.budgetRange.min} - ${quote.budgetRange.max} ${quote.budgetRange.currency || 'EUR'}`
                        : quote.budgetRange || 'Nicht angegeben'}
                    </p>
                  </div>

                  {quote.timeline && (
                    <div>
                      <div className="flex items-center text-gray-600 mb-1">
                        <FiClock className="mr-2 h-4 w-4" />
                        Zeitrahmen
                      </div>
                      <p className="text-gray-900 font-medium">{quote.timeline}</p>
                    </div>
                  )}

                  {(quote.startDate || quote.endDate) && (
                    <div>
                      <div className="flex items-center text-gray-600 mb-1">
                        <FiCalendar className="mr-2 h-4 w-4" />
                        Zeitplan
                      </div>
                      <p className="text-gray-900 font-medium">
                        {quote.startDate && formatDate(quote.startDate)}
                        {quote.startDate && quote.endDate && ' - '}
                        {quote.endDate && formatDate(quote.endDate)}
                      </p>
                    </div>
                  )}

                  {quote.location && (
                    <div>
                      <div className="flex items-center text-gray-600 mb-1">
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
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-2">Beschreibung</h3>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{quote.description}</p>
                </div>
              </div>
            </div>

            {/* Eingegangene Angebote */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Eingegangene Angebote ({quote.proposals?.length || 0})
                </h2>

                {!quote.proposals || quote.proposals.length === 0 ? (
                  <div className="text-center py-8">
                    <FiAlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Noch keine Angebote</h3>
                    <p className="text-gray-600">
                      Sie haben noch keine Angebote für dieses Projekt erhalten.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {quote.proposals.map((proposal, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg p-6 ${
                          proposal.status === 'accepted'
                            ? 'border-green-200 bg-green-50'
                            : proposal.status === 'declined'
                              ? 'border-red-200 bg-red-50'
                              : 'border-gray-200'
                        }`}
                      >
                        {/* Company Info */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center">
                            {proposal.companyLogo && (
                              <img
                                src={proposal.companyLogo}
                                alt={proposal.companyName}
                                className="w-12 h-12 rounded-full mr-3"
                              />
                            )}
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {proposal.companyName || 'Unbekanntes Unternehmen'}
                              </h3>
                              {/* Kontaktdaten nur nach Annahme anzeigen */}
                              {proposal.status === 'accepted' && proposal.companyEmail && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <FiMail className="mr-1 h-3 w-3" />
                                  {proposal.companyEmail}
                                </div>
                              )}
                              {proposal.status === 'accepted' && proposal.companyPhone && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <FiPhone className="mr-1 h-3 w-3" />
                                  {proposal.companyPhone}
                                </div>
                              )}
                              {proposal.status !== 'accepted' && (
                                <div className="text-sm text-gray-500">
                                  Kontaktdaten verfügbar nach Annahme
                                </div>
                              )}

                              {/* Chat - nur wenn angenommen und bezahlt */}
                              {proposal.status === 'accepted' &&
                                (quote.status === 'contacts_exchanged' ||
                                  quote.status === 'paid') && (
                                  <div className="mt-3">
                                    <QuoteChat
                                      quoteId={quote.id}
                                      customerId={quote.customerId || quote.customerUid}
                                      providerId={proposal.companyUid}
                                      customerName={quote.customer?.name || 'Kunde'}
                                      providerName={proposal.companyName || 'Anbieter'}
                                      currentUserType="customer"
                                    />
                                  </div>
                                )}
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div>
                            {proposal.status === 'accepted' && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                <FiCheck className="mr-1 h-3 w-3" />
                                Angenommen
                              </span>
                            )}
                            {proposal.status === 'declined' && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                <FiX className="mr-1 h-3 w-3" />
                                Abgelehnt
                              </span>
                            )}
                            {proposal.status === 'pending' && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                                <FiClock className="mr-1 h-3 w-3" />
                                Wartend
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Proposal Details */}
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Nachricht</h4>
                          <p className="text-gray-700 whitespace-pre-wrap">{proposal.message}</p>
                        </div>

                        {/* Service Items */}
                        {proposal.serviceItems && proposal.serviceItems.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-medium text-gray-900 mb-2">Leistungen</h4>
                            <div className="space-y-2">
                              {proposal.serviceItems.map((item, itemIndex) => (
                                <div
                                  key={itemIndex}
                                  className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                                >
                                  <div>
                                    <div className="font-medium text-gray-900">{item.title}</div>
                                    <div className="text-sm text-gray-600">{item.description}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-medium text-gray-900">
                                      {formatCurrency(item.total, proposal.currency)}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {item.quantity}x{' '}
                                      {formatCurrency(item.unitPrice, proposal.currency)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Total Amount */}
                        <div className="flex justify-between items-center py-3 border-t border-gray-200 mb-4">
                          <div className="font-semibold text-gray-900">Gesamtpreis</div>
                          <div className="font-bold text-xl text-[#14ad9f]">
                            {formatCurrency(proposal.totalAmount, proposal.currency)}
                          </div>
                        </div>

                        {/* Timeline & Terms */}
                        {(proposal.timeline || proposal.terms) && (
                          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {proposal.timeline && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-1">Zeitplan</h4>
                                <p className="text-gray-700">{proposal.timeline}</p>
                              </div>
                            )}
                            {proposal.terms && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-1">Bedingungen</h4>
                                <p className="text-gray-700">{proposal.terms}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Additional Notes */}
                        {proposal.additionalNotes && (
                          <div className="mb-4">
                            <h4 className="font-medium text-gray-900 mb-1">Zusätzliche Hinweise</h4>
                            <p className="text-gray-700">{proposal.additionalNotes}</p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        {proposal.status === 'pending' && (
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleProposalAction(proposal.companyUid, 'accept')}
                              disabled={processing}
                              className="flex-1 bg-[#14ad9f] hover:bg-taskilo-hover text-white px-4 py-2 rounded-lg flex items-center justify-center disabled:opacity-50"
                            >
                              <FiCreditCard className="mr-2 h-4 w-4" />
                              Angebot bezahlen
                            </button>
                            <button
                              onClick={() => handleProposalAction(proposal.companyUid, 'decline')}
                              disabled={processing}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center disabled:opacity-50"
                            >
                              <FiX className="mr-2 h-4 w-4" />
                              Ablehnen
                            </button>
                          </div>
                        )}

                        {/* Submitted Date */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-sm text-gray-500">
                            Eingegangen am{' '}
                            {proposal.submittedAt ? formatDate(proposal.submittedAt) : 'Unbekannt'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Escrow Payment Info Modal */}
        {showPaymentModal && paymentProposal && quote && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Zahlung bestätigen</h2>
                <button onClick={handlePaymentModalClose} className="text-gray-500 hover:text-gray-700">
                  <FiX className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-teal-50 p-4 rounded-lg">
                  <p className="text-sm text-teal-800">
                    <strong>Escrow-Zahlung:</strong> Ihr Geld wird sicher verwahrt bis der Auftrag abgeschlossen ist.
                  </p>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Angebot von:</span>
                    <span className="font-medium">{paymentProposal.companyName}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Betrag:</span>
                    <span className="font-bold text-lg">{paymentProposal.totalAmount.toFixed(2)} {paymentProposal.currency}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handleEscrowPayment('card')}
                    disabled={processing}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg flex items-center justify-center disabled:opacity-50"
                  >
                    {processing ? <FiLoader className="animate-spin mr-2" /> : <FiCreditCard className="mr-2" />}
                    Mit Kreditkarte zahlen
                  </button>
                  <button
                    onClick={() => handleEscrowPayment('bank_transfer')}
                    disabled={processing}
                    className="w-full border border-teal-600 text-teal-600 hover:bg-teal-50 py-3 rounded-lg flex items-center justify-center disabled:opacity-50"
                  >
                    Per SEPA-Überweisung zahlen
                  </button>
                </div>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Sichere Zahlung über Revolut. Ihre Daten sind geschützt.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
