import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig, DATEV_ENDPOINTS } from '@/lib/datev-config';

/**
 * DATEV Token Debug Endpoint
 * Helps debug token-related issues
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';
    const token = searchParams.get('token');

    switch (action) {
      case 'status':
        return NextResponse.json({
          message: 'DATEV Token Debug Endpoint',
          availableActions: [
            'status - This status message',
            'validate-token - Validate a specific token',
            'test-endpoints - Test DATEV API endpoints',
          ],
          timestamp: new Date().toISOString(),
        });

      case 'validate-token':
        if (!token) {
          return NextResponse.json(
            { error: 'Token parameter required for validation' },
            { status: 400 }
          );
        }

        const config = getDatevConfig();

        try {
          // Test token against DATEV user info endpoint
          const userResponse = await fetch(`${config.baseUrl}${DATEV_ENDPOINTS.userInfo}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          });

          const responseText = await userResponse.text();
          let responseData;

          try {
            responseData = JSON.parse(responseText);
          } catch {
            responseData = responseText;
          }

          return NextResponse.json({
            success: userResponse.ok,
            status: userResponse.status,
            statusText: userResponse.statusText,
            headers: Object.fromEntries(userResponse.headers),
            response: responseData,
            tokenValid: userResponse.ok,
            timestamp: new Date().toISOString(),
          });
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

      case 'test-endpoints':
        const testConfig = getDatevConfig();
        const endpoints = [
          { name: 'userInfo', url: `${testConfig.baseUrl}${DATEV_ENDPOINTS.userInfo}` },
          { name: 'organizations', url: `${testConfig.baseUrl}${DATEV_ENDPOINTS.organizations}` },
          { name: 'accounts', url: `${testConfig.baseUrl}${DATEV_ENDPOINTS.accounts}` },
        ];

        const results: Array<{
          name: string;
          url: string;
          reachable: boolean;
          status?: number;
          statusText?: string;
          error?: string;
        }> = [];

        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint.url, {
              method: 'HEAD',
            });

            results.push({
              name: endpoint.name,
              url: endpoint.url,
              reachable: response.ok,
              status: response.status,
              statusText: response.statusText,
            });
          } catch (error) {
            results.push({
              name: endpoint.name,
              url: endpoint.url,
              reachable: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        return NextResponse.json({
          success: true,
          endpoints: results,
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          {
            error: 'Invalid action',
            availableActions: ['status', 'validate-token', 'test-endpoints'],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('DATEV token debug error:', error);

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

/**
 * POST endpoint for token debugging with request body
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, token, authHeader } = body;

    if (action === 'debug-request') {
      const config = getDatevConfig();

      const authHeaderToUse = authHeader || `Bearer ${token}`;

      try {
        const response = await fetch(`${config.baseUrl}${DATEV_ENDPOINTS.userInfo}`, {
          headers: {
            Authorization: authHeaderToUse,
            Accept: 'application/json',
            'User-Agent': 'Taskilo-DATEV-Integration/1.0',
          },
        });

        const responseText = await response.text();
        let responseData;

        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText;
        }

        return NextResponse.json({
          request: {
            url: `${config.baseUrl}${DATEV_ENDPOINTS.userInfo}`,
            headers: {
              Authorization: authHeaderToUse.replace(/Bearer\s+(.{10}).*/, 'Bearer $1...'),
              Accept: 'application/json',
            },
          },
          response: {
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers),
            body: responseData,
          },
          timestamp: new Date().toISOString(),
        });
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

    return NextResponse.json({ error: 'Invalid action for POST request' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
