import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl } from '@/lib/finapi-config';
import { AccountsApi, createConfiguration, ServerConfiguration } from 'finapi-client';
import type { BankAccount } from '@/types';

async function handleFinAPIAccountsRequest(
  token: string,
  credentialType: 'sandbox' | 'admin' = 'sandbox'
) {
  try {
    // Get correct base URL
    const baseUrl = getFinApiBaseUrl(credentialType);

    // finAPI SDK Configuration
    const server = new ServerConfiguration(baseUrl, {});
    const configuration = createConfiguration({
      baseServer: server,
      authMethods: {
        finapi_auth: {
          accessToken: token,
        },
      },
    });

    const accountsApi = new AccountsApi(configuration);

    console.log(`Using finAPI SDK for accounts request with ${credentialType} environment`);

    // finAPI Accounts Request mit SDK
    const accountsResponse = await accountsApi.getAndSearchAllAccounts();

    console.log(
      'finAPI SDK accounts request successful, accounts found:',
      accountsResponse.accounts?.length || 0
    );

    // Transform finAPI accounts to our BankAccount interface
    const transformedAccounts: BankAccount[] =
      accountsResponse.accounts?.map((account, index) => ({
        id: account.id?.toString() || `finapi_${index}`,
        accountName: account.accountName || `Konto ${account.id}`,
        iban: account.iban || '',
        bankName: `finAPI Bank ${account.id}`, // Simplified bank name
        accountNumber: account.accountNumber || '',
        balance: account.balance || 0,
        availableBalance: account.balance || 0, // finAPI might have overdraftLimit
        currency: account.accountCurrency || 'EUR',
        accountType: mapFinAPIAccountType(account.accountType),
        isDefault: index === 0, // First account as default
      })) || [];

    return NextResponse.json({
      success: true,
      accounts: transformedAccounts,
      total: accountsResponse.accounts?.length || 0,
      finapi_raw: accountsResponse, // For debugging
    });
  } catch (error) {
    console.error('finAPI SDK accounts error:', error);

    // Enhanced error handling for finAPI SDK
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Failed to fetch accounts',
          details: error.message,
          type: 'SDK_ERROR',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Map finAPI account types to our types
function mapFinAPIAccountType(accountType?: any): 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' {
  // Map based on finAPI account type strings
  const typeStr = accountType?.toString().toLowerCase();
  if (typeStr?.includes('saving')) return 'SAVINGS';
  if (typeStr?.includes('credit')) return 'CREDIT_CARD';
  return 'CHECKING'; // Default to checking
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
  }

  const token = authHeader.substring(7);
  const { searchParams } = new URL(req.url);
  const credentialType = (searchParams.get('credentialType') as 'sandbox' | 'admin') || 'sandbox';

  return handleFinAPIAccountsRequest(token, credentialType);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { access_token, credentialType = 'sandbox' } = body;

    if (!access_token) {
      return NextResponse.json({ error: 'Access token required in request body' }, { status: 401 });
    }

    return handleFinAPIAccountsRequest(access_token, credentialType);
  } catch (error) {
    console.error('POST finAPI accounts error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
