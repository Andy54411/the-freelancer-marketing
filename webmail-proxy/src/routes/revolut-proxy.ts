/**
 * Revolut Business API - Kompletter Service auf Hetzner
 * 
 * ALLE Revolut API-Aufrufe laufen über diesen Server (91.99.79.104),
 * da die IP-Whitelist nur diese IP erlaubt.
 * 
 * Vercel leitet alle Revolut-Anfragen hierher weiter.
 * 
 * Endpunkte:
 * - GET  /health - Health Check
 * - POST /refresh-token - Token erneuern (mit stored refresh_token)
 * - POST /token-exchange - Authorization Code gegen Token tauschen
 * - GET  /accounts - Alle Konten
 * - GET  /transactions - Transaktionen
 * - GET  /webhooks - Alle Webhooks
 * - POST /webhooks - Neuen Webhook registrieren
 * - DELETE /webhooks/:id - Webhook loeschen
 * - GET  /counterparties - Alle Counterparties
 * - GET  /exchange-rate - Wechselkurse
 * - GET  /team-members - Team Mitglieder
 * - GET  /payout-links - Payout Links
 * - POST /api - Generischer API Proxy
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const router = Router();

// Revolut API Konfiguration
const REVOLUT_BASE_URL = 'https://b2b.revolut.com/api';
const REVOLUT_MERCHANT_URL = 'https://merchant.revolut.com/api';
const REVOLUT_CLIENT_ID = process.env.REVOLUT_CLIENT_ID || 'tIWziunOHZ6vbF4ygxxAT43mrVe4Fh-c7FIdM78TSmU';
const REVOLUT_MERCHANT_API_KEY = process.env.REVOLUT_MERCHANT_API_KEY || '';
const REVOLUT_MERCHANT_PUBLIC_KEY = process.env.REVOLUT_MERCHANT_PUBLIC_KEY || '';

// Token Storage Pfad (persistent) - gemountet als Docker Volume
const TOKEN_STORAGE_PATH = process.env.TOKEN_STORAGE_PATH || '/opt/taskilo/webmail-proxy/data/revolut-tokens.json';

// Token Storage (in-memory, wird durch .env oder gespeicherte Datei initialisiert)
let storedAccessToken = process.env.REVOLUT_ACCESS_TOKEN || '';
let storedRefreshToken = process.env.REVOLUT_REFRESH_TOKEN || '';
let tokenExpiresAt: Date | null = null;

// Tokens aus persistenter Datei laden
function loadStoredTokens(): void {
  try {
    if (fs.existsSync(TOKEN_STORAGE_PATH)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_STORAGE_PATH, 'utf8'));
      if (data.accessToken) storedAccessToken = data.accessToken;
      if (data.refreshToken) storedRefreshToken = data.refreshToken;
      if (data.expiresAt) tokenExpiresAt = new Date(data.expiresAt);
      console.log('[Revolut] Tokens loaded from persistent storage');
    }
  } catch (error) {
    console.error('[Revolut] Failed to load tokens from storage:', error);
  }
}

// Tokens persistent speichern
function saveTokens(): void {
  try {
    const dir = path.dirname(TOKEN_STORAGE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = {
      accessToken: storedAccessToken,
      refreshToken: storedRefreshToken,
      expiresAt: tokenExpiresAt?.toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(TOKEN_STORAGE_PATH, JSON.stringify(data, null, 2));
    console.log('[Revolut] Tokens saved to persistent storage');
  } catch (error) {
    console.error('[Revolut] Failed to save tokens:', error);
  }
}

// Beim Start Tokens laden
loadStoredTokens();

/**
 * GET /auth-url
 * Generiert die Authorization URL für den Revolut OAuth Flow
 */
