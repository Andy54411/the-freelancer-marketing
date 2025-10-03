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

    // Default redirect URL - will be updated with actual companyId
    let redirectUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/dashboard/company/unknown/datev/setup'
        : 'https://taskilo.de/dashboard/company/unknown/datev/setup';

    // Check for OAuth errors
    if (error) {
      return NextResponse.redirect(
        `${redirectUrl}?error=${error}&message=${encodeURIComponent(error_description || 'Unknown error')}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
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

      if (!companyId || !codeVerifier) {
        throw new Error('Invalid state data');
      }
    } catch (parseError) {
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
        // Environment metadata for hybrid setup - FORCE CLIENT ID CONSISTENCY
        environment: process.env.NODE_ENV,
        client_id: '6111ad8e8cae82d1a805950f2ae4adc4', // FORCE CONSISTENT SANDBOX CLIENT ID
        original_client_id: config.clientId, // Store original for debugging
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

      return response;
    } catch (tokenError) {
      return NextResponse.redirect(
        `${redirectUrl}?error=token_exchange_failed&message=${encodeURIComponent('Failed to exchange authorization code for tokens')}`
      );
    }
  } catch (error) {
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

  // DATEV PKCE Flow - Try with consistent client ID for sandbox compliance
  const tokenRequestData = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: cookieRedirectUri,
    client_id: '6111ad8e8cae82d1a805950f2ae4adc4', // FORCE CONSISTENT SANDBOX CLIENT ID
    code_verifier: codeVerifier,
    // No client_secret in body when using Basic Auth
  });

  // First try without client_secret (standard PKCE)

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
    const tokenRequestDataWithSecret = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: cookieRedirectUri,
      client_id: '6111ad8e8cae82d1a805950f2ae4adc4', // CONSISTENT SANDBOX CLIENT ID
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

    throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
  }

  const tokenData = await response.json();

  // Validate required token fields
  if (!tokenData.access_token) {
    throw new Error('No access token received');
  }

  return tokenData;
}
