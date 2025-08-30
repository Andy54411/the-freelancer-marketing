/**
 * finAPI Mock Service - Temporary Fallback für Dashboard-Funktionalität
 * Wird verwendet wenn echte finAPI-API nicht verfügbar ist
 */

export interface MockAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  balance: number;
  bankName: string;
  accountType: string;
  currency: string;
  lastSyncDate: string;
}

export interface MockBankConnection {
  id: string;
  bankName: string;
  connectionStatus: 'ONLINE' | 'OFFLINE' | 'ERROR';
  lastSyncDate: string;
  accountsCount: number;
}

export interface MockTransaction {
  id: string;
  amount: number;
  purpose: string;
  counterpartName: string;
  counterpartAccountNumber: string;
  bookingDate: string;
  valueDate: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
}

export interface MockBank {
  id: string;
  name: string;
  blz: string;
  location: string;
  isTestBank: boolean;
  loginHint?: string;
}

/**
 * Mock finAPI Service für temporäre Dashboard-Funktionalität
 */
export class FinAPIMockService {
  /**
   * Mock Bank-Verbindungen für Demo-Dashboard
   */
  getMockBankConnections(): MockBankConnection[] {
    return [
      {
        id: 'mock_connection_1',
        bankName: 'Sparkasse Demo',
        connectionStatus: 'ONLINE',
        lastSyncDate: new Date().toISOString(),
        accountsCount: 2,
      },
      {
        id: 'mock_connection_2',
        bankName: 'Deutsche Bank Demo',
        connectionStatus: 'ONLINE',
        lastSyncDate: new Date(Date.now() - 86400000).toISOString(), // Gestern
        accountsCount: 1,
      },
    ];
  }

  /**
   * Mock Konten für Demo-Dashboard
   */
  getMockAccounts(): MockAccount[] {
    return [
      {
        id: 'mock_account_1',
        accountName: 'Geschäftskonto',
        accountNumber: 'DE89370400440532013000',
        iban: 'DE89370400440532013000',
        balance: 15750.42,
        bankName: 'Sparkasse Demo',
        accountType: 'CHECKING',
        currency: 'EUR',
        lastSyncDate: new Date().toISOString(),
      },
      {
        id: 'mock_account_2',
        accountName: 'Rücklagen',
        accountNumber: 'DE89370400440532013001',
        iban: 'DE89370400440532013001',
        balance: 25000.0,
        bankName: 'Sparkasse Demo',
        accountType: 'SAVINGS',
        currency: 'EUR',
        lastSyncDate: new Date().toISOString(),
      },
      {
        id: 'mock_account_3',
        accountName: 'Tagesgeld',
        accountNumber: 'DE12500105170648489890',
        iban: 'DE12500105170648489890',
        balance: 8500.75,
        bankName: 'Deutsche Bank Demo',
        accountType: 'SAVINGS',
        currency: 'EUR',
        lastSyncDate: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
  }

  /**
   * Mock Transaktionen für Demo-Dashboard
   */
  getMockTransactions(): MockTransaction[] {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    return [
      {
        id: 'mock_tx_1',
        amount: 2850.0,
        purpose: 'Rechnung #2024-001 - Webentwicklung',
        counterpartName: 'Kunde GmbH',
        counterpartAccountNumber: 'DE75512108001245126199',
        bookingDate: today.toISOString().split('T')[0],
        valueDate: today.toISOString().split('T')[0],
        type: 'INCOME',
        category: 'Umsatz',
      },
      {
        id: 'mock_tx_2',
        amount: -450.0,
        purpose: 'Büromaterial - Online-Shop',
        counterpartName: 'Office Supply Store',
        counterpartAccountNumber: 'DE44500105175407324931',
        bookingDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        valueDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        type: 'EXPENSE',
        category: 'Büroausstattung',
      },
      {
        id: 'mock_tx_3',
        amount: 1750.0,
        purpose: 'Rechnung #2024-002 - Consulting',
        counterpartName: 'Business Partner AG',
        counterpartAccountNumber: 'DE89370400440532013099',
        bookingDate: lastWeek.toISOString().split('T')[0],
        valueDate: lastWeek.toISOString().split('T')[0],
        type: 'INCOME',
        category: 'Beratung',
      },
      {
        id: 'mock_tx_4',
        amount: -890.5,
        purpose: 'Software-Lizenzen',
        counterpartName: 'Software Vendor Inc',
        counterpartAccountNumber: 'DE12500105170648489999',
        bookingDate: lastWeek.toISOString().split('T')[0],
        valueDate: lastWeek.toISOString().split('T')[0],
        type: 'EXPENSE',
        category: 'Software',
      },
      {
        id: 'mock_tx_5',
        amount: -280.0,
        purpose: 'Internet & Telefon',
        counterpartName: 'Telekom Deutschland',
        counterpartAccountNumber: 'DE44500105175407324888',
        bookingDate: lastMonth.toISOString().split('T')[0],
        valueDate: lastMonth.toISOString().split('T')[0],
        type: 'EXPENSE',
        category: 'Kommunikation',
      },
    ];
  }

  /**
   * Mock Banken für Demo-Dashboard
   */
  getMockBanks(): MockBank[] {
    return [
      {
        id: 'mock_bank_1',
        name: 'Sparkasse Demo',
        blz: '37040044',
        location: 'Düsseldorf',
        isTestBank: true,
        loginHint: 'Demo-Bank für Entwicklung',
      },
      {
        id: 'mock_bank_2',
        name: 'Deutsche Bank Demo',
        blz: '50010517',
        location: 'Berlin',
        isTestBank: true,
        loginHint: 'Demo-Bank für Tests',
      },
      {
        id: 'mock_bank_3',
        name: 'Commerzbank Demo',
        blz: '76040061',
        location: 'Nürnberg',
        isTestBank: true,
        loginHint: 'Demo-Bank für Präsentation',
      },
      {
        id: 'mock_bank_4',
        name: 'HypoVereinsbank Demo',
        blz: '70020270',
        location: 'München',
        isTestBank: true,
        loginHint: 'Demo-Bank für Showcase',
      },
    ];
  }

  /**
   * Mock WebForm URL für Bank-Verbindung
   */
  getMockWebFormUrl(bankId: string): string {
    return `https://demo-webform.taskilo.de/connect?bankId=${bankId}&timestamp=${Date.now()}`;
  }

  /**
   * Prüfe ob Mock-Modus aktiviert werden soll
   */
  static shouldUseMockMode(): boolean {
    // Verwende Mock-Modus wenn finAPI nicht verfügbar ist
    return process.env.FINAPI_MOCK_MODE === 'true' || process.env.NODE_ENV === 'development';
  }

  /**
   * Mock Konto-Balance Zusammenfassung
   */
  getMockAccountSummary() {
    const accounts = this.getMockAccounts();
    const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

    return {
      totalBalance,
      accountsCount: accounts.length,
      lastSyncDate: new Date().toISOString(),
      status: 'MOCK_MODE',
    };
  }

  /**
   * Mock Transaktions-Statistiken
   */
  getMockTransactionStats() {
    const transactions = this.getMockTransactions();
    const income = transactions
      .filter(tx => tx.type === 'INCOME')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const expenses = transactions
      .filter(tx => tx.type === 'EXPENSE')
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    return {
      totalIncome: income,
      totalExpenses: expenses,
      netIncome: income - expenses,
      transactionsCount: transactions.length,
      period: 'LAST_30_DAYS',
    };
  }
}

// Export Mock-Service-Instanz
export const finapIMockService = new FinAPIMockService();
