import { NextResponse } from 'next/server';

/**
 * DATEV URL Alternatives Test
 * Teste verschiedene DATEV Sandbox URLs und Ansätze
 */
export async function GET() {
  try {
    const clientId = process.env.DATEV_CLIENT_ID || '';
    const clientSecret = process.env.DATEV_CLIENT_SECRET || '';

    // Verschiedene DATEV Sandbox URLs testen
    const urlsToTest = [
      'https://sandbox-api.datev.de',
      'https://api-sandbox.datev.de',
      'https://dev-api.datev.de',
      'https://test-api.datev.de',
      'https://api.datev.de', // Production für Vergleich
    ];

    const results = [];

    for (const baseUrl of urlsToTest) {
      try {
        const tokenUrl = `${baseUrl}/platform/v1/oauth2/token`;

        // Test Client Credentials für jede URL
        const response = await fetch(tokenUrl, {
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

        const data = await response.json();

        results.push({
          baseUrl,
          tokenUrl,
          status: response.status,
          success: response.ok,
          data,
          headers: Object.fromEntries(response.headers.entries()),
        });
      } catch (error) {
        results.push({
          baseUrl,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      clientInfo: {
        clientId,
        clientSecretLength: clientSecret.length,
        clientSecretStart: clientSecret.substring(0, 8),
      },
      urlTests: results,
      recommendations: [
        'Check which URL gives different error than "Token signature did not match"',
        'Look for 404 errors (wrong URL) vs 401 errors (wrong credentials)',
        'Check DATEV documentation for correct sandbox URL',
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('URL alternatives test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
