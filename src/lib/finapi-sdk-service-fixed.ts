// src/lib/finapi-sdk-service-fixed.ts
import {
  AuthorizationApi,
  UsersApi,
  BanksApi,
  BankConnectionsApi,
  AccountsApi,
  TransactionsApi,
  createConfiguration,
  ServerConfiguration,
  type User,
  type Bank,
  type BankConnection,
  type Account,
} from 'finapi-client';

export interface FinAPICredentials {
  clientId: string;
  clientSecret: string;
  dataDecryptionKey?: string;
}

export interface FinAPIConfig {
  credentials: FinAPICredentials;
  environment: 'sandbox' | 'production';
  baseUrl?: string;
}

/**
 * Fixed finAPI SDK Service for Taskilo Banking Integration
 * Features:
 * - Clean logging without emojis
 * - Proper user existence detection
 * - Robust error handling for password conflicts
 */
export class FinAPISDKServiceFixed {
  private config: FinAPIConfig;
  private adminConfig: FinAPIConfig; // NEW: Admin client for user management
  private baseUrl: string;
  private serverConfig: ServerConfiguration<Record<string, string>>;
  private adminServerConfig: ServerConfiguration<Record<string, string>>; // NEW: Admin server config
  private clientToken: string | null = null;
  private clientTokenExpiry: Date | null = null;
  private adminClientToken: string | null = null; // NEW: Admin client token
  private adminClientTokenExpiry: Date | null = null;

  // API Instances (lazy loaded)
  private _authApi: AuthorizationApi | null = null;
  private _usersApi: UsersApi | null = null;
  private _banksApi: BanksApi | null = null;
  private _bankConnectionsApi: BankConnectionsApi | null = null;
  private _accountsApi: AccountsApi | null = null;
  private _transactionsApi: TransactionsApi | null = null;

  constructor(config: FinAPIConfig) {
    this.config = config;
    this.baseUrl =
      config.baseUrl ||
      (config.environment === 'production' ? 'https://finapi.io' : 'https://sandbox.finapi.io');

    this.serverConfig = new ServerConfiguration(this.baseUrl, {});

    // Initialize admin client configuration
    this.adminConfig = {
      credentials: {
        clientId: process.env.FINAPI_SANDBOX_ADMIN_CLIENT_ID!,
        clientSecret: process.env.FINAPI_SANDBOX_ADMIN_CLIENT_SECRET!,
        dataDecryptionKey: process.env.FINAPI_SANDBOX_ADMIN_DATA_DECRYPTION_KEY,
      },
      environment: config.environment,
      baseUrl: config.baseUrl,
    };
    this.adminServerConfig = new ServerConfiguration(this.baseUrl, {});
  }

  /**
   * Get client credentials access token
   */
  async getClientToken(): Promise<string> {
    if (this.clientToken && this.clientTokenExpiry && this.clientTokenExpiry > new Date()) {
      return this.clientToken;
    }

    if (!this.config.credentials.clientId || !this.config.credentials.clientSecret) {
      throw new Error(
        `finAPI ${this.config.environment} credentials are not configured. Please set the required environment variables.`
      );
    }

    console.log('Getting new finAPI client token...');

    const authApi = this.getAuthApi();
    const tokenResponse = await authApi.getToken(
      'client_credentials',
      this.config.credentials.clientId,
      this.config.credentials.clientSecret
    );

    this.clientToken = tokenResponse.accessToken;
    const expirySeconds = tokenResponse.expiresIn ? tokenResponse.expiresIn * 0.9 : 3600;
    this.clientTokenExpiry = new Date(Date.now() + expirySeconds * 1000);

    console.log('SUCCESS: finAPI client token obtained');
    return this.clientToken;
  }

