import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl, getFinApiCredentials, buildFinApiAuthHeader } from '@/lib/finapi-config';

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

    // finAPI OAuth Token Request
    const authResponse = await fetch(`${baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: buildFinApiAuthHeader(credentials.clientId, credentials.clientSecret),
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('finAPI auth failed:', errorText);
      return NextResponse.json(
        { error: 'Authentication failed', details: errorText },
        { status: authResponse.status }
      );
    }

    const authData = await authResponse.json();

    return NextResponse.json({
      access_token: authData.access_token,
      token_type: authData.token_type,
      expires_in: authData.expires_in,
    });
  } catch (error) {
    console.error('finAPI auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
