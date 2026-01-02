/**
 * Payment Routes - Revolut Integration für Escrow-System
 * 
 * Dieses Modul verwaltet alle Payment-bezogenen Operationen:
 * - Escrow-Erstellung (Geld einfrieren)
 * - Escrow-Freigabe (Auszahlung an Anbieter)
 * - Batch-Auszahlungen
 * - Revolut Webhooks
 */

import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import https from 'https';
import jwt from 'jsonwebtoken';

const router = express.Router();

// ============================================================================
// REVOLUT CONFIGURATION
// ============================================================================

interface RevolutConfig {
  baseUrl: string;
  authUrl: string;
  clientId: string;
  transportCert: string;
  privateKey: string;
}

function loadRevolutConfig(): RevolutConfig {
  const isProduction = process.env.REVOLUT_ENVIRONMENT === 'production';
  
  const baseUrl = isProduction
    ? 'https://b2b.revolut.com/api/1.0'
    : 'https://sandbox-b2b.revolut.com/api/1.0';
    
  const authUrl = isProduction
    ? 'https://business.revolut.com'
    : 'https://sandbox-business.revolut.com';

  const clientId = process.env.REVOLUT_CLIENT_ID || '';
  
  // Load certificates from file system (Hetzner has direct file access)
  const certsDir = process.env.REVOLUT_CERTS_DIR || '/app/certs/revolut';
  
  let transportCert = '';
  let privateKey = '';
  
  try {
    const transportCertPath = path.join(certsDir, 'transport.pem');
    const privateKeyPath = path.join(certsDir, 'private.key');
    
    if (fs.existsSync(transportCertPath) && fs.existsSync(privateKeyPath)) {
      transportCert = fs.readFileSync(transportCertPath, 'utf8');
      privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      console.log('[Revolut] Certificates loaded from:', certsDir);
    } else {
      console.warn('[Revolut] Certificate files not found in:', certsDir);
    }
  } catch (error) {
    console.error('[Revolut] Failed to load certificates:', error);
  }
  
  return { baseUrl, authUrl, clientId, transportCert, privateKey };
}

const revolutConfig = loadRevolutConfig();

// ============================================================================
// REVOLUT API HELPERS
// ============================================================================

interface RevolutPaymentRequest {
  request_id: string;
  account_id: string;
  receiver: {
    counterparty_id?: string;
    account_id?: string;
    iban?: string;
    bic?: string;
    name?: string;
  };
  amount: number;
  currency: string;
  reference?: string;
}

interface RevolutPaymentResponse {
  id: string;
  state: string;
  created_at: string;
  completed_at?: string;
  request_id: string;
  type: string;
  reference?: string;
  amount: number;
  currency: string;
}

// Cached access token
let cachedAccessToken: string | null = process.env.REVOLUT_ACCESS_TOKEN || null;
let tokenExpiresAt: number = 0;

async function getAccessToken(_scope: string = 'READ'): Promise<string> {
  // Check if we have a valid cached token
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && tokenExpiresAt > now + 60) {
    console.log('[Revolut] Using cached access token');
    return cachedAccessToken;
  }

  // Need to refresh the token
  console.log('[Revolut] Refreshing access token...');
  return refreshAccessToken();
}

