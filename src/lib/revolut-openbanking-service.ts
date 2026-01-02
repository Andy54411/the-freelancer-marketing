// Revolut Open Banking Service
// https://developer.revolut.com/docs/open-banking/open-banking-api

import fs from 'fs';
import https from 'https';
import jwt from 'jsonwebtoken';

// Revolut API Response Types
interface RevolutAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;
  state: string;
  public: boolean;
  created_at: string;
  updated_at: string;
}

interface RevolutTransaction {
  id: string;
  type: string;
  state: string;
  created_at: string;
  completed_at?: string;
  reference?: string;
  amount: number;
  currency: string;
  description?: string;
}

// RevolutTokenResponse is used in refreshToken method return type
type _RevolutTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
};

export class RevolutOpenBankingService {
  private baseUrl: string;
  private authUrl: string;
  private clientId: string;
  private transportCert: string;
  private privateKey: string;

  constructor() {
    this.baseUrl =
      process.env.REVOLUT_ENVIRONMENT === 'production'
        ? 'https://b2b.revolut.com/api/1.0'
        : 'https://sandbox-b2b.revolut.com/api/1.0';

    this.authUrl =
      process.env.REVOLUT_ENVIRONMENT === 'production'
        ? 'https://business.revolut.com'
        : 'https://sandbox-business.revolut.com';

    this.clientId = process.env.REVOLUT_CLIENT_ID!;

    // Load certificates - prefer environment variables over files (for Vercel deployment)
    if (process.env.REVOLUT_TRANSPORT_CERT && process.env.REVOLUT_PRIVATE_KEY) {
      // Use certificates from environment variables (Vercel deployment)
      this.transportCert = process.env.REVOLUT_TRANSPORT_CERT;
      this.privateKey = process.env.REVOLUT_PRIVATE_KEY;
    } else {
      // Fallback to file system (local development)
      const basePath = process.cwd();
      const transportCertPath =
        process.env.REVOLUT_TRANSPORT_CERT_PATH || `${basePath}/certs/revolut/transport.pem`;
      const privateKeyPath = process.env.REVOLUT_PRIVATE_KEY_PATH || `${basePath}/certs/revolut/private.key`;

      try {
        if (fs.existsSync(transportCertPath) && fs.existsSync(privateKeyPath)) {
          this.transportCert = fs.readFileSync(transportCertPath, 'utf8');
          this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
        } else {
          console.error('[Revolut] Certificate files not found:', { transportCertPath, privateKeyPath });
          this.transportCert = 'placeholder-cert';
          this.privateKey = 'placeholder-key';
        }
      } catch (err) {
        console.error('[Revolut] Error loading certificates:', err);
        this.transportCert = 'placeholder-cert';
        this.privateKey = 'placeholder-key';
      }
    }
  }

  /**
   * Get access token using JWT-based authentication
   * https://developer.revolut.com/docs/business/business-api#authentication
   */
  async getAccessToken(scope: string = 'READ'): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create JWT for authentication
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: this.clientId, // Client ID als Issuer
        sub: this.clientId, // Client ID als Subject
        aud: 'https://revolut.com', // Standard Audience
        iat: now,
        exp: now + 300, // 5 minutes from now
        scope: scope,
      };

      let token;
      try {
        token = jwt.sign(payload, this.privateKey, {
          algorithm: 'RS256',
          header: {
            alg: 'RS256',
            kid: this.clientId, // Use client ID as key ID
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        reject(new Error(`JWT signing failed: ${message}`));
        return;
      }

      const postData = new URLSearchParams({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: token,
        scope: scope,
      }).toString();

      const url = new URL(`${this.authUrl}/oauth/token`);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
        },
        // Note: No mTLS needed for JWT-based auth
      };

      const req = https.request(options, res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`Revolut Auth Error: ${res.statusCode} - ${data}`));
            return;
          }

          try {
            const tokenData = JSON.parse(data);

            resolve(tokenData.access_token);
          } catch {
            reject(new Error(`Failed to parse token response: ${data}`));
          }
        });
      });

      req.on('error', error => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Make authenticated API request with access token
   */
  private async makeAuthenticatedRequest<T = unknown>(
    endpoint: string,
    accessToken: string,
    method: string = 'GET'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.baseUrl}${endpoint}`);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        // No mTLS needed for JWT-based auth
      };

      const req = https.request(options, res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`API Error: ${res.statusCode} - ${data}`));
            return;
          }

          try {
            const responseData = JSON.parse(data);
            resolve(responseData);
          } catch {
            reject(new Error(`Failed to parse API response: ${data}`));
          }
        });
      });

      req.on('error', err => {
        reject(new Error(`API Request failed: ${err.message}`));
      });

      req.end();
    });
  }

  /**
   * Get account information
   * https://developer.revolut.com/docs/business/business-api#accounts
   */
  async getAccounts(): Promise<RevolutAccount[]> {
    const accessToken = await this.getAccessToken('READ');
    return this.makeAuthenticatedRequest<RevolutAccount[]>('/1.0/accounts', accessToken);
  }

  /**
   * Get account balance (Business API uses the account details endpoint)
   */
  async getAccountBalance(accountId: string): Promise<RevolutAccount> {
    const accessToken = await this.getAccessToken('READ');
    return this.makeAuthenticatedRequest<RevolutAccount>(`/1.0/accounts/${accountId}`, accessToken);
  }

  /**
   * Get account transactions
   */
  async getAccountTransactions(
    accountId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<RevolutTransaction[]> {
    const accessToken = await this.getAccessToken('READ');

    let endpoint = `/1.0/transactions`;
    const params = new URLSearchParams();

    if (accountId) params.append('from', accountId);
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    return this.makeAuthenticatedRequest<RevolutTransaction[]>(endpoint, accessToken);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
  }> {
    // Create HTTPS agent with client certificates
    const httpsAgent = new https.Agent({
      cert: this.transportCert,
      key: this.privateKey,
      rejectUnauthorized: false, // For sandbox testing
    });

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId,
    });

    const response = await fetch(`${this.baseUrl}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
      // @ts-expect-error - Node.js specific agent option
      agent: httpsAgent,
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(`Failed to refresh token: ${response.status} - ${errorText}`);
    }

    const tokenData = await response.json();

    return tokenData;
  }

  /**
   * Test connection - get all accounts and basic info
   */
  async testConnection(): Promise<{
    accounts: RevolutAccount[];
    totalAccounts: number;
    environment: string;
  }> {
    const accounts = await this.getAccounts();

    return {
      accounts,
      totalAccounts: accounts.length,
      environment: process.env.REVOLUT_ENVIRONMENT || 'sandbox',
    };
  }
}

export const revolutOpenBankingService = new RevolutOpenBankingService();

/**
 * Helper function to get access token for Business API
 * Used by webhook management and other Business API calls
 */
export async function getRevolutBusinessAccessToken(): Promise<string | null> {
  const service = new RevolutOpenBankingService();
  const token = await service.getAccessToken('READ');
  return token;
}
