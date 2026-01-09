/**
 * HTTP File Uploads - STRIPE DEAKTIVIERT (Januar 2026)
 * 
 * Diese Datei wurde deaktiviert, da Stripe durch das Revolut/Escrow System ersetzt wurde.
 * Datei-Uploads werden jetzt über andere Methoden abgewickelt.
 * 
 * @deprecated Stripe-basierte File Uploads sind nicht mehr aktiv
 */

import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";

/**
 * DEPRECATED: Stripe File Upload Handler
 * Stripe wurde durch Revolut/Escrow ersetzt
 */
export const uploadStripeFile = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 10
  },
  async (req, res) => {
    logger.warn('[DEPRECATED] uploadStripeFile aufgerufen - Stripe ist deaktiviert');
    res.status(410).json({
      success: false,
      error: 'Stripe integration has been deprecated. File uploads should use alternative methods.',
      deprecated: true,
      message: 'Diese Funktion ist nicht mehr verfügbar. Stripe wurde durch Revolut/Escrow ersetzt.'
    });
  }
);