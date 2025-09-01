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

    // Security: Only log environment and availability, never actual credentials
    console.log('🔍 Normal credentials debug:', {
      environment: this.config.environment,
      clientId: clientId ? 'CONFIGURED' : 'UNDEFINED',
      clientSecret: clientSecret ? 'CONFIGURED' : 'UNDEFINED',
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

    // Security: Only log environment and availability, never actual credentials
    console.log('🔍 Default credentials debug:', {
      environment: this.config.environment,
      clientId: this.config.credentials.clientId ? 'CONFIGURED' : 'UNDEFINED',
      clientSecret: this.config.credentials.clientSecret ? 'CONFIGURED' : 'UNDEFINED',
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
    // Use the same credentials as normal operations - in sandbox there's no separate admin client
    const adminClientId =
      this.config.environment === 'production'
        ? process.env.FINAPI_ADMIN_CLIENT_ID
        : process.env.FINAPI_SANDBOX_CLIENT_ID;
    const adminClientSecret =
      this.config.environment === 'production'
        ? process.env.FINAPI_ADMIN_CLIENT_SECRET
        : process.env.FINAPI_SANDBOX_CLIENT_SECRET;

    if (!adminClientId || !adminClientSecret) {
      throw new Error('finAPI admin credentials are not configured for user management operations');
    }

    // Security: Only log environment and availability, never actual credentials
    console.log('🔍 Admin credentials debug (user management):', {
      environment: this.config.environment,
      adminClientId: adminClientId ? 'CONFIGURED' : 'UNDEFINED',
      adminClientSecret: adminClientSecret ? 'CONFIGURED' : 'UNDEFINED',
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
          scope: 'all',
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
    companyId: string,
    forceCreate: boolean = false
  ): Promise<{ user: FinAPIUser; userToken: string }> {
    try {
      // FIRST: Check Firestore for existing finAPI user data
      console.log('🔍 Checking Firestore for existing finAPI user...');
      const firestoreFinAPIUser = await this.getFinAPIUserFromFirestore(companyId);

      console.log('🔍 Firestore finAPI user result:', {
        found: !!firestoreFinAPIUser,
        hasUserId: !!firestoreFinAPIUser?.userId,
        hasPassword: !!firestoreFinAPIUser?.password,
        userEmail: firestoreFinAPIUser?.userEmail,
        userId: firestoreFinAPIUser?.userId,
        fullUserData: firestoreFinAPIUser,
      });

      if (firestoreFinAPIUser && firestoreFinAPIUser.userId && firestoreFinAPIUser.password) {
        console.log('✅ Found existing finAPI user in Firestore:', {
          userId: firestoreFinAPIUser.userId,
          email: firestoreFinAPIUser.userEmail,
        });

        // Use existing credentials from Firestore
        try {
          console.log('🔑 Attempting to get user token with Firestore credentials...');
          const userToken = await this.getUserToken(
            firestoreFinAPIUser.userId, // Use userId, not userEmail!
            firestoreFinAPIUser.password
          );

          console.log('✅ Successfully got user token with Firestore credentials!');
          return {
            user: {
              id: firestoreFinAPIUser.userId,
              email: firestoreFinAPIUser.userEmail,
              password: firestoreFinAPIUser.password,
            } as FinAPIUser,
            userToken,
          };
        } catch (tokenError: any) {
          console.log('⚠️ Token generation failed with Firestore credentials:', tokenError.message);
        }
      } else {
        console.log('⚠️ No valid finAPI user found in Firestore');
      }
    } catch (error) {
      console.log('🔍 Error checking existing users, will create new user...');
    }

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
    console.log('🔍 Email validation debug:', {
      userEmail,
      isValidEmail: userEmail && userEmail.includes('@') && userEmail.includes('.'),
      emailLength: userEmail?.length || 0,
    });

    if (!userEmail || !userEmail.includes('@') || !userEmail.includes('.')) {
      throw new Error(`Invalid email address provided: "${userEmail}". Cannot create finAPI user.`);
    }

    const userData = {
      id: finapiUserId,
      password,
      email: userEmail,
      phone: '+49 99 999999-999',
      isAutoUpdateEnabled: false,
    };

    console.log('🔍 Creating new finAPI user:', {
      environment: 'sandbox',
      userId: finapiUserId,
      email: userEmail,
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

      console.log('🔍 User creation failed - debugging error details:', {
        status: response.status,
        errorText: errorText.substring(0, 200),
        isEntityExists: errorText.includes('ENTITY_EXISTS'),
        isStatus422: response.status === 422,
      });

      // Handle case where user already exists (422 ENTITY_EXISTS)
      if (response.status === 422 && errorText.includes('ENTITY_EXISTS')) {
        console.log('🔍 User already exists in finAPI, attempting to get token...');

        const finapiUserId = this.generateFinapiUserId(companyId);

        // Try multiple passwords in order (new consistent password first, then old ones)
        const passwordsToTry = [
          password, // The new consistent password
          'demo123', // Legacy hardcoded password
        ];

        for (const tryPassword of passwordsToTry) {
          try {
            console.log(
              `🔑 Trying password method: ${tryPassword === password ? 'NEW_CONSISTENT' : 'LEGACY'}`
            );
            const userToken = await this.getUserToken(finapiUserId, tryPassword);

            // Get user details
            const existingUser = await this.getUser(userToken);
            if (existingUser) {
              console.log('✅ Successfully retrieved existing finAPI user with password method:', {
                userId: existingUser.id,
                email: existingUser.email,
                passwordMethod: tryPassword === password ? 'NEW_CONSISTENT' : 'LEGACY',
              });

              return {
                user: existingUser,
                userToken,
              };
            }
          } catch (tokenError: any) {
            console.log(
              `⚠️ Password method failed: ${tryPassword === password ? 'NEW_CONSISTENT' : 'LEGACY'} - ${tokenError.message}`
            );
            // Continue to next password
          }
        }

        console.log('🔍 All password methods failed for existing user');

        // Since we can't delete users in sandbox (403 Access Denied),
        // try creating a user with a timestamped unique ID (max 36 chars)
        console.log(
          '🔄 Cannot delete existing user (403 Access Denied). Trying unique ID strategy...'
        );
        try {
          const timestamp = Date.now().toString();
          // Create shorter unique ID: max 36 chars for finAPI
          const shortCompanyId = companyId.substring(0, 10);
          const uniqueFinapiUserId = `taskilo_${shortCompanyId}_${timestamp}`;

          console.log('🆔 Creating user with unique ID:', {
            uniqueId: uniqueFinapiUserId,
            length: uniqueFinapiUserId.length,
            maxAllowed: 36,
          });

          // Ensure ID is not too long
          if (uniqueFinapiUserId.length > 36) {
            throw new Error(`Generated ID too long: ${uniqueFinapiUserId.length} chars (max 36)`);
          }

          const newUser = await this.createUser(uniqueFinapiUserId, password, userEmail);

          console.log('✅ Successfully created finAPI user with unique ID:', {
            userId: newUser.user.id,
            email: newUser.user.email,
          });

          // Save the new user to Firestore
          await this.saveFinAPIUserToFirestore(companyId, {
            userId: uniqueFinapiUserId,
            userEmail,
            password,
            createdAt: Date.now(),
          });
          console.log('💾 Saved unique finAPI user to Firestore');

          return newUser;
        } catch (uniqueError: any) {
          console.log('⚠️ Unique ID strategy also failed:', uniqueError.message);
        }
      }

      throw new Error(`User creation failed: ${response.status} ${errorText}`);
    }

    const user = await response.json();
    console.log('✅ finAPI user created successfully:', {
      userId: user.id,
      email: user.email,
    });

    // Get user token for the newly created user - use userId not email!
    const userToken = await this.getUserToken(user.id, password);

    // Save the new user to Firestore
    await this.saveFinAPIUserToFirestore(companyId, {
      userId: user.id,
      userEmail,
      password,
      createdAt: Date.now(),
    });
    console.log('💾 Saved finAPI user to Firestore');

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
    console.log('🔍 createUser called with parameters:', {
      userId: userId ? `${userId.substring(0, 10)}...` : 'UNDEFINED',
      password: password ? 'PROVIDED' : 'MISSING',
      email: email || 'UNDEFINED',
      emailValid: email && email.includes('@'),
    });

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
    console.log('🗑️ forceDeleteUser called for userId:', userId);

    try {
      const adminToken = await this.getAdminClientToken();
      console.log('🔍 Got admin token for deletion');

      // Search for user by ID
      console.log('🔍 Searching for user to delete...');
      const response = await fetch(`${this.baseUrl}/api/v2/users?ids=${userId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          Accept: 'application/json',
        },
      });

      console.log('🔍 User search response:', {
        status: response.status,
        ok: response.ok,
      });

      if (response.ok) {
        const searchResult = await response.json();
        console.log('🔍 User search result:', {
          hasUsers: !!searchResult.users,
          userCount: searchResult.users?.length || 0,
          firstUserId: searchResult.users?.[0]?.id,
        });

        if (searchResult.users && searchResult.users.length > 0) {
          const user = searchResult.users[0];
          if (user.id) {
            console.log('🗑️ Attempting to delete user:', user.id);
            const deleteResponse = await fetch(`${this.baseUrl}/api/v2/users/${user.id}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${adminToken}`,
                Accept: 'application/json',
              },
            });

            console.log('🗑️ Delete response:', {
              status: deleteResponse.status,
              ok: deleteResponse.ok,
            });

            if (deleteResponse.ok) {
              console.log(`✅ Force deleted finAPI user: ${userId}`);
            } else {
              const deleteError = await deleteResponse.text();
              console.log(`❌ Delete failed: ${deleteResponse.status} ${deleteError}`);
              throw new Error(`Failed to delete user: ${deleteResponse.status} ${deleteError}`);
            }
          } else {
            console.log('⚠️ User found but no ID available');
          }
        } else {
          console.log('🔍 No user found with that ID (maybe already deleted)');
        }
      } else {
        const searchError = await response.text();
        console.log(`❌ User search failed: ${response.status} ${searchError}`);
        throw new Error(`Failed to search for user: ${response.status} ${searchError}`);
      }
    } catch (error: any) {
      console.log(`⚠️ Could not delete user ${userId}: ${error.message}`);
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
    redirectUrl?: string
  ): Promise<string> {
    try {
      console.log('🔧 Creating finAPI WebForm 2.0...', {
        companyId: companyId.substring(0, 10) + '...',
        bankId,
        userEmail,
        emailValid: userEmail && userEmail.includes('@'),
        emailLength: userEmail?.length || 0,
      });

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

        console.log('🔍 WebForm debug before getOrCreateUser:', {
          userEmail,
          consistentPassword: consistentPassword ? 'GENERATED' : 'MISSING',
          companyId: companyId.substring(0, 10) + '...',
          forceCreate: true,
        });

        const userData = await this.getOrCreateUser(userEmail, consistentPassword, companyId, true);
        if (!userData.user.id) {
          throw new Error(`Could not create/get user for ${userEmail}`);
        }
        userAccessToken = userData.userToken;
        console.log('✅ Using finAPI user for company');
      } catch (error: any) {
        console.log('⚠️ Could not create/get finAPI user:', error.message);
        throw new Error(`Could not create/get finAPI user: ${error.message}`);
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
      const userResult = await this.getOrCreateUser(userEmail, password, companyId);
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
   * Get banks with pagination and search support
   */
  async getBanks(
    options: {
      search?: string;
      page?: number;
      perPage?: number;
      includeTestBanks?: boolean;
    } = {}
  ): Promise<{
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

      // Note: finAPI returns test banks by default in sandbox environment
      // We don't need to filter them here as they are useful for testing

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${clientToken}`,
          Accept: 'application/json',
        },
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
          totalCount: data.banks?.length || 0,
        },
      };
    } catch (error: any) {
      console.error('❌ getBanks failed:', error.message);

      // Return empty result instead of throwing
      return {
        banks: [],
        paging: {
          page: options.page || 1,
          perPage: options.perPage || 20,
          pageCount: 0,
          totalCount: 0,
        },
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
      console.log('🔍 getFinAPIUserFromFirestore - Starting search for companyId:', companyId);

      const admin = (await import('firebase-admin')).default;

      // Check if Firebase Admin is already initialized
      let app;
      try {
        app = admin.app();
        console.log('✅ Using existing Firebase Admin app');
      } catch {
        console.log('⚠️ Firebase Admin not initialized, will be auto-initialized');
        // It will be auto-initialized when we call firestore()
      }

      const db = admin.firestore();
      console.log('🔍 Firestore instance created, querying company document...');

      const companyDoc = await db.collection('companies').doc(companyId).get();
      console.log('🔍 Company document query result:', {
        exists: companyDoc.exists,
        docId: companyDoc.id,
        dataKeys: companyDoc.exists ? Object.keys(companyDoc.data() || {}) : [],
      });

      if (companyDoc.exists) {
        const companyData = companyDoc.data();
        console.log('🔍 Company data retrieved, checking for finapiUser field:', {
          hasFinapiUser: !!companyData?.finapiUser,
          finapiUserKeys: companyData?.finapiUser ? Object.keys(companyData.finapiUser) : [],
          finapiUserId: companyData?.finapiUser?.userId,
          finapiUserEmail: companyData?.finapiUser?.userEmail,
          finapiPassword: companyData?.finapiUser?.password ? '***' : 'MISSING',
          rawFinapiUser: companyData?.finapiUser,
        });

        const finapiUser = companyData?.finapiUser || null;
        console.log('🔍 Returning finapiUser:', !!finapiUser);
        return finapiUser;
      } else {
        console.log('⚠️ Company document does not exist in Firestore');
        return null;
      }
    } catch (error: any) {
      console.log('❌ Error getting finAPI user from Firestore:', {
        error: error.message,
        stack: error.stack?.substring(0, 200),
      });
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
    }
  ): Promise<void> {
    try {
      console.log('💾 Saving finAPI user to Firestore...', {
        companyId: companyId.substring(0, 10) + '...',
        userId: finapiUserData.userId.substring(0, 15) + '...',
        userEmail: finapiUserData.userEmail,
      });

      // Update the company document with finAPI user data
      await db.collection('companies').doc(companyId).update({
        finapiUser: finapiUserData,
        updatedAt: new Date().toISOString(),
        lastModifiedBy: 'finapi-service',
      });

      console.log('✅ finAPI user data saved to Firestore successfully');
    } catch (error: any) {
      console.error('❌ Error saving finAPI user to Firestore:', error.message);
      // Don't throw - this is not critical for WebForm creation
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

  // Security: Only log environment and availability, never actual credentials
  console.log('🔍 createFinAPIService debug:', {
    requestedEnvironment: environment,
    detectedEnvironment,
    defaultClientId: defaultClientId ? 'CONFIGURED' : 'UNDEFINED',
    defaultClientSecret: defaultClientSecret ? 'CONFIGURED' : 'UNDEFINED',
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
