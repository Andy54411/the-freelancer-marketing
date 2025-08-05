import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig } from '@/lib/datev-config';
import crypto from 'crypto';

/**
 * DATEV OAuth Initialization Route - Cookie Based
 * Generates authorization URL and redirects to DATEV login
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json(
        {
          error: 'missing_company_id',
          message: 'Company ID ist erforderlich für DATEV-Authentifizierung',
        },
        { status: 400 }
      );
    }

    console.log('[DATEV Cookie Auth] Starting OAuth flow for company:', companyId);

    // Generate PKCE parameters
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    // Create state parameter with company ID and PKCE verifier
    const state = Buffer.from(
      JSON.stringify({
        companyId,
        codeVerifier,
        timestamp: Date.now(),
      })
    ).toString('base64');

    // Get DATEV configuration
    const config = getDatevConfig();

    // Build authorization URL
    const authParams = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri.replace('/callback', '/callback-cookie'), // Use cookie callback
      scope: config.scopes.join(' '),
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'consent', // Force consent screen for testing
    });

    const authUrl = `${config.authUrl}?${authParams.toString()}`;

    console.log('[DATEV Cookie Auth] Generated auth URL:', {
      companyId,
      hasCodeChallenge: !!codeChallenge,
      redirectUri: config.redirectUri.replace('/callback', '/callback-cookie'),
    });

    // Redirect to DATEV authorization server
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[DATEV Cookie Auth] Error generating auth URL:', error);
    return NextResponse.json(
      {
        error: 'auth_url_generation_failed',
        message: 'Fehler beim Generieren der Authentifizierungs-URL',
      },
      { status: 500 }
    );
  }
}
