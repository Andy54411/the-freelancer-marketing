import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDatevCookieName } from '@/lib/datev-server-utils';

/**
 * Analyze DATEV token in detail to debug "Token issued to another client"
 */
export async function GET(_request: NextRequest) {
  try {
    const { searchParams } = new URL(_request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Missing companyId' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const cookieName = getDatevCookieName(companyId);
    const tokenCookie = cookieStore.get(cookieName);

    if (!tokenCookie) {
      return NextResponse.json({ error: 'No token cookie found' });
    }

    // Decode the full token
    let tokenData;
    try {
      const decodedData = Buffer.from(tokenCookie.value, 'base64').toString('utf-8');
      tokenData = JSON.parse(decodedData);
    } catch {
      return NextResponse.json({ error: 'Could not decode token' });
    }

    // Now try to decode the JWT parts (if it's a JWT)
    let accessTokenDecoded = null;
    let idTokenDecoded = null;

    try {
      // Access token might be JWT - try to decode it
      const accessTokenParts = tokenData.access_token.split('.');
      if (accessTokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(accessTokenParts[1], 'base64url').toString());
        accessTokenDecoded = payload;
      }
    } catch {
      // Not a JWT or decode failed
    }

    try {
      // ID token should be JWT
      if (tokenData.id_token) {
        const idTokenParts = tokenData.id_token.split('.');
        if (idTokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(idTokenParts[1], 'base64url').toString());
          idTokenDecoded = payload;
        }
      }
    } catch {
      // ID token decode failed
    }

    return NextResponse.json({
      success: true,
      analysis: {
        tokenData: {
          client_id: tokenData.client_id,
          environment: tokenData.environment,
          api_base_url: tokenData.api_base_url,
          scope: tokenData.scope,
          token_type: tokenData.token_type,
          expires_in: tokenData.expires_in,
          connected_at: new Date(tokenData.connected_at).toISOString(),
        },
        accessToken: {
          isJWT: !!accessTokenDecoded,
          decoded: accessTokenDecoded,
          firstChars: tokenData.access_token.substring(0, 20) + '...',
        },
        idToken: {
          isJWT: !!idTokenDecoded,
          decoded: idTokenDecoded,
          firstChars: tokenData.id_token ? tokenData.id_token.substring(0, 20) + '...' : null,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'analysis_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