  /**
   * Get admin client credentials access token for user management
   */
  async getAdminClientToken(): Promise<string> {
    if (
      this.adminClientToken &&
      this.adminClientTokenExpiry &&
      this.adminClientTokenExpiry > new Date()
    ) {
      return this.adminClientToken;
    }

    if (!this.adminConfig.credentials.clientId || !this.adminConfig.credentials.clientSecret) {
      throw new Error('finAPI admin credentials are not configured.');
    }

    console.log('Getting new finAPI admin client token...');

    const authApi = new AuthorizationApi(
      createConfiguration({
        baseServer: this.adminServerConfig,
      })
    );

    const tokenResponse = await authApi.getToken(
      'client_credentials',
      this.adminConfig.credentials.clientId,
      this.adminConfig.credentials.clientSecret
    );

    this.adminClientToken = tokenResponse.accessToken;
    const expirySeconds = tokenResponse.expiresIn ? tokenResponse.expiresIn * 0.9 : 3600;
    this.adminClientTokenExpiry = new Date(Date.now() + expirySeconds * 1000);

    console.log('SUCCESS: finAPI admin client token obtained');
    return this.adminClientToken;
  }

  /**
   * Get user access token
   */
  async getUserToken(userId: string, password: string): Promise<string> {
    console.log('Getting finAPI user token for:', userId);

    if (!this.adminConfig.credentials.clientId || !this.adminConfig.credentials.clientSecret) {
      throw new Error('finAPI admin credentials are not configured for user token generation.');
    }

    try {
      const authApi = this.getAuthApi();

      // DEBUG: Log the request details
      console.log('DEBUG: Token request details:', {
        grant_type: 'password',
        client_id: this.adminConfig.credentials.clientId.substring(0, 10) + '...',
        username: userId,
        environment: this.config.environment,
      });

      const tokenResponse = await authApi.getToken(
        'password',
        this.adminConfig.credentials.clientId, // Use admin client for user token generation
        this.adminConfig.credentials.clientSecret,
        userId,
        password
      );

      console.log('SUCCESS: finAPI user token obtained for:', userId);
      return tokenResponse.accessToken;
    } catch (error: any) {
      console.error('FAILED: Could not get user token for:', userId);
      console.error('Error details:', error.body || error.message);

      // More detailed error analysis
      if (error.body && error.body.errors) {
        for (const err of error.body.errors) {
          console.error('finAPI Error:', err.code, '-', err.message);
        }
      }

      throw error;
    }
  }

  /**
   * Create authenticated configuration for API calls
   */
  private async createAuthenticatedConfig(userToken?: string): Promise<any> {
    const token = userToken || (await this.getClientToken());

    return createConfiguration({
      baseServer: this.serverConfig,
      authMethods: {
        finapi_auth: {
          accessToken: token,
        },
      },
    });
  }

  // Lazy loaded API getters
  private getAuthApi(): AuthorizationApi {
    if (!this._authApi) {
      const config = createConfiguration({ baseServer: this.serverConfig });
      this._authApi = new AuthorizationApi(config);
    }
    return this._authApi;
  }

  private async getUsersApi(userToken?: string): Promise<UsersApi> {
    const config = await this.createAuthenticatedConfig(userToken);
    return new UsersApi(config);
  }

  private async getBanksApi(userToken?: string): Promise<BanksApi> {
    const config = await this.createAuthenticatedConfig(userToken);
    return new BanksApi(config);
  }

  private async getBankConnectionsApi(userToken?: string): Promise<BankConnectionsApi> {
    const config = await this.createAuthenticatedConfig(userToken);
    return new BankConnectionsApi(config);
  }

  private async getAccountsApi(userToken?: string): Promise<AccountsApi> {
    const config = await this.createAuthenticatedConfig(userToken);
    return new AccountsApi(config);
  }

  private async getTransactionsApi(userToken?: string): Promise<TransactionsApi> {
    const config = await this.createAuthenticatedConfig(userToken);
    return new TransactionsApi(config);
  }

