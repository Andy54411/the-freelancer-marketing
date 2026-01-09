/**
 * Mobile App Payments - STRIPE DEAKTIVIERT (Januar 2026)
 * 
 * Diese Datei wurde deaktiviert, da Stripe durch das Revolut/Escrow System ersetzt wurde.
 * Mobile App Zahlungen werden jetzt über Revolut/Escrow abgewickelt.
 * 
 * @deprecated Stripe-basierte Mobile Payments sind nicht mehr aktiv
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';

/**
 * DEPRECATED: Mobile App B2C Payment Creation
 * Stripe wurde durch Revolut/Escrow ersetzt
 */
export const createB2CPayment = onCall(
  { 
    enforceAppCheck: false,
  },
  async () => {
    logger.warn('[DEPRECATED] createB2CPayment aufgerufen - Stripe ist deaktiviert');
    throw new HttpsError('unimplemented', 
        'Stripe integration has been deprecated. Use Revolut/Escrow system for mobile payments.'
    );
  }
);

/**
 * DEPRECATED: Mobile App B2B Payment Creation
 * Stripe wurde durch Revolut/Escrow ersetzt
 */
export const createB2BPayment = onCall(
  { 
    enforceAppCheck: false 
  },
  async () => {
    logger.warn('[DEPRECATED] createB2BPayment aufgerufen - Stripe ist deaktiviert');
    throw new HttpsError('unimplemented', 
        'Stripe integration has been deprecated. Use Revolut/Escrow system for B2B payments.'
    );
  }
);

/**
 * DEPRECATED: Mobile App Hourly Payment Creation
 * Stripe wurde durch Revolut/Escrow ersetzt
 */
export const createHourlyPayment = onCall(
  { 
    enforceAppCheck: false 
  },
  async () => {
    logger.warn('[DEPRECATED] createHourlyPayment aufgerufen - Stripe ist deaktiviert');
    throw new HttpsError('unimplemented', 
        'Stripe integration has been deprecated. Use Revolut/Escrow system for hourly payments.'
    );
  }
);
