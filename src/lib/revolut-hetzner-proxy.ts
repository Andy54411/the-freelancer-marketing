/**
 * Revolut Hetzner Proxy Service
 * 
 * WICHTIG: Alle Revolut API-Aufrufe MUESSEN durch den Hetzner Proxy gehen,
 * da nur die Hetzner-IP (91.99.79.104) in der Revolut IP-Whitelist steht.
 * 
 * Vercel-Server haben keine feste IP und koennen daher nicht direkt
 * mit der Revolut API kommunizieren.
 * 
 * Der Hetzner Server speichert die Tokens und erneuert sie automatisch.
 */

const HETZNER_PROXY_URL = 'https://mail.taskilo.de/webmail-api/api/revolut-proxy';
const HETZNER_API_KEY = process.env.WEBMAIL_API_KEY || '2b5f0cfb074fb7eac0eaa3a7a562ba0a390e2efd0b115d6fa317e932e609e076';

interface ProxyResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  status?: number;
  count?: number;
}

interface AccountData {
  id: string;
  name: string;
  balance: number;
  currency: string;
  state: string;
  created_at: string;
  updated_at: string;
}

interface WebhookData {
  id: string;
  url: string;
  events: string[];
  signing_secret?: string;
}

interface TransactionData {
  id: string;
  type: string;
  state: string;
  amount: number;
  currency: string;
  created_at: string;
}

interface TokenRefreshResponse {
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
}

interface HealthResponse {
  success: boolean;
  status: string;
  clientId: string;
  privateKeyAvailable: boolean;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  tokenExpiresAt: string | null;
  timestamp: string;
}

async function proxyRequest<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'DELETE';
    body?: Record<string, unknown>;
  } = {}
): Promise<ProxyResponse<T>> {
  const { method = 'GET', body } = options;

  try {
    const response = await fetch(`${HETZNER_PROXY_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': HETZNER_API_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Proxy request failed',
        details: data.details,
        status: response.status,
      };
    }

    return {
      success: true,
      data: data.data || data,
      count: data.count,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Proxy connection failed',
    };
  }
}

/**
 * Health Check
 */
export async function getHealthViaProxy(): Promise<ProxyResponse<HealthResponse>> {
  return proxyRequest<HealthResponse>('/health');
}

/**
 * Erneuert den Access Token ueber den Hetzner Proxy
 */
export async function refreshTokenViaProxy(): Promise<TokenRefreshResponse> {
  try {
    const response = await fetch(`${HETZNER_PROXY_URL}/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': HETZNER_API_KEY,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Token refresh failed',
      };
    }

    return {
      success: true,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token refresh failed',
    };
  }
}

/**
 * Authorization Code gegen Token tauschen
 */
