// /Users/andystaudinger/tasko/src/components/CheckoutForm.tsx
'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
  AddressElement
} from '@stripe/react-stripe-js';
import { StripePaymentElementOptions, PaymentIntent } from '@stripe/stripe-js';
import { FiLoader, FiAlertCircle } from 'react-icons/fi';

interface StripeCardCheckoutProps {
  taskAmount: number;
  taskCurrency?: string;
  taskerStripeAccountId: string;
  platformFeeAmount: number;
  customerName?: string;
  taskId?: string;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (errorMessage: string) => void;
  customerEmail?: string;
  firebaseUserId?: string;
  stripeCustomerId?: string;
  clientSecret: string; // clientSecret wird von der übergeordneten Komponente übergeben
}

// // Typ für das Ergebnis von confirmPayment // Marked as unused
// type ConfirmPaymentClientResponseType = {
//     paymentIntent?: PaymentIntent;
//     error?: StripeError;
// };

export const StripeCardCheckout = ({
  taskAmount,
  taskCurrency = 'eur',
  taskerStripeAccountId,
  platformFeeAmount,
  customerName,
  taskId,
  onPaymentSuccess,
  onPaymentError,
  customerEmail, // hinzugefügt
  firebaseUserId,  // hinzugefügt
  stripeCustomerId, // hinzugefügt
  // clientSecret prop ist jetzt definiert, wird aber unten neu geholt. Das ist ein Design-Aspekt.
}: StripeCardCheckoutProps) => {
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!stripe || !elements) {
      console.log("Stripe oder Elements noch nicht bereit.");
    }
  }, [stripe, elements]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || isLoading) {
      return;
    }
    setIsLoading(true);
    setMessage(null);

    try {
      const serverResponse = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: taskAmount,
          currency: taskCurrency,
          connectedAccountId: taskerStripeAccountId,
          platformFee: platformFeeAmount,
          customerName: customerName,
          taskId: taskId,
          customerEmail: customerEmail, // Kann nun an die API gesendet werden, falls benötigt
          firebaseUserId: firebaseUserId, // Kann nun an die API gesendet werden, falls benötigt
          stripeCustomerId: stripeCustomerId, // Kann nun an die API gesendet werden, falls benötigt
        }),
      });

      const { clientSecret, paymentIntentId, error: backendError } = await serverResponse.json();

      if (backendError || !clientSecret) {
        throw new Error(backendError || 'Fehler: Client Secret nicht vom Server erhalten.');
      }

      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment-status?payment_intent_id=${paymentIntentId}&jobId=${taskId || ''}`,
        },
      });

      if (result.error) {
        setMessage(result.error.message || 'Ein Fehler ist bei der Zahlungsbestätigung aufgetreten.');
        onPaymentError(result.error.message || 'Ein Fehler ist bei der Zahlungsbestätigung aufgetreten.');
      } else {
        // WORKAROUND: Expliziter "double cast" über 'unknown', wie von TypeScript vorgeschlagen.
        // Dies ist notwendig, wenn TypeScript die Typverengung hier nicht korrekt durchführt.
        // Dies deutet auf Probleme mit den @types/stripe hin - BITTE AKTUALISIERE DIESE!
        const successResult = result as unknown as { paymentIntent?: PaymentIntent; error?: undefined }; // LINE 96

        if (successResult.paymentIntent) {
          if (successResult.paymentIntent.status === 'succeeded') {
            setMessage(`Zahlung erfolgreich! ID: ${successResult.paymentIntent.id}`);
            onPaymentSuccess(successResult.paymentIntent.id);
          } else {
            setMessage(`Zahlungsstatus: ${successResult.paymentIntent.status}. Du wirst ggf. weitergeleitet.`);
          }
        } else {
          setMessage("Unbekannter Zahlungsstatus oder Ergebnis von Stripe (kein Fehler, kein PaymentIntent).");
          onPaymentError("Unbekannter Zahlungsstatus oder Ergebnis von Stripe (kein Fehler, kein PaymentIntent).");
        }
      }

    } catch (error: unknown) {
      console.error("Fehler im Bezahlprozess:", error);
      let errorMessage = 'Ein allgemeiner Fehler ist im Bezahlprozess aufgetreten.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      setMessage(errorMessage);
      onPaymentError(errorMessage);
    }

    setIsLoading(false);
  };

  const paymentElementOptions: StripePaymentElementOptions = {
    layout: "tabs",
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit} className="space-y-6 p-4 border rounded-lg shadow-sm bg-white">
      <h3 className="text-lg font-semibold mb-4">Zahlungsdetails</h3>
      <AddressElement options={{ mode: 'billing', allowedCountries: ['DE', 'AT', 'CH'] }} />
      <PaymentElement id="payment-element" options={paymentElementOptions} />
      <button
        disabled={isLoading || !stripe || !elements}
        id="submit"
        className="w-full p-3 bg-[#14ad9f] text-white rounded-md hover:bg-[#129488] disabled:opacity-50 transition-colors flex items-center justify-center"
      >
        {isLoading && <FiLoader className="animate-spin mr-2" />}
        {isLoading ? 'Verarbeite...' : `Jetzt ${taskAmount / 100} ${taskCurrency?.toUpperCase()} zahlen`}
      </button>
      {message && (
        <div id="payment-message" className={`mt-4 text-center text-sm ${message.includes('erfolgreich') ? 'text-green-600' : 'text-red-600'} flex items-center justify-center`}>
          {!message.includes('erfolgreich') && <FiAlertCircle className="mr-1" />}
          {message}
        </div>
      )}
    </form>
  );
};