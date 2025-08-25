import { NextResponse } from 'next/server';
import { generateDatevAuthUrl, getDatevConfig } from '@/lib/datev-config-correct';

/**
 * DATEV Correct OAuth Test
 * Testet den korrekten OpenID Connect Flow mit PKCE
 */
export async function GET() {
  try {
    const config = getDatevConfig();

    // Test 1: Discovery Endpoint abrufen
    const discoveryTest = await testDiscoveryEndpoint(config.discoveryEndpoint);

    // Test 2: Korrekte Auth URL generieren
    const authUrlTest = generateDatevAuthUrl('test-company-123');

    return NextResponse.json({
      success: true,
      message: 'DATEV Correct OAuth Implementation Test',
      documentation: 'Based on https://developer.datev.de/de/guides/authentication',

      config: {
        clientId: config.clientId,
        discoveryEndpoint: config.discoveryEndpoint,
        authUrl: config.authUrl,
        tokenUrl: config.tokenUrl,
        scopes: config.scopes,
      },

      tests: {
        discovery: discoveryTest,
        authUrl: {
          generatedUrl: authUrlTest.authUrl,
          state: authUrlTest.state,
          nonce: authUrlTest.nonce,
          codeVerifier: authUrlTest.codeVerifier.substring(0, 20) + '...',
          parameters: parseUrlParameters(authUrlTest.authUrl),
        },
      },

      differences: {
        oldWrongApproach: 'Client Credentials Flow zu sandbox-api.datev.de',
        newCorrectApproach: 'OpenID Connect Authorization Code Flow mit PKCE zu login.datev.de',
        keyChanges: [
          '✅ Verwende login.datev.de statt sandbox-api.datev.de',
          '✅ OpenID Connect statt OAuth 2.0 Client Credentials',
          '✅ PKCE mit code_challenge und code_verifier',
          '✅ State und Nonce Parameter (min. 20 Zeichen)',
          "✅ Scope muss 'openid' enthalten",
          '✅ enableWindowsSso=true für DATEV SSO',
        ],
      },

      timestamp: new Date().toISOString(),
    });
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

async function testDiscoveryEndpoint(discoveryUrl: string) {
  try {
    const response = await fetch(discoveryUrl);
    const discovery = await response.json();

    return {
      success: response.ok,
      status: response.status,
      data: {
        issuer: discovery.issuer,
        authorization_endpoint: discovery.authorization_endpoint,
        token_endpoint: discovery.token_endpoint,
        userinfo_endpoint: discovery.userinfo_endpoint,
        supported_scopes: discovery.scopes_supported,
        supported_response_types: discovery.response_types_supported,
        code_challenge_methods_supported: discovery.code_challenge_methods_supported,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function parseUrlParameters(url: string) {
  const urlObj = new URL(url);
  const params: Record<string, string> = {};

  urlObj.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}
