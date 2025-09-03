'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { FiLoader } from 'react-icons/fi';

interface CheckoutFormProps {
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  taskId: string;
  taskAmount: number;
  taskerStripeAccountId: string;
  clientSecret: string;
}

export function StripeCardCheckout({
  onPaymentSuccess,
  onPaymentError,
  taskId,
  taskAmount,
  taskerStripeAccountId,
  clientSecret,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  console.log('[DEBUG] CheckoutForm - Render:', {
    stripe: !!stripe,
    elements: !!elements,
    clientSecret: !!clientSecret,
    taskAmount,
    taskId,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      console.error('[DEBUG] Stripe oder Elements nicht bereit');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
        },
      });

      if (error) {
        setMessage(error.message || 'Ein Fehler ist aufgetreten');
        onPaymentError(error.message || 'Unbekannter Fehler');
      } else {
        onPaymentSuccess(taskId);
      }
    } catch (error: any) {
      setMessage(error.message || 'Allgemeiner Fehler');
      onPaymentError(error.message || 'Allgemeiner Fehler');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* MINIMALER PAYMENTELEMENT TEST */}
      <div
        style={{
          border: '10px solid lime',
          backgroundColor: 'white',
          padding: '30px',
          margin: '20px 0',
        }}
      >
        <h1 style={{ color: 'green', fontSize: '28px', fontWeight: 'bold', textAlign: 'center' }}>
          🟢 FINAL MINIMALER TEST
        </h1>
        <div
          style={{
            backgroundColor: '#f8f8f8',
            padding: '20px',
            minHeight: '100px',
            border: '2px dashed #333',
            marginTop: '20px',
          }}
        >
          <PaymentElement
            onReady={() => {
              alert('🎉 ENDLICH! PaymentElement funktioniert!');
              console.log('🎉 PaymentElement minimal test ERFOLGREICH!');
            }}
            onLoadError={error => {
              alert(`❌ PaymentElement Fehler: ${JSON.stringify(error)}`);
              console.error('❌ PaymentElement minimal test Fehler:', error);
            }}
          />
        </div>
        <p style={{ color: 'green', fontWeight: 'bold', marginTop: '10px', textAlign: 'center' }}>
          ☝️ Wenn Stripe-Zahlungsfelder hier erscheinen = PROBLEM GELÖST! 🎉
        </p>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-600 p-2 bg-blue-100 rounded border">
          PaymentElement sollte oberhalb dieser Zeile sichtbar sein ☝️
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || isLoading}
        className="mt-6 w-full bg-[#14ad9f] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#129a8f] transition-colors text-base flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <FiLoader className="animate-spin mr-2" /> Verarbeite...
          </>
        ) : (
          `Jetzt bezahlen ${(taskAmount / 100).toFixed(2)} €`
        )}
      </button>

      {message && (
        <div
          className={`mt-4 p-3 rounded-md text-sm flex items-center justify-center ${
            message.includes('erfolgreich')
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {message}
        </div>
      )}
    </form>
  );
}
