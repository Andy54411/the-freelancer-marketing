import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDatevConfig } from '@/lib/datev-config';

/**
 * DATEV Organization API Route - Server-Side Cookie Handling
 * Fetches organization data from DATEV API using stored tokens
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[DATEV Cookie Organization] Request received');
    
    // Debug: Log request details
    const rawBody = await request.text();
    console.log('[DATEV Cookie Organization] Raw request body:', rawBody);
    
    let requestData;
    try {
      requestData = JSON.parse(rawBody);
      console.log('[DATEV Cookie Organization] Parsed request data:', requestData);
    } catch (parseError) {
      console.error('[DATEV Cookie Organization] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'invalid_json', message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { companyId, company_id } = requestData;
    const finalCompanyId = companyId || company_id;
    console.log('[DATEV Cookie Organization] Extracted companyId:', finalCompanyId);

    if (!finalCompanyId) {
      console.error('[DATEV Cookie Organization] Missing companyId in request:', requestData);
      return NextResponse.json(
        { error: 'missing_company_id', message: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    console.log('[DATEV Cookie Organization] Processing request...');
    console.log('[DATEV Cookie Organization] Getting tokens for company:', finalCompanyId);

    // Get tokens from HTTP-only cookies (Server-Side)
    const cookieStore = await cookies();
    const cookieName = `datev_tokens_${finalCompanyId}`;
    const tokenCookie = cookieStore.get(cookieName);

    if (!tokenCookie?.value) {
      console.log('❌ [DATEV Cookie Organization] No token cookie found:', cookieName);
      return NextResponse.json(
        { error: 'no_tokens', message: 'Keine DATEV-Token gefunden. Bitte authentifizieren Sie sich zuerst.' },
        { status: 401 }
      );
    }

    // Decode token data from cookie
    let tokenData;
    try {
      const decodedData = Buffer.from(tokenCookie.value, 'base64').toString('utf-8');
      tokenData = JSON.parse(decodedData);
      
      console.log('✅ [DATEV Cookie Organization] Token data loaded:', {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        connectedAt: tokenData.connected_at ? new Date(tokenData.connected_at).toISOString() : 'unknown'
      });
    } catch (parseError) {
      console.error('❌ [DATEV Cookie Organization] Failed to parse token cookie:', parseError);
      return NextResponse.json(
        { error: 'invalid_tokens', message: 'Ungültige Token-Daten. Bitte authentifizieren Sie sich erneut.' },
        { status: 401 }
      );
    }

    // Check if tokens are expired
    const now = Date.now();
    const expiresAt = tokenData.connected_at + (tokenData.expires_in * 1000);
    
    if (now >= expiresAt) {
      console.log('⚠️ [DATEV Cookie Organization] Tokens expired, attempting refresh...');
      
      // Try to refresh tokens
      const refreshResult = await refreshTokens(finalCompanyId, tokenData.refresh_token);
      if (!refreshResult.success) {
        return NextResponse.json(
          { error: 'token_expired', message: 'Token abgelaufen. Bitte authentifizieren Sie sich erneut.' },
          { status: 401 }
        );
      }
      
      tokenData = refreshResult.tokenData;
    }

    // Fetch organization data from DATEV API
    const config = getDatevConfig();
    console.log('🌐 [DATEV Cookie Organization] Testing userinfo endpoint...');

    // Test with userinfo endpoint (should work with any valid token)
    const response = await fetch(`${config.apiBaseUrl}/platform/v1/userinfo`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [DATEV Cookie Organization] API request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      
      return NextResponse.json(
        { 
          error: 'api_error', 
          message: `DATEV API-Fehler: ${response.status} ${response.statusText}`,
          details: errorText 
        },
        { status: response.status }
      );
    }

    const organizationData = await response.json();
    
    console.log('✅ [DATEV Cookie Organization] Userinfo fetched successfully:', {
      hasData: !!organizationData,
      dataKeys: Object.keys(organizationData || {}),
    });

    return NextResponse.json({
      success: true,
      data: organizationData,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('❌ [DATEV Cookie Organization] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'internal_server_error', 
        message: 'Unerwarteter Serverfehler',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Refresh DATEV tokens using refresh token
 */
async function refreshTokens(companyId: string, refreshToken: string) {
  try {
    const config = getDatevConfig();
    
    const refreshData = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      },
      body: refreshData.toString(),
    });

    if (!response.ok) {
      console.error('❌ [DATEV Cookie Organization] Token refresh failed:', response.status, response.statusText);
      return { success: false };
    }

    const newTokenData = await response.json();
    
    // Update cookie with new tokens
    const fullTokenData = {
      ...newTokenData,
      connected_at: Date.now(),
      company_id: companyId,
    };

    const encodedData = Buffer.from(JSON.stringify(fullTokenData)).toString('base64');
    const cookieName = `datev_tokens_${companyId}`;

    // Note: In a real server route, we'd need to set the cookie in the response
    // For now, we just return the new token data
    console.log('✅ [DATEV Cookie Organization] Tokens refreshed successfully');
    
    return { 
      success: true, 
      tokenData: fullTokenData 
    };

  } catch (error) {
    console.error('❌ [DATEV Cookie Organization] Token refresh error:', error);
    return { success: false };
  }
}
