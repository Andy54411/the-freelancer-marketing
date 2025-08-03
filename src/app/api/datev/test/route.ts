import { NextRequest, NextResponse } from 'next/server';
import { generateDatevAuthUrl, getDatevConfig } from '@/lib/datev-config';

/**
 * DATEV Test Endpoint
 * Tests DATEV service functionality without requiring authentication
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'auth-url';

    switch (action) {
      case 'auth-url':
        try {
          // Test OAuth URL generation
          const authUrl = generateDatevAuthUrl('test-state-123');
          return NextResponse.json({
            success: true,
            authUrl,
            message: 'DATEV OAuth URL generated successfully',
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              action: 'auth-url',
            },
            { status: 500 }
          );
        }

      case 'config-test':
        try {
          const config = getDatevConfig();
          return NextResponse.json({
            success: true,
            config: {
              hasClientId: !!config.clientId,
              hasClientSecret: !!config.clientSecret,
              redirectUri: config.redirectUri,
              baseUrl: config.baseUrl,
              authUrl: config.authUrl,
              tokenUrl: config.tokenUrl,
              scopesCount: config.scopes.length,
              scopes: config.scopes,
            },
            message: 'DATEV configuration loaded successfully',
          });
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              action: 'config-test',
            },
            { status: 500 }
          );
        }

      case 'endpoint-test':
        try {
          // Test DATEV API endpoint accessibility (without auth)
          const config = getDatevConfig();

          // Test if DATEV API is reachable
          const authResponse = await fetch(config.authUrl, {
            method: 'HEAD',
          }).catch(() => ({ ok: false, status: 0 }));

          return NextResponse.json({
            success: true,
            endpoints: {
              authEndpoint: {
                url: config.authUrl,
                reachable: authResponse.ok,
                status: authResponse.status,
              },
              baseUrl: config.baseUrl,
            },
            message: 'DATEV endpoint accessibility tested',
          });
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              action: 'endpoint-test',
            },
            { status: 500 }
          );
        }

      default:
        return NextResponse.json(
          {
            error: 'Invalid action',
            availableActions: ['auth-url', 'config-test', 'endpoint-test'],
          },
          { status: 400 }
        );
    }
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

/**
 * POST endpoint for testing DATEV operations that require data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'validate-credentials':
        return NextResponse.json({
          success: true,
          message: 'DATEV credentials validation would be performed here',
          note: 'This requires actual DATEV account setup',
        });

      default:
        return NextResponse.json(
          {
            error: 'Invalid POST action',
            availableActions: ['validate-credentials'],
          },
          { status: 400 }
        );
    }
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
