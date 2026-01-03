// src/lib/bank-connection-storage.ts
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

// Multi-Provider Support: FinAPI + Revolut
export type BankProvider = 'finapi' | 'revolut';

export interface StoredBankConnection {
  provider: BankProvider; // NEW: Provider identifier
  connectionId: string; // Generic connection ID
  finapiConnectionId?: string; // FinAPI specific
  revolutConnectionId?: string; // Revolut specific
  bankId: string;
  bankName: string;
  bankCode?: string; // BLZ
  bic?: string;
  connectionStatus: 'active' | 'inactive' | 'pending' | 'error';
  accountsCount: number;
  lastSync: Date;
  createdAt: Date;
  updatedAt: Date;
  // Provider-specific data
  finapiUserId?: string;
  revolutBusinessId?: string;
  webFormId?: string;
  interfaces?: string[]; // XS2A, FinTS, etc.
  loginHint?: string; // Benutzerhinweis für Login
}

export interface StoredBankAccount {
  provider: BankProvider; // NEW: Provider identifier
  accountId: string; // Generic account ID
  finapiAccountId?: string; // FinAPI specific
  revolutAccountId?: string; // Revolut specific
  accountName: string;
  iban?: string; // Optional for Revolut
  bankName: string;
  bankCode?: string; // BLZ
  bic?: string;
  accountNumber?: string; // May not exist for Revolut
  balance: number;
  availableBalance?: number; // May not exist for Revolut
  currency: string;
  accountType: string;
  accountTypeName?: string; // Girokonto, Sparkonto, etc.
  isDefault: boolean;
  connectionId: string;
  bankId: string; // Welche Bank
  lastUpdated: Date;
  isActive: boolean; // Konto aktiv/gesperrt
  owner?: {
    name?: string;
    address?: string;
  };
}

/**
 * Speichert oder aktualisiert eine Bankverbindung in der User-Datenbank
 * Unterstützt mehrere Banken pro User
 */
export async function storeBankConnection(
  firebaseUid: string,
  connectionData: Omit<StoredBankConnection, 'createdAt' | 'updatedAt'>
): Promise<void> {
  if (!db) {
    throw new Error('Datenbank nicht initialisiert');
  }

  try {
    const userDocRef = db.collection('users').doc(firebaseUid);
    const now = new Date();

    // Prüfe ob User-Dokument existiert
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      // Erstelle Basis-User-Dokument wenn es nicht existiert
      await userDocRef.set({
        uid: firebaseUid,
        createdAt: now,
        updatedAt: now,
        banking: {
          connections: {},
          accounts: {},
          banks: {}, // Neue Struktur für Bank-Informationen
          lastSync: now,
          isSetup: false,
          totalBanks: 0,
          totalAccounts: 0,
        },
      });
    }

    // Speichere Bankverbindung mit verbesserter Struktur
    const bankConnectionData: StoredBankConnection = {
      ...connectionData,
      createdAt: now,
      updatedAt: now,
    };

    // Update sowohl Verbindung als auch Bank-Info
    // Bereinige undefined Werte vor dem Speichern
    const cleanConnectionData = {
      ...connectionData,
      bankCode: connectionData.bankCode || '',
      bic: connectionData.bic || '',
      interfaces: connectionData.interfaces?.filter(Boolean) || [],
      loginHint: connectionData.loginHint || '',
    };

    const updateData = {
      [`banking.connections.${connectionData.finapiConnectionId}`]: {
        ...cleanConnectionData,
        createdAt: now,
        updatedAt: now,
      },
      'banking.lastSync': now,
      'banking.isSetup': true,
      updatedAt: now,
    };

    await userDocRef.update(updateData);

    // Aktualisiere Bank- und Konto-Zähler
    await updateBankingStatistics(firebaseUid);
  } catch (error) {
    throw new Error(`Failed to store bank connection: ${error}`);
  }
}

