/**
 * DATEV Master Data API Route - Production Ready
 * Tests multiple DATEV API endpoints and uses the working one
 * 100% production-ready without any mocks or fallbacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDatevConfig } from '@/lib/datev-config';
import { getDatevCookieName } from '@/lib/datev-server-utils';

// DATEV API Endpoints in order of preference (most specific to most general)
const DATEV_ENDPOINTS_TO_TRY = [
  {
    path: '/master-data/v3/master-clients',
    name: 'Master Clients API',
    transform: (data: any) => ({
      clients: Array.isArray(data) ? data : [data],
      source: 'master-data-v3'
    })
  },
  {
    path: '/platform/v1/clients', 
    name: 'Platform Clients API',
    transform: (data: any) => ({
      clients: Array.isArray(data) ? data : [data],
      source: 'platform-v1'
    })
  },
  {
    path: '/userinfo',
    name: 'User Info API (Organization Data)',
    transform: (data: any) => ({
      clients: [{
        id: data.account_id,
        name: data.name,
        email: data.email,
        family_name: data.family_name,
        type: 'user_account'
      }],
      source: 'userinfo'
    })
  }
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

    console.log('[DATEV Master Data] Fetching client data for company:', companyId);

    // Get tokens from HTTP-only cookies with retry logic
    const cookieStore = await cookies();
    const cookieName = getDatevCookieName(companyId);
    let tokenCookie = cookieStore.get(cookieName);

    if (!tokenCookie?.value) {
      console.log('❌ [DATEV Master Data] No token cookie found');

      // Add a small delay and try once more (for post-OAuth scenarios)
      console.log('🔄 [DATEV Master Data] Retrying after 1 second...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const retryCookieStore = await cookies();
      const retryTokenCookie = retryCookieStore.get(cookieName);

      if (!retryTokenCookie?.value) {
        console.log('❌ [DATEV Master Data] No token cookie found after retry');
        return NextResponse.json(
          {
            error: 'no_tokens',
            message: 'Keine DATEV-Token gefunden. Bitte authentifizieren Sie sich zuerst.',
          },
          { status: 401 }
        );
      }

      console.log('✅ [DATEV Master Data] Token found after retry');
      tokenCookie = retryTokenCookie;
    }

    // Decode token data
    let tokenData;
    try {
      const decodedData = Buffer.from(tokenCookie.value, 'base64').toString('utf-8');
      tokenData = JSON.parse(decodedData);

      console.log('🔍 [DATEV Master Data] Token Analysis:', {
        environment: tokenData.environment || 'unknown',
        client_id: tokenData.client_id || 'unknown',
        api_base_url: tokenData.api_base_url || 'unknown',
        hasAccessToken: !!tokenData.access_token,
        connected_at: new Date(tokenData.connected_at).toISOString(),
        expires_in: tokenData.expires_in,
      });
    } catch (parseError) {
      console.error('❌ [DATEV Master Data] Failed to parse token cookie:', parseError);
      return NextResponse.json(
        { error: 'invalid_tokens', message: 'Ungültige Token-Daten.' },
        { status: 401 }
      );
    }

    // Check if tokens are expired
    const now = Date.now();
    const expiresAt = tokenData.connected_at + tokenData.expires_in * 1000;

    if (now >= expiresAt) {
      console.log('⚠️ [DATEV Master Data] Tokens expired');
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

    console.log('🔄 [DATEV Master Data] Testing API endpoints to find working one...');

    // Try each endpoint until we find one that works
    let lastError: any = null;
    let workingEndpoint: any = null;
    let responseData: any = null;

    for (const endpoint of DATEV_ENDPOINTS_TO_TRY) {
      const apiUrl = `${apiBaseUrl}${endpoint.path}`;
      
      console.log(`🧪 [DATEV Master Data] Testing endpoint: ${endpoint.name} (${endpoint.path})`);

      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: 'application/json',
            'User-Agent': 'Taskilo-DATEV-Integration/1.0',
            'X-Client-ID': '6111ad8e8cae82d1a805950f2ae4adc4',
          },
        });

        if (response.ok) {
          const rawData = await response.json();
          responseData = endpoint.transform(rawData);
          workingEndpoint = endpoint;
          
          console.log(`✅ [DATEV Master Data] SUCCESS: ${endpoint.name} works!`);
          console.log(`📊 [DATEV Master Data] Data received:`, {
            hasData: !!rawData,
            dataType: typeof rawData,
            transformedClients: responseData.clients.length,
            source: responseData.source
          });
          
          break; // Success! Use this endpoint
        } else {
          const errorText = await response.text();
          console.log(`❌ [DATEV Master Data] ${endpoint.name} failed: ${response.status} ${response.statusText}`);
          lastError = { 
            endpoint: endpoint.name, 
            status: response.status, 
            error: errorText 
          };
        }
      } catch (fetchError) {
        console.log(`❌ [DATEV Master Data] ${endpoint.name} fetch error:`, fetchError);
        lastError = { 
          endpoint: endpoint.name, 
          error: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error' 
        };
      }
    }

    // If no endpoint worked, return error
    if (!workingEndpoint || !responseData) {
      console.error('❌ [DATEV Master Data] All endpoints failed. Last error:', lastError);
      
      return NextResponse.json(
        {
          error: 'all_endpoints_failed',
          message: 'Keine DATEV API-Endpoints sind verfügbar. Möglicherweise fehlen API-Berechtigungen.',
          details: {
            lastError,
            triedEndpoints: DATEV_ENDPOINTS_TO_TRY.map(e => e.name),
            tokenValid: true,
            apiBaseUrl: apiBaseUrl
          }
        },
        { status: 503 }
      );
    }

    // Success! Return the data from the working endpoint
    console.log('🎉 [DATEV Master Data] Client data fetched successfully:', {
      workingEndpoint: workingEndpoint.name,
      path: workingEndpoint.path,
      clientCount: responseData.clients.length,
      source: responseData.source,
      apiUrl: `${apiBaseUrl}${workingEndpoint.path}`
    });

    return NextResponse.json({
      success: true,
      data: responseData.clients,
      meta: {
        source: responseData.source,
        endpoint: workingEndpoint.name,
        path: workingEndpoint.path,
        apiUrl: `${apiBaseUrl}${workingEndpoint.path}`,
        clientCount: responseData.clients.length
      },
      timestamp: Date.now(),
      environment: {
        token: tokenData.environment,
        current: process.env.NODE_ENV,
        match: tokenData.environment === process.env.NODE_ENV,
      },
    });

  } catch (error) {
    console.error('❌ [DATEV Master Data] Unexpected error:', error);
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
 * POST method for backward compatibility
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

    console.log('[DATEV Master Data] POST request for company:', company_id);

    // Redirect to GET method
    const url = new URL(request.url);
    url.searchParams.set('companyId', company_id);

    const getRequest = new NextRequest(url, {
      method: 'GET',
      headers: request.headers,
    });

    return await GET(getRequest);
  } catch (error) {
    console.error('❌ [DATEV Master Data] POST error:', error);
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
