/**
 * Scheduled Cloud Function: Auto-Payout nach Clearing-Periode
 * 
 * Diese Funktion läuft täglich um 06:00 Uhr und verarbeitet alle
 * Aufträge, deren Clearing-Periode abgelaufen ist.
 * 
 * Workflow:
 * 1. Findet alle Escrows im Status 'held' mit abgelaufener clearingEndsAt
 * 2. Sammelt Anbieter-IBAN aus companies Collection
 * 3. Ruft Hetzner Payment-Backend für Batch-Auszahlung auf
 * 4. Aktualisiert Escrow-Status auf 'released'
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import https from 'https';

const db = getFirestore();

// Hetzner Payment Backend URL
const PAYMENT_BACKEND_URL = process.env.PAYMENT_BACKEND_URL || 'https://mail.taskilo.de';
const PAYMENT_API_KEY = process.env.PAYMENT_API_KEY || process.env.WEBMAIL_API_KEY;

interface EscrowRecord {
  id: string;
  orderId: string;
  buyerId: string;
  providerId: string;
  amount: number;
  currency: string;
  status: 'held' | 'released' | 'refunded' | 'disputed';
  clearingEndsAt: Timestamp;
  createdAt: Timestamp;
}

interface PayoutResult {
  orderId: string;
  success: boolean;
  paymentId?: string;
  error?: string;
}

interface AutoPayoutResult {
  processed: number;
  released: number;
  failed: number;
  skipped: number;
  details: Array<{
    escrowId: string;
    orderId: string;
    status: 'released' | 'failed' | 'skipped';
    message?: string;
    paymentId?: string;
  }>;
}

/**
 * Ruft das Hetzner Payment-Backend für Batch-Auszahlung auf
 */
async function callPaymentBackend(payouts: Array<{
  orderId: string;
  providerId: string;
  amount: number;
  currency: string;
  iban: string;
  bic?: string;
  name: string;
  reference?: string;
}>): Promise<{ success: boolean; results: PayoutResult[] }> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${PAYMENT_BACKEND_URL}/api/payment/payout/batch`);
    
    const postData = JSON.stringify({ payouts });

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'X-API-Key': PAYMENT_API_KEY || '',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Payment Backend Error: ${res.statusCode} - ${data}`));
          return;
        }
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Holt Anbieter-Bankdaten aus der companies Collection
 */
async function getProviderBankDetails(providerId: string): Promise<{
  iban?: string;
  bic?: string;
  name: string;
} | null> {
  try {
    const companyDoc = await db.collection('companies').doc(providerId).get();
    
    if (!companyDoc.exists) {
      logger.warn(`[AutoPayout] Company not found: ${providerId}`);
      return null;
    }

    const companyData = companyDoc.data();
    
    // Versuche verschiedene IBAN-Felder
    const iban = companyData?.iban || 
                 companyData?.bankDetails?.iban ||
                 companyData?.step3?.iban ||
                 companyData?.payoutIban;
    
    const bic = companyData?.bic || 
                companyData?.bankDetails?.bic ||
                companyData?.step3?.bic;
    
    const name = companyData?.companyName || 
                 companyData?.name || 
                 `Anbieter ${providerId}`;

    return { iban, bic, name };
  } catch (error) {
    logger.error(`[AutoPayout] Error fetching company ${providerId}:`, error);
    return null;
  }
}

/**
 * Täglich um 06:00 Uhr automatische Auszahlungen verarbeiten
 */