router.get('/auth-url', (_req: Request, res: Response) => {
  const redirectUri = 'https://taskilo.de/api/revolut/oauth/callback';
  const state = `taskilo_${Date.now()}`;
  
  const authUrl = `https://business.revolut.com/app-confirm?client_id=${REVOLUT_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
  
  res.json({
    success: true,
    authUrl,
    instructions: 'Öffne diese URL im Browser und autorisiere die App. Nach der Autorisierung wirst du zu taskilo.de/api/revolut/oauth/callback weitergeleitet.',
    redirectUri,
    state,
  });
});

// Private Key laden
function getPrivateKey(): string {
  const keyPath = process.env.REVOLUT_PRIVATE_KEY_PATH || '/opt/taskilo/certs/revolut/private.key';
  
  // Zuerst Environment Variable pruefen
  if (process.env.REVOLUT_PRIVATE_KEY) {
    return process.env.REVOLUT_PRIVATE_KEY.replace(/\\n/g, '\n');
  }
  
  // Dann Datei lesen
  try {
    return fs.readFileSync(keyPath, 'utf8');
  } catch {
    console.error('[Revolut] Private key not found at:', keyPath);
    throw new Error('Revolut private key not found');
  }
}

// JWT Client Assertion erstellen
function createClientAssertion(): string {
  const privateKey = getPrivateKey();
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    iss: 'taskilo.de',
    sub: REVOLUT_CLIENT_ID,
    aud: 'https://revolut.com',
    iat: now,
    exp: now + 300,
  };
  
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    header: {
      alg: 'RS256',
      typ: 'JWT',
    },
  });
}

// Access Token holen (mit Auto-Refresh wenn noetig)
async function getAccessToken(): Promise<string> {
  // Pruefen ob Token noch gueltig
  if (storedAccessToken && tokenExpiresAt && new Date() < tokenExpiresAt) {
    return storedAccessToken;
  }
  
  // Token erneuern wenn Refresh Token vorhanden
  if (storedRefreshToken) {
    console.log('[Revolut] Token expired, refreshing...');
    const result = await refreshToken(storedRefreshToken);
    if (result.success && result.access_token) {
      return result.access_token;
    }
  }
  
  // Fallback auf gespeicherten Token
  if (storedAccessToken) {
    return storedAccessToken;
  }
  
  throw new Error('Kein Access Token verfuegbar');
}

// Token Refresh Funktion
async function refreshToken(refreshTokenToUse: string): Promise<{
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
}> {
  try {
    const clientAssertion = createClientAssertion();
    
    const formData = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshTokenToUse,
      client_id: REVOLUT_CLIENT_ID,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: clientAssertion,
    });
    
    const response = await fetch(`${REVOLUT_BASE_URL}/1.0/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData.toString(),
    });
    
    const data = await response.json() as {
      access_token?: string;
      token_type?: string;
      expires_in?: number;
      refresh_token?: string;
      error?: string;
    };
    
    if (!response.ok) {
      console.error('[Revolut] Token refresh failed:', data);
      return { success: false, error: data.error || 'Token refresh failed' };
    }
    
    // Token in-memory speichern
    if (data.access_token) {
      storedAccessToken = data.access_token;
      tokenExpiresAt = new Date(Date.now() + ((data.expires_in || 2400) - 300) * 1000);
      console.log('[Revolut] Token refreshed, expires at:', tokenExpiresAt.toISOString());
    }
    if (data.refresh_token) {
      storedRefreshToken = data.refresh_token;
      console.log('[Revolut] New refresh token received');
    }
    
    // WICHTIG: Tokens persistent speichern damit sie Container-Neustarts ueberleben
    saveTokens();
    
    return {
      success: true,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * POST /refresh-token
 * Erneuert den Access Token mit dem gespeicherten Refresh Token
 */
router.post('/refresh-token', async (_req: Request, res: Response) => {
  try {
    // Verwende gespeicherten Refresh Token
    const refreshTokenToUse = storedRefreshToken;
    
    if (!refreshTokenToUse) {
      return res.status(400).json({
        success: false,
        error: 'Kein Refresh Token verfuegbar',
      });
    }
    
    const result = await refreshToken(refreshTokenToUse);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    console.log('[Revolut] Token refreshed successfully');
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Revolut] Error:', message);
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /token-exchange
 * Tauscht Authorization Code gegen Access Token
 */
router.post('/token-exchange', async (req: Request, res: Response) => {
  try {
    const { code, redirect_uri } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'code ist erforderlich',
      });
    }
    
    const clientAssertion = createClientAssertion();
    
    const formData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: REVOLUT_CLIENT_ID,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: clientAssertion,
    });
    
    if (redirect_uri) {
      formData.append('redirect_uri', redirect_uri);
    }
    
    const response = await fetch(`${REVOLUT_BASE_URL}/1.0/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData.toString(),
    });
    
    const data = await response.json() as {
      access_token?: string;
      token_type?: string;
      expires_in?: number;
      refresh_token?: string;
      error?: string;
    };
    
    if (!response.ok) {
      console.error('[Revolut] Token exchange failed:', data);
      return res.status(response.status).json({
        success: false,
        error: 'Token exchange failed',
        details: data,
      });
    }
    
    // Token speichern
    if (data.access_token) {
      storedAccessToken = data.access_token;
      tokenExpiresAt = new Date(Date.now() + ((data.expires_in || 2400) - 300) * 1000);
    }
    if (data.refresh_token) {
      storedRefreshToken = data.refresh_token;
    }
    
    // WICHTIG: Tokens persistent speichern
    saveTokens();
    
    console.log('[Revolut] Token exchange successful, tokens persisted');
    return res.json({
      success: true,
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      refresh_token: data.refresh_token,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Revolut] Error:', message);
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /merchant/orders
 * Erstelle eine Payment Order ueber die Revolut Merchant API
 * Verwendet API-Key statt OAuth
 */
router.post('/merchant/orders', async (req: Request, res: Response) => {
  try {
    const { amount, currency, description, merchant_order_ext_ref, customer_email, redirect_url, cancel_url } = req.body;
    
    if (!amount || !currency) {
      return res.status(400).json({
        success: false,
        error: 'amount und currency sind erforderlich',
      });
    }
    
    if (!REVOLUT_MERCHANT_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Revolut Merchant API Key nicht konfiguriert',
      });
    }
    
    // Betrag in Minor Units (Cent) umrechnen - Revolut erwartet kleinste Waehrungseinheit
    const amountInMinorUnits = Math.round(amount);
    
    const orderData = {
      amount: amountInMinorUnits,
      currency: currency.toUpperCase(),
      description: description || 'Taskilo Speicher-Upgrade',
      merchant_order_ext_ref: merchant_order_ext_ref || `order-${Date.now()}`,
      customer_email: customer_email,
      redirect_url: redirect_url,
      cancel_url: cancel_url,
    };
    
    console.log('[Revolut Merchant] Creating order:', orderData);
    
    const response = await fetch(`${REVOLUT_MERCHANT_URL}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REVOLUT_MERCHANT_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Revolut-Api-Version': '2024-09-01',
      },
      body: JSON.stringify(orderData),
    });
    
    const data = await response.json() as { id?: string; checkout_url?: string };
    
    if (!response.ok) {
      console.error('[Revolut Merchant] Order creation failed:', data);
      return res.status(response.status).json({
        success: false,
        error: 'Order creation failed',
        details: data,
      });
    }
    
    console.log('[Revolut Merchant] Order created:', data.id);
    
    return res.json({
      success: true,
      data: data,
      orderId: data.id,
      checkoutUrl: data.checkout_url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Revolut Merchant] Error:', message);
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /merchant/orders/:orderId
 * Hole Order-Status ueber die Revolut Merchant API
 */
router.get('/merchant/orders/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    
    if (!REVOLUT_MERCHANT_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Revolut Merchant API Key nicht konfiguriert',
      });
    }
    
    const response = await fetch(`${REVOLUT_MERCHANT_URL}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${REVOLUT_MERCHANT_API_KEY}`,
        'Accept': 'application/json',
        'Revolut-Api-Version': '2024-09-01',
      },
    });
    
    const data = await response.json() as { state?: string };
    
    if (!response.ok) {
      console.error('[Revolut Merchant] Get order failed:', data);
      return res.status(response.status).json({
        success: false,
        error: 'Get order failed',
        details: data,
      });
    }
    
    return res.json({
      success: true,
      data: data,
      state: data.state,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Revolut Merchant] Error:', message);
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api
 * Generischer Proxy fuer alle Revolut API-Aufrufe
 */
router.post('/api', async (req: Request, res: Response) => {
  try {
    const { method, endpoint, body } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({
        success: false,
        error: 'endpoint ist erforderlich',
      });
    }
    
    // Token automatisch holen
    const accessToken = await getAccessToken();
    
    const url = `${REVOLUT_BASE_URL}${endpoint}`;
    const httpMethod = (method || 'GET').toUpperCase();
    
    const fetchOptions: RequestInit = {
      method: httpMethod,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };
    
    if (body && ['POST', 'PUT', 'PATCH'].includes(httpMethod)) {
      fetchOptions.body = JSON.stringify(body);
    }
    
    console.log(`[Revolut] ${httpMethod} ${endpoint}`);
    
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('[Revolut] API call failed:', data);
      return res.status(response.status).json({
        success: false,
        error: 'API call failed',
        details: data,
      });
    }
    
    return res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Revolut] Error:', message);
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /accounts
 * Hole alle Konten
 */
router.get('/accounts', async (_req: Request, res: Response) => {
  try {
    const accessToken = await getAccessToken();
    
    const response = await fetch(`${REVOLUT_BASE_URL}/1.0/accounts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: 'Accounts fetch failed',
        details: data,
      });
    }
    
    return res.json({
      success: true,
      data: data,
      count: Array.isArray(data) ? data.length : 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Revolut] Error:', message);
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /webhooks
 * Liste alle Webhooks
 */
router.get('/webhooks', async (_req: Request, res: Response) => {
  try {
    const accessToken = await getAccessToken();
    
    // Webhooks API v2.0
    const response = await fetch(`${REVOLUT_BASE_URL}/2.0/webhooks`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: 'Webhooks fetch failed',
        details: data,
      });
    }
    
    return res.json({
      success: true,
      data: data,
      count: Array.isArray(data) ? data.length : 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Revolut] Error:', message);
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /webhooks
 * Neuen Webhook registrieren
 */
router.post('/webhooks', async (req: Request, res: Response) => {
  try {
    const accessToken = await getAccessToken();
    const { url, events } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'url ist erforderlich',
      });
    }
    
    const response = await fetch(`${REVOLUT_BASE_URL}/2.0/webhooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        url,
        events: events || ['TransactionCreated', 'TransactionStateChanged'],
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: 'Webhook registration failed',
        details: data,
      });
    }
    
    return res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Revolut] Error:', message);
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * DELETE /webhooks/:id
 * Webhook loeschen
 */
router.delete('/webhooks/:id', async (req: Request, res: Response) => {
  try {
    const accessToken = await getAccessToken();
    const { id } = req.params;
    
    const response = await fetch(`${REVOLUT_BASE_URL}/2.0/webhooks/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const data = await response.json();
      return res.status(response.status).json({
        success: false,
        error: 'Webhook deletion failed',
        details: data,
      });
    }
    
    return res.json({
      success: true,
      message: `Webhook ${id} geloescht`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Revolut] Error:', message);
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /transactions
 * Hole Transaktionen
 */
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const accessToken = await getAccessToken();
    const count = req.query.count || '50';
    const from = req.query.from || '';
    const to = req.query.to || '';
    
    let url = `${REVOLUT_BASE_URL}/1.0/transactions?count=${count}`;
    if (from) url += `&from=${from}`;
    if (to) url += `&to=${to}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: 'Transactions fetch failed',
        details: data,
      });
    }
    
    return res.json({
      success: true,
      data: data,
      count: Array.isArray(data) ? data.length : 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Revolut] Error:', message);
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /counterparties
 * Hole alle Counterparties
 */
router.get('/counterparties', async (_req: Request, res: Response) => {
  try {
    const accessToken = await getAccessToken();
    
    const response = await fetch(`${REVOLUT_BASE_URL}/1.0/counterparties`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: 'Counterparties fetch failed',
        details: data,
      });
    }
    
    return res.json({
      success: true,
      data: data,
      count: Array.isArray(data) ? data.length : 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Revolut] Error:', message);
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /exchange-rate
 * Hole Wechselkurse
 */
router.get('/exchange-rate', async (req: Request, res: Response) => {
  try {
    const accessToken = await getAccessToken();
    const from = req.query.from || 'EUR';
    const to = req.query.to || 'USD';
    const amount = req.query.amount || '1';
    
    const response = await fetch(
      `${REVOLUT_BASE_URL}/1.0/rate?from=${from}&to=${to}&amount=${amount}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: 'Exchange rate fetch failed',
        details: data,
      });
    }
    
    return res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Revolut] Error:', message);
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /team-members
 * Hole Team-Mitglieder
 */
router.get('/team-members', async (_req: Request, res: Response) => {
  try {
    const accessToken = await getAccessToken();
    
    const response = await fetch(`${REVOLUT_BASE_URL}/1.0/team-members`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: 'Team members fetch failed',
        details: data,
      });
    }
    
    return res.json({
      success: true,
      data: data,
      count: Array.isArray(data) ? data.length : 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Revolut] Error:', message);
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /payout-links
 * Hole Payout Links
 */
router.get('/payout-links', async (_req: Request, res: Response) => {
  try {
    const accessToken = await getAccessToken();
    
    const response = await fetch(`${REVOLUT_BASE_URL}/1.0/payout-links`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: 'Payout links fetch failed',
        details: data,
      });
    }
    
    return res.json({
      success: true,
      data: data,
      count: Array.isArray(data) ? data.length : 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Revolut] Error:', message);
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /health
 * Health Check
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    // Pruefen ob Private Key vorhanden ist
    getPrivateKey();
    
    // Token-Status berechnen
    const now = new Date();
    const tokenExpired = tokenExpiresAt ? now > tokenExpiresAt : true;
    const tokenExpiresInMinutes = tokenExpiresAt 
      ? Math.round((tokenExpiresAt.getTime() - now.getTime()) / 60000) 
      : 0;
    
    return res.json({
      success: true,
      status: 'healthy',
      clientId: REVOLUT_CLIENT_ID,
      privateKeyAvailable: true,
      hasAccessToken: !!storedAccessToken,
      hasRefreshToken: !!storedRefreshToken,
      tokenExpiresAt: tokenExpiresAt?.toISOString() || null,
      tokenExpired,
      tokenExpiresInMinutes,
      tokenStoragePath: TOKEN_STORAGE_PATH,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.json({
      success: false,
      status: 'unhealthy',
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /set-tokens
 * Setze Tokens manuell (fuer Migration oder Notfall)
 */
router.post('/set-tokens', async (req: Request, res: Response) => {
  try {
    const { access_token, refresh_token, expires_in } = req.body;
    
    if (access_token) {
      storedAccessToken = access_token;
      tokenExpiresAt = new Date(Date.now() + ((expires_in || 2400) - 300) * 1000);
    }
    if (refresh_token) {
      storedRefreshToken = refresh_token;
    }
    
    // Tokens persistent speichern
    saveTokens();
    
    return res.json({
      success: true,
      message: 'Tokens aktualisiert und persistent gespeichert',
      hasAccessToken: !!storedAccessToken,
      hasRefreshToken: !!storedRefreshToken,
      tokenExpiresAt: tokenExpiresAt?.toISOString() || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

// Force Token Refresh (fuer Retry nach 401)
async function forceRefreshToken(): Promise<string> {
  console.log('[Revolut] Force refreshing token...');
  if (!storedRefreshToken) {
    throw new Error('Kein Refresh Token verfuegbar');
  }
  const result = await refreshToken(storedRefreshToken);
  if (result.success && result.access_token) {
    return result.access_token;
  }
  throw new Error(result.error || 'Token refresh failed');
}

export { router as revolutProxyRouter, getAccessToken, forceRefreshToken };
