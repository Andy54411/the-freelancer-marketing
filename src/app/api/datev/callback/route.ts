import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig, DATEV_ENDPOINTS } from '@/lib/datev-config';

/**
 * DATEV OAuth Callback Handler
 * Handles the OAuth callback from DATEV and exchanges code for access token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const error_description = searchParams.get('error_description');

    const redirectUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/dashboard/company/setup/banking'
        : 'https://taskilo.de/dashboard/company/setup/banking';

    // Check for OAuth errors
    if (error) {
      console.error('DATEV OAuth error:', error, error_description);
      return NextResponse.redirect(
        `${redirectUrl}?error=oauth_error&message=${encodeURIComponent(error_description || error)}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('Missing required OAuth parameters');
      return NextResponse.redirect(`${redirectUrl}?error=missing_params`);
    }

    // TODO: Validate state parameter against stored value (CSRF protection)
    // In production, you should verify the state parameter matches what was sent

    const config = getDatevConfig();

    // Exchange authorization code for access token
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('DATEV token exchange failed:', errorData);
      return NextResponse.redirect(`${redirectUrl}?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();

    // Get user information from DATEV
    const userResponse = await fetch(`${config.baseUrl}${DATEV_ENDPOINTS.userInfo}`, {
      headers: {
        Authorization: `${tokenData.token_type} ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch DATEV user info');
      return NextResponse.redirect(`${redirectUrl}?error=user_info_failed`);
    }

    const userData = await userResponse.json();

    // Prepare token data for client
    const clientTokenData = {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      refresh_token: tokenData.refresh_token,
      scope: tokenData.scope,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name || userData.email,
        organization: userData.organization,
        created_at: new Date().toISOString(),
      },
    };

    // Create success redirect with token data
    const successUrl = new URL(redirectUrl);
    successUrl.searchParams.set('datev_auth', 'success');
    successUrl.searchParams.set(
      'token_data',
      Buffer.from(JSON.stringify(clientTokenData)).toString('base64')
    );

    return NextResponse.redirect(successUrl.toString());
  } catch (error) {
    console.error('DATEV OAuth callback error:', error);
    const redirectUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/dashboard/company/setup/banking'
        : 'https://taskilo.de/dashboard/company/setup/banking';
    return NextResponse.redirect(`${redirectUrl}?error=callback_error`);
  }
}

/**
 * Handle preflight OPTIONS request for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
