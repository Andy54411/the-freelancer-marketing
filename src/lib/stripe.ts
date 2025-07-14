// /Users/andystaudinger/tilvo_neu/src/lib/stripe.ts
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { suppressStripeAnalyticsErrors, handleApplePayDomainWarning } from './stripeErrorHandler';

// Unterdrücke Stripe Analytics-Fehler in Development
suppressStripeAnalyticsErrors();

const initializeStripe = () => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    console.error('FEHLER: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ist nicht gesetzt.');
    // In einer realen Anwendung würdest du hier vielleicht einen Fehler werfen oder null zurückgeben
    // und dies in der UI behandeln, anstatt die App abstürzen zu lassen.
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ist nicht konfiguriert.');
  }

  // Stripe mit erweiterten Optionen laden, um Analytics-Fehler zu reduzieren
  const stripePromise = loadStripe(publishableKey, {
    // Verhindere automatische Analytics-Aufrufe in Development
    stripeAccount: undefined,
    // Konfiguriere Locale für deutsche Nutzer
    locale: 'de',
  });

  // Behandle Apple Pay Domain-Warnungen
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      handleApplePayDomainWarning();
    }, 2000);
  }

  return stripePromise;
};

// stripePromise direkt initialisieren und exportieren
export const stripePromise: Promise<Stripe | null> = initializeStripe();
