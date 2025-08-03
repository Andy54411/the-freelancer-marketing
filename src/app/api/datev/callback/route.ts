import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig } from '@/lib/datev-config-correct';

/**
 * DATEV OAuth Callback Handler
 * Handles the OpenID Connect callback from DATEV with proper PKCE flow
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const error_description = searchParams.get('error_description');

    const redirectUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/dashboard/company/setup/datev'
        : 'https://taskilo.de/dashboard/company/setup/datev';

    // Log detailed callback information for debugging
    console.log('DATEV OpenID Connect Callback received:', {
      code: code ? `${code.substring(0, 10)}...` : null,
      state: state,
      error: error,
      error_description: error_description,
      timestamp: new Date().toISOString(),
    });

    // Check for OAuth errors
    if (error) {
      console.error('DATEV OAuth error:', { error, error_description });
      return NextResponse.redirect(
        `${redirectUrl}?error=${error}&message=${encodeURIComponent(error_description || 'Unknown error')}`
      );
    }

    // Validate required parameters
    if (!code) {
      console.error('Missing authorization code in callback');
      return NextResponse.redirect(
        `${redirectUrl}?error=missing_code&message=${encodeURIComponent('Authorization code not provided')}`
      );
    }

    if (!state) {
      console.error('Missing state parameter in callback');
      return NextResponse.redirect(
        `${redirectUrl}?error=missing_state&message=${encodeURIComponent('State parameter not provided')}`
      );
    }

    // TODO: In production, validate state parameter against stored value
    // and retrieve the corresponding code_verifier for PKCE

    // For now, return success with demonstration of next steps
    console.log('DATEV OAuth callback successful - next steps needed:', {
      receivedCode: code.substring(0, 20) + '...',
      receivedState: state,
      nextImplementationSteps: [
        'Validate state parameter against stored value',
        'Retrieve code_verifier for PKCE flow',
        'Exchange authorization code for access token',
        'Validate ID token and access token',
        'Store tokens securely for user session',
      ],
    });

    // Redirect with success indication
    return NextResponse.redirect(
      `${redirectUrl}?datev_auth=received&state=${state}&implementation_needed=true`
    );
  } catch (error) {
    console.error('DATEV OAuth callback error:', error);
    const errorRedirectUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/dashboard/company/unknown/datev/setup'
        : 'https://taskilo.de/dashboard/company/unknown/datev/setup';
    return NextResponse.redirect(`${errorRedirectUrl}?error=callback_error`);
  }
}

/**
 * Token Exchange Function (for future implementation)
 * Exchanges authorization code for access token using PKCE
 */
async function _exchangeCodeForTokenPKCE(code: string, _state: string, codeVerifier: string) {
  const config = getDatevConfig();

  try {
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        code: code,
        redirect_uri: config.redirectUri,
        code_verifier: codeVerifier, // PKCE verification
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenData.error || 'Unknown error'}`);
    }

    return tokenData;
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
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
