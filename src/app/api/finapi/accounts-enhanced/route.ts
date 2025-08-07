import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl, getFinApiCredentials } from '@/lib/finapi-config';
import {
  getUserBankAccounts,
  hasUserBankingSetup,
  updateAccountBalances,
  storeBankAccounts,
  StoredBankAccount,
} from '@/lib/bank-connection-storage';

// Helper function to map finAPI account types to Taskilo types
function mapFinAPIAccountType(accountType: string): string {
  const typeMapping: Record<string, string> = {
    CHECKING: 'checking',
    Checking: 'checking',
    SAVINGS: 'savings',
    Savings: 'savings',
    CREDIT_CARD: 'credit_card',
    CreditCard: 'credit_card',
    LOAN: 'loan',
    Loan: 'loan',
    INVESTMENT: 'investment',
    Investment: 'investment',
    Security: 'investment', // finAPI uses 'Security' for investment accounts
    Bausparen: 'savings', // German savings type
    OTHER: 'other',
  };

  return typeMapping[accountType] || 'other';
}

// GET /api/finapi/accounts - Get accounts for user with persistent storage
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId'); // Firebase user ID
    const credentialType = (searchParams.get('credentialType') as 'sandbox' | 'admin') || 'sandbox';
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log('🏦 Getting accounts for user:', userId, 'forceRefresh:', forceRefresh);

    // SCHRITT 1: Prüfe ob User Banking-Setup hat
    const hasBanking = await hasUserBankingSetup(userId);
    if (!hasBanking && !forceRefresh) {
      console.log('⚠️ User has no banking setup - returning empty state');
      return NextResponse.json({
        success: true,
        accounts: [],
        totalCount: 0,
        message: 'No banking setup found - please connect a bank first',
        hasBankingSetup: false,
      });
    }

    // SCHRITT 2: Lade gespeicherte Konten aus der lokalen Datenbank
    const storedAccounts = await getUserBankAccounts(userId);
    console.log('💾 Found', storedAccounts.length, 'stored accounts');

    // Wenn forceRefresh = false und wir haben gespeicherte Konten, verwende diese
    if (!forceRefresh && storedAccounts.length > 0) {
      const transformedAccounts = storedAccounts.map(account => ({
        id: account.finapiAccountId,
        accountName: account.accountName,
        iban: account.iban,
        bankName: account.bankName,
        bankCode: account.bankCode,
        bic: account.bic,
        accountNumber: account.accountNumber,
        balance: account.balance,
        availableBalance: account.availableBalance,
        currency: account.currency,
        accountType: account.accountType,
        accountTypeName: account.accountTypeName,
        isDefault: account.isDefault,
        bankId: account.bankId,
        connectionId: account.connectionId,
        lastUpdated: account.lastUpdated,
        isActive: account.isActive,
        owner: account.owner,
        source: 'local_storage',
      }));

      // Gruppiere Konten nach Bank für bessere Übersicht
      const accountsByBank = transformedAccounts.reduce(
        (acc, account) => {
          const bankName = account.bankName;
          if (!acc[bankName]) acc[bankName] = [];
          acc[bankName].push(account);
          return acc;
        },
        {} as { [bankName: string]: any[] }
      );

      console.log(
        '✅ Returning',
        transformedAccounts.length,
        'accounts from',
        Object.keys(accountsByBank).length,
        'banks (local storage)'
      );
      return NextResponse.json({
        success: true,
        accounts: transformedAccounts,
        accountsByBank: accountsByBank,
        totalCount: transformedAccounts.length,
        bankCount: Object.keys(accountsByBank).length,
        source: 'local_storage',
        lastSync: storedAccounts[0]?.lastUpdated || new Date(),
        hasBankingSetup: true,
      });
    }

    // SCHRITT 3: Falls forceRefresh oder keine lokalen Daten - synchronisiere mit finAPI
    console.log('🔄 Syncing with finAPI...');

    // Get finAPI configuration
    const baseUrl = getFinApiBaseUrl(credentialType);
    const taskiloCredentials = getFinApiCredentials(credentialType);

    if (!taskiloCredentials.clientId || !taskiloCredentials.clientSecret) {
      return NextResponse.json({ error: 'finAPI credentials not configured' }, { status: 500 });
    }

    // Step 1: Get client credentials token
    const tokenResponse = await fetch(`${baseUrl}/api/v2/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: taskiloCredentials.clientId,
        client_secret: taskiloCredentials.clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return NextResponse.json(
        { error: 'finAPI authentication failed', details: errorText },
        { status: 401 }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Client credentials token obtained');

    // Step 2: Get user token
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
        client_id: taskiloCredentials.clientId,
        client_secret: taskiloCredentials.clientSecret,
      }),
    });

    if (!userTokenResponse.ok) {
      console.log('⚠️ User not found in finAPI - returning stored accounts if available');
      if (storedAccounts.length > 0) {
        const transformedAccounts = storedAccounts.map(account => ({
          id: account.finapiAccountId,
          accountName: account.accountName,
          iban: account.iban,
          bankName: account.bankName,
          accountNumber: account.accountNumber,
          balance: account.balance,
          availableBalance: account.availableBalance,
          currency: account.currency,
          accountType: account.accountType,
          isDefault: account.isDefault,
          lastUpdated: account.lastUpdated,
          source: 'local_storage_fallback',
        }));

        return NextResponse.json({
          success: true,
          accounts: transformedAccounts,
          totalCount: transformedAccounts.length,
          source: 'local_storage_fallback',
          message: 'finAPI sync failed, returning stored data',
          hasBankingSetup: true,
        });
      }

      return NextResponse.json({
        success: true,
        accounts: [],
        totalCount: 0,
        message: 'No finAPI user found - please connect a bank first',
        hasBankingSetup: false,
      });
    }

    const userTokenData = await userTokenResponse.json();
    console.log('✅ User token obtained');

    // Step 3: Get accounts from finAPI
    const accountsResponse = await fetch(`${baseUrl}/api/v2/accounts?view=userView`, {
      headers: {
        Authorization: `Bearer ${userTokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text();
      console.error('❌ finAPI accounts request failed:', errorText);

      // Fallback to stored accounts if available
      if (storedAccounts.length > 0) {
        const transformedAccounts = storedAccounts.map(account => ({
          id: account.finapiAccountId,
          accountName: account.accountName,
          iban: account.iban,
          bankName: account.bankName,
          accountNumber: account.accountNumber,
          balance: account.balance,
          availableBalance: account.availableBalance,
          currency: account.currency,
          accountType: account.accountType,
          isDefault: account.isDefault,
          lastUpdated: account.lastUpdated,
          source: 'local_storage_fallback',
        }));

        return NextResponse.json({
          success: true,
          accounts: transformedAccounts,
          totalCount: transformedAccounts.length,
          source: 'local_storage_fallback',
          message: 'finAPI sync failed, returning stored data',
          hasBankingSetup: true,
        });
      }

      return NextResponse.json(
        { error: 'Failed to get accounts from finAPI', details: errorText },
        { status: 500 }
      );
    }

    const accountsData = await accountsResponse.json();
    const accounts = accountsData.accounts || [];

    console.log(`📊 Retrieved ${accounts.length} accounts from finAPI`);

    // Step 4: Transform finAPI accounts to Taskilo format
    const transformedAccounts = accounts.map((account: any) => ({
      id: account.id.toString(),
      accountName: account.accountName || account.iban || `Account ${account.id}`,
      iban: account.iban || '',
      bankName: account.bankName || 'Unknown Bank',
      accountNumber: account.accountNumber || '',
      balance: account.balance || 0,
      availableBalance: account.balance || 0,
      currency: account.currency || 'EUR',
      accountType: mapFinAPIAccountType(account.accountType?.name || 'OTHER'),
      isDefault: false,
      lastUpdated: new Date().toISOString(),
      source: 'finapi_live',
    }));

    // Step 5: Update stored accounts with fresh data
    if (accounts.length > 0) {
      const storedAccountsData: StoredBankAccount[] = accounts.map((account: any) => ({
        finapiAccountId: account.id.toString(),
        accountName: account.accountName || account.iban || `Account ${account.id}`,
        iban: account.iban || '',
        bankName: account.bankName || 'Unknown Bank',
        accountNumber: account.accountNumber || '',
        balance: account.balance || 0,
        availableBalance: account.balance || 0,
        currency: account.currency || 'EUR',
        accountType: mapFinAPIAccountType(account.accountType?.name || 'OTHER'),
        isDefault: false,
        connectionId: '', // Will be updated if we have connection data
        lastUpdated: new Date(),
      }));

      try {
        await storeBankAccounts(userId, storedAccountsData);
        console.log('✅ Updated stored accounts with fresh finAPI data');
      } catch (error) {
        console.error('⚠️ Failed to update stored accounts:', error);
      }
    }

    return NextResponse.json({
      success: true,
      accounts: transformedAccounts,
      totalCount: transformedAccounts.length,
      source: 'finapi_live',
      lastSync: new Date().toISOString(),
      hasBankingSetup: accounts.length > 0,
    });
  } catch (error: any) {
    console.error('❌ Error in accounts API:', error);

    // Last fallback - try to return stored accounts
    try {
      const userId = request.nextUrl.searchParams.get('userId');
      if (userId) {
        const storedAccounts = await getUserBankAccounts(userId);
        if (storedAccounts.length > 0) {
          const transformedAccounts = storedAccounts.map(account => ({
            id: account.finapiAccountId,
            accountName: account.accountName,
            iban: account.iban,
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            balance: account.balance,
            availableBalance: account.availableBalance,
            currency: account.currency,
            accountType: account.accountType,
            isDefault: account.isDefault,
            lastUpdated: account.lastUpdated,
            source: 'error_fallback',
          }));

          return NextResponse.json({
            success: true,
            accounts: transformedAccounts,
            totalCount: transformedAccounts.length,
            source: 'error_fallback',
            message: 'API error occurred, returning stored data',
            hasBankingSetup: true,
          });
        }
      }
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get accounts',
        details: error instanceof Error ? error.message : 'Unknown error',
        accounts: [],
        totalCount: 0,
        hasBankingSetup: false,
      },
      { status: 500 }
    );
  }
}
