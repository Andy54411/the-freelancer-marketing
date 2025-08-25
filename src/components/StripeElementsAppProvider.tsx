// src/components/StripeElementsAppProvider.tsx
'use client';

import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { StripeElementsOptions } from '@stripe/stripe-js';

const elementsOptions: StripeElementsOptions = {
  // locale: 'de',
};

export default function StripeElementsAppProvider({ children }: { children: React.ReactNode }) {
  if (!stripePromise) {

    return (
      <div className="text-red-500 p-4">
        Stripe konnte nicht initialisiert werden. Publishable Key fehlt.
      </div>
    );
  }
  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      {children}
    </Elements>
  );
}
