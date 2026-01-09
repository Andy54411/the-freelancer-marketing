/**
 * finAPI Service für Taskilo Banking Integration
 *
 * Environment Variables:
 * - FINAPI_SANDBOX_CLIENT_ID
 * - FINAPI_SANDBOX_CLIENT_SECRET
 * - FINAPI_SANDBOX_DATA_DECRYPTION_KEY
 * - FINAPI_ADMIN_CLIENT_ID
 * - FINAPI_ADMIN_CLIENT_SECRET
 * - FINAPI_ADMIN_DATA_DECRYPTION_KEY
 */

export interface FinAPIConfig {
  clientId: string;
  clientSecret: string;
  dataDecryptionKey: string;
  baseUrl: string;
  environment: 'sandbox' | 'production';
}

export interface FinAPIToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface FinAPIAccount {
  id: number;
  bankConnectionId: number;
  accountName: string;
  iban?: string;
  accountNumber?: string;
  subAccountNumber?: string;
  accountHolderName?: string;
  accountCurrency: string;
  accountType: string;
  balance?: number;
  overdraft?: number;
  overdraftLimit?: number;
  availableFunds?: number;
  isNew: boolean;
  isSepaAccount: boolean;
  isMoneyTransferAccount: boolean;
  lastSuccessfulUpdate?: string;
  lastUpdateAttempt?: string;
}

export interface FinAPITransaction {
  id: number;
  parentId?: number;
  accountId: number;
  valueDate: string;
  bankBookingDate: string;
  finapiBookingDate: string;
  amount: number;
  currency: string;
  purpose?: string;
  counterpartName?: string;
  counterpartAccountNumber?: string;
  counterpartIban?: string;
  counterpartBankName?: string;
  type: string;
  typeCodeZka?: string;
  typeCodeSwift?: string;
  sepaPurposeCode?: string;
  primanota?: string;
  category?: {
    id: number;
    name: string;
    parentName?: string;
  };
  labels?: Array<{
    id: number;
    name: string;
  }>;
  isPotentialDuplicate: boolean;
  isAdjustingEntry: boolean;
  isNew: boolean;
  importDate: string;
}

export interface FinAPIBankConnection {
  id: number;
  bankId: number;
  name?: string;
  bankingUserId?: string;
  bankingCustomerId?: string;
  bankingPin?: string;
  type: string;
  updateStatus: string;
  categorizationStatus: string;
  lastManualUpdate?: {
    timestamp: string;
    result: string;
  };
  lastAutoUpdate?: {
    timestamp: string;
    result: string;
  };
  ibanOnlyMoneyTransferSupported: boolean;
  ibanOnlyDirectDebitSupported: boolean;
  collectiveMoneyTransferSupported: boolean;
  defaultTwoStepProcedureId?: string;
  twoStepProcedures?: Array<{
    procedureId: string;
    procedureName: string;
    procedureChallengeType: string;
    implicitExecute: boolean;
  }>;
  interfaces?: Array<{
    interfaceType: string;
    loginCredentials: Array<{
      label: string;
      value?: string;
    }>;
    defaultTwoStepProcedureId?: string;
    twoStepProcedures?: Array<{
      procedureId: string;
      procedureName: string;
      procedureChallengeType: string;
      implicitExecute: boolean;
    }>;
    aisConsent?: {
      status: string;
      expiresAt?: string;
    };
  }>;
  accountIds: number[];
  owners?: Array<{
    firstName?: string;
    lastName?: string;
    salutation?: string;
    title?: string;
    email?: string;
    dateOfBirth?: string;
    postCode?: string;
    country?: string;
    city?: string;
    street?: string;
    houseNumber?: string;
  }>;
}

export class FinAPIService {
  private config: FinAPIConfig;
  private token: FinAPIToken | null = null;

