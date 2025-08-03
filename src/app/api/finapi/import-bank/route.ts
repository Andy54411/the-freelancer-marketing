import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl } from '@/lib/finapi-config';
import {
  BankConnectionsApi,
  createConfiguration,
  ServerConfiguration,
  BankingInterface,
} from 'finapi-client';

/**
 * Import Bank Connection - Creates connection between user and bank
 * This is the missing step to get accounts in finAPI Sandbox
 */
export async function POST(req: NextRequest) {
  try {
    const { access_token, bankId, credentials, credentialType = 'sandbox' } = await req.json();

    if (!access_token) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
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

    // Get correct base URL
    const baseUrl = getFinApiBaseUrl(credentialType);

    // finAPI SDK Configuration
    const server = new ServerConfiguration(baseUrl, {});
    const configuration = createConfiguration({
      baseServer: server,
      authMethods: {
        finapi_auth: {
          accessToken: access_token,
        },
      },
    });

    const bankConnectionsApi = new BankConnectionsApi(configuration);

    console.log(`Importing bank connection for bank ${bankId} with ${credentialType} environment`);

    // Import bank connection using finAPI SDK
    const importRequest = {
      bankId: bankId,
      bankingInterface: 'FINTS_SERVER' as BankingInterface, // Type assertion for banking interface
      loginCredentials: credentials.loginCredentials || credentials,
      storeSecrets: true, // Store credentials for automatic updates
      skipPositionsDownload: false, // Download account positions
      loadOwnerData: true, // Load account owner information
    };

    const importResponse = await bankConnectionsApi.importBankConnection(importRequest);

    console.log('Bank connection import started:', importResponse.id);

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Bank connection import started successfully',
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
