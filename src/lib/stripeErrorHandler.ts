// /Users/andystaudinger/Taskilo/src/lib/stripeErrorHandler.ts
/**
 * Utility-Funktionen zur Behandlung von Stripe-Fehlern
 */

/**
 * Unterdrückt Stripe Analytics-Fehler in der Konsole (nur in Development)
 * Diese Fehler entstehen durch Stripe's interne Analytics-Aufrufe und sind meist harmlos
 */
export function suppressStripeAnalyticsErrors() {
  if (process.env.NODE_ENV === 'development') {
    // Unterdrücke bekannte Stripe Network-Fehler
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        return await originalFetch.apply(window, args);
      } catch (error) {
        const url = args[0]?.toString() || '';
        if (url.includes('stripe.com') || url.includes('errors.stripe.com')) {
          // Stripe Analytics/Sentry-Fehler still unterdrücken
          return new Response('{}', { status: 200 });
        }
        throw error;
      }
    };

    // Console Error Handler für verbleibende Fehler
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const message = args[0];

      // Unterdrücke bekannte Stripe Analytics-Fehler
      if (
        typeof message === 'string' &&
        (message.includes('FetchError: Error fetching https://r.stripe.com/b') ||
          (message.includes('Failed to load resource') && message.includes('errors.stripe.com')) ||
          (message.includes('429') && message.includes('stripe.com')) ||
          (message.includes('Failed to fetch') && message.includes('stripe.com')))
      ) {
        // Diese Fehler nicht ausgeben, da sie harmlos sind
        return;
      }

      // Alle anderen Fehler normal ausgeben
      originalError.apply(console, args);
    };
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
