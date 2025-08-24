'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  FiCreditCard,
  FiX,
  FiLoader,
  FiCheckCircle,
  FiAlertCircle,
  FiFileText,
  FiUser,
  FiDollarSign,
} from 'react-icons/fi';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface QuotePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  quoteId: string;
  proposalId: string;
  quoteTitle: string;
  quoteDescription: string;
  proposalAmount: number;
  proposalCurrency: string;
  companyName: string;
  companyStripeAccountId: string;
  customerFirebaseId: string;
  customerStripeId?: string;
}

interface PaymentDetails {
  amount: number;
  platformFee: number;
  companyReceives: number;
}

interface CheckoutFormProps {
  clientSecret: string;
  quoteDetails: {
    quoteId: string;
    quoteTitle: string;
    proposalAmount: number;
    companyName: string;
  };
  paymentDetails: PaymentDetails;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onProcessing: (processing: boolean) => void;
}

function CheckoutForm({
  clientSecret,
  quoteDetails,
  paymentDetails,
  onSuccess,
  onError,
  onProcessing,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      console.error('[Quote Payment] Stripe nicht verfügbar');
      return;
    }

    setIsLoading(true);
    onProcessing(true);
    setMessage('');

    try {
      console.log('[Quote Payment] Validiere Zahlungsdaten...');

      // Submit payment data to Stripe
      const { error: submitError } = await elements.submit();

      if (submitError) {
        console.error('[Quote Payment] Element submission error:', submitError);
        setMessage(submitError.message || 'Fehler bei der Validierung der Zahlungsdaten');
        onError(submitError.message || 'Fehler bei der Validierung der Zahlungsdaten');
        return;
      }

      console.log('[Quote Payment] Elements validation successful, confirming quote payment...');

      // Confirm Quote payment
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/user/${quoteDetails.quoteId}/orders`,
          payment_method_data: {
            billing_details: {
              name: 'Quote Customer', // This will be overridden by billingDetails from API
            },
          },
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        console.error('[Quote Payment] Fehler bei der Bestätigung:', confirmError);
        setMessage(confirmError.message || 'Quote-Zahlung fehlgeschlagen');
        onError(confirmError.message || 'Quote-Zahlung fehlgeschlagen');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('[Quote Payment] PaymentIntent erfolgreich abgeschlossen:', paymentIntent);
        setMessage('Quote-Zahlung erfolgreich abgeschlossen!');
        onSuccess(paymentIntent.id);
      } else {
        console.warn('[Quote Payment] PaymentIntent Status unexpected:', paymentIntent?.status);
        setMessage(`Quote-Zahlung Status: ${paymentIntent?.status}`);
        onError(`Quote-Zahlung unvollständig. Status: ${paymentIntent?.status}`);
      }
    } catch (error: any) {
      console.error('[Quote Payment] Unexpected error:', error);
      setMessage('Unerwarteter Fehler bei der Quote-Zahlung');
      onError('Unerwarteter Fehler bei der Quote-Zahlung');
    } finally {
      setIsLoading(false);
      onProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Quote Overview */}
      <div className="bg-[#14ad9f]/10 border border-[#14ad9f]/20 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <FiFileText className="text-[#14ad9f] mr-2" size={20} />
          <h4 className="font-semibold text-[#14ad9f]">Angebots-Details</h4>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-700">Angebot:</span>
            <span className="font-medium text-gray-900">{quoteDetails.quoteTitle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Anbieter:</span>
            <span className="font-medium text-gray-900">{quoteDetails.companyName}</span>
          </div>
        </div>
      </div>

      {/* Payment Breakdown */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <FiDollarSign className="mr-2" size={16} />
          Zahlungsübersicht
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Angebotspreis:</span>
            <span className="font-medium">€{(paymentDetails.amount / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Plattformgebühr (3,5%):</span>
            <span className="text-red-600">-€{(paymentDetails.platformFee / 100).toFixed(2)}</span>
          </div>
          <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
            <span className="text-gray-900">Anbieter erhält:</span>
            <span className="text-green-600">
              €{(paymentDetails.companyReceives / 100).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">Zahlungsmethode</label>
        <PaymentElement
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card'],
            fields: {
              billingDetails: {
                name: 'auto',
                email: 'auto',
                phone: 'auto',
                address: {
                  country: 'auto',
                  line1: 'auto',
                  line2: 'auto',
                  city: 'auto',
                  state: 'auto',
                  postalCode: 'auto',
                },
              },
            },
            terms: {
              card: 'auto',
              sepaDebit: 'auto',
            },
            wallets: {
              applePay: 'auto',
              googlePay: 'auto',
            },
          }}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || !elements || isLoading}
        className="w-full flex items-center justify-center px-6 py-3 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
      >
        {isLoading ? (
          <>
            <FiLoader className="animate-spin mr-2" />
            Zahlung wird verarbeitet...
          </>
        ) : (
          <>
            <FiCreditCard className="mr-2" />
            Jetzt €{(paymentDetails.amount / 100).toFixed(2)} bezahlen
          </>
        )}
      </button>

      {/* Status Message */}
      {message && (
        <div className="p-3 rounded-lg border">
          <div className="flex items-center">
            <FiAlertCircle className="mr-2 flex-shrink-0" size={16} />
            <span className="text-sm">{message}</span>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="flex items-center text-xs text-gray-500">
        <FiCheckCircle className="mr-1" />
        Sichere Zahlung über Stripe
      </div>
    </form>
  );
}

export default function QuotePaymentModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
  quoteId,
  proposalId,
  quoteTitle,
  quoteDescription,
  proposalAmount,
  proposalCurrency = 'eur',
  companyName,
  companyStripeAccountId,
  customerFirebaseId,
  customerStripeId,
}: QuotePaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  const createQuotePaymentIntent = async () => {
    setIsCreatingPayment(true);
    setError('');

    try {
      console.log('🚀 Creating Quote Payment Intent:', {
        quoteId,
        proposalId,
        quoteTitle,
        proposalAmount,
        companyStripeAccountId,
      });

      const response = await fetch(
        `/api/user/${customerFirebaseId}/quotes/received/${quoteId}/payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            proposalId,
            quoteTitle,
            quoteDescription,
            amount: proposalAmount,
            currency: proposalCurrency,
            companyStripeAccountId,
            companyName,
            customerFirebaseId,
            customerStripeId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Erstellen der Quote-Zahlung');
      }

      const data = await response.json();

      if (data.success && data.clientSecret) {
        setClientSecret(data.clientSecret);
        setPaymentDetails(data.paymentDetails);
        console.log('✅ Quote Payment Intent created successfully');
      } else {
        throw new Error(data.error || 'Fehler beim Erstellen der Quote-Zahlung');
      }
    } catch (error: any) {
      console.error('❌ Error creating quote payment intent:', error);
      setError(error.message || 'Fehler beim Erstellen der Quote-Zahlung');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handleSuccess = (paymentIntentId: string) => {
    console.log('✅ Quote payment successful!');
    onSuccess(paymentIntentId);
  };

  useEffect(() => {
    if (isOpen && !clientSecret && !isCreatingPayment) {
      createQuotePaymentIntent();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <FiUser className="text-[#14ad9f] mr-3" size={24} />
            <div>
              <h3 className="text-xl font-bold text-gray-900">Angebot bezahlen</h3>
              <p className="text-sm text-gray-600">{companyName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isCreatingPayment ? (
            <div className="text-center py-8">
              <FiLoader className="animate-spin mx-auto mb-4 text-[#14ad9f]" size={32} />
              <p className="text-gray-600">Zahlung wird vorbereitet...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <FiAlertCircle className="mx-auto mb-4 text-red-500" size={32} />
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={createQuotePaymentIntent}
                className="px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] transition-colors"
              >
                Erneut versuchen
              </button>
            </div>
          ) : clientSecret && paymentDetails ? (
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
                  quoteId,
                  quoteTitle,
                  proposalAmount,
                  companyName,
                }}
                paymentDetails={paymentDetails}
                onSuccess={handleSuccess}
                onError={onError}
                onProcessing={setIsProcessing}
              />
            </Elements>
          ) : null}
        </div>
      </div>
    </div>
  );

  return modalContent;
}
