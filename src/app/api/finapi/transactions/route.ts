import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl, getFinApiCredentials } from '@/lib/finapi-config';

// GET /api/finapi/transactions - Get transactions for user through finAPI
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '100');
    const userId = searchParams.get('userId'); // Firebase user ID
    const credentialType = (searchParams.get('credentialType') as 'sandbox' | 'admin') || 'sandbox';

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log('🔄 Getting transactions for user:', userId);

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

    // Step 2: Get user access token (consistent with accounts logic)
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
      console.log('⚠️ User not found in finAPI - no transactions to show');
      return NextResponse.json({
        success: true,
        transactions: [],
        totalCount: 0,
        paging: { page, perPage, pageCount: 0, totalCount: 0 },
        message: 'No finAPI user found - please connect a bank first',
      });
    }

    const userTokenData = await userTokenResponse.json();
    const userAccessToken = userTokenData.access_token;

    // Step 3: Get transactions from finAPI
    const transactionsResponse = await fetch(
      `${baseUrl}/api/v2/transactions?page=${page}&perPage=${perPage}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!transactionsResponse.ok) {
      const errorText = await transactionsResponse.text();
      console.error('❌ Failed to get transactions:', errorText);
      return NextResponse.json(
        { error: 'Failed to get transactions from finAPI' },
        { status: 500 }
      );
    }

    const transactionsData = await transactionsResponse.json();
    console.log('✅ Retrieved transactions:', transactionsData.transactions?.length || 0);

    // Transform finAPI transactions to Taskilo format for dashboard
    const transformedTransactions = (transactionsData.transactions || []).map(
      (transaction: any) => ({
        id: transaction.id.toString(),
        accountId: transaction.accountId.toString(),
        amount: transaction.amount || 0,
        currency: transaction.currency || 'EUR',
        purpose: transaction.purpose || 'Keine Beschreibung',
        counterpartName: transaction.counterpartName,
        counterpartIban: transaction.counterpartIban,
        bookingDate: transaction.bookingDate,
        valueDate: transaction.valueDate,
        transactionType: transaction.amount >= 0 ? 'CREDIT' : 'DEBIT',
        category: transaction.category?.name,
        categoryId: transaction.category?.id,
        isReconciled: false,
        isPending: transaction.isPending || false,
        transactionCode: transaction.transactionCode,
        bankTransactionCode: transaction.bankTransactionCode,
      })
    );

    return NextResponse.json({
      success: true,
      transactions: transformedTransactions,
      totalCount: transactionsData.paging?.totalCount || transformedTransactions.length,
      paging: {
        page: transactionsData.paging?.page || page,
        perPage: transactionsData.paging?.perPage || perPage,
        pageCount: transactionsData.paging?.pageCount || 1,
        totalCount: transactionsData.paging?.totalCount || transformedTransactions.length,
      },
      debug_info: {
        environment: credentialType,
        base_url: baseUrl,
        finapi_user_id: finapiUserId,
        raw_transaction_count: transactionsData.transactions?.length || 0,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('finAPI transactions error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get transactions',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// POST /api/finapi/transactions - Update or categorize transactions through finAPI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, credentialType = 'sandbox' } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log('Processing transaction action:', action, 'for user:', userId);

    // For now, return not implemented - would need specific transaction operations
    return NextResponse.json(
      {
        success: false,
        error: 'Transaction updates not implemented',
        message: 'Specific transaction operations to be implemented as needed',
      },
      { status: 501 }
    );
  } catch (error: any) {
    console.error('finAPI transactions POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process transaction request',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
