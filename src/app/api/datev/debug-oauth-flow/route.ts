import { NextRequest, NextResponse } from 'next/server';
import { generateDatevAuthUrl } from '@/lib/datev-config';

/**
 * DATEV Sandbox OAuth Flow Debugger
 * Provides detailed information about the OAuth flow for troubleshooting
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || 'test-company-123';

    console.log('🧪 DATEV OAuth Flow Debug starting for company:', companyId);

    // Generate OAuth URL
    const authData = generateDatevAuthUrl(companyId);

    console.log('✅ Generated OAuth data:', {
      state: authData.state,
      codeVerifier: authData.codeVerifier.substring(0, 20) + '...',
      nonce: authData.nonce.substring(0, 20) + '...',
      authUrl: authData.authUrl,
    });

    // Parse the auth URL to show all parameters
    const authUrl = new URL(authData.authUrl);
    const params = Object.fromEntries(authUrl.searchParams);

    return NextResponse.json({
      success: true,
      message: 'DATEV OAuth Flow Debug Information',
      timestamp: new Date().toISOString(),
      debug: {
        companyId,
        generatedData: {
          state: authData.state,
          nonce: authData.nonce,
          codeVerifier: authData.codeVerifier,
          codeChallenge: params.code_challenge,
        },
        authUrl: {
          fullUrl: authData.authUrl,
          baseUrl: authUrl.origin + authUrl.pathname,
          parameters: params,
        },
        instructions: [
          '1. Copy the fullUrl below and paste it into your browser',
          '2. You should be redirected to DATEV Sandbox login',
          '3. Use DATEV Sandbox test credentials to log in',
          '4. After successful login, you will be redirected back to the callback',
          '5. Check the browser console and network tab for any errors',
        ],
        testCredentials: {
          info: 'DATEV Sandbox should provide test credentials in their developer portal',
          consultantNumber: '455148',
          clientNumbers: ['1', '2', '3', '4', '5', '6'],
          note: 'You need actual DATEV Sandbox account credentials to test this',
        },
      },
      troubleshooting: {
        commonIssues: [
          'Invalid DATEV Sandbox credentials',
          'DATEV Sandbox account not properly set up',
          'Browser blocking third-party cookies',
          'Network connectivity issues',
          'DATEV Sandbox service temporarily unavailable',
        ],
        solutions: [
          'Verify your DATEV Sandbox account is active',
          'Check DATEV Developer Portal for current status',
          'Try in an incognito/private browser window',
          'Clear browser cookies and cache',
          'Check if DATEV Sandbox has maintenance windows',
        ],
      },
    });
  } catch (error) {
    console.error('DATEV OAuth debug failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'OAuth debug failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
