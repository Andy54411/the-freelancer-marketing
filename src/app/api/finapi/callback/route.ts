// src/app/api/finapi/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl, getFinApiCredentials } from '@/lib/finapi-config';
import {
  storeBankConnection,
  storeBankAccounts,
  StoredBankConnection,
  StoredBankAccount,
} from '@/lib/bank-connection-storage';

/**
 * finAPI WebForm 2.0 Callback Handler
 * Wird von finAPI nach erfolgreichem Bank-Connect aufgerufen
 * Speichert die Bankverbindung permanent in der User-Datenbank
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const webFormId = searchParams.get('webFormId');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const userId = searchParams.get('userId'); // Taskilo User ID from state

    console.log('🔄 WebForm callback received:', { webFormId, state, error, userId });

    // Error-Handling
    if (error) {
      console.error('❌ WebForm error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${userId}/finance/banking/import?error=${encodeURIComponent(error)}`
      );
    }

    if (!webFormId || !userId) {
      console.error('❌ Missing required parameters:', { webFormId, userId });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${userId}/finance/banking/import?error=missing_parameters`
      );
    }

    // SCHRITT 1: finAPI Client-Credentials Token holen
    const baseUrl = getFinApiBaseUrl('sandbox');
    const credentials = getFinApiCredentials('sandbox');

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
      throw new Error('Failed to get client token');
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Client token obtained');

    // SCHRITT 2: User-Token für Bank-Daten-Abruf
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
      throw new Error('Failed to get user token');
    }

    const userTokenData = await userTokenResponse.json();
    const userAccessToken = userTokenData.access_token;
    console.log('✅ User token obtained');

    // SCHRITT 3: Bankverbindungen vom finAPI abrufen
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
    console.log('📊 Found', connections.length, 'bank connections');

    // SCHRITT 4: Konten vom finAPI abrufen
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
    console.log('💳 Found', accounts.length, 'accounts');

    // SCHRITT 5: Bankverbindungen in Taskilo-Datenbank speichern
    for (const connection of connections) {
      const bank = connection.bank || {};

      const bankConnectionData: Omit<StoredBankConnection, 'createdAt' | 'updatedAt'> = {
        finapiConnectionId: connection.id.toString(),
        bankId: connection.bankId.toString(),
        bankName: bank.name || 'Unbekannte Bank',
        bankCode: bank.blz || bank.bankCode,
        bic: bank.bic,
        connectionStatus: connection.updateStatus === 'FINISHED' ? 'active' : 'pending',
        accountsCount: connection.accountIds?.length || 0,
        lastSync: new Date(),
        finapiUserId: finapiUserId,
        webFormId: webFormId,
        interfaces: connection.interfaces?.map((iface: any) => iface.type) || [],
        loginHint: `Letzte Verbindung: ${new Date().toLocaleDateString('de-DE')}`,
      };

      await storeBankConnection(userId, bankConnectionData);
      console.log('✅ Stored bank connection:', {
        bank: bank.name,
        id: connection.id,
        accounts: connection.accountIds?.length || 0,
      });
    }

    // SCHRITT 6: Konten in Taskilo-Datenbank speichern
    const storedAccounts: StoredBankAccount[] = accounts.map((account: any) => {
      const connection = connections.find(
        (conn: any) => conn.accountIds && conn.accountIds.includes(account.id)
      );
      const bank = connection?.bank || {};

      return {
        finapiAccountId: account.id.toString(),
        accountName: account.accountName || account.iban || 'Unbekanntes Konto',
        iban: account.iban || '',
        bankName: bank.name || 'Unbekannte Bank',
        bankCode: bank.blz || bank.bankCode,
        bic: bank.bic,
        accountNumber: account.accountNumber || '',
        balance: account.balance || 0,
        availableBalance: account.balance || 0, // finAPI könnte separates Feld haben
        currency: account.currency || 'EUR',
        accountType: account.accountType?.name || 'Unbekannt',
        accountTypeName: account.accountType?.name || account.subAccountNumber || 'Girokonto',
        isDefault: false, // User kann später ein Standard-Konto setzen
        connectionId: connection?.id?.toString() || '',
        bankId: connection?.bankId?.toString() || '',
        lastUpdated: new Date(),
        isActive: true,
        owner: account.owner
          ? {
              name: account.owner.name,
              address: account.owner.address,
            }
          : undefined,
      };
    });

    if (storedAccounts.length > 0) {
      await storeBankAccounts(userId, storedAccounts);

      // Gruppiere Konten nach Bank für Log
      const accountsByBank = storedAccounts.reduce(
        (acc, account) => {
          const bankName = account.bankName;
          if (!acc[bankName]) acc[bankName] = 0;
          acc[bankName]++;
          return acc;
        },
        {} as { [bankName: string]: number }
      );

      console.log('✅ Stored accounts by bank:', accountsByBank);
    }

    // SCHRITT 7: Erfolgreiche Weiterleitung zum Dashboard
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${userId}/finance/banking/accounts?success=bank_connected&connections=${connections.length}&accounts=${accounts.length}`;

    console.log('🎉 Bank connection successful, redirecting to:', successUrl);
    return NextResponse.redirect(successUrl);
  } catch (error: any) {
    console.error('❌ WebForm callback error:', error);

    // Fehler-Weiterleitung
    const errorUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/unknown/finance/banking/import?error=${encodeURIComponent(error.message || 'Unknown error')}`;
    return NextResponse.redirect(errorUrl);
  }
}

/**
 * POST-Handler für direkten Callback (falls finAPI POST verwendet)
 */
export async function POST(request: NextRequest) {
  return await GET(request); // Gleiche Logik für GET und POST
}
