'use client';

import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement, AddressElement } from '@stripe/react-stripe-js';
import { FiLoader } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';

interface CheckoutFormProps {
  clientSecret: string;
  quoteDetails: {
    quoteId: string;
    quoteTitle: string;
    proposalAmount: number;
    companyName: string;
    userUid: string;
  };
  paymentDetails: {
    amount: number;
    currency: string;
    description: string;
    quoteId: string;
    totalAmount: number;
  };
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onProcessing: (isProcessing: boolean) => void;
}

export default function CheckoutForm({
  clientSecret,
  quoteDetails,
  paymentDetails,
  onSuccess,
  onError,
  onProcessing,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { firebaseUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    onProcessing(true);

    try {
      // Submit the form to ensure all elements are complete
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/company/${quoteDetails.userUid}/quotes/received/${quoteDetails.quoteId}?payment=success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        if (error.type === 'card_error' || error.type === 'validation_error') {
          throw new Error(error.message);
        } else {
          throw new Error('Ein unerwarteter Fehler ist aufgetreten.');
        }
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Zahlung fehlgeschlagen');
      onError(error.message || 'Zahlung fehlgeschlagen');
    } finally {
      setIsLoading(false);
      onProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Details Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Zahlungsdetails</h3>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Angebotssumme:</span>
            <span className="font-medium">
              {(paymentDetails?.totalAmount || 0).toLocaleString('de-DE')} €
            </span>
          </div>
          <div className="border-t pt-1 mt-2">
            <div className="flex justify-between font-semibold">
              <span>Zu zahlen:</span>
              <span className="text-[#14ad9f]">
                {(paymentDetails?.amount || 0).toLocaleString('de-DE')} €
              </span>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {paymentDetails?.description || 'Zahlung wird verarbeitet...'}
        </p>
      </div>

      {/* Payment Element */}
      <div className="space-y-4">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">{errorMessage}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || !elements || isLoading}
        className="w-full bg-[#14ad9f] text-white py-3 px-4 rounded-lg font-medium hover:bg-taskilo-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
      >
        {isLoading ? (
          <>
            <FiLoader className="animate-spin mr-2" size={16} />
            Zahlung wird verarbeitet...
          </>
        ) : (
          `${paymentDetails.amount.toLocaleString('de-DE')} € zahlen`
        )}
      </button>

      {/* Info Text */}
      <p className="text-xs text-gray-500 text-center">
        Nach erfolgreicher Zahlung erhalten Sie sofort Zugang zu den Kontaktdaten des Anbieters.
      </p>
    </form>
  );
}
