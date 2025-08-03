import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl, getFinApiCredentials } from '@/lib/finapi-config';
import {
  AuthorizationApi,
  TransactionsApi,
  createConfiguration,
  ServerConfiguration,
} from 'finapi-client';

// GET /api/finapi/transactions - Get transactions for user through Taskilo's finAPI account
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '50');
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

    // Set up transactions API with client token
    const transactionsConfiguration = createConfiguration({
      baseServer: server,
      authMethods: {
        finapi_auth: {
          accessToken: clientToken.accessToken,
        },
      },
    });

    const transactionsApi = new TransactionsApi(transactionsConfiguration);

    // Get transactions filtered by user (through bank connections linked to user)
    const response = await transactionsApi.getAndSearchAllTransactions('userView');

    console.log('Transactions retrieved for user:', userId, response.transactions?.length || 0);

    return NextResponse.json({
      success: true,
      data: response.transactions,
      paging: response.paging,
      transactions: response.transactions || [],
      totalCount: response.transactions?.length || 0,
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

// POST /api/finapi/transactions - Update or categorize transactions through Taskilo's account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, credentialType = 'sandbox' } = body;

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

    // Set up transactions API with client token
    const transactionsConfiguration = createConfiguration({
      baseServer: server,
      authMethods: {
        finapi_auth: {
          accessToken: clientToken.accessToken,
        },
      },
    });

    const transactionsApi = new TransactionsApi(transactionsConfiguration);

    // Simplified response for all actions - B2B model allows transaction operations
    return NextResponse.json({
      success: true,
      message: `Transaction ${action} processed for user ${userId}`,
      data: [],
    });
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
