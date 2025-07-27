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
  customerId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

interface CheckoutFormProps {
  clientSecret: string;
  totalAmount: number;
  totalHours: number;
  customerId?: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onProcessing: (isProcessing: boolean) => void;
}

function CheckoutForm({
  clientSecret,
  totalAmount,
  totalHours,
  customerId,
  onSuccess,
  onError,
  onProcessing,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState<{
    name: string;
    email: string;
    phone?: string;
    address?: {
      line1: string;
      city: string;
      postal_code: string;
      country: string;
    };
  } | null>(null);

  // Load customer data from Firebase
  useEffect(() => {
    const loadCustomerData = async () => {
      if (!customerId) return;

      try {
        const { getFirestore, doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@/firebase/clients');

        const customerDoc = await getDoc(doc(db, 'users', customerId));

        if (customerDoc.exists()) {
          const data = customerDoc.data();
          setCustomerData({
            name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Taskilo Kunde',
            email: data.email || '',
            phone: data.phoneNumber || undefined,
            address:
              data.street && data.city && data.postalCode
                ? {
                    line1: data.street,
                    city: data.city,
                    postal_code: data.postalCode,
                    country: data.country || 'DE',
                  }
                : undefined,
          });
        }
      } catch (error) {
        console.warn('Kunde konnte nicht geladen werden, verwende Fallback-Daten:', error);
        setCustomerData({
          name: 'Taskilo Kunde',
          email: '',
        });
      }
    };

    loadCustomerData();
  }, [customerId]);

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
        setMessage(submitError.message || 'Fehler bei der Validierung der Zahlungsdaten');
        onError(submitError.message || 'Fehler bei der Validierung der Zahlungsdaten');
        return;
      }

      // Schritt 2: Payment bestätigen mit echten Kundendaten
      const confirmParams: any = {
        return_url: `${window.location.origin}/dashboard`,
        payment_method_data: {
          billing_details: {
            name: customerData?.name || 'Taskilo Kunde',
            email: customerData?.email || undefined,
            phone: customerData?.phone || undefined,
            address: customerData?.address
              ? {
                  line1: customerData.address.line1,
                  city: customerData.address.city,
                  postal_code: customerData.address.postal_code,
                  state: '', // Erforderlich für Stripe, leer da nicht in DE verwendet
                  country: customerData.address.country,
                }
              : {
                  country: 'DE',
                  state: '', // Erforderlich für Stripe
                },
          },
        },
      };

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams,
        redirect: 'if_required', // Nur bei 3D Secure umleiten
      });

      if (confirmError) {
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
            paymentMethodOrder: ['card'],
            fields: {
              billingDetails: 'never', // Keine Billing-Details erfragen
            },
            defaultValues: {
              billingDetails: {
                name: '',
                email: '',
                phone: '',
                address: {
                  country: 'DE',
                },
              },
            },
          }}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || !elements || isLoading}
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
  customerId,
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
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Force body scroll lock
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';

      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
      };
    }
  }, [isOpen]);

  // Nicht rendern wenn nicht gemountet (SSR)
  if (!mounted) {
    return null;
  }

  if (!isOpen) {
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
                  Zusätzliche Stunden bezahlen
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

            {/* Payment Notice */}
            <div className="p-6 pb-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <FiAlertCircle className="text-blue-600 mr-2" size={16} />
                  <span className="text-blue-800 font-medium">
                    Zahlung für zusätzliche Arbeitszeit
                  </span>
                </div>
                <p className="text-blue-700 mt-2">
                  {totalHours.toFixed(1)} Stunden sind zur Bezahlung freigegeben.
                </p>
                <p className="text-blue-800 font-medium mt-1">
                  Gesamtbetrag: €{(totalAmount / 100).toFixed(2)}
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
                  customerId={customerId}
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
  return createPortal(modalContent, document.body);
}
