import { NextRequest, NextResponse } from 'next/server';
import {
  generateDatevAuthUrl,
  generateSandboxClientId,
  DATEV_SANDBOX_CONFIG,
} from '@/lib/datev-config';
import { storePKCEData } from '@/lib/pkce-storage';

/**
 * DATEV OAuth Initialization Route with Sandbox Support
 * Generates authorization URL and redirects user to DATEV login
 *
 * Supports DATEV Sandbox testing with consultant 455148 and clients 1-6
 * Usage: GET /api/datev/auth?company_id=abc123&sandbox_client=1
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const sandboxClient = searchParams.get('sandbox_client') || '1';

    // Validate company ID if provided
    if (!companyId) {
      return NextResponse.json(
        {
          error: 'missing_company_id',
          message: 'Company ID ist erforderlich für DATEV-Authentifizierung',
          sandbox_info: {
            consultant_number: DATEV_SANDBOX_CONFIG.consultantNumber,
            available_clients: DATEV_SANDBOX_CONFIG.clientNumbers,
            fully_authorized_client: DATEV_SANDBOX_CONFIG.fullyAuthorizedClient,
          },
        },
        { status: 400 }
      );
    }

    console.log('Initiating DATEV OAuth flow:', {
      companyId,
      sandboxClient,
      testClientId: generateSandboxClientId(sandboxClient),
    });

    // Generate DATEV authorization URL with PKCE
    const { authUrl, codeVerifier, state, nonce } = generateDatevAuthUrl(companyId);

    console.log('Generated DATEV OAuth parameters:', {
      companyId,
      state,
      nonce,
      authUrl: authUrl.substring(0, 100) + '...',
      codeVerifierLength: codeVerifier.length,
      sandboxClientId: generateSandboxClientId(sandboxClient),
    });

    // Store PKCE data securely using the new storage system
    storePKCEData(state, {
      codeVerifier,
      nonce,
      timestamp: Date.now(),
      companyId,
    });

    console.log('Stored PKCE data for state:', state.substring(0, 20) + '...');

    // Redirect to DATEV authorization server
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('DATEV OAuth initialization error:', error);

    const errorRedirectUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/dashboard/company/setup/datev'
        : 'https://taskilo.de/dashboard/company/setup/datev';

    return NextResponse.redirect(
      `${errorRedirectUrl}?error=init_failed&message=${encodeURIComponent('DATEV-Authentifizierung konnte nicht gestartet werden')}`
    );
  }
}

/**
 * Handle POST requests to manually trigger OAuth with specific parameters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, returnUrl, sandboxClient = '1' } = body;

    if (!companyId) {
      return NextResponse.json(
        {
          error: 'missing_company_id',
          message: 'Company ID ist erforderlich',
          sandbox_help: {
            consultant_number: DATEV_SANDBOX_CONFIG.consultantNumber,
            recommended_client: DATEV_SANDBOX_CONFIG.fullyAuthorizedClient,
            note: 'Client 1 (455148-1) hat volle Rechnungsdatenservice-Berechtigung',
          },
        },
        { status: 400 }
      );
    }

    // Generate DATEV authorization URL
    const { authUrl, codeVerifier, state, nonce } = generateDatevAuthUrl(companyId);

    // Store OAuth data securely
    storePKCEData(state, {
      codeVerifier,
      nonce,
      timestamp: Date.now(),
      companyId,
    });

    return NextResponse.json({
      success: true,
      authUrl,
      state,
      sandbox_info: {
        consultant_number: DATEV_SANDBOX_CONFIG.consultantNumber,
        client_id: generateSandboxClientId(sandboxClient),
        has_full_permissions: sandboxClient === '1',
      },
      message: 'OAuth-URL erfolgreich generiert',
    });
  } catch (error) {
    console.error('DATEV OAuth POST error:', error);

    return NextResponse.json(
      {
        error: 'generation_failed',
        message: 'Fehler beim Generieren der OAuth-URL',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

/**
 * Handle OPTIONS request for CORS
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
