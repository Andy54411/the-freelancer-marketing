'use client';

import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Stripe Promise initialisieren mit KORREKTEM KEY
const STRIPE_PUBLISHABLE_KEY =
  'pk_test_51RXvRUD5Lvjon30aMzieGY1n513cwTd8wUGf6cmYphSWfdTpsbKAHLFs5C17xubatZkLdMYRgBPRlWUMXMQZPrJK00N3Rtf7Dk';

console.log(
  '🔑 Environment Variable:',
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'Vorhanden' : 'FEHLT'
);
console.log('🔑 Hard-coded Key:', STRIPE_PUBLISHABLE_KEY ? 'Vorhanden' : 'FEHLT');
console.log('🔑 Using Key:', STRIPE_PUBLISHABLE_KEY);

// Nur im Browser ausführen
const stripePromise = typeof window !== 'undefined' ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

// Debug: Prüfe ob Stripe Promise funktioniert (nur im Browser)
if (typeof window !== 'undefined' && stripePromise) {
  stripePromise
    .then(stripe => {
      console.log('✅ Stripe Promise resolved:', stripe ? 'SUCCESS' : 'FAILED');
      if (!stripe) {
        console.error('❌ Stripe ist null! Details:');
        console.error('  - Key verwendet:', STRIPE_PUBLISHABLE_KEY);
        console.error('  - Key länge:', STRIPE_PUBLISHABLE_KEY?.length);
        console.error('  - Key startet mit pk_:', STRIPE_PUBLISHABLE_KEY?.startsWith('pk_'));
        console.error('  - Browser:', navigator.userAgent);
        console.error('  - Protocol:', window.location.protocol);
        console.error('  - Domain:', window.location.hostname);
      } else {
        console.log('✅ Stripe Object:', stripe);
        console.log('✅ Stripe loaded successfully');
      }
    })
    .catch(error => {
      console.error('❌ Stripe Promise Error:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    });
}

interface MinimalTestProps {
  clientSecret: string;
}

const TestPaymentForm = ({ clientSecret }: { clientSecret: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

  // DOM Debug
  useEffect(() => {
    // Validiere clientSecret Format
    const isValidClientSecret =
      clientSecret &&
      typeof clientSecret === 'string' &&
      clientSecret.includes('pi_') &&
      clientSecret.includes('_secret_');

    console.log('🔍 PaymentForm mounted, checking DOM...');
    console.log('🔍 ClientSecret Valid:', isValidClientSecret);
    console.log('🔍 ClientSecret Preview:', clientSecret?.substring(0, 20) + '...');

    const timer = setTimeout(() => {
      const paymentElements = document.querySelectorAll('[data-elements-stable-field-name]');
      const stripeElements = document.querySelectorAll('.StripeElement');
      const cardInputs = document.querySelectorAll(
        'input[placeholder*="card"], input[placeholder*="Card"]'
      );
      console.log('🔍 PaymentElements found:', paymentElements.length);
      console.log('🔍 StripeElements found:', stripeElements.length);
      console.log('🔍 Card inputs found:', cardInputs.length);
      console.log(
        '🔍 All elements with "stripe":',
        document.querySelectorAll('[class*="stripe"]').length
      );
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      console.log('❌ Stripe oder Elements nicht geladen');
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/success`,
      },
    });

    if (error) {
      console.error('❌ Payment Error:', error);
    }

    setIsLoading(false);
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <h3 style={{ color: 'black', fontSize: '18px', marginBottom: '10px' }}>
        🧪 STRIPE PAYMENT FORM
      </h3>

      <div
        style={{
          width: '100%',
          height: '200px',
          backgroundColor: 'yellow',
          border: '3px solid purple',
          padding: '10px',
          marginBottom: '20px',
        }}
      >
        <PaymentElement
          onReady={() => {
            console.log('✅ PaymentElement ist bereit!');
            // Sofort nach dem Laden nach Inputs suchen
            setTimeout(() => {
              const inputs = document.querySelectorAll(
                '#payment-element input, #payment-element iframe'
              );
              const paymentElement = document.getElementById('payment-element');
              console.log('🔍 Nach onReady - Inputs gefunden:', inputs.length);
              console.log('� Nach onReady - PaymentElement HTML:', paymentElement?.innerHTML);
              console.log(
                '🔍 Nach onReady - PaymentElement children:',
                paymentElement?.children.length
              );
            }, 500);
          }}
          onLoadError={error => {
            console.error('❌ PaymentElement Fehler:', error);
            alert('❌ PaymentElement Fehler: ' + JSON.stringify(error));
          }}
          onChange={event => {
            console.log('🔄 PaymentElement changed:', event);
          }}
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!stripe || isLoading}
        style={{
          width: '100%',
          height: '50px',
          backgroundColor: 'green',
          color: 'white',
          fontSize: '16px',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {isLoading ? 'Verarbeitung...' : 'TEST PAYMENT'}
      </button>
    </div>
  );
};

export default function MinimalStripeTest({ clientSecret }: MinimalTestProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.log('🚀 MinimalStripeTest mounted in browser');
  }, []);

  // Debug fallback clientSecret
  const debugClientSecret = 'pi_test_1234567890_secret_test123456789012345678901234567890';

  const options: StripeElementsOptions =
    clientSecret || debugClientSecret
      ? {
          clientSecret: clientSecret || debugClientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#0570de',
              colorBackground: '#ffffff',
              colorText: '#30313d',
              colorDanger: '#df1b41',
              fontFamily: 'Ideal Sans, system-ui, sans-serif',
              spacingUnit: '2px',
              borderRadius: '4px',
            },
          },
        }
      : {
          mode: 'payment',
          amount: 1099,
          currency: 'eur',
        };

  console.log(
    '🧪 MinimalStripeTest - clientSecret:',
    clientSecret ? 'Vorhanden (' + (clientSecret?.length || 0) + ' chars)' : 'Fehlt'
  );
  console.log('🧪 MinimalStripeTest - clientSecret REAL:', clientSecret);
  console.log('🧪 MinimalStripeTest - stripePromise:', stripePromise ? 'Geladen' : 'Nicht geladen');
  console.log('🧪 MinimalStripeTest - mounted:', mounted);

  if (!mounted) {
    return (
      <div
        style={{
          padding: '20px',
          backgroundColor: '#f0f0f0',
          border: '2px solid #ccc',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ color: 'black' }}>⏳ Component wird geladen...</h3>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div
        style={{
          padding: '20px',
          backgroundColor: '#ffebee',
          border: '2px solid #f44336',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ color: 'black' }}>❌ Stripe nicht verfügbar</h3>
        <p style={{ color: 'black' }}>Browser-Check fehlgeschlagen</p>
      </div>
    );
  }

  // Render mit Portal direkt ins body
  const portalContent = (
    <div
      style={{
        position: 'fixed',
        top: '50px',
        left: '50px',
        width: '800px',
        height: '600px',
        backgroundColor: 'red',
        zIndex: 99999999,
        border: '10px solid lime',
        padding: '50px',
        overflow: 'visible',
      }}
    >
      <h2 style={{ color: 'white', fontSize: '24px', marginBottom: '20px' }}>
        🧪 PORTAL STRIPE TEST - OUTSIDE LAYOUT
      </h2>

      <Elements stripe={stripePromise} options={options}>
        <div
          style={{
            width: '100%',
            height: '400px',
            backgroundColor: 'white',
            border: '5px solid blue',
            padding: '20px',
            position: 'relative',
            overflow: 'visible',
          }}
        >
          <TestPaymentForm clientSecret={clientSecret || debugClientSecret} />
        </div>
      </Elements>
    </div>
  );

  return (
    <>
      <div className="p-4 bg-green-100 border border-green-400 rounded">
        <p className="text-green-700">
          ✅ PaymentElement wird als Portal gerendert (schau oben links!)
        </p>
      </div>
      {createPortal(portalContent, document.body)}
    </>
  );
}
