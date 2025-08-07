// src/lib/finapi-sdk-service.ts
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
 * Modern finAPI SDK Service for Taskilo Banking Integration
 *
 * Features:
 * - Automatic token management and refresh
 * - Error handling and retry logic
 * - Support for both Default and Admin clients
 * - WebForm 2.0 integration ready
 */
export class FinAPISDKService {
  private config: FinAPIConfig;
  private baseUrl: string;
  private serverConfig: ServerConfiguration<Record<string, string>>;
  private clientToken: string | null = null;
  private clientTokenExpiry: Date | null = null;

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
  }

  /**
   * Get client credentials access token
   */
  async getClientToken(): Promise<string> {
    // Return cached token if still valid
    if (this.clientToken && this.clientTokenExpiry && this.clientTokenExpiry > new Date()) {
      return this.clientToken;
    }

    // HINZUGEFÜGT: Überprüfung der Anmeldeinformationen zur Laufzeit, um Build-Fehler zu vermeiden
    if (!this.config.credentials.clientId || !this.config.credentials.clientSecret) {
      throw new Error(
        `finAPI ${this.config.environment} credentials are not configured. Please set the required environment variables.`
      );
    }

    console.log('🔑 Getting new finAPI client token...');

    const authApi = this.getAuthApi();
    const tokenResponse = await authApi.getToken(
      'client_credentials',
      this.config.credentials.clientId,
      this.config.credentials.clientSecret
    );

    this.clientToken = tokenResponse.accessToken;
    // Set expiry to 90% of actual expiry for safety margin
    const expirySeconds = tokenResponse.expiresIn ? tokenResponse.expiresIn * 0.9 : 3600;
    this.clientTokenExpiry = new Date(Date.now() + expirySeconds * 1000);

    console.log('✅ finAPI client token obtained');
    return this.clientToken;
  }

  /**
   * Get user access token
   */
  async getUserToken(userId: string, password: string): Promise<string> {
    console.log('Getting finAPI user token for:', userId);

    // Runtime credential check
    if (!this.config.credentials.clientId || !this.config.credentials.clientSecret) {
      throw new Error(
        `finAPI ${this.config.environment} credentials are not configured. Please set the required environment variables.`
      );
    }

    try {
      const authApi = this.getAuthApi();
      const tokenResponse = await authApi.getToken(
        'password',
        this.config.credentials.clientId,
        this.config.credentials.clientSecret,
        userId,
        password
      );

      console.log('SUCCESS: finAPI user token obtained for:', userId);
      return tokenResponse.accessToken;
    } catch (error: any) {
      console.error('FAILED: Could not get user token for:', userId);
      console.error('Error details:', error.body || error.message);
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

  // Public API Methods

  /**
   * Test client credentials
   */
  async testCredentials(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const token = await this.getClientToken();
      return { success: true, token: `${token.substring(0, 20)}...` };
    } catch (error: any) {
      console.error('❌ finAPI credential test failed:', error);
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
    console.log('👤 Creating finAPI user:', userId);
    console.log('🔑 Using consistent password for user:', userId);

    try {
      const usersApi = await this.getUsersApi();
      const user = await usersApi.createUser({
        id: userId,
        password: password,
        email: email || `${userId}@taskilo.de`,
        phone: '+49123456789',
        isAutoUpdateEnabled: true,
      });

      console.log('✅ New finAPI user created:', user.id);
      return user;
    } catch (error: any) {
      console.log('⚠️ User creation failed:', error.status, error.message);

      // User already exists - this is actually OK for our use case
      if (error.status === 422 && error.message?.includes('already exists')) {
        console.log('ℹ️ User already exists, will attempt authentication');
        // Return a minimal user object
        return {
          id: userId,
          password: password,
          email: email || `${userId}@taskilo.de`,
          isAutoUpdateEnabled: true,
        };
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Get or create finAPI user with robust error handling
   * This creates a technical finAPI user account - the actual user only logs into their BANK, not finAPI!
   */
  async getOrCreateUser(
    userId: string,
    password: string,
    email?: string
  ): Promise<{ user: User; userToken: string }> {
    console.log('👤 Getting or creating technical finAPI user account for:', userId);
    console.log(
      'ℹ️ Note: This is only a technical account - user will login to their BANK, not finAPI'
    );

    // Step 1: Try to authenticate existing user first (more common scenario)
    try {
      console.log('� Step 1: Trying to authenticate existing user:', userId);
      const userToken = await this.getUserToken(userId, password);

      // User exists and authentication successful
      const user: User = {
        id: userId,
        password: 'XXXXX', // finAPI standard for password display
        email: email || `${userId}@taskilo.de`,
        isAutoUpdateEnabled: true,
      };

      console.log('✅ Successfully authenticated existing finAPI user:', userId);
      return { user, userToken };
    } catch (authError: any) {
      console.log('ℹ️ User authentication failed (user might not exist):', authError.status);

      // Step 2: If authentication fails because user doesn't exist, try to create
      if (authError.status === 400 || authError.status === 401 || authError.status === 404) {
        try {
          console.log('� Step 2: Creating new finAPI user:', userId);
          const user = await this.createUser(userId, password, email);

          // Get token for newly created user
          console.log('🔑 Getting authentication token for new user');
          const userToken = await this.getUserToken(userId, password);

          console.log('✅ New finAPI user created and authenticated:', userId);
          return { user, userToken };
        } catch (createError: any) {
          console.error('❌ User creation failed after authentication failure:', {
            status: createError.status,
            message: createError.message,
          });

          // If creation also fails, provide detailed error
          throw new Error(
            `Failed to create finAPI user '${userId}' after authentication failed. ` +
              `Status: ${createError.status}, Message: ${createError.message || 'Unknown creation error'}`
          );
        }
      }

      // Step 3: If it's a different authentication error, provide detailed info
      console.error('❌ Unexpected user authentication error:', {
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
   * List available banks (Public API - no user token required)
   */
  async listBanks(search?: string, location?: string, page = 1, perPage = 20): Promise<Bank[]> {
    console.log('🏦 Listing banks with client credentials...');

    // Use client token only for public banks listing
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

    console.log(`✅ Found ${response.banks?.length || 0} banks`);
    return response.banks || [];
  }

  /**
   * List available banks for specific user
   */
  async listBanksForUser(
    userToken: string,
    search?: string,
    location?: string,
    page = 1,
    perPage = 20
  ): Promise<Bank[]> {
    console.log('🏦 Listing banks for user...');

    const banksApi = await this.getBanksApi(userToken);
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

    return response.banks || [];
  }

  /**
   * Get bank connections for user
   */
  async getBankConnections(userToken: string): Promise<BankConnection[]> {
    const connectionsApi = await this.getBankConnectionsApi(userToken);
    const response = await connectionsApi.getAllBankConnections();

    return response.connections || [];
  }

  /**
   * Get single bank connection by ID
   */
  async getBankConnection(userToken: string, connectionId: string): Promise<BankConnection | null> {
    const connectionsApi = await this.getBankConnectionsApi(userToken);
    try {
      const connection = await connectionsApi.getBankConnection(parseInt(connectionId));
      return connection;
    } catch (error) {
      console.error('❌ Failed to get bank connection:', connectionId, error);
      return null;
    }
  }

  /**
   * Get accounts for user
   */
  async getAccounts(userToken: string, accountIds?: number[]): Promise<Account[]> {
    const accountsApi = await this.getAccountsApi(userToken);
    const response = await accountsApi.getAndSearchAllAccounts(
      undefined, // view
      accountIds ? accountIds.join(',') : undefined // ids filter
    );

    return response.accounts || [];
  }

  /**
   * Create WebForm 2.0 for bank connection import
   */
  async createBankImportWebForm(
    userToken: string,
    options: {
      bankId?: number;
      callbacks?: {
        successCallback?: string;
        errorCallback?: string;
      };
      redirectUrl?: string;
    } = {}
  ): Promise<{ id: string; url: string; expiresAt?: string }> {
    console.log('🌐 Creating WebForm 2.0 for bank import...');

    // Use raw fetch for WebForm 2.0 as SDK might not support it yet
    const response = await fetch(`${this.baseUrl}/api/webForms/bankConnectionImport`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
    console.log('✅ WebForm 2.0 created:', webFormData.url);

    return {
      id: webFormData.id,
      url: webFormData.url,
      expiresAt: webFormData.expiresAt,
    };
  }
}

// Factory functions for different credential types
export function createFinAPIService(
  environment: 'sandbox' | 'production' = 'sandbox'
): FinAPISDKService {
  let credentials: FinAPICredentials;

  if (environment === 'sandbox') {
    const clientId = process.env.FINAPI_SANDBOX_CLIENT_ID?.trim() || '';
    const clientSecret = process.env.FINAPI_SANDBOX_CLIENT_SECRET?.trim() || '';
    const dataDecryptionKey = process.env.FINAPI_SANDBOX_DATA_DECRYPTION_KEY?.trim();

    // ENTFERNT: Fehler wird jetzt zur Laufzeit in den API-Methoden ausgelöst, nicht beim Build.
    // Die Überprüfung findet jetzt in `getClientToken` und `getUserToken` statt.

    credentials = {
      clientId,
      clientSecret,
      dataDecryptionKey,
    };
  } else {
    const clientId = process.env.FINAPI_PRODUCTION_CLIENT_ID?.trim() || '';
    const clientSecret = process.env.FINAPI_PRODUCTION_CLIENT_SECRET?.trim() || '';
    const dataDecryptionKey = process.env.FINAPI_PRODUCTION_DATA_DECRYPTION_KEY?.trim();

    // ENTFERNT: Fehler wird jetzt zur Laufzeit in den API-Methoden ausgelöst, nicht beim Build.

    credentials = {
      clientId,
      clientSecret,
      dataDecryptionKey,
    };
  }

  return new FinAPISDKService({
    credentials,
    environment,
  });
}

export function createFinAPIAdminService(
  environment: 'sandbox' | 'production' = 'sandbox'
): FinAPISDKService {
  let credentials: FinAPICredentials;

  if (environment === 'sandbox') {
    const clientId = process.env.FINAPI_ADMIN_CLIENT_ID?.trim() || '';
    const clientSecret = process.env.FINAPI_ADMIN_CLIENT_SECRET?.trim() || '';
    const dataDecryptionKey = process.env.FINAPI_ADMIN_DATA_DECRYPTION_KEY?.trim();

    // ENTFERNT: Fehler wird jetzt zur Laufzeit in den API-Methoden ausgelöst, nicht beim Build.

    credentials = {
      clientId,
      clientSecret,
      dataDecryptionKey,
    };
  } else {
    const clientId = process.env.FINAPI_ADMIN_PRODUCTION_CLIENT_ID?.trim() || '';
    const clientSecret = process.env.FINAPI_ADMIN_PRODUCTION_CLIENT_SECRET?.trim() || '';
    const dataDecryptionKey = process.env.FINAPI_ADMIN_PRODUCTION_DATA_DECRYPTION_KEY?.trim();

    // ENTFERNT: Fehler wird jetzt zur Laufzeit in den API-Methoden ausgelöst, nicht beim Build.

    credentials = {
      clientId,
      clientSecret,
      dataDecryptionKey,
    };
  }

  return new FinAPISDKService({
    credentials,
    environment,
  });
}

// Default exports
export const finapiService = createFinAPIService('sandbox');
export const finapiAdminService = createFinAPIAdminService('sandbox');
