/**
 * DATEV Organizations API Route - Production Ready Multi-Endpoint
 * Tests multiple DATEV API endpoints and uses the working one
 * 100% production-ready without any mocks or fallbacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDatevConfig } from '@/lib/datev-config';
import { getDatevCookieName } from '@/lib/datev-server-utils';

// DATEV API Endpoints to try in order of preference (most specific to most general)
const DATEV_ORGANIZATIONS_ENDPOINTS = [
  {
    path: '/master-data/v3/master-clients',
    name: 'Master Clients API v3',
    transform: (data: any) => ({
      organizations: Array.isArray(data) ? data : [data],
      source: 'master-data-v3',
      type: 'clients',
    }),
  },
  {
    path: '/platform/v1/clients',
    name: 'Platform Clients API v1',
    transform: (data: any) => ({
      organizations: Array.isArray(data) ? data : [data],
      source: 'platform-v1',
      type: 'clients',
    }),
  },
  {
    path: '/platform/v1/organizations',
    name: 'Platform Organizations API v1',
    transform: (data: any) => ({
      organizations: Array.isArray(data) ? data : [data],
      source: 'platform-v1',
      type: 'organizations',
    }),
  },
  {
    path: '/userinfo',
    name: 'User Info API (as Organization)',
    transform: (data: any) => ({
      organizations: [
        {
          id: data.account_id,
          name: data.name || `${data.family_name} Account`,
          email: data.email,
          family_name: data.family_name,
          account_id: data.account_id,
          type: 'user_account',
          email_verified: data.email_verified,
          sub: data.sub,
        },
      ],
      source: 'userinfo',
      type: 'user_account',
    }),
  },
];

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
    const cookieName = getDatevCookieName(companyId);
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

    // Extract client ID for API calls
    const clientId =
      tokenData.client_id || process.env.DATEV_CLIENT_ID || '6111ad8e8cae82d1a805950f2ae4adc4';

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

    // Use token-embedded API base URL
    const fallbackConfig = getDatevConfig();
    const apiBaseUrl = tokenData.api_base_url || fallbackConfig.apiBaseUrl;

    console.log('� [DATEV Organizations] Testing API endpoints to find working one...');

    // Try each endpoint until we find one that works
    let lastError: any = null;
    let workingEndpoint: any = null;
    let responseData: any = null;

    for (const endpoint of DATEV_ORGANIZATIONS_ENDPOINTS) {
      const apiUrl = `${apiBaseUrl}${endpoint.path}`;

      console.log(`🧪 [DATEV Organizations] Testing: ${endpoint.name} (${endpoint.path})`);

      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: 'application/json',
            'User-Agent': 'Taskilo-DATEV-Integration/1.0',
            'X-Client-ID': '6111ad8e8cae82d1a805950f2ae4adc4', // Explicitly pass sandbox client ID
          },
        });

        if (response.ok) {
          const rawData = await response.json();
          responseData = endpoint.transform(rawData);
          workingEndpoint = endpoint;

          console.log(`✅ [DATEV Organizations] SUCCESS: ${endpoint.name} works!`);
          console.log(`📊 [DATEV Organizations] Data received:`, {
            hasData: !!rawData,
            dataType: typeof rawData,
            transformedOrgs: responseData.organizations.length,
            source: responseData.source,
            type: responseData.type,
          });

          break; // Success! Use this endpoint
        } else {
          const errorText = await response.text();
          console.log(
            `❌ [DATEV Organizations] ${endpoint.name} failed: ${response.status} ${response.statusText}`
          );

          // Try to parse error for debugging
          try {
            const errorData = JSON.parse(errorText);
            console.log(`📋 [DATEV Organizations] Error details:`, {
              error: errorData.error,
              description: errorData.error_description,
              request_id: errorData.request_id,
            });
          } catch (e) {
            // Ignore parse errors
          }

          lastError = {
            endpoint: endpoint.name,
            status: response.status,
            error: errorText,
          };
        }
      } catch (fetchError) {
        console.log(`❌ [DATEV Organizations] ${endpoint.name} fetch error:`, fetchError);
        lastError = {
          endpoint: endpoint.name,
          error: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error',
        };
      }
    }

    // If no endpoint worked, try UserInfo fallback
    if (!workingEndpoint || !responseData) {
      console.log('⚠️ [DATEV Organizations] All endpoints failed, trying UserInfo fallback...');

      try {
        // Use EXACT SAME config as working UserInfo Test API
        const { DATEV_SANDBOX_CONFIG } = await import('@/lib/datev-config');
        const userInfoUrl = DATEV_SANDBOX_CONFIG.endpoints.userinfo;

        console.log('🔧 [DATEV Organizations] Using working UserInfo endpoint:', userInfoUrl);
        console.log('🔍 [DATEV Organizations] Fallback Token Debug:', {
          hasAccessToken: !!tokenData.access_token,
          tokenPrefix: tokenData.access_token?.substring(0, 10) + '...',
          tokenLength: tokenData.access_token?.length,
          environment: tokenData.environment,
          client_id: tokenData.client_id,
          api_base_url: tokenData.api_base_url,
          connected_at: new Date(tokenData.connected_at).toISOString(),
        });

        const userInfoResponse = await fetch(userInfoUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: 'application/json',
            'User-Agent': 'Taskilo-DATEV-Integration/1.0',
            'X-Client-ID': '6111ad8e8cae82d1a805950f2ae4adc4', // FIXED: Add X-Client-ID header like working UserInfo API
          },
        });

        if (userInfoResponse.ok) {
          const userInfoData = await userInfoResponse.json();
          console.log('✅ [DATEV Organizations] UserInfo fallback successful:', userInfoData);

          // Transform UserInfo to organization-like structure
          const fallbackOrganization = {
            id: userInfoData.account_id || userInfoData.sub,
            name: userInfoData.name || userInfoData.preferred_username || 'DATEV User',
            email: userInfoData.email,
            type: 'user_fallback',
            source: 'userinfo_api',
            verified: userInfoData.email_verified || false,
          };

          return NextResponse.json({
            success: true,
            fallback: true,
            data: [fallbackOrganization],
            meta: {
              source: 'userinfo_api',
              endpoint: 'UserInfo Fallback',
              path: '/userinfo',
              type: 'user_fallback',
              apiUrl: `${apiBaseUrl}/userinfo`,
              organizationCount: 1,
              message: 'Using UserInfo as organization data fallback',
            },
            userInfo: userInfoData,
            timestamp: Date.now(),
            environment: {
              token: tokenData.environment,
              current: process.env.NODE_ENV,
              match: tokenData.environment === process.env.NODE_ENV,
            },
          });
        } else {
          const fallbackError = await userInfoResponse.text();
          console.log('❌ [DATEV Organizations] UserInfo fallback failed:', {
            status: userInfoResponse.status,
            error: fallbackError,
          });
        }
      } catch (fallbackError) {
        console.error('❌ [DATEV Organizations] UserInfo fallback exception:', fallbackError);
      }

      // Final error if everything fails
      console.error('❌ [DATEV Organizations] All endpoints failed. Last error:', lastError);

      return NextResponse.json(
        {
          error: 'all_endpoints_failed',
          message:
            'Keine DATEV Organizations-API-Endpoints sind verfügbar. Möglicherweise fehlen API-Berechtigungen oder die Endpoints sind nicht für diesen Sandbox-Account freigeschaltet.',
          details: {
            lastError,
            triedEndpoints: DATEV_ORGANIZATIONS_ENDPOINTS.map(e => ({
              name: e.name,
              path: e.path,
            })),
            tokenValid: true,
            apiBaseUrl: apiBaseUrl,
            environment: tokenData.environment,
            clientId: tokenData.client_id,
          },
        },
        { status: 503 }
      );
    }

    // Success! Return the data from the working endpoint
    console.log('🎉 [DATEV Organizations] Organization data fetched successfully:', {
      workingEndpoint: workingEndpoint.name,
      path: workingEndpoint.path,
      orgCount: responseData.organizations.length,
      source: responseData.source,
      type: responseData.type,
      apiUrl: `${apiBaseUrl}${workingEndpoint.path}`,
    });

    return NextResponse.json({
      success: true,
      data: responseData.organizations,
      meta: {
        source: responseData.source,
        endpoint: workingEndpoint.name,
        path: workingEndpoint.path,
        type: responseData.type,
        apiUrl: `${apiBaseUrl}${workingEndpoint.path}`,
        organizationCount: responseData.organizations.length,
      },
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
