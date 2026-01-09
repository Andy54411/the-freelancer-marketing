/**
 * Fix Inconsistent Payment - STRIPE DEAKTIVIERT (Januar 2026)
 * 
 * Diese Datei wurde deaktiviert, da Stripe durch das Revolut/Escrow System ersetzt wurde.
 * Zahlungskorrekturen werden jetzt über andere Methoden abgewickelt.
 * 
 * @deprecated Stripe-basierte Zahlungskorrekturen sind nicht mehr aktiv
 */

import { onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { HttpsError } from 'firebase-functions/v2/https';

/**
 * DEPRECATED: Fix Inconsistent Payment Handler
 * Stripe wurde durch Revolut/Escrow ersetzt
 */
export const fixInconsistentPayment = onCall({
    cors: true,
}, async () => {
    logger.warn('[DEPRECATED] fixInconsistentPayment aufgerufen - Stripe ist deaktiviert');
    throw new HttpsError('unimplemented', 
        'Stripe integration has been deprecated. Payment fixes should use the Revolut/Escrow system.'
    );
});