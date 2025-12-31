/**
 * DATEV Server Utilities
 * Server-only functions for DATEV token management
 */

import { cookies } from 'next/headers';
import { db } from '@/firebase/server';
import { getDatevConfig } from './datev-config';

/**
 * Generate environment-specific cookie name for DATEV tokens
 */
export function getDatevCookieName(companyId: string): string {
  const environment = process.env.NODE_ENV || 'development';
  return `datev_tokens_${environment}_${companyId}`;
}

// DATEV Sandbox URLs (unterschiedlich von Production!)
const DATEV_API_BASE =
  process.env.NODE_ENV === 'production' ? 'https://api.datev.de' : 'https://sandbox-api.datev.de';
const DATEV_AUTH_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://login.datev.de'
    : 'https://sandbox-login.datev.de';

export interface ServerDatevToken {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_at: number;
  scope: string;
}

/**
 * Server-only function to retrieve a valid DATEV token object from cookies.
 * This function can only be used in Server Components and API Routes
 */
export async function getDatevTokenFromCookies(
  companyId: string
): Promise<ServerDatevToken | null> {
  const cookieStore = await cookies();
  const cookieName = getDatevCookieName(companyId);
  const tokenCookie = cookieStore.get(cookieName);

  if (!tokenCookie?.value) {
    return null;
  }

  try {
    // Decode Base64 encoded token data
    const decodedData = Buffer.from(tokenCookie.value, 'base64').toString('utf-8');
    const rawTokenData = JSON.parse(decodedData);

    // Extract only the needed token structure, ignore additional metadata
    const tokenData: ServerDatevToken = {
      access_token: rawTokenData.access_token,
      refresh_token: rawTokenData.refresh_token,
      token_type: rawTokenData.token_type || 'Bearer',
      expires_at: rawTokenData.expires_at,
      scope: rawTokenData.scope || '',
    };

    // Check if token is expired (with 5-minute buffer)
    if (Date.now() >= tokenData.expires_at - 300000) {
      // Hier könnte man eine Token-Refresh-Logik einbauen, wenn ein Refresh-Token vorhanden ist.
      return null;
    }

    return tokenData;
  } catch (error) {
    return null;
  }
}

/**
 * Server-only function to set DATEV tokens in cookies for a specific company
 */
export async function setDatevTokenCookies(
  tokenData: {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
  },
  companyId: string
): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';

  const cookieName = getDatevCookieName(companyId);
  const expiresAt = Date.now() + (tokenData.expires_in || 3600) * 1000;

  const cookieValue = Buffer.from(
    JSON.stringify({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type,
      expires_at: expiresAt,
      scope: tokenData.scope,
    })
  ).toString('base64');

  // Set a single cookie with the full token object (base64 encoded)
  cookieStore.set(cookieName, cookieValue, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: tokenData.expires_in || 3600,
    path: '/',
  });
}

/**
 * SANDBOX: Exchanges an authorization code for access and refresh tokens from DATEV Sandbox.
 * @param code The authorization code received from DATEV sandbox callback.
 * @returns The token data from DATEV sandbox.
 */
export async function exchangeCodeForTokens(code: string) {
  const clientId = process.env.DATEV_SANDBOX_CLIENT_ID;
  const clientSecret = process.env.DATEV_SANDBOX_CLIENT_SECRET;
  const redirectUri = process.env.DATEV_SANDBOX_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('DATEV Sandbox environment variables are not configured.');
  }

  const tokenUrl = `${DATEV_AUTH_BASE}/oauth/token`;
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(`Failed to exchange DATEV sandbox code for token: ${response.statusText}`);
  }

  const tokenData = await response.json();

  return tokenData;
}

/**
 * SANDBOX: Saves DATEV tokens securely to the user's document in Firestore.
 * @param userId The Firebase user ID.
 * @param tokens The token data from DATEV sandbox.
 */
export async function saveTokensToFirestore(
  userId: string,
  tokens: { access_token: string; refresh_token?: string; expires_in: number }
) {
  if (!db) {
    throw new Error('Datenbank nicht initialisiert');
  }

  const userRef = db.collection('users').doc(userId);
  await userRef.set(
    {
      datevSandbox: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        lastUpdated: new Date(),
        environment: 'sandbox',
      },
    },
    { merge: true }
  );
}

/**
 * Exchanges a refresh token for a new access token from DATEV.
 * @param refreshToken The refresh token.
 * @returns The new token data from DATEV.
 */
export async function refreshDatevAccessToken(refreshToken: string) {
  const { clientId, clientSecret, tokenUrl } = getDatevConfig();

  if (!clientId || !clientSecret) {
    throw new Error('DATEV environment variables are not configured for token refresh.');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: '6111ad8e8cae82d1a805950f2ae4adc4', // FORCE CONSISTENT SANDBOX CLIENT ID
    }),
  });

  const tokenData = await response.json();

  if (!response.ok) {
    throw new Error(
      `Failed to refresh DATEV token: ${tokenData.error_description || 'Unknown error'}`
    );
  }

  return tokenData;
}
