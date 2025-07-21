// /Users/andystaudinger/Tasko/src/lib/stripe.ts - White Label Platform
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { suppressStripeAnalyticsErrors, handleApplePayDomainWarning } from './stripeErrorHandler';
import { setupStripeNetworkInterception, setupStripeErrorHandler } from './stripeNetworkHandler';

// Unterdrücke Stripe Analytics-Fehler in Development
suppressStripeAnalyticsErrors();

// Setup Network-Interception für Stripe
setupStripeNetworkInterception();
setupStripeErrorHandler();

const initializeStripe = () => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    console.error('FEHLER: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ist nicht gesetzt.');
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ist nicht konfiguriert.');
  }

  // Stripe mit White-Label-Konfiguration - keine Redirects oder Branding
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
