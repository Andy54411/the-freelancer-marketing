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
        ? 'http://localhost:3000/dashboard/company/setup/datev'
        : 'https://taskilo.de/dashboard/company/setup/datev';

    // Log detailed callback information for debugging
    console.log('DATEV OAuth Callback received:', {
      code: code ? `${code.substring(0, 10)}...` : null,
      state: state,
      error: error,
      error_description: error_description,
      timestamp: new Date().toISOString(),
    });

    // Check for OAuth errors
    if (error) {
      console.error('DATEV OAuth error:', error, error_description);

      // Parse state for company ID even in error case
      let companyId = 'unknown';
      try {
        const stateParts = state?.split(':');
        if (stateParts && stateParts.length >= 2 && stateParts[0] === 'company') {
          companyId = stateParts[1];
        }
      } catch (error) {
        console.warn('Failed to parse state parameter in error case:', state);
      }

      const errorRedirectUrl = `${redirectUrl.replace('/setup/datev', `/${companyId}/datev/setup`)}`;
      return NextResponse.redirect(
        `${errorRedirectUrl}?error=oauth_error&message=${encodeURIComponent(error_description || error)}&request_id=${Date.now()}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('Missing required OAuth parameters - Code:', !!code, 'State:', !!state);
      const errorRedirectUrl = `${redirectUrl.replace('/setup/datev', `/unknown/datev/setup`)}`;
      return NextResponse.redirect(
        `${errorRedirectUrl}?error=missing_params&details=${encodeURIComponent(`Code: ${!!code}, State: ${!!state}`)}`
      );
    }

    // Parse state to extract company ID
    let companyId = 'unknown';
    try {
      const stateParts = state.split(':');
      if (stateParts && stateParts.length >= 2 && stateParts[0] === 'company') {
        companyId = stateParts[1];
      }
    } catch (error) {
      console.warn('Failed to parse state parameter:', state);
    }

    // Update redirect URL with company ID
    const finalRedirectUrl = `${redirectUrl.replace('/setup/datev', `/${companyId}/datev/setup`)}`;

    // TODO: Validate state parameter against stored value (CSRF protection)
    // In production, you should verify the state parameter matches what was sent

    const config = getDatevConfig();

    // Log token exchange attempt for debugging
    console.log('DATEV Token Exchange attempt:', {
      tokenUrl: config.tokenUrl,
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      codePresent: !!code,
      codeLength: code ? code.length : 0,
      timestamp: new Date().toISOString(),
    });

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
      console.error('DATEV token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorData,
        url: config.tokenUrl,
        clientId: config.clientId,
        redirectUri: config.redirectUri,
        timestamp: new Date().toISOString(),
      });

      // Try to parse error for more details
      let errorMessage = 'Token exchange failed';
      let requestId = 'unknown';
      try {
        const errorJson = JSON.parse(errorData);
        errorMessage = errorJson.error_description || errorJson.error || errorMessage;
        requestId = errorJson.request_id || requestId;
      } catch {
        // Keep default message if JSON parsing fails
      }

      return NextResponse.redirect(
        `${finalRedirectUrl}?error=token_exchange_failed&message=${encodeURIComponent(errorMessage)}&request_id=${requestId}&status=${tokenResponse.status}`
      );
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
      const errorData = await userResponse.text();
      console.error('Failed to fetch DATEV user info:', {
        status: userResponse.status,
        statusText: userResponse.statusText,
        error: errorData,
      });

      // If this fails, the token might be invalid even though exchange succeeded
      return NextResponse.redirect(
        `${finalRedirectUrl}?error=user_info_failed&message=${encodeURIComponent('Could not fetch user information')}`
      );
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
    const successUrl = new URL(finalRedirectUrl);
    successUrl.searchParams.set('datev_auth', 'success');
    successUrl.searchParams.set(
      'token_data',
      Buffer.from(JSON.stringify(clientTokenData)).toString('base64')
    );

    return NextResponse.redirect(successUrl.toString());
  } catch (error) {
    console.error('DATEV OAuth callback error:', error);
    const errorRedirectUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/dashboard/company/unknown/datev/setup'
        : 'https://taskilo.de/dashboard/company/unknown/datev/setup';
    return NextResponse.redirect(`${errorRedirectUrl}?error=callback_error`);
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
