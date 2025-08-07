'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  FiLoader,
  FiCreditCard,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiBriefcase,
} from 'react-icons/fi';
import { stripePromise } from '@/lib/stripe';

interface B2BPaymentComponentProps {
  projectData: {
    projectId: string;
    projectTitle: string;
    projectDescription?: string;
    amount: number; // in cents
    currency?: string;
    paymentType: 'milestone' | 'project_deposit' | 'final_payment';
    providerId: string;
    providerStripeAccountId: string;
  };
  customerData: {
    customerId: string;
    companyName?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: {
      line1: string;
      city: string;
      postal_code: string;
      country: string;
    };
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

interface B2BCheckoutFormProps {
  projectData: B2BPaymentComponentProps['projectData'];
  customerData: B2BPaymentComponentProps['customerData'];
  realCustomerData: {
    companyName: string;
    name: string;
    email: string;
    phone?: string;
    address?: {
      line1: string;
      city: string;
      postal_code: string;
      country: string;
    };
  } | null;
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onProcessing: (isProcessing: boolean) => void;
}

function B2BCheckoutForm({
  projectData,
  customerData,
  realCustomerData,
  clientSecret,
  onSuccess,
  onError,
  onProcessing,
}: B2BCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      console.error('[B2B PAYMENT] Stripe oder Elements nicht geladen');
      const errorMsg = 'B2B-Zahlungssystem ist noch nicht bereit. Bitte versuchen Sie es erneut.';
      setMessage(errorMsg);
      onError(errorMsg);
      return;
    }

    console.log('[B2B PAYMENT] Starting B2B payment process...');
    console.log('[B2B PAYMENT] Project:', projectData.projectTitle);
    console.log('[B2B PAYMENT] Amount:', projectData.amount, 'cents');

    setIsLoading(true);
    onProcessing(true);
    setMessage(null);

    try {
      // Schritt 1: Elements validieren
      console.log('[B2B PAYMENT] Validating payment elements...');
      const { error: submitError } = await elements.submit();

      if (submitError) {
        console.error('[B2B PAYMENT] Element submission error:', submitError);
        setMessage(submitError.message || 'Fehler bei der Validierung der B2B-Zahlungsdaten');
        onError(submitError.message || 'Fehler bei der Validierung der B2B-Zahlungsdaten');
        return;
      }

      console.log('[B2B PAYMENT] Elements validation successful, confirming B2B payment...');

      // Schritt 2: B2B Payment bestätigen mit echten Kundendaten
      // Da phone und address: 'auto' in PaymentElement gesetzt sind, lassen wir Stripe diese verwalten
      const confirmParams: any = {
        return_url: `${window.location.origin}/dashboard`,
        // Keine manual billing_details nötig, da PaymentElement sie automatisch verwaltet
      };

      console.log(
        '[B2B PAYMENT] Calling stripe.confirmPayment with client secret:',
        clientSecret?.substring(0, 20) + '...'
      );

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams,
        redirect: 'if_required', // Nur bei 3D Secure umleiten
      });

      console.log('[B2B PAYMENT] confirmPayment result:', {
        error: confirmError?.message,
        paymentIntentStatus: paymentIntent?.status,
        paymentIntentId: paymentIntent?.id,
      });