async function refreshAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const refreshToken = process.env.REVOLUT_REFRESH_TOKEN;
    if (!refreshToken) {
      reject(new Error('No refresh token available'));
      return;
    }

    if (!revolutConfig.clientId || !revolutConfig.privateKey) {
      reject(new Error('Revolut configuration incomplete'));
      return;
    }

    // Create JWT for client assertion
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: 'taskilo.de',
      sub: revolutConfig.clientId,
      aud: 'https://revolut.com',
      iat: now,
      exp: now + 300,
    };

    let clientAssertion: string;
    try {
      clientAssertion = jwt.sign(payload, revolutConfig.privateKey, {
        algorithm: 'RS256',
        header: {
          alg: 'RS256',
          typ: 'JWT',
        },
      });
    } catch (err) {
      reject(new Error(`JWT signing failed: ${err instanceof Error ? err.message : 'Unknown error'}`));
      return;
    }

    const postData = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: revolutConfig.clientId,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: clientAssertion,
    }).toString();

    const options = {
      hostname: 'b2b.revolut.com',
      port: 443,
      path: '/api/1.0/auth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          console.error('[Revolut] Token refresh failed:', res.statusCode, data);
          reject(new Error(`Token refresh failed: ${res.statusCode} - ${data}`));
          return;
        }
        try {
          const tokenData = JSON.parse(data);
          cachedAccessToken = tokenData.access_token;
          tokenExpiresAt = Math.floor(Date.now() / 1000) + (tokenData.expires_in || 2400) - 60;
          console.log('[Revolut] Access token refreshed successfully');
          resolve(tokenData.access_token);
        } catch {
          reject(new Error(`Failed to parse token response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Token refresh request failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

async function makeRevolutRequest<T>(
  endpoint: string,
  method: string = 'GET',
  body?: object
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      const scope = method === 'GET' ? 'READ' : 'PAY';
      const accessToken = await getAccessToken(scope);

      const url = new URL(`${revolutConfig.baseUrl}${endpoint}`);

      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`API Error: ${res.statusCode} - ${data}`));
            return;
          }
          try {
            const responseData = data ? JSON.parse(data) : {};
            resolve(responseData as T);
          } catch {
            reject(new Error(`Failed to parse API response: ${data}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(new Error(`API Request failed: ${err.message}`));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================================================
// ESCROW ROUTES
// ============================================================================

/**
 * POST /api/payment/escrow/create
 * Erstellt einen Escrow-Eintrag in Firestore (Geld wird eingefroren)
 */
router.post('/escrow/create', async (req: Request, res: Response) => {
  try {
    const {
      orderId,
      buyerId,
      providerId,
      amount,
      currency = 'EUR',
      description,
      clearingDays = 14,
    } = req.body;

    // Validierung
    if (!orderId || !buyerId || !providerId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: orderId, buyerId, providerId, amount',
      });
    }

    const now = new Date();
    const clearingEndsAt = new Date(now.getTime() + (clearingDays * 24 * 60 * 60 * 1000));

    // Escrow-Record (wird von Firebase Function erstellt)
    const escrowRecord = {
      id: `escrow_${orderId}_${Date.now()}`,
      orderId,
      buyerId,
      providerId,
      amount: Number(amount),
      currency,
      description: description || `Escrow for order ${orderId}`,
      status: 'held', // held | released | refunded | disputed
      clearingDays,
      clearingEndsAt: clearingEndsAt.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Hier wird der Record an Firebase gesendet
    // In Produktion: Firestore Admin SDK verwenden
    console.log('[Escrow] Created:', escrowRecord);

    res.json({
      success: true,
      escrow: escrowRecord,
    });
  } catch (error) {
    console.error('[Escrow] Create error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create escrow',
    });
  }
});

/**
 * POST /api/payment/escrow/release
 * Gibt Escrow frei und initiiert Auszahlung an Anbieter
 */
router.post('/escrow/release', async (req: Request, res: Response) => {
  try {
    const {
      escrowId,
      orderId,
      providerId,
      amount,
      currency = 'EUR',
      providerIban,
      providerBic,
      providerName,
      reference,
    } = req.body;

    // Validierung
    if (!escrowId || !orderId || !providerId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Wenn IBAN vorhanden, erstelle Auszahlung über Revolut
    if (providerIban) {
      const requestId = `payout_${orderId}_${Date.now()}`;
      
      const paymentRequest: RevolutPaymentRequest = {
        request_id: requestId,
        account_id: process.env.REVOLUT_MAIN_ACCOUNT_ID || '',
        receiver: {
          iban: providerIban,
          bic: providerBic,
          name: providerName || 'Provider',
        },
        amount: Math.round(Number(amount) * 100), // Revolut erwartet Cents
        currency,
        reference: reference || `Taskilo Auszahlung ${orderId}`,
      };

      try {
        const payment = await makeRevolutRequest<RevolutPaymentResponse>(
          '/pay',
          'POST',
          paymentRequest
        );

        console.log('[Escrow] Payout initiated:', payment);

        return res.json({
          success: true,
          escrowId,
          status: 'released',
          payment: {
            id: payment.id,
            state: payment.state,
            amount: amount,
            currency,
          },
        });
      } catch (paymentError) {
        console.error('[Escrow] Revolut payment failed:', paymentError);
        return res.status(500).json({
          success: false,
          error: 'Revolut payment failed',
          details: paymentError instanceof Error ? paymentError.message : 'Unknown error',
        });
      }
    }

    // Kein IBAN - nur Escrow-Status aktualisieren
    res.json({
      success: true,
      escrowId,
      status: 'released',
      message: 'Escrow released, manual payout required (no IBAN provided)',
    });
  } catch (error) {
    console.error('[Escrow] Release error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to release escrow',
    });
  }
});

// ============================================================================
// BATCH PAYOUT ROUTES
// ============================================================================

interface BatchPayoutItem {
  orderId: string;
  providerId: string;
  amount: number;
  currency: string;
  iban: string;
  bic?: string;
  name: string;
  reference?: string;
}

/**
 * POST /api/payment/payout/batch
 * Verarbeitet mehrere Auszahlungen auf einmal
 * Ideal für tägliche Clearing-Freigaben
 */
router.post('/payout/batch', async (req: Request, res: Response) => {
  try {
    const { payouts }: { payouts: BatchPayoutItem[] } = req.body;

    if (!payouts || !Array.isArray(payouts) || payouts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No payouts provided',
      });
    }

    console.log(`[BatchPayout] Processing ${payouts.length} payouts`);

    const results: Array<{
      orderId: string;
      success: boolean;
      paymentId?: string;
      error?: string;
    }> = [];

    for (const payout of payouts) {
      try {
        const requestId = `batch_${payout.orderId}_${Date.now()}`;

        const paymentRequest: RevolutPaymentRequest = {
          request_id: requestId,
          account_id: process.env.REVOLUT_MAIN_ACCOUNT_ID || '',
          receiver: {
            iban: payout.iban,
            bic: payout.bic,
            name: payout.name,
          },
          amount: Math.round(payout.amount * 100),
          currency: payout.currency,
          reference: payout.reference || `Taskilo ${payout.orderId}`,
        };

        const payment = await makeRevolutRequest<RevolutPaymentResponse>(
          '/pay',
          'POST',
          paymentRequest
        );

        results.push({
          orderId: payout.orderId,
          success: true,
          paymentId: payment.id,
        });

        // Rate Limiting: 100ms zwischen Requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.push({
          orderId: payout.orderId,
          success: false,
          error: error instanceof Error ? error.message : 'Payment failed',
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`[BatchPayout] Complete: ${successful} successful, ${failed} failed`);

    res.json({
      success: true,
      summary: {
        total: payouts.length,
        successful,
        failed,
      },
      results,
    });
  } catch (error) {
    console.error('[BatchPayout] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Batch payout failed',
    });
  }
});