/**
 * Speichert oder aktualisiert Bankkonten in der Company-Datenbank (step4 Struktur)
 * Unterstützt mehrere Banken und verschiedene Kontotypen
 */
export async function storeBankAccounts(
  firebaseUid: string,
  accounts: StoredBankAccount[]
): Promise<void> {
  if (!db) {
    throw new Error('Datenbank nicht initialisiert');
  }

  try {
    // 🔧 FIX: Für Unternehmen in companies Collection mit step4 Struktur speichern
    const companyDocRef = db.collection('companies').doc(firebaseUid);
    const now = new Date();

    // Extrahiere primäres Banking-Konto für step4 Struktur
    const primaryAccount = accounts.find(acc => acc.isDefault) || accounts[0];

    if (primaryAccount) {
      // Update step4 Banking-Daten
      const step4BankingData = {
        'step4.iban': primaryAccount.iban || undefined,
        'step4.bic': primaryAccount.bic || undefined,
        'step4.bankName': primaryAccount.bankName || undefined,
        'step4.accountHolder': primaryAccount.owner?.name || undefined,
        'step4.lastFinAPISync': FieldValue.serverTimestamp(),
      };

      await companyDocRef.set(step4BankingData, { merge: true });
    }

    // Zusätzlich: Banking-Übersicht in separater banking Struktur für Dashboard
    const updateData: any = {
      'banking.lastSync': FieldValue.serverTimestamp(),
      'banking.source': 'finapi',
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Gruppiere Konten nach Bank für bessere Organisation
    const accountsByBank: { [bankId: string]: StoredBankAccount[] } = {};

    accounts.forEach(account => {
      if (!accountsByBank[account.bankId]) {
        accountsByBank[account.bankId] = [];
      }
      accountsByBank[account.bankId].push(account);

      // Speichere jedes Konto individual für Dashboard
      updateData[`banking.accounts.${account.finapiAccountId}`] = {
        ...account,
        lastUpdated: now,
      };
    });

    // Aktualisiere Bank-spezifische Informationen für Dashboard
    Object.entries(accountsByBank).forEach(([bankId, bankAccounts]) => {
      const firstAccount = bankAccounts[0];
      updateData[`banking.banks.${bankId}.accountIds`] = bankAccounts.map(a => a.finapiAccountId);
      updateData[`banking.banks.${bankId}.accountCount`] = bankAccounts.length;
      updateData[`banking.banks.${bankId}.lastSync`] = now;

      // Berechne Gesamtsaldo pro Bank
      const totalBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);
      updateData[`banking.banks.${bankId}.totalBalance`] = totalBalance;
      updateData[`banking.banks.${bankId}.currency`] = firstAccount.currency;
    });

    await companyDocRef.set(updateData, { merge: true });

    // Aktualisiere Banking-Statistiken
    await updateBankingStatistics(firebaseUid);
  } catch (error) {
    throw new Error(`Failed to store bank accounts: ${error}`);
  }
}

/**
 * Aktualisiert Banking-Statistiken in companies Collection (Anzahl Banken, Konten, Gesamtsaldo)
 */
