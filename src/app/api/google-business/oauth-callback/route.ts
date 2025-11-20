import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { companyId, code, state } = await request.json();

    if (!companyId || !code || !state) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // State validieren (enthält companyId)
    if (!state.startsWith(companyId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid state parameter' },
        { status: 400 }
      );
    }

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/callback/google-business`;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, error: 'Google OAuth not configured' },
        { status: 500 }
      );
    }

    // Access Token anfordern
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange error:', errorData);
      return NextResponse.json(
        { success: false, error: 'Failed to exchange code for token' },
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();

    return NextResponse.json({
      success: true,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
      token_type: tokenData.token_type,
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process OAuth callback' },
      { status: 500 }
    );
  }
}

// GET Route für direkten Browser-Callback
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    // Fehler-Redirect
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?google_business_error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?google_business_error=missing_parameters`
    );
  }

  // State parsen um companyId zu extrahieren
  const companyId = state.split('_')[0];

  if (!companyId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?google_business_error=invalid_state`
    );
  }

  // Redirect zurück zur Kampagnen-Seite mit Code und State
  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${companyId}/taskilo-advertising/google-ads/campaigns/new/objectives?google_business_code=${encodeURIComponent(code)}&google_business_state=${encodeURIComponent(state)}`
  );
}
