import { NextRequest, NextResponse } from 'next/server';
import { AccountsApi, createConfiguration, ServerConfiguration } from 'finapi-client';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // finAPI SDK Configuration
    const server = new ServerConfiguration('https://sandbox.finapi.io', {});
    const configuration = createConfiguration({
      baseServer: server,
      authMethods: {
        finapi_auth: {
          accessToken: token,
        },
      },
    });

    const accountsApi = new AccountsApi(configuration);

    console.log('Using finAPI SDK for accounts request');

    // finAPI Accounts Request mit SDK
    const accountsResponse = await accountsApi.getAndSearchAllAccounts();

    console.log('finAPI SDK accounts request successful');

    return NextResponse.json(accountsResponse);
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
