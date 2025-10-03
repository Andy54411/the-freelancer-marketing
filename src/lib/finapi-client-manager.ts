import {
  createConfiguration,
  ServerConfiguration,
  AccountsApi,
  AuthorizationApi,
  BankConnectionsApi,
  BanksApi,
  UsersApi,
  TransactionsApi,
  CategoriesApi,
  LabelsApi,
  NotificationRulesApi,
  PaymentsApi,
  StandingOrdersApi,
  SecuritiesApi,
  Configuration,
} from 'finapi-client';
import { getFinApiBaseUrl, getFinApiCredentials } from './finapi-config';

export type FinAPICredentialType = 'sandbox' | 'admin';

/**
 * Complete finAPI V2 SDK Client Manager
 * Provides all finAPI services with proper authentication and configuration
 */
export class FinAPIClientManager {
  private configuration: Configuration;
  private baseUrl: string;
  private credentialType: FinAPICredentialType;

  constructor(accessToken: string, credentialType: FinAPICredentialType = 'sandbox') {
    this.credentialType = credentialType;
    this.baseUrl = getFinApiBaseUrl(credentialType);

    const server = new ServerConfiguration(this.baseUrl, {});
    this.configuration = createConfiguration({
      baseServer: server,
      authMethods: {
        finapi_auth: {
          accessToken: accessToken,
        },
      },
    });
  }

  // Core APIs
  get auth() {
    return new AuthorizationApi(this.configuration);
  }

  get users() {
    return new UsersApi(this.configuration);
  }

  get banks() {
    return new BanksApi(this.configuration);
  }

  get bankConnections() {
    return new BankConnectionsApi(this.configuration);
  }

  get accounts() {
    return new AccountsApi(this.configuration);
  }

  get transactions() {
    return new TransactionsApi(this.configuration);
  }

  get categories() {
    return new CategoriesApi(this.configuration);
  }

  get labels() {
    return new LabelsApi(this.configuration);
  }

  get notificationRules() {
    return new NotificationRulesApi(this.configuration);
  }

  get payments() {
    return new PaymentsApi(this.configuration);
  }

  get standingOrders() {
    return new StandingOrdersApi(this.configuration);
  }

  get securities() {
    return new SecuritiesApi(this.configuration);
  }

  // Utility methods
  getConfiguration() {
    return this.configuration;
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  getCredentialType() {
    return this.credentialType;
  }

  // Static method to create client with client credentials
  static async createWithClientCredentials(
    credentialType: FinAPICredentialType = 'sandbox'
  ): Promise<FinAPIClientManager> {
    const baseUrl = getFinApiBaseUrl(credentialType);
    const credentials = getFinApiCredentials(credentialType);

    if (!credentials.clientId || !credentials.clientSecret) {
      throw new Error(`finAPI credentials not configured for ${credentialType}`);
    }

    const server = new ServerConfiguration(baseUrl, {});
    const configuration = createConfiguration({
      baseServer: server,
    });

    const authApi = new AuthorizationApi(configuration);

    // Get client credentials token
    const clientToken = await authApi.getToken(
      'client_credentials',
      credentials.clientId,
      credentials.clientSecret
    );

    return new FinAPIClientManager(clientToken.accessToken, credentialType);
  }

  // Create client with user credentials (password grant)
  static async createWithUserCredentials(
    username: string,
    password: string,
    credentialType: FinAPICredentialType = 'sandbox'
  ): Promise<FinAPIClientManager> {
    const baseUrl = getFinApiBaseUrl(credentialType);
    const credentials = getFinApiCredentials(credentialType);

    if (!credentials.clientId || !credentials.clientSecret) {
      throw new Error(`finAPI credentials not configured for ${credentialType}`);
    }

    const server = new ServerConfiguration(baseUrl, {});
    const configuration = createConfiguration({
      baseServer: server,
    });

    const authApi = new AuthorizationApi(configuration);

    // Get user credentials token
    const userToken = await authApi.getToken(
      'password',
      credentials.clientId,
      credentials.clientSecret,
      username,
      password
    );

    return new FinAPIClientManager(userToken.accessToken, credentialType);
  }

  // Refresh access token
  async refreshToken(refreshToken: string): Promise<string> {
    const credentials = getFinApiCredentials(this.credentialType);

    if (!credentials.clientId || !credentials.clientSecret) {
      throw new Error('Missing finAPI credentials');
    }

    const refreshedToken = await this.auth.getToken(
      'refresh_token',
      credentials.clientId,
      credentials.clientSecret,
      undefined,
      undefined,
      refreshToken
    );

    // Update configuration with new token
    const server = new ServerConfiguration(this.baseUrl, {});
    this.configuration = createConfiguration({
      baseServer: server,
      authMethods: {
        finapi_auth: {
          accessToken: refreshedToken.accessToken,
        },
      },
    });

    return refreshedToken.accessToken;
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.users.getAuthorizedUser();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Type definitions for common finAPI operations
export interface FinAPIBankConnection {
  id: number;
  bank: {
    id: number;
    name: string;
    bic?: string;
    blz?: string;
  };
  updateStatus: string;
  accountIds: number[];
  lastSuccessfulUpdate?: string;
  type: string;
}

export interface FinAPIAccount {
  id: number;
  accountName: string;
  iban?: string;
  accountNumber?: string;
  subAccountNumber?: string;
  balance: number;
  availableBalance?: number;
  overdraft?: number;
  overdraftLimit?: number;
  accountCurrency: string;
  accountType: string;
  isNew: boolean;
  isDefault: boolean;
  bankConnection: number;
}

export interface FinAPITransaction {
  id: number;
  parentId?: number;
  accountId: number;
  valueDate: string;
  bankBookingDate: string;
  finapiBookingDate: string;
  amount: number;
  purpose?: string;
  counterpartName?: string;
  counterpartAccountNumber?: string;
  counterpartIban?: string;
  counterpartBlz?: string;
  counterpartBic?: string;
  type: string;
  primanota?: string;
  category?: {
    id: number;
    name: string;
  };
  labels?: Array<{
    id: number;
    name: string;
  }>;
  isPotentialDuplicate: boolean;
  isNew: boolean;
  importDate: string;
}

export interface FinAPICategory {
  id: number;
  name: string;
  parentId?: number;
  parentName?: string;
  isCustom: boolean;
  children?: number[];
}

export interface FinAPILabel {
  id: number;
  name: string;
}

export interface FinAPIPayment {
  id: number;
  accountId: number;
  iban?: string;
  accountNumber?: string;
  blz?: string;
  bic?: string;
  recipientName?: string;
  recipientIban?: string;
  recipientBic?: string;
  clearingAccountId?: string;
  amount: number;
  currency: string;
  purpose?: string;
  sepaPurposeCode?: string;
  status: string;
  bankMessage?: string;
  type: string;
  executionDate?: string;
  instructedExecutionDate?: string;
}

export default FinAPIClientManager;
