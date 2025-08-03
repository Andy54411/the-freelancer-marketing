import { NextRequest, NextResponse } from 'next/server';

/**
 * DATEV Alternative OAuth Test
 * Testet verschiedene DATEV Sandbox URLs und Konfigurationen
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.DATEV_CLIENT_ID || '';
    const clientSecret = process.env.DATEV_CLIENT_SECRET || '';

    // Test verschiedene DATEV Sandbox URLs
    const alternativeConfigs = [
      {
        name: 'Current Sandbox',
        baseUrl: 'https://sandbox-api.datev.de',
        authUrl: 'https://sandbox-api.datev.de/platform/v1/oauth2/authorize',
        tokenUrl: 'https://sandbox-api.datev.de/platform/v1/oauth2/token',
      },
      {
        name: 'Alternative Sandbox',
        baseUrl: 'https://api-sandbox.datev.de',
        authUrl: 'https://api-sandbox.datev.de/platform/v1/oauth2/authorize',
        tokenUrl: 'https://api-sandbox.datev.de/platform/v1/oauth2/token',
      },
      {
        name: 'Test Environment',
        baseUrl: 'https://test-api.datev.de',
        authUrl: 'https://test-api.datev.de/platform/v1/oauth2/authorize',
        tokenUrl: 'https://test-api.datev.de/platform/v1/oauth2/token',
      },
      {
        name: 'Development Environment',
        baseUrl: 'https://dev-api.datev.de',
        authUrl: 'https://dev-api.datev.de/platform/v1/oauth2/authorize',
        tokenUrl: 'https://dev-api.datev.de/platform/v1/oauth2/token',
      },
    ];

    const results = [];

    for (const config of alternativeConfigs) {
      try {
        // Test Token Endpoint
        const tokenTest = await fetch(config.tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            scope: 'accounting-data:read',
          }),
        });

        const tokenResponse = await tokenTest.json();

        // Test Auth URL
        const authUrl = `${config.authUrl}?client_id=${clientId}&response_type=code&redirect_uri=https%3A%2F%2Ftaskilo.de%2Fapi%2Fdatev%2Fcallback&scope=accounting-data%3Aread&state=test`;

        const authTest = await fetch(authUrl, {
          method: 'GET',
          redirect: 'manual',
        });

        results.push({
          config: config.name,
          baseUrl: config.baseUrl,
          tokenTest: {
            status: tokenTest.status,
            success: tokenTest.ok,
            response: tokenResponse,
          },
          authTest: {
            status: authTest.status,
            success: authTest.ok || (authTest.status >= 300 && authTest.status < 400),
            isRedirect: authTest.status >= 300 && authTest.status < 400,
          },
          authUrl: authUrl.substring(0, 100) + '...',
        });
      } catch (error) {
        results.push({
          config: config.name,
          baseUrl: config.baseUrl,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      credentials: {
        clientId: clientId.substring(0, 8) + '...',
        clientSecretLength: clientSecret.length,
      },
      results,
      recommendations: results
        .filter(r => r.tokenTest?.success || r.authTest?.success)
        .map(r => `${r.config} (${r.baseUrl}) - Working endpoint found!`),
    });
  } catch (error) {
    console.error('DATEV alternative test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