      if (confirmError) {
        console.error('[B2B PAYMENT] Confirm payment error:', confirmError);
        const errorMessage = confirmError.message || 'Fehler bei der B2B-Zahlungsbestätigung';
        setMessage(errorMessage);
        onError(errorMessage);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log(
          '[B2B PAYMENT] 🎉 B2B Payment succeeded! Webhook should be triggered automatically.'
        );
        setMessage(
          'B2B-Zahlung erfolgreich abgeschlossen! Das Projekt wird automatisch als bezahlt markiert.'
        );
        onSuccess(paymentIntent.id);
      } else {
        console.warn('[B2B PAYMENT] Unexpected payment status:', paymentIntent?.status);
        const errorMessage = `Unerwarteter B2B-Zahlungsstatus: ${paymentIntent?.status || 'unbekannt'}`;
        setMessage(errorMessage);
        onError(errorMessage);
      }
    } catch (error) {
      console.error('[B2B PAYMENT] Payment processing error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unbekannter Fehler bei der B2B-Zahlung';
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
        <span>B2B-Zahlungssystem wird geladen...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* B2B Zahlungsdetails Übersicht */}
      <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2 flex items-center">
          <FiBriefcase className="mr-2" />
          B2B Projektübersicht
        </h4>
        <div className="text-sm text-blue-800 space-y-1">
          <div>
            <strong>Projekt:</strong> {projectData.projectTitle}
          </div>
          {projectData.projectDescription && (
            <div>
              <strong>Beschreibung:</strong> {projectData.projectDescription}
            </div>
          )}
          <div>
            <strong>Zahlungstyp:</strong> {projectData.paymentType}
          </div>
          {realCustomerData?.companyName && (
            <div>
              <strong>Auftraggeber:</strong> {realCustomerData.companyName}
            </div>
          )}
          {realCustomerData?.email && (
            <div>
              <strong>E-Mail:</strong> {realCustomerData.email}
            </div>
          )}
        </div>
        <div className="flex justify-between font-medium text-blue-900 pt-2 border-t border-blue-200 mt-2">
          <span>Gesamtbetrag:</span>
          <span>€{(projectData.amount / 100).toFixed(2)}</span>
        </div>
      </div>

      {/* Stripe Payment Element mit B2B-Konfiguration */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">B2B-Zahlungsmethode</label>
        <PaymentElement
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card'],
            fields: {
              billingDetails: {
                name: 'auto',
                email: 'auto',
                phone: 'auto', // GEÄNDERT: auf 'auto' damit Stripe es selbst verwaltet
                address: {
                  country: 'auto',
                  line1: 'auto',
                  line2: 'never',
                  city: 'auto',
                  state: 'auto', // GEÄNDERT: auf 'auto' statt 'never' um Konflikt zu vermeiden
                  postalCode: 'auto',
                },
              },
            },
            terms: {
              card: 'never',
            },
            wallets: {
              applePay: 'never',
              googlePay: 'never',
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
            B2B-Zahlung wird verarbeitet...
          </>
        ) : (
          <>
            <FiBriefcase className="mr-2" />
            Jetzt €{(projectData.amount / 100).toFixed(2)} bezahlen
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

export default function B2BPaymentComponent({
  projectData,
  customerData,
  isOpen,
  onClose,
  onSuccess,
  onError,
}: B2BPaymentComponentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [realCustomerData, setRealCustomerData] = useState<{
    companyName: string;
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

  // Client-side mounting check für Portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Lade echte Kundendaten aus Firebase
  useEffect(() => {
    const loadRealCustomerData = async () => {
      if (!customerData.customerId || customerData.customerId === 'anonymous') {
        console.warn('[B2B PAYMENT] Keine gültige Customer ID vorhanden');
        return;
      }

      try {
        console.log(
          '[B2B PAYMENT] Lade echte Kundendaten aus Firebase für:',
          customerData.customerId
        );

        const { getFirestore, doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@/firebase/clients');

        const customerDoc = await getDoc(doc(db, 'users', customerData.customerId));

        if (customerDoc.exists()) {
          const userData = customerDoc.data();
          console.log('[B2B PAYMENT] Echte Kundendaten geladen:', {
            companyName: userData.companyName,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            phoneNumber: userData.phoneNumber,
            street: userData.street,
            city: userData.city,
            postalCode: userData.postalCode,
            country: userData.country,
          });

          const realData = {
            companyName:
              userData.companyName ||
              `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
              'B2B Kunde',
            name:
              `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
              userData.companyName ||
              'B2B Kunde',
            email: userData.email || '',
            phone: userData.phoneNumber || undefined,
            address:
              userData.street && userData.city && userData.postalCode
                ? {
                    line1: userData.street,
                    city: userData.city,
                    postal_code: userData.postalCode,
                    country: userData.country || 'DE',
                  }
                : undefined,
          };

          setRealCustomerData(realData);
          console.log('[B2B PAYMENT] ✅ Echte Kundendaten gesetzt:', realData);
        } else {
          console.warn('[B2B PAYMENT] Kunde nicht in Firebase gefunden:', customerData.customerId);
        }
      } catch (error) {
        console.error('[B2B PAYMENT] Fehler beim Laden der Kundendaten:', error);
      }
    };

    loadRealCustomerData();
  }, [customerData.customerId]);

  // Create B2B Payment Intent when modal opens
  useEffect(() => {
    if (!isOpen || clientSecret || isCreatingPayment || !realCustomerData) return;

    const createB2BPayment = async () => {
      setIsCreatingPayment(true);
      console.log('[B2B PAYMENT] Creating B2B Payment Intent with real customer data...');

      try {
        console.log('[B2B PAYMENT] Using real customer data:', realCustomerData);

        const response = await fetch('/api/b2b/create-project-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectId: projectData.projectId,
            projectTitle: projectData.projectTitle,
            projectDescription: projectData.projectDescription,
            amount: projectData.amount,
            currency: projectData.currency || 'eur',
            paymentType: projectData.paymentType,
            providerStripeAccountId: projectData.providerStripeAccountId,
            customerFirebaseId: customerData.customerId,
            providerFirebaseId: projectData.providerId,
            billingDetails: {
              companyName: realCustomerData.companyName,
              name: realCustomerData.name,
              email: realCustomerData.email,
              phone: realCustomerData.phone,
              address: realCustomerData.address,
            },
          }),
        });

        const data = await response.json();

        if (data.success && data.clientSecret) {
          console.log(
            '[B2B PAYMENT] B2B Payment Intent created successfully:',
            data.paymentIntentId
          );
          setClientSecret(data.clientSecret);
        } else {
          console.error('[B2B PAYMENT] B2B Payment Intent creation failed:', data);
          onError(data.error || 'Fehler beim Erstellen der B2B-Zahlung');
        }
      } catch (error) {
        console.error('[B2B PAYMENT] Network error creating B2B Payment Intent:', error);
        onError('Netzwerkfehler beim Erstellen der B2B-Zahlung');
      } finally {
        setIsCreatingPayment(false);
      }
    };

    createB2BPayment();
  }, [
    isOpen,
    clientSecret,
    isCreatingPayment,
    projectData,
    customerData,
    realCustomerData,
    onError,
  ]);

  // Viewport meta tag für Stripe Elements
  useEffect(() => {
    const existingViewport = document.querySelector('meta[name="viewport"]');
    if (
      !existingViewport ||
      !existingViewport.getAttribute('content')?.includes('width=device-width')
    ) {
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

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
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
  if (!mounted || !isOpen) {
    return null;
  }

  // Modal Content erstellen
  const modalContent = (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4"
      style={{
        zIndex: 2147483647,
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
      data-component="B2BPaymentComponent-Portal"
      data-testid="b2b-payment-modal-overlay"
      onClick={e => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        style={{
          zIndex: 2147483647,
          position: 'relative',
          backgroundColor: 'white',
        }}
        data-testid="b2b-payment-modal-container"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <FiBriefcase className="text-[#14ad9f] mr-2" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">B2B Projektabrechnung</h3>
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
          {isCreatingPayment || !clientSecret ? (
            // Loading State
            <div className="flex flex-col items-center justify-center py-8">
              <FiLoader className="animate-spin mb-4 text-[#14ad9f]" size={32} />
              <p className="text-gray-600">B2B-Zahlungsintent wird erstellt...</p>
              <p className="text-sm text-gray-500 mt-2">
                Stripe Connect wird konfiguriert für {projectData.projectTitle}
              </p>
            </div>
          ) : (
            // Payment Form
            <Elements
              key={clientSecret}
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
              <B2BCheckoutForm
                projectData={projectData}
                customerData={customerData}
                realCustomerData={realCustomerData}
                clientSecret={clientSecret}
                onSuccess={onSuccess}
                onError={onError}
                onProcessing={setIsProcessing}
              />
            </Elements>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="flex items-center text-xs text-gray-500">
            <FiCheckCircle className="mr-1" />
            Ihre B2B-Zahlung wird sicher über Stripe Connect verarbeitet
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
