import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl, getFinApiCredentials } from '@/lib/finapi-config';
import { AuthorizationApi, createConfiguration, ServerConfiguration } from 'finapi-client';

export async function POST(req: NextRequest) {
  try {
    const { credentialType = 'sandbox' } = await req.json();

    // Debug: Log all available environment variables
    console.log('Environment variables check:');
    console.log(
      'FINAPI_SANDBOX_CLIENT_ID:',
      process.env.FINAPI_SANDBOX_CLIENT_ID ? 'SET' : 'NOT SET'
    );
    console.log(
      'FINAPI_SANDBOX_CLIENT_SECRET:',
      process.env.FINAPI_SANDBOX_CLIENT_SECRET ? 'SET' : 'NOT SET'
    );
    console.log('FINAPI_ADMIN_CLIENT_ID:', process.env.FINAPI_ADMIN_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log(
      'FINAPI_ADMIN_CLIENT_SECRET:',
      process.env.FINAPI_ADMIN_CLIENT_SECRET ? 'SET' : 'NOT SET'
    );

    // Get finAPI configuration
    const baseUrl = getFinApiBaseUrl(credentialType);
    const credentials = getFinApiCredentials(credentialType);

    console.log(`Using ${credentialType} credentials with base URL: ${baseUrl}`);
    console.log('Credentials:', {
      clientId: credentials.clientId ? credentials.clientId.substring(0, 8) + '...' : 'NOT SET',
      clientSecret: credentials.clientSecret ? 'SET' : 'NOT SET',
    });

    if (!credentials.clientId || !credentials.clientSecret) {
      console.error('Missing credentials:', {
        clientId: !!credentials.clientId,
        clientSecret: !!credentials.clientSecret,
      });
      return NextResponse.json({ error: 'finAPI credentials not configured' }, { status: 500 });
    }

    // finAPI SDK Configuration
    const server = new ServerConfiguration(baseUrl, {});
    const configuration = createConfiguration({
      baseServer: server,
    });

    const authApi = new AuthorizationApi(configuration);

    console.log(`Making SDK request to: ${baseUrl}/api/v2/oauth/token`);
    console.log('Using finAPI SDK for authentication');

    // OAuth Token Request mit finAPI SDK
    const authResponse = await authApi.getToken(
      'client_credentials',
      credentials.clientId,
      credentials.clientSecret
    );

    console.log('finAPI SDK auth successful');

    return NextResponse.json({
      access_token: authResponse.accessToken,
      token_type: authResponse.tokenType || 'Bearer',
      expires_in: authResponse.expiresIn,
    });
  } catch (error) {
    console.error('finAPI SDK auth error:', error);

    // Enhanced error handling for finAPI SDK
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Authentication failed',
          details: error.message,
          type: 'SDK_ERROR',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
