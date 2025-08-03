import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig } from '@/lib/datev-config';

/**
 * DATEV UserInfo API Handler
 * Fetches user profile information from DATEV sandbox using access token
 * Based on official DATEV documentation: https://sandbox-api.datev.de/userinfo
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('access_token');

    if (!accessToken) {
      return NextResponse.json(
        { error: 'access_token_required', message: 'Access token is required' },
        { status: 400 }
      );
    }

    const config = getDatevConfig();

    console.log('Fetching DATEV user info...', {
      userInfoUrl: config.userInfoUrl,
      timestamp: new Date().toISOString(),
    });

    // Call DATEV UserInfo endpoint with Bearer token
    const userInfoResponse = await fetch(config.userInfoUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const userInfo = await userInfoResponse.json();

    if (!userInfoResponse.ok) {
      console.error('DATEV UserInfo API error:', {
        status: userInfoResponse.status,
        statusText: userInfoResponse.statusText,
        error: userInfo,
      });

      return NextResponse.json(
        {
          error: 'datev_userinfo_error',
          message: userInfo.error_description || 'Failed to fetch user info from DATEV',
          details: userInfo,
        },
        { status: userInfoResponse.status }
      );
    }

    console.log('DATEV UserInfo successful:', {
      hasAccountId: !!userInfo.account_id,
      hasProfile: !!userInfo.profile,
      hasEmail: !!userInfo.email,
    });

    // Return user information according to DATEV specification
    return NextResponse.json({
      success: true,
      userInfo: {
        account_id: userInfo.account_id, // DATEV Account ID for linking accounts
        sub: userInfo.sub, // Subject (unique user identifier)
        name: userInfo.name,
        given_name: userInfo.given_name,
        family_name: userInfo.family_name,
        email: userInfo.email,
        email_verified: userInfo.email_verified,
        profile: userInfo.profile,
        preferred_username: userInfo.preferred_username,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('DATEV UserInfo API error:', error);
    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Internal server error while fetching user info',
      },
      { status: 500 }
    );
  }
}

/**
 * Test UserInfo with mock token for development
 * Provides a way to test the UserInfo flow without full OAuth
 */
export async function POST(request: NextRequest) {
  try {
    const { testMode, mockAccountId } = await request.json();

    if (testMode === 'mock') {
      // Return mock user info for development/testing
      return NextResponse.json({
        success: true,
        userInfo: {
          account_id: mockAccountId || 'test-account-12345',
          sub: 'datev-user-' + Date.now(),
          name: 'Test DATEV User',
          given_name: 'Test',
          family_name: 'User',
          email: 'test@datev-sandbox.de',
          email_verified: true,
          profile: 'https://datev.de/profile/test-user',
          preferred_username: 'datev_test_user',
        },
        mock: true,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'invalid_request', message: 'Invalid test mode' },
      { status: 400 }
    );
  } catch (error) {
    console.error('DATEV UserInfo mock error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to process mock request' },
      { status: 500 }
    );
  }
}

/**
 * Handle preflight OPTIONS request for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
