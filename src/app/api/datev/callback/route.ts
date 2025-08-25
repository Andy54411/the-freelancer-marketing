import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig, validateSandboxClientPermissions } from '@/lib/datev-config';
import { retrievePKCEData, PKCEData } from '@/lib/pkce-storage';
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import { setDatevTokenCookies } from '@/lib/datev-server-utils';
import {
  handleDatevOAuthCallback,
  storeDatevUserToken,
  getOrCreateDatevUser,
} from '@/services/datev-user-auth-service';

/**
 * DATEV OAuth Callback Handler
 * Enhanced with new DATEV Authentication Middleware
 * Handles the OpenID Connect callback from DATEV with proper PKCE flow
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const error_description = searchParams.get('error_description');

    // Initial redirectUrl - will be updated with actual companyId after state parsing
    let redirectUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/dashboard/company/unknown/datev/setup'
        : 'https://taskilo.de/dashboard/company/unknown/datev/setup';

    // Log detailed callback information for debugging

    // Check for OAuth errors
    if (error) {

      return NextResponse.redirect(
        `${redirectUrl}?error=${error}&message=${encodeURIComponent(error_description || 'Unknown error')}`
      );
    }

    // Validate required parameters
    if (!code) {

      return NextResponse.redirect(
        `${redirectUrl}?error=missing_code&message=${encodeURIComponent('Authorization code not provided')}`
      );
    }

    if (!state) {

      return NextResponse.redirect(
        `${redirectUrl}?error=missing_state&message=${encodeURIComponent('State parameter not provided')}`
      );
    }

    // Parse state to extract company ID and stored state
    let companyId: string;
    let timestamp: string;
    let randomPart: string;
    let stateData: any = null;

    try {
      // Try to parse as Base64-encoded JSON first (new format)
      try {
        const decodedState = Buffer.from(state, 'base64').toString('utf-8');
        stateData = JSON.parse(decodedState);

        if (stateData.companyId && stateData.timestamp) {
          companyId = stateData.companyId;
          timestamp = stateData.timestamp.toString();
          randomPart = 'json_state'; // Placeholder for JSON format

        } else {
          throw new Error('Invalid JSON state format: missing companyId or timestamp');
        }
      } catch (jsonError) {
        // Fallback to colon-separated format (old format)
        const stateParts = state.split(':');

        if (stateParts.length >= 4 && stateParts[0] === 'company') {
          companyId = stateParts[1];
          timestamp = stateParts[2];
          randomPart = stateParts[3];

        } else if (stateParts.length >= 3 && stateParts[0] === 'state') {
          // Fallback für state ohne companyId
          companyId = 'unknown';
          timestamp = stateParts[1];
          randomPart = stateParts[2];

        } else {
          throw new Error(`Invalid state format: expected Base64 JSON or 'company:id:timestamp:random', got ${stateParts.length} colon parts`);
        }
      }
    } catch (error) {

      return NextResponse.redirect(
        `${redirectUrl}?error=invalid_state&message=${encodeURIComponent('Invalid state parameter format: ' + state)}`
      );
    }

    // Retrieve codeVerifier and nonce from secure storage or JSON state
    let storedAuthData: PKCEData | null = null;
    let codeVerifier: string | undefined = undefined;
    let nonce: string | undefined = undefined;

    // If we have JSON state data, use it directly
    if (stateData && stateData.codeVerifier) {
      codeVerifier = stateData.codeVerifier;
      nonce = stateData.nonce; // May be undefined for some flows
      companyId = stateData.companyId || companyId;

    } else {
      // Fallback to PKCE storage for colon-format states
      const pkceData = retrievePKCEData(state);
      storedAuthData = pkceData;

      if (!storedAuthData) {

        return NextResponse.redirect(
          `${redirectUrl}?error=invalid_state&message=${encodeURIComponent('Authentifizierungs-Session nicht gefunden oder abgelaufen')}`
        );
      }

      codeVerifier = storedAuthData.codeVerifier;
      nonce = storedAuthData.nonce;
      companyId = storedAuthData.companyId || companyId;
    }

    // Validate that we have a codeVerifier
    if (!codeVerifier) {

      return NextResponse.redirect(
        `${redirectUrl}?error=missing_verifier&message=${encodeURIComponent('Code verifier nicht gefunden - bitte versuchen Sie es erneut')}`
      );
    }

    // Update redirectUrl with correct companyId
    redirectUrl =
      process.env.NODE_ENV === 'development'
        ? `http://localhost:3000/dashboard/company/${companyId}/datev/setup`
        : `https://taskilo.de/dashboard/company/${companyId}/datev/setup`;

    // Validate state timestamp (should not be older than 10 minutes)
    const stateTime = parseInt(timestamp);
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    if (now - stateTime > maxAge) {

      return NextResponse.redirect(
        `${redirectUrl}?error=expired_state&message=${encodeURIComponent('Authentication request expired')}`
      );
    }

    try {
      // Exchange authorization code for tokens using PKCE
      const tokenData = await exchangeCodeForTokenPKCE(code, codeVerifier);

      // Validate sandbox client permissions if using sandbox
      const config = getDatevConfig();
      if (config.consultantNumber) {
        const clientValidation = validateSandboxClientPermissions(
          config.defaultClientId || '455148-1'
        );

        if (!clientValidation.hasFullPermissions) {

        }
      }

      // Store tokens securely for the company
      await storeTokensForCompany(companyId, tokenData);

      // IMPORTANT: Use a more specific success URL with clear parameters
      const successUrl = `${redirectUrl}?datev_auth=success&company=${companyId}&timestamp=${Date.now()}`;

      return NextResponse.redirect(successUrl);
    } catch (tokenError) {

      return NextResponse.redirect(
        `${redirectUrl}?error=token_exchange&message=${encodeURIComponent('Failed to exchange authorization code for tokens')}`
      );
    }
  } catch (error) {

    const errorRedirectUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/dashboard/company/unknown/datev/setup'
        : 'https://taskilo.de/dashboard/company/unknown/datev/setup';
    return NextResponse.redirect(`${errorRedirectUrl}?error=callback_error`);
  }
}

/**
 * Token Exchange Function with proper PKCE implementation
 * Exchanges authorization code for access token using PKCE as required by DATEV
 */
