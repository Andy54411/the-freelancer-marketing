// /Users/andystaudinger/tasko/src/components/CheckoutForm.tsx
'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
  AddressElement,
} from '@stripe/react-stripe-js';
import {
  StripePaymentElementOptions,
  PaymentIntent,
  StripeAddressElementChangeEvent
} from '@stripe/stripe-js';
import { FiLoader, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { PAGE_LOG, PAGE_ERROR } from '@/lib/constants';
import { Label } from '@/components/ui/label'; // Label-Komponente importiert

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
  clientSecret: string;
}

export const StripeCardCheckout = ({
  taskAmount,
  taskCurrency = 'eur',
  taskerStripeAccountId,
  platformFeeAmount,
  customerName,
  taskId,
  onPaymentSuccess,
  onPaymentError,
  customerEmail,
  firebaseUserId,
  stripeCustomerId,
  clientSecret,
}: StripeCardCheckoutProps) => {
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [addressReady, setAddressReady] = useState(false); // State, um zu verfolgen, ob die Adresse vollständig ist

  // Debug-Log für die Initialisierung und readiness der Stripe Elemente
  useEffect(() => {
    console.log(PAGE_LOG, "StripeCardCheckout: useEffect zur Prüfung von Stripe/Elements Readiness.");
    if (!stripe || !elements) {
      console.log(PAGE_LOG, "Stripe oder Elements noch nicht bereit.");
    } else {
      console.log(PAGE_LOG, "Stripe und Elements sind verfügbar.");
    }
    // Keine clientSecret-Abrufe hier, da es als Prop kommt.
  }, [stripe, elements]);

  // Handler für Änderungen am Address Element
  const handleAddressChange = (event: StripeAddressElementChangeEvent) => {
    console.log(PAGE_LOG, "StripeCardCheckout: AddressElement onChange Event. Complete:", event.complete, "Value:", event.value);
    if (event.complete) {
      setAddressReady(true);
      console.log(PAGE_LOG, "StripeCardCheckout: AddressElement ist vollständig.");
    } else {
      setAddressReady(false);
      console.log(PAGE_LOG, "StripeCardCheckout: AddressElement ist UNVOLLSTÄNDIG.");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); // Standardformular-Submit verhindern

    // Debug-Log: Überprüfe die Bedingungen direkt vor dem Return
    console.log(PAGE_LOG, "StripeCardCheckout: handleSubmit aufgerufen.");
    console.log(PAGE_LOG, `Stripe: ${!!stripe}, Elements: ${!!elements}, clientSecret: ${!!clientSecret}, addressReady: ${addressReady}, isLoading: ${isLoading}`);

    if (!stripe || !elements) {
      setMessage('Stripe ist noch nicht bereit. Bitte versuchen Sie es später erneut.');
      onPaymentError('Stripe API nicht verfügbar.');
      return;
    }
    if (!clientSecret) {
      setMessage('Zahlungsdaten werden noch geladen. Bitte warten Sie einen Moment.');
      onPaymentError('Client Secret fehlt.');
      return;
    }
    if (!addressReady) {
      setMessage('Bitte vervollständigen Sie Ihre Rechnungsadresse.');
      onPaymentError('Rechnungsadresse unvollständig.');
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // --- ENTSCHEIDENDER SCHRITT: elements.submit() ZUERST aufrufen ---
      // Dies validiert die Payment- und Address-Elements und sendet die Daten an Stripe.
      // Es muss aufgerufen werden, sobald der Kunde auf "Bezahlen" klickt, VOR jeglicher asynchroner Arbeit.
      console.log(PAGE_LOG, "StripeCardCheckout: elements.submit() wird aufgerufen...");
      const { error: submitError } = await elements.submit();

      if (submitError) {
        // Fehler bei der Validierung der Elements (z.B. ungültige Kartennummer, fehlende Adresse)
        console.error(PAGE_ERROR, "StripeCardCheckout: Fehler bei elements.submit():", submitError);
        setMessage(submitError.message || 'Fehler bei der Validierung der Zahlungsdaten.');
        onPaymentError(submitError.message || 'Elements-Validierung fehlgeschlagen.');
        setIsLoading(false);
        return;
      }
      console.log(PAGE_LOG, "StripeCardCheckout: elements.submit() erfolgreich. Führe confirmPayment aus...");

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
        console.error(PAGE_ERROR, "StripeCardCheckout: Fehler bei stripe.confirmPayment():", confirmError);
        if (confirmError.type === "card_error" || confirmError.type === "validation_error") {
          setMessage(confirmError.message || 'Kartenfehler oder Validierungsfehler.');
        } else {
          setMessage('Ein unerwarteter Fehler ist aufgetreten.');
        }
        onPaymentError(confirmError.message || 'Zahlungsbestätigung fehlgeschlagen.');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Zahlung erfolgreich
        console.log(PAGE_LOG, "StripeCardCheckout: Zahlung erfolgreich! PaymentIntent:", paymentIntent.id);
        setMessage('Zahlung erfolgreich!');
        onPaymentSuccess(paymentIntent.id); // Callback für Erfolg
      } else {
        // Zahlung noch ausstehend oder anderer Status (z.B. requires_action)
        console.log(PAGE_LOG, "StripeCardCheckout: Zahlungsstatus nicht 'succeeded', PaymentIntent:", paymentIntent);
        setMessage('Zahlungsstatus: ' + (paymentIntent?.status || 'unbekannt') + '. Du wirst ggf. weitergeleitet.');
        onPaymentError('Zahlung nicht erfolgreich oder Status unbekannt.');
      }

    } catch (error: unknown) {
      console.error(PAGE_ERROR, "StripeCardCheckout: Allgemeiner Fehler in handleSubmit:", error);
      let errorMessage = 'Ein allgemeiner Fehler ist im Bezahlprozess aufgetreten.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') { // Fallback, falls der Fehler ein String ist
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
    layout: "tabs", // oder "accordion"
  };

  // Der Submit-Button ist nur aktiviert, wenn Stripe, Elements und das clientSecret vorhanden sind,
  // die Adresse vollständig ist und keine Ladeoperation läuft.
  const isButtonDisabled = !stripe || !elements || !clientSecret || !addressReady || isLoading;

  // Debug-Log für den Button-Status
  useEffect(() => {
    console.log(PAGE_LOG, `StripeCardCheckout Button-Status: Disabled=${isButtonDisabled}, Stripe=${!!stripe}, Elements=${!!elements}, clientSecret=${!!clientSecret}, addressReady=${addressReady}, isLoading=${isLoading}`);
  }, [isButtonDisabled, stripe, elements, clientSecret, addressReady, isLoading]);


  return (
    <form id="payment-form" onSubmit={handleSubmit} className="space-y-6 p-4 border rounded-lg shadow-sm bg-white">
      <h3 className="text-lg font-semibold mb-4">Zahlungsdetails</h3>
      {/* AddressElement sammelt die Rechnungsadresse */}
      <Label htmlFor="billing-address" className="text-sm font-medium text-gray-700 mt-4 block">Rechnungsadresse</Label>
      <AddressElement id="billing-address" options={{ mode: 'billing', allowedCountries: ['DE', 'AT', 'CH'] }} onChange={handleAddressChange} />

      {/* PaymentElement sammelt Karteninformationen */}
      <Label htmlFor="payment-element" className="text-sm font-medium text-gray-700 mt-4 block">Zahlungsinformationen</Label>
      <PaymentElement id="payment-element" options={paymentElementOptions} />

      <button
        type="submit"
        disabled={isButtonDisabled}
        className="mt-6 w-full bg-[#14ad9f] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#129a8f] transition-colors text-base flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <FiLoader className="animate-spin mr-2" /> Wird bearbeitet...
          </>
        ) : (
          `Jetzt ${(taskAmount / 100).toFixed(2)} EUR zahlen`
        )}
      </button>

      {message && (
        <div id="payment-message" className={`mt-4 p-3 rounded-md text-sm flex items-center justify-center ${message.includes('erfolgreich') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.includes('erfolgreich') ? <FiCheckCircle className="mr-2" /> : <FiXCircle className="mr-2" />}
          {message}
        </div>
      )}
    </form>
  );
};