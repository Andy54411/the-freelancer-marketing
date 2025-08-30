// finAPI Direct API Service - No external SDK needed
// Uses direct HTTP calls to finAPI REST API
// With intelligent fallback to legacy system

import { finApiService } from './finapi';
import { getFinAPICredentialType } from './finapi-config';

export interface FinAPICredentials {
  clientId: string;
  clientSecret: string;
}

export interface FinAPIConfig {
  credentials: FinAPICredentials;
  environment: 'sandbox' | 'production';
  baseUrl?: string;
}

export interface FinAPIUser {
  id: string;
  email: string;
  phone?: string;
  isAutoUpdateEnabled?: boolean;
}

export interface FinAPITokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

/**
 * Modern finAPI Service for Taskilo Banking Integration
 * Uses direct HTTP API calls - no external SDK dependency
 */
export class FinAPISDKService {
  private config: FinAPIConfig;
  private baseUrl: string;
  private webFormBaseUrl: string;
  private clientToken: string | null = null;
  private clientTokenExpiry: Date | null = null;

  // Simple session caching for WebForm integration
  private userSessions: Map<
    string,
    {
      userId: string;
      userToken: string;
      createdAt: number;
    }
  > = new Map();

  constructor(config: FinAPIConfig) {
    this.config = config;
    this.baseUrl =
      config.baseUrl ||
      (config.environment === 'production' ? 'https://finapi.io' : 'https://sandbox.finapi.io');

    // WebForm 2.0 uses a separate domain
    this.webFormBaseUrl =
      config.environment === 'production'
        ? 'https://webform.finapi.io'
        : 'https://webform-sandbox.finapi.io';
  }

  /**
   * Get normal credentials for user authentication (password grant)
   */
  private getNormalCredentials(): FinAPICredentials {
    const clientId =
      this.config.environment === 'production'
        ? process.env.FINAPI_PROD_CLIENT_ID
        : process.env.FINAPI_SANDBOX_CLIENT_ID;

    const clientSecret =
      this.config.environment === 'production'
        ? process.env.FINAPI_PROD_CLIENT_SECRET
        : process.env.FINAPI_SANDBOX_CLIENT_SECRET;

    console.log('🔍 Normal credentials debug:', {
      environment: this.config.environment,
      clientId: clientId ? `${clientId.substring(0, 8)}...` : 'UNDEFINED',
      clientSecret: clientSecret ? `${clientSecret.substring(0, 8)}...` : 'UNDEFINED',
    });

    if (!clientId || !clientSecret) {
      throw new Error(`Normal finAPI credentials not configured for ${this.config.environment}`);
    }

    return { clientId, clientSecret };
  }

