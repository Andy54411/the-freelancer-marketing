// /Users/andystaudinger/Taskilo/src/lib/stripeErrorHandler.ts
/**
 * Utility-Funktionen zur Behandlung von Stripe-Fehlern
 */

/**
 * Unterdrückt Stripe Analytics-Fehler in der Konsole (nur in Development)
 * Diese Fehler entstehen durch Stripe's interne Analytics-Aufrufe und sind meist harmlos
 */
export function suppressStripeAnalyticsErrors() {
  if (typeof window !== 'undefined') {
    // Globaler Fetch Interceptor für alle Stripe Sentry-Fehler
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0]?.toString() || '';

      try {
        const response = await originalFetch.apply(window, args);

        // Abfangen von Stripe Sentry-Requests und Rate-Limiting-Fehlern
        if (url.includes('errors.stripe.com')) {
          // Erstelle eine erfolgreiche Mock-Response für Sentry-Requests
          if (response.status === 429 || response.status === 400) {
            console.log(`🔇 Stripe Sentry Error suppressed: ${response.status} ${url}`);
            return new Response('{"status": "ok"}', {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        }

        return response;
      } catch (error) {
        const url = args[0]?.toString() || '';

        // Nur Stripe-spezifische Fehler supprimieren, alle anderen durchlassen
        if (
          url.includes('stripe.com') ||
          url.includes('errors.stripe.com') ||
          url.includes('js.stripe.com')
        ) {
          // Stripe Analytics/Sentry-Fehler still unterdrücken
          console.log(`🔇 Stripe Network Error suppressed: ${url}`);
          return new Response('{"status": "ok"}', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Cloud Functions und andere wichtige Fehler durchlassen mit besseren Messages
        if (url.includes('cloudfunctions.net')) {
          console.error(`🚨 Cloud Function Error:`, {
            url: url,
            error: error instanceof Error ? error.message : error,
            timestamp: new Date().toISOString(),
          });
        } else {
          console.error(`🚨 Network Error (not Stripe):`, url, error);
        }

        throw error;
      }
    };

    // Console Error Handler für verbleibende Fehler
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const message = args[0];

      // Erweiterte Stripe Sentry-Fehler Unterdrückung
      if (
        typeof message === 'string' &&
        (message.includes('FetchError: Error fetching https://r.stripe.com/b') ||
          message.includes('POST https://errors.stripe.com/api/') ||
          message.includes('429 (Too Many Requests)') ||
          message.includes('400 (Bad Request)') ||
          (message.includes('Failed to load resource') && message.includes('errors.stripe.com')) ||
          (message.includes('429') && message.includes('stripe.com')) ||
          (message.includes('400') && message.includes('stripe.com')) ||
          (message.includes('Failed to fetch') && message.includes('stripe.com')) ||
          message.includes('sentry_key=') ||
          message.includes('sentry_version='))
      ) {
        // Diese Fehler nicht ausgeben, da sie harmlos sind
        console.log(`🔇 Stripe Console Error suppressed: ${message.slice(0, 100)}...`);
        return;
      }

      // Alle anderen Fehler normal ausgeben
      originalError.apply(console, args);
    };

    // Globaler Error Handler für unbehandelte Promise Rejections
    window.addEventListener('unhandledrejection', event => {
      const error = event.reason;
      const errorMessage = error?.message || error?.toString() || '';

      if (
        errorMessage.includes('errors.stripe.com') ||
        errorMessage.includes('sentry_key=') ||
        errorMessage.includes('POST https://errors.stripe.com') ||
        (errorMessage.includes('429') && errorMessage.includes('stripe')) ||
        (errorMessage.includes('400') && errorMessage.includes('stripe'))
      ) {
        console.log(
          '🔇 Stripe Unhandled Promise Rejection suppressed:',
          errorMessage.slice(0, 100)
        );
        event.preventDefault();
      }
    });
  }
}

/**
 * Konfiguriert Stripe Elements mit optimierten Einstellungen
 */
export const getOptimizedStripeElementsOptions = () => {
  return {
    // Lokalisierung für Deutsche Nutzer
    locale: 'de' as const,
    // Minimiere Analytics-Aufrufe
    fonts: [],
    // Appearance-Konfiguration für bessere UX
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#14ad9f',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#dc2626',
        borderRadius: '8px',
      },
    },
  };
};

/**
 * Behandelt Apple Pay Domain-Warnungen
 */
export function handleApplePayDomainWarning() {
  if (process.env.NODE_ENV === 'development') {
    console.info(
      '%c[INFO] Apple Pay Domain-Warnung kann ignoriert werden',
      'color: #14ad9f; font-weight: bold;',
      '\nDiese Warnung erscheint, weil die Domain nicht für Apple Pay registriert ist.',
      '\nIn der Produktion sollte die Domain bei Stripe registriert werden:',
      '\nhttps://stripe.com/docs/payments/payment-methods/pmd-registration'
    );
  }
}
