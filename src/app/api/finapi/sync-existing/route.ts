// src/app/api/finapi/sync-existing/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl, getFinApiCredentials } from '@/lib/finapi-config';
import {
  storeBankConnection,
  storeBankAccounts,
  StoredBankConnection,
  StoredBankAccount,
} from '@/lib/bank-connection-storage';

/**
 * Synchronisiert alle bestehenden finAPI-Verbindungen für einen User
 * Wird verwendet, um bereits existierende Verbindungen zu erkennen
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, credentialType = 'sandbox' } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log('🔄 Syncing existing finAPI connections for user:', userId);

    // SCHRITT 1: finAPI Client-Credentials Token holen
    const baseUrl = getFinApiBaseUrl(credentialType);
    const credentials = getFinApiCredentials(credentialType);

    if (!credentials.clientId || !credentials.clientSecret) {
      throw new Error('finAPI credentials not configured');
    }

    const tokenResponse = await fetch(`${baseUrl}/api/v2/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get client credentials token');
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Client credentials token obtained');

    // SCHRITT 2: User Token holen
    const finapiUserId = `tsk_${userId.slice(0, 28)}`.slice(0, 36);
    const userPassword = `TaskiloPass_${userId.slice(0, 10)}!2024`;

    const userTokenResponse = await fetch(`${baseUrl}/api/v2/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'password',
        username: finapiUserId,
        password: userPassword,
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      }),
    });

    if (!userTokenResponse.ok) {
      console.log('⚠️ User not found in finAPI - no existing connections');
      return NextResponse.json({
        success: true,
        found: false,
        message: 'No existing finAPI user found',
      });
    }

    const userTokenData = await userTokenResponse.json();
    const userAccessToken = userTokenData.access_token;
    console.log('✅ User token obtained - checking for existing connections');

    // SCHRITT 3: Bankverbindungen abrufen
    const connectionsResponse = await fetch(`${baseUrl}/api/v2/bankConnections`, {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!connectionsResponse.ok) {
      throw new Error('Failed to get bank connections');
    }

    const connectionsData = await connectionsResponse.json();
    const connections = connectionsData.connections || [];
    console.log('📊 Found', connections.length, 'existing bank connections');

    // Debug: Log connection structure
    if (connections.length > 0) {
      console.log('🔍 Connection sample:', {
        id: connections[0].id,
        bankId: connections[0].bankId,
        bank: connections[0].bank,
        accountIds: connections[0].accountIds,
        updateStatus: connections[0].updateStatus,
      });
    }

    if (connections.length === 0) {
      return NextResponse.json({
        success: true,
        found: false,
        message: 'No existing bank connections found',
      });
    }

    // SCHRITT 4: Konten abrufen
    const accountsResponse = await fetch(`${baseUrl}/api/v2/accounts`, {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!accountsResponse.ok) {
      throw new Error('Failed to get accounts');
    }

    const accountsData = await accountsResponse.json();
    const accounts = accountsData.accounts || [];
    console.log('💳 Found', accounts.length, 'existing accounts');

    // SCHRITT 5: Speichere gefundene Verbindungen
    const syncedAccounts: any[] = [];
    const accountsByBank: { [bankName: string]: any[] } = {};

    // Speichere Bankverbindungen
    for (const connection of connections) {
      const bank = connection.bank || {};

      const bankConnectionData: Omit<StoredBankConnection, 'createdAt' | 'updatedAt'> = {
        finapiConnectionId: connection.id.toString(),
        bankId: (connection.bankId || bank.id || connection.id)?.toString() || 'unknown',
        bankName: bank.name || 'Unbekannte Bank',
        bankCode: bank.blz || bank.bankCode,
        bic: bank.bic,
        connectionStatus: connection.updateStatus === 'FINISHED' ? 'active' : 'pending',
        accountsCount: connection.accountIds?.length || 0,
        lastSync: new Date(),
        finapiUserId: finapiUserId,
        webFormId: 'existing-sync',
        interfaces: connection.interfaces?.map((iface: any) => iface?.type).filter(Boolean) || [],
        loginHint: `Existierende Verbindung synchronisiert: ${new Date().toLocaleDateString('de-DE')}`,
      };

      await storeBankConnection(userId, bankConnectionData);
      console.log('✅ Synced bank connection:', {
        bank: bank.name,
        connectionId: connection.id,
        bankId: bankConnectionData.bankId,
        accounts: connection.accountIds?.length || 0,
      });
    }

    // Speichere Konten
    const storedAccounts: StoredBankAccount[] = accounts.map((account: any) => {
      const connection = connections.find(
        (conn: any) => conn.accountIds && conn.accountIds.includes(account.id)
      );
      const bank = connection?.bank || {};

      const transformedAccount = {
        finapiAccountId: account.id.toString(),
        accountName: account.accountName || account.iban || 'Unbekanntes Konto',
        iban: account.iban || '',
        bankName: bank.name || 'Unbekannte Bank',
        bankCode: bank.blz || bank.bankCode,
        bic: bank.bic,
        accountNumber: account.accountNumber || '',
        balance: account.balance || 0,
        availableBalance: account.balance || 0,
        currency: account.currency || 'EUR',
        accountType: account.accountType?.name || 'Unbekannt',
        accountTypeName: account.accountType?.name || 'Girokonto',
        isDefault: false,
        connectionId: connection?.id?.toString() || '',
        bankId: (connection?.bankId || bank.id || connection?.id)?.toString() || 'unknown',
        lastUpdated: new Date(),
        isActive: true,
        owner: account.owner
          ? {
              name: account.owner.name || '',
              address: account.owner.address || '',
            }
          : undefined,
      };

      // Für UI-Response formatieren
      const uiAccount = {
        id: account.id.toString(),
        accountName: transformedAccount.accountName,
        iban: transformedAccount.iban,
        bankName: transformedAccount.bankName,
        bankCode: transformedAccount.bankCode,
        bic: transformedAccount.bic,
        accountNumber: transformedAccount.accountNumber,
        balance: transformedAccount.balance,
        availableBalance: transformedAccount.availableBalance,
        currency: transformedAccount.currency,
        accountType: transformedAccount.accountType,
        accountTypeName: transformedAccount.accountTypeName,
        isDefault: transformedAccount.isDefault,
        bankId: transformedAccount.bankId,
        connectionId: transformedAccount.connectionId,
        lastUpdated: transformedAccount.lastUpdated,
        isActive: transformedAccount.isActive,
        owner: transformedAccount.owner,
        source: 'existing_sync',
      };

      syncedAccounts.push(uiAccount);

      // Gruppiere nach Bank
      const bankName = transformedAccount.bankName;
      if (!accountsByBank[bankName]) accountsByBank[bankName] = [];
      accountsByBank[bankName].push(uiAccount);

      return transformedAccount;
    });

    if (storedAccounts.length > 0) {
      await storeBankAccounts(userId, storedAccounts);
      console.log('✅ Synced', storedAccounts.length, 'accounts from existing connections');
    }

    return NextResponse.json({
      success: true,
      found: true,
      accounts: syncedAccounts,
      accountsByBank: accountsByBank,
      connections: connections.length,
      message: `Successfully synced ${connections.length} existing bank connections with ${accounts.length} accounts`,
    });
  } catch (error: any) {
    console.error('❌ Error syncing existing connections:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync existing connections',
        details: error.message,
        found: false,
      },
      { status: 500 }
    );
  }
}
