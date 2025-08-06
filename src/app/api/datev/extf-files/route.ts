import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDatevConfig } from '@/lib/datev-config';

/**
 * DATEV Accounting EXTF Files API Route
 * Manages accounting files in DATEV EXTF format
 */
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

    console.log('[DATEV EXTF] Fetching accounting files for company:', companyId);

    // Get tokens from HTTP-only cookies
    const cookieStore = await cookies();
    const cookieName = `datev_tokens_${companyId}`;
    const tokenCookie = cookieStore.get(cookieName);

    if (!tokenCookie?.value) {
      console.log('❌ [DATEV EXTF] No token cookie found');
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
      console.error('❌ [DATEV EXTF] Failed to parse token cookie:', parseError);
      return NextResponse.json(
        { error: 'invalid_tokens', message: 'Ungültige Token-Daten.' },
        { status: 401 }
      );
    }

    // Check if tokens are expired
    const now = Date.now();
    const expiresAt = tokenData.connected_at + tokenData.expires_in * 1000;

    if (now >= expiresAt) {
      console.log('⚠️ [DATEV EXTF] Tokens expired');
      return NextResponse.json(
        {
          error: 'token_expired',
          message: 'Token abgelaufen. Bitte authentifizieren Sie sich erneut.',
        },
        { status: 401 }
      );
    }

    // Fetch accounting files from DATEV API
    const config = getDatevConfig();
    console.log('🌐 [DATEV EXTF] Fetching accounting EXTF files...');

    const response = await fetch(`${config.apiBaseUrl}/accounting/v2.0/extf-files`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [DATEV EXTF] API request failed:', {
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
          console.warn('⚠️ [DATEV EXTF] Invalid token detected, clearing cookie...');

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

    const extfFiles = await response.json();

    console.log('✅ [DATEV EXTF] Files fetched successfully:', {
      hasData: !!extfFiles,
      fileCount: Array.isArray(extfFiles) ? extfFiles.length : 'unknown',
    });

    return NextResponse.json({
      success: true,
      data: extfFiles,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('❌ [DATEV EXTF] Unexpected error:', error);
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
 * Upload/Create EXTF Files
 */
export async function POST(request: NextRequest) {
  try {
    const { companyId, company_id, fileData } = await request.json();
    const finalCompanyId = companyId || company_id;

    if (!finalCompanyId) {
      return NextResponse.json(
        { error: 'missing_company_id', message: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    if (!fileData) {
      return NextResponse.json(
        { error: 'missing_data', message: 'Datei-Daten sind erforderlich' },
        { status: 400 }
      );
    }

    console.log('[DATEV EXTF] Uploading EXTF file for company:', finalCompanyId);

    // Get tokens from HTTP-only cookies
    const cookieStore = await cookies();
    const cookieName = `datev_tokens_${finalCompanyId}`;
    const tokenCookie = cookieStore.get(cookieName);

    if (!tokenCookie?.value) {
      console.log('❌ [DATEV EXTF] No token cookie found');
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
      console.error('❌ [DATEV EXTF] Failed to parse token cookie:', parseError);
      return NextResponse.json(
        { error: 'invalid_tokens', message: 'Ungültige Token-Daten.' },
        { status: 401 }
      );
    }

    // Check if tokens are expired
    const now = Date.now();
    const expiresAt = tokenData.connected_at + tokenData.expires_in * 1000;

    if (now >= expiresAt) {
      console.log('⚠️ [DATEV EXTF] Tokens expired');
      return NextResponse.json(
        {
          error: 'token_expired',
          message: 'Token abgelaufen. Bitte authentifizieren Sie sich erneut.',
        },
        { status: 401 }
      );
    }

    // Upload EXTF file to DATEV API
    const config = getDatevConfig();
    console.log('🌐 [DATEV EXTF] Uploading EXTF file...');

    const response = await fetch(`${config.apiBaseUrl}/accounting/v2.0/extf-files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fileData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [DATEV EXTF] API request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      return NextResponse.json(
        {
          error: 'api_error',
          message: `DATEV API-Fehler: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const uploadResult = await response.json();

    console.log('✅ [DATEV EXTF] File uploaded successfully:', {
      hasData: !!uploadResult,
      fileId: uploadResult?.fileId || 'unknown',
    });

    return NextResponse.json({
      success: true,
      data: uploadResult,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('❌ [DATEV EXTF] Unexpected error:', error);
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
