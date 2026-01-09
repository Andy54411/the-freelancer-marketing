import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig, generateDatevAuthUrl } from '@/lib/datev-config';

/**
 * DATEV Sandbox Test Route
 * Tests direct access to DATEV Sandbox APIs and OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'auth';

    // Get current DATEV configuration
    const config = getDatevConfig();

    // Check if we have sandbox credentials
    const isSandbox = config.clientId === '6111ad8e8cae82d1a805950f2ae4adc4';

    if (!config.clientId || !config.clientSecret) {
      return NextResponse.json(
        {
          error: 'Missing DATEV credentials',
          message: 'DATEV_CLIENT_ID and DATEV_CLIENT_SECRET must be set',
          config: {
            hasClientId: !!config.clientId,
            hasClientSecret: !!config.clientSecret,
            clientId: config.clientId,
          },
        },
        { status: 400 }
      );
    }

    switch (action) {
      case 'auth':
        // Generate OAuth URL and redirect to DATEV Sandbox
        const { authUrl } = generateDatevAuthUrl('test-company-123');

        // Store PKCE data temporarily (in production, use secure storage)
        // For now, we'll store in the URL state parameter

        return NextResponse.redirect(authUrl);

      case 'config':
        // Return current configuration for debugging
        return NextResponse.json({
          success: true,
          message: 'DATEV Configuration',
          config: {
            clientId: config.clientId,
            hasClientSecret: !!config.clientSecret,
            redirectUri: config.redirectUri,
            baseUrl: config.baseUrl,
            authUrl: config.authUrl,
            tokenUrl: config.tokenUrl,
            scopes: config.scopes,
            isSandbox,
          },
          availableActions: [
            'auth - Start OAuth flow',
            'config - Show configuration',
            'endpoints - List available endpoints',
            'test-api - Test API access (requires token)',
          ],
        });

      case 'endpoints':
        // List all available DATEV API endpoints
        return NextResponse.json({
          success: true,
          message: 'Available DATEV API Endpoints',
          baseUrl: config.baseUrl,
          endpoints: {
            'OAuth & User': {
              userInfo: `${config.baseUrl}/userinfo`,
              userinfo: `${config.baseUrl}/platform/v1/userinfo`,
            },
            'Accounting APIs': {
              clients: `${config.baseUrl}/accounting/v1/clients`,
              accounts: `${config.baseUrl}/accounting/v1/accounts`,
              transactions: `${config.baseUrl}/accounting/v1/transactions`,
              documents: `${config.baseUrl}/accounting/v1/documents`,
            },
            'Your Subscribed APIs': {
              'cashregister:import': `${config.baseUrl}/cashregister/v2.6.0/import`,
              'master-data:master-clients': `${config.baseUrl}/master-data/v3/master-clients`,
              'accounting:extf-files': `${config.baseUrl}/accounting/v2.0/extf-files`,
              'accounting:dxso-jobs': `${config.baseUrl}/accounting/v2.0/dxso-jobs`,
              'accounting:documents': `${config.baseUrl}/accounting/v2.0/documents`,
            },
            'Data Exchange': {
              export: `${config.baseUrl}/accounting/v1/export`,
              import: `${config.baseUrl}/accounting/v1/import`,
            },
          },
        });

      case 'test-api':
        // Test API access (would need a valid token)
        const testToken = searchParams.get('token');
        if (!testToken) {
          return NextResponse.json(
            {
              error: 'Missing token',
              message: 'Add ?token=YOUR_ACCESS_TOKEN to test API calls',
              note: 'Get a token first by completing OAuth flow with ?action=auth',
            },
            { status: 400 }
          );
        }

        // Test a simple API call
        try {
          const response = await fetch(`${config.baseUrl}/platform/v1/userinfo`, {
            headers: {
              Authorization: `Bearer ${testToken}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          });

          const data = await response.json();

          return NextResponse.json({
            success: response.ok,
            status: response.status,
            message: response.ok ? 'API test successful' : 'API test failed',
            data,
            endpoint: 'userinfo',
          });
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              message: 'API test failed',
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
          );
        }

      default:
        return NextResponse.json(
          {
            error: 'Invalid action',
            message: 'Use ?action=auth|config|endpoints|test-api',
            availableActions: ['auth', 'config', 'endpoints', 'test-api'],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'DATEV Sandbox test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Handle POST requests for testing API calls with body data
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        {
          error: 'Missing token',
          message: 'Add ?token=YOUR_ACCESS_TOKEN to make API calls',
        },
        { status: 400 }
      );
    }

    if (!endpoint) {
      return NextResponse.json(
        {
          error: 'Missing endpoint',
          message: 'Add ?endpoint=ENDPOINT_PATH to specify which API to call',
        },
        { status: 400 }
      );
    }

    const config = getDatevConfig();
    const body = await request.json();

    const response = await fetch(`${config.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      message: response.ok ? 'API POST successful' : 'API POST failed',
      data,
      endpoint,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'DATEV API POST failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
