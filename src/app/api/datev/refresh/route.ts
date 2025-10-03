import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig } from '@/lib/datev-config';

/**
 * DATEV Token Refresh Endpoint
 * Refreshes expired DATEV access tokens using refresh token
 */
export async function POST(request: NextRequest) {
  try {
    const { refresh_token } = await request.json();

    if (!refresh_token) {
      return NextResponse.json({ error: 'Refresh token is required' }, { status: 400 });
    }

    const config = getDatevConfig();

    // Request new access token using refresh token
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
        client_id: config.clientId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();

      // Parse error for specific error types
      let errorMessage = 'Token refresh failed';
      try {
        const errorJson = JSON.parse(errorData);
        errorMessage = errorJson.error_description || errorJson.error || errorMessage;

        // Check for specific error types that require re-authentication
        if (errorJson.error === 'invalid_grant' || errorJson.error === 'invalid_token') {
          return NextResponse.json(
            {
              error: 'invalid_refresh_token',
              message: 'Refresh token is invalid or expired. Re-authentication required.',
            },
            { status: 401 }
          );
        }
      } catch {
        // Keep default handling if JSON parsing fails
      }

      return NextResponse.json(
        {
          error: 'refresh_failed',
          message: errorMessage,
        },
        { status: 401 }
      );
    }

    const tokenData = await response.json();

    return NextResponse.json({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      refresh_token: tokenData.refresh_token,
      scope: tokenData.scope,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
