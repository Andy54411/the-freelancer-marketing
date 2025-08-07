// src/lib/bank-connection-storage.ts
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

export interface StoredBankConnection {
  finapiConnectionId: string;
  bankId: string;
  bankName: string;
  bankCode?: string; // BLZ
  bic?: string;
  connectionStatus: 'active' | 'inactive' | 'pending' | 'error';
  accountsCount: number;
  lastSync: Date;
  createdAt: Date;
  updatedAt: Date;
  finapiUserId: string;
  webFormId?: string;
  interfaces?: string[]; // XS2A, FinTS, etc.
  loginHint?: string; // Benutzerhinweis für Login
}

export interface StoredBankAccount {
  finapiAccountId: string;
  accountName: string;
  iban: string;
  bankName: string;
  bankCode?: string; // BLZ
  bic?: string;
  accountNumber: string;
  balance: number;
  availableBalance: number;
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
  try {
    console.log(
      '💾 Storing bank connection for user:',
      firebaseUid,
      'bank:',
      connectionData.bankName,
      'connection:',
      connectionData.finapiConnectionId
    );

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

    console.log(
      '✅ Bank connection stored successfully for user:',
      firebaseUid,
      'Bank:',
      connectionData.bankName
    );
  } catch (error) {
    console.error('❌ Error storing bank connection:', error);
    throw new Error(`Failed to store bank connection: ${error}`);
  }
}

/**
 * Speichert oder aktualisiert Bankkonten in der User-Datenbank
 * Unterstützt mehrere Banken und verschiedene Kontotypen
 */
export async function storeBankAccounts(
  firebaseUid: string,
  accounts: StoredBankAccount[]
): Promise<void> {
  try {
    console.log(
      '💾 Storing',
      accounts.length,
      'bank accounts from',
      new Set(accounts.map(a => a.bankName)).size,
      'banks for user:',
      firebaseUid
    );

    const userDocRef = db.collection('users').doc(firebaseUid);
    const now = new Date();

    // Update-Daten vorbereiten
    const updateData: any = {
      'banking.lastSync': FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Gruppiere Konten nach Bank für bessere Organisation
    const accountsByBank: { [bankId: string]: StoredBankAccount[] } = {};

    accounts.forEach(account => {
      if (!accountsByBank[account.bankId]) {
        accountsByBank[account.bankId] = [];
      }
      accountsByBank[account.bankId].push(account);

      // Speichere jedes Konto individual
      updateData[`banking.accounts.${account.finapiAccountId}`] = {
        ...account,
        lastUpdated: now,
      };
    });

    // Aktualisiere Bank-spezifische Informationen
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

    await userDocRef.update(updateData);

    // Aktualisiere Statistiken
    await updateBankingStatistics(firebaseUid);

    console.log('✅ Bank accounts stored successfully:', {
      user: firebaseUid,
      accounts: accounts.length,
      banks: Object.keys(accountsByBank).length,
      currencies: new Set(accounts.map(a => a.currency)).size,
    });
  } catch (error) {
    console.error('❌ Error storing bank accounts:', error);
    throw new Error(`Failed to store bank accounts: ${error}`);
  }
}

/**
 * Aktualisiert Banking-Statistiken (Anzahl Banken, Konten, Gesamtsaldo)
 */
export async function updateBankingStatistics(firebaseUid: string): Promise<void> {
  try {
    const userDocRef = db.collection('users').doc(firebaseUid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists || !userDoc.data()?.banking) {
      return;
    }

    const bankingData = userDoc.data()!.banking;
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

    await userDocRef.update({
      'banking.totalBanks': totalBanks,
      'banking.totalConnections': totalConnections,
      'banking.totalAccounts': totalAccounts,
      'banking.totalBalance': totalBalance,
      'banking.activeConnections': activeConnections,
      'banking.currencies': Array.from(currencies),
      'banking.lastStatsUpdate': FieldValue.serverTimestamp(),
    });

    console.log('✅ Banking statistics updated:', {
      user: firebaseUid,
      banks: totalBanks,
      accounts: totalAccounts,
      balance: totalBalance,
      currencies: Array.from(currencies).join(', '),
    });
  } catch (error) {
    console.error('❌ Error updating banking statistics:', error);
  }
}

/**
 * Holt gespeicherte Bankverbindungen eines Users
 * Gruppiert nach Banken für bessere Übersicht
 */
export async function getUserBankConnections(firebaseUid: string): Promise<StoredBankConnection[]> {
  try {
    const userDocRef = db.collection('users').doc(firebaseUid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists || !userDoc.data()?.banking?.connections) {
      return [];
    }

    const connectionsData = userDoc.data()!.banking.connections;
    return Object.values(connectionsData) as StoredBankConnection[];
  } catch (error) {
    console.error('❌ Error getting user bank connections:', error);
    return [];
  }
}

/**
 * Holt gespeicherte Bankkonten eines Users
 */
export async function getUserBankAccounts(firebaseUid: string): Promise<StoredBankAccount[]> {
  try {
    const userDocRef = db.collection('users').doc(firebaseUid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists || !userDoc.data()?.banking?.accounts) {
      return [];
    }

    const accountsData = userDoc.data()!.banking.accounts;
    return Object.values(accountsData) as StoredBankAccount[];
  } catch (error) {
    console.error('❌ Error getting user bank accounts:', error);
    return [];
  }
}

/**
 * Holt gespeicherte Bankkonten eines Users gruppiert nach Banken
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
    console.error('❌ Error getting user bank accounts by bank:', error);
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
  try {
    const userDocRef = db.collection('users').doc(firebaseUid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists || !userDoc.data()?.banking) {
      return null;
    }

    const bankingData = userDoc.data()!.banking;

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
    console.error('❌ Error getting user banking overview:', error);
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
    console.error('❌ Error getting accounts by bank:', error);
    return [];
  }
}
export async function hasUserBankingSetup(firebaseUid: string): Promise<boolean> {
  try {
    const userDocRef = db.collection('users').doc(firebaseUid);
    const userDoc = await userDocRef.get();

    return (
      userDoc.exists &&
      userDoc.data()?.banking?.isSetup === true &&
      Object.keys(userDoc.data()?.banking?.connections || {}).length > 0
    );
  } catch (error) {
    console.error('❌ Error checking user banking setup:', error);
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
  try {
    const userDocRef = db.collection('users').doc(firebaseUid);

    await userDocRef.update({
      [`banking.connections.${connectionId}.connectionStatus`]: 'inactive',
      [`banking.connections.${connectionId}.updatedAt`]: FieldValue.serverTimestamp(),
      'banking.lastSync': FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(
      '✅ Bank connection deactivated for user:',
      firebaseUid,
      'connection:',
      connectionId
    );
  } catch (error) {
    console.error('❌ Error deactivating bank connection:', error);
    throw new Error(`Failed to deactivate bank connection: ${error}`);
  }
}

/**
 * Aktualisiert Konto-Salden in der Datenbank
 */
export async function updateAccountBalances(
  firebaseUid: string,
  accountUpdates: Array<{ finapiAccountId: string; balance: number; availableBalance: number }>
): Promise<void> {
  try {
    const userDocRef = db.collection('users').doc(firebaseUid);
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

    await userDocRef.update(updateData);

    console.log('✅ Account balances updated for user:', firebaseUid);
  } catch (error) {
    console.error('❌ Error updating account balances:', error);
    throw new Error(`Failed to update account balances: ${error}`);
  }
}
