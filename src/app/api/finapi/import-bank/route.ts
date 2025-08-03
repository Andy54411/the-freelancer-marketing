import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl, getFinApiCredentials } from '@/lib/finapi-config';
import {
  AuthorizationApi,
  BankConnectionsApi,
  createConfiguration,
  ServerConfiguration,
  BankingInterface,
} from 'finapi-client';

/**
 * Import Bank Connection - Uses Taskilo's finAPI account to connect user banks
 * No user needs to create their own finAPI account!
 */
export async function POST(req: NextRequest) {
  try {
    const { bankId, userId, credentials, credentialType = 'sandbox' } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    if (!bankId || !credentials) {
      return NextResponse.json(
        {
          error: 'Bank ID and credentials are required',
          required_fields: ['bankId', 'credentials'],
          example_credentials: {
            loginCredentials: [
              { label: 'Anmeldename', value: 'demo' },
              { label: 'PIN', value: '1234' },
            ],
          },
        },
        { status: 400 }
      );
    }

    // Get Taskilo's finAPI configuration
    const baseUrl = getFinApiBaseUrl(credentialType);
    const taskiloCredentials = getFinApiCredentials(credentialType);

    if (!taskiloCredentials.clientId || !taskiloCredentials.clientSecret) {
      return NextResponse.json(
        { error: 'Taskilo finAPI credentials not configured' },
        { status: 500 }
      );
    }

    // Step 1: Get Taskilo's client credentials token
    const server = new ServerConfiguration(baseUrl, {});
    const authConfig = createConfiguration({ baseServer: server });
    const authApi = new AuthorizationApi(authConfig);

    const clientToken = await authApi.getToken(
      'client_credentials',
      taskiloCredentials.clientId,
      taskiloCredentials.clientSecret
    );

    // Step 2: Use Taskilo's token to import bank for user
    const configuration = createConfiguration({
      baseServer: server,
      authMethods: {
        finapi_auth: {
          accessToken: clientToken.accessToken,
        },
      },
    });

    const bankConnectionsApi = new BankConnectionsApi(configuration);

    console.log(
      `Importing bank connection for user ${userId} with bank ${bankId} using Taskilo's finAPI account`
    );

    // Import bank connection using Taskilo's finAPI account
    const importRequest = {
      bankId: bankId,
      bankingInterface: 'FINTS_SERVER' as BankingInterface,
      loginCredentials: credentials.loginCredentials || credentials,
      storeSecrets: true,
      skipPositionsDownload: false,
      loadOwnerData: true,
      // Store user reference for later identification
      externalId: userId, // Use Firebase UID as external ID
    };

    const importResponse = await bankConnectionsApi.importBankConnection(importRequest);

    console.log(
      'Bank connection import started for user:',
      userId,
      'Connection ID:',
      importResponse.id
    );

    // Store connection mapping in our database (you might want to save this to Firestore)
    // TODO: Save to Firestore: { userId, connectionId: importResponse.id, bankId, timestamp }

    return NextResponse.json({
      success: true,
      message: 'Bank connection import started successfully',
      userId: userId,
      bankConnection: {
        id: importResponse.id,
        bankId: importResponse.bank?.id,
        bankName: importResponse.bank?.name,
        updateStatus: importResponse.updateStatus,
        accountIds: importResponse.accountIds || [],
        accountsCount: importResponse.accountIds?.length || 0,
      },
      debug_info: {
        environment: credentialType,
        base_url: baseUrl,
        timestamp: new Date().toISOString(),
      },
      raw_response: importResponse,
    });
  } catch (error: any) {
    console.error('Bank connection import error:', error);

    // Enhanced error handling for finAPI import errors
    if (error.status && error.body) {
      return NextResponse.json(
        {
          error: 'Bank connection import failed',
          details: error.body?.errors?.[0]?.message || error.message,
          finapi_error_code: error.body?.errors?.[0]?.code,
          finapi_error_type: error.body?.errors?.[0]?.type,
          status_code: error.status,
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error during bank import',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get all bank connections for the user
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
  }

  const token = authHeader.substring(7);
  const { searchParams } = new URL(req.url);
  const credentialType = (searchParams.get('credentialType') as 'sandbox' | 'admin') || 'sandbox';

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

    const bankConnectionsApi = new BankConnectionsApi(configuration);

    // Get all bank connections
    const connectionsResponse = await bankConnectionsApi.getAllBankConnections();

    return NextResponse.json({
      success: true,
      connections: connectionsResponse.connections || [],
      total: connectionsResponse.connections?.length || 0,
      debug_info: {
        environment: credentialType,
        base_url: baseUrl,
        token_provided: !!token,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Get bank connections error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get bank connections',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
