import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig } from '@/lib/datev-config';
import { retrievePKCEData } from '@/lib/pkce-storage';
import { DatevCookieManager } from '@/lib/datev-cookie-manager';

/**
 * DATEV OAuth Callback Handler - Cookie Based
 * Simplified version that stores tokens directly in cookies
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const error_description = searchParams.get('error_description');

    console.log('🔄 [DATEV Cookie Callback] Callback received:', {
      code: code ? `${code.substring(0, 10)}...` : null,
      state: state,
      error: error,
      error_description: error_description,
    });

    // Default redirect URL - will be updated with actual companyId
    let redirectUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/dashboard/company/unknown/datev/setup'
        : 'https://taskilo.de/dashboard/company/unknown/datev/setup';

    // Check for OAuth errors
    if (error) {
      console.error('DATEV OAuth error:', { error, error_description });
      return NextResponse.redirect(
        `${redirectUrl}?error=${error}&message=${encodeURIComponent(error_description || 'Unknown error')}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('Missing required OAuth parameters:', { code: !!code, state: !!state });
      return NextResponse.redirect(
        `${redirectUrl}?error=missing_parameters&message=${encodeURIComponent('Missing required OAuth parameters')}`
      );
    }

    // Parse state parameter to get company ID
    let companyId: string;
    let codeVerifier: string;

    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      companyId = stateData.companyId;
      codeVerifier = stateData.codeVerifier;

      console.log('🔍 [DATEV Cookie Callback] Parsed state:', {
        companyId,
        hasCodeVerifier: !!codeVerifier,
      });

      if (!companyId || !codeVerifier) {
        throw new Error('Invalid state data');
      }
    } catch (parseError) {
      console.error('Failed to parse state parameter:', parseError);
      return NextResponse.redirect(
        `${redirectUrl}?error=invalid_state&message=${encodeURIComponent('Invalid state parameter')}`
      );
    }

    // Update redirect URL with correct company ID
    redirectUrl =
      process.env.NODE_ENV === 'development'
        ? `http://localhost:3000/dashboard/company/${companyId}/datev/setup`
        : `https://taskilo.de/dashboard/company/${companyId}/datev/setup`;

    try {
      // Exchange authorization code for tokens
      const tokenData = await exchangeCodeForTokens(code, codeVerifier);

      console.log('✅ [DATEV Cookie Callback] Token exchange successful:', {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
      });

      // Store tokens in cookies
      DatevCookieManager.setTokens(companyId, {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: Date.now() + tokenData.expires_in * 1000,
        scope: tokenData.scope || '',
        token_type: tokenData.token_type || 'Bearer',
      });

      console.log('✅ [DATEV Cookie Callback] Tokens stored in cookies for company:', companyId);

      // Redirect to success page
      const successUrl = `${redirectUrl}?datev_auth=success&company=${companyId}&timestamp=${Date.now()}`;
      console.log('🔄 [DATEV Cookie Callback] Redirecting to:', successUrl);

      return NextResponse.redirect(successUrl);
    } catch (tokenError) {
      console.error('❌ [DATEV Cookie Callback] Token exchange failed:', tokenError);
      return NextResponse.redirect(
        `${redirectUrl}?error=token_exchange_failed&message=${encodeURIComponent('Failed to exchange authorization code for tokens')}`
      );
    }
  } catch (error) {
    console.error('❌ [DATEV Cookie Callback] Unexpected error:', error);

    const fallbackUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/dashboard/company/unknown/datev/setup'
        : 'https://taskilo.de/dashboard/company/unknown/datev/setup';

    return NextResponse.redirect(
      `${fallbackUrl}?error=internal_server_error&message=${encodeURIComponent('Internal server error')}`
    );
  }
}

/**
 * Exchange authorization code for tokens using PKCE
 */
async function exchangeCodeForTokens(code: string, codeVerifier: string) {
  const config = getDatevConfig();

  const tokenRequestData = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code_verifier: codeVerifier,
  });

  console.log('🔄 [DATEV Cookie Callback] Exchanging code for tokens...');

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: tokenRequestData.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token exchange failed:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
  }

  const tokenData = await response.json();

  // Validate required token fields
  if (!tokenData.access_token) {
    throw new Error('No access token received');
  }

  return tokenData;
}
