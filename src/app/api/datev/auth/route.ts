import { NextRequest, NextResponse } from 'next/server';
import {
  generateDatevAuthUrl,
  generateSandboxClientId,
  DATEV_SANDBOX_CONFIG,
} from '@/lib/datev-config';
import { storePKCEData } from '@/lib/pkce-storage';
import { getAuth } from 'firebase-admin/auth';
import { initiateDatevAuthFlow, getOrCreateDatevUser } from '@/services/datev-user-auth-service';

/**
 * DATEV OAuth Initialization Route with Enhanced Authentication
 * Support for both legacy and new auth middleware patterns
 *
 * GET /api/datev/auth - Legacy OAuth flow
 * POST /api/datev/auth - Enhanced OAuth flow (Firebase-integrated or legacy)
 */

/**
 * DATEV OAuth Initialization Route with Sandbox Support (Legacy)
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
            usage: 'Fügen Sie ?company_id=test&sandbox_client=1 hinzu',
            example_url: `/api/datev/auth?company_id=test&sandbox_client=${DATEV_SANDBOX_CONFIG.fullyAuthorizedClient}`,
          },
        },
        { status: 400 }
      );
    }

    // Generate a unique client ID for sandbox (e.g., "455148-2")
    const _clientId = generateSandboxClientId(sandboxClient);

    // Generate the full OAuth URL
    const { authUrl } = generateDatevAuthUrl(companyId);

    // Redirect user to DATEV authorization page
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'oauth_generation_failed',
        message: error.message || 'Fehler beim Generieren der OAuth-URL',
        details: error.stack,
      },
      { status: 500 }
    );
  }
}

/**
 * Handle POST requests for both legacy and new Firebase-integrated OAuth
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if this is a Firebase-integrated request (has Authorization header)
    const authHeader = request.headers.get('Authorization');

    if (authHeader?.startsWith('Bearer ')) {
      // New Firebase-integrated DATEV OAuth Flow

      let firebaseUserId: string;
      try {
        const token = authHeader.substring(7);
        const decodedToken = await getAuth().verifyIdToken(token);
        firebaseUserId = decodedToken.uid;
      } catch {
        return NextResponse.json({ error: 'Invalid Firebase token' }, { status: 401 });
      }

      const { redirectUri } = body;

      // Create or get DATEV user configuration
      const userResult = await getOrCreateDatevUser(firebaseUserId, {
        isActive: true,
        authMethod: 'oauth',
        permissions: ['read', 'write'],
      });

      if (!userResult.success) {
        return NextResponse.json(
          { error: 'Failed to create DATEV user configuration' },
          { status: 500 }
        );
      }

      // Initiate OAuth flow
      const authResult = await initiateDatevAuthFlow(firebaseUserId, redirectUri);

      return NextResponse.json({
        success: true,
        authUrl: authResult.authUrl,
        state: authResult.state,
        datefUserId: userResult.datefUserId,
      });
    } else {
      // Legacy OAuth flow for manual trigger
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
          note: `Sandbox Test mit Client ${sandboxClient}`,
        },
        return_url: returnUrl,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 500 });
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