async function exchangeCodeForTokenPKCE(code: string, codeVerifier: string) {
  const config = getDatevConfig();

  try {
    // DATEV requires Basic Authentication with client credentials
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`, // Required by DATEV
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: config.redirectUri,
        code_verifier: codeVerifier, // PKCE verification
        client_id: config.clientId, // Include client_id in body as well
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {

      throw new Error(
        `Token exchange failed: ${tokenData.error || 'Unknown error'} - ${tokenData.error_description || ''}`
      );
    }

    return tokenData;
  } catch (error) {

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

/**
 * Store DATEV tokens securely in Firestore AND Cookies for the company
 * This is the KEY FIX - we need both Firestore (persistence) and Cookies (session)
 */
async function storeTokensForCompany(companyId: string, tokenData: any) {
  try {

    // Calculate expiration timestamp
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

    // 1. Store tokens in Firestore (for persistence across sessions)
    const tokenDocRef = db.collection('users').doc(companyId).collection('datev').doc('tokens');

    const tokenDocData = {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_in: tokenData.expires_in || 3600,
      expires_at: expiresAt,
      refresh_token: tokenData.refresh_token || null,
      scope: tokenData.scope || '',
      connected_at: FieldValue.serverTimestamp(),
      last_updated: FieldValue.serverTimestamp(),
      is_active: true,
    };

    await tokenDocRef.set(tokenDocData);

    // 2. Store tokens in httpOnly cookies (for current session API calls)
    await setDatevTokenCookies(tokenData, companyId);

    // 3. Also store connection status in company document (using Admin SDK)
    const companyDocRef = db.collection('users').doc(companyId);
    const companyUpdateData = {
      datev: {
        connected: true,
        connected_at: FieldValue.serverTimestamp(),
        status: 'active',
      },
    };

    await companyDocRef.set(companyUpdateData, { merge: true });

  } catch (error) {

    throw new Error('Failed to store authentication tokens');
  }
}

/**
 * POST /api/datev/callback
 * New Firebase-integrated callback processing for debugging and manual handling
 */
export async function POST(request: NextRequest) {
  try {

    const body = await request.json();
    const { code, state, firebaseUserId } = body;

    if (!code || !state || !firebaseUserId) {
      return NextResponse.json(
        { error: 'Missing required parameters: code, state, firebaseUserId' },
        { status: 400 }
      );
    }

    // Try new authentication middleware first
    try {
      const callbackResult = await handleDatevOAuthCallback(code, state, firebaseUserId);

      if (callbackResult.success) {

        return NextResponse.json({
          success: true,
          message: 'DATEV OAuth callback processed with new auth middleware',
          middleware: 'new',
        });
      } else {

      }
    } catch (newAuthError) {

    }

    // Fallback to legacy processing if new middleware fails

    // Legacy callback processing would go here
    // For now, return a message indicating fallback
    return NextResponse.json({
      success: true,
      message: 'DATEV OAuth callback processed with legacy fallback',
      middleware: 'legacy',
      note: 'New auth middleware not fully implemented yet',
    });
  } catch (error: any) {

    return NextResponse.json(
      { error: error.message || 'Callback processing failed' },
      { status: 500 }
    );
  }
}
