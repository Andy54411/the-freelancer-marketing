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
    console.log('[DEBUG] CheckoutForm - useEffect gestartet');
    if (!stripe || !elements) {
      console.log('[DEBUG] CheckoutForm - Stripe oder Elements nicht bereit:', {
        stripe: !!stripe,
        elements: !!elements,
      });
    } else {
      console.log('[DEBUG] CheckoutForm - Stripe und Elements sind bereit!');
    }
    console.log('[DEBUG] CheckoutForm - clientSecret erhalten:', {
      clientSecret: !!clientSecret,
      length: clientSecret?.length,
    });

    // Zusätzliche Stripe-Diagnose
    if (stripe && clientSecret) {
      console.log('[DEBUG] CheckoutForm - Versuche PaymentElement zu laden...');
      // Stripe PaymentElement sollte automatisch laden

      // Check if PaymentElement exists in DOM after short delay
      setTimeout(() => {
        const paymentElement = document.getElementById('payment-element');
        const stripeElements = document.querySelectorAll('[data-testid*="payment"]');
        console.log('[DEBUG] PaymentElement DOM Check:', {
          paymentElement: !!paymentElement,
          stripeElementsCount: stripeElements.length,
          paymentElementHTML: paymentElement?.innerHTML || 'nicht gefunden',
        });
      }, 1000);
    }

    // Keine clientSecret-Abrufe hier, da es als Prop kommt.
  }, [stripe, elements, clientSecret]);

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
    business: {
      // Business-spezifische Optionen für bessere Kompatibilität
      name: 'Taskilo',
    },
    defaultValues: {
      billingDetails: {
        name: '',
        email: '',
      },
    },
    // Force load auch bei HTTP für Development
    ...(process.env.NODE_ENV === 'development' && {
      wallets: {
        applePay: 'never',
        googlePay: 'never',
      },
    }),
  };

  // Der Submit-Button ist nur aktiviert, wenn Stripe, Elements und das clientSecret vorhanden sind,
  // und keine Ladeoperation läuft. elements.submit() übernimmt die Validierung der Felder.
  const isButtonDisabled = !stripe || !elements || !clientSecret || isLoading;

  // Debug-Log für den Button-Status
  useEffect(() => {
    console.log('[DEBUG] CheckoutForm - Button Status:', {
      isButtonDisabled,
      stripe: !!stripe,
      elements: !!elements,
      clientSecret: !!clientSecret,
      isLoading,
    });
  }, [isButtonDisabled, stripe, elements, clientSecret, isLoading]);

  console.log('[DEBUG] CheckoutForm - Render:', {
    stripe: !!stripe,
    elements: !!elements,
    clientSecret: !!clientSecret,
    taskAmount,
    taskId,
  });

  return (
    <div className="w-full max-w-lg mx-auto">
      <form
        id="payment-form"
        onSubmit={handleSubmit}
        className="space-y-6 p-4 border rounded-lg shadow-sm bg-white w-full"
        style={{ minHeight: '400px' }} // Mindesthöhe für bessere Sichtbarkeit
      >
        <h3 className="text-lg font-semibold mb-4">Zahlung</h3>

        {/* Debug-Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-600 p-2 bg-yellow-100 rounded mb-4 border">
            🔍 CheckoutForm Debug:
            <br />- Stripe: {stripe ? '✓' : '✗'}
            <br />- Elements: {elements ? '✓' : '✗'}
            <br />- ClientSecret: {clientSecret ? '✓' : '✗'}
            <br />- TaskAmount: {taskAmount}
            <br />- TaskId: {taskId || 'null'}
          </div>
        )}

        {/* ABSOLUT MINIMALES PAYMENTELEMENT TEST */}
        <div
          style={{
            border: '5px solid red',
            backgroundColor: 'yellow',
            padding: '20px',
            margin: '20px 0',
            minHeight: '200px',
          }}
        >
          <h2 style={{ color: 'red', fontSize: '20px', fontWeight: 'bold' }}>
            ⚠️ KRITISCHER TEST - PaymentElement MUSS hier erscheinen!
          </h2>

          {/* STRIPE ENVIRONMENT DIAGNOSE */}
          <div
            style={{
              backgroundColor: 'orange',
              border: '2px solid black',
              padding: '10px',
              marginBottom: '10px',
              color: 'black',
            }}
          >
            <h3>🔍 STRIPE DIAGNOSE:</h3>
            <div>
              • Stripe Key beginnt mit:{' '}
              {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 7)}...
            </div>
            <div>• Environment: {process.env.NODE_ENV}</div>
            <div>• ClientSecret Type: {typeof clientSecret}</div>
            <div>• ClientSecret beginnt mit: {clientSecret?.substring(0, 10)}...</div>
            <div>• Stripe Instance: {stripe?.constructor?.name || 'undefined'}</div>
          </div>

          <div
            style={{
              backgroundColor: 'white',
              border: '3px solid blue',
              padding: '20px',
              minHeight: '150px',
            }}
          >
            <PaymentElement
              options={{
                layout: 'tabs',
                paymentMethodOrder: ['card'],
                fields: {
                  billingDetails: 'never',
                },
              }}
              onReady={() => {
                console.log('🟢 PaymentElement onReady - ELEMENT IST GELADEN!');
                console.log('🟢 Stripe Environment:', {
                  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 20),
                  environment: process.env.NODE_ENV,
                  clientSecret: clientSecret?.substring(0, 20),
                  stripeInstance: !!stripe,
                });

                // Prüfe DOM nach 1 Sekunde
                setTimeout(() => {
                  const allIframes = document.querySelectorAll('iframe');
                  const stripeIframes = Array.from(allIframes).filter(
                    iframe => iframe.src.includes('stripe') || iframe.src.includes('js.stripe.com')
                  );

                  console.log('🔍 DOM-Analyse nach onReady:', {
                    totalIframes: allIframes.length,
                    stripeIframes: stripeIframes.length,
                    stripeIframeSources: stripeIframes.map(iframe => iframe.src.substring(0, 50)),
                  });

                  stripeIframes.forEach((iframe, index) => {
                    const style = window.getComputedStyle(iframe);
                    console.log(`🔍 Stripe Iframe ${index} CSS:`, {
                      display: style.display,
                      visibility: style.visibility,
                      opacity: style.opacity,
                      width: style.width,
                      height: style.height,
                      position: style.position,
                    });
                  });
                }, 1000);

                alert('PaymentElement wurde geladen! Prüfe Konsole für Details.');
              }}
              onLoadError={error => {
                console.error('🔴 PaymentElement Load Error:', error);
                alert(`PaymentElement Fehler: ${JSON.stringify(error)}`);
              }}
              onFocus={() => {
                console.log('🟡 PaymentElement onFocus - User hat Element fokussiert');
              }}
              onBlur={() => {
                console.log('🟡 PaymentElement onBlur - User hat Element verlassen');
              }}
              onChange={event => {
                console.log('🟡 PaymentElement onChange:', event);
              }}
            />
          </div>
          <p style={{ color: 'red', fontWeight: 'bold', marginTop: '10px' }}>
            ☝️ Wenn du hier KEINE Stripe-Zahlungsfelder siehst, dann ist das Problem grundsätzlich!
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-600 p-2 bg-blue-100 rounded border">
            PaymentElement sollte oberhalb dieser Zeile sichtbar sein ☝️
          </div>
        )}

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
    </div>
  );
};
