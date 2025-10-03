/**
 * DATEV Authentication Middleware
 * Verwaltet User Authentication für DATEV API Integration
 * Ähnlich dem finAPI Pattern mit OAuth 2.0 Flow
 */

import { getDatevConfig } from './datev-config';
interface DatevAuthResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: string;
  requiresAuth?: boolean;
}

/**
 * Überprüft ob DATEV Token für User verfügbar und gültig ist
 * @param userId Firebase User UID oder Company ID
 */
export async function validateDatevToken(userId: string): Promise<DatevAuthResult> {
  try {
    // Check if token exists in localStorage (client-side) or database (server-side)
    const token = getStoredDatevToken(userId);

    if (!token) {
      return {
        success: false,
        requiresAuth: true,
        error: 'No DATEV token found - authentication required',
      };
    }

    // Check if token is expired
    if (token.expiresAt && Date.now() >= token.expiresAt) {
      if (token.refreshToken) {
        return await refreshDatevToken(token.refreshToken, userId);
      } else {
        return {
          success: false,
          requiresAuth: true,
          error: 'DATEV token expired and no refresh token available',
        };
      }
    }

    return {
      success: true,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown authentication error',
      requiresAuth: true,
    };
  }
}

/**
 * Startet DATEV OAuth 2.0 Flow für User Authentication
 * @param userId User identifier
 * @param redirectUri Callback URL nach erfolgreicher Authentifizierung
 */
export async function initiateDatevAuthFlow(
  userId: string,
  redirectUri?: string
): Promise<{ authUrl: string; state: string }> {
  // Generate secure state parameter
  const state = generateSecureState(userId);

  // Store state for verification
  storeAuthState(state, userId);

  // Build DATEV OAuth authorization URL
  const config = await getDatevConfig();
  const authUrl = new URL(config.authUrl);

  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri || config.redirectUri);
  authUrl.searchParams.set('scope', config.scopes.join(' '));
  authUrl.searchParams.set('state', state);

  return {
    authUrl: authUrl.toString(),
    state,
  };
}

/**
 * Erneuert abgelaufenen DATEV Access Token
 * @param refreshToken DATEV Refresh Token
 * @param userId User identifier
 */
async function refreshDatevToken(refreshToken: string, userId: string): Promise<DatevAuthResult> {
  try {
    const config = await getDatevConfig();

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Token refresh failed: ${errorData.error_description || response.statusText}`
      );
    }

    const tokenData = await response.json();
    const expiresAt = Date.now() + tokenData.expires_in * 1000;

    // Store new token
    await storeDatevToken(userId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || refreshToken,
      expiresAt,
      tokenType: tokenData.token_type || 'Bearer',
    });

    return {
      success: true,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || refreshToken,
      expiresAt,
    };
  } catch (error: any) {
    return {
      success: false,
      requiresAuth: true,
      error: error.message || 'Token refresh failed',
    };
  }
}

// Helper functions (to be implemented based on storage strategy)
function getStoredDatevToken(userId: string): any {
  // Implementation depends on whether this is client-side (localStorage) or server-side (Firestore)
  return null;
}

async function storeDatevToken(userId: string, tokenData: any): Promise<void> {
  // Store token in appropriate storage (localStorage for client, Firestore for server)
}

function generateSecureState(userId: string): string {
  return Buffer.from(`${userId}_${Date.now()}_${Math.random()}`).toString('base64');
}

function storeAuthState(state: string, userId: string): void {
  // Store state for OAuth flow verification
}
