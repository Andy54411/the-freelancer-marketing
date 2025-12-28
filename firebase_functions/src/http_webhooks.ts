/**
 * HTTP Webhooks - Stripe DEAKTIVIERT
 * 
 * Stripe wurde durch das Escrow/Revolut Payment System ersetzt.
 * Revolut Webhooks werden über das Hetzner Payment-Backend verarbeitet.
 * 
 * @deprecated Stripe Webhooks sind nicht mehr aktiv
 */

import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';

/**
 * DEPRECATED: Stripe Webhook Handler
 * Stripe wurde durch Revolut/Escrow ersetzt
 */
export const stripeWebhookHandler = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
  },
  async (req, res) => {
    logger.warn('[DEPRECATED] Stripe Webhook aufgerufen - Stripe ist deaktiviert');
    
    res.status(410).json({
      success: false,
      error: 'Stripe integration has been deprecated. Use Revolut/Escrow system instead.',
      deprecatedAt: '2025-12-28',
    });
  }
);
