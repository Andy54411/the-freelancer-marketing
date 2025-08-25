import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl, getFinApiCredentials } from '@/lib/finapi-config';
import { AuthorizationApi, createConfiguration, ServerConfiguration } from 'finapi-client';

export async function POST(req: NextRequest) {
  try {
    const { credentialType = 'sandbox' } = await req.json();

    // Debug: Log all available environment variables

    // Get finAPI configuration
    const baseUrl = getFinApiBaseUrl(credentialType);
    const credentials = getFinApiCredentials(credentialType);

    if (!credentials.clientId || !credentials.clientSecret) {

      return NextResponse.json({ error: 'finAPI credentials not configured' }, { status: 500 });
    }

    // finAPI SDK Configuration
    const server = new ServerConfiguration(baseUrl, {});
    const configuration = createConfiguration({
      baseServer: server,
    });

    const authApi = new AuthorizationApi(configuration);

    // OAuth Token Request mit finAPI SDK
    const authResponse = await authApi.getToken(
      'client_credentials',
      credentials.clientId,
      credentials.clientSecret
    );

    return NextResponse.json({
      access_token: authResponse.accessToken,
      token_type: authResponse.tokenType || 'Bearer',
      expires_in: authResponse.expiresIn,
    });
  } catch (error) {

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
