import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl, getFinApiCredentials } from '@/lib/finapi-config';
import {
  AuthorizationApi,
  BankConnectionsApi,
  createConfiguration,
  ServerConfiguration,
} from 'finapi-client';

// GET /api/finapi/bank-connections - Get bank connections for user through Taskilo's account
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
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

    // Set up bank connections API with client token
    const bankConnectionsConfiguration = createConfiguration({
      baseServer: server,
      authMethods: {
        finapi_auth: {
          accessToken: clientToken.accessToken,
        },
      },
    });

    const bankConnectionsApi = new BankConnectionsApi(bankConnectionsConfiguration);

    // Get bank connections filtered by user (through externalId or search)
    const response = await bankConnectionsApi.getAllBankConnections();

    console.log('Bank connections retrieved for user:', userId, response.connections?.length || 0);

    return NextResponse.json({
      success: true,
      data: response.connections,
      bankConnections: response.connections || [],
      totalCount: response.connections?.length || 0,
    });
  } catch (error: any) {
    console.error('finAPI bank connections error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get bank connections',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// POST /api/finapi/bank-connections - Manage bank connections through Taskilo's account
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

    // Set up bank connections API with client token
    const bankConnectionsConfiguration = createConfiguration({
      baseServer: server,
      authMethods: {
        finapi_auth: {
          accessToken: clientToken.accessToken,
        },
      },
    });

    const bankConnectionsApi = new BankConnectionsApi(bankConnectionsConfiguration);

    if (action === 'import') {
      // Import bank connection through Taskilo's account
      const { bankId, loginCredentials } = body;

      const connection = await bankConnectionsApi.importBankConnection({
        bankId,
        bankingInterface: 'FINTS_SERVER',
        loginCredentials,
        // Link to user via externalId or other mechanism
      });

      return NextResponse.json({
        success: true,
        data: connection,
        message: `Bank connection imported for user ${userId}`,
      });
    }

    if (action === 'delete') {
      // Delete bank connection
      const { bankConnectionId } = body;

      await bankConnectionsApi.deleteBankConnection(bankConnectionId);

      return NextResponse.json({
        success: true,
        message: 'Bank connection deleted successfully',
      });
    }

    if (action === 'edit') {
      // Edit bank connection
      const { bankConnectionId, name } = body;

      const connection = await bankConnectionsApi.editBankConnection(bankConnectionId, {
        name,
      });

      return NextResponse.json({
        success: true,
        data: connection,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action specified' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('finAPI bank connections POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process bank connection request',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
