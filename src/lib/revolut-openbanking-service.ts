// Revolut Open Banking API Service
// https://developer.revolut.com/docs/open-banking/open-banking-api

import fs from 'fs';
import https from 'https';

export class RevolutOpenBankingService {
  private baseUrl: string;
  private authUrl: string;
  private clientId: string;
  private transportCert: string;
  private privateKey: string;

  constructor() {
    this.baseUrl =
      process.env.REVOLUT_ENVIRONMENT === 'production'
        ? 'https://oba.revolut.com'
        : 'https://oba-sandbox.revolut.com';

    this.authUrl =
      process.env.REVOLUT_ENVIRONMENT === 'production'
        ? 'https://oba-auth.revolut.com'
        : 'https://oba-auth-sandbox.revolut.com';

    this.clientId = process.env.REVOLUT_CLIENT_ID!;

    // Load certificates for mTLS
    const transportCertPath = process.env.REVOLUT_TRANSPORT_CERT_PATH!;
    const privateKeyPath = process.env.REVOLUT_PRIVATE_KEY_PATH!;

    this.transportCert = fs.readFileSync(transportCertPath, 'utf8');
    this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  }

  /**
   * Get access token using Client Credentials flow
   * https://developer.revolut.com/docs/open-banking/open-banking-api#get-access-token
   */
  async getAccessToken(scope: string = 'accounts'): Promise<string> {
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      scope: scope,
    });

    // Create HTTPS agent with client certificates for mTLS
    const httpsAgent = new https.Agent({
      cert: this.transportCert,
      key: this.privateKey,
      rejectUnauthorized: false, // For sandbox testing
    });

    const response = await fetch(`${this.authUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      // @ts-ignore - Node.js specific
      agent: httpsAgent,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Revolut Auth Error: ${response.status} - ${error}`);
    }

    const tokenData = await response.json();
    console.log('✅ Revolut Access Token obtained:', tokenData.token_type);

    return tokenData.access_token;
  }

  /**
   * Make authenticated API request with access token and mTLS
   */
  private async makeAuthenticatedRequest(
    endpoint: string,
    accessToken: string,
    options: RequestInit = {}
  ): Promise<any> {
    // Create HTTPS agent with client certificates
    const httpsAgent = new https.Agent({
      cert: this.transportCert,
      key: this.privateKey,
      rejectUnauthorized: false, // For sandbox testing
    });

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
      // @ts-ignore - Node.js specific
      agent: httpsAgent,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Revolut API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get account information
   * https://developer.revolut.com/docs/open-banking/accounts
   */
  async getAccounts(): Promise<any[]> {
    const accessToken = await this.getAccessToken('accounts');
    return this.makeAuthenticatedRequest('/open-banking/accounts', accessToken);
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId: string): Promise<any> {
    const accessToken = await this.getAccessToken('accounts');
    return this.makeAuthenticatedRequest(
      `/open-banking/accounts/${accountId}/balances`,
      accessToken
    );
  }

  /**
   * Get account transactions
   */
  async getAccountTransactions(
    accountId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<any[]> {
    const accessToken = await this.getAccessToken('accounts');

    let endpoint = `/open-banking/accounts/${accountId}/transactions`;
    const params = new URLSearchParams();

    if (fromDate) params.append('fromBookingDateTime', fromDate);
    if (toDate) params.append('toBookingDateTime', toDate);

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    return this.makeAuthenticatedRequest(endpoint, accessToken);
  }

  /**
   * Test connection - get all accounts and basic info
   */
  async testConnection(): Promise<{
    accounts: any[];
    totalAccounts: number;
    environment: string;
  }> {
    console.log('🔧 Testing Revolut Open Banking connection...');

    const accounts = await this.getAccounts();

    console.log('✅ Revolut accounts retrieved:', accounts.length);

    return {
      accounts,
      totalAccounts: accounts.length,
      environment: process.env.REVOLUT_ENVIRONMENT || 'sandbox',
    };
  }
}

export const revolutOpenBankingService = new RevolutOpenBankingService();