export async function updateBankingStatistics(firebaseUid: string): Promise<void> {
  if (!db) {
    throw new Error('Datenbank nicht initialisiert');
  }

  try {
    // 🔧 FIX: companies Collection statt users
    const companyDocRef = db.collection('companies').doc(firebaseUid);
    const companyDoc = await companyDocRef.get();

    if (!companyDoc.exists || !companyDoc.data()?.banking) {
      return;
    }

    const bankingData = companyDoc.data()!.banking;
    const connections = bankingData.connections || {};
    const accounts = bankingData.accounts || {};
    const banks = bankingData.banks || {};

    // Berechne Statistiken
    const totalBanks = Object.keys(banks).length;
    const totalConnections = Object.keys(connections).length;
    const totalAccounts = Object.keys(accounts).length;

    // Berechne Gesamtsaldo über alle Konten
    const totalBalance = Object.values(accounts).reduce((sum: number, account: any) => {
      return sum + (account.balance || 0);
    }, 0);

    // Aktive Verbindungen zählen
    const activeConnections = Object.values(connections).filter(
      (conn: any) => conn.connectionStatus === 'active'
    ).length;

    // Währungen sammeln
    const currencies = new Set(Object.values(accounts).map((acc: any) => acc.currency || 'EUR'));

    await companyDocRef.set(
      {
        'banking.totalBanks': totalBanks,
        'banking.totalConnections': totalConnections,
        'banking.totalAccounts': totalAccounts,
        'banking.totalBalance': totalBalance,
        'banking.activeConnections': activeConnections,
        'banking.currencies': Array.from(currencies),
        'banking.lastStatsUpdate': FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {}
}

/**
 * Holt gespeicherte Bankverbindungen einer Company
 * Gruppiert nach Banken für bessere Übersicht
 */
export async function getUserBankConnections(firebaseUid: string): Promise<StoredBankConnection[]> {
  if (!db) {
    throw new Error('Datenbank nicht initialisiert');
  }

  try {
    // 🔧 FIX: companies Collection statt users
    const companyDocRef = db.collection('companies').doc(firebaseUid);
    const companyDoc = await companyDocRef.get();

    if (!companyDoc.exists || !companyDoc.data()?.banking?.connections) {
      return [];
    }

    const connectionsData = companyDoc.data()!.banking.connections;
    return Object.values(connectionsData) as StoredBankConnection[];
  } catch (error) {
    return [];
  }
}

/**
 * Holt gespeicherte Bankkonten einer Company
 */
export async function getUserBankAccounts(firebaseUid: string): Promise<StoredBankAccount[]> {
  if (!db) {
    throw new Error('Datenbank nicht initialisiert');
  }

  try {
    // 🔧 FIX: companies Collection statt users
    const companyDocRef = db.collection('companies').doc(firebaseUid);
    const companyDoc = await companyDocRef.get();

    if (!companyDoc.exists || !companyDoc.data()?.banking?.accounts) {
      return [];
    }

    const accountsData = companyDoc.data()!.banking.accounts;
    return Object.values(accountsData) as StoredBankAccount[];
  } catch (error) {
    return [];
  }
}

/**
 * Holt gespeicherte Bankkonten einer Company gruppiert nach Banken
 */
export async function getUserBankAccountsByBank(
  firebaseUid: string
): Promise<{ [bankName: string]: StoredBankAccount[] }> {
  try {
    const accounts = await getUserBankAccounts(firebaseUid);

    // Gruppiere Konten nach Bank
    const accountsByBank: { [bankName: string]: StoredBankAccount[] } = {};

    accounts.forEach(account => {
      const bankKey = `${account.bankName} (${account.bankCode || account.bankId})`;
      if (!accountsByBank[bankKey]) {
        accountsByBank[bankKey] = [];
      }
      accountsByBank[bankKey].push(account);
    });

    return accountsByBank;
  } catch (error) {
    return {};
  }
}

/**
 * Holt Banking-Übersicht mit Statistiken
 */
export async function getUserBankingOverview(firebaseUid: string): Promise<{
  banks: any[];
  accounts: StoredBankAccount[];
  connections: StoredBankConnection[];
  statistics: {
    totalBanks: number;
    totalAccounts: number;
    totalBalance: number;
    currencies: string[];
    activeConnections: number;
  };
} | null> {
  if (!db) {
    throw new Error('Datenbank nicht initialisiert');
  }

  try {
    // 🔧 FIX: companies Collection statt users
    const companyDocRef = db.collection('companies').doc(firebaseUid);
    const companyDoc = await companyDocRef.get();

    if (!companyDoc.exists || !companyDoc.data()?.banking) {
      return null;
    }

    const bankingData = companyDoc.data()!.banking;

    return {
      banks: Object.values(bankingData.banks || {}),
      accounts: Object.values(bankingData.accounts || {}),
      connections: Object.values(bankingData.connections || {}),
      statistics: {
        totalBanks: bankingData.totalBanks || 0,
        totalAccounts: bankingData.totalAccounts || 0,
        totalBalance: bankingData.totalBalance || 0,
        currencies: bankingData.currencies || ['EUR'],
        activeConnections: bankingData.activeConnections || 0,
      },
    };
  } catch (error) {
    return null;
  }
}

/**
 * Holt Konten einer spezifischen Bank
 */
export async function getAccountsByBank(
  firebaseUid: string,
  bankId: string
): Promise<StoredBankAccount[]> {
  try {
    const accounts = await getUserBankAccounts(firebaseUid);
    return accounts.filter(account => account.bankId === bankId);
  } catch (error) {
    return [];
  }
}
export async function hasUserBankingSetup(firebaseUid: string): Promise<boolean> {
  if (!db) {
    throw new Error('Datenbank nicht initialisiert');
  }

  try {
    // 🔧 FIX: companies Collection statt users
    const companyDocRef = db.collection('companies').doc(firebaseUid);
    const companyDoc = await companyDocRef.get();

    return (
      companyDoc.exists &&
      companyDoc.data()?.banking?.isSetup === true &&
      Object.keys(companyDoc.data()?.banking?.connections || {}).length > 0
    );
  } catch (error) {
    return false;
  }
}

/**
 * Markiert eine Bankverbindung als inaktiv
 */
export async function deactivateBankConnection(
  firebaseUid: string,
  connectionId: string
): Promise<void> {
  if (!db) {
    throw new Error('Datenbank nicht initialisiert');
  }

  try {
    // 🔧 FIX: companies Collection statt users
    const companyDocRef = db.collection('companies').doc(firebaseUid);

    await companyDocRef.set(
      {
        [`banking.connections.${connectionId}.connectionStatus`]: 'inactive',
        [`banking.connections.${connectionId}.updatedAt`]: FieldValue.serverTimestamp(),
        'banking.lastSync': FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    throw new Error(`Failed to deactivate bank connection: ${error}`);
  }
}

/**
 * Aktualisiert Konto-Salden in der companies Collection mit step4 Update
 */
export async function updateAccountBalances(
  firebaseUid: string,
  accountUpdates: Array<{ finapiAccountId: string; balance: number; availableBalance: number }>
): Promise<void> {
  if (!db) {
    throw new Error('Datenbank nicht initialisiert');
  }

  try {
    // 🔧 FIX: companies Collection statt users + step4 Update für primäres Konto
    const companyDocRef = db.collection('companies').doc(firebaseUid);
    const now = new Date();

    const updateData: any = {
      'banking.lastSync': FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    accountUpdates.forEach(update => {
      updateData[`banking.accounts.${update.finapiAccountId}.balance`] = update.balance;
      updateData[`banking.accounts.${update.finapiAccountId}.availableBalance`] =
        update.availableBalance;
      updateData[`banking.accounts.${update.finapiAccountId}.lastUpdated`] = now;
    });

    await companyDocRef.set(updateData, { merge: true });

    // 🔧 Zusätzlich: Update des primären step4 Kontos falls verfügbar
    const companyDoc = await companyDocRef.get();
    const bankingData = companyDoc.data()?.banking || {};
    const primaryAccount = Object.values(bankingData.accounts || {}).find(
      (account: any) => account.isPrimary === true
    ) as any;

    if (primaryAccount && primaryAccount.finapiAccountId) {
      const primaryUpdate = accountUpdates.find(
        update => update.finapiAccountId === primaryAccount.finapiAccountId
      );

      if (primaryUpdate) {
        await companyDocRef.set(
          {
            'step4.accountBalance': primaryUpdate.balance,
            'step4.availableBalance': primaryUpdate.availableBalance,
          },
          { merge: true }
        );
      }
    }
  } catch (error) {
    throw new Error(`Failed to update account balances: ${error}`);
  }
}
