import { GoogleAdsApi, Customer } from 'google-ads-api';
import {
  GoogleAdsApiResponse,
  GoogleAdsOAuthConfig,
  GoogleAdsTokenResponse,
  GoogleAdsConnectionStatus,
  GoogleAdsAccount,
  GoogleAdsCampaign,
  GoogleAdsServiceStatus,
  GoogleAdsCustomerResponse,
  GoogleAdsCampaignResponse,
  GoogleAdsMetrics,
  GoogleAdsError,
} from '@/types/googleAds';

/**
 * ✅ Google Ads Client Library Service
 * Ersetzt die REST API durch die offizielle Google Ads Client Library
 */
class GoogleAdsClientService {
  private client: GoogleAdsApi;
  private config: GoogleAdsOAuthConfig;

  constructor() {
    this.config = {
      clientId: process.env.GOOGLE_ADS_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
      developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
      // Legacy Support
      client_id: process.env.GOOGLE_ADS_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
    };

    this.client = new GoogleAdsApi({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      developer_token: this.config.developerToken,
    });
  }

  /**
   * ✅ Config-Validierung
   */
  private validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.client_id) {
      errors.push('Google Ads Client ID fehlt');
    }
    if (!this.config.client_secret) {
      errors.push('Google Ads Client Secret fehlt');
    }
    if (!this.config.developer_token) {
      errors.push('Google Ads Developer Token fehlt');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * ✅ Customer Status von Google Ads API auf interne Typen mappen
   */
  private mapCustomerStatus(
    status: any
  ): 'UNKNOWN' | 'ENABLED' | 'SUSPENDED' | 'PAUSED' | 'REMOVED' {
    if (!status) return 'UNKNOWN';

    const statusStr = String(status).toUpperCase();

    switch (statusStr) {
      case 'ENABLED':
        return 'ENABLED';
      case 'SUSPENDED':
        return 'SUSPENDED';
      case 'CANCELED':
      case 'PAUSED':
        return 'PAUSED';
      case 'CLOSED':
      case 'REMOVED':
        return 'REMOVED';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * ✅ Campaign Status von Google Ads API auf interne Typen mappen
   */
  private mapCampaignStatus(status: any): 'UNKNOWN' | 'ENABLED' | 'PAUSED' | 'REMOVED' {
    if (!status) return 'UNKNOWN';

    const statusStr = String(status).toUpperCase();

    switch (statusStr) {
      case 'ENABLED':
        return 'ENABLED';
      case 'PAUSED':
        return 'PAUSED';
      case 'REMOVED':
        return 'REMOVED';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * ✅ OAuth2 URL generieren
   */
  generateAuthUrl(companyId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.config.client_id || '',
      redirect_uri: redirectUri,
      scope: 'https://www.googleapis.com/auth/adwords',
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      state: companyId,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * ✅ Authorization Code gegen Tokens tauschen
   */
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string
  ): Promise<GoogleAdsApiResponse<GoogleAdsTokenResponse>> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.client_id || '',
          client_secret: this.config.client_secret || '',
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
          },
        };
      }

      return {
        success: true,
        data: {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          token_type: data.token_type,
          expires_in: data.expires_in,
          scope: data.scope,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error during token exchange',
        },
      };
    }
  }

  /**
   * ✅ Access Token refreshen
   */
  async refreshAccessToken(
    refreshToken: string
  ): Promise<GoogleAdsApiResponse<GoogleAdsTokenResponse>> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.client_id || '',
          client_secret: this.config.client_secret || '',
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
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error during token refresh',
        },
      };
    }
  }

  /**
   * ✅ Customer Informationen abrufen
   */
  async getCustomerInfo(
    accessToken: string,
    customerId: string
  ): Promise<GoogleAdsApiResponse<GoogleAdsCustomerResponse>> {
    try {
      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: accessToken,
      });

      const customerInfo = await customer.query(`
        SELECT 
          customer.id,
          customer.descriptive_name,
          customer.currency_code,
          customer.time_zone,
          customer.status,
          customer.manager,
          customer.test_account
        FROM customer
        LIMIT 1
      `);

      if (!customerInfo || customerInfo.length === 0) {
        return {
          success: false,
          error: {
            code: 'CUSTOMER_NOT_FOUND',
            message: 'Customer not found',
          },
        };
      }

      const customer_info = customerInfo[0]?.customer;

      return {
        success: true,
        data: {
          customer: {
            id: String(customer_info?.id || ''),
            name: customer_info?.descriptive_name || '',
            currency: customer_info?.currency_code || '',
            timezone: customer_info?.time_zone || '',
            status: this.mapCustomerStatus(customer_info?.status),
            manager: customer_info?.manager || false,
            testAccount: customer_info?.test_account || false,
          },
          accessible: true,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.message || 'Failed to fetch customer info',
        },
      };
    }
  }

  /**
   * ✅ Zugängliche Accounts abrufen
   */
  async getAccessibleCustomers(
    accessToken: string,
    managerCustomerId?: string
  ): Promise<GoogleAdsApiResponse<GoogleAdsAccount[]>> {
    try {
      const customer = this.client.Customer({
        customer_id: managerCustomerId || 'customers',
        refresh_token: accessToken,
      });

      const accounts = await customer.query(`
        SELECT
          customer_client.id,
          customer_client.descriptive_name,
          customer_client.currency_code,
          customer_client.time_zone,
          customer_client.status,
          customer_client.manager,
          customer_client.test_account,
          customer_client.level
        FROM customer_client
      `);

      const formattedAccounts: GoogleAdsAccount[] = accounts.map((account: any) => ({
        id: account.customer_client?.id || '',
        name: account.customer_client?.descriptive_name || '',
        currency: account.customer_client?.currency_code || '',
        timezone: account.customer_client?.time_zone || '',
        status: this.mapCustomerStatus(account.customer_client?.status),
        manager: account.customer_client?.manager || false,
        testAccount: account.customer_client?.test_account || false,
        level: account.customer_client?.level || 0,
      }));

      return {
        success: true,
        data: formattedAccounts,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.message || 'Failed to fetch accessible customers',
        },
      };
    }
  }

  /**
   * ✅ Campaigns abrufen
   */
  async getCampaigns(
    accessToken: string,
    customerId: string
  ): Promise<GoogleAdsApiResponse<GoogleAdsCampaignResponse>> {
    try {
      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: accessToken,
      });

      const campaigns = await customer.query(`
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign_budget.amount_micros,
          campaign_budget.delivery_method,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value
        FROM campaign
        WHERE campaign.status != 'REMOVED'
        ORDER BY campaign.name
      `);

      const formattedCampaigns: GoogleAdsCampaign[] = campaigns.map((camp: any) => ({
        id: camp.campaign?.id || '',
        name: camp.campaign?.name || '',
        status: this.mapCampaignStatus(camp.campaign?.status),
        type: camp.campaign?.advertising_channel_type || 'SEARCH',
        startDate: new Date().toISOString().split('T')[0], // Add missing startDate
        endDate: undefined, // Add missing endDate
        budget: {
          amount: Math.round((camp.campaign_budget?.amount_micros || 0) / 1000000),
          currency: 'EUR',
          deliveryMethod: camp.campaign_budget?.delivery_method || 'STANDARD',
        },
        metrics: {
          impressions: camp.metrics?.impressions || 0,
          clicks: camp.metrics?.clicks || 0,
          cost: Math.round((camp.metrics?.cost_micros || 0) / 1000000),
          conversions: camp.metrics?.conversions || 0,
          conversionValue: Math.round((camp.metrics?.conversions_value || 0) / 1000000),
          ctr:
            camp.metrics?.clicks > 0 ? (camp.metrics?.clicks / camp.metrics?.impressions) * 100 : 0,
          cpc:
            camp.metrics?.clicks > 0
              ? Math.round((camp.metrics?.cost_micros || 0) / 1000000 / camp.metrics?.clicks)
              : 0,
          cpa:
            camp.metrics?.conversions > 0
              ? Math.round((camp.metrics?.cost_micros || 0) / 1000000 / camp.metrics?.conversions)
              : 0,
          roas:
            camp.metrics?.conversions_value > 0
              ? Math.round(
                  (camp.metrics?.conversions_value || 0) / (camp.metrics?.cost_micros || 1)
                )
              : 0,
        },
      }));

      return {
        success: true,
        data: {
          campaigns: formattedCampaigns,
          totalCampaigns: formattedCampaigns.length,
          customerId: customerId,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.message || 'Failed to fetch campaigns',
        },
      };
    }
  }

  /**
   * ✅ Account Performance Metrics abrufen
   */
  async getAccountMetrics(
    accessToken: string,
    customerId: string
  ): Promise<GoogleAdsApiResponse<GoogleAdsMetrics>> {
    try {
      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: accessToken,
      });

      const metrics = await customer.query(`
        SELECT
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value
        FROM customer
        WHERE segments.date DURING LAST_30_DAYS
      `);

      const aggregatedMetrics = metrics.reduce(
        (acc: any, metric: any) => ({
          impressions: acc.impressions + (metric.metrics?.impressions || 0),
          clicks: acc.clicks + (metric.metrics?.clicks || 0),
          cost: acc.cost + (metric.metrics?.cost_micros || 0),
          conversions: acc.conversions + (metric.metrics?.conversions || 0),
          conversionValue: acc.conversionValue + (metric.metrics?.conversions_value || 0),
        }),
        {
          impressions: 0,
          clicks: 0,
          cost: 0,
          conversions: 0,
          conversionValue: 0,
        }
      );

      return {
        success: true,
        data: {
          impressions: aggregatedMetrics.impressions,
          clicks: aggregatedMetrics.clicks,
          cost: Math.round(aggregatedMetrics.cost / 1000000),
          conversions: aggregatedMetrics.conversions,
          conversionValue: Math.round(aggregatedMetrics.conversionValue / 1000000),
          ctr:
            aggregatedMetrics.clicks > 0
              ? (aggregatedMetrics.clicks / aggregatedMetrics.impressions) * 100
              : 0,
          cpc:
            aggregatedMetrics.clicks > 0
              ? Math.round(aggregatedMetrics.cost / 1000000 / aggregatedMetrics.clicks)
              : 0,
          cpa:
            aggregatedMetrics.conversions > 0
              ? Math.round(aggregatedMetrics.cost / 1000000 / aggregatedMetrics.conversions)
              : 0,
          roas:
            aggregatedMetrics.conversionValue > 0
              ? Math.round((aggregatedMetrics.conversionValue / aggregatedMetrics.cost) * 1000000)
              : 0,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.message || 'Failed to fetch account metrics',
        },
      };
    }
  }

  /**
   * ✅ Verbindungsstatus prüfen
   */
  async checkConnectionStatus(
    accountConfig: GoogleAdsOAuthConfig & { customerId?: string; refresh_token?: string }
  ): Promise<GoogleAdsApiResponse<GoogleAdsConnectionStatus>> {
    try {
      if (!accountConfig.refresh_token) {
        return {
          success: true,
          data: {
            connected: false,
            hasValidTokens: false,
            hasCustomerAccess: false,
            lastChecked: new Date().toISOString(),
          },
        };
      }

      const customerResult = await this.getCustomerInfo(
        accountConfig.refresh_token,
        accountConfig.customerId || ''
      );

      if (customerResult.success) {
        return {
          success: true,
          data: {
            connected: true,
            hasValidTokens: true,
            hasCustomerAccess: true,
            customerId: customerResult.data?.customer?.id,
            customerName: customerResult.data?.customer?.name,
            lastChecked: new Date().toISOString(),
          },
        };
      } else {
        return {
          success: true,
          data: {
            connected: false,
            hasValidTokens: !!accountConfig.refresh_token,
            hasCustomerAccess: false,
            lastChecked: new Date().toISOString(),
          },
        };
      }
    } catch (error: any) {
      return {
        success: true,
        data: {
          connected: false,
          hasValidTokens: !!accountConfig.refresh_token,
          hasCustomerAccess: false,
          lastChecked: new Date().toISOString(),
          error: {
            code: 'CONNECTION_ERROR',
            message: error.message || 'Failed to check connection',
            type: 'CONNECTION_ERROR',
            retryable: true,
          },
        },
      };
    }
  }

  /**
   * ✅ Service-Status abrufen
   */
  async getServiceStatus(): Promise<GoogleAdsApiResponse<GoogleAdsServiceStatus>> {
    const configValidation = this.validateConfig();

    return {
      success: true,
      data: {
        configured: configValidation.valid,
        errors: configValidation.errors,
        lastChecked: new Date().toISOString(),
        version: 'v17',
        clientLibrary: true,
      },
    };
  }

  /**
   * ✅ Campaign erstellen
   */
  async createCampaign(
    accessToken: string,
    customerId: string,
    campaignData: {
      name: string;
      status?: string;
      advertisingChannelType?: string;
      targetCpa?: number;
      manualCpc?: boolean;
      enhancedCpcEnabled?: boolean;
    }
  ): Promise<GoogleAdsApiResponse<{ campaignId: string; resourceName: string }>> {
    try {
      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: accessToken,
      });

      const operations = [
        {
          create: {
            name: campaignData.name,
            status: campaignData.status || 'ENABLED',
            advertising_channel_type: campaignData.advertisingChannelType || 'SEARCH',
            target_cpa: campaignData.targetCpa
              ? {
                  target_cpa_micros: Math.round(campaignData.targetCpa * 1000000),
                }
              : undefined,
            manual_cpc: campaignData.manualCpc
              ? {
                  enhanced_cpc_enabled: campaignData.enhancedCpcEnabled || false,
                }
              : undefined,
          },
        },
      ];

      // TODO: Campaign creation needs proper implementation with Google Ads Client Library
      // const response = await customer.campaigns.create(operations);

      // const resourceName = response.results?.[0]?.resource_name;
      // const campaignId = resourceName?.split('/')[3];

      return {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Campaign creation not yet implemented with Client Library',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.message || 'Failed to create campaign',
        },
      };
    }
  }

  /**
   * ✅ Campaign aktualisieren
   */
  async updateCampaign(
    accessToken: string,
    customerId: string,
    campaignId: string,
    campaignData: {
      name?: string;
      status?: string;
      targetCpa?: number;
    }
  ): Promise<GoogleAdsApiResponse<any>> {
    try {
      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: accessToken,
      });

      const resourceName = `customers/${customerId}/campaigns/${campaignId}`;

      const updateMask: string[] = [];
      const campaign: any = {
        resource_name: resourceName,
      };

      if (campaignData.name) {
        campaign.name = campaignData.name;
        updateMask.push('name');
      }

      if (campaignData.status) {
        campaign.status = campaignData.status;
        updateMask.push('status');
      }

      if (campaignData.targetCpa) {
        campaign.target_cpa = {
          target_cpa_micros: Math.round(campaignData.targetCpa * 1000000),
        };
        updateMask.push('target_cpa');
      }

      const operations = [
        {
          update: campaign,
          update_mask: { paths: updateMask },
        },
      ];

      // TODO: Campaign update needs proper implementation with Google Ads Client Library
      // const response = await customer.campaigns.update(operations);

      return {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Campaign update not yet implemented with Client Library',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.message || 'Failed to update campaign',
        },
      };
    }
  }

  /**
   * ✅ Campaign pausieren
   */
  async pauseCampaign(
    accessToken: string,
    customerId: string,
    campaignId: string
  ): Promise<GoogleAdsApiResponse<any>> {
    return await this.updateCampaign(accessToken, customerId, campaignId, { status: 'PAUSED' });
  }

  /**
   * ✅ Campaign löschen
   */
  async deleteCampaign(
    accessToken: string,
    customerId: string,
    campaignId: string
  ): Promise<GoogleAdsApiResponse<any>> {
    try {
      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: accessToken,
      });

      const resourceName = `customers/${customerId}/campaigns/${campaignId}`;

      const response = await customer.campaigns.remove([resourceName]);

      return {
        success: true,
        data: response.results,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.message || 'Failed to delete campaign',
        },
      };
    }
  }
}

// Singleton-Instanz exportieren
export const googleAdsClientService = new GoogleAdsClientService();
