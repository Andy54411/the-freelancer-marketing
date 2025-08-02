import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { credentialType = 'sandbox' } = await req.json();

    // Environment variables für finAPI Credentials
    const credentials =
      credentialType === 'admin'
        ? {
            clientId: process.env.FINAPI_ADMIN_CLIENT_ID,
            clientSecret: process.env.FINAPI_ADMIN_CLIENT_SECRET,
          }
        : {
            clientId: process.env.FINAPI_SANDBOX_CLIENT_ID,
            clientSecret: process.env.FINAPI_SANDBOX_CLIENT_SECRET,
          };

    if (!credentials.clientId || !credentials.clientSecret) {
      return NextResponse.json({ error: 'finAPI credentials not configured' }, { status: 500 });
    }

    // finAPI OAuth Token Request
    const authResponse = await fetch('https://sandbox.finapi.io/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64')}`,
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
