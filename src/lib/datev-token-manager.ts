/**
 * DATEV Token Management Service
 * Manages DATEV OAuth tokens, storage, and refresh logic
 * Works both client-side (localStorage) and server-side (cookies)
 */

import { cookies } from 'next/headers';

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

// Helper function to check if we're running on the client
const isClient = typeof window !== 'undefined';

export class DatevTokenManager {
  /**
   * Store DATEV user token in localStorage (client-side only)
   */
  static storeUserToken(tokenData: {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    scope: string;
    user: DatevUserData;
  }): void {
    if (!isClient) {
      console.warn('storeUserToken should only be called on client-side');
      return;
    }

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
   * Get stored DATEV user token if valid (client-side only)
   */
  static getUserToken(): DatevUserToken | null {
    if (!isClient) {
      console.warn(
        'getUserToken should only be called on client-side. Use getServerToken for server APIs.'
      );
      return null;
    }

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
   * Get DATEV token from request cookies (server-side)
   */
  static getServerToken(request: Request): DatevUserToken | null {
    try {
      const cookieHeader = request.headers.get('cookie');
      if (!cookieHeader) return null;

      const cookies = cookieHeader.split(';').reduce(
        (acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = decodeURIComponent(value);
          return acc;
        },
        {} as Record<string, string>
      );

      const tokenData = cookies[DATEV_TOKEN_STORAGE_KEY];
      if (!tokenData) return null;

      const tokenInfo: DatevUserToken = JSON.parse(tokenData);

      // Check if token is expired (with 5-minute buffer)
      if (Date.now() >= tokenInfo.expires_at - 300000) {
        console.log('DATEV server token expired');
        return null;
      }

      return tokenInfo;
    } catch (error) {
      console.error('Error retrieving DATEV server token:', error);
      return null;
    }
  }

  /**
   * Get stored DATEV user data (client-side only)
   */
  static getUserData(): DatevUserData | null {
    if (!isClient) {
      console.warn('getUserData should only be called on client-side');
      return null;
    }

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
   * Clear stored DATEV token and user data (client-side only)
   */
  static clearUserToken(): void {
    if (!isClient) {
      console.warn('clearUserToken should only be called on client-side');
      return;
    }

    localStorage.removeItem(DATEV_TOKEN_STORAGE_KEY);
    localStorage.removeItem(DATEV_USER_DATA_STORAGE_KEY);
    console.log('DATEV token and user data cleared');
  }

  /**
   * Get authorization header for DATEV API calls (client-side only)
   */
  static getAuthHeader(): string | null {
    const token = this.getUserToken();
    if (!token) return null;

    return `${token.token_type} ${token.access_token}`;
  }

  /**
   * Get authorization header for server-side DATEV API calls
   */
  static getServerAuthHeader(request: Request): string | null {
    const token = this.getServerToken(request);
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
    if (!token) {
      console.log('No DATEV token available');
      return false;
    }

    // Check if token expires in next 10 minutes
    const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;
    if (token.expires_at > tenMinutesFromNow) {
      return true; // Token is still valid
    }

    console.log('DATEV token expires soon, attempting refresh...');

    // If no refresh token available, clear everything and require re-auth
    if (!token.refresh_token) {
      console.log('No refresh token available, clearing stored data');
      this.clearUserToken();
      return false;
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
        const errorData = await response.text();
        console.error('Failed to refresh DATEV token:', response.status, errorData);
        this.clearUserToken();
        return false;
      }

      const data = await response.json();

      // Validate response data
      if (!data.access_token) {
        console.error('Invalid refresh response: missing access_token');
        this.clearUserToken();
        return false;
      }

      const userData = this.getUserData();
      if (!userData) {
        console.error('No user data available for token refresh');
        this.clearUserToken();
        return false;
      }

      // Store the new token
      this.storeUserToken({
        access_token: data.access_token,
        token_type: data.token_type || 'Bearer',
        expires_in: data.expires_in || 3600,
        refresh_token: data.refresh_token || token.refresh_token,
        scope: data.scope || token.scope,
        user: userData,
      });

      console.log('DATEV token refreshed successfully');
      return true;
    } catch (error) {
      console.error('Error refreshing DATEV token:', error);
      this.clearUserToken();
      return false;
    }
  }

  /**
   * Force token validation by making a test API call (client-side)
   */
  static async validateToken(): Promise<boolean> {
    const token = this.getUserToken();
    if (!token) return false;

    try {
      const response = await fetch('/api/datev/validate', {
        method: 'GET',
        headers: {
          Authorization: `${token.token_type} ${token.access_token}`,
        },
      });

      if (!response.ok) {
        console.log('Token validation failed, clearing stored token');
        this.clearUserToken();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating DATEV token:', error);
      this.clearUserToken();
      return false;
    }
  }

  /**
   * Server-side token validation
   */
  static async validateServerToken(request: Request): Promise<boolean> {
    const token = this.getServerToken(request);
    if (!token) return false;

    try {
      const response = await fetch('https://api.datev.de/platform/v1/clients', {
        method: 'GET',
        headers: {
          Authorization: `${token.token_type} ${token.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        console.log('DATEV server token validation failed');
        return false;
      }

      return response.ok;
    } catch (error) {
      console.error('Error validating DATEV server token:', error);
      return false;
    }
  }

  /**
   * Server-side refresh token if needed
   */
  static async refreshServerTokenIfNeeded(request: Request): Promise<boolean> {
    const token = this.getServerToken(request);
    if (!token) return false;

    // Check if token expires in next 10 minutes
    const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;
    if (token.expires_at > tenMinutesFromNow) {
      return true; // Token is still valid
    }

    // For server-side, we'll just validate the existing token
    // Full refresh implementation would require more complex cookie handling
    return await this.validateServerToken(request);
  }
}
