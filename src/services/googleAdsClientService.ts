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
      clientId: process.env.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '',
      developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
      // Legacy Support
      client_id: process.env.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '',
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
  ): 'UNKNOWN' | 'ENABLED' | 'SUSPENDED' | 'PAUSED' | 'REMOVED' | 'CANCELED' {
    if (!status) return 'UNKNOWN';

    const statusStr = String(status).toUpperCase();

    switch (statusStr) {
      case 'ENABLED':
        return 'ENABLED';
      case 'SUSPENDED':
        return 'SUSPENDED';
      case 'CANCELED':
        return 'CANCELED';
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
   * ✅ OAuth2 URL generieren - ERWEITERTE SCOPES FÜR WHITE-LABEL
   */
  generateAuthUrl(companyId: string, redirectUri: string): string {
    // 🎯 VOLLSTÄNDIGE GOOGLE ADS SCOPES für White-Label Platform
    const scopes = [
      'https://www.googleapis.com/auth/adwords', // Full Google Ads access
      'https://www.googleapis.com/auth/content', // Google Merchant Center access
      'https://www.googleapis.com/auth/userinfo.email', // User email (für Account-Info)
      'https://www.googleapis.com/auth/userinfo.profile', // User profile (für Account-Info)
    ].join(' ');

    const params = new URLSearchParams({
      client_id: this.config.client_id || '',
      redirect_uri: redirectUri,
      scope: scopes,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      state: companyId,
      include_granted_scopes: 'true', // Incremental authorization
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
   * ✅ Zugängliche Accounts abrufen (echte Accounts zuerst!)
   */
  async getAccessibleCustomers(
    refreshToken: string,
    managerCustomerId?: string
  ): Promise<GoogleAdsApiResponse<GoogleAdsAccount[]>> {
    // 🛑 Check for Developer Token first
    if (!this.config.developer_token) {
      console.warn('Skipping getAccessibleCustomers: No Developer Token configured.');
      return {
        success: false,
        error: {
          code: 'NO_DEVELOPER_TOKEN',
          message: 'Developer Token is missing. Cannot fetch accessible customers.',
        },
      };
    }

    try {
      // STRATEGIE 1: Client Library listAccessibleCustomers - für echte Accounts
      try {
        // Nutze die offizielle listAccessibleCustomers Methode der Client Library
        const accessibleCustomersResponse = await this.client.listAccessibleCustomers(refreshToken);

        if (
          accessibleCustomersResponse &&
          accessibleCustomersResponse.resource_names &&
          accessibleCustomersResponse.resource_names.length > 0
        ) {
          // Konvertiere resource names zu customer IDs und hole Details
          const customerAccounts: GoogleAdsAccount[] = [];

          for (const resourceName of accessibleCustomersResponse.resource_names) {
            // Resource name format: "customers/1234567890"
            const customerId = resourceName.split('/')[1];

            if (customerId && customerId !== '0') {
              try {
                // Hole Details für jeden Customer
                const customer = this.client.Customer({
                  customer_id: customerId,
                  refresh_token: refreshToken,
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

                if (customerInfo && customerInfo.length > 0) {
                  const info = customerInfo[0];
                  customerAccounts.push({
                    id: String(info.customer?.id || customerId),
                    name: info.customer?.descriptive_name || `Account ${customerId}`,
                    currency: info.customer?.currency_code || 'EUR',
                    timezone: info.customer?.time_zone || 'Europe/Berlin',
                    status: this.mapCustomerStatus(info.customer?.status) || 'ENABLED',
                    manager: info.customer?.manager || false,
                    testAccount: info.customer?.test_account || false,
                    level: 0,
                  });
                }
              } catch (customerError) {
                // Füge Account trotzdem hinzu, auch ohne Details
                customerAccounts.push({
                  id: customerId,
                  name: `Account ${customerId}`,
                  currency: 'EUR',
                  timezone: 'Europe/Berlin',
                  status: 'ENABLED',
                  manager: false,
                  testAccount: false,
                  level: 0,
                });
              }
            }
          }

          if (customerAccounts.length > 0) {
            return {
              success: true,
              data: customerAccounts,
            };
          }
          
          return {
            success: false,
            error: {
              code: 'NO_ACCOUNTS_FOUND',
              message: 'No Google Ads accounts found',
            },
          };
        }
      } catch (clientLibraryError: any) {
        return {
          success: false,
          error: {
            code: 'CLIENT_LIBRARY_ERROR',
            message: clientLibraryError.message || 'Failed to fetch accessible customers',
            details: {
              originalError: clientLibraryError.message,
              stack: clientLibraryError.stack,
            },
          },
        };
      }
      
      return {
        success: false,
        error: {
          code: 'NO_RESPONSE',
          message: 'No response from Google Ads API',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'API_ERROR',
          message: error.message || 'Failed to fetch accessible customers',
          details: {
            originalError: error.message,
            stack: error.stack,
            response: error.response,
          },
        },
      };
    }
  }

  /**
   * ✅ Gültigen Access Token bekommen (mit automatischem Refresh)
   */
  private async getValidAccessToken(refreshToken: string): Promise<string> {
    try {
      // Prüfe ob wir schon einen gültigen Access Token haben
      const storedConfigResponse = await fetch(
        'https://taskilo.de/api/google-ads/firestore-debug?companyId=0Rj5vGkBjeXrzZKBr4cFfV0jRuw1'
      );
      if (storedConfigResponse.ok) {
        const storedData = await storedConfigResponse.json();
        if (storedData.success && storedData.data?.accountConfig?.accessToken) {
          const tokenExpiry = new Date(storedData.data.accountConfig.tokenExpiry._seconds * 1000);
          const now = new Date();

          // Wenn Token noch 5 Minuten gültig ist, verwende es
          if (tokenExpiry.getTime() - now.getTime() > 5 * 60 * 1000) {
            return storedData.data.accountConfig.accessToken;
          }
        }
      }

      const refreshResult = await this.refreshAccessToken(refreshToken);
      if (refreshResult.success && refreshResult.data) {
        return refreshResult.data.access_token;
      }
      throw new Error('Failed to refresh access token');
    } catch (error: any) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * ✅ Campaigns abrufen (Client Library)
   */
  async getCampaigns(
    refreshToken: string,
    customerId: string
  ): Promise<GoogleAdsApiResponse<GoogleAdsCampaignResponse>> {
    try {
      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
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
        advertisingChannelType: camp.campaign?.advertising_channel_type || 'SEARCH',
        biddingStrategy: camp.campaign?.bidding_strategy_type || 'MANUAL_CPC',
        geoTargets: [],
        languageTargets: [],
        deviceTargets: [],
        startDate: new Date().toISOString().split('T')[0],
        endDate: undefined,
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
   * ✅ Neue Kampagne erstellen (Client Library)
   */
  async createCampaign(
    refreshToken: string,
    customerId: string,
    campaignData: {
      name: string;
      budgetAmountMicros: number;
      advertisingChannelType: string;
      biddingStrategyType: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<GoogleAdsApiResponse<{ campaignId: string }>> {
    try {
      // Validiere Customer ID Format
      if (
        !customerId ||
        customerId === 'auto-detect' ||
        customerId === 'oauth-connected' ||
        customerId === 'pending_selection' ||
        customerId.startsWith('oauth-')
      ) {
        throw new Error(
          'Invalid customer ID provided. A valid Google Ads Customer ID is required to run ads.'
        );
      }

      // 🔒 SICHERHEITS-CHECK: Manager Account Verknüpfung prüfen
      const MANAGER_ID = '655-923-8498';
      const linkCheck = await this.isLinkedToManager(refreshToken, customerId, MANAGER_ID);

      if (!linkCheck.canVerify) {
        // Kann nicht verifiziert werden (Test Token + Production Account)
        console.warn(`⚠️ Cannot verify manager link: ${linkCheck.reason}`);
        // Fahre fort mit Warnung - User muss manuell verifizieren
      } else if (!linkCheck.linked) {
        throw new Error(
          `Account not linked to Taskilo Manager Account (${MANAGER_ID}). Please link your account to enable ad creation.`
        );
      }

      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
      });

      // Test Customer Access zuerst

      try {
        const testQuery = await customer.query(`
          SELECT customer.id, customer.descriptive_name
          FROM customer
          LIMIT 1
        `);
      } catch (accessError: any) {
        throw new Error(`Customer access failed: ${accessError.message}`);
      }

      // 1. Erstelle Campaign Budget

      let budgetResourceName: string;

      try {
        const budgetResult = await customer.campaignBudgets.create([
          {
            name: `Budget für ${campaignData.name}`,
            amount_micros: Number(campaignData.budgetAmountMicros),
            delivery_method: 'STANDARD',
            explicitly_shared: false,
          },
        ]);

        if (!budgetResult.results[0].resource_name) {
          throw new Error('Failed to retrieve budget resource name');
        }
        budgetResourceName = budgetResult.results[0].resource_name;
      } catch (budgetError: any) {
        throw new Error(
          `Budget creation failed: ${budgetError.message || budgetError.details || 'Unknown budget error'}`
        );
      }

      // 2. Erstelle Campaign

      // Standard-Datum: heute
      const today = new Date();
      const defaultStartDate = today.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD

      try {
        const campaignResult = await customer.campaigns.create([
          {
            name: campaignData.name,
            advertising_channel_type: campaignData.advertisingChannelType as any,
            status: 'PAUSED', // Start mit PAUSED für Review
            campaign_budget: budgetResourceName,
            bidding_strategy_type: campaignData.biddingStrategyType as any,
            start_date: campaignData.startDate?.replace(/-/g, '') || defaultStartDate, // YYYYMMDD Format
            end_date: campaignData.endDate?.replace(/-/g, '') || undefined,
            network_settings: {
              target_google_search: true,
              target_search_network: true,
              target_content_network: false,
              target_partner_search_network: false,
            },
          },
        ]);

        if (!campaignResult.results[0].resource_name) {
          throw new Error('Failed to retrieve campaign resource name');
        }
        const campaignResourceName = campaignResult.results[0].resource_name;
        const campaignId = campaignResourceName.split('/')[3]; // Extract ID from resource name

        return {
          success: true,
          data: { campaignId },
        };
      } catch (campaignError: any) {
        throw new Error(
          `Campaign creation failed: ${campaignError.message || 'Unknown campaign error'}`
        );
      }
    } catch (error: any) {
      // Detaillierte Fehleranalyse
      let errorMessage = 'Failed to create campaign';
      let errorCode = 'CAMPAIGN_CREATION_ERROR';

      if (error.details) {
        errorMessage = error.details;
      }

      if (error.message) {
        errorMessage = error.message;
      }

      if (error.code) {
        errorCode = error.code;
      }

      if (error.status) {
      }

      // Log vollständiges Error-Objekt für Debugging

      return {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          details: {
            originalMessage: error.message || error.toString(),
            errorObject: error,
          },
        },
      };
    }
  }

  /**
   * ✅ Comprehensive Campaign mit Ad Groups, Keywords und Ads erstellen
   */
  async createComprehensiveCampaign(
    refreshToken: string,
    customerId: string,
    campaignData: {
      name: string;
      budgetAmountMicros: number;
      advertisingChannelType: string;
      biddingStrategyType: string;
      startDate?: string;
      endDate?: string;
      adGroups: Array<{
        name: string;
        cpcBidMicros: number;
        keywords: Array<{
          text: string;
          matchType: string;
        }>;
        ads: Array<{
          headlines: string[];
          descriptions: string[];
          finalUrls: string[];
        }>;
      }>;
      targetingOptions?: {
        locations?: string[];
        languages?: string[];
        demographics?: {
          ages?: string[];
          genders?: string[];
        };
      };
      customerAcquisition?: {
        enabled: boolean;
        optimizationMode?: 'BID_HIGHER' | 'ONLY_NEW';
        value?: number;
      };
    }
  ): Promise<GoogleAdsApiResponse<{ campaignId: string; adGroupIds: string[] }>> {
    try {
      // Validiere Customer ID Format
      if (
        !customerId ||
        customerId === 'auto-detect' ||
        customerId === 'oauth-connected' ||
        customerId === 'pending_selection' ||
        customerId.startsWith('oauth-')
      ) {
        throw new Error(
          'Invalid customer ID provided. A valid Google Ads Customer ID is required to run ads.'
        );
      }

      // 🔒 SICHERHEITS-CHECK: Manager Account Verknüpfung prüfen
      const MANAGER_ID = '655-923-8498';
      const linkCheck = await this.isLinkedToManager(refreshToken, customerId, MANAGER_ID);

      if (!linkCheck.canVerify) {
        // Kann nicht verifiziert werden (Test Token + Production Account)
        console.warn(`⚠️ Cannot verify manager link: ${linkCheck.reason}`);
        // Fahre fort mit Warnung - User muss manuell verifizieren
      } else if (!linkCheck.linked) {
        throw new Error(
          `Account not linked to Taskilo Manager Account (${MANAGER_ID}). Please link your account to enable ad creation.`
        );
      }

      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
      });

      // Test Customer Access zuerst

      try {
        const testQuery = await customer.query(`
          SELECT customer.id, customer.descriptive_name
          FROM customer
          LIMIT 1
        `);
      } catch (accessError: any) {
        throw new Error(`Customer access failed: ${accessError.message}`);
      }

      // 1. Erstelle Campaign Budget

      let budgetResourceName: string;

      try {
        const budgetResult = await customer.campaignBudgets.create([
          {
            name: `Budget für ${campaignData.name}`,
            amount_micros: Number(campaignData.budgetAmountMicros),
            delivery_method: 'STANDARD',
            explicitly_shared: false,
          },
        ]);

        if (!budgetResult.results[0].resource_name) {
          throw new Error('Failed to retrieve budget resource name');
        }
        budgetResourceName = budgetResult.results[0].resource_name;
      } catch (budgetError: any) {
        throw new Error(
          `Budget creation failed: ${budgetError.message || budgetError.details || 'Unknown budget error'}`
        );
      }

      // 2. Erstelle Campaign

      // Standard-Datum: heute
      const today = new Date();
      const defaultStartDate = today.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD

      let campaignResourceName: string;
      let campaignId: string;

      try {
        const campaignResult = await customer.campaigns.create([
          {
            name: campaignData.name,
            advertising_channel_type: campaignData.advertisingChannelType as any,
            status: 'PAUSED', // Start mit PAUSED für Review
            campaign_budget: budgetResourceName,
            bidding_strategy_type: campaignData.biddingStrategyType as any,
            start_date: campaignData.startDate?.replace(/-/g, '') || defaultStartDate, // YYYYMMDD Format
            end_date: campaignData.endDate?.replace(/-/g, '') || undefined,
            network_settings: {
              target_google_search: true,
              target_search_network: true,
              target_content_network: false,
              target_partner_search_network: false,
            },
            // Customer Acquisition Settings
            ...(campaignData.customerAcquisition?.enabled ? {
               optimization_goal_setting: {
                 optimization_goal_types: ['CUSTOMER_ACQUISITION']
               }
            } : {}),
          } as any,
        ]);

        if (!campaignResult.results[0].resource_name) {
          throw new Error('Failed to retrieve campaign resource name');
        }
        campaignResourceName = campaignResult.results[0].resource_name;
        campaignId = campaignResourceName.split('/')[3]; // Extract ID from resource name
      } catch (campaignError: any) {
        throw new Error(
          `Campaign creation failed: ${campaignError.message || 'Unknown campaign error'}`
        );
      }

      // 3. Erstelle Ad Groups mit Keywords und Ads

      const adGroupIds: string[] = [];

      for (let i = 0; i < campaignData.adGroups.length; i++) {
        const adGroupData = campaignData.adGroups[i];

        try {
          // Erstelle Ad Group
          const adGroupResult = await customer.adGroups.create([
            {
              name: adGroupData.name,
              campaign: campaignResourceName,
              status: 'ENABLED',
              type: 'SEARCH_STANDARD',
              cpc_bid_micros: adGroupData.cpcBidMicros,
            },
          ]);

          const adGroupResourceName = adGroupResult.results[0].resource_name;
          if (!adGroupResourceName) {
            throw new Error('Failed to retrieve ad group resource name');
          }
          const adGroupId = adGroupResourceName.split('/')[5]; // Extract ID from resource name
          adGroupIds.push(adGroupId);

          // Erstelle Keywords für diese Ad Group
          if (adGroupData.keywords && adGroupData.keywords.length > 0) {
            const keywordOperations = adGroupData.keywords.map(keyword => ({
              ad_group: adGroupResourceName,
              status: 'ENABLED' as any,
              type: 'KEYWORD' as any,
              keyword: {
                text: keyword.text,
                match_type: keyword.matchType.toUpperCase() as any,
              },
            }));

            try {
              const keywordResult = await customer.adGroupCriteria.create(keywordOperations);
            } catch (keywordError: any) {}
          }

          // Erstelle Ads für diese Ad Group
          if (adGroupData.ads && adGroupData.ads.length > 0) {
            for (const adData of adGroupData.ads) {
              try {
                // Validiere Ad-Daten
                if (!adData.headlines || adData.headlines.length === 0) {
                  continue;
                }

                if (!adData.descriptions || adData.descriptions.length === 0) {
                  continue;
                }

                if (!adData.finalUrls || adData.finalUrls.length === 0) {
                  continue;
                }

                // Filter leere Headlines und Descriptions
                const validHeadlines = adData.headlines.filter(h => h && h.trim().length > 0);
                const validDescriptions = adData.descriptions.filter(d => d && d.trim().length > 0);

                if (validHeadlines.length < 3) {
                  continue;
                }

                if (validDescriptions.length < 2) {
                  continue;
                }

                // Log the exact data being sent to Google Ads API
                const adPayload = {
                  ad_group: adGroupResourceName,
                  status: 'ENABLED' as any,
                  ad: {
                    type: 'RESPONSIVE_SEARCH_AD' as any,
                    responsive_search_ad: {
                      headlines: validHeadlines.slice(0, 15).map(headline => ({
                        text: headline.substring(0, 30), // Max 30 characters per headline
                      })),
                      descriptions: validDescriptions.slice(0, 4).map(description => ({
                        text: description.substring(0, 90), // Max 90 characters per description
                      })),
                    },
                    final_urls: adData.finalUrls,
                  },
                };

                const adResult = await customer.adGroupAds.create([adPayload]);
              } catch (adError: any) {
                // Continue mit anderen Ads
              }
            }
          }
        } catch (adGroupError: any) {
          // Continue mit anderen Ad Groups
        }
      }

      // 4. Füge Targeting hinzu (optional)
      if (campaignData.targetingOptions) {
        // TODO: Implement targeting options
        // - Locations
        // - Languages
        // - Demographics
        // Dies würde weitere campaignCriteria und adGroupCriteria operations benötigen
      }

      return {
        success: true,
        data: {
          campaignId,
          adGroupIds,
        },
      };
    } catch (error: any) {
      // Detaillierte Fehleranalyse
      let errorMessage = 'Failed to create comprehensive campaign';
      let errorCode = 'COMPREHENSIVE_CAMPAIGN_CREATION_ERROR';

      // Google Ads API Fehler-Details extrahieren
      if (error.failures && error.failures.length > 0) {
        const firstFailure = error.failures[0];

        errorMessage = firstFailure.message || firstFailure.error_code?.message || errorMessage;
        errorCode = firstFailure.error_code?.error_code || errorCode;
      }

      if (error.details) {
        errorMessage = error.details;
      }

      if (error.message) {
        errorMessage = error.message;
      }

      if (error.code) {
        errorCode = error.code;
      }

      if (error.status) {
      }

      // Log vollständiges Error-Objekt für Debugging

      return {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          details: {
            originalMessage: error.message || error.toString(),
            errorObject: error,
          },
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
   * ✅ Campaign aktualisieren
   */
  async updateCampaign(
    refreshToken: string,
    customerId: string,
    campaignId: string,
    campaignData: {
      name?: string;
      status?: string;
    }
  ): Promise<GoogleAdsApiResponse<any>> {
    try {
      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
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

      const operations = [
        {
          update: campaign,
          update_mask: { paths: updateMask },
        },
      ];

      // TODO: Correct implementation needed for Google Ads Client Library update
      // For now, return a success response indicating the method needs implementation
      return {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Campaign update not yet fully implemented with Client Library',
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
   * ✅ Prüfen ob Account mit Manager Account verknüpft ist
   * @returns { linked: boolean, canVerify: boolean, reason?: string }
   */
  async isLinkedToManager(
    refreshToken: string,
    customerId: string,
    managerId: string
  ): Promise<{ linked: boolean; canVerify: boolean; reason?: string }> {
    // 🛑 BYPASS if no developer token (Dev Mode / Misconfiguration)
    if (!this.config.developer_token) {
      console.warn(
        '⚠️ Skipping Manager Link Check: No Developer Token configured. Allowing connection for testing.'
      );
      return { linked: false, canVerify: false, reason: 'NO_DEVELOPER_TOKEN' };
    }

    try {
      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
      });

      // 1. Check if it's a Test Account
      // If it is a test account, we bypass the manager link check because
      // test accounts cannot be linked to production manager accounts easily
      // and we want to allow testing.
      try {
        console.log(`[ManagerCheck] Checking if account ${customerId} is a test account...`);
        const customerInfo = await customer.query(`
          SELECT customer.id, customer.test_account, customer.descriptive_name, customer.status
          FROM customer
          LIMIT 1
        `);

        console.log(`[ManagerCheck] Account info for ${customerId}:`, JSON.stringify(customerInfo, null, 2));

        if (customerInfo && customerInfo.length > 0) {
          const isTestAccount = customerInfo[0].customer?.test_account;
          if (isTestAccount) {
            console.log(
              `[ManagerCheck] Account ${customerId} is a TEST ACCOUNT. Bypassing manager link check.`
            );
            return { linked: true, canVerify: true, reason: 'TEST_ACCOUNT' };
          } else {
             console.log(`[ManagerCheck] Account ${customerId} reports test_account=false.`);
          }
        }
      } catch (infoError: any) {
        // If we get the "Test Access Only" error here, it means it's a Production Account
        // and we are using a Test Token. So we definitely can't access it programmatically.
        // In this case, we need MANUAL verification of the manager link.
        if (
          infoError.message?.includes('approved for use with test accounts') ||
          infoError.errors?.[0]?.message?.includes('approved for use with test accounts')
        ) {
          console.warn(
            `[ManagerCheck] ⚠️ Test Developer Token cannot access Production Account ${customerId}.`
          );
          console.warn(
            `[ManagerCheck] ⚠️ Manager link check SKIPPED - manual verification required.`
          );
          // WICHTIG: Wir können die Verknüpfung NICHT prüfen, also geben wir das zurück
          return { linked: false, canVerify: false, reason: 'TEST_TOKEN_PRODUCTION_ACCOUNT' };
        }
        // Other errors, ignore and proceed to link check
        console.warn(`[ManagerCheck] Could not verify test account status: ${infoError.message}`);
      }

      // 2. Check Manager Link for Production Accounts
      const query = `
        SELECT
          customer_manager_link.manager_customer,
          customer_manager_link.status
        FROM customer_manager_link
        WHERE customer_manager_link.status = 'ACTIVE'
      `;

      const result = await customer.query(query);

      const targetManagerResource = `customers/${managerId.replace(/-/g, '')}`;

      console.log(
        `[ManagerCheck] Checking link for customer ${customerId} against manager ${targetManagerResource}`
      );
      // console.log(`[ManagerCheck] Found links:`, JSON.stringify(result, null, 2));

      const isLinked = result.some(
        (row: any) => row.customer_manager_link?.manager_customer === targetManagerResource
      );

      console.log(`[ManagerCheck] Is Linked: ${isLinked}`);

      return { linked: isLinked, canVerify: true };
    } catch (error: any) {
      // If error is "Test Access Only", return cannot verify
      if (
        error.message?.includes('approved for use with test accounts') ||
        error.errors?.[0]?.message?.includes('approved for use with test accounts')
      ) {
        console.warn(`[ManagerCheck] Failed to check link for ${customerId}: Test Access Only error.`);
        return { linked: false, canVerify: false, reason: 'TEST_TOKEN_ERROR' };
      }
      
      console.warn('Failed to check manager link:', error);
      return { linked: false, canVerify: false, reason: 'API_ERROR' };
    }
  }

  /**
   * Reaktiviert einen bestehenden CustomerClientLink vom Manager aus
   * Wird verwendet wenn eine Einladung CANCELED wurde und eine neue benötigt wird
   * Strategie: Link auf CANCELED setzen, dann löschen, dann neu erstellen
   */
  async reactivateManagerLink(
    customerId: string,
    refreshToken: string
  ): Promise<GoogleAdsApiResponse<any>> {
    try {
      const MANAGER_ID = '5788229684';
      const clientIdClean = customerId.replace(/-/g, '');

      // Customer-Objekt für den Manager erstellen
      const customer = this.client.Customer({
        customer_id: MANAGER_ID,
        refresh_token: refreshToken,
        login_customer_id: MANAGER_ID,
      });

      // Zuerst den bestehenden CustomerClientLink finden
      const query = `
        SELECT 
          customer_client_link.resource_name,
          customer_client_link.client_customer,
          customer_client_link.status
        FROM customer_client_link
        WHERE customer_client_link.client_customer = 'customers/${clientIdClean}'
      `;

      const linkResults = await customer.query(query);
      
      if (!linkResults || linkResults.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_EXISTING_LINK',
            message: 'Kein bestehender Link gefunden',
            details: null,
          },
        };
      }

      const existingLink = linkResults[0].customer_client_link;
      const resourceName = existingLink?.resource_name;
      const currentStatus = existingLink?.status;

      // Wenn bereits PENDING oder ACTIVE, nichts zu tun
      if (currentStatus === 4 || currentStatus === 2) {
        return {
          success: true,
          data: { 
            message: currentStatus === 2 ? 'Verknuepfung ist bereits aktiv' : 'Einladung ist bereits ausstehend',
            status: currentStatus,
          },
        };
      }

      // Wenn Status CANCELED (6), versuchen wir verschiedene Strategien
      // um eine neue Einladung zu senden
      try {
        // Strategie 1: Direkt auf PENDING setzen
        const updateResponse = await customer.customerClientLinks.update([
          {
            resource_name: resourceName,
            status: 4, // PENDING = 4
          },
        ]);

        return {
          success: true,
          data: { 
            message: 'Einladung wurde reaktiviert. Bitte klicken Sie auf "Einladung annehmen".',
            response: updateResponse,
          },
        };
      } catch (updateError: any) {
        // Strategie 2: Erst auf INACTIVE, dann auf PENDING
        try {
          // Setze auf INACTIVE
          await customer.customerClientLinks.update([
            {
              resource_name: resourceName,
              status: 3, // INACTIVE = 3
            },
          ]);
          
          // Dann auf PENDING für neue Einladung
          const pendingResponse = await customer.customerClientLinks.update([
            {
              resource_name: resourceName,
              status: 4, // PENDING = 4
            },
          ]);

          return {
            success: true,
            data: { 
              message: 'Neue Einladung wurde gesendet.',
              response: pendingResponse,
            },
          };
        } catch (secondError: any) {
          return {
            success: false,
            error: {
              code: 'REACTIVATE_FAILED',
              message: `Konnte Link nicht reaktivieren. Bitte entfernen Sie die Verknüpfung manuell in Google Ads unter Einstellungen > Kontozugriff.`,
              details: { updateError: updateError.message, secondError: secondError.message },
            },
          };
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'REACTIVATE_FAILED',
          message: error.message || 'Reaktivierung fehlgeschlagen',
          details: error.errors || error,
        },
      };
    }
  }

  /**
   * Manager sendet Einladung an Client-Account
   * Verwendet die google-ads-api Library (gRPC) direkt
   * Die REST API unterstützt customerClientLinks:mutate NICHT (501 UNIMPLEMENTED)
   * 
   * WORKAROUND: Die Library hat einen Bug - sie sendet `operations` (plural),
   * aber die API erwartet `operation` (singular) für CustomerClientLink.
   * Wir verwenden den onMutationStart Hook um den Request zu korrigieren.
   */
  async sendManagerInvitationFromManager(
    customerId: string,
    userRefreshToken?: string
  ): Promise<GoogleAdsApiResponse<any>> {
    const MANAGER_ID = '5788229684'; // Taskilo Manager Account (578-822-9684)
    const clientIdClean = customerId.replace(/-/g, '');
    
    // Verwende den User-Token wenn vorhanden, sonst Fallback auf System-Token
    const refreshToken = userRefreshToken || process.env.GOOGLE_ADS_REFRESH_TOKEN;

    if (!refreshToken) {
      return {
        success: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Kein Refresh Token verfügbar',
          details: null,
        },
      };
    }

    try {
      // Customer-Objekt für den Manager-Account erstellen mit Hook um Request zu fixen
      // Der Hook transformiert `operations` (Array) zu `operation` (einzelnes Objekt)
      const customer = this.client.Customer(
        {
          customer_id: MANAGER_ID,
          refresh_token: refreshToken,
          login_customer_id: MANAGER_ID,
        },
        {
          onMutationStart: async (args: { mutation: Record<string, unknown>; editOptions: (options: Record<string, unknown>) => void }) => {
            // Die Library sendet { operations: [...] }, aber die API erwartet { operation: {...} }
            // Wir müssen den Request transformieren
            const mutation = args.mutation as { operations?: unknown[] };
            if (mutation.operations && Array.isArray(mutation.operations)) {
              const firstOp = mutation.operations[0];
              args.editOptions({
                operation: firstOp,
              });
              // Loesche das falsche operations-Feld
              delete mutation.operations;
            }
          },
        } as Parameters<typeof this.client.Customer>[1]
      );

      const response = await customer.customerClientLinks.create([
        {
          client_customer: `customers/${clientIdClean}`,
          status: 4, // ManagerLinkStatus: UNSPECIFIED=0, UNKNOWN=1, ACTIVE=2, INACTIVE=3, PENDING=4
        },
      ]);

      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      const errorDetails = JSON.stringify(error.errors || error);
      
      const isTestTokenError = errorMessage.includes('approved for use with test accounts');
      const isAlreadyExists = errorMessage.includes('ALREADY_EXISTS') || 
                              errorMessage.includes('DUPLICATE') ||
                              errorMessage.includes('already linked');
      const isAlreadyInvited = errorDetails.includes('ALREADY_INVITED_BY_THIS_MANAGER') ||
                               errorMessage.includes('ALREADY_INVITED_BY_THIS_MANAGER');
      const isInvalidCustomer = errorMessage.includes('INVALID_CUSTOMER_ID') ||
                                errorMessage.includes('Customer not found');
      const isAccountsNotCompatible = errorDetails.includes('ACCOUNTS_NOT_COMPATIBLE_FOR_LINKING') ||
                                      errorMessage.includes('incompatible account types');

      // Wenn bereits eingeladen, versuchen wir den Link zu reaktivieren
      if (isAlreadyInvited || isAlreadyExists) {
        // Versuche den bestehenden Link zu reaktivieren
        const reactivateResult = await this.reactivateManagerLink(customerId, refreshToken);
        if (reactivateResult.success) {
          return reactivateResult;
        }
        // Fallback: Melde als Erfolg, User soll annehmen
        return {
          success: true,
          data: { 
            message: 'Einladung existiert bereits. Bitte klicken Sie auf "Einladung annehmen" um die Verknuepfung zu bestaetigen.',
            alreadyInvited: true,
          },
        };
      }

      if (isAccountsNotCompatible) {
        return {
          success: false,
          error: {
            code: 'ACCOUNTS_NOT_COMPATIBLE',
            message: 'Das ausgewählte Google Ads Konto kann nicht verknüpft werden. Manager-Konten können nicht unter andere Manager-Konten verknüpft werden. Bitte wählen Sie ein normales Werbekonto aus.',
            details: error.errors || error,
            isManagerAccount: true,
          },
        };
      }

      if (isInvalidCustomer) {
        return {
          success: false,
          error: {
            code: 'INVALID_CUSTOMER_ID',
            message: `Die Google Ads Customer-ID ${customerId} existiert nicht oder ist ungültig.`,
            details: error.errors || error,
          },
        };
      }

      if (isTestTokenError) {
        return {
          success: false,
          error: {
            code: 'TEST_TOKEN_PRODUCTION_ACCOUNT',
            message: 'Der Developer Token ist nur für Test-Accounts freigegeben. Eine manuelle Verknüpfung ist erforderlich.',
            details: error.errors || error,
            isProductionAccount: true,
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'INVITATION_FAILED',
          message: errorMessage,
          details: error.errors || error,
        },
      };
    }
  }

  /**
   * Client akzeptiert die Einladung vom Manager
   * Verwendet CustomerManagerLink um die Einladung anzunehmen
   * Der User-Refresh-Token wird verwendet, um im Namen des Clients zu handeln
   */
  async acceptManagerInvitation(
    customerId: string,
    userRefreshToken: string
  ): Promise<GoogleAdsApiResponse<any>> {
    try {
      const MANAGER_ID = '5788229684'; // Taskilo Manager Account (578-822-9684)
      const clientIdClean = customerId.replace(/-/g, '');

      if (!userRefreshToken) {
        return {
          success: false,
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Kein Refresh Token verfügbar',
            details: null,
          },
        };
      }

      // Customer-Objekt für den Client-Account erstellen
      const customer = this.client.Customer({
        customer_id: clientIdClean,
        refresh_token: userRefreshToken,
        login_customer_id: clientIdClean,
      });

      // Zuerst den bestehenden CustomerManagerLink finden
      const query = `
        SELECT 
          customer_manager_link.resource_name,
          customer_manager_link.manager_customer,
          customer_manager_link.status
        FROM customer_manager_link
        WHERE customer_manager_link.manager_customer = 'customers/${MANAGER_ID}'
      `;

      const linkResults = await customer.query(query);
      
      if (!linkResults || linkResults.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_PENDING_INVITATION',
            message: 'Keine ausstehende Einladung von Taskilo gefunden. Bitte fordern Sie zuerst eine neue Einladung an.',
            details: null,
          },
        };
      }

      const existingLink = linkResults[0].customer_manager_link;
      const resourceName = existingLink?.resource_name;
      const currentStatus = existingLink?.status;

      // Wenn bereits ACTIVE, nichts zu tun
      if (currentStatus === 2) { // ACTIVE = 2
        return {
          success: true,
          data: { message: 'Verknuepfung ist bereits aktiv', alreadyActive: true },
        };
      }

      // Status 6 = CANCELED - versuchen wir verschiedene Strategien
      if (currentStatus === 6) { // CANCELED = 6
        // Strategie 1: Versuche direkt auf ACTIVE zu setzen
        try {
          const reactivateResponse = await customer.customerManagerLinks.update([
            {
              resource_name: resourceName,
              status: 2, // Direkt auf ACTIVE setzen
            },
          ]);
          return {
            success: true,
            data: { message: 'Verknuepfung wurde reaktiviert', response: reactivateResponse },
          };
        } catch (reactivateError: any) {
          // Strategie 2: Setze auf PENDING und dann auf ACTIVE
          try {
            // Erst auf PENDING
            await customer.customerManagerLinks.update([
              {
                resource_name: resourceName,
                status: 4, // PENDING = 4
              },
            ]);
            // Dann auf ACTIVE
            const activeResponse = await customer.customerManagerLinks.update([
              {
                resource_name: resourceName,
                status: 2, // ACTIVE = 2
              },
            ]);
            return {
              success: true,
              data: { message: 'Verknüpfung wurde reaktiviert', response: activeResponse },
            };
          } catch (pendingError: any) {
            // Auch das funktioniert nicht - der Link ist wirklich kaputt
            // User muss im Google Ads UI den Link manuell löschen oder Manager muss neuen Account einladen
            return {
              success: false,
              error: {
                code: 'LINK_CANCELED_PERMANENTLY',
                message: 'Die Verknüpfung wurde dauerhaft storniert und kann nicht reaktiviert werden. Bitte entfernen Sie die Verknüpfung in Ihrem Google Ads Account unter Einstellungen > Kontozugriff und fordern Sie dann eine neue Einladung an.',
                details: { 
                  currentStatus, 
                  needsManualAction: true,
                  reactivateError: reactivateError.message,
                  pendingError: pendingError.message,
                },
              },
            };
          }
        }
      }

      // Wenn nicht PENDING, kann nicht akzeptiert werden
      if (currentStatus !== 4) { // PENDING = 4
        return {
          success: false,
          error: {
            code: 'INVALID_LINK_STATUS',
            message: `Die Einladung hat einen ungültigen Status (${currentStatus}). Bitte fordern Sie eine neue Einladung an.`,
            details: { currentStatus, needsNewInvitation: true },
            needsNewInvitation: true,
          },
        };
      }

      // CustomerManagerLink auf ACTIVE setzen um die Einladung anzunehmen
      const response = await customer.customerManagerLinks.update([
        {
          resource_name: resourceName,
          status: 2, // ManagerLinkStatus.ACTIVE = 2
        },
      ]);

      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      
      return {
        success: false,
        error: {
          code: 'ACCEPT_INVITATION_FAILED',
          message: errorMessage,
          details: error.errors || error,
        },
      };
    }
  }

  /**
   * Manager Einladung senden (vom Client-Account aus)
   * HINWEIS: Dies funktioniert nur, wenn der Client-Account Zugriff auf die API hat.
   * Bei Test-Developer-Tokens funktioniert dies NICHT mit Produktions-Accounts ("Test Access Only").
   * 
   * DEPRECATED: Verwende stattdessen sendManagerInvitationFromManager()
   */
  async sendManagerInvitation(
    clientRefreshToken: string,
    customerId: string,
    managerId: string
  ): Promise<GoogleAdsApiResponse<any>> {
    try {
      if (!clientRefreshToken) {
        return {
          success: false,
          error: {
            code: 'NO_CLIENT_TOKEN',
            message: 'Client refresh token missing',
          },
        };
      }

      // Authentifiziere als Client
      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: clientRefreshToken,
      });

      const managerResourceName = `customers/${managerId.replace(/-/g, '')}`;

      // Versuche, eine Verknüpfung vom Client zum Manager zu erstellen
      // Dies entspricht: "Client lädt Manager ein"
      const result = await customer.mutateResources([
        {
          customer_manager_link: {
            create: {
              manager_customer: managerResourceName,
              status: 'PENDING',
            },
          },
        } as any,
      ]);

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      // Prüfe ob Einladung schon existiert
      if (error.message?.includes('ALREADY_EXISTS') || error.message?.includes('DUPLICATE_ENTRY')) {
        return {
          success: true,
          data: { message: 'Invitation already exists' },
        };
      }

      return {
        success: false,
        error: {
          code: 'INVITATION_FAILED',
          message: error.message || 'Failed to send manager invitation from client',
          details: error,
        },
      };
    }
  }

  /**
   * ✅ Neues Test-Konto erstellen (unter dem Manager)
   */
  async createTestAccount(
    accountName: string
  ): Promise<GoogleAdsApiResponse<{ customerId: string; resourceName: string }>> {
    try {
      const MANAGER_ID = '655-923-8498'; // Test Manager

      const managerCustomer = this.client.Customer({
        customer_id: MANAGER_ID.replace(/-/g, ''),
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
        login_customer_id: MANAGER_ID.replace(/-/g, ''),
      });

      // Create a new client customer
      // Use the library's service wrapper: customer.customers.createCustomerClient
      
      // @ts-ignore - Library types might be incomplete
      const result = await managerCustomer.customers.createCustomerClient({
        customer_id: MANAGER_ID.replace(/-/g, ''),
        customer_client: {
          descriptive_name: accountName,
          currency_code: 'EUR',
          time_zone: 'Europe/Berlin',
        },
      });

      // Result usually contains resource_name of the new customer
      const resourceName = result.resource_name;
      const customerId = resourceName.split('/')[1];

      return {
        success: true,
        data: {
          customerId,
          resourceName,
        },
      };
    } catch (error: any) {
      console.error('Create Account Error:', error);
      return {
        success: false,
        error: {
          code: 'ACCOUNT_CREATION_FAILED',
          message: error.message || 'Failed to create test account',
          details: error,
        },
      };
    }
  }

  // 🎯 ===== WHITE-LABEL EXTENSIONS END =====

  /**
   * ✅ Audience Segments suchen (Affinity, In-Market, Demographics)
   */
  async searchAudienceSegments(
    refreshToken: string,
    customerId: string,
    query: string,
    loginCustomerId?: string
  ): Promise<GoogleAdsApiResponse<{
    affinity: any[];
    inMarket: any[];
    demographics: any[];
  }>> {
    try {
      const customer = this.client.Customer({
        customer_id: customerId.replace(/-/g, ''),
        refresh_token: refreshToken,
        login_customer_id: loginCustomerId ? loginCustomerId.replace(/-/g, '') : undefined,
      });

      // 1. Search User Interests (Affinity & In-Market)
      // Use REGEXP_MATCH for broader search capabilities (supports "TermA|TermB")
      // (?i) makes it case-insensitive
      const regexQuery = `(?i).*(${query}).*`;
      
      const userInterestQuery = `
        SELECT 
          user_interest.user_interest_id, 
          user_interest.name, 
          user_interest.taxonomy_type,
          user_interest.user_interest_parent
        FROM user_interest 
        WHERE 
          user_interest.name REGEXP_MATCH '${regexQuery}' 
        LIMIT 100
      `;

      // 2. Search Detailed Demographics
      const demographicQuery = `
        SELECT 
          detailed_demographic.id, 
          detailed_demographic.name, 
          detailed_demographic.parent
        FROM detailed_demographic 
        WHERE 
          detailed_demographic.name REGEXP_MATCH '${regexQuery}' 
        LIMIT 50
      `;

      // 3. Search Custom Audiences (Custom Affinity / Intent)
      const customAudienceQuery = `
        SELECT 
          custom_audience.id, 
          custom_audience.name,
          custom_audience.description,
          custom_audience.status
        FROM custom_audience
        WHERE 
          custom_audience.name REGEXP_MATCH '${regexQuery}'
          AND custom_audience.status = 'ENABLED'
        LIMIT 50
      `;

      // 4. Search Life Events
      const lifeEventQuery = `
        SELECT
          life_event.id,
          life_event.name,
          life_event.parent
        FROM life_event
        WHERE
          life_event.name REGEXP_MATCH '${regexQuery}'
        LIMIT 50
      `;      console.log(`[AudienceSearch] Executing GAQL for ${customerId}: ${userInterestQuery.replace(/\s+/g, ' ').trim()}`);

      const [interestResults, demographicResults, customAudienceResults, lifeEventResults] = await Promise.all([
        customer.query(userInterestQuery),
        customer.query(demographicQuery),
        customer.query(customAudienceQuery).catch(() => []), // Fail gracefully
        customer.query(lifeEventQuery).catch(() => []) // Fail gracefully
      ]);

      console.log(`[AudienceSearch] Found:
        - ${interestResults.length} interests
        - ${demographicResults.length} demographics
        - ${customAudienceResults.length} custom audiences
        - ${lifeEventResults.length} life events
        for query '${query}'`);

      const affinity: any[] = [];
      const inMarket: any[] = [];
      const demographics: any[] = [];

      // Process Interests
      for (const row of interestResults) {
        const interest = row.user_interest;
        if (!interest) continue;

        // Generiere eine sinnvolle Beschreibung basierend auf dem Typ
        let generatedDescription = "Zielgruppe für dieses Thema.";
        
        if (interest.taxonomy_type === 'AFFINITY') {
          generatedDescription = `Personen, die ein starkes Interesse an ${interest.name} zeigen und diesbezügliche Gewohnheiten haben.`;
        } else if (interest.taxonomy_type === 'IN_MARKET') {
          generatedDescription = `Personen, die aktiv nach Produkten oder Dienstleistungen im Bereich ${interest.name} suchen oder den Kauf planen.`;
        } else if (interest.taxonomy_type === 'MOBILE_APP_INSTALL_USER') {
          generatedDescription = `Personen, die Apps aus dem Bereich ${interest.name} installiert haben.`;
        }

        const item = {
          id: `user_interest:${interest.user_interest_id}`, // Prefix to distinguish
          name: interest.name,
          path: [], // TODO: Resolve parent path if needed
          description: generatedDescription,
          weeklyImpressions: "100M+ (Schätzung)", // Platzhalter für UI-Konsistenz, da echte Daten Forecasting benötigen
          relatedSegments: [],
          youtubeCategories: []
        };

        if (interest.taxonomy_type === 'AFFINITY') {
          affinity.push(item);
        } else if (interest.taxonomy_type === 'IN_MARKET') {
          inMarket.push(item);
        } else {
           // Add other types to affinity for now or create a new category
           affinity.push(item);
        }
      }

      // Process Demographics
      for (const row of demographicResults) {
        const demo = row.detailed_demographic;
        if (!demo) continue;

        demographics.push({
          id: `detailed_demographic:${demo.id}`,
          name: demo.name,
          path: [],
          description: `Detaillierte demografische Gruppe: ${demo.name}`,
          weeklyImpressions: "Verfügbar",
          relatedSegments: [],
          youtubeCategories: []
        });
      }
      
      // Process Custom Audiences (add to Affinity for UI simplicity)
      for (const row of customAudienceResults) {
        const ca = row.custom_audience;
        if (!ca) continue;
        
        affinity.push({
          id: `custom_audience:${ca.id}`,
          name: ca.name + ' (Benutzerdefiniert)',
          description: ca.description || 'Benutzerdefinierte Zielgruppe',
          path: [],
          weeklyImpressions: "Benutzerdefiniert",
          relatedSegments: [],
          youtubeCategories: []
        });
      }

      // Process Life Events (add to In-Market for UI simplicity)
      for (const row of lifeEventResults) {
        const le = row.life_event;
        if (!le) continue;
        
        inMarket.push({
          id: `life_event:${le.id}`,
          name: le.name + ' (Lebensereignis)',
          path: [],
          description: `Personen, die bald folgendes Lebensereignis haben: ${le.name}`,
          weeklyImpressions: "Verfügbar",
          relatedSegments: [],
          youtubeCategories: []
        });
      }

      return {
        success: true,
        data: {
          affinity,
          inMarket,
          demographics
        }
      };

    } catch (error: any) {
      console.error('Audience Search Error:', error);
      return {
        success: false,
        error: {
          code: 'AUDIENCE_SEARCH_FAILED',
          message: error.message || 'Failed to search audience segments',
        },
      };
    }
  }

  /**
   * ✅ Audience Insights abrufen (für Hover-Cards)
   */
  async getAudienceInsights(
    refreshToken: string,
    customerId: string,
    audienceId: string
  ): Promise<GoogleAdsApiResponse<any>> {
    try {
      const customer = this.client.Customer({
        customer_id: customerId.replace(/-/g, ''),
        refresh_token: refreshToken,
      });

      // Wir nutzen den AudienceInsightsService
      // Da die Library diesen Service ggf. nicht direkt als Helper hat, nutzen wir den generischen Service-Aufruf oder die Methode wenn verfügbar.
      
      // Dimension für die Anfrage vorbereiten
      // audienceId ist z.B. "user_interest:12345"
      const [type, id] = audienceId.split(':');
      
      let dimension: any = {};
      
      if (type === 'user_interest') {
        dimension = {
          user_interest: {
            user_interest_id: id
          }
        };
      } else if (type === 'detailed_demographic') {
        dimension = {
          detailed_demographic: {
            detailed_demographic_id: id
          }
        };
      } else if (type === 'life_event') {
        dimension = {
          life_event: {
            life_event_id: id
          }
        };
      } else {
        // Fallback oder Fehler
        return {
          success: false,
          error: {
            code: 'INVALID_AUDIENCE_TYPE',
            message: 'Insights not supported for this audience type',
          },
        };
      }

      // API Request
      // @ts-ignore
      const result = await customer.audienceInsights.generateAudienceCompositionInsights({
        customer_id: customerId.replace(/-/g, ''),
        audience: {
          dimensions: [dimension]
        } as any,
        dimensions: [
          'USER_INTEREST',
          'YOUTUBE_CHANNEL',
          'TOPIC'
        ] as any[],
        customer_insights_group: '1' // Optional
      });

      // Daten verarbeiten
      const relatedSegments: any[] = [];
      const youtubeCategories: any[] = [];
      
      // Verarbeite Composition Insights
      if (result.sections) {
        for (const section of result.sections as any[]) {
          if (section.dimension === 'USER_INTEREST') {
             if (section.top_audience_compositions) {
                for (const item of section.top_audience_compositions) {
                  if (item.user_interest) {
                    relatedSegments.push({
                      name: item.user_interest.name,
                      id: item.user_interest.user_interest_id,
                      score: item.score
                    });
                  }
                }
             }
          } else if (section.dimension === 'YOUTUBE_CHANNEL') {
             if (section.top_audience_compositions) {
                for (const item of section.top_audience_compositions) {
                  if (item.youtube_channel) {
                    youtubeCategories.push({
                      name: item.youtube_channel.channel_name,
                      id: item.youtube_channel.channel_id
                    });
                  }
                }
             }
          }
        }
      }

      return {
        success: true,
        data: {
          relatedSegments: relatedSegments.slice(0, 5),
          youtubeCategories: youtubeCategories.slice(0, 5),
          weeklyImpressions: "100M+ (Verfügbar)", // Insights geben keine absoluten Impressionen, aber bestätigen die Existenz
          description: "" // Insights geben leider auch keine Description
        }
      };

    } catch (error: any) {
      console.error('Audience Insights Error:', error);
      return {
        success: false,
        error: {
          code: 'INSIGHTS_ERROR',
          message: error.message || 'Failed to fetch audience insights',
        },
      };
    }
  }
}

// Singleton-Instanz exportieren
export const googleAdsClientService = new GoogleAdsClientService();

// Class export for multi-platform service
export { GoogleAdsClientService };
