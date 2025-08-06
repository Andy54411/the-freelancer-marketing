/**
 * DATEV Organizations API Route
 * Enhanced with robust token validation and error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDatevConfig, DATEV_ENDPOINTS } from '@/lib/datev-config';

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

    // Get tokens from HTTP-only cookies
    const cookieStore = await cookies();
    const cookieName = `datev_tokens_${companyId}`;
    const tokenCookie = cookieStore.get(cookieName);

    if (!tokenCookie?.value) {
      console.log('❌ [DATEV Organizations] No token cookie found');
      return NextResponse.json(
        {
          error: 'no_tokens',
          message: 'Keine DATEV-Token gefunden. Bitte authentifizieren Sie sich zuerst.',
        },
        { status: 401 }
      );
    }

    // Decode token data
    let tokenData;
    try {
      const decodedData = Buffer.from(tokenCookie.value, 'base64').toString('utf-8');
      tokenData = JSON.parse(decodedData);
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

    // Fetch organizations from DATEV API
    const config = getDatevConfig();
    console.log('🌐 [DATEV Organizations] Fetching organizations...');

    const response = await fetch(`${config.apiBaseUrl}${DATEV_ENDPOINTS.organizations}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [DATEV Organizations] API request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
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

          // Clear the invalid token cookie
          const response = NextResponse.json(
            {
              error: 'invalid_token',
              error_description:
                errorDescription || 'Token ungültig - erneute Authentifizierung erforderlich',
              requiresAuth: true,
              clearTokens: true,
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
    });

    return NextResponse.json({
      success: true,
      data: organizations,
      timestamp: Date.now(),
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

    // Get tokens from HTTP-only cookies
    const cookieStore = await cookies();
    const cookieName = `datev_tokens_${company_id}`;
    const tokenCookie = cookieStore.get(cookieName);

    if (!tokenCookie?.value) {
      console.log('❌ [DATEV Organizations] No token cookie found');
      return NextResponse.json(
        {
          error: 'no_tokens',
          message: 'Keine DATEV-Token gefunden. Bitte authentifizieren Sie sich zuerst.',
        },
        { status: 401 }
      );
    }

    // Decode token data
    let tokenData;
    try {
      const decodedData = Buffer.from(tokenCookie.value, 'base64').toString('utf-8');
      tokenData = JSON.parse(decodedData);
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

    // Fetch organizations from DATEV API
    const config = getDatevConfig();
    console.log('🌐 [DATEV Organizations] Fetching organizations...');

    const response = await fetch(`${config.apiBaseUrl}${DATEV_ENDPOINTS.organizations}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [DATEV Organizations] API request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
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

          // Clear the invalid token cookie
          const response = NextResponse.json(
            {
              error: 'invalid_token',
              error_description:
                errorDescription || 'Token ungültig - erneute Authentifizierung erforderlich',
              requiresAuth: true,
              clearTokens: true,
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

    console.log('✅ [DATEV Organizations] Organizations fetched successfully via POST:', {
      hasData: !!organizations,
      orgCount: Array.isArray(organizations) ? organizations.length : 'unknown',
    });

    return NextResponse.json({
      success: true,
      data: organizations,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('❌ [DATEV Organizations] POST Unexpected error:', error);
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
