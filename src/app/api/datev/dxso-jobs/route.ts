import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDatevConfig } from '@/lib/datev-config';

/**
 * DATEV Accounting DXSO Jobs API Route
 * Manages accounting jobs for data exchange
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || searchParams.get('company_id');
    const jobId = searchParams.get('jobId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'missing_company_id', message: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    console.log('[DATEV DXSO] Fetching accounting jobs for company:', companyId);

    // Get tokens from HTTP-only cookies
    const cookieStore = await cookies();
    const cookieName = `datev_tokens_${companyId}`;
    const tokenCookie = cookieStore.get(cookieName);

    if (!tokenCookie?.value) {
      console.log('❌ [DATEV DXSO] No token cookie found');
      return NextResponse.json(
        { error: 'no_tokens', message: 'Keine DATEV-Token gefunden. Bitte authentifizieren Sie sich zuerst.' },
        { status: 401 }
      );
    }

    // Decode token data
    let tokenData;
    try {
      const decodedData = Buffer.from(tokenCookie.value, 'base64').toString('utf-8');
      tokenData = JSON.parse(decodedData);
    } catch (parseError) {
      console.error('❌ [DATEV DXSO] Failed to parse token cookie:', parseError);
      return NextResponse.json(
        { error: 'invalid_tokens', message: 'Ungültige Token-Daten.' },
        { status: 401 }
      );
    }

    // Check if tokens are expired
    const now = Date.now();
    const expiresAt = tokenData.connected_at + (tokenData.expires_in * 1000);
    
    if (now >= expiresAt) {
      console.log('⚠️ [DATEV DXSO] Tokens expired');
      return NextResponse.json(
        { error: 'token_expired', message: 'Token abgelaufen. Bitte authentifizieren Sie sich erneut.' },
        { status: 401 }
      );
    }

    // Build API endpoint URL
    const config = getDatevConfig();
    let apiUrl = `${config.apiBaseUrl}/accounting/v2.0/dxso-jobs`;
    if (jobId) {
      apiUrl += `/${jobId}`;
    }

    console.log('🌐 [DATEV DXSO] Fetching DXSO jobs...', { jobId });

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [DATEV DXSO] API request failed:', {
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

    const dxsoJobs = await response.json();
    
    console.log('✅ [DATEV DXSO] Jobs fetched successfully:', {
      hasData: !!dxsoJobs,
      jobCount: Array.isArray(dxsoJobs) ? dxsoJobs.length : 'single job',
    });

    return NextResponse.json({
      success: true,
      data: dxsoJobs,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('❌ [DATEV DXSO] Unexpected error:', error);
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
 * Create/Start DXSO Jobs
 */
export async function POST(request: NextRequest) {
  try {
    const { companyId, company_id, jobData } = await request.json();
    const finalCompanyId = companyId || company_id;

    if (!finalCompanyId) {
      return NextResponse.json(
        { error: 'missing_company_id', message: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    if (!jobData) {
      return NextResponse.json(
        { error: 'missing_data', message: 'Job-Daten sind erforderlich' },
        { status: 400 }
      );
    }

    console.log('[DATEV DXSO] Creating DXSO job for company:', finalCompanyId);

    // Get tokens from HTTP-only cookies
    const cookieStore = await cookies();
    const cookieName = `datev_tokens_${finalCompanyId}`;
    const tokenCookie = cookieStore.get(cookieName);

    if (!tokenCookie?.value) {
      console.log('❌ [DATEV DXSO] No token cookie found');
      return NextResponse.json(
        { error: 'no_tokens', message: 'Keine DATEV-Token gefunden. Bitte authentifizieren Sie sich zuerst.' },
        { status: 401 }
      );
    }

    // Decode token data
    let tokenData;
    try {
      const decodedData = Buffer.from(tokenCookie.value, 'base64').toString('utf-8');
      tokenData = JSON.parse(decodedData);
    } catch (parseError) {
      console.error('❌ [DATEV DXSO] Failed to parse token cookie:', parseError);
      return NextResponse.json(
        { error: 'invalid_tokens', message: 'Ungültige Token-Daten.' },
        { status: 401 }
      );
    }

    // Check if tokens are expired
    const now = Date.now();
    const expiresAt = tokenData.connected_at + (tokenData.expires_in * 1000);
    
    if (now >= expiresAt) {
      console.log('⚠️ [DATEV DXSO] Tokens expired');
      return NextResponse.json(
        { error: 'token_expired', message: 'Token abgelaufen. Bitte authentifizieren Sie sich erneut.' },
        { status: 401 }
      );
    }

    // Create DXSO job via DATEV API
    const config = getDatevConfig();
    console.log('🌐 [DATEV DXSO] Creating DXSO job...');

    const response = await fetch(`${config.apiBaseUrl}/accounting/v2.0/dxso-jobs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jobData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [DATEV DXSO] API request failed:', {
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

    const jobResult = await response.json();
    
    console.log('✅ [DATEV DXSO] Job created successfully:', {
      hasData: !!jobResult,
      jobId: jobResult?.jobId || 'unknown',
    });

    return NextResponse.json({
      success: true,
      data: jobResult,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('❌ [DATEV DXSO] Unexpected error:', error);
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
