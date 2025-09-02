// /Users/andystaudinger/Tasko/src/lib/stripeErrorHandler.ts
/**
 * Utility-Funktionen zur Behandlung von Stripe-Fehlern
 */

/**
 * Unterdrückt Stripe Analytics-Fehler in der Konsole (nur in Development)
 * Diese Fehler entstehen durch Stripe's interne Analytics-Aufrufe und sind meist harmlos
 */
export function suppressStripeAnalyticsErrors() {
  // Diese Funktion ist deprecated - alle Fetch-Interception wurde entfernt
  // um Konflikte mit anderen Services (Google Analytics, etc.) zu vermeiden
  console.warn('suppressStripeAnalyticsErrors is deprecated and no longer active');
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
    console.warn('Apple Pay Domain Warning: This is expected in development mode');
  }
}
