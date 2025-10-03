/**
 * DATEV Cookie Debug Route
 * Zeigt alle aktuell gesetzten DATEV-Cookies für Debugging
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDatevCookieName } from '@/lib/datev-server-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || searchParams.get('company_id');

    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Filter DATEV-related cookies
    const datetCookies = allCookies.filter(cookie => cookie.name.startsWith('datev_tokens_'));

    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      requestedCompanyId: companyId,
      totalCookies: allCookies.length,
      datetCookies: datetCookies.length,
      cookies: {
        all: allCookies.map(c => ({
          name: c.name,
          hasValue: !!c.value,
          valueLength: c.value?.length || 0,
        })),
        datev: datetCookies.map(c => ({
          name: c.name,
          hasValue: !!c.value,
          valueLength: c.value?.length || 0,
          isBase64Valid: (() => {
            try {
              if (!c.value) return false;
              const decoded = Buffer.from(c.value, 'base64').toString('utf-8');
              const parsed = JSON.parse(decoded);
              return {
                valid: true,
                hasAccessToken: !!parsed.access_token,
                hasCompanyId: !!parsed.company_id,
                expiresAt: parsed.expires_at,
                isExpired: parsed.expires_at ? Date.now() > parsed.expires_at : 'unknown',
              };
            } catch (error) {
              return { valid: false, error: error.message };
            }
          })(),
        })),
      },
    };

    // Wenn eine spezielle companyId angefragt wird, zeige Details
    if (companyId) {
      const cookieName = getDatevCookieName(companyId);
      const specificCookie = cookieStore.get(cookieName);

      debugInfo.specificCookie = {
        name: cookieName,
        found: !!specificCookie,
        value: specificCookie?.value ? `${specificCookie.value.substring(0, 50)}...` : null,
      };

      if (specificCookie?.value) {
        try {
          const decodedData = Buffer.from(specificCookie.value, 'base64').toString('utf-8');
          const tokenData = JSON.parse(decodedData);

          debugInfo.tokenDetails = {
            access_token: tokenData.access_token
              ? `${tokenData.access_token.substring(0, 20)}...`
              : null,
            expires_at: tokenData.expires_at,
            isExpired: Date.now() > tokenData.expires_at,
            company_id: tokenData.company_id,
            connected_at: tokenData.connected_at,
            scope: tokenData.scope,
          };
        } catch (parseError) {
          debugInfo.tokenDetails = { error: parseError.message };
        }
      }
    }

    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'debug_failed', message: error.message }, { status: 500 });
  }
}
