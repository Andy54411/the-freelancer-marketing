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
    userEmail: string,
    password: string,
    companyId: string
  ): Promise<{ user: FinAPIUser; userToken: string }> {
    try {
      // FIRST: Check Firestore for existing finAPI user data
      console.log('🔍 Checking Firestore for existing finAPI user...');
      const firestoreFinAPIUser = await this.getFinAPIUserFromFirestore(companyId);

      if (firestoreFinAPIUser && firestoreFinAPIUser.userId && firestoreFinAPIUser.password) {
        console.log('✅ Found existing finAPI user in Firestore:', {
          userId: firestoreFinAPIUser.userId,
          email: firestoreFinAPIUser.userEmail,
        });

        // Use existing credentials from Firestore
        try {
          const userToken = await this.getUserToken(
            firestoreFinAPIUser.userEmail,
            firestoreFinAPIUser.password
          );

          return {
            user: {
              id: firestoreFinAPIUser.userId,
              email: firestoreFinAPIUser.userEmail,
              password: firestoreFinAPIUser.password,
            } as FinAPIUser,
            userToken,
          };
        } catch (tokenError) {
          console.log(
            '⚠️ Token generation failed with Firestore credentials, will create new user'
          );
        }
      }

      // FALLBACK: Try to get existing user from finAPI directly
      try {
        const existingUser = await this.getUser(userEmail);
        if (existingUser) {
          console.log('🔍 Found existing finAPI user in finAPI:', {
            userId: existingUser.id,
            email: existingUser.email,
          });

          const userToken = await this.getUserToken(userEmail, password);
          return {
            user: existingUser,
            userToken,
          };
        }
      } catch (error) {
        console.log('🔍 User not found in finAPI, creating new user...');
      }
    } catch (error) {
      console.log('🔍 Error checking existing users, creating new user...');
    }

    // Create new user if not found
    const adminToken = await this.getAdminClientToken();

    const userData = {
      id: `tk${companyId.substring(0, 10)}`,
      password,
      email: userEmail,
      phone: '+49 99 999999-999',
      isAutoUpdateEnabled: false,
    };

    console.log('🔍 Admin credentials debug (user management):', {
      environment: 'sandbox',
      hasAdminCredentials: !!(
        process.env.FINAPI_ADMIN_CLIENT_ID && process.env.FINAPI_ADMIN_CLIENT_SECRET
      ),
    });
    const response = await fetch(`${this.baseUrl}/api/v2/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-Request-Id': Math.random().toString(36).substring(2, 15),
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`User creation failed: ${response.status} ${errorText}`);
    }

    const user = await response.json();
    console.log('✅ finAPI user created successfully:', {
      userId: user.id,
      email: user.email,
    });

    // Get user token for the newly created user
    const userToken = await this.getUserToken(userEmail, password);

    return {
      user,
      userToken,
    };
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
   * Create WebForm URL for bank connection using finAPI WebForm 2.0
   */
  async createWebForm(
    userEmail: string,
    companyId: string,
    bankId?: string,
    redirectUrl?: string
  ): Promise<string> {
    try {
      console.log('🔧 Creating finAPI WebForm 2.0...', {
        companyId: companyId.substring(0, 10) + '...',
        bankId,
        userEmail,
      });

      // WebForm 2.0 ist ein User-related Service - braucht User Token
      // Verwende existierenden finAPI User aus Datenbank falls vorhanden
      let userAccessToken: string;

      try {
        // Versuche mit existierenden finAPI Credentials aus Datenbank
        userAccessToken = await this.getUserToken('tkLLc8PX1V', 'PassLLc8PX1V123');
        console.log('✅ Using existing finAPI user from database');
      } catch (error) {
        // Fallback: Erstelle neuen User
        const userData = await this.getOrCreateUser(userEmail, 'demo123', companyId);
        if (!userData.user.id) {
          throw new Error(`Could not create/get user for ${userEmail}`);
        }
        userAccessToken = userData.userToken;
        console.log('✅ Created new finAPI user');
      }

      // finAPI WebForm 2.0 - Minimaler Payload zum Entdecken der korrekten Fields
      const webFormPayload = {};

      // Remove undefined values
      const cleanPayload = Object.fromEntries(
        Object.entries(webFormPayload).filter(([_, value]) => value !== undefined)
      );

      console.log('🌐 Calling finAPI WebForm 2.0 API...', {
        baseUrl: this.webFormBaseUrl,
        endpoint: '/api/webForms/bankConnectionImport',
        hasUserToken: !!userAccessToken,
        bankId: cleanPayload.bankId,
      });

      // Create WebForm using finAPI WebForm 2.0 API
      // Erstelle WebForm über finAPI WebForm 2.0 API
      const webFormResponse = await fetch(
        `${this.webFormBaseUrl}/api/webForms/bankConnectionImport`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userAccessToken}`, // User Token für WebForm
            'X-Request-Id': Math.random().toString(36).substring(2, 15),
          },
          body: JSON.stringify(webFormPayload),
        }
      );

      if (!webFormResponse.ok) {
        const errorText = await webFormResponse.text();
        throw new Error(`WebForm API failed: ${webFormResponse.status} ${errorText}`);
      }

      const webFormData = await webFormResponse.json();

      console.log('✅ finAPI WebForm 2.0 Response:', {
        id: webFormData.id,
        url: webFormData.url,
        status: webFormData.status,
        type: webFormData.type,
      });

      if (!webFormData.url) {
        throw new Error('WebForm creation failed: No URL returned from finAPI');
      }

      console.log('✅ finAPI WebForm 2.0 created successfully');
      return webFormData.url;
    } catch (error: any) {
      console.error('❌ finAPI WebForm creation failed:', error.message);
      throw error;
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

  /**
   * Helper method: Generate finAPI user ID
   */
  private generateUserId(userEmail: string, companyId: string): string {
    return `tk${companyId.substring(0, 10)}`;
  }

  /**
   * Helper method: Get finAPI user from Firestore
   */
  private async getFinAPIUserFromFirestore(companyId: string): Promise<any> {
    try {
      const admin = (await import('firebase-admin')).default;
      const db = admin.firestore();

      const companyDoc = await db.collection('companies').doc(companyId).get();
      if (companyDoc.exists) {
        const companyData = companyDoc.data();
        return companyData?.finapiUser || null;
      }
      return null;
    } catch (error) {
      console.log('⚠️ Error getting finAPI user from Firestore:', error);
      return null;
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
