import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { companyId, scopes } = await request.json();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Google OAuth2 Konfiguration
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/oauth/callback/google-business`;

    console.log('OAuth Config:', { clientId: clientId ? 'SET' : 'MISSING', baseUrl, redirectUri });

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'Google OAuth not configured - Client ID missing' },
        { status: 500 }
      );
    }

    const scopeString = scopes?.join(' ') || 'https://www.googleapis.com/auth/business.manage';

    // Vereinfachtes State Parameter nur mit companyId
    const stateData = {
      companyId,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(7),
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopeString);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString(),
      state,
    });
  } catch (error) {
    console.error('OAuth URL generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to generate OAuth URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
