import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug DATEV Callback Flow
 * Log all callback parameters and state to understand redirect issues
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const callbackData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      searchParams: Object.fromEntries(searchParams.entries()),
      timestamp: new Date().toISOString(),
    };

    console.log('🔍 [DATEV Callback Debug] Full callback data:', callbackData);

    return NextResponse.json({
      success: true,
      message: 'DATEV callback debug information',
      debug: callbackData,
      analysis: {
        hasCode: !!searchParams.get('code'),
        hasState: !!searchParams.get('state'),
        hasError: !!searchParams.get('error'),
        stateFormat: searchParams.get('state')?.split(':'),
        recommendations: [
          'Check if callback URL matches OAuth redirect_uri exactly',
          'Verify state parameter format and expiration',
          'Check if authorization code is present',
          'Monitor server logs for token exchange process',
        ],
      },
    });
  } catch (error) {
    console.error('DATEV callback debug failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Callback debug failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
