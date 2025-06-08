// /Users/andystaudinger/Tasko/src/components/StripeWrapper.tsx
'use client';

import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe'; // Importiert das direkt exportierte Promise

export default function StripeWrapper({ children }: { children: React.ReactNode }) {
  if (!stripePromise) {
    // Fallback oder Fehlermeldung, falls stripePromise aus irgendeinem Grund null ist
    // (sollte durch den Fehlerwurf in lib/stripe.ts eigentlich nicht passieren)
    return <div className="text-red-500 p-4">Stripe konnte nicht initialisiert werden. Publishable Key fehlt.</div>;
  }
  return <Elements stripe={stripePromise}>{children}</Elements>;
}