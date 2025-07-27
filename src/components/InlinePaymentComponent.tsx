'use client';

import React, { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { FiLoader, FiCreditCard, FiX, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import Head from 'next/head';
import { stripePromise } from '@/lib/stripe';

interface InlinePaymentComponentProps {
  clientSecret: string;
  orderId: string;
  totalAmount: number; // in cents
  totalHours: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

interface CheckoutFormProps {
  clientSecret: string;
  totalAmount: number;
  totalHours: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onProcessing: (isProcessing: boolean) => void;
}

function CheckoutForm({
  clientSecret,
  totalAmount,
  totalHours,
  onSuccess,
  onError,
  onProcessing,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Debug logging for Stripe initialization
  useEffect(() => {
    console.log('[CheckoutForm] Stripe and Elements status:', {
      stripe: stripe ? 'LOADED' : 'LOADING',
      elements: elements ? 'LOADED' : 'LOADING',
      clientSecret: clientSecret ? 'PRESENT' : 'MISSING',
    });
  }, [stripe, elements, clientSecret]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      const errorMsg = 'Zahlungssystem ist noch nicht bereit. Bitte versuchen Sie es erneut.';
      setMessage(errorMsg);
      onError(errorMsg);
      return;
    }

    setIsLoading(true);
    onProcessing(true);
    setMessage(null);

    try {
      // Schritt 1: Elements validieren und Daten sammeln
      const { error: submitError } = await elements.submit();

      if (submitError) {
        console.error('Stripe elements submit error:', submitError);
        setMessage(submitError.message || 'Fehler bei der Validierung der Zahlungsdaten');
        onError(submitError.message || 'Fehler bei der Validierung der Zahlungsdaten');
        return;
      }

      // Schritt 2: Payment bestätigen
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard`, // Fallback für 3D Secure
        },
        redirect: 'if_required', // Nur bei 3D Secure umleiten
      });

      if (confirmError) {
        console.error('Stripe confirm payment error:', confirmError);
        const errorMessage = confirmError.message || 'Fehler bei der Zahlungsbestätigung';
        setMessage(errorMessage);
        onError(errorMessage);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setMessage('Zahlung erfolgreich abgeschlossen!');
        onSuccess(paymentIntent.id);
      } else {
        const errorMessage = `Unerwarteter Zahlungsstatus: ${paymentIntent?.status || 'unbekannt'}`;
        setMessage(errorMessage);
        onError(errorMessage);
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unbekannter Fehler bei der Zahlung';
      setMessage(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
      onProcessing(false);
    }
  };

  // Show loading state if Stripe is not ready
  if (!stripe || !elements) {
    return (
      <div className="flex items-center justify-center py-8">
        <FiLoader className="animate-spin mr-2" />
        <span>Zahlungssystem wird geladen...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Zahlungsdetails Übersicht */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h4 className="font-medium text-gray-900 mb-2">Zahlungsübersicht</h4>
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Zusätzliche Stunden:</span>
          <span>{totalHours.toFixed(1)}h</span>
        </div>
        <div className="flex justify-between font-medium text-gray-900 pt-2 border-t border-gray-200">
          <span>Gesamtbetrag:</span>
          <span>€{(totalAmount / 100).toFixed(2)}</span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Zahlungsmethode</label>
        <PaymentElement
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card', 'sepa_debit'],
          }}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || !elements || isLoading}
        className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {isLoading ? (
          <>
            <FiLoader className="animate-spin mr-2" />
            Zahlung wird verarbeitet...
          </>
        ) : (
          <>
            <FiCreditCard className="mr-2" />
            Jetzt €{(totalAmount / 100).toFixed(2)} bezahlen
          </>
        )}
      </button>

      {/* Status Message */}
      {message && (
        <div
          className={`flex items-center text-sm p-3 rounded-lg ${
            message.includes('erfolgreich')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.includes('erfolgreich') ? (
            <FiCheckCircle className="mr-2 flex-shrink-0" />
          ) : (
            <FiAlertCircle className="mr-2 flex-shrink-0" />
          )}
          {message}
        </div>
      )}
    </form>
  );
}

export default function InlinePaymentComponent({
  clientSecret,
  orderId,
  totalAmount,
  totalHours,
  isOpen,
  onClose,
  onSuccess,
  onError,
}: InlinePaymentComponentProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  // Debug logging for client secret
  useEffect(() => {
    console.log('[InlinePaymentComponent] Component mounted with:', {
      isOpen,
      clientSecret: clientSecret ? 'PRESENT' : 'MISSING',
      orderId,
      totalAmount,
      totalHours,
    });
  }, [isOpen, clientSecret, orderId, totalAmount, totalHours]);

  // Ensure viewport meta tag is present for Stripe Elements
  useEffect(() => {
    // Check if viewport meta tag exists and has correct content
    const existingViewport = document.querySelector('meta[name="viewport"]');
    if (
      !existingViewport ||
      !existingViewport.getAttribute('content')?.includes('width=device-width')
    ) {
      // Create or update viewport meta tag
      const viewport = existingViewport || document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      viewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes'
      );

      if (!existingViewport) {
        document.head.appendChild(viewport);
      }

      console.log('[InlinePaymentComponent] Viewport meta tag ensured for Stripe Elements');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Show error if clientSecret is missing
  if (!clientSecret) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-red-600">Payment Setup Fehler</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FiX size={20} />
            </button>
          </div>
          <div className="text-center">
            <FiAlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <p className="text-gray-700 mb-4">
              Das Payment-System konnte nicht initialisiert werden. Dies liegt wahrscheinlich daran,
              dass der Dienstleister seine Stripe Connect Einrichtung noch nicht abgeschlossen hat.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Bitte kontaktieren Sie den Support oder warten Sie, bis der Dienstleister seine
              Zahlungseinrichtung vollendet hat.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <FiCreditCard className="text-green-600 mr-2" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Zusätzliche Stunden bezahlen</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#16a34a',
                  colorBackground: '#ffffff',
                  colorText: '#1f2937',
                  colorDanger: '#dc2626',
                  fontFamily: 'system-ui, sans-serif',
                  spacingUnit: '4px',
                  borderRadius: '8px',
                },
              },
              loader: 'auto',
            }}
          >
            <CheckoutForm
              clientSecret={clientSecret}
              totalAmount={totalAmount}
              totalHours={totalHours}
              onSuccess={onSuccess}
              onError={onError}
              onProcessing={setIsProcessing}
            />
          </Elements>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="flex items-center text-xs text-gray-500">
            <FiCheckCircle className="mr-1" />
            Ihre Zahlung wird sicher über Stripe verarbeitet
          </div>
        </div>
      </div>
    </div>
  );
}
