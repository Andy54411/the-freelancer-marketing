/**
 * Stripe Network Handler - Behandelt Stripe-spezifische Netzwerkfehler
 * WICHTIG: Keine window.fetch Überschreibung mehr um Konflikte zu vermeiden
 */

// Network Interception Setup - DEPRECATED
export function setupStripeNetworkInterception() {}

// Error Event Handler für unbehandelte Promise Rejections
export function setupStripeErrorHandler() {
  if (typeof window !== 'undefined') {
    // Handler für unbehandelte Promise Rejections
    window.addEventListener('unhandledrejection', event => {
      const error = event.reason;
      const errorMessage = error?.message || error?.toString() || '';

      // Nur Stripe-spezifische Fehler abfangen
      if (
        errorMessage.includes('stripe.com') ||
        errorMessage.includes('errors.stripe.com') ||
        errorMessage.includes('sentry_key=')
      ) {
        event.preventDefault();
      }
    });

    // Handler für globale JavaScript Errors
    window.addEventListener('error', event => {
      const errorMessage = event.message || '';
      const source = event.filename || '';

      // Nur Stripe-spezifische Fehler abfangen
      if (
        source.includes('stripe.com') ||
        errorMessage.includes('errors.stripe.com') ||
        errorMessage.includes('sentry_key=')
      ) {
        event.preventDefault();
      }
    });
  }
}

// Utility-Funktion für Stripe Error Checking
export function isStripeError(error: any): boolean {
  const errorMessage = error?.message || error?.toString() || '';
  return (
    errorMessage.includes('stripe.com') ||
    errorMessage.includes('errors.stripe.com') ||
    errorMessage.includes('sentry_key=')
  );
}
