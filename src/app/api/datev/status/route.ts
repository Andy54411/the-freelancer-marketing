import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * DATEV Connection Status API Route - Server-Side Cookie Handling
 * Checks if company has valid DATEV tokens stored in cookies
 */
export async function POST(request: NextRequest) {
  try {
    const { companyId } = await request.json();

    if (!companyId) {
      return NextResponse.json(
        { error: 'missing_company_id', message: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    console.log('[DATEV Cookie Status] Checking connection status for company:', companyId);

    // Get tokens from HTTP-only cookies (Server-Side)
    const cookieStore = await cookies();
    const cookieName = `datev_tokens_${companyId}`;
    const tokenCookie = cookieStore.get(cookieName);

    if (!tokenCookie?.value) {
      console.log('❌ [DATEV Cookie Status] No token cookie found:', cookieName);
      return NextResponse.json({
        isConnected: false,
        connectedAt: null,
        expiresAt: null,
        organization: null,
        features: {
          accountingData: false,
          documents: false,
          masterData: false,
          cashRegister: false,
        },
      });
    }

    // Decode token data from cookie
    let tokenData;
    try {
      const decodedData = Buffer.from(tokenCookie.value, 'base64').toString('utf-8');
      tokenData = JSON.parse(decodedData);
      
      console.log('✅ [DATEV Cookie Status] Token data found:', {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        connectedAt: tokenData.connected_at ? new Date(tokenData.connected_at).toISOString() : 'unknown'
      });
    } catch (parseError) {
      console.error('❌ [DATEV Cookie Status] Failed to parse token cookie:', parseError);
      return NextResponse.json({
        isConnected: false,
        connectedAt: null,
        expiresAt: null,
        organization: null,
        features: {
          accountingData: false,
          documents: false,
          masterData: false,
          cashRegister: false,
        },
      });
    }

    // Check if tokens are expired
    const now = Date.now();
    const expiresAt = tokenData.connected_at + (tokenData.expires_in * 1000);
    const isExpired = now >= expiresAt;
    
    console.log('🔍 [DATEV Cookie Status] Token expiration check:', {
      now: new Date(now).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      isExpired,
    });

    return NextResponse.json({
      isConnected: !isExpired,
      connectedAt: tokenData.connected_at ? new Date(tokenData.connected_at).toISOString() : null,
      expiresAt: new Date(expiresAt).toISOString(),
      organization: tokenData.organization || null,
      features: {
        accountingData: !isExpired,
        documents: !isExpired,
        masterData: !isExpired,
        cashRegister: !isExpired,
      },
    });

  } catch (error) {
    console.error('❌ [DATEV Cookie Status] Unexpected error:', error);
    return NextResponse.json({
      isConnected: false,
      connectedAt: null,
      expiresAt: null,
      organization: null,
      features: {
        accountingData: false,
        documents: false,
        masterData: false,
        cashRegister: false,
      },
    });
  }
}
