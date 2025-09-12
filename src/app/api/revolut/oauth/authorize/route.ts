import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/revolut/oauth/authorize
 * Start Revolut OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const companyEmail = searchParams.get('companyEmail');

    if (!userId || !companyEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: userId and companyEmail',
        },
        { status: 400 }
      );
    }

    // Build OAuth URL - always use registered HTTPS callback for Revolut OAuth
    const clientId = process.env.REVOLUT_CLIENT_ID;
    const redirectUri = 'https://taskilo.de/api/revolut/oauth/callback';

    const baseUrl =
      process.env.REVOLUT_ENVIRONMENT === 'production'
        ? 'https://business.revolut.com'
        : 'https://sandbox-business.revolut.com';

    const authUrl = new URL(`${baseUrl}/oauth/authorize`);
    authUrl.searchParams.set('client_id', clientId!);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'READ');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set(
      'state',
      `${userId}|${companyEmail}|${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}`
    );

    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString(),
      message: 'Redirect to Revolut OAuth',
      provider: 'revolut',
      flow: 'oauth',
    });
  } catch (error: any) {
    console.error('❌ Revolut OAuth authorize error:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start Revolut OAuth',
        details: error.message,
        provider: 'revolut',
        flow: 'oauth',
      },
      { status: 500 }
    );
  }
}
