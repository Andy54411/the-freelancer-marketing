// /Users/andystaudinger/tilvo_neu/src/lib/stripe.ts
import { loadStripe, Stripe } from '@stripe/stripe-js';

const initializeStripe = () => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    console.error("FEHLER: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ist nicht gesetzt.");
    // In einer realen Anwendung würdest du hier vielleicht einen Fehler werfen oder null zurückgeben
    // und dies in der UI behandeln, anstatt die App abstürzen zu lassen.
    throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ist nicht konfiguriert.");
  }
  return loadStripe(publishableKey);
};

// stripePromise direkt initialisieren und exportieren
export const stripePromise: Promise<Stripe | null> = initializeStripe();