// ============================================================================
// REVOLUT ACCOUNT ROUTES
// ============================================================================

/**
 * GET /api/payment/accounts
 * Listet alle Revolut-Konten auf
 */
router.get('/accounts', async (req: Request, res: Response) => {
  try {
    const accounts = await makeRevolutRequest<Array<{
      id: string;
      name: string;
      balance: number;
      currency: string;
      state: string;
    }>>('/accounts');

    res.json({
      success: true,
      accounts,
    });
  } catch (error) {
    console.error('[Revolut] Accounts error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch accounts',
    });
  }
});

/**
 * GET /api/payment/balance
 * Holt den aktuellen Kontostand
 */
router.get('/balance', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string || process.env.REVOLUT_MAIN_ACCOUNT_ID;
    
    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'Account ID required',
      });
    }

    const account = await makeRevolutRequest<{
      id: string;
      name: string;
      balance: number;
      currency: string;
    }>(`/accounts/${accountId}`);

    res.json({
      success: true,
      balance: account.balance / 100, // Revolut gibt Cents zurück
      currency: account.currency,
      accountId: account.id,
    });
  } catch (error) {
    console.error('[Revolut] Balance error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch balance',
    });
  }
});

// ============================================================================
// WEBHOOK ROUTES
// ============================================================================

/**
 * POST /api/payment/webhook/revolut
 * Empfängt Revolut Webhooks für Zahlungsstatusaktualisierungen
 */
router.post('/webhook/revolut', async (req: Request, res: Response) => {
  try {
    const event = req.body;
    
    console.log('[Revolut Webhook] Received:', event.event, event.data?.id);

    switch (event.event) {
      case 'TransactionCreated':
      case 'TransactionStateChanged':
        // Hier: Firestore-Status aktualisieren
        console.log('[Revolut Webhook] Transaction update:', event.data);
        break;
      
      case 'PayoutLinkCreated':
      case 'PayoutLinkStateChanged':
        console.log('[Revolut Webhook] Payout link update:', event.data);
        break;
        
      default:
        console.log('[Revolut Webhook] Unknown event:', event.event);
    }

    // Immer 200 zurückgeben um Retries zu vermeiden
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Revolut Webhook] Error:', error);
    res.status(200).json({ received: true, error: 'Processing error' });
  }
});

/**
 * GET /api/payment/health
 * Health Check für Payment-Service
 */
router.get('/health', (req: Request, res: Response) => {
  const configStatus = {
    clientId: !!revolutConfig.clientId,
    transportCert: revolutConfig.transportCert.length > 100,
    privateKey: revolutConfig.privateKey.length > 100,
    environment: process.env.REVOLUT_ENVIRONMENT || 'sandbox',
  };

  res.json({
    success: true,
    service: 'payment',
    status: 'ok',
    config: configStatus,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/payment/transactions
 * Holt die letzten Transaktionen von Revolut
 * (Wird vom Vercel SEPA-Cron verwendet wegen IP-Whitelisting)
 */
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const accessToken = process.env.REVOLUT_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(500).json({ error: 'No access token configured' });
    }

    // Hole Transaktionen der letzten 7 Tage
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    
    const response = await fetch(
      `${revolutConfig.baseUrl}/transactions?from=${fromDate.toISOString()}&count=100`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[Revolut] Transaction fetch failed:', response.status, error);
      return res.status(response.status).json({ error: 'Revolut API error', details: error });
    }

    const transactions = await response.json() as Array<{ type: string; state: string; reference?: string }>;
    
    // Filtere nur SEPA-Eingänge mit ESC-* Referenz
    const sepaPayments = transactions.filter((tx) => {
      if (tx.type !== 'topup' || tx.state !== 'completed') return false;
      if (!tx.reference) return false;
      return /ESC-\d{8}/i.test(tx.reference);
    });

    res.json({
      success: true,
      total: transactions.length,
      sepaPayments: sepaPayments.length,
      transactions: sepaPayments,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Revolut] Transaction fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transactions',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export { router as paymentRouter };
