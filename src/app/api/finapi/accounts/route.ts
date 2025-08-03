import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl, getFinApiCredentials } from '@/lib/finapi-config';
import {
  AuthorizationApi,
  AccountsApi,
  createConfiguration,
  ServerConfiguration,
} from 'finapi-client';
import type { BankAccount } from '@/types';

// GET /api/finapi/accounts - Get all accounts for user through Taskilo's finAPI account
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '20');
    const userId = searchParams.get('userId'); // Firebase user ID
    const credentialType = (searchParams.get('credentialType') as 'sandbox' | 'admin') || 'sandbox';

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get finAPI configuration
    const baseUrl = getFinApiBaseUrl(credentialType);
    const credentials = getFinApiCredentials(credentialType);

    if (!credentials.clientId || !credentials.clientSecret) {
      return NextResponse.json({ error: 'finAPI credentials not configured' }, { status: 500 });
    }

    // Get client credentials token
    const server = new ServerConfiguration(baseUrl, {});
    const configuration = createConfiguration({
      baseServer: server,
    });

    const authApi = new AuthorizationApi(configuration);
    const clientToken = await authApi.getToken(
      'client_credentials',
      credentials.clientId,
      credentials.clientSecret
    );

    // Set up accounts API with client token
    const accountsConfiguration = createConfiguration({
      baseServer: server,
      authMethods: {
        finapi_auth: {
          accessToken: clientToken.accessToken,
        },
      },
    });

    const accountsApi = new AccountsApi(accountsConfiguration);

    // Search accounts by externalId (Firebase user ID)
    const response = await accountsApi.getAndSearchAllAccounts();

    console.log('Accounts retrieved for user:', userId, response.accounts?.length || 0);

    // Transform finAPI accounts to our BankAccount interface
    const transformedAccounts: BankAccount[] =
      response.accounts?.map((account, index) => ({
        id: account.id?.toString() || `finapi_${index}`,
        accountName: account.accountName || `Konto ${account.id}`,
        iban: account.iban || '',
        bankName: `Bank ${account.bankConnectionId}`,
        accountNumber: account.accountNumber || '',
        balance: account.balance || 0,
        availableBalance: account.balance || 0,
        currency: account.accountCurrency || 'EUR',
        accountType: mapFinAPIAccountType(account.accountType),
        isDefault: index === 0,
      })) || [];

    return NextResponse.json({
      success: true,
      data: response.accounts,
      accounts: transformedAccounts,
      finapi_accounts:
        response.accounts?.map(account => ({
          id: account.id,
          accountName: account.accountName,
          iban: account.iban,
          accountNumber: account.accountNumber,
          subAccountNumber: account.subAccountNumber,
          balance: account.balance,
          overdraft: account.overdraft,
          overdraftLimit: account.overdraftLimit,
          accountCurrency: account.accountCurrency,
          accountType: account.accountType,
          isNew: account.isNew,
          bankConnectionId: account.bankConnectionId,
        })) || [],
      totalCount: response.accounts?.length || 0,
    });
  } catch (error: any) {
    console.error('finAPI accounts error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get accounts',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// POST /api/finapi/accounts - Account operations through Taskilo's finAPI account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, action, userId, credentialType = 'sandbox' } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get finAPI configuration
    const baseUrl = getFinApiBaseUrl(credentialType);
    const credentials = getFinApiCredentials(credentialType);

    if (!credentials.clientId || !credentials.clientSecret) {
      return NextResponse.json({ error: 'finAPI credentials not configured' }, { status: 500 });
    }

    // Get client credentials token
    const server = new ServerConfiguration(baseUrl, {});
    const configuration = createConfiguration({
      baseServer: server,
    });

    const authApi = new AuthorizationApi(configuration);
    const clientToken = await authApi.getToken(
      'client_credentials',
      credentials.clientId,
      credentials.clientSecret
    );

    // Set up accounts API with client token
    const accountsConfiguration = createConfiguration({
      baseServer: server,
      authMethods: {
        finapi_auth: {
          accessToken: clientToken.accessToken,
        },
      },
    });

    const accountsApi = new AccountsApi(accountsConfiguration);

    if (action === 'delete' && accountId) {
      // Delete account
      await accountsApi.deleteAccount(accountId);

      return NextResponse.json({
        success: true,
        message: 'Account deleted successfully',
      });
    }

    if (action === 'get' && accountId) {
      // Get specific account
      const account = await accountsApi.getAccount(accountId);

      return NextResponse.json({
        success: true,
        data: account,
      });
    }

    if (action === 'edit' && accountId) {
      // Edit account
      const { accountName } = body;

      const updatedAccount = await accountsApi.editAccount(accountId, {
        accountName,
      });

      return NextResponse.json({
        success: true,
        data: updatedAccount,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action specified' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('finAPI accounts POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process account request',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper function to map finAPI account types
function mapFinAPIAccountType(
  type: any
): 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'INVESTMENT' | 'LOAN' {
  const typeStr = String(type).toUpperCase();

  if (typeStr.includes('CHECKING') || typeStr.includes('GIRO')) return 'CHECKING';
  if (typeStr.includes('SAVINGS') || typeStr.includes('SPAR')) return 'SAVINGS';
  if (typeStr.includes('CREDIT') || typeStr.includes('KREDITKARTE')) return 'CREDIT_CARD';
  if (typeStr.includes('INVESTMENT') || typeStr.includes('DEPOT')) return 'INVESTMENT';
  if (typeStr.includes('LOAN') || typeStr.includes('KREDIT')) return 'LOAN';

  return 'CHECKING'; // Default fallback
}
