import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig } from '@/lib/datev-config';

/**
 * DATEV Sandbox Connection Test
 * Direct test of DATEV Sandbox API endpoints and OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    const config = getDatevConfig();

    console.log('🧪 Testing DATEV Sandbox Connection...');
    console.log('📋 Config:', {
      clientId: config.clientId,
      hasClientSecret: !!config.clientSecret,
      authUrl: config.authUrl,
      tokenUrl: config.tokenUrl,
      baseUrl: config.baseUrl,
      isSandbox: config.clientId === '6111ad8e8cae82d1a805950f2ae4adc4',
    });

    // Test 1: Check OIDC Discovery endpoint
    console.log('🔍 Testing OIDC Discovery...');
    const oidcResponse = await fetch(
      'https://login.datev.de/openidsandbox/.well-known/openid-configuration'
    );
    const oidcData = await oidcResponse.json();

    if (!oidcResponse.ok) {
      throw new Error(`OIDC Discovery failed: ${oidcResponse.status}`);
    }

    // Test 2: Validate endpoints match our configuration
    const endpointChecks = {
      authorization_endpoint: oidcData.authorization_endpoint === config.authUrl,
      token_endpoint: oidcData.token_endpoint === config.tokenUrl,
      userinfo_endpoint: oidcData.userinfo_endpoint === config.userInfoUrl,
    };

    // Test 3: Check if credentials are correctly configured
    const credentialsCheck = {
      hasClientId: !!config.clientId,
      hasClientSecret: !!config.clientSecret,
      isValidSandboxId: config.clientId === '6111ad8e8cae82d1a805950f2ae4adc4',
    };

    // Test 4: Try to access userinfo endpoint (should fail without token - that's expected)
    console.log('🔒 Testing userinfo endpoint (should return 401)...');
    const userinfoResponse = await fetch(config.userInfoUrl);
    const expectedUnauthorized = userinfoResponse.status === 401;

    // Test 5: Test Organizations endpoint (should also fail without token)
    console.log('🏢 Testing userinfo endpoint...');
    const orgResponse = await fetch(`${config.baseUrl}/v1/userinfo`);
    const orgUnauthorized = orgResponse.status === 401;

    return NextResponse.json({
      success: true,
      message: 'DATEV Sandbox Connection Test Results',
      timestamp: new Date().toISOString(),
      tests: {
        oidcDiscovery: {
          success: oidcResponse.ok,
          status: oidcResponse.status,
          endpoints: {
            authorization: oidcData.authorization_endpoint,
            token: oidcData.token_endpoint,
            userinfo: oidcData.userinfo_endpoint,
          },
        },
        endpointValidation: {
          allMatch: Object.values(endpointChecks).every(Boolean),
          checks: endpointChecks,
        },
        credentials: {
          configured: credentialsCheck.hasClientId && credentialsCheck.hasClientSecret,
          validSandboxId: credentialsCheck.isValidSandboxId,
          details: credentialsCheck,
        },
        apiAccess: {
          userinfoUnauthorized: expectedUnauthorized,
          message:
            'These should be 401 (unauthorized) without a valid token - this is expected behavior',
        },
      },
      config: {
        clientId: config.clientId,
        hasClientSecret: !!config.clientSecret,
        redirectUri: config.redirectUri,
        baseUrl: config.baseUrl,
        authUrl: config.authUrl,
        tokenUrl: config.tokenUrl,
        isSandbox: config.clientId === '6111ad8e8cae82d1a805950f2ae4adc4',
      },
      recommendations: [
        'If all tests pass, the DATEV Sandbox configuration is correct',
        'The OAuth flow should work when initiated from the UI',
        'Test the actual OAuth flow by clicking "Mit DATEV verbinden" in the dashboard',
        'Check browser console for any client-side errors during OAuth flow',
      ],
    });
  } catch (error) {
    console.error('DATEV Sandbox test failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'DATEV Sandbox test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
