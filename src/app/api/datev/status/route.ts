import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDatevCookieName } from '@/lib/datev-server-utils';

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

    // Get tokens from HTTP-only cookies (Server-Side)
    const cookieStore = await cookies();
    const cookieName = getDatevCookieName(companyId);
    const tokenCookie = cookieStore.get(cookieName);

    if (!tokenCookie?.value) {

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

    } catch (parseError) {

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
    const expiresAt = tokenData.connected_at + tokenData.expires_in * 1000;
    const isExpired = now >= expiresAt;

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
