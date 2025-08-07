import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl, getFinApiCredentials } from '@/lib/finapi-config';

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

// GET /api/finapi/accounts - Get accounts for user through finAPI
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId'); // Firebase user ID
    const credentialType = (searchParams.get('credentialType') as 'sandbox' | 'admin') || 'sandbox';

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log('🏦 Getting accounts for user:', userId);

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
      console.error('❌ Client token request failed');
      return NextResponse.json({ error: 'Failed to authenticate with finAPI' }, { status: 401 });
    }

    const clientTokenData = await tokenResponse.json();

    // Step 2: Get user access token (consistent with import-bank logic)
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
      console.log('⚠️ User not found in finAPI - no accounts to show');
      return NextResponse.json({
        success: true,
        accounts: [],
        totalCount: 0,
        message: 'No finAPI user found - please connect a bank first',
      });
    }

    const userTokenData = await userTokenResponse.json();
    const userAccessToken = userTokenData.access_token;

    // Step 3: Get accounts from finAPI
    const accountsResponse = await fetch(`${baseUrl}/api/v2/accounts`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text();
      console.error('❌ Failed to get accounts:', errorText);
      return NextResponse.json({ error: 'Failed to get accounts from finAPI' }, { status: 500 });
    }

    const accountsData = await accountsResponse.json();
    console.log('✅ Retrieved accounts:', accountsData.accounts?.length || 0);

    // Transform finAPI accounts to Taskilo format for dashboard
    const transformedAccounts = (accountsData.accounts || []).map((account: any) => ({
      id: account.id,
      accountName: account.accountName || 'Unbekanntes Konto',
      iban: account.iban,
      balance: account.balance || 0,
      availableBalance: account.balance || 0, // finAPI uses balance for both
      currency: account.currency || 'EUR',
      accountType: mapFinAPIAccountType(account.accountType),
      bankName: account.bankName || 'Unbekannte Bank',
      isDefault: false, // finAPI doesn't have default concept, we can set first as default
      bankConnectionId: account.bankConnectionId,
      accountNumber: account.accountNumber,
      subAccountNumber: account.subAccountNumber,
      isSeized: account.isSeized || false,
      lastSuccessfulUpdate: account.lastSuccessfulUpdate,
      lastUpdateAttempt: account.lastUpdateAttempt,
    }));

    // Set first account as default if any exist
    if (transformedAccounts.length > 0) {
      transformedAccounts[0].isDefault = true;
    }

    return NextResponse.json({
      success: true,
      accounts: transformedAccounts,
      totalCount: transformedAccounts.length,
      debug_info: {
        environment: credentialType,
        base_url: baseUrl,
        finapi_user_id: finapiUserId,
        raw_account_count: accountsData.accounts?.length || 0,
        timestamp: new Date().toISOString(),
      },
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

// POST /api/finapi/accounts - Account operations through finAPI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, credentialType = 'sandbox' } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log('Processing account action:', action, 'for user:', userId);

    // For now, return not implemented - would need specific account operations
    return NextResponse.json(
      {
        success: false,
        error: 'Account operations not implemented',
        message: 'Specific account operations to be implemented as needed',
      },
      { status: 501 }
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
