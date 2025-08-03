import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl } from '@/lib/finapi-config';
import { BankConnectionsApi, createConfiguration, ServerConfiguration } from 'finapi-client';

interface BankConnectionRequest {
  access_token: string;
  bankId: number;
  bankingUserId: string;
  bankingPin: string;
  credentialType?: 'sandbox' | 'admin';
}

// Create a new bank connection for a user
export async function POST(req: NextRequest) {
  try {
    const {
      access_token,
      bankId,
      bankingUserId,
      bankingPin,
      credentialType = 'sandbox',
    }: BankConnectionRequest = await req.json();

    if (!access_token) {
      return NextResponse.json({ error: 'Access token required in request body' }, { status: 401 });
    }

    if (!bankId || !bankingUserId || !bankingPin) {
      return NextResponse.json(
        {
          error: 'Bank ID, banking user ID, and banking PIN are required',
          required_fields: ['bankId', 'bankingUserId', 'bankingPin'],
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

    console.log(
      `Demo bank connection request with ${credentialType} environment for bank ${bankId}`
    );

    // NOTE: Real bank connections in finAPI require WebForm 2.0 or complex multi-step process
    // For this demo, we simulate a successful connection

    // In production, this would be:
    // 1. Create WebForm 2.0 URL
    // 2. Redirect user to finAPI WebForm
    // 3. Handle callback with bank connection ID
    // 4. Update accounts via webhook

    return NextResponse.json({
      success: true,
      connection: {
        id: `demo_connection_${bankId}_${Date.now()}`,
        bankId: bankId,
        bankName: `Demo Bank ${bankId}`,
        updateStatus: 'SUCCESSFUL',
        lastSuccessfulUpdate: new Date().toISOString(),
        demo: true,
      },
      message: 'Demo bank connection created successfully',
      production_note:
        'In production, this would use finAPI WebForm 2.0 for secure bank authentication',
      next_steps: [
        'User would be redirected to bank login page',
        'After successful authentication, accounts would be imported',
        'Webhook would notify your backend about completion',
        'Account data would be available via /api/finapi/accounts',
      ],
    });
  } catch (error) {
    console.error('finAPI bank connection error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Failed to create bank connection',
          details: error.message,
          type: 'BANK_CONNECTION_ERROR',
          suggestion:
            'Check if the provided banking credentials are correct or if the bank requires 2FA.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get all bank connections for a user
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { searchParams } = new URL(req.url);
    const credentialType = (searchParams.get('credentialType') as 'sandbox' | 'admin') || 'sandbox';

    // Get finAPI configuration
    const baseUrl = getFinApiBaseUrl(credentialType);
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
    const bankConnections = await bankConnectionsApi.getAllBankConnections();

    console.log('Bank connections retrieved:', bankConnections.connections?.length || 0);

    return NextResponse.json({
      connections:
        bankConnections.connections?.map(conn => ({
          id: conn.id,
          bank: conn.bank,
          name: conn.name,
          updateStatus: conn.updateStatus,
          accountIds: conn.accountIds,
        })) || [],
      totalCount: bankConnections.connections?.length || 0,
    });
  } catch (error) {
    console.error('finAPI get bank connections error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Failed to get bank connections',
          details: error.message,
          type: 'BANK_CONNECTIONS_ERROR',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
