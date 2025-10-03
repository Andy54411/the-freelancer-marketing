import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig } from '@/lib/datev-config';

/**
 * DATEV OAuth URL Debug Endpoint
 * Zeigt die generierte OAuth URL und Parameter für Debugging
 */
export async function GET(request: NextRequest) {
  try {
    const config = getDatevConfig();

    // Debug-Parameter
    const testState = `company:debug:${Date.now()}`;
    const scopes = ['accounting-data:read', 'accounting-data:write', 'userinfo:read', 'user:read'];
    const scope = scopes.join(' ');

    const redirectUri =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/api/datev/callback'
        : 'https://taskilo.de/api/datev/callback';

    const authUrl = `${config.authUrl}?client_id=${config.clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(testState)}`;

    const debugInfo = {
      success: true,
      config: {
        clientId: config.clientId,
        authUrl: config.authUrl,
        redirectUri,
        scope,
        state: testState,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      },
      generatedUrl: authUrl,
      urlComponents: {
        baseUrl: config.authUrl,
        clientId: config.clientId,
        responseType: 'code',
        redirectUri,
        scope,
        state: testState,
      },
    };

    return NextResponse.json(debugInfo);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
