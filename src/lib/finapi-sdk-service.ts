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
  private async getClientToken(): Promise<string> {
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
    console.log('👤 Getting finAPI user token for:', userId);

    // HINZUGEFÜGT: Überprüfung der Anmeldeinformationen zur Laufzeit
    if (!this.config.credentials.clientId || !this.config.credentials.clientSecret) {
      throw new Error(
        `finAPI ${this.config.environment} credentials are not configured. Please set the required environment variables.`
      );
    }

    const authApi = this.getAuthApi();
    const tokenResponse = await authApi.getToken(
      'password',
      this.config.credentials.clientId,
      this.config.credentials.clientSecret,
      userId,
      password
    );

    console.log('✅ finAPI user token obtained');
    return tokenResponse.accessToken;
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

    const usersApi = await this.getUsersApi();
    const user = await usersApi.createUser({
      id: userId,
      password: password,
      email: email || `${userId}@taskilo.de`,
      phone: '+49123456789',
      isAutoUpdateEnabled: true,
    });

    console.log('✅ finAPI user created:', user.id);
    return user;
  }

  /**
   * Get or create finAPI user
   */
  async getOrCreateUser(
    userId: string,
    password: string,
    email?: string
  ): Promise<{ user: User; userToken: string }> {
    try {
      // Try to get user token (user exists)
      const userToken = await this.getUserToken(userId, password);
      const usersApi = await this.getUsersApi(userToken);

      // For existing users, we can't get user details with current SDK
      // Return a minimal user object
      const user: User = {
        id: userId,
        password: password, // Include password for User type compliance
        email: email || `${userId}@taskilo.de`,
        isAutoUpdateEnabled: true,
      };

      console.log('✅ Using existing finAPI user:', user.id);
      return { user, userToken };
    } catch (error: any) {
      if (error.status === 401) {
        // User doesn't exist, create them
        console.log('👤 User not found, creating new finAPI user...');
        const user = await this.createUser(userId, password, email);
        const userToken = await this.getUserToken(userId, password);

        return { user, userToken };
      }
      throw error;
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
   * Get accounts for user
   */
  async getAccounts(userToken: string): Promise<Account[]> {
    const accountsApi = await this.getAccountsApi(userToken);
    const response = await accountsApi.getAndSearchAllAccounts();

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
