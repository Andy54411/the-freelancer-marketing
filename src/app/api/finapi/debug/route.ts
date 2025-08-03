import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl } from '@/lib/finapi-config';
import {
  AccountsApi,
  BankConnectionsApi,
  BanksApi,
  createConfiguration,
  ServerConfiguration,
} from 'finapi-client';

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

    const accountsApi = new AccountsApi(configuration);
    const bankConnectionsApi = new BankConnectionsApi(configuration);
    const banksApi = new BanksApi(configuration);

    console.log(`Debug finAPI with ${credentialType} environment at ${baseUrl}`);

    // 1. Check accounts
    const accountsResponse = await accountsApi.getAndSearchAllAccounts();

    // 2. Check bank connections
    const connectionsResponse = await bankConnectionsApi.getAllBankConnections();

    // 3. Check available test banks - simplified call
    const banksResponse = await banksApi.getAndSearchAllBanks();

    return NextResponse.json({
      success: true,
      debug_info: {
        environment: credentialType,
        base_url: baseUrl,
        token_provided: !!token,
        timestamp: new Date().toISOString(),
      },
      accounts: {
        count: accountsResponse.accounts?.length || 0,
        data: accountsResponse.accounts || [],
      },
      bank_connections: {
        count: connectionsResponse.connections?.length || 0,
        data: connectionsResponse.connections || [],
      },
      test_banks: {
        count: banksResponse.banks?.length || 0,
        data: banksResponse.banks?.slice(0, 5) || [], // First 5 test banks
      },
      raw_responses: {
        accounts_raw: accountsResponse,
        connections_raw: connectionsResponse,
        banks_raw: banksResponse,
      },
    });
  } catch (error) {
    console.error('finAPI debug error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Debug request failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        debug_info: {
          environment: credentialType,
          base_url: getFinApiBaseUrl(credentialType),
          token_provided: !!token,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
