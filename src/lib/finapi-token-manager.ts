/**
 * finAPI Token Management Service
 * Manages user tokens, storage, and refresh logic
 */

interface FinAPIUserToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token?: string;
  user_id: string;
  user_email: string;
}

interface FinAPIUserData {
  id: string;
  email: string;
  isAutoUpdateEnabled: boolean;
  created_at: string;
}

const TOKEN_STORAGE_KEY = 'finapi_user_token';
const USER_DATA_STORAGE_KEY = 'finapi_user_data';

export class FinAPITokenManager {
  /**
   * Store user token in localStorage with expiration
   */
  static storeUserToken(tokenData: {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    user: FinAPIUserData;
  }): void {
    const expiresAt = Date.now() + tokenData.expires_in * 1000;

    const tokenInfo: FinAPIUserToken = {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      expires_at: expiresAt,
      refresh_token: tokenData.refresh_token,
      user_id: tokenData.user.id,
      user_email: tokenData.user.email,
    };

    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenInfo));
    localStorage.setItem(USER_DATA_STORAGE_KEY, JSON.stringify(tokenData.user));

  }

  /**
   * Get stored user token if valid
   */
  static getUserToken(): FinAPIUserToken | null {
    try {
      const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!stored) return null;

      const tokenInfo: FinAPIUserToken = JSON.parse(stored);

      // Check if token is expired (with 5-minute buffer)
      if (Date.now() >= tokenInfo.expires_at - 300000) {

        this.clearUserToken();
        return null;
      }

      return tokenInfo;
    } catch (error) {

      return null;
    }
  }

  /**
   * Get stored user data
   */
  static getUserData(): FinAPIUserData | null {
    try {
      const stored = localStorage.getItem(USER_DATA_STORAGE_KEY);
      if (!stored) return null;

      return JSON.parse(stored);
    } catch (error) {

      return null;
    }
  }

  /**
   * Check if user is authenticated with finAPI
   */
  static isUserAuthenticated(): boolean {
    const token = this.getUserToken();
    return token !== null;
  }

  /**
   * Clear stored token and user data
   */
  static clearUserToken(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_DATA_STORAGE_KEY);

  }

  /**
   * Get authorization header for API calls
   */
  static getAuthHeader(): string | null {
    const token = this.getUserToken();
    if (!token) return null;

    return `${token.token_type} ${token.access_token}`;
  }

  /**
   * Refresh token if needed (for future implementation)
   */
  static async refreshTokenIfNeeded(): Promise<boolean> {
    const token = this.getUserToken();
    if (!token) return false;

    // Check if token expires in next 10 minutes
    const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;
    if (token.expires_at > tenMinutesFromNow) {
      return true; // Token is still valid
    }

    // TODO: Implement token refresh logic

    return false;
  }
}
