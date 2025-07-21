// /Users/andystaudinger/Tasko/src/lib/stripeNetworkHandler.ts
/**
 * Behandelt Stripe Network-Fehler und Rate Limiting
 */

// Service Worker für Stripe-Requests einrichten (nur in Development)
export function setupStripeNetworkInterception() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    // Überwache fetch-Requests und behandle Stripe-spezifische Fehler
    const originalFetch = window.fetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();

      // Fange Stripe Analytics und Sentry Requests ab
      if (
        url.includes('errors.stripe.com') ||
        url.includes('r.stripe.com/b') ||
        url.includes('m.stripe.com/4')
      ) {
        console.log('🔇 Stripe Analytics-Request unterdrückt:', url);

        // Simuliere erfolgreiche Response
        return new Response(JSON.stringify({}), {
          status: 200,
          statusText: 'OK',
          headers: new Headers({
            'Content-Type': 'application/json',
          }),
        });
      }

      try {
        return await originalFetch(input, init);
      } catch (error) {
        // Bei Stripe-Fehlern nicht weiterwerfen
        if (url.includes('stripe.com')) {
          console.log('🔇 Stripe Network-Fehler unterdrückt:', error);
          return new Response('{}', { status: 200 });
        }
        throw error;
      }
    };
  }
}

// Error Event Handler für unbehandelte Promise Rejections
export function setupStripeErrorHandler() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    window.addEventListener('unhandledrejection', event => {
      const error = event.reason;
      const errorMessage = error?.message || error?.toString() || '';

      if (
        errorMessage.includes('stripe.com') ||
        errorMessage.includes('FetchError: Error fetching')
      ) {
        console.log('🔇 Unhandled Stripe Promise Rejection unterdrückt:', error);
        event.preventDefault();
      }
    });
  }
}
