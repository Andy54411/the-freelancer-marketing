/**
 * DATEV Callback Simulator
 * Simuliert einen erfolgreichen OAuth Callback für Testzwecke
 * ONLY FOR DEVELOPMENT/TESTING
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig } from '@/lib/datev-config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1';

    console.log('🔄 [DATEV Callback Simulator] Starting simulation for company:', companyId);

    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'simulator_disabled', message: 'Simulator nur in Development verfügbar' },
        { status: 403 }
      );
    }

    // Get current config
    const config = getDatevConfig();

    // Simulate token exchange success (MOCK DATA - only for testing)
    const mockTokenData = {
      access_token: `mock_sandbox_token_${Date.now()}`,
      refresh_token: `mock_refresh_token_${Date.now()}`,
      token_type: 'Bearer',
      expires_in: 900, // 15 minutes
      scope: 'openid profile account_id email',
    };

    // Create cookie data (same structure as real callback)
    const expiresAt = Date.now() + (mockTokenData.expires_in || 3600) * 1000;

    const fullTokenData = {
      access_token: mockTokenData.access_token,
      refresh_token: mockTokenData.refresh_token,
      token_type: mockTokenData.token_type || 'Bearer',
      expires_at: expiresAt,
      expires_in: mockTokenData.expires_in,
      scope: mockTokenData.scope || '',
      // Additional metadata
      connected_at: Date.now(),
      company_id: companyId,
      // Environment metadata for hybrid setup
      environment: process.env.NODE_ENV,
      client_id: config.clientId,
      api_base_url: config.apiBaseUrl,
      // Simulator metadata
      simulated: true,
      simulation_timestamp: Date.now(),
    };

    // Encode token data as base64
    const encodedData = Buffer.from(JSON.stringify(fullTokenData)).toString('base64');
    const cookieName = `datev_tokens_${companyId}`;

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      message: 'DATEV OAuth Callback erfolgreich simuliert',
      simulation: true,
      companyId: companyId,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isSandbox: config.clientId === '6111ad8e8cae82d1a805950f2ae4adc4',
      },
      tokenData: {
        hasAccessToken: !!mockTokenData.access_token,
        hasRefreshToken: !!mockTokenData.refresh_token,
        expiresIn: mockTokenData.expires_in,
        scope: mockTokenData.scope,
      },
      cookie: {
        name: cookieName,
        dataSize: encodedData.length,
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
      },
      nextSteps: {
        test: 'Call /api/datev/organizations?companyId=' + companyId + ' to test token usage',
        debug: 'Call /api/datev/debug-cookies?companyId=' + companyId + ' to inspect cookie',
        setup: 'Go to /dashboard/company/' + companyId + '/datev/setup to see UI',
      },
    });

    // Set secure HTTP-only cookie (same as real callback)
    response.cookies.set(cookieName, encodedData, {
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV !== 'development',
      httpOnly: true, // Server-only for security
    });

    console.log(
      '✅ [DATEV Callback Simulator] Mock tokens stored in cookie for company:',
      companyId,
      {
        cookieName,
        dataSize: encodedData.length,
        expiresIn: mockTokenData.expires_in,
        environment: process.env.NODE_ENV,
        apiBaseUrl: config.apiBaseUrl,
      }
    );

    return response;
  } catch (error) {
    console.error('❌ [DATEV Callback Simulator] Error:', error);
    return NextResponse.json(
      {
        error: 'simulation_error',
        message: 'Failed to simulate callback',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