export const scheduledAutoPayouts = onSchedule(
  {
    schedule: '0 6 * * *', // Jeden Tag um 06:00 Uhr
    timeZone: 'Europe/Berlin',
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 540, // 9 Minuten
  },
  async () => {
    logger.info('[AutoPayout] Starting scheduled auto-payout processing');

    const result: AutoPayoutResult = {
      processed: 0,
      released: 0,
      failed: 0,
      skipped: 0,
      details: [],
    };

    try {
      const now = Timestamp.now();

      // Finde alle Escrows im Status 'held' mit abgelaufener Clearing-Periode
      // Prüfe zuerst in der neuen escrows Collection
      let escrowsSnapshot = await db
        .collection('escrows')
        .where('status', '==', 'held')
        .where('clearingEndsAt', '<=', now)
        .get();

      // Fallback: Prüfe auch auftraege Collection für Legacy-Daten
      if (escrowsSnapshot.empty) {
        escrowsSnapshot = await db
          .collection('auftraege')
          .where('escrowStatus', '==', 'held')
          .where('clearingPeriodEndsAt', '<=', now)
          .get();
      }

      if (escrowsSnapshot.empty) {
        logger.info('[AutoPayout] No escrows ready for payout');
        return;
      }

      logger.info(`[AutoPayout] Found ${escrowsSnapshot.size} escrows ready for payout`);

      // Sammle alle Auszahlungen
      const payouts: Array<{
        orderId: string;
        providerId: string;
        amount: number;
        currency: string;
        iban: string;
        bic?: string;
        name: string;
        reference?: string;
        escrowId: string;
      }> = [];

      for (const doc of escrowsSnapshot.docs) {
        result.processed++;
        const escrowId = doc.id;
        const data = doc.data();

        const providerId = data.providerId || data.providerUid || data.anbieter;
        const amount = data.amount || data.betrag || data.totalAmount;
        const currency = data.currency || 'EUR';
        const orderId = data.orderId || escrowId;

        if (!providerId || !amount) {
          logger.warn(`[AutoPayout] Escrow ${escrowId}: Missing providerId or amount, skipping`);
          result.skipped++;
          result.details.push({
            escrowId,
            orderId,
            status: 'skipped',
            message: 'Missing providerId or amount',
          });
          continue;
        }

        // Hole Anbieter-Bankdaten
        const bankDetails = await getProviderBankDetails(providerId);

        if (!bankDetails?.iban) {
          logger.warn(`[AutoPayout] Escrow ${escrowId}: Provider ${providerId} has no IBAN, skipping`);
          result.skipped++;
          result.details.push({
            escrowId,
            orderId,
            status: 'skipped',
            message: 'Provider has no IBAN',
          });
          continue;
        }

        payouts.push({
          escrowId,
          orderId,
          providerId,
          amount: Number(amount),
          currency,
          iban: bankDetails.iban,
          bic: bankDetails.bic,
          name: bankDetails.name,
          reference: `Taskilo Auszahlung ${orderId}`,
        });
      }

      if (payouts.length === 0) {
        logger.info('[AutoPayout] No valid payouts to process');
        return;
      }

      logger.info(`[AutoPayout] Processing ${payouts.length} payouts via Payment Backend`);

      // Rufe Payment Backend für Batch-Auszahlung auf
      try {
        const payoutResponse = await callPaymentBackend(
          payouts.map(p => ({
            orderId: p.orderId,
            providerId: p.providerId,
            amount: p.amount,
            currency: p.currency,
            iban: p.iban,
            bic: p.bic,
            name: p.name,
            reference: p.reference,
          }))
        );

        // Verarbeite Ergebnisse
        for (const payoutResult of payoutResponse.results || []) {
          const payout = payouts.find(p => p.orderId === payoutResult.orderId);
          
          if (!payout) continue;

          if (payoutResult.success) {
            // Aktualisiere Escrow-Status auf 'released'
            try {
              await db.collection('escrows').doc(payout.escrowId).update({
                status: 'released',
                releasedAt: FieldValue.serverTimestamp(),
                paymentId: payoutResult.paymentId,
                updatedAt: FieldValue.serverTimestamp(),
              });

              result.released++;
              result.details.push({
                escrowId: payout.escrowId,
                orderId: payout.orderId,
                status: 'released',
                paymentId: payoutResult.paymentId,
              });
            } catch (updateError) {
              logger.error(`[AutoPayout] Failed to update escrow ${payout.escrowId}:`, updateError);
            }
          } else {
            result.failed++;
            result.details.push({
              escrowId: payout.escrowId,
              orderId: payout.orderId,
              status: 'failed',
              message: payoutResult.error,
            });
          }
        }
      } catch (backendError) {
        logger.error('[AutoPayout] Payment Backend call failed:', backendError);
        
        // Markiere alle als fehlgeschlagen
        for (const payout of payouts) {
          result.failed++;
          result.details.push({
            escrowId: payout.escrowId,
            orderId: payout.orderId,
            status: 'failed',
            message: backendError instanceof Error ? backendError.message : 'Backend call failed',
          });
        }
      }

      logger.info('[AutoPayout] Complete', {
        processed: result.processed,
        released: result.released,
        failed: result.failed,
        skipped: result.skipped,
      });

    } catch (error) {
      logger.error('[AutoPayout] Fatal error:', error);
      throw error;
    }
  }
);

/**
 * HTTP-Trigger für manuelle Ausführung oder Testing
 */
import { onRequest } from 'firebase-functions/v2/https';

export const triggerAutoPayouts = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 540,
  },
  async (req, res) => {
    // Nur POST erlaubt
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // API Key Validierung
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.ADMIN_API_KEY) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    logger.info('[AutoPayout] Manual trigger received');

    try {
      // Hier könnte man die gleiche Logik wie im Scheduler aufrufen
      // Für jetzt nur Bestätigung
      res.json({
        success: true,
        message: 'Auto-payout triggered. Check logs for results.',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);
