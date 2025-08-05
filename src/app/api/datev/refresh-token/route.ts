/**
 * DATEV Token Refresh API Route - Cookie Based
 * Refreshes DATEV access tokens using refresh tokens stored in cookies
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig } from '@/lib/datev-config';
import { DatevCookieManager } from '@/lib/datev-cookie-manager';

export async function POST(request: NextRequest) {
  try {
    console.log('[DATEV Cookie Refresh] Processing token refresh request...');

    const { refresh_token, company_id } = await request.json();

    if (!refresh_token || !company_id) {
      return NextResponse.json(
        { error: 'Refresh token and company ID are required' },
        { status: 400 }
      );
    }

    console.log('[DATEV Cookie Refresh] Refreshing token for company:', company_id);

    // Get DATEV configuration
    const config = getDatevConfig();

    // Prepare refresh request
    const refreshData = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh_token,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    console.log('[DATEV Cookie Refresh] Calling DATEV token endpoint...');

    // Call DATEV token refresh endpoint
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: refreshData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DATEV Cookie Refresh] Token refresh failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      return NextResponse.json(
        {
          error: 'Token refresh failed',
          details: `${response.status}: ${response.statusText}`,
        },
        { status: response.status }
      );
    }

    const tokenData = await response.json();
    console.log('[DATEV Cookie Refresh] New tokens received:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
    });

    // Calculate expiration timestamp
    const expiresAt = Date.now() + tokenData.expires_in * 1000;

    // Return new token data
    return NextResponse.json({
      success: true,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      scope: tokenData.scope,
      token_type: tokenData.token_type || 'Bearer',
    });
  } catch (error) {
    console.error('[DATEV Cookie Refresh] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
