// finAPI Direct API Service - No external SDK needed
// Uses direct HTTP calls to finAPI REST API
// With intelligent fallback to legacy system

import { finApiService } from './finapi';
import { getFinAPICredentialType } from './finapi-config';
import { db } from '../firebase/server';

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
    }> =
  new Map();

  constructor(config: FinAPIConfig) {
    this.config = config;
    this.baseUrl =
    config.baseUrl || (
    config.environment === 'production' ? 'https://finapi.io' : 'https://sandbox.finapi.io');

    // WebForm 2.0 uses a separate domain
    this.webFormBaseUrl =
    config.environment === 'production' ?
    'https://webform.finapi.io' :
    'https://webform-sandbox.finapi.io';
  }

  /**
   * Get normal credentials for user authentication (password grant)
   */
  private getNormalCredentials(): FinAPICredentials {
    const clientId =
    this.config.environment === 'production' ?
    process.env.FINAPI_PROD_CLIENT_ID :
    process.env.FINAPI_SANDBOX_CLIENT_ID;

    const clientSecret =
    this.config.environment === 'production' ?
    process.env.FINAPI_PROD_CLIENT_SECRET :
    process.env.FINAPI_SANDBOX_CLIENT_SECRET;

    // Security: Only log environment and availability, never actual credentials

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

    // Security: Only log environment and availability, never actual credentials

    try {



      const response = await fetch(`${this.baseUrl}/api/v2/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.credentials.clientId,
          client_secret: this.config.credentials.clientSecret
        })
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
      throw error;
    }
  }

  /**
   * Get admin client credentials access token (for user management operations only)
   */
  async getAdminClientToken(): Promise<string> {
    // Use the same credentials as normal operations - in sandbox there's no separate admin client
    const adminClientId =
    this.config.environment === 'production' ?
    process.env.FINAPI_ADMIN_CLIENT_ID :
    process.env.FINAPI_SANDBOX_CLIENT_ID;
    const adminClientSecret =
    this.config.environment === 'production' ?
    process.env.FINAPI_ADMIN_CLIENT_SECRET :
    process.env.FINAPI_SANDBOX_CLIENT_SECRET;

    if (!adminClientId || !adminClientSecret) {
      throw new Error('finAPI admin credentials are not configured for user management operations');
    }

    // Security: Only log environment and availability, never actual credentials

    try {
      const response = await fetch(`${this.baseUrl}/api/v2/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: adminClientId,
          client_secret: adminClientSecret,
          scope: 'all'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Admin token request failed: ${response.status} ${errorText}`);
      }

      const tokenData: FinAPITokenResponse = await response.json();
      return tokenData.access_token;
    } catch (error: any) {
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
          Accept: 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: normalCredentials.clientId,
          client_secret: normalCredentials.clientSecret,
          username: userId,
          password: password
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`User token request failed: ${response.status} ${errorText}`);
      }

      const tokenData: FinAPITokenResponse = await response.json();
      return tokenData.access_token;
    } catch (error: any) {
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
  companyId: string,
  forceCreate: boolean = false)
  : Promise<{user: FinAPIUser;userToken: string;}> {
    try {
      // FIRST: Check Firestore for existing finAPI user data

      const firestoreFinAPIUser = await this.getFinAPIUserFromFirestore(companyId);

      if (firestoreFinAPIUser && firestoreFinAPIUser.userId && firestoreFinAPIUser.password) {
        // Use existing credentials from Firestore
        try {
          const userToken = await this.getUserToken(
            firestoreFinAPIUser.userId, // Use userId, not userEmail!
            firestoreFinAPIUser.password
          );

          return {
            user: {
              id: firestoreFinAPIUser.userId,
              email: firestoreFinAPIUser.userEmail,
              password: firestoreFinAPIUser.password
            } as FinAPIUser,
            userToken
          };
        } catch (tokenError: any) {}
      } else {
      }
    } catch (error) {}

    // Check if we should create a new user or return error for read operations
    if (!forceCreate) {
      throw new Error(
        'No existing finAPI user found and forceCreate is false. Use forceCreate: true for operations that should create users.'
      );
    }

    // Create new user if not found (only when forceCreate is true)
    const adminToken = await this.getAdminClientToken();

    // Use consistent userId generation
    const finapiUserId = this.generateFinapiUserId(companyId);

    // Validate email before creating user

    if (!userEmail || !userEmail.includes('@') || !userEmail.includes('.')) {
      throw new Error(`Invalid email address provided: "${userEmail}". Cannot create finAPI user.`);
    }

    const userData = {
      id: finapiUserId,
      password,
      email: userEmail,
      phone: '+49 99 999999-999',
      isAutoUpdateEnabled: false
    };

    const response = await fetch(`${this.baseUrl}/api/v2/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-Request-Id': Math.random().toString(36).substring(2, 15)
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Handle case where user already exists (422 ENTITY_EXISTS)
      if (response.status === 422 && errorText.includes('ENTITY_EXISTS')) {
        const finapiUserId = this.generateFinapiUserId(companyId);

        // Try multiple passwords in order (new consistent password first, then old ones)
        const passwordsToTry = [
        password, // The new consistent password
        'demo123' // Legacy hardcoded password
        ];

        for (const tryPassword of passwordsToTry) {
          try {
            const userToken = await this.getUserToken(finapiUserId, tryPassword);

            // Get user details
            const existingUser = await this.getUser(userToken);
            if (existingUser) {
              return {
                user: existingUser,
                userToken
              };
            }
          } catch (tokenError: any) {}
        }

        // Since we can't delete users in sandbox (403 Access Denied),
        // try creating a user with a timestamped unique ID (max 36 chars)

        try {
          const timestamp = Date.now().toString();
          // Create shorter unique ID: max 36 chars for finAPI
          const shortCompanyId = companyId.substring(0, 10);
          const uniqueFinapiUserId = `taskilo_${shortCompanyId}_${timestamp}`;

          // Ensure ID is not too long
          if (uniqueFinapiUserId.length > 36) {
            throw new Error(`Generated ID too long: ${uniqueFinapiUserId.length} chars (max 36)`);
          }

          const newUser = await this.createUser(uniqueFinapiUserId, password, userEmail);

          // Save the new user to Firestore
          await this.saveFinAPIUserToFirestore(companyId, {
            userId: uniqueFinapiUserId,
            userEmail,
            password,
            createdAt: Date.now()
          });

          return newUser;
        } catch (uniqueError: any) {}
      }

      throw new Error(`User creation failed: ${response.status} ${errorText}`);
    }

    const user = await response.json();

    // Get user token for the newly created user - use userId not email!
    const userToken = await this.getUserToken(user.id, password);

    // Save the new user to Firestore
    await this.saveFinAPIUserToFirestore(companyId, {
      userId: user.id,
      userEmail,
      password,
      createdAt: Date.now()
    });

    return {
      user,
      userToken
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
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        return null;
      }

      const userData = await response.json();
      return userData.users?.[0] || null;
    } catch (error: any) {
      return null;
    }
  }

  /**
   * Create new finAPI user
   */
  async createUser(
  userId: string,
  password: string,
  email: string)
  : Promise<{user: FinAPIUser;userToken: string;}> {
    const adminToken = await this.getAdminClientToken();

    const userData = {
      id: userId,
      password: password,
      email: email,
      phone: '+49000000000', // Dummy phone number for sandbox
      isAutoUpdateEnabled: true
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/v2/users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`User creation failed: ${response.status} ${errorText}`);
      }

      const user: FinAPIUser = await response.json();

      // Get user token after creation
      const userToken = await this.getUserToken(userId, password);

      return { user, userToken };
    } catch (error: any) {
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
          Accept: 'application/json'
        }
      });

      if (response.ok) {
        const searchResult = await response.json();

        if (searchResult.users && searchResult.users.length > 0) {
          const user = searchResult.users[0];
          if (user.id) {
            const deleteResponse = await fetch(`${this.baseUrl}/api/v2/users/${user.id}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${adminToken}`,
                Accept: 'application/json'
              }
            });

            if (deleteResponse.ok) {
            } else {
              const deleteError = await deleteResponse.text();

              throw new Error(`Failed to delete user: ${deleteResponse.status} ${deleteError}`);
            }
          } else {
          }
        } else {
        }
      } else {
        const searchError = await response.text();

        throw new Error(`Failed to search for user: ${response.status} ${searchError}`);
      }
    } catch (error: any) {
      throw error; // Re-throw to stop the recreation process
    }
  }

  /**
   * Create WebForm URL for bank connection using finAPI WebForm 2.0
   */
  async createWebForm(
  userEmail: string,
  companyId: string,
  bankId?: string,
  redirectUrl?: string)
  : Promise<string> {
    try {
      // Validate input parameters
      if (!userEmail || typeof userEmail !== 'string') {
        throw new Error(`Invalid userEmail parameter: "${userEmail}" (type: ${typeof userEmail})`);
      }

      if (!companyId || typeof companyId !== 'string') {
        throw new Error(`Invalid companyId parameter: "${companyId}" (type: ${typeof companyId})`);
      }

      // WebForm 2.0 ist ein User-related Service - braucht User Token
      // Erstelle oder hole finAPI User für die Company
      let userAccessToken: string;

      try {
        // Erstelle neuen User oder hole existierenden aus der Datenbank (true = force creation for WebForm)
        // Use consistent password generation instead of hardcoded 'demo123'
        const consistentPassword = this.generateFinapiPassword(companyId);

        const userData = await this.getOrCreateUser(userEmail, consistentPassword, companyId, true);
        if (!userData.user.id) {
          throw new Error(`Could not create/get user for ${userEmail}`);
        }
        userAccessToken = userData.userToken;
      } catch (error: any) {
        throw new Error(`Could not create/get finAPI user: ${error.message}`);
      }

      // finAPI WebForm 2.0 - Minimaler Payload zum Entdecken der korrekten Fields
      const webFormPayload = {};

      // Remove undefined values
      const cleanPayload = Object.fromEntries(
        Object.entries(webFormPayload).filter(([_, value]) => value !== undefined)
      );

      // Create WebForm using finAPI WebForm 2.0 API
      // Erstelle WebForm über finAPI WebForm 2.0 API
      const webFormResponse = await fetch(
        `${this.webFormBaseUrl}/api/webForms/bankConnectionImport`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userAccessToken}`, // User Token für WebForm
            'X-Request-Id': Math.random().toString(36).substring(2, 15)
          },
          body: JSON.stringify(webFormPayload)
        }
      );

      if (!webFormResponse.ok) {
        const errorText = await webFormResponse.text();
        throw new Error(`WebForm API failed: ${webFormResponse.status} ${errorText}`);
      }

      const webFormData = await webFormResponse.json();

      if (!webFormData.url) {
        throw new Error('WebForm creation failed: No URL returned from finAPI');
      }

      return webFormData.url;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Sync user bank data - get bank connections, accounts, and transactions
   * With intelligent fallback to legacy finAPI system
   */
  async syncUserBankData(
  userEmail: string,
  companyId: string)
  : Promise<{
    connections: any[];
    accounts: any[];
    transactions: any[];
  }> {
    try {
      const userId = this.generateFinapiUserId(companyId);
      const password = this.generateFinapiPassword(companyId);

      // Get or create user and token
      const userResult = await this.getOrCreateUser(userEmail, password, companyId);
      const userToken = userResult.userToken;

      // Get bank connections
      const connectionsResponse = await fetch(`${this.baseUrl}/api/v2/bankConnections`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${userToken}`,
          Accept: 'application/json'
        }
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
          Accept: 'application/json'
        }
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
          Accept: 'application/json'
        }
      });

      let transactions = [];
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        transactions = transactionsData.transactions || [];
      }

      return {
        connections,
        accounts,
        transactions
      };
    } catch (error: any) {
      // FALLBACK: Use legacy finAPI system
      try {
        const legacyResult = await finApiService.syncAccountsAndTransactions(companyId);

        if (legacyResult.success) {
          return {
            connections: [], // Legacy system doesn't return connections
            accounts: legacyResult.accounts,
            transactions: legacyResult.transactions
          };
        } else {
          throw new Error(legacyResult.message);
        }
      } catch (fallbackError: any) {
        return {
          connections: [],
          accounts: [],
          transactions: []
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
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Banks list request failed: ${response.status} ${errorText}`);
      }

      const banksData = await response.json();
      return banksData.banks || [];
    } catch (error: any) {
      // FALLBACK: Use legacy finAPI system
      try {
        return [];
      } catch (fallbackError: any) {
        return [];
      }
    }
  }

  /**
   * Get banks with pagination and search support
   */
  async getBanks(
  options: {
    search?: string;
    page?: number;
    perPage?: number;
    includeTestBanks?: boolean;
  } = {})
  : Promise<{
    banks: any[];
    paging: {
      page: number;
      perPage: number;
      pageCount: number;
      totalCount: number;
    };
  }> {
    try {
      const { search, page = 1, perPage = 20, includeTestBanks = true } = options;

      const clientToken = await this.getClientToken();

      const url = new URL(`${this.baseUrl}/api/v2/banks`);
      url.searchParams.set('page', page.toString());
      url.searchParams.set('perPage', perPage.toString());

      if (search && search.trim()) {
        url.searchParams.set('search', search.trim());
      }

      // Include test banks if requested (wichtig für FinAPI Sandbox Test-Banken!)
      if (includeTestBanks) {
        url.searchParams.set('isTestBank', 'true');
      }






      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${clientToken}`,
          Accept: 'application/json'
        }
      });




      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(`Banks request failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      return {
        banks: data.banks || [],
        paging: data.paging || {
          page,
          perPage,
          pageCount: 1,
          totalCount: data.banks?.length || 0
        }
      };
    } catch (error: any) {
      // Return empty result instead of throwing
      return {
        banks: [],
        paging: {
          page: options.page || 1,
          perPage: options.perPage || 20,
          pageCount: 0,
          totalCount: 0
        }
      };
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

      // Check if Firebase Admin is already initialized
      let app;
      try {
        app = admin.app();
      } catch {}

      const db = admin.firestore();

      const companyDoc = await db.collection('companies').doc(companyId).get();

      if (companyDoc.exists) {
        const companyData = companyDoc.data();

        const finapiUser = companyData?.finapiUser || null;

        return finapiUser;
      } else {
        return null;
      }
    } catch (error: any) {
      return null;
    }
  }

  /**
   * Save finAPI user data to Firestore
   */
  private async saveFinAPIUserToFirestore(
  companyId: string,
  finapiUserData: {
    userId: string;
    userEmail: string;
    password: string;
    createdAt: number;
  })
  : Promise<void> {
    try {
      // Update the company document with finAPI user data
      if (db) {
        await db.collection('companies').doc(companyId).update({
          finapiUser: finapiUserData,
          updatedAt: new Date().toISOString(),
          lastModifiedBy: 'finapi-service'
        });
      }
    } catch (error: any) {}
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

  // Security: Only log environment and availability, never actual credentials

  if (!defaultClientId || !defaultClientSecret) {
    throw new Error(
      `finAPI default credentials not configured for ${detectedEnvironment} environment`
    );
  }

  const config: FinAPIConfig = {
    credentials: {
      clientId: defaultClientId,
      clientSecret: defaultClientSecret
    },
    environment: detectedEnvironment
  };

  return new FinAPISDKService(config);
}