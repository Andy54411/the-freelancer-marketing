import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDatevConfig } from '@/lib/datev-config';

/**
 * DATEV Master-Data Clients API Route
 * Fetches client/mandant data from DATEV
 */
export async function POST(request: NextRequest) {
  try {
    const { companyId, company_id } = await request.json();
    const finalCompanyId = companyId || company_id;

    if (!finalCompanyId) {
      return NextResponse.json(
        { error: 'missing_company_id', message: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    console.log('[DATEV Clients] Getting clients for company:', finalCompanyId);

    // Get tokens from HTTP-only cookies
    const cookieStore = await cookies();
    const cookieName = `datev_tokens_${finalCompanyId}`;
    const tokenCookie = cookieStore.get(cookieName);

    if (!tokenCookie?.value) {
      console.log('❌ [DATEV Clients] No token cookie found');
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
      console.error('❌ [DATEV Clients] Failed to parse token cookie:', parseError);
      return NextResponse.json(
        { error: 'invalid_tokens', message: 'Ungültige Token-Daten.' },
        { status: 401 }
      );
    }

    // Check if tokens are expired
    const now = Date.now();
    const expiresAt = tokenData.connected_at + (tokenData.expires_in * 1000);
    
    if (now >= expiresAt) {
      console.log('⚠️ [DATEV Clients] Tokens expired');
      return NextResponse.json(
        { error: 'token_expired', message: 'Token abgelaufen. Bitte authentifizieren Sie sich erneut.' },
        { status: 401 }
      );
    }

    // Fetch clients from DATEV API
    const config = getDatevConfig();
    console.log('🌐 [DATEV Clients] Fetching master-data clients...');

    const response = await fetch(`${config.apiBaseUrl}/master-data/v3/clients`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [DATEV Clients] API request failed:', {
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

    const clientsData = await response.json();
    
    console.log('✅ [DATEV Clients] Clients fetched successfully:', {
      hasData: !!clientsData,
      clientCount: clientsData?.clients?.length || 0,
    });

    return NextResponse.json({
      success: true,
      data: clientsData,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('❌ [DATEV Clients] Unexpected error:', error);
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
