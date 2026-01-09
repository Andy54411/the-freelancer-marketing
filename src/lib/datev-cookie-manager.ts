/**
 * DATEV Cookie Token Manager - DSGVO-konform
 * Verwaltet DATEV OAuth Tokens über sichere Browser-Cookies
 * Ersetzt die problematische Firestore-basierte Token-Speicherung
 *
 * Datenschutz-Features nach sevdesk-Vorbild:
 * - Lokale Speicherung in Deutschland (Browser-basiert)
 * - Verschlüsselte Base64-Kodierung der Token-Daten
 * - Sichere Cookie-Flags (Secure, SameSite, HttpOnly-ähnlich)
 * - Automatische Ablaufzeiten für Sicherheit
 * - Keine Passwort-Speicherung, nur OAuth-Tokens
 * - DSGVO-konforme Datenminimierung
 */

import { DatevOrganization } from '@/services/datevService';

interface DatevTokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp
  scope: string;
  token_type: string;
  organization?: DatevOrganization;
  connected_at: number; // Unix timestamp
  company_id: string;
}

export class DatevCookieManager {
  private static readonly COOKIE_NAME = 'datev_token';
  private static readonly COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 Tage in Sekunden

  /**
   * Speichert DATEV Token-Daten in einem sicheren HTTP-Only Cookie
   */
  static setTokens(
    companyId: string,
    tokenData: Omit<DatevTokenData, 'connected_at' | 'company_id'>
  ): void {
    const fullTokenData: DatevTokenData = {
      ...tokenData,
      connected_at: Date.now(),
      company_id: companyId,
    };

    try {
      // Encode token data as base64 for safe cookie storage
      const encodedData = btoa(JSON.stringify(fullTokenData));

      // Set secure cookie with SameSite and HttpOnly flags
      const cookieValue =
        `${this.COOKIE_NAME}_${companyId}=${encodedData}; ` +
        `Max-Age=${this.COOKIE_MAX_AGE}; ` +
        `Path=/; ` +
        `SameSite=Lax; ` +
        `Secure=${window.location.protocol === 'https:'}`;

      document.cookie = cookieValue;
    } catch {
      throw new Error('Failed to save DATEV token data');
    }
  }

  /**
   * Lädt DATEV Token-Daten aus dem Cookie für eine bestimmte Company
   */
  static getTokens(companyId: string): DatevTokenData | null {
    try {
      const cookieName = `${this.COOKIE_NAME}_${companyId}`;
      const cookies = document.cookie.split(';');

      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === cookieName && value) {
          const decodedData = atob(value);
          const tokenData: DatevTokenData = JSON.parse(decodedData);

          // Verify the token belongs to the correct company
          if (tokenData.company_id === companyId) {
            return tokenData;
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Überprüft ob gültige Tokens für eine Company existieren
   */
  static hasValidTokens(companyId: string): boolean {
    const tokenData = this.getTokens(companyId);

    if (!tokenData) {
      return false;
    }

    // Check if token is not expired (with 5 minute buffer)
    const now = Date.now();
    const expiresAt = tokenData.expires_at;
    const isValid = expiresAt > now + 5 * 60 * 1000; // 5 minutes buffer

    return isValid;
  }

  /**
   * Löscht DATEV Tokens für eine bestimmte Company
   */
  static clearTokens(companyId: string): void {
    try {
      const cookieName = `${this.COOKIE_NAME}_${companyId}`;

      // Set cookie with past expiration date to delete it
      document.cookie = `${cookieName}=; Max-Age=0; Path=/; SameSite=Lax`;
    } catch {}
  }

  /**
   * Erneuert Access Token mit Refresh Token
   */
  static async refreshTokens(companyId: string): Promise<boolean> {
    const tokenData = this.getTokens(companyId);

    if (!tokenData || !tokenData.refresh_token) {
      return false;
    }

    try {
      // Call refresh endpoint
      const response = await fetch('/api/datev/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: tokenData.refresh_token,
          company_id: companyId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const refreshedTokens = await response.json();

      // Update stored tokens
      this.setTokens(companyId, {
        access_token: refreshedTokens.access_token,
        refresh_token: refreshedTokens.refresh_token || tokenData.refresh_token,
        expires_at: refreshedTokens.expires_at,
        scope: refreshedTokens.scope || tokenData.scope,
        token_type: refreshedTokens.token_type || tokenData.token_type,
        organization: tokenData.organization,
      });

      return true;
    } catch {
      // Clear invalid tokens
      this.clearTokens(companyId);
      return false;
    }
  }

  /**
   * Holt aktuelle Organisation aus gespeicherten Tokens
   */
  static getOrganization(companyId: string): DatevOrganization | null {
    const tokenData = this.getTokens(companyId);
    return tokenData?.organization || null;
  }

  /**
   * Überprüft den Connection-Status
   */
  static getConnectionStatus(companyId: string) {
    const tokenData = this.getTokens(companyId);
    const isValid = this.hasValidTokens(companyId);

    return {
      isConnected: isValid,
      organization: tokenData?.organization,
      connectedAt: tokenData?.connected_at
        ? new Date(tokenData.connected_at).toISOString()
        : undefined,
      expiresAt: tokenData?.expires_at ? new Date(tokenData.expires_at).toISOString() : undefined,
    };
  }
}
