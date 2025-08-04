/**
 * DATEV Server Utilities
 * Server-only functions for DATEV token management
 */

import { cookies } from 'next/headers';
import { db } from '@/firebase/server';

// DATEV Sandbox URLs (unterschiedlich von Production!)
const DATEV_API_BASE =
  process.env.NODE_ENV === 'production' ? 'https://api.datev.de' : 'https://sandbox-api.datev.de';
const DATEV_AUTH_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://login.datev.de'
    : 'https://sandbox-login.datev.de';

/**
 * Server-only function to retrieve DATEV access token from cookies
 * This function can only be used in Server Components and API Routes
 */
export async function getDatevTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();

  // Try sandbox token first, then production token
  const sandboxToken = cookieStore.get('datev_sandbox_access_token');
  const prodToken = cookieStore.get('datev_access_token');

  return sandboxToken?.value || prodToken?.value || null;
}

/**
 * Server-only function to set DATEV tokens in cookies
 */
export async function setDatevTokenCookies(
  accessToken: string,
  refreshToken?: string,
  expiresIn: number = 3600
): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';
  const isSandbox = process.env.DATEV_SANDBOX_CLIENT_ID && process.env.DATEV_SANDBOX_CLIENT_SECRET;

  const cookieName = isSandbox ? 'datev_sandbox_access_token' : 'datev_access_token';
  const refreshCookieName = isSandbox ? 'datev_sandbox_refresh_token' : 'datev_refresh_token';

  // Set access token cookie
  cookieStore.set(cookieName, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: expiresIn,
    path: '/',
  });

  // Set refresh token cookie if available
  if (refreshToken) {
    cookieStore.set(refreshCookieName, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60, // 90 days
      path: '/',
    });
  }
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

  console.log('🔄 DATEV Sandbox Token Exchange:', {
    tokenUrl,
    clientId,
    redirectUri,
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
    console.error('❌ DATEV Sandbox Token Exchange Error:', errorBody);
    throw new Error(`Failed to exchange DATEV sandbox code for token: ${response.statusText}`);
  }

  const tokenData = await response.json();
  console.log('✅ DATEV Sandbox Token received:', {
    expires_in: tokenData.expires_in,
    token_type: tokenData.token_type,
  });

  return tokenData;
}

/**
 * SANDBOX: Fetches organizations from the DATEV Sandbox API using a valid access token.
 * @param accessToken The DATEV sandbox access token.
 * @returns A list of DATEV organizations from sandbox.
 */
export async function fetchDatevOrganizations(accessToken: string) {
  const orgUrl = `${DATEV_API_BASE}/platform/v1/clients`;

  console.log('🔄 Fetching DATEV Sandbox organizations from:', orgUrl);

  const response = await fetch(orgUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) {
    console.error('❌ DATEV Sandbox: 401 Unauthorized - Token expired or invalid');
    throw new Error('DATEV sandbox access token is invalid or expired.');
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Failed to fetch DATEV sandbox organizations:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(`Failed to fetch DATEV sandbox organizations: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('✅ DATEV Sandbox organizations fetched:', data);
  return data;
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

  console.log('✅ DATEV Sandbox tokens saved to Firestore for user:', userId);
}
