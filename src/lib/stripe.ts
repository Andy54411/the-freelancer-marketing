// /Users/andystaudinger/Tasko/src/lib/stripe.ts - White Label Platform
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { suppressStripeAnalyticsErrors, handleApplePayDomainWarning } from './stripeErrorHandler';
import { setupStripeNetworkInterception, setupStripeErrorHandler } from './stripeNetworkHandler';

// Setup umfassender Stripe Sentry/Analytics-Fehler Unterdrückung
suppressStripeAnalyticsErrors();
setupStripeNetworkInterception();
setupStripeErrorHandler();

// Zusätzlicher globaler Sentry-Blocker für Stripe
if (typeof window !== 'undefined') {
  // Blockiere alle Stripe Sentry-Requests auf DNS-Ebene
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    const url = input.toString();
    if (url.includes('errors.stripe.com') || url.includes('sentry_key=')) {

      return Promise.resolve(
        new Response('{"status":"blocked"}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }
    return originalFetch.call(this, input, init);
  };
}

const initializeStripe = () => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {

    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ist nicht konfiguriert.');
  }

  // Stripe mit maximaler Sentry-Unterdrückung und White-Label-Konfiguration
  const stripePromise = loadStripe(publishableKey, {
    // Verhindere automatische Analytics-Aufrufe
    stripeAccount: undefined,
    // Deutsche Lokalisierung
    locale: 'de',
    // Minimiere Netzwerk-Requests
    betas: [],
    apiVersion: '2023-10-16',
  });

  return stripePromise;
};

// stripePromise direkt initialisieren und exportieren
export const stripePromise: Promise<Stripe | null> = initializeStripe();
