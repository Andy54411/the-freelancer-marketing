import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig } from '@/lib/datev-config';
import { getDatevCookieName } from '@/lib/datev-server-utils';

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
      const config = getDatevConfig(); // Get config for metadata

      console.log('✅ [DATEV Cookie Callback] Token exchange successful:', {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
      });

      // Store tokens in cookies using NextResponse
      const response = NextResponse.redirect(
        `${redirectUrl}?datev_auth=success&company=${companyId}&timestamp=${Date.now()}`
      );

      // Create secure cookie value with consistent structure for datev-server-utils.ts
      const expiresAt = Date.now() + (tokenData.expires_in || 3600) * 1000;

      const fullTokenData = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type || 'Bearer',
        expires_at: expiresAt, // Convert expires_in to expires_at timestamp
        expires_in: tokenData.expires_in, // Keep original expires_in for calculations
        scope: tokenData.scope || '',
        // Additional metadata
        connected_at: Date.now(),
        company_id: companyId,
        // Environment metadata for hybrid setup
        environment: process.env.NODE_ENV,
        client_id: config.clientId,
        api_base_url: config.apiBaseUrl,
      };

      // Encode token data as base64 for safe cookie storage
      const encodedData = Buffer.from(JSON.stringify(fullTokenData)).toString('base64');
      const cookieName = getDatevCookieName(companyId);

      // Set secure HTTP-only cookie
      response.cookies.set(cookieName, encodedData, {
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true, // Server-only for security
      });

      console.log(
        '✅ [DATEV Cookie Callback] Tokens stored in HTTP-only cookie for company:',
        companyId,
        {
          cookieName,
          dataSize: encodedData.length,
          expiresIn: tokenData.expires_in,
          scope: tokenData.scope || '',
        }
      );

      console.log('🔄 [DATEV Cookie Callback] Redirecting to success page...');
      return response;
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

  // Use same redirect_uri as in auth request - DATEV Sandbox Requirement
  // WICHTIG: Port 80 Proxy für DATEV Sandbox Compliance
  const cookieRedirectUri =
    process.env.NODE_ENV === 'development'
      ? 'http://localhost' // DATEV Sandbox: Port 80 Proxy Server
      : 'https://taskilo.de/api/datev/callback';

  // DATEV PKCE Flow - Try with HTTP Basic Auth only (remove client_secret from body)
  const tokenRequestData = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: cookieRedirectUri,
    client_id: config.clientId,
    code_verifier: codeVerifier,
    // No client_secret in body when using Basic Auth
  });

  // First try without client_secret (standard PKCE)
  console.log('🔄 [DATEV Cookie Callback] Exchanging code for tokens (PKCE-only)...', {
    redirectUri: cookieRedirectUri,
    hasCode: !!code,
    hasVerifier: !!codeVerifier,
    clientId: config.clientId,
    tokenUrl: config.tokenUrl,
    requestBody: Object.fromEntries(tokenRequestData.entries()),
  });

  console.log('🌐 [DATEV Debug] Sending token request to:', config.tokenUrl);

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      // Try HTTP Basic Auth for DATEV client authentication
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
    },
    body: tokenRequestData.toString(),
  });

  // If PKCE-only fails with invalid_client, try with client_secret
  if (!response.ok && response.status === 401) {
    console.log('⚠️ [DATEV Cookie Callback] PKCE-only failed, trying with client_secret...');

    const tokenRequestDataWithSecret = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: cookieRedirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code_verifier: codeVerifier,
    });

    const responseWithSecret = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        // Try HTTP Basic Auth for client authentication
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      },
      body: tokenRequestDataWithSecret.toString(),
    });

    if (!responseWithSecret.ok) {
      const errorText = await responseWithSecret.text();
      console.error('Token exchange failed (both attempts):', {
        pkceOnlyStatus: response.status,
        withSecretStatus: responseWithSecret.status,
        error: errorText,
      });
      throw new Error(
        `Token exchange failed: ${responseWithSecret.status} ${responseWithSecret.statusText}`
      );
    }

    const tokenData = await responseWithSecret.json();

    if (!tokenData.access_token) {
      throw new Error('No access token received');
    }

    return tokenData;
  }

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
