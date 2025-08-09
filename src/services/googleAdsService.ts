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
   * ✅ Validiert die Google Ads Konfiguration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!process.env.GOOGLE_ADS_CLIENT_ID) {
      errors.push('GOOGLE_ADS_CLIENT_ID is not configured');
    }

    if (!process.env.GOOGLE_ADS_CLIENT_SECRET) {
      errors.push('GOOGLE_ADS_CLIENT_SECRET is not configured');
    }

    if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN) {
      errors.push('GOOGLE_ADS_DEVELOPER_TOKEN is not configured');
    }

    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      errors.push('NEXT_PUBLIC_BASE_URL is not configured');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * ✅ OAuth2 Flow starten - Account-Verknüpfung
   */
  generateAuthUrl(companyId: string, redirectUri: string): string {
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID!;

    if (!clientId) {
      throw new Error('Google Ads Client ID not configured');
    }

    const params = new URLSearchParams({
      client_id: clientId,
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
      const clientId = process.env.GOOGLE_ADS_CLIENT_ID!;
      const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET!;

      if (!clientId || !clientSecret) {
        return {
          success: false,
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Google Ads Client ID or Secret not configured',
            details: { clientId: !!clientId, clientSecret: !!clientSecret },
          },
        };
      }

      const response = await fetch(`${this.OAUTH_URL}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
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
   * 🚀 PHASE 2: Campaign Management - Kampagnen abrufen
   */
  async getCampaigns(
    config: GoogleAdsOAuthConfig,
    customerId: string
  ): Promise<GoogleAdsApiResponse<GoogleAdsCampaignResponse>> {
    try {
      const query = `
        SELECT 
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign.start_date,
          campaign.end_date,
          campaign_budget.amount_micros,
          campaign_budget.delivery_method,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversion_value_micros
        FROM campaign 
        WHERE campaign.status != 'REMOVED'
        ORDER BY campaign.name
      `;

      const response = await this.makeApiRequest(
        `/customers/${customerId}/googleAds:searchStream`,
        'POST',
        config,
        { query }
      );

      if (!response.success) {
        return response;
      }

      const campaigns: GoogleAdsCampaign[] =
        response.data?.results?.map((result: any) => {
          const campaign = result.campaign;
          const metrics = result.metrics || {};
          const budget = result.campaign_budget || {};

          return {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            advertisingChannelType: campaign.advertising_channel_type,
            startDate: campaign.start_date,
            endDate: campaign.end_date,
            budget: {
              id: budget.id || '',
              name: budget.name || '',
              amountMicros: budget.amount_micros || 0,
              deliveryMethod: budget.delivery_method || 'STANDARD',
            },
            biddingStrategy: {
              type: 'MANUAL_CPC', // Default, könnte erweitert werden
            },
            metrics: {
              impressions: metrics.impressions || 0,
              clicks: metrics.clicks || 0,
              cost: metrics.cost_micros || 0,
              conversions: metrics.conversions || 0,
              conversionValue: metrics.conversion_value_micros || 0,
              costPerClick: metrics.clicks > 0 ? metrics.cost_micros / metrics.clicks : 0,
              clickThroughRate:
                metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0,
              conversionRate: metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0,
              returnOnAdSpend:
                metrics.cost_micros > 0 ? metrics.conversion_value_micros / metrics.cost_micros : 0,
              costPerConversion:
                metrics.conversions > 0 ? metrics.cost_micros / metrics.conversions : 0,
            },
          };
        }) || [];

      return {
        success: true,
        data: { campaigns },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'Failed to fetch campaigns',
          details: error,
        },
      };
    }
  }

  /**
   * ✅ PHASE 2: Neue Kampagne erstellen
   */
  async createCampaign(
    config: GoogleAdsOAuthConfig,
    customerId: string,
    campaignData: {
      name: string;
      budgetAmountMicros: number;
      advertisingChannelType: string;
      startDate: string;
      endDate?: string;
      geoTargets?: string[];
      languageTargets?: string[];
    }
  ): Promise<GoogleAdsApiResponse<{ campaignId: string }>> {
    try {
      // Erst Budget erstellen
      const budgetOperation = {
        create: {
          name: `${campaignData.name} Budget`,
          amount_micros: campaignData.budgetAmountMicros,
          delivery_method: 'STANDARD',
        },
      };

      const budgetResponse = await this.makeApiRequest(
        `/customers/${customerId}/campaignBudgets:mutate`,
        'POST',
        config,
        { operations: [budgetOperation] }
      );

      if (!budgetResponse.success) {
        return budgetResponse;
      }

      const budgetResourceName = budgetResponse.data?.results?.[0]?.resourceName;

      // Dann Kampagne erstellen
      const campaignOperation = {
        create: {
          name: campaignData.name,
          advertising_channel_type: campaignData.advertisingChannelType,
          status: 'PAUSED', // Startet pausiert für Sicherheit
          campaign_budget: budgetResourceName,
          start_date: campaignData.startDate,
          end_date: campaignData.endDate,
          bidding_strategy: {
            manual_cpc: {},
          },
        },
      };

      const campaignResponse = await this.makeApiRequest(
        `/customers/${customerId}/campaigns:mutate`,
        'POST',
        config,
        { operations: [campaignOperation] }
      );

      if (!campaignResponse.success) {
        return campaignResponse;
      }

      const campaignId = campaignResponse.data?.results?.[0]?.resourceName?.split('/')?.pop();

      return {
        success: true,
        data: { campaignId },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CAMPAIGN_CREATION_FAILED',
          message: 'Failed to create campaign',
          details: error,
        },
      };
    }
  }

  /**
   * ✅ PHASE 2: Kampagne Status ändern (Pausieren/Aktivieren)
   */
  async updateCampaignStatus(
    config: GoogleAdsOAuthConfig,
    customerId: string,
    campaignId: string,
    status: 'ENABLED' | 'PAUSED'
  ): Promise<GoogleAdsApiResponse<{ success: boolean }>> {
    try {
      const operation = {
        update: {
          resource_name: `customers/${customerId}/campaigns/${campaignId}`,
          status: status,
        },
        update_mask: { paths: ['status'] },
      };

      const response = await this.makeApiRequest(
        `/customers/${customerId}/campaigns:mutate`,
        'POST',
        config,
        { operations: [operation] }
      );

      return {
        success: response.success,
        data: { success: response.success },
        error: response.error,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CAMPAIGN_UPDATE_FAILED',
          message: 'Failed to update campaign status',
          details: error,
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
      const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!;

      if (!developerToken) {
        return {
          success: false,
          error: {
            code: 'MISSING_DEVELOPER_TOKEN',
            message: 'Google Ads Developer Token not configured',
            details: {},
          },
        };
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${config.accessToken}`,
        'developer-token': developerToken,
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
