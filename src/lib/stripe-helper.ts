/**
 * Stripe Helper Utility
 * KRITISCH: Vercel speichert Environment Variables mit Newlines (\n)
 * Diese Funktion säubert den Stripe Key bevor Initialisierung
 */

import Stripe from 'stripe';

/**
 * Säubert Stripe Key/Secret von Newlines und Whitespace
 * WICHTIG: Funktioniert für Secret Keys UND Webhook Secrets
 * @param key - Raw Key aus Environment Variable
 * @param errorMessage - Custom error message
 * @returns Gesäuberter Key ohne Newlines
 */
export function cleanStripeKey(
  key: string | undefined,
  errorMessage = 'Stripe key is not defined'
): string {
  if (!key) {
    throw new Error(errorMessage);
  }
  // KRITISCH: Entferne alle Newlines (\n, \r\n) und Whitespace
  return key.trim().replace(/\r?\n/g, '');
}

/**
 * Erstellt Stripe Instance mit gesäubertem Key
 * @returns Stripe Instance
 */
export function getStripeInstance(): Stripe {
  const cleanKey = cleanStripeKey(process.env.STRIPE_SECRET_KEY);
  return new Stripe(cleanKey, {
    apiVersion: '2024-06-20',
  });
}
