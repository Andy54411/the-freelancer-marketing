/**
 * DATEV Organizations API Route - Hybrid Edition
 * Enhanced for both Development (Sandbox) and Production environments
 * Uses token-embedded environment data for consistent API calls
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDatevConfig } from '@/lib/datev-config';

// DATEV API Endpoints
const DATEV_ENDPOINTS = {
  organizations: '/platform/v1/organizations',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json(
        { error: 'missing_company_id', message: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    console.log('[DATEV Organizations] Fetching organizations for company:', companyId);

    // Get tokens from HTTP-only cookies with retry logic
    const cookieStore = await cookies();
    const cookieName = `datev_tokens_${companyId}`;
    let tokenCookie = cookieStore.get(cookieName);

    if (!tokenCookie?.value) {
      console.log('❌ [DATEV Organizations] No token cookie found');

      // Add a small delay and try once more (for post-OAuth scenarios)
      console.log('🔄 [DATEV Organizations] Retrying after 1 second...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const retryCookieStore = await cookies();
      const retryTokenCookie = retryCookieStore.get(cookieName);

      if (!retryTokenCookie?.value) {
        console.log('❌ [DATEV Organizations] No token cookie found after retry');
        return NextResponse.json(
          {
            error: 'no_tokens',
            message: 'Keine DATEV-Token gefunden. Bitte authentifizieren Sie sich zuerst.',
          },
          { status: 401 }
        );
      }

      console.log('✅ [DATEV Organizations] Token found after retry');
      tokenCookie = retryTokenCookie;
    }

    // Decode token data
    let tokenData;
    try {
      const decodedData = Buffer.from(tokenCookie.value, 'base64').toString('utf-8');
      tokenData = JSON.parse(decodedData);

      console.log('🔍 [DATEV Organizations] Hybrid Token Analysis:', {
        environment: tokenData.environment || 'unknown',
        client_id: tokenData.client_id || 'unknown',
        api_base_url: tokenData.api_base_url || 'unknown',
        hasAccessToken: !!tokenData.access_token,
        connected_at: new Date(tokenData.connected_at).toISOString(),
        expires_in: tokenData.expires_in,
        current_env: process.env.NODE_ENV,
      });
    } catch (parseError) {
      console.error('❌ [DATEV Organizations] Failed to parse token cookie:', parseError);
      return NextResponse.json(
        { error: 'invalid_tokens', message: 'Ungültige Token-Daten.' },
        { status: 401 }
      );
    }

    // Check if tokens are expired
    const now = Date.now();
    const expiresAt = tokenData.connected_at + tokenData.expires_in * 1000;

    if (now >= expiresAt) {
      console.log('⚠️ [DATEV Organizations] Tokens expired');
      return NextResponse.json(
        {
          error: 'token_expired',
          message: 'Token abgelaufen. Bitte authentifizieren Sie sich erneut.',
        },
        { status: 401 }
      );
    }

    // HYBRID APPROACH: Use token-embedded environment data
    // This ensures we always use the same environment that issued the token
    const tokenApiBaseUrl = tokenData.api_base_url;
    const fallbackConfig = getDatevConfig();
    const apiBaseUrl = tokenApiBaseUrl || fallbackConfig.apiBaseUrl;
    const apiUrl = `${apiBaseUrl}${DATEV_ENDPOINTS.organizations}`;

    console.log('🔧 [DATEV Organizations] Hybrid Environment Check:', {
      tokenEnvironment: tokenData.environment,
      currentEnvironment: process.env.NODE_ENV,
      tokenApiBaseUrl: tokenApiBaseUrl,
      fallbackApiBaseUrl: fallbackConfig.apiBaseUrl,
      finalApiUrl: apiUrl,
      tokenClientId: tokenData.client_id,
      configClientId: fallbackConfig.clientId,
      environmentMatch: tokenData.environment === process.env.NODE_ENV,
    });

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
        'User-Agent': 'Taskilo-DATEV-Integration/1.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [DATEV Organizations] API request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        apiUrl: apiUrl,
        tokenEnvironment: tokenData.environment,
        currentEnvironment: process.env.NODE_ENV,
      });

      // Handle specific token errors that require clearing tokens
      if (response.status === 401) {
        let errorData: any = null;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          // Ignore parse errors
        }

        const tokenError = errorData?.error;
        const errorDescription = errorData?.error_description;

        if (
          tokenError === 'invalid_token' ||
          (errorDescription &&
            (errorDescription.includes('Token issued to another client') ||
              errorDescription.includes('Token malformed') ||
              errorDescription.includes('invalid_token')))
        ) {
          console.warn('⚠️ [DATEV Organizations] Invalid token detected, clearing cookie...');
          console.warn('🔍 [DATEV Organizations] Environment mismatch possible:', {
            tokenEnv: tokenData.environment,
            currentEnv: process.env.NODE_ENV,
            tokenClientId: tokenData.client_id,
            configClientId: fallbackConfig.clientId,
            tokenApiUrl: tokenApiBaseUrl,
            configApiUrl: fallbackConfig.apiBaseUrl,
          });

          // Clear the invalid token cookie
          const response = NextResponse.json(
            {
              error: 'invalid_token',
              error_description:
                errorDescription || 'Token ungültig - erneute Authentifizierung erforderlich',
              requiresAuth: true,
              clearTokens: true,
              environmentMismatch: tokenData.environment !== process.env.NODE_ENV,
              details: {
                tokenEnvironment: tokenData.environment,
                currentEnvironment: process.env.NODE_ENV,
                tokenClientId: tokenData.client_id,
                configClientId: fallbackConfig.clientId,
              },
            },
            { status: 401 }
          );

          // Clear the DATEV token cookie
          response.cookies.set(cookieName, '', {
            expires: new Date(0),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
          });

          return response;
        }
      }

      return NextResponse.json(
        {
          error: 'api_error',
          message: `DATEV API-Fehler: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const organizations = await response.json();

    console.log('✅ [DATEV Organizations] Organizations fetched successfully:', {
      hasData: !!organizations,
      orgCount: Array.isArray(organizations) ? organizations.length : 'unknown',
      tokenEnvironment: tokenData.environment,
      currentEnvironment: process.env.NODE_ENV,
      usedApiUrl: apiUrl,
    });

    return NextResponse.json({
      success: true,
      data: organizations,
      timestamp: Date.now(),
      environment: {
        token: tokenData.environment,
        current: process.env.NODE_ENV,
        match: tokenData.environment === process.env.NODE_ENV,
      },
    });
  } catch (error) {
    console.error('❌ [DATEV Organizations] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'internal_server_error',
        message: 'Unerwarteter Serverfehler',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST method for backward compatibility with existing frontend calls
 */
export async function POST(request: NextRequest) {
  try {
    const { company_id } = await request.json();

    if (!company_id) {
      return NextResponse.json(
        { error: 'missing_company_id', message: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    console.log('[DATEV Organizations] POST request for company:', company_id);

    // Redirect to GET method with query parameter
    const url = new URL(request.url);
    url.searchParams.set('companyId', company_id);

    const getRequest = new NextRequest(url, {
      method: 'GET',
      headers: request.headers,
    });

    return await GET(getRequest);
  } catch (error) {
    console.error('❌ [DATEV Organizations] POST error:', error);
    return NextResponse.json(
      {
        error: 'internal_server_error',
        message: 'Unerwarteter Serverfehler',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