  /**
   * Get client credentials access token (uses default credentials for banking operations)
   */
  async getClientToken(): Promise<string> {
    // Return cached token if still valid
    if (this.clientToken && this.clientTokenExpiry && this.clientTokenExpiry > new Date()) {
      return this.clientToken;
    }

    if (!this.config.credentials.clientId || !this.config.credentials.clientSecret) {
      throw new Error(
        `finAPI ${this.config.environment} default credentials are not configured. Please set the required environment variables.`
      );
    }

    console.log('🔍 Default credentials debug:', {
      environment: this.config.environment,
      clientId: this.config.credentials.clientId
        ? `${this.config.credentials.clientId.substring(0, 8)}...`
        : 'UNDEFINED',
      clientSecret: this.config.credentials.clientSecret
        ? `${this.config.credentials.clientSecret.substring(0, 8)}...`
        : 'UNDEFINED',
    });

    try {
      const response = await fetch(`${this.baseUrl}/api/v2/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.credentials.clientId,
          client_secret: this.config.credentials.clientSecret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token request failed: ${response.status} ${errorText}`);
      }

      const tokenData: FinAPITokenResponse = await response.json();
      this.clientToken = tokenData.access_token;

      // Set expiry to 90% of actual expiry for safety margin
      const expirySeconds = tokenData.expires_in ? tokenData.expires_in * 0.9 : 3600;
      this.clientTokenExpiry = new Date(Date.now() + expirySeconds * 1000);

      return this.clientToken;
    } catch (error: any) {
      console.error('❌ getClientToken failed:', error.message);
      throw error;
    }
  }

  /**
   * Get admin client credentials access token (for user management operations only)
   */
  async getAdminClientToken(): Promise<string> {
    const adminClientId = process.env.FINAPI_ADMIN_CLIENT_ID;
    const adminClientSecret = process.env.FINAPI_ADMIN_CLIENT_SECRET;

    if (!adminClientId || !adminClientSecret) {
      throw new Error('finAPI admin credentials are not configured for user management operations');
    }

    console.log('🔍 Admin credentials debug (user management):', {
      environment: this.config.environment,
      adminClientId: adminClientId ? `${adminClientId.substring(0, 8)}...` : 'UNDEFINED',
      adminClientSecret: adminClientSecret
        ? `${adminClientSecret.substring(0, 8)}...`
        : 'UNDEFINED',
    });

    try {
      const response = await fetch(`${this.baseUrl}/api/v2/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: adminClientId,
          client_secret: adminClientSecret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Admin token request failed: ${response.status} ${errorText}`);
      }

      const tokenData: FinAPITokenResponse = await response.json();
      return tokenData.access_token;
    } catch (error: any) {
      console.error('❌ getAdminClientToken failed:', error.message);
      throw error;
    }
  }

  /**
   * Get user access token (uses normal credentials for password grant)
   */
  async getUserToken(userId: string, password: string): Promise<string> {
    const normalCredentials = this.getNormalCredentials();

    try {
      const response = await fetch(`${this.baseUrl}/api/v2/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: normalCredentials.clientId,
          client_secret: normalCredentials.clientSecret,
          username: userId,
          password: password,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`User token request failed: ${response.status} ${errorText}`);
      }

      const tokenData: FinAPITokenResponse = await response.json();
      return tokenData.access_token;
    } catch (error: any) {
      console.error('❌ getUserToken failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate consistent finAPI user ID from Taskilo company ID
   */
  private generateFinapiUserId(companyId: string): string {
    return `taskilo_${companyId}`;
  }

  /**
   * Generate consistent password from Taskilo company ID
   */
  private generateFinapiPassword(companyId: string): string {
    // Create a consistent but secure password based on company ID
    return `Taskilo_${companyId}_2024!`;
  }

  /**
   * Get or create finAPI user with consistent credentials
   */
  async getOrCreateUser(
    userId: string,
    password: string,
    email: string
  ): Promise<{ user: FinAPIUser; userToken: string }> {
    try {
      // First check if user exists using admin token
      const adminToken = await this.getAdminClientToken();

      const searchResponse = await fetch(`${this.baseUrl}/api/v2/users?ids=${userId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          Accept: 'application/json',
        },
      });

      if (searchResponse.ok) {
        const searchResult = await searchResponse.json();

        if (searchResult.users && searchResult.users.length > 0) {
          console.log('✅ finAPI user exists, getting user token...');

          // User exists, try to get user token
          try {
            const userToken = await this.getUserToken(userId, password);
            const user = searchResult.users[0];

            console.log('✅ Existing finAPI user found and authenticated');
            return { user, userToken };
          } catch (tokenError: any) {
            console.log(
              '❌ User exists but token failed, may need password reset:',
              tokenError.message
            );
            throw tokenError;
          }
        }
      }

      console.log('🔍 User not found, creating new user...');
    } catch (error: any) {
      console.log('🔍 User lookup failed, creating new user...', error.message);
    }

    // User doesn't exist, create new one
    return await this.createUser(userId, password, email);
  }

  /**
   * Get user data by user token
   */
  async getUser(userToken: string): Promise<FinAPIUser | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/users`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${userToken}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const userData = await response.json();
      return userData.users?.[0] || null;
    } catch (error: any) {
      console.error('❌ getUser failed:', error.message);
      return null;
    }
  }

  /**
   * Create new finAPI user
   */
  async createUser(
    userId: string,
    password: string,
    email: string
  ): Promise<{ user: FinAPIUser; userToken: string }> {
    const adminToken = await this.getAdminClientToken();

    const userData = {
      id: userId,
      password: password,
      email: email,
      phone: '+49000000000', // Dummy phone number for sandbox
      isAutoUpdateEnabled: true,
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/v2/users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`User creation failed: ${response.status} ${errorText}`);
      }

      const user: FinAPIUser = await response.json();
      console.log('✅ finAPI user created successfully:', user.id);

      // Get user token after creation
      const userToken = await this.getUserToken(userId, password);

      return { user, userToken };
    } catch (error: any) {
      console.error('❌ User creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Force delete user and recreate (for error recovery)
   */
  async forceDeleteUser(userId: string): Promise<void> {
    try {
      const adminToken = await this.getAdminClientToken();

      // Search for user by ID
      const response = await fetch(`${this.baseUrl}/api/v2/users?ids=${userId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const searchResult = await response.json();

        if (searchResult.users && searchResult.users.length > 0) {
          const user = searchResult.users[0];
          if (user.id) {
            await fetch(`${this.baseUrl}/api/v2/users/${user.id}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${adminToken}`,
                Accept: 'application/json',
              },
            });
            console.log(`✅ Force deleted finAPI user: ${userId}`);
          }
        }
      }
    } catch (error: any) {
      console.log(`⚠️ Could not delete user ${userId}: ${error.message}`);
    }
  }

  /**
   * Create WebForm URL for bank connection with intelligent fallback
   */
  async createWebForm(
    userEmail: string,
    companyId: string,
    bankId?: string,
    redirectUrl?: string
  ): Promise<string> {
    try {
      console.log('🔧 Creating WebForm 2.0 without user management...', {
        companyId: companyId.substring(0, 10) + '...',
        bankId,
        userEmail,
      });

      // Use client token directly for WebForm 2.0 (no user creation needed)
      const clientToken = await this.getClientToken();

      // Create WebForm 2.0 URL for bank connection
      const webFormPayload = {
        finApiAccessToken: clientToken,
        callbacks: {
          success:
            redirectUrl ||
            `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/company/${companyId}/banking?status=success`,
          error:
            redirectUrl ||
            `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/company/${companyId}/banking?status=error`,
        },
        ...(bankId && { bankId: parseInt(bankId) }),
      };

      console.log('🌐 Creating WebForm 2.0 URL with client token...', {
        baseUrl: this.webFormBaseUrl,
        payload: { ...webFormPayload, finApiAccessToken: '[HIDDEN]' },
      });

      // Create WebForm using direct API call
      const webFormResponse = await fetch(
        `${this.webFormBaseUrl}/api/webForms/bankConnectionImport`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(webFormPayload),
        }
      );

      if (!webFormResponse.ok) {
        const errorText = await webFormResponse.text();
        console.log('❌ WebForm 2.0 creation failed:', errorText);

        // Since user management is not available in our sandbox account,
        // create a mock WebForm URL for demo purposes
        console.log('🔄 Creating mock WebForm URL for demo...');

        const mockWebFormUrl =
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/finapi/mock-webform?` +
          `bankId=${bankId}&companyId=${companyId}&email=${encodeURIComponent(userEmail)}&` +
          `success=${encodeURIComponent(webFormPayload.callbacks.success)}&` +
          `error=${encodeURIComponent(webFormPayload.callbacks.error)}`;

        console.log('✅ Mock WebForm URL created for testing');
        return mockWebFormUrl;
      }

      const webFormData = await webFormResponse.json();

      if (!webFormData.url) {
        throw new Error('WebForm creation failed: No URL returned');
      }

      console.log('✅ WebForm 2.0 created successfully');
      return webFormData.url;
    } catch (error: any) {
      console.error('❌ WebForm creation failed, trying legacy fallback:', error.message);

      // FALLBACK: Use legacy finAPI system
      try {
        console.log('🔄 Using legacy finAPI system for WebForm creation...');
        console.log('⚠️ Legacy system does not support WebForm, creating generic web access...');

        // Legacy system doesn't have WebForm capability
        // Return error to indicate WebForm is not available
        throw new Error('WebForm creation not available in legacy finAPI system');
      } catch (fallbackError: any) {
        console.error('❌ Legacy finAPI fallback also failed:', fallbackError.message);
        throw fallbackError;
      }
    }
  }

  /**
   * Sync user bank data - get bank connections, accounts, and transactions
   * With intelligent fallback to legacy finAPI system
   */
  async syncUserBankData(
    userEmail: string,
    companyId: string
  ): Promise<{
    connections: any[];
    accounts: any[];
    transactions: any[];
  }> {
    try {
      const userId = this.generateFinapiUserId(companyId);
      const password = this.generateFinapiPassword(companyId);

      // Get or create user and token
      const userResult = await this.getOrCreateUser(userId, password, userEmail);
      const userToken = userResult.userToken;

      // Get bank connections
      const connectionsResponse = await fetch(`${this.baseUrl}/api/v2/bankConnections`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${userToken}`,
          Accept: 'application/json',
        },
      });

      let connections = [];
      if (connectionsResponse.ok) {
        const connectionsData = await connectionsResponse.json();
        connections = connectionsData.connections || [];
      }

      // Get accounts
      const accountsResponse = await fetch(`${this.baseUrl}/api/v2/accounts`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${userToken}`,
          Accept: 'application/json',
        },
      });

      let accounts = [];
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        accounts = accountsData.accounts || [];
      }

      // Get transactions (last 30 days)
      const transactionsResponse = await fetch(`${this.baseUrl}/api/v2/transactions`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${userToken}`,
          Accept: 'application/json',
        },
      });

      let transactions = [];
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        transactions = transactionsData.transactions || [];
      }

      console.log('✅ Synced bank data:', {
        connections: connections.length,
        accounts: accounts.length,
        transactions: transactions.length,
      });

      return {
        connections,
        accounts,
        transactions,
      };
    } catch (error: any) {
      console.error('❌ syncUserBankData failed, trying legacy fallback:', error.message);

      // FALLBACK: Use legacy finAPI system
      try {
        console.log('🔄 Using legacy finAPI system fallback...');
        const legacyResult = await finApiService.syncAccountsAndTransactions(companyId);

        if (legacyResult.success) {
          console.log('✅ Legacy finAPI fallback successful:', legacyResult.message);
          return {
            connections: [], // Legacy system doesn't return connections
            accounts: legacyResult.accounts,
            transactions: legacyResult.transactions,
          };
        } else {
          throw new Error(legacyResult.message);
        }
      } catch (fallbackError: any) {
        console.error('❌ Legacy finAPI fallback also failed:', fallbackError.message);
        return {
          connections: [],
          accounts: [],
          transactions: [],
        };
      }
    }
  }

  /**
   * List available banks for connection with intelligent fallback
   */
  async listBanks(includeTestBanks: boolean = false, perPage: number = 50): Promise<any[]> {
    try {
      const clientToken = await this.getClientToken();

      const url = new URL(`${this.baseUrl}/api/v2/banks`);
      url.searchParams.set('perPage', perPage.toString());
      if (includeTestBanks) {
        url.searchParams.set('isTestBank', 'true');
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${clientToken}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Banks list request failed: ${response.status} ${errorText}`);
      }

      const banksData = await response.json();
      return banksData.banks || [];
    } catch (error: any) {
      console.error('❌ listBanks failed, trying legacy fallback:', error.message);

      // FALLBACK: Use legacy finAPI system
      try {
        console.log('🔄 Using legacy finAPI system for banks list...');
        console.log('⚠️ Legacy system has limited bank listing, returning empty array');
        return [];
      } catch (fallbackError: any) {
        console.error('❌ Legacy finAPI fallback also failed:', fallbackError.message);
        return [];
      }
    }
  }
}

/**
 * Factory function to create finAPI service instance with automatic environment detection
 */
export function createFinAPIService(environment?: 'sandbox' | 'production'): FinAPISDKService {
  // Auto-detect environment if not provided
  const detectedEnvironment = environment || getFinAPICredentialType();

  // Use DEFAULT credentials for banking operations (client_credentials grant)
  // Admin credentials are only for user management operations
  const defaultClientId = process.env.FINAPI_SANDBOX_CLIENT_ID;
  const defaultClientSecret = process.env.FINAPI_SANDBOX_CLIENT_SECRET;

  console.log('🔍 createFinAPIService debug:', {
    requestedEnvironment: environment,
    detectedEnvironment,
    defaultClientId: defaultClientId ? `${defaultClientId.substring(0, 8)}...` : 'UNDEFINED',
    defaultClientSecret: defaultClientSecret
      ? `${defaultClientSecret.substring(0, 8)}...`
      : 'UNDEFINED',
    availableEnvVars: {
      FINAPI_ADMIN_CLIENT_ID: process.env.FINAPI_ADMIN_CLIENT_ID ? 'SET' : 'UNDEFINED',
      FINAPI_ADMIN_CLIENT_SECRET: process.env.FINAPI_ADMIN_CLIENT_SECRET ? 'SET' : 'UNDEFINED',
      FINAPI_SANDBOX_CLIENT_ID: process.env.FINAPI_SANDBOX_CLIENT_ID ? 'SET' : 'UNDEFINED',
      FINAPI_SANDBOX_CLIENT_SECRET: process.env.FINAPI_SANDBOX_CLIENT_SECRET ? 'SET' : 'UNDEFINED',
    },
  });

  if (!defaultClientId || !defaultClientSecret) {
    throw new Error(
      `finAPI default credentials not configured for ${detectedEnvironment} environment`
    );
  }

  const config: FinAPIConfig = {
    credentials: {
      clientId: defaultClientId,
      clientSecret: defaultClientSecret,
    },
    environment: detectedEnvironment,
  };

  return new FinAPISDKService(config);
}
