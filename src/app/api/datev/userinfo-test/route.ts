import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDatevConfig } from '@/lib/datev-config';

interface DatevTokenData {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  connected_at: number;
  company_id: string;
  environment: string;
  client_id: string;
  api_base_url: string;
}

function getDatevCookieName(companyId: string): string {
  const environment = process.env.NODE_ENV || 'development';
  return `datev_tokens_${environment}_${companyId}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Missing companyId parameter' }, { status: 400 });
    }

    // Get stored tokens from HTTP-only cookie
    const cookieStore = await cookies();
    const cookieName = getDatevCookieName(companyId);
    const tokenCookie = cookieStore.get(cookieName);

    if (!tokenCookie?.value) {
      return NextResponse.json(
        {
          error: 'no_tokens',
          message: 'Keine DATEV-Token gefunden. Bitte authentifizieren Sie sich zuerst.',
        },
        { status: 401 }
      );
    }

    // Decode and parse token data
    let tokenData: DatevTokenData;
    try {
      const decodedData = Buffer.from(tokenCookie.value, 'base64').toString('utf-8');
      tokenData = JSON.parse(decodedData);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 });
    }

    // Use correct OIDC userinfo endpoint (not platform API)
    const { DATEV_SANDBOX_CONFIG } = await import('@/lib/datev-config');
    const apiUrl = DATEV_SANDBOX_CONFIG.endpoints.userinfo;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
        'User-Agent': 'Taskilo-DATEV-Integration/1.0',
        'X-Client-ID': '6111ad8e8cae82d1a805950f2ae4adc4', // Explicitly pass sandbox client ID
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'api_request_failed',
          status: response.status,
          statusText: response.statusText,
          body: responseText,
          apiUrl,
        },
        { status: response.status }
      );
    }

    // Try to parse JSON response
    let userData;
    try {
      userData = JSON.parse(responseText);
    } catch (error) {
      userData = responseText;
    }

    return NextResponse.json({
      success: true,
      userInfo: userData,
      apiUrl,
      tokenEnvironment: tokenData.environment,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
