import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig } from '@/lib/datev-config';

/**
 * DATEV OAuth Test Endpoint
 * Testet den kompletten OAuth Flow mit korrekter DATEV Implementierung
 */
export async function GET(request: NextRequest) {
  try {
    const config = getDatevConfig();

    // Test verschiedene DATEV OAuth Ansätze

    // 1. Basic Client Credentials Test
    const clientCredentialsTest = await testClientCredentials(config);

    // 2. OAuth Authorization URL Test
    const authUrlTest = await testAuthorizationUrl(config);

    return NextResponse.json({
      success: true,
      config: {
        clientId: config.clientId,
        baseUrl: config.baseUrl,
        authUrl: config.authUrl,
        tokenUrl: config.tokenUrl,
      },
      tests: {
        clientCredentials: clientCredentialsTest,
        authorizationUrl: authUrlTest,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('DATEV OAuth test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function testClientCredentials(config: any) {
  try {
    // Test DATEV Client Credentials Grant
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'accounting-data:read accounting-data:write organizations:read user:read',
      }),
    });

    const tokenData = await tokenResponse.json();

    return {
      success: tokenResponse.ok,
      status: tokenResponse.status,
      data: tokenData,
      headers: Object.fromEntries(tokenResponse.headers.entries()),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testAuthorizationUrl(config: any) {
  try {
    const testState = `test:${Date.now()}`;
    const scope = 'accounting-data:read accounting-data:write organizations:read user:read';
    const redirectUri = 'https://taskilo.de/api/datev/callback';

    const authUrl = `${config.authUrl}?client_id=${config.clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(testState)}`;

    // Test ob die Auth URL erreichbar ist
    const authResponse = await fetch(authUrl, {
      method: 'GET',
      redirect: 'manual', // Keine automatische Weiterleitung
    });

    return {
      success: true,
      status: authResponse.status,
      url: authUrl,
      headers: Object.fromEntries(authResponse.headers.entries()),
      isRedirect: authResponse.status >= 300 && authResponse.status < 400,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
