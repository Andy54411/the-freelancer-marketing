/**
 * DATEV Token Management Service
 * Manages DATEV OAuth tokens, storage, and refresh logic
 */

interface DatevUserToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token?: string;
  scope: string;
  user_id: string;
  organization_id?: string;
}

interface DatevUserData {
  id: string;
  email: string;
  name: string;
  organization?: {
    id: string;
    name: string;
  };
  created_at: string;
}

const DATEV_TOKEN_STORAGE_KEY = 'datev_user_token';
const DATEV_USER_DATA_STORAGE_KEY = 'datev_user_data';

export class DatevTokenManager {
  /**
   * Store DATEV user token in localStorage with expiration
   */
  static storeUserToken(tokenData: {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    scope: string;
    user: DatevUserData;
  }): void {
    const expiresAt = Date.now() + tokenData.expires_in * 1000;

    const tokenInfo: DatevUserToken = {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      expires_at: expiresAt,
      refresh_token: tokenData.refresh_token,
      scope: tokenData.scope,
      user_id: tokenData.user.id,
      organization_id: tokenData.user.organization?.id,
    };

    localStorage.setItem(DATEV_TOKEN_STORAGE_KEY, JSON.stringify(tokenInfo));
    localStorage.setItem(DATEV_USER_DATA_STORAGE_KEY, JSON.stringify(tokenData.user));

    console.log('DATEV token stored successfully');
  }

  /**
   * Get stored DATEV user token if valid
   */
  static getUserToken(): DatevUserToken | null {
    try {
      const stored = localStorage.getItem(DATEV_TOKEN_STORAGE_KEY);
      if (!stored) return null;

      const tokenInfo: DatevUserToken = JSON.parse(stored);

      // Check if token is expired (with 5-minute buffer)
      if (Date.now() >= tokenInfo.expires_at - 300000) {
        console.log('DATEV token expired, removing from storage');
        this.clearUserToken();
        return null;
      }

      return tokenInfo;
    } catch (error) {
      console.error('Error retrieving DATEV token:', error);
      return null;
    }
  }

  /**
   * Get stored DATEV user data
   */
  static getUserData(): DatevUserData | null {
    try {
      const stored = localStorage.getItem(DATEV_USER_DATA_STORAGE_KEY);
      if (!stored) return null;

      return JSON.parse(stored);
    } catch (error) {
      console.error('Error retrieving DATEV user data:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated with DATEV
   */
  static isUserAuthenticated(): boolean {
    const token = this.getUserToken();
    return token !== null;
  }

  /**
   * Clear stored DATEV token and user data
   */
  static clearUserToken(): void {
    localStorage.removeItem(DATEV_TOKEN_STORAGE_KEY);
    localStorage.removeItem(DATEV_USER_DATA_STORAGE_KEY);
    console.log('DATEV token and user data cleared');
  }

  /**
   * Get authorization header for DATEV API calls
   */
  static getAuthHeader(): string | null {
    const token = this.getUserToken();
    if (!token) return null;

    return `${token.token_type} ${token.access_token}`;
  }

  /**
   * Get current organization ID
   */
  static getCurrentOrganizationId(): string | null {
    const token = this.getUserToken();
    return token?.organization_id || null;
  }

  /**
   * Refresh DATEV token if needed
   */
  static async refreshTokenIfNeeded(): Promise<boolean> {
    const token = this.getUserToken();
    if (!token || !token.refresh_token) return false;

    // Check if token expires in next 10 minutes
    const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;
    if (token.expires_at > tenMinutesFromNow) {
      return true; // Token is still valid
    }

    try {
      const response = await fetch('/api/datev/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: token.refresh_token,
        }),
      });

      if (!response.ok) {
        console.error('Failed to refresh DATEV token');
        this.clearUserToken();
        return false;
      }

      const data = await response.json();

      // Store the new token
      this.storeUserToken({
        access_token: data.access_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        refresh_token: data.refresh_token || token.refresh_token,
        scope: data.scope || token.scope,
        user: this.getUserData()!,
      });

      console.log('DATEV token refreshed successfully');
      return true;
    } catch (error) {
      console.error('Error refreshing DATEV token:', error);
      this.clearUserToken();
      return false;
    }
  }
}
