import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig, validateSandboxClientPermissions } from '@/lib/datev-config';
import { retrievePKCEData } from '@/lib/pkce-storage';
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import { setDatevTokenCookies } from '@/lib/datev-server-utils';

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

    // Initial redirectUrl - will be updated with actual companyId after state parsing
    let redirectUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/dashboard/company/unknown/datev/setup'
        : 'https://taskilo.de/dashboard/company/unknown/datev/setup';

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

    // Parse state to extract company ID and stored state
    let companyId: string;
    let timestamp: string;
    let randomPart: string;
    try {
      const stateParts = state.split(':');
      if (stateParts.length >= 4 && stateParts[0] === 'company') {
        companyId = stateParts[1];
        timestamp = stateParts[2];
        randomPart = stateParts[3];
      } else {
        throw new Error('Invalid state format');
      }
    } catch (error) {
      console.error('Invalid state parameter:', state);
      return NextResponse.redirect(
        `${redirectUrl}?error=invalid_state&message=${encodeURIComponent('Invalid state parameter format')}`
      );
    }

    // Retrieve codeVerifier and nonce from secure storage using state
    const storedAuthData = retrievePKCEData(state);

    if (!storedAuthData) {
      console.error('No stored auth data found for state:', state);
      return NextResponse.redirect(
        `${redirectUrl}?error=invalid_state&message=${encodeURIComponent('Authentifizierungs-Session nicht gefunden oder abgelaufen')}`
      );
    }

    const codeVerifier = storedAuthData.codeVerifier;
    const nonce = storedAuthData.nonce;
    companyId = storedAuthData.companyId || companyId;

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
      console.error('State parameter expired:', { stateTime, now, age: now - stateTime });
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
        console.log('Sandbox client validation:', clientValidation);

        if (!clientValidation.hasFullPermissions) {
          console.warn(
            `Client ${config.defaultClientId} has limited permissions. Recommended: ${clientValidation.recommendedClient}`
          );
        }
      }

      // Store tokens securely for the company
      await storeTokensForCompany(companyId, tokenData);

      console.log('DATEV token exchange successful for company:', companyId);

      return NextResponse.redirect(`${redirectUrl}?datev_auth=success&company=${companyId}`);
    } catch (tokenError) {
      console.error('Token exchange failed:', tokenError);
      return NextResponse.redirect(
        `${redirectUrl}?error=token_exchange&message=${encodeURIComponent('Failed to exchange authorization code for tokens')}`
      );
    }
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
 * Token Exchange Function with proper PKCE implementation
 * Exchanges authorization code for access token using PKCE as required by DATEV
 */
async function exchangeCodeForTokenPKCE(code: string, codeVerifier: string) {
  const config = getDatevConfig();

  console.log('Exchanging code for tokens with PKCE...', {
    tokenUrl: config.tokenUrl,
    clientId: config.clientId,
    redirectUri: config.redirectUri,
  });

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
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: tokenData,
      });
      throw new Error(
        `Token exchange failed: ${tokenData.error || 'Unknown error'} - ${tokenData.error_description || ''}`
      );
    }

    console.log('Token exchange successful:', {
      access_token: tokenData.access_token ? 'received' : 'missing',
      refresh_token: tokenData.refresh_token ? 'received' : 'missing',
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
    });

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

/**
 * Store DATEV tokens securely in Firestore AND Cookies for the company
 * This is the KEY FIX - we need both Firestore (persistence) and Cookies (session)
 */
async function storeTokensForCompany(companyId: string, tokenData: any) {
  try {
    console.log('🔧 [DATEV Callback] Storing DATEV tokens for company:', companyId);
    console.log('🔧 [DATEV Callback] Token data received:', {
      hasAccessToken: !!tokenData.access_token,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      hasRefreshToken: !!tokenData.refresh_token,
      scope: tokenData.scope,
    });

    // Calculate expiration timestamp
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);
    console.log('🔧 [DATEV Callback] Token will expire at:', expiresAt);

    // 1. Store tokens in Firestore (for persistence across sessions)
    const tokenDocRef = db.collection('companies').doc(companyId).collection('datev').doc('tokens');
    console.log('🔧 [DATEV Callback] Storing at path:', `companies/${companyId}/datev/tokens`);

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
    console.log('✅ [DATEV Callback] Token document created successfully');

    // 2. Store tokens in httpOnly cookies (for current session API calls)
    await setDatevTokenCookies(tokenData);

    console.log('✅ [DATEV Callback] Tokens stored in cookies');

    // 3. Also store connection status in company document (using Admin SDK)
    const companyDocRef = db.collection('companies').doc(companyId);
    const companyUpdateData = {
      datev: {
        connected: true,
        connected_at: FieldValue.serverTimestamp(),
        status: 'active',
      },
    };

    await companyDocRef.set(companyUpdateData, { merge: true });
    console.log('✅ [DATEV Callback] Company document updated with connection status');

    console.log('🎉 [DATEV Callback] DATEV tokens stored successfully for company:', companyId);
  } catch (error) {
    console.error('❌ [DATEV Callback] Failed to store DATEV tokens:', error);
    throw new Error('Failed to store authentication tokens');
  }
}
