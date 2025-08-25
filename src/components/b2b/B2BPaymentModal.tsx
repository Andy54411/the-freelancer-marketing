// src/components/b2b/B2BPaymentModal.tsx
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
  FiBriefcase,
} from 'react-icons/fi';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface B2BPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;

  // Project Details
  projectId: string;
  projectTitle: string;
  projectDescription?: string;
  milestoneId?: string;

  // Payment Details
  amount: number; // in cents
  paymentType: 'milestone' | 'project_deposit' | 'final_payment';
  currency?: string;

  // Provider Details
  providerStripeAccountId: string;
  providerName: string;
  providerFirebaseId: string;

  // Customer Details
  customerFirebaseId: string;
  customerStripeId?: string;

  // B2B Specific
  invoiceNumber?: string;
  taxRate?: number;
  paymentTermsDays?: number;

  // Billing Details
  billingDetails?: {
    companyName: string;
    vatNumber?: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      postal_code: string;
      country: string;
    };
  };
}

interface CheckoutFormProps {
  clientSecret: string;
  projectDetails: {
    projectId: string;
    projectTitle: string;
    paymentType: string;
  };
  paymentDetails: {
    amount: number;
    platformFee: number;
    providerAmount: number;
    currency: string;
  };
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onProcessing: (processing: boolean) => void;
}

function CheckoutForm({
  clientSecret,
  projectDetails,
  paymentDetails,
  onSuccess,
  onError,
  onProcessing,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'milestone':
        return 'Meilenstein-Zahlung';
      case 'project_deposit':
        return 'Projekt-Anzahlung';
      case 'final_payment':
        return 'Abschlusszahlung';
      default:
        return 'Projekt-Zahlung';
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {

      return;
    }

    setIsLoading(true);
    onProcessing(true);
    setMessage('');

    try {
      // Submit payment data to Stripe
      const { error: submitError } = await elements.submit();

      if (submitError) {

        setMessage(submitError.message || 'Fehler bei der Validierung der Zahlungsdaten');
        onError(submitError.message || 'Fehler bei der Validierung der Zahlungsdaten');
        return;
      }

      // Confirm B2B payment
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/user/${projectDetails.projectId}/projects`,
          payment_method_data: {
            billing_details: {
              name: 'B2B Customer', // This will be overridden by billingDetails from API
            },
          },
        },
        redirect: 'if_required',
      });

      if (confirmError) {

        setMessage(confirmError.message || 'B2B-Zahlung fehlgeschlagen');
        onError(confirmError.message || 'B2B-Zahlung fehlgeschlagen');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {

        setMessage('B2B-Zahlung erfolgreich abgeschlossen!');
        onSuccess(paymentIntent.id);
      } else {

        setMessage(`B2B-Zahlung Status: ${paymentIntent?.status}`);
        onError(`B2B-Zahlung unvollständig. Status: ${paymentIntent?.status}`);
      }
    } catch (error: any) {

      setMessage('Unerwarteter Fehler bei der B2B-Zahlung');
      onError('Unerwarteter Fehler bei der B2B-Zahlung');
    } finally {
      setIsLoading(false);
      onProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* B2B Project Overview */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <FiBriefcase className="text-blue-600 mr-2" size={20} />
          <h4 className="font-semibold text-blue-900">Projekt-Details</h4>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-700">Projekt:</span>
            <span className="font-medium text-blue-900">{projectDetails.projectTitle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-700">Zahlungsart:</span>
            <span className="font-medium text-blue-900">
              {getPaymentTypeLabel(projectDetails.paymentType)}
            </span>
          </div>
        </div>
      </div>

      {/* B2B Payment Breakdown */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <FiFileText className="mr-2" size={16} />
          Zahlungsübersicht
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Bruttobetrag:</span>
            <span className="font-medium">€{(paymentDetails.amount / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Plattformgebühr (3,5%):</span>
            <span className="text-red-600">-€{(paymentDetails.platformFee / 100).toFixed(2)}</span>
          </div>
          <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
            <span className="text-gray-900">Provider erhält:</span>
            <span className="text-green-600">
              €{(paymentDetails.providerAmount / 100).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">B2B-Zahlungsmethode</label>
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
            B2B-Zahlung wird verarbeitet...
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

      {/* B2B Security Notice */}
      <div className="flex items-center text-xs text-gray-500">
        <FiCheckCircle className="mr-1" />
        Geschäftszahlung wird sicher über Stripe verarbeitet
      </div>
    </form>
  );
}

export default function B2BPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
  projectId,
  projectTitle,
  projectDescription,
  milestoneId,
  amount,
  paymentType,
  currency = 'eur',
  providerStripeAccountId,
  providerName,
  providerFirebaseId,
  customerFirebaseId,
  customerStripeId,
  invoiceNumber,
  taxRate,
  paymentTermsDays,
  billingDetails,
}: B2BPaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && !clientSecret) {
      createB2BPaymentIntent();
    }
  }, [isOpen]);

  const createB2BPaymentIntent = async () => {
    setIsCreatingPayment(true);
    setError('');

    try {

      const response = await fetch('/api/b2b/create-project-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          milestoneId,
          projectTitle,
          projectDescription,
          amount,
          currency,
          paymentType,
          providerStripeAccountId,
          customerStripeId,
          customerFirebaseId,
          providerFirebaseId,
          invoiceNumber,
          taxRate,
          paymentTermsDays,
          billingDetails,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'B2B Payment Intent konnte nicht erstellt werden');
      }

      setClientSecret(data.clientSecret);
      setPaymentDetails(data.paymentDetails);

    } catch (error: any) {

      setError(error.message || 'B2B Payment Setup fehlgeschlagen');
      onError(error.message || 'B2B Payment Setup fehlgeschlagen');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handleSuccess = (paymentIntentId: string) => {
    setClientSecret('');
    setPaymentDetails(null);
    onSuccess(paymentIntentId);
  };

  const handleClose = () => {
    if (!isProcessing) {
      setClientSecret('');
      setPaymentDetails(null);
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <FiBriefcase className="text-[#14ad9f] mr-3" size={24} />
            <div>
              <h3 className="text-xl font-bold text-gray-900">B2B Projekt-Zahlung</h3>
              <p className="text-sm text-gray-600">{providerName}</p>
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
              <p className="text-gray-600">B2B Payment wird vorbereitet...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <FiAlertCircle className="mx-auto mb-4 text-red-500" size={32} />
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={createB2BPaymentIntent}
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
                projectDetails={{
                  projectId,
                  projectTitle,
                  paymentType,
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
}
