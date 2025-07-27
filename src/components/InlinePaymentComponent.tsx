'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

    console.log('🔄 [InlinePaymentComponent] handleSubmit gestartet');
    console.log('🔍 [InlinePaymentComponent] Stripe/Elements Status:', {
      stripe: stripe ? 'READY' : 'NOT_READY',
      elements: elements ? 'READY' : 'NOT_READY',
      clientSecret: clientSecret ? 'PRESENT' : 'MISSING',
      isLoading,
    });

    if (!stripe || !elements) {
      const errorMsg = 'Zahlungssystem ist noch nicht bereit. Bitte versuchen Sie es erneut.';
      console.error('❌ [InlinePaymentComponent] Stripe oder Elements nicht bereit');
      setMessage(errorMsg);
      onError(errorMsg);
      return;
    }

    setIsLoading(true);
    onProcessing(true);
    setMessage(null);

    console.log('✅ [InlinePaymentComponent] Zahlungsprozess gestartet...');

    try {
      // Schritt 1: Elements validieren und Daten sammeln
      console.log('🔍 [InlinePaymentComponent] Schritt 1: elements.submit()...');
      const { error: submitError } = await elements.submit();

      if (submitError) {
        console.error('❌ [InlinePaymentComponent] Stripe elements submit error:', submitError);
        setMessage(submitError.message || 'Fehler bei der Validierung der Zahlungsdaten');
        onError(submitError.message || 'Fehler bei der Validierung der Zahlungsdaten');
        return;
      }

      console.log('✅ [InlinePaymentComponent] elements.submit() erfolgreich');

      // Schritt 2: Payment bestätigen
      console.log('🔍 [InlinePaymentComponent] Schritt 2: stripe.confirmPayment()...');
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard`, // Fallback für 3D Secure
        },
        redirect: 'if_required', // Nur bei 3D Secure umleiten
      });

      console.log('🔍 [InlinePaymentComponent] confirmPayment Result:', {
        confirmError: confirmError ? confirmError.message : 'NO_ERROR',
        paymentIntentStatus: paymentIntent?.status || 'NO_PAYMENT_INTENT',
      });

      if (confirmError) {
        console.error('❌ [InlinePaymentComponent] Stripe confirm payment error:', confirmError);
        const errorMessage = confirmError.message || 'Fehler bei der Zahlungsbestätigung';
        setMessage(errorMessage);
        onError(errorMessage);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('🎉 [InlinePaymentComponent] Payment erfolgreich!', paymentIntent.id);
        setMessage('Zahlung erfolgreich abgeschlossen!');
        onSuccess(paymentIntent.id);
      } else {
        const errorMessage = `Unerwarteter Zahlungsstatus: ${paymentIntent?.status || 'unbekannt'}`;
        console.error('❌ [InlinePaymentComponent] Unerwarteter Status:', errorMessage);
        setMessage(errorMessage);
        onError(errorMessage);
      }
    } catch (error) {
      console.error('💥 [InlinePaymentComponent] Payment processing error:', error);
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
        onClick={e => {
          console.log('🔘 [InlinePaymentComponent] Button geklickt!', {
            disabled: !stripe || !elements || isLoading,
            stripe: stripe ? 'READY' : 'NOT_READY',
            elements: elements ? 'READY' : 'NOT_READY',
            isLoading,
            clientSecret: clientSecret ? 'PRESENT' : 'MISSING',
          });
        }}
        className="w-full flex items-center justify-center px-4 py-3 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
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
  const [mounted, setMounted] = useState(false);

  // Client-side mounting check für Portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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

  // Elements Loading Debug
  useEffect(() => {
    if (isOpen && clientSecret) {
      console.log('🔧 [InlinePaymentComponent] Elements wird geladen...', {
        clientSecret: clientSecret ? 'PRESENT' : 'MISSING',
      });
    }
  }, [isOpen, clientSecret]);

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

  useEffect(() => {
    if (isOpen) {
      // Force body scroll lock
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';

      console.log('🔒 [InlinePaymentComponent] Body scroll locked for modal');

      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        console.log('🔓 [InlinePaymentComponent] Body scroll unlocked');
      };
    }
  }, [isOpen]);

  console.log('🔍 [InlinePaymentComponent] Render check:', {
    isOpen,
    clientSecret: !!clientSecret,
    totalAmount,
    totalHours,
    orderId,
    mounted,
    timestamp: new Date().toISOString(),
  });

  // Nicht rendern wenn nicht gemountet (SSR)
  if (!mounted) {
    console.log('❌ [InlinePaymentComponent] Not rendering: not mounted (SSR)');
    return null;
  }

  if (!isOpen) {
    console.log('❌ [InlinePaymentComponent] Not rendering: isOpen =', isOpen);
    return null;
  }

  // Modal Content erstellen
  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      style={{
        zIndex: 2147483647, // Max z-index value
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
      data-component="InlinePaymentComponent-Portal"
      data-testid="payment-modal-overlay"
      onClick={e => {
        // Close modal when clicking backdrop
        if (e.target === e.currentTarget) {
          console.log('🔘 [InlinePaymentComponent] Backdrop geklickt - Modal schließen');
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        style={{
          zIndex: 2147483647,
          position: 'relative',
          backgroundColor: 'white',
        }}
        data-testid="payment-modal-container"
        onClick={e => e.stopPropagation()} // Prevent backdrop click when clicking modal content
      >
        {!clientSecret ? (
          // Error Modal Content
          <>
            <div className="flex items-center justify-between mb-4 p-6">
              <h3 className="text-lg font-semibold text-red-600">Payment Setup Fehler</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>
            <div className="text-center p-6">
              <FiAlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <p className="text-gray-700 mb-4">
                Das Payment-System konnte nicht initialisiert werden. Dies liegt wahrscheinlich
                daran, dass der Dienstleister seine Stripe Connect Einrichtung noch nicht
                abgeschlossen hat.
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
          </>
        ) : (
          // Main Payment Modal Content
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <FiCreditCard className="text-[#14ad9f] mr-2" size={20} />
                <h3 className="text-lg font-semibold text-gray-900">
                  💳 Zusätzliche Stunden bezahlen
                </h3>
              </div>
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Critical Payment Notice */}
            <div className="p-6 pb-3">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <FiAlertCircle className="text-red-600 mr-2" size={16} />
                  <span className="text-red-800 font-bold">
                    🚨 SOFORTIGE BEZAHLUNG ERFORDERLICH!
                  </span>
                </div>
                <p className="text-red-700 mt-2">
                  {totalHours}h sind bereits genehmigt, aber die Bezahlung steht noch aus!
                </p>
                <p className="text-red-800 font-bold mt-1">
                  💰 JETZT BEZAHLEN: {totalHours.toFixed(1)}h - €{(totalAmount / 100).toFixed(2)}
                </p>
                <p className="text-red-600 text-sm mt-2">
                  💻 DOM PORTAL LÖSUNG: Modal direkt in document.body!
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 pb-6">
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#14ad9f',
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
          </>
        )}
      </div>
    </div>
  );

  // Portal: Modal direkt in document.body rendern für maximale DOM-Sichtbarkeit
  console.log('🚀 [InlinePaymentComponent] Rendering via Portal in document.body');
  return createPortal(modalContent, document.body);
}