export async function exchangeCodeViaProxy(
  code: string,
  redirectUri?: string
): Promise<TokenRefreshResponse> {
  try {
    const response = await fetch(`${HETZNER_PROXY_URL}/token-exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': HETZNER_API_KEY,
      },
      body: JSON.stringify({
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Token exchange failed',
      };
    }

    return {
      success: true,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token exchange failed',
    };
  }
}

/**
 * Holt alle Revolut Konten ueber den Hetzner Proxy
 */
export async function getAccountsViaProxy(): Promise<ProxyResponse<AccountData[]>> {
  return proxyRequest<AccountData[]>('/accounts');
}

/**
 * Holt alle Webhooks ueber den Hetzner Proxy
 */
export async function getWebhooksViaProxy(): Promise<ProxyResponse<WebhookData[]>> {
  return proxyRequest<WebhookData[]>('/webhooks');
}

/**
 * Holt Transaktionen ueber den Hetzner Proxy
 */
export async function getTransactionsViaProxy(params?: {
  from?: string;
  to?: string;
  count?: number;
}): Promise<ProxyResponse<TransactionData[]>> {
  const queryParams = new URLSearchParams();
  if (params?.from) queryParams.append('from', params.from);
  if (params?.to) queryParams.append('to', params.to);
  if (params?.count) queryParams.append('count', String(params.count));

  const endpoint = `/transactions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return proxyRequest<TransactionData[]>(endpoint);
}

/**
 * Holt Counterparties ueber den Hetzner Proxy
 */
export async function getCounterpartiesViaProxy(): Promise<ProxyResponse<Array<{
  id: string;
  name: string;
  type: string;
}>>> {
  return proxyRequest('/counterparties');
}

/**
 * Holt Wechselkurse ueber den Hetzner Proxy
 */
export async function getExchangeRateViaProxy(
  from: string,
  to: string,
  amount: number = 1
): Promise<ProxyResponse<{
  from: { currency: string; amount: number };
  to: { currency: string; amount: number };
  rate: number;
}>> {
  return proxyRequest(`/exchange-rate?from=${from}&to=${to}&amount=${amount}`);
}

/**
 * Holt Team-Mitglieder ueber den Hetzner Proxy
 */
export async function getTeamMembersViaProxy(): Promise<ProxyResponse<Array<{
  id: string;
  email: string;
  role: string;
}>>> {
  return proxyRequest('/team-members');
}

/**
 * Holt Payout Links ueber den Hetzner Proxy
 */
export async function getPayoutLinksViaProxy(): Promise<ProxyResponse<Array<{
  id: string;
  state: string;
  amount: number;
  currency: string;
}>>> {
  return proxyRequest('/payout-links');
}

/**
 * Generische Revolut API Anfrage ueber den Hetzner Proxy
 */
export async function callRevolutApiViaProxy<T = unknown>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'DELETE';
    body?: Record<string, unknown>;
  } = {}
): Promise<ProxyResponse<T>> {
  const { method = 'GET', body } = options;

  try {
    const response = await fetch(`${HETZNER_PROXY_URL}/api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': HETZNER_API_KEY,
      },
      body: JSON.stringify({
        endpoint,
        method,
        body,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'API request failed',
        details: data.details,
        status: response.status,
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'API request failed',
    };
  }
}

/**
 * Registriert einen neuen Webhook ueber den Hetzner Proxy
 */
export async function registerWebhookViaProxy(
  url: string,
  events: string[]
): Promise<ProxyResponse<WebhookData>> {
  return proxyRequest<WebhookData>('/webhooks', {
    method: 'POST',
    body: { url, events },
  });
}

/**
 * Loescht einen Webhook ueber den Hetzner Proxy
 */
export async function deleteWebhookViaProxy(
  webhookId: string
): Promise<ProxyResponse<void>> {
  return proxyRequest<void>(`/webhooks/${webhookId}`, {
    method: 'DELETE',
  });
}

/**
 * Setzt Tokens manuell (fuer Migration)
 */
export async function setTokensViaProxy(tokens: {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}): Promise<ProxyResponse<{ hasAccessToken: boolean; hasRefreshToken: boolean }>> {
  return proxyRequest('/set-tokens', {
    method: 'POST',
    body: tokens,
  });
}

export const revolutHetznerProxy = {
  getHealth: getHealthViaProxy,
  refreshToken: refreshTokenViaProxy,
  exchangeCode: exchangeCodeViaProxy,
  getAccounts: getAccountsViaProxy,
  getWebhooks: getWebhooksViaProxy,
  getTransactions: getTransactionsViaProxy,
  getCounterparties: getCounterpartiesViaProxy,
  getExchangeRate: getExchangeRateViaProxy,
  getTeamMembers: getTeamMembersViaProxy,
  getPayoutLinks: getPayoutLinksViaProxy,
  callApi: callRevolutApiViaProxy,
  registerWebhook: registerWebhookViaProxy,
  deleteWebhook: deleteWebhookViaProxy,
  setTokens: setTokensViaProxy,
};

export default revolutHetznerProxy;
