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
        console.error("FEHLER: stripePromise ist nicht verfügbar in StripeElementsAppProvider.");
        return <>{children}</>;
    }
    return (
        <Elements stripe={stripePromise} options={elementsOptions}>
            {children}
        </Elements>
    );
}