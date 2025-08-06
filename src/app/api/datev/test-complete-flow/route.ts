/**
 * DATEV Complete Flow Test Route
 * Simuliert den kompletten OAuth Flow für Testzwecke
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig } from '@/lib/datev-config';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1';

    console.log('🚀 [DATEV Test Flow] Starting complete flow test for company:', companyId);

    // Step 1: Generate PKCE challenge (same as in auth flow)
    const codeVerifier = crypto.randomBytes(96).toString('base64url').substring(0, 128);
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    // Step 2: Get current config
    const config = getDatevConfig();

    console.log('🔍 [DATEV Test Flow] Environment Analysis:', {
      nodeEnv: process.env.NODE_ENV,
      clientId: config.clientId,
      apiBaseUrl: config.apiBaseUrl,
      tokenUrl: config.tokenUrl,
      authUrl: config.authUrl,
      isSandbox: config.clientId === '6111ad8e8cae82d1a805950f2ae4adc4',
      hasClientSecret: !!config.clientSecret,
    });

    // Step 3: Create state (same format as real OAuth)
    const stateData = {
      companyId: companyId,
      codeVerifier: codeVerifier,
      timestamp: Date.now(),
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

    // Step 4: Generate auth URL (same as real OAuth)
    const authUrl = new URL(config.authUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('redirect_uri', 'http://localhost');
    authUrl.searchParams.set('scope', 'openid profile account_id email');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('prompt', 'consent');

    console.log('🔗 [DATEV Test Flow] Generated OAuth URL:', {
      url: authUrl.toString(),
      state: state,
      codeChallenge: codeChallenge.substring(0, 20) + '...',
      codeVerifier: codeVerifier.substring(0, 20) + '...',
    });

    // Step 5: Return comprehensive test information
    return NextResponse.json({
      success: true,
      testFlow: 'DATEV OAuth Complete Flow Test',
      timestamp: new Date().toISOString(),
      companyId: companyId,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isSandbox: config.clientId === '6111ad8e8cae82d1a805950f2ae4adc4',
      },
      config: {
        clientId: config.clientId,
        apiBaseUrl: config.apiBaseUrl,
        authUrl: config.authUrl,
        tokenUrl: config.tokenUrl,
        hasClientSecret: !!config.clientSecret,
      },
      oauth: {
        authUrl: authUrl.toString(),
        state: state,
        stateData: stateData,
        pkce: {
          codeVerifier: codeVerifier,
          codeChallenge: codeChallenge,
          method: 'S256',
        },
      },
      instructions: {
        manual: 'Copy the authUrl to a real browser to complete OAuth flow',
        callback: `After OAuth completion, DATEV will redirect to http://localhost with code parameter`,
        simulation: 'This route provides all data needed for OAuth flow testing',
      },
      nextSteps: {
        step1: 'Open authUrl in real browser',
        step2: 'Complete DATEV login',
        step3: 'Copy callback URL with code parameter',
        step4: 'Use code with /api/datev/callback-cookie to complete flow',
      },
    });
  } catch (error) {
    console.error('❌ [DATEV Test Flow] Error:', error);
    return NextResponse.json(
      {
        error: 'test_flow_error',
        message: 'Failed to generate test flow',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