  /**
   * Test client credentials
   */
  async testCredentials(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const token = await this.getClientToken();
      return { success: true, token: `${token.substring(0, 20)}...` };
    } catch (error: any) {
      console.error('ERROR: finAPI credential test failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Create finAPI user for Taskilo user
   */
  async createUser(userId: string, password: string, email?: string): Promise<User> {
    console.log('Creating finAPI user:', userId);

    try {
      const usersApi = await this.getUsersApi();
      const user = await usersApi.createUser({
        id: userId,
        password: password,
        email: email || `${userId}@taskilo.de`,
        phone: '+49123456789',
        isAutoUpdateEnabled: true,
      });

      console.log('SUCCESS: New finAPI user created:', user.id);
      return user;
    } catch (error: any) {
      console.log('WARNING: User creation failed:', error.status, error.message);

      // User already exists - this is actually OK for our use case
      if (error.status === 422 && error.message?.includes('already exists')) {
        console.log('INFO: User already exists, will attempt authentication');
        return {
          id: userId,
          password: password,
          email: email || `${userId}@taskilo.de`,
          isAutoUpdateEnabled: true,
        };
      }

      throw error;
    }
  }

  /**
   * Get or create finAPI user with proper error handling
   * This creates a technical finAPI user account - the actual user only logs into their BANK, not finAPI!
   */
  async getOrCreateUser(
    userId: string,
    password: string,
    email?: string
  ): Promise<{ user: User; userToken: string }> {
    console.log('Getting or creating technical finAPI user account for:', userId);
    console.log(
      'NOTE: This is only a technical account - user will login to their BANK, not finAPI'
    );

    // Step 1: Try to authenticate existing user first
    try {
      console.log('STEP 1: Trying to authenticate existing user:', userId);
      const userToken = await this.getUserToken(userId, password);

      // User exists and authentication successful
      const user: User = {
        id: userId,
        password: 'XXXXX', // finAPI standard for password display
        email: email || `${userId}@taskilo.de`,
        isAutoUpdateEnabled: true,
      };

      console.log('SUCCESS: Successfully authenticated existing finAPI user:', userId);
      return { user, userToken };
    } catch (authError: any) {
      console.log('INFO: Authentication failed, checking error type');

      // For "Bad credentials", the user likely doesn't exist yet - try to create
      const errorMessage = authError.message || '';
      const isBadCredentials =
        errorMessage.includes('Bad credentials') || errorMessage.includes('UNAUTHORIZED_ACCESS');

      if (isBadCredentials) {
        try {
          console.log(
            'STEP 2: Bad credentials likely means user not found, creating new user:',
            userId
          );
          const user = await this.createUser(userId, password, email);

          // Wait a moment for user creation to be fully processed
          console.log('Waiting for user creation to be processed...');
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Try multiple approaches for getting user token
          console.log('Getting authentication token for new user');
          let userToken: string;

          try {
            // Approach 1: Normal user token request
            userToken = await this.getUserToken(userId, password);
          } catch (tokenError: any) {
            console.log('Normal token request failed, trying with fresh client token...');

            // Approach 2: Refresh client token and try again
            this.clientToken = null; // Force refresh
            await this.getClientToken(); // Get fresh client token

            try {
              userToken = await this.getUserToken(userId, password);
            } catch (tokenError2: any) {
              console.error('Both token approaches failed:', tokenError2.message);
              throw new Error(
                `User was created successfully but token retrieval failed. ` +
                  `This might be a client permissions issue. Original error: ${tokenError.message}`
              );
            }
          }

          console.log('SUCCESS: New finAPI user created and authenticated:', userId);
          return { user, userToken };
        } catch (createError: any) {
          // If creation fails with "already exists", then we have a password mismatch
          if (createError.status === 422 && createError.message?.includes('already exists')) {
            console.error('ERROR: User exists but password mismatch for:', userId);
            throw new Error(
              `finAPI user '${userId}' exists but authentication failed. ` +
                `The user was created with a different password. Since finAPI doesn't allow ` +
                `password updates, you need to use a different user ID or contact support.`
            );
          }

          console.error('ERROR: User creation failed after authentication failure:', {
            status: createError.status,
            message: createError.message,
          });

          throw new Error(
            `Failed to create finAPI user '${userId}' after authentication failed. ` +
              `Status: ${createError.status}, Message: ${createError.message || 'Unknown creation error'}`
          );
        }
      }

      // For other authentication errors, provide detailed info
      console.error('ERROR: Unexpected user authentication error:', {
        status: authError.status,
        message: authError.message,
      });

      throw new Error(
        `Failed to authenticate finAPI user '${userId}'. Status: ${authError.status}, ` +
          `Message: ${authError.message || 'Unknown authentication error'}`
      );
    }
  }

  /**
   * Create WebForm 2.0 for bank connection import
   * Uses client token instead of user token as fallback
   */
  async createBankImportWebForm(
    userTokenOrUserId: string,
    options: {
      bankId?: number;
      callbacks?: {
        successCallback?: string;
        errorCallback?: string;
      };
      redirectUrl?: string;
    } = {}
  ): Promise<{ id: string; url: string; expiresAt?: string }> {
    console.log('Creating WebForm 2.0 for bank import...');

    let authToken = userTokenOrUserId;

    // If it's null/undefined or looks like a userId (not a token), use client token instead
    if (!userTokenOrUserId || userTokenOrUserId.startsWith('taskilo_')) {
      console.log('Using client token for WebForm since user token failed or userId provided');
      authToken = await this.getClientToken();
    }

    // Use raw fetch for WebForm 2.0 as SDK might not support it yet
    const response = await fetch(`${this.baseUrl}/api/v2/webForms`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'bankConnectionImport',
        bankId: options.bankId,
        callbacks: options.callbacks,
        redirectUrl: options.redirectUrl,
        profileId: undefined, // Use default profile
        accountTypes: ['CHECKING', 'SAVINGS'], // Focus on main account types
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WebForm creation failed: ${errorText}`);
    }

    const webFormData = await response.json();
    console.log('SUCCESS: WebForm 2.0 created:', webFormData.url);

    return {
      id: webFormData.id,
      url: webFormData.url,
      expiresAt: webFormData.expiresAt,
    };
  }

  // Other methods remain the same as original...
  async listBanks(search?: string, location?: string, page = 1, perPage = 20): Promise<Bank[]> {
    console.log('Listing banks with client credentials...');

    const banksApi = await this.getBanksApi();
    const response = await banksApi.getAndSearchAllBanks(
      undefined, // ids
      search,
      undefined, // isSupported
      undefined, // pinsAreVolatile
      undefined, // supportedDataSources
      undefined, // location (number[] not supported in current search)
      true, // includeTestBanks for sandbox
      page,
      perPage
    );

    console.log(`SUCCESS: Found ${response.banks?.length || 0} banks`);
    return response.banks || [];
  }
}

// Factory functions
export function createFixedFinAPIService(
  environment: 'sandbox' | 'production' = 'sandbox'
): FinAPISDKServiceFixed {
  let credentials: FinAPICredentials;

  if (environment === 'sandbox') {
    const clientId = process.env.FINAPI_SANDBOX_CLIENT_ID?.trim() || '';
    const clientSecret = process.env.FINAPI_SANDBOX_CLIENT_SECRET?.trim() || '';
    const dataDecryptionKey = process.env.FINAPI_SANDBOX_DATA_DECRYPTION_KEY?.trim();

    credentials = {
      clientId,
      clientSecret,
      dataDecryptionKey,
    };
  } else {
    const clientId = process.env.FINAPI_PRODUCTION_CLIENT_ID?.trim() || '';
    const clientSecret = process.env.FINAPI_PRODUCTION_CLIENT_SECRET?.trim() || '';
    const dataDecryptionKey = process.env.FINAPI_PRODUCTION_DATA_DECRYPTION_KEY?.trim();

    credentials = {
      clientId,
      clientSecret,
      dataDecryptionKey,
    };
  }

  return new FinAPISDKServiceFixed({
    credentials,
    environment,
  });
}

// Default exports
export const finapiServiceFixed = createFixedFinAPIService('sandbox');