  constructor(useAdminAccess = false) {
    // Environment Variables laden
    const environment = process.env.FINAPI_ENVIRONMENT || 'sandbox';

    if (useAdminAccess) {
      this.config = {
        clientId: process.env.FINAPI_ADMIN_CLIENT_ID || '',
        clientSecret: process.env.FINAPI_ADMIN_CLIENT_SECRET || '',
        dataDecryptionKey: process.env.FINAPI_ADMIN_DATA_DECRYPTION_KEY || '',
        baseUrl: environment === 'sandbox' ? 'https://sandbox.finapi.io' : 'https://finapi.io',
        environment: environment as 'sandbox' | 'production',
      };
    } else {
      this.config = {
        clientId: process.env.FINAPI_SANDBOX_CLIENT_ID || '',
        clientSecret: process.env.FINAPI_SANDBOX_CLIENT_SECRET || '',
        dataDecryptionKey:
          process.env.FINAPI_SANDBOX_DATA_DECRYPTION_KEY || 'eb8c7cd129dc2eee8e31a4098fba4921',
        baseUrl: 'https://sandbox.finapi.io',
        environment: 'sandbox',
      };
    }
  }

  private async authenticate(): Promise<FinAPIToken> {
    const response = await fetch(`${this.config.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`finAPI Authentifizierung fehlgeschlagen: ${error}`);
    }

    this.token = await response.json();
    return this.token!;
  }

  private async ensureAuthenticated(): Promise<string> {
    if (!this.token) {
      await this.authenticate();
    }
    return this.token!.access_token;
  }

  private async apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const accessToken = await this.ensureAuthenticated();

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`finAPI Anfrage fehlgeschlagen: ${error}`);
    }

    return response.json();
  }

  // User Management
  async createUser(id: string, password: string, email?: string): Promise<any> {
    return this.apiRequest('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify({
        id,
        password,
        email,
        phone: null,
        isAutoUpdateEnabled: true,
      }),
    });
  }

  async getUser(): Promise<any> {
    return this.apiRequest('/api/v1/users');
  }

  // Bank Connections
  async getBankConnections(): Promise<{ connections: FinAPIBankConnection[] }> {
    return this.apiRequest('/api/v1/bankConnections');
  }

  async createBankConnection(
    bankId: number,
    loginCredentials: Array<{ label: string; value: string }>,
    interfaceType?: string
  ): Promise<FinAPIBankConnection> {
    return this.apiRequest('/api/v1/bankConnections', {
      method: 'POST',
      body: JSON.stringify({
        bankId,
        loginCredentials,
        interface: interfaceType || 'FINTS_SERVER',
        storeSecrets: true,
        skipPositionsDownload: false,
        loadOwnerData: true,
        maxDaysForDownload: 3650,
        accountTypes: [
          'Girokonto',
          'Sparkonto',
          'Kreditkartenkonto',
          'Bausparkonto',
          'Versicherungskonto',
        ],
      }),
    });
  }

  async updateBankConnection(connectionId: number): Promise<FinAPIBankConnection> {
    return this.apiRequest(`/api/v1/bankConnections/${connectionId}/update`, {
      method: 'POST',
      body: JSON.stringify({
        accountTypes: ['Girokonto', 'Sparkonto', 'Kreditkartenkonto', 'Bausparkonto'],
        skipPositionsDownload: false,
        loadOwnerData: true,
        maxDaysForDownload: 89,
      }),
    });
  }

  async deleteBankConnection(connectionId: number): Promise<void> {
    await this.apiRequest(`/api/v1/bankConnections/${connectionId}`, {
      method: 'DELETE',
    });
  }

  // Accounts
  async getAccounts(): Promise<{ accounts: FinAPIAccount[] }> {
    return this.apiRequest('/api/v1/accounts');
  }

  async getAccount(accountId: number): Promise<FinAPIAccount> {
    return this.apiRequest(`/api/v1/accounts/${accountId}`);
  }

  // Transactions
  async getTransactions(params?: {
    accountIds?: number[];
    minBankBookingDate?: string;
    maxBankBookingDate?: string;
    page?: number;
    perPage?: number;
    order?: string[];
  }): Promise<{ transactions: FinAPITransaction[]; paging: any }> {
    const searchParams = new URLSearchParams();

    if (params?.accountIds) {
      searchParams.append('accountIds', params.accountIds.join(','));
    }
    if (params?.minBankBookingDate) {
      searchParams.append('minBankBookingDate', params.minBankBookingDate);
    }
    if (params?.maxBankBookingDate) {
      searchParams.append('maxBankBookingDate', params.maxBankBookingDate);
    }
    if (params?.page) {
      searchParams.append('page', params.page.toString());
    }
    if (params?.perPage) {
      searchParams.append('perPage', params.perPage.toString());
    }
    if (params?.order) {
      params.order.forEach(orderItem => {
        searchParams.append('order', orderItem);
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/api/v1/transactions${queryString ? `?${queryString}` : ''}`;

    return this.apiRequest(endpoint);
  }

  async getTransaction(transactionId: number): Promise<FinAPITransaction> {
    return this.apiRequest(`/api/v1/transactions/${transactionId}`);
  }

  // Categories
  async getCategories(): Promise<{ categories: any[] }> {
    return this.apiRequest('/api/v1/categories');
  }

  // Banks
  async searchBanks(search: string): Promise<{ banks: any[] }> {
    const searchParams = new URLSearchParams({ search });
    return this.apiRequest(`/api/v1/banks?${searchParams}`);
  }

  async getBank(bankId: number): Promise<any> {
    return this.apiRequest(`/api/v1/banks/${bankId}`);
  }

  // Utility Methods
  async testConnection(): Promise<{ status: string; message: string }> {
    try {
      await this.ensureAuthenticated();
      const _user = await this.getUser();
      return {
        status: 'success',
        message: `Verbindung erfolgreich. Environment: ${this.config.environment}`,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Verbindungsfehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
      };
    }
  }

  // Convert finAPI data to internal format
  convertAccount(finApiAccount: FinAPIAccount): any {
    return {
      id: finApiAccount.id.toString(),
      name: finApiAccount.accountName,
      iban: finApiAccount.iban,
      accountNumber: finApiAccount.accountNumber,
      holderName: finApiAccount.accountHolderName,
      balance: finApiAccount.balance || 0,
      currency: finApiAccount.accountCurrency,
      type: finApiAccount.accountType,
      isActive: true,
      lastSync: finApiAccount.lastSuccessfulUpdate
        ? new Date(finApiAccount.lastSuccessfulUpdate)
        : new Date(),
      provider: 'finAPI',
      connectionId: finApiAccount.bankConnectionId.toString(),
    };
  }

  convertTransaction(finApiTransaction: FinAPITransaction): any {
    return {
      id: finApiTransaction.id.toString(),
      accountId: finApiTransaction.accountId.toString(),
      amount: finApiTransaction.amount,
      currency: finApiTransaction.currency,
      type: finApiTransaction.amount >= 0 ? 'income' : 'expense',
      description: finApiTransaction.purpose || 'Keine Beschreibung',
      purpose: finApiTransaction.purpose || '',
      counterpartyName: finApiTransaction.counterpartName,
      counterpartyIban: finApiTransaction.counterpartIban,
      bookingDate: new Date(finApiTransaction.bankBookingDate),
      valueDate: new Date(finApiTransaction.valueDate),
      category: finApiTransaction.category?.name,
      isReconciled: false,
      reference: finApiTransaction.primanota,
      provider: 'finAPI',
      finApiId: finApiTransaction.id,
    };
  }

  // High-level integration methods
  async syncAccountsAndTransactions(_companyId: string): Promise<{
    accounts: any[];
    transactions: any[];
    success: boolean;
    message: string;
  }> {
    try {
      // Get accounts
      const accountsResponse = await this.getAccounts();
      const accounts = accountsResponse.accounts.map(acc => this.convertAccount(acc));

      // Get transactions for last 90 days
      const minDate = new Date();
      minDate.setDate(minDate.getDate() - 90);

      const transactionsResponse = await this.getTransactions({
        minBankBookingDate: minDate.toISOString().split('T')[0],
        perPage: 500,
        order: ['-bankBookingDate'],
      });

      const transactions = transactionsResponse.transactions.map(tx => this.convertTransaction(tx));

      return {
        accounts,
        transactions,
        success: true,
        message: `${accounts.length} Konten und ${transactions.length} Transaktionen synchronisiert`,
      };
    } catch (error) {
      return {
        accounts: [],
        transactions: [],
        success: false,
        message: `Synchronisation fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
      };
    }
  }
}

// Exportiere Instanzen für Sandbox und Admin
export const finApiSandbox = new FinAPIService(false);
export const finApiAdmin = new FinAPIService(true);
export const finApiService = finApiSandbox; // Default to Sandbox
