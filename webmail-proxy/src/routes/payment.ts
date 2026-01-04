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
import { getAccessToken as getRevolutToken, forceRefreshToken } from './revolut-proxy';

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

async function makeRevolutRequest<T>(
  endpoint: string,
  method: string = 'GET',
  body?: object,
  isRetry: boolean = false
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      // Token vom zentralen revolut-proxy holen (nicht lokaler Cache)
      const accessToken = await getRevolutToken();
      console.log(`[Payment] Using token from revolut-proxy: ${accessToken?.substring(0, 20)}...`);

      const url = new URL(`${revolutConfig.baseUrl}${endpoint}`);
      console.log(`[Payment] Making request to: ${method} ${url.pathname}`);

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
        res.on('end', async () => {
          // Bei 401: Token refreshen und einmal retry
          if (res.statusCode === 401 && !isRetry) {
            console.log('[Payment] Got 401, refreshing token and retrying...');
            try {
              await forceRefreshToken();
              const result = await makeRevolutRequest<T>(endpoint, method, body, true);
              resolve(result);
              return;
            } catch (retryError) {
              reject(new Error(`Retry after 401 failed: ${retryError}`));
              return;
            }
          }
          
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
// COUNTERPARTY HELPERS
// ============================================================================

interface CounterpartyAccount {
  id: string;
  iban?: string;
  name: string;
  currency: string;
}

interface Counterparty {
  id: string;
  name: string;
  state: string;
  accounts: CounterpartyAccount[];
}

// Cache für eigene Revolut-IBANs (einmal laden, dann cachen)
let ownRevolutIbans: string[] | null = null;

/**
 * Lädt alle eigenen Revolut-IBANs aus den Konten
 */
async function getOwnRevolutIbans(): Promise<string[]> {
  if (ownRevolutIbans !== null) {
    return ownRevolutIbans;
  }
  
  try {
    // Hole alle eigenen Konten
    const accounts = await makeRevolutRequest<Array<{
      id: string;
      currency: string;
      state: string;
    }>>('/accounts', 'GET');
    
    const ibans: string[] = [];
    
    // Für jedes EUR-Konto die Bank-Details holen
    for (const account of accounts) {
      if (account.currency === 'EUR' && account.state === 'active') {
        try {
          const bankDetails = await makeRevolutRequest<Array<{
            iban?: string;
          }>>(`/accounts/${account.id}/bank-details`, 'GET');
          
          for (const detail of bankDetails) {
            if (detail.iban) {
              ibans.push(detail.iban.replace(/\s/g, '').toUpperCase());
            }
          }
        } catch (detailError) {
          console.log(`[Payment] Could not fetch bank details for account ${account.id}:`, detailError);
        }
      }
    }
    
    ownRevolutIbans = ibans;
    console.log(`[Payment] Loaded ${ibans.length} own Revolut IBANs:`, ibans);
    return ibans;
  } catch (error) {
    console.error('[Payment] Failed to load own Revolut IBANs:', error);
    return [];
  }
}

/**
 * Prüft ob eine IBAN zu einem eigenen Revolut-Konto gehört
 */
async function isOwnRevolutIban(iban: string): Promise<boolean> {
  const ownIbans = await getOwnRevolutIbans();
  const normalizedIban = iban.replace(/\s/g, '').toUpperCase();
  return ownIbans.includes(normalizedIban);
}

/**
 * Findet einen existierenden Counterparty anhand der IBAN oder erstellt einen neuen
 */
async function findOrCreateCounterparty(iban: string, bic: string | undefined, name: string): Promise<string> {
  // WICHTIG: Prüfe ob die IBAN zu einem eigenen Revolut-Konto gehört
  const isOwn = await isOwnRevolutIban(iban);
  if (isOwn) {
    throw new Error(`EIGENE_REVOLUT_IBAN: Die hinterlegte IBAN (${iban}) gehört zu Ihrem eigenen Revolut-Konto. Bitte hinterlegen Sie eine externe Bankverbindung für Auszahlungen.`);
  }
  
  // Erst alle Counterparties holen und nach IBAN suchen
  try {
    const counterparties = await makeRevolutRequest<Counterparty[]>('/counterparties', 'GET');
    
    // Suche nach existierendem Counterparty mit dieser IBAN
    for (const cp of counterparties) {
      for (const account of cp.accounts) {
        if (account.iban && account.iban.replace(/\s/g, '').toUpperCase() === iban.replace(/\s/g, '').toUpperCase()) {
          console.log(`[Payment] Found existing counterparty: ${cp.id} (${cp.name})`);
          return cp.id;
        }
      }
    }
  } catch (error) {
    console.log('[Payment] Could not fetch counterparties, will create new one:', error);
  }

  // Kein existierender Counterparty gefunden - neuen erstellen
  console.log(`[Payment] Creating new counterparty for ${name} (${iban})`);
  
  interface CreateCounterpartyRequest {
    name: string;
    profile_type: string;
    individual_name?: { first_name: string; last_name: string };
    company_name?: string;
    bank_country: string;
    currency: string;
    iban: string;
    bic?: string;
  }
  
  const createRequest: CreateCounterpartyRequest = {
    name: name,
    profile_type: 'personal', // Kann auch 'business' sein
    bank_country: iban.substring(0, 2), // Erste 2 Zeichen = Ländercode
    currency: 'EUR',
    iban: iban.replace(/\s/g, ''),
  };
  
  // Name aufteilen wenn möglich
  const nameParts = name.trim().split(' ');
  if (nameParts.length >= 2) {
    createRequest.individual_name = {
      first_name: nameParts[0],
      last_name: nameParts.slice(1).join(' '),
    };
  } else {
    createRequest.company_name = name;
    createRequest.profile_type = 'business';
  }
  
  // BIC nur hinzufügen wenn gültig (8 oder 11 alphanumerische Zeichen)
  if (bic && /^[A-Z0-9]{8}([A-Z0-9]{3})?$/i.test(bic)) {
    createRequest.bic = bic.toUpperCase();
  }

  const newCounterparty = await makeRevolutRequest<Counterparty>('/counterparty', 'POST', createRequest);
  console.log(`[Payment] Created new counterparty: ${newCounterparty.id}`);
  
  return newCounterparty.id;
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
      // Erst Counterparty finden oder erstellen
      const counterpartyId = await findOrCreateCounterparty(
        providerIban,
        providerBic,
        providerName || 'Provider'
      );

      const requestId = `payout_${orderId}_${Date.now()}`;
      
      // Payment mit counterparty_id statt IBAN
      const paymentRequest: RevolutPaymentRequest = {
        request_id: requestId,
        account_id: process.env.REVOLUT_MAIN_ACCOUNT_ID || '',
        receiver: {
          counterparty_id: counterpartyId,
        },
        amount: Number(amount), // Revolut erwartet EUR (nicht Cents!)
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
        // Erst Counterparty finden oder erstellen
        const counterpartyId = await findOrCreateCounterparty(
          payout.iban,
          payout.bic,
          payout.name
        );

        const requestId = `batch_${payout.orderId}_${Date.now()}`;

        // Payment mit counterparty_id statt IBAN
        const paymentRequest: RevolutPaymentRequest = {
          request_id: requestId,
          account_id: process.env.REVOLUT_MAIN_ACCOUNT_ID || '',
          receiver: {
            counterparty_id: counterpartyId,
          },
          amount: payout.amount, // Revolut erwartet EUR (nicht Cents!)
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

/**
 * POST /api/payment/payout/single
 * Einzelne Auszahlung - primär für Micro-Deposit Bankverifizierung
 * Sendet 0,01 EUR mit Verifizierungscode im Verwendungszweck
 */
router.post('/payout/single', async (req: Request, res: Response) => {
  try {
    const { 
      amount, 
      currency = 'EUR', 
      iban, 
      bic, 
      name, 
      reference,
      metadata 
    } = req.body;

    // Validierung
    if (!iban || !name) {
      return res.status(400).json({
        success: false,
        error: 'IBAN und Name sind erforderlich',
      });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Ungültiger Betrag',
      });
    }

    // Für Micro-Deposits: Max 0,10 EUR als Sicherheit
    if (metadata?.type === 'bank_verification' && amount > 0.10) {
      return res.status(400).json({
        success: false,
        error: 'Verifizierungs-Überweisungen dürfen max. 0,10 EUR betragen',
      });
    }

    console.log(`[SinglePayout] Processing: ${amount} ${currency} to ${iban.slice(0, 8)}...`);

    // Counterparty finden oder erstellen
    const counterpartyId = await findOrCreateCounterparty(iban, bic, name);

    const requestId = `single_${metadata?.verificationId || Date.now()}_${Date.now()}`;

    // Payment erstellen
    const paymentRequest: RevolutPaymentRequest = {
      request_id: requestId,
      account_id: process.env.REVOLUT_MAIN_ACCOUNT_ID || '',
      receiver: {
        counterparty_id: counterpartyId,
      },
      amount: amount, // EUR (nicht Cents)
      currency: currency,
      reference: reference || 'Taskilo Payment',
    };

    const payment = await makeRevolutRequest<RevolutPaymentResponse>(
      '/pay',
      'POST',
      paymentRequest
    );

    console.log(`[SinglePayout] Success: ${payment.id}`);

    res.json({
      success: true,
      paymentId: payment.id,
      state: payment.state,
      amount: payment.amount,
      currency: payment.currency,
      reference: payment.reference,
    });

  } catch (error) {
    console.error('[SinglePayout] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Payment failed';
    
    res.status(500).json({
      success: false,
      error: errorMessage,
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
