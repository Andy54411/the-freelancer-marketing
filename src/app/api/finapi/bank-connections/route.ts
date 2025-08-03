import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl } from '@/lib/finapi-config';
import { BankConnectionsApi, createConfiguration, ServerConfiguration } from 'finapi-client';

// Create a new bank connection for a user
export async function POST(req: NextRequest) {
  try {
    const { access_token } = await req.json();

    if (!access_token) {
      return NextResponse.json({ error: 'Access token required in request body' }, { status: 401 });
    }

    // For now, return a mock success response as bank connection setup is complex
    // In a real implementation, you would use WebForm flow or other finAPI connection methods
    return NextResponse.json({
      success: true,
      message:
        'Bank connection workflow initiated. In production, this would redirect to finAPI WebForm.',
      note: 'This is a simplified demo response. Real bank connections require multi-step authentication.',
    });
  } catch (error) {
    console.error('finAPI bank connection error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Failed to create bank connection',
          details: error.message,
          type: 'BANK_CONNECTION_ERROR',
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
