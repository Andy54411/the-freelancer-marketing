// ✅ PHASE 1: Google Ads Core Service
// Zentrale API-Kommunikation mit Google Ads API

import {
  GoogleAdsAccount,
  GoogleAdsOAuthConfig,
  GoogleAdsCampaign,
  GoogleAdsMetrics,
  GoogleAdsApiResponse,
  GoogleAdsTokenResponse,
  GoogleAdsCustomerResponse,
  GoogleAdsCampaignResponse,
  GoogleAdsError,
  GoogleAdsConnectionStatus,
  GoogleAdsServiceStatus,
} from '@/types/googleAds';

class GoogleAdsService {
  private readonly API_VERSION = 'v17';
  private readonly BASE_URL = `https://googleads.googleapis.com/${this.API_VERSION}`;
  private readonly OAUTH_URL = 'https://oauth2.googleapis.com';

  // OAuth2 Konfiguration
  private readonly SCOPES = ['https://www.googleapis.com/auth/adwords'];

  /**
   * ✅ OAuth2 Flow starten - Account-Verknüpfung
   */
  generateAuthUrl(companyId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      redirect_uri: redirectUri,
      scope: this.SCOPES.join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      state: companyId, // Company ID für Zuordnung
    });

    return `${this.OAUTH_URL}/auth?${params.toString()}`;
  }

  /**
   * ✅ Authorization Code gegen Access/Refresh Token tauschen
   */
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string
  ): Promise<GoogleAdsApiResponse<GoogleAdsTokenResponse>> {
    try {
      const response = await fetch(`${this.OAUTH_URL}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
          client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: 'TOKEN_EXCHANGE_FAILED',
            message: data.error_description || 'Failed to exchange code for tokens',
            details: data,
          },
        };
      }

      return {
        success: true,
        data: data as GoogleAdsTokenResponse,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error during token exchange',
          details: error,
        },
      };
    }
  }

  /**
   * ✅ Access Token mit Refresh Token erneuern
   */
  async refreshAccessToken(
    refreshToken: string
  ): Promise<GoogleAdsApiResponse<GoogleAdsTokenResponse>> {
    try {
      const response = await fetch(`${this.OAUTH_URL}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
          client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: 'TOKEN_REFRESH_FAILED',
            message: data.error_description || 'Failed to refresh access token',
            details: data,
          },
        };
      }

      return {
        success: true,
        data: {
          access_token: data.access_token,
          refresh_token: refreshToken,
          token_type: data.token_type,
          expires_in: data.expires_in,
          scope: data.scope,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error during token refresh',
          details: error,
        },
      };
    }
  }

  /**
   * ✅ Verfügbare Google Ads Accounts abrufen
   */
  async getCustomers(
    config: GoogleAdsOAuthConfig
  ): Promise<GoogleAdsApiResponse<GoogleAdsCustomerResponse>> {
    try {
      const response = await this.makeApiRequest(
        '/customers:listAccessibleCustomers',
        'GET',
        config
      );

      if (!response.success) {
        return response;
      }

      const customers: GoogleAdsAccount[] =
        response.data?.resourceNames?.map((resourceName: string) => {
          const customerId = resourceName.split('/')[1];
          return {
            id: customerId,
            name: `Customer ${customerId}`,
            currency: 'EUR',
            timeZone: 'Europe/Berlin',
            customerId,
            testAccount: false,
            status: 'ENABLED' as const,
            linked: false,
            accessLevel: 'STANDARD' as const,
          };
        }) || [];

      return {
        success: true,
        data: { customers },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'Failed to fetch customers',
          details: error,
        },
      };
    }
  }

  /**
   * ✅ Connection Status prüfen
   */
  async checkConnectionStatus(config: GoogleAdsOAuthConfig): Promise<GoogleAdsConnectionStatus> {
    try {
      const response = await this.makeApiRequest(
        '/customers:listAccessibleCustomers',
        'GET',
        config
      );

      if (response.success) {
        return {
          status: 'CONNECTED',
          lastSync: new Date(),
          accountsConnected: response.data?.resourceNames?.length || 0,
          quotaUsage: {
            daily: { used: 0, limit: 15000 },
            monthly: { used: 0, limit: 100000 },
          },
        };
      } else {
        return {
          status: 'ERROR',
          error: response.error as GoogleAdsError,
          accountsConnected: 0,
          quotaUsage: {
            daily: { used: 0, limit: 15000 },
            monthly: { used: 0, limit: 100000 },
          },
        };
      }
    } catch (error) {
      return {
        status: 'DISCONNECTED',
        error: {
          type: 'NETWORK_ERROR',
          code: 'CONNECTION_FAILED',
          message: 'Failed to check connection status',
          retryable: true,
        },
        accountsConnected: 0,
        quotaUsage: {
          daily: { used: 0, limit: 15000 },
          monthly: { used: 0, limit: 100000 },
        },
      };
    }
  }

  /**
   * 🔧 Private Helper: API Request durchführen
   */
  private async makeApiRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    config: GoogleAdsOAuthConfig,
    body?: any
  ): Promise<GoogleAdsApiResponse> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${config.accessToken}`,
        'developer-token': config.developerToken,
        'Content-Type': 'application/json',
      };

      if (config.managerCustomerId) {
        headers['login-customer-id'] = config.managerCustomerId;
      }

      const response = await fetch(`${this.BASE_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 && config.refreshToken) {
          const refreshResult = await this.refreshAccessToken(config.refreshToken);
          if (refreshResult.success && refreshResult.data) {
            config.accessToken = refreshResult.data.access_token;
            return this.makeApiRequest(endpoint, method, config, body);
          }
        }

        return {
          success: false,
          error: {
            code: data.error?.code || 'API_ERROR',
            message: data.error?.message || 'API request failed',
            details: data,
          },
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error during API request',
          details: error,
        },
      };
    }
  }
}

// Singleton Export
export const googleAdsService = new GoogleAdsService();
export default googleAdsService;
