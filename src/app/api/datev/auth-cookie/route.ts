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

    // Build correct redirect URI for cookie-based callback - DATEV Sandbox Requirement
    // Für Confidential Clients ist nur "http://localhost" erlaubt (Port 80 implizit)
    const baseUrl =
      process.env.NODE_ENV === 'development' ? 'http://localhost' : 'https://taskilo.de';
    const cookieRedirectUri =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost' // DATEV Sandbox Anforderung - Port 80
        : `${baseUrl}/api/datev/callback`;

    // Build authorization URL
    const authParams = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: cookieRedirectUri,
      scope: config.scopes.join(' '),
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'consent', // Force consent screen for testing
    });

    const authUrl = `${config.authUrl}?${authParams.toString()}`;

    // Redirect to DATEV authorization server
    return NextResponse.redirect(authUrl);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'auth_url_generation_failed',
        message: 'Fehler beim Generieren der Authentifizierungs-URL',
      },
      { status: 500 }
    );
  }
}
