import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig, DATEV_ENDPOINTS } from '@/lib/datev-config';

/**
 * DATEV Token Validation Endpoint
 * Validates current DATEV access token by making a test API call
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const config = getDatevConfig();

    // Test token by calling DATEV user info endpoint
    const response = await fetch(`${config.apiBaseUrl}${DATEV_ENDPOINTS.userInfo}`, {
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();

      // Check for specific error types
      if (response.status === 401) {
        return NextResponse.json(
          {
            error: 'invalid_token',
            message: 'Token is expired or invalid',
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          error: 'validation_failed',
          message: 'Token validation failed',
        },
        { status: 400 }
      );
    }

    const userData = await response.json();

    return NextResponse.json({
      valid: true,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name || userData.email,
        organization: userData.organization,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Internal server error during token validation',
      },
      { status: 500 }
    );
  }
}
