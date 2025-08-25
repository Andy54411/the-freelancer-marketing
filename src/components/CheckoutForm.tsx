// /Users/andystaudinger/taskilo/src/components/CheckoutForm.tsx
'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { PaymentElement, useStripe, useElements, AddressElement } from '@stripe/react-stripe-js';
import { StripePaymentElementOptions, StripeAddressElementChangeEvent } from '@stripe/stripe-js';
import {
  Loader2 as FiLoader,
  CheckCircle as FiCheckCircle,
  XCircle as FiXCircle,
} from 'lucide-react';
import { PAGE_LOG, PAGE_ERROR } from '@/lib/constants';
import { Label } from '@/components/ui/label'; // Label-Komponente importiert

interface StripeCardCheckoutProps {
  taskAmount: number;
  taskCurrency?: string;
  taskerStripeAccountId: string;
  // platformFeeAmount: number; // Entfernt, da Backend dies jetzt berechnet
  customerName?: string;
  taskId?: string;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (errorMessage: string) => void;
  customerEmail?: string;
  firebaseUserId?: string;
  stripeCustomerId?: string;
  clientSecret: string;
}

export const StripeCardCheckout = ({
  taskAmount,
  taskId,
  onPaymentSuccess,
  onPaymentError,
  clientSecret,
}: StripeCardCheckoutProps) => {
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // const [addressReady, setAddressReady] = useState(false); // AddressElement wird nicht hier gerendert, daher ist dieser State nicht relevant für den Button-Status

  // Debug-Log für die Initialisierung und readiness der Stripe Elemente
  useEffect(() => {

    if (!stripe || !elements) {

    } else {

    }
    // Keine clientSecret-Abrufe hier, da es als Prop kommt.
  }, [stripe, elements]);

  // Handler für Änderungen am Address Element
  // const handleAddressChange = (event: StripeAddressElementChangeEvent) => {
  //
  //   if (event.complete) {
  //     setAddressReady(true);
  //
  //   } else {
  //     setAddressReady(false);
  //
  //   }
  // };
  // Address validation is handled by elements.submit() when using PaymentElement

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); // Standardformular-Submit verhindern

    // Debug-Log: Überprüfe die Bedingungen direkt vor dem Return

    if (!stripe || !elements) {
      setMessage('Stripe ist noch nicht bereit');
      onPaymentError('Stripe API Fehler');
      return;
    }
    if (!clientSecret) {
      setMessage('Lade Zahlungsdaten...');
      onPaymentError('Client Secret fehlt');
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // --- ENTSCHEIDENDER SCHRITT: elements.submit() ZUERST aufrufen ---
      // Dies validiert die Payment- und Address-Elements und sendet die Daten an Stripe.
      // Es muss aufgerufen werden, sobald der Kunde auf "Bezahlen" klickt, VOR jeglicher asynchroner Arbeit.

      const { error: submitError } = await elements.submit();

      if (submitError) {
        // Fehler bei der Validierung der Elements (z.B. ungültige Kartennummer, fehlende Adresse)

        setMessage(submitError.message || 'Validierungsfehler');
        onPaymentError(submitError.message || 'Formular-Validierung fehlgeschlagen');
        setIsLoading(false);
        return;
      }

      // Wenn elements.submit() erfolgreich war, DANN rufen wir stripe.confirmPayment auf.
      // Das clientSecret wird direkt von den Props verwendet.
      const { paymentIntent, error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret, // <- clientSecret direkt von Props verwenden
        confirmParams: {
          // Die return_url ist für Stripe-Redirects (z.B. 3D Secure)
          // Sie sollte auf eine Seite in Ihrer App zeigen, die den PaymentIntent-Status verarbeitet.
          return_url: `${window.location.origin}/payment-status?payment_intent_id=${clientSecret.split('_secret_')[0]}&jobId=${taskId || ''}`,
          // Die Daten werden von elements.submit() gesammelt, daher keine zusätzlichen Felddaten hier nötig.
        },
        redirect: 'if_required', // Wichtig: Für 3D Secure/Redirects
      });

      if (confirmError) {
        // Fehler bei der Bestätigung der Zahlung (z.B. Karte abgelehnt)

        if (confirmError.type === 'card_error' || confirmError.type === 'validation_error') {
          setMessage(confirmError.message || 'Karten-Fehler');
        } else {
          setMessage('Unerwarteter Fehler');
        }
        onPaymentError(confirmError.message || 'Bestätigung fehlgeschlagen');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Zahlung erfolgreich

        setMessage('Zahlung erfolgreich');
        onPaymentSuccess(paymentIntent.id); // Callback für Erfolg
      } else {
        // Zahlung noch ausstehend oder anderer Status (z.B. requires_action)

        setMessage(`Zahlungsstatus: ${paymentIntent?.status || 'unbekannt'}`);
        onPaymentError('Zahlung nicht erfolgreich oder unbekannter Status');
      }
    } catch (error: unknown) {

      let errorMessage = 'Allgemeiner Fehler bei der Zahlung';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        // Fallback, falls der Fehler ein String ist
        errorMessage = error;
      }
      setMessage(errorMessage);
      onPaymentError(errorMessage);
    } finally {
      setIsLoading(false); // Ladezustand immer auf false setzen
    }
  };

  // Optionen für das PaymentElement (Layout etc.)
  const paymentElementOptions: StripePaymentElementOptions = {
    layout: 'tabs', // oder "accordion"
  };

  // Der Submit-Button ist nur aktiviert, wenn Stripe, Elements und das clientSecret vorhanden sind,
  // und keine Ladeoperation läuft. elements.submit() übernimmt die Validierung der Felder.
  const isButtonDisabled = !stripe || !elements || !clientSecret || isLoading;

  // Debug-Log für den Button-Status
  useEffect(() => {

  }, [isButtonDisabled, stripe, elements, clientSecret, isLoading]);

  return (
    <form
      id="payment-form"
      onSubmit={handleSubmit}
      className="space-y-6 p-4 border rounded-lg shadow-sm bg-white"
    >
      <h3 className="text-lg font-semibold mb-4">Zahlung</h3>

      {/* PaymentElement sammelt die Zahlungsdaten */}
      <PaymentElement
        id="payment-element"
        options={paymentElementOptions}
      />

      <button
        type="submit"
        disabled={isButtonDisabled}
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
          id="payment-message"
          className={`mt-4 p-3 rounded-md text-sm flex items-center justify-center ${message.includes('erfolgreich') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
        >
          {message.includes('erfolgreich') ? (
            <FiCheckCircle className="mr-2" />
          ) : (
            <FiXCircle className="mr-2" />
          )}
          {message}
        </div>
      )}
    </form>
  );
};
