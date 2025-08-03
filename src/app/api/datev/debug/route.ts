import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig, DATEV_ENDPOINTS } from '@/lib/datev-config';

/**
 * DATEV Debug Endpoint
 * Provides diagnostic information for DATEV integration issues
 */
export async function GET(request: NextRequest) {
  try {
    const config = getDatevConfig();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    switch (action) {
      case 'status':
        return NextResponse.json({
          config: {
            clientId: config.clientId ? `${config.clientId.substring(0, 8)}...` : 'missing',
            clientSecret: config.clientSecret ? 'configured' : 'missing',
            redirectUri: config.redirectUri,
            baseUrl: config.baseUrl,
            authUrl: config.authUrl,
            tokenUrl: config.tokenUrl,
            scopes: config.scopes,
          },
          environment: {
            NODE_ENV: process.env.NODE_ENV,
            hasClientId: !!process.env.DATEV_CLIENT_ID,
            hasClientSecret: !!process.env.DATEV_CLIENT_SECRET,
            isVercelDeployment: !!process.env.VERCEL,
            vercelEnv: process.env.VERCEL_ENV,
          },
          endpoints: DATEV_ENDPOINTS,
          timestamp: new Date().toISOString(),
        });

      case 'test-auth':
        // Test if DATEV OAuth endpoints are reachable
        try {
          const authResponse = await fetch(config.authUrl, { method: 'HEAD' });
          const tokenResponse = await fetch(config.tokenUrl, { method: 'HEAD' });

          return NextResponse.json({
            authEndpoint: {
              url: config.authUrl,
              reachable: authResponse.ok,
              status: authResponse.status,
            },
            tokenEndpoint: {
              url: config.tokenUrl,
              reachable: tokenResponse.ok,
              status: tokenResponse.status,
            },
          });
        } catch (error) {
          return NextResponse.json(
            {
              error: 'Failed to test DATEV endpoints',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
          );
        }

      case 'validate-config':
        // Validate configuration
        const issues: string[] = [];

        if (!process.env.DATEV_CLIENT_ID) {
          issues.push('Missing DATEV_CLIENT_ID environment variable');
        }
        if (!process.env.DATEV_CLIENT_SECRET) {
          issues.push('Missing DATEV_CLIENT_SECRET environment variable');
        }
        if (!config.redirectUri.includes('taskilo.de') && process.env.NODE_ENV === 'production') {
          issues.push('Invalid redirect URI for production');
        }
        if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
          issues.push('Production environment but not on Vercel - check deployment');
        }

        return NextResponse.json({
          valid: issues.length === 0,
          issues,
          recommendations: [
            'Ensure DATEV_CLIENT_ID is set in Vercel environment variables',
            'Ensure DATEV_CLIENT_SECRET is set in Vercel environment variables',
            'Verify redirect URI matches DATEV app configuration',
            'Check that scopes match DATEV app permissions',
            'For production: Deploy to Vercel with proper environment variables',
          ],
          vercelInfo: {
            isVercelDeployment: !!process.env.VERCEL,
            vercelEnv: process.env.VERCEL_ENV || 'not-vercel',
            hasRequiredVars: !!(process.env.DATEV_CLIENT_ID && process.env.DATEV_CLIENT_SECRET),
          },
        });

      default:
        return NextResponse.json(
          {
            error: 'Invalid action',
            availableActions: ['status', 'test-auth', 'validate-config'],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('DATEV debug error:', error);
    return NextResponse.json(
      {
        error: 'Debug endpoint error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, token } = await request.json();

    switch (action) {
      case 'test-token':
        if (!token) {
          return NextResponse.json({ error: 'Token required' }, { status: 400 });
        }

        const config = getDatevConfig();

        // Test token by calling user info endpoint
        const userResponse = await fetch(`${config.baseUrl}${DATEV_ENDPOINTS.userInfo}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });

        if (!userResponse.ok) {
          const errorData = await userResponse.text();
          return NextResponse.json({
            valid: false,
            error: `HTTP ${userResponse.status}`,
            details: errorData,
          });
        }

        const userData = await userResponse.json();
        return NextResponse.json({
          valid: true,
          user: userData,
        });

      case 'clear-storage':
        // This would normally clear server-side storage
        // For now, just return success (client-side will clear localStorage)
        return NextResponse.json({
          success: true,
          message: 'Client should clear localStorage',
        });

      default:
        return NextResponse.json(
          {
            error: 'Invalid action',
            availableActions: ['test-token', 'clear-storage'],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('DATEV debug POST error:', error);
    return NextResponse.json(
      {
        error: 'Debug operation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
