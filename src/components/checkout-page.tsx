// /Users/andystaudinger/taskilo/src/components/checkout-page.tsx
'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { PaymentElement, useStripe, useElements, AddressElement } from '@stripe/react-stripe-js';
import { StripePaymentElementOptions, StripeError, PaymentIntent } from '@stripe/stripe-js'; // PaymentIntent importieren
import { Loader2 as FiLoader, AlertCircle as FiAlertCircle } from 'lucide-react';

interface StripeCardCheckoutProps {
  taskAmount: number;
  taskCurrency?: string;
  taskerStripeAccountId: string; // Bleibt für return_url oder falls Stripe es benötigt
  customerName?: string;
  taskId?: string;
  clientSecret: string; // Wird direkt von der BestaetigungsPage übergeben
  paymentIntentId: string; // Wird für die return_url benötigt
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (errorMessage: string) => void;
}

// Definiere den Rückgabetyp von stripe.confirmPayment expliziter, falls die Inferenz Probleme macht
type ConfirmPaymentResult = {
  paymentIntent?: PaymentIntent;
  error?: StripeError;
};

export const StripeCardCheckout = ({
  taskAmount,
  taskCurrency = 'eur',
  taskerStripeAccountId,
  customerName,
  taskId,
  clientSecret, // Wird jetzt direkt verwendet
  paymentIntentId, // Wird jetzt direkt verwendet
  onPaymentSuccess,
  onPaymentError,
}: StripeCardCheckoutProps) => {
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!stripe || !elements) {
      console.log('Stripe oder Elements noch nicht bereit.');
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
      // Explizitere Behandlung des Ergebnisses von confirmPayment
      const result: ConfirmPaymentResult = await stripe.confirmPayment({
        elements,
        clientSecret: clientSecret, // Verwende den übergebenen clientSecret
        confirmParams: {
          // Verwende die übergebene paymentIntentId für die return_url
          return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment-status?payment_intent_id=${paymentIntentId}&jobId=${taskId || ''}&source=checkout-page`,
        },
      });

      // Strikte Prüfung: Zuerst auf Fehler prüfen.
      if (result.error) {
        // In diesem Block ist result.error definiert.
        // TypeScript sollte jetzt wissen, dass result.paymentIntent hier nicht relevant ist oder undefined sein kann.
        setMessage(
          result.error.message || 'Ein Fehler ist bei der Zahlungsbestätigung aufgetreten.'
        );
        onPaymentError(
          result.error.message || 'Ein Fehler ist bei der Zahlungsbestätigung aufgetreten.'
        );
      } else {
        // In diesem Block ist result.error undefined.
        // Wir müssen jetzt prüfen, ob result.paymentIntent vorhanden ist.
        if (result.paymentIntent) {
          // Hier ist result.paymentIntent definiert und kann sicher verwendet werden.
          // Dies sollten die Zeilen 91, 93, 94, 95 sein.
          if (result.paymentIntent.status === 'succeeded') {
            // Zeile 91 (ungefähr)
            setMessage(`Zahlung erfolgreich! ID: ${result.paymentIntent.id}`); // Zeile 93 (id)
            onPaymentSuccess(result.paymentIntent.id); // Zeile 94 (id)
          } else {
            setMessage(
              `Zahlungsstatus: ${result.paymentIntent.status}. Du wirst ggf. weitergeleitet.`
            ); // Zeile 95 (status)
          }
        } else {
          // Fall: kein Fehler UND kein paymentIntent (sehr unwahrscheinlich, aber zur Vollständigkeit)
          // Dies wäre Zeile 98.
          setMessage(
            'Unbekannter Zahlungsstatus oder Ergebnis von Stripe (kein Fehler, kein PaymentIntent).'
          );
          onPaymentError(
            'Unbekannter Zahlungsstatus oder Ergebnis von Stripe (kein Fehler, kein PaymentIntent).'
          );
        }
      }
    } catch (error: unknown) {
      console.error('Fehler im Bezahlprozess:', error);
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
    layout: 'tabs',
  };

  return (
    <form
      id="payment-form"
      onSubmit={handleSubmit}
      className="space-y-6 p-4 border rounded-lg shadow-sm bg-white"
    >
      <h3 className="text-lg font-semibold mb-4">Zahlungsdetails</h3>
      <AddressElement options={{ mode: 'billing', allowedCountries: ['DE', 'AT', 'CH'] }} />
      <PaymentElement id="payment-element" options={paymentElementOptions} />
      <button
        disabled={isLoading || !stripe || !elements}
        id="submit"
        className="w-full p-3 bg-[#14ad9f] text-white rounded-md hover:bg-[#129488] disabled:opacity-50 transition-colors flex items-center justify-center"
      >
        {isLoading && <FiLoader className="animate-spin mr-2" />}
        {isLoading
          ? 'Verarbeite...'
          : `Jetzt ${taskAmount / 100} ${taskCurrency?.toUpperCase()} zahlen`}
      </button>
      {message && (
        <div
          id="payment-message"
          className={`mt-4 text-center text-sm ${message.includes('erfolgreich') ? 'text-green-600' : 'text-red-600'} flex items-center justify-center`}
        >
          {!message.includes('erfolgreich') && <FiAlertCircle className="mr-1" />}
          {message}
        </div>
      )}
    </form>
  );
};
