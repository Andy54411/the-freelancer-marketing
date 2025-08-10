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
   * ✅ OAuth2 URL generieren - ERWEITERTE SCOPES FÜR WHITE-LABEL
   */
  generateAuthUrl(companyId: string, redirectUri: string): string {
    // 🎯 VOLLSTÄNDIGE GOOGLE ADS SCOPES für White-Label Platform
    const scopes = [
      'https://www.googleapis.com/auth/adwords', // Full Google Ads access
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
    try {
      console.log('🔍 Getting accessible customers for REAL Google Ads account...');

      // STRATEGIE 1: Client Library listAccessibleCustomers - für echte Accounts
      try {
        console.log('🔍 Using Client Library listAccessibleCustomers...');

        // Nutze die offizielle listAccessibleCustomers Methode der Client Library
        const accessibleCustomersResponse = await this.client.listAccessibleCustomers(refreshToken);

        if (
          accessibleCustomersResponse &&
          accessibleCustomersResponse.resource_names &&
          accessibleCustomersResponse.resource_names.length > 0
        ) {
          console.log(
            '✅ Found accessible customers with Client Library:',
            accessibleCustomersResponse.resource_names
          );

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
                console.log(
                  `⚠️ Failed to get details for customer ${customerId}:`,
                  customerError.message
                );
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
            console.log('✅ Successfully processed accessible customers:', customerAccounts);
            return {
              success: true,
              data: customerAccounts,
            };
          }
        }
      } catch (clientLibraryError) {
        console.log(
          '⚠️ Client Library listAccessibleCustomers failed, trying REST API...',
          clientLibraryError.message
        );
      }

      // STRATEGIE 2: REST API als Fallback
      console.log('🔍 Trying REST API listAccessibleCustomers...');
      let accessToken;
      try {
        accessToken = await this.getValidAccessToken(refreshToken);
      } catch (tokenError) {
        console.error('❌ Failed to get valid access token:', tokenError);
        return {
          success: false,
          error: {
            code: 'TOKEN_ERROR',
            message: 'Failed to get valid access token',
            details: { originalError: tokenError.message },
          },
        };
      }

      const listCustomersResponse = await fetch(
        'https://googleads.googleapis.com/v17/customers:listAccessibleCustomers',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': this.config.developer_token!,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('🔍 ListAccessibleCustomers response status:', listCustomersResponse.status);

      if (listCustomersResponse.status === 404) {
        console.log(
          '⚠️ ListAccessibleCustomers returned 404, this account might not have Google Ads access'
        );
        // Fallback: Erstelle einen Dummy-Account für Testzwecke
        return {
          success: true,
          data: [
            {
              id: 'no-google-ads-account',
              name: 'No Google Ads Account Found',
              currency: 'EUR',
              timezone: 'Europe/Berlin',
              status: 'ENABLED',
              manager: false,
              testAccount: true,
              level: 0,
            },
          ],
        };
      }

      if (!listCustomersResponse.ok) {
        throw new Error(
          `Failed to list accessible customers: ${listCustomersResponse.status} ${listCustomersResponse.statusText}`
        );
      }

      const listData = await listCustomersResponse.json();
      console.log('🔍 ListAccessibleCustomers response:', listData);

      // Wenn keine Kunden gefunden, versuche alternative Methode
      if (!listData.resourceNames || listData.resourceNames.length === 0) {
        console.log('⚠️ No customers from listAccessibleCustomers, trying fallback...');

        // Fallback: Versuche mit dem aktuellen Account selbst
        const customer = this.client.Customer({
          customer_id: managerCustomerId || '0', // Default customer ID
          refresh_token: refreshToken,
        });

        // Versuche customer Info zu bekommen
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
          const formattedAccount: GoogleAdsAccount = {
            id: String(info.customer?.id || 'default'),
            name: info.customer?.descriptive_name || 'Main Account',
            currency: info.customer?.currency_code || 'EUR',
            timezone: info.customer?.time_zone || 'Europe/Berlin',
            status: this.mapCustomerStatus(info.customer?.status) || 'ENABLED',
            manager: info.customer?.manager || false,
            testAccount: info.customer?.test_account || false,
            level: 0,
          };

          return {
            success: true,
            data: [formattedAccount],
          };
        }
      }

      // Normale Verarbeitung der listAccessibleCustomers Response
      const customerIds =
        listData.resourceNames
          ?.map((resourceName: string) => {
            const match = resourceName.match(/customers\/(\d+)/);
            return match ? match[1] : null;
          })
          .filter(Boolean) || [];

      if (customerIds.length === 0) {
        console.log('⚠️ No valid customer IDs found');
        return {
          success: true,
          data: [
            {
              id: 'no-accounts-found',
              name: 'No Google Ads Accounts Found',
              currency: 'EUR',
              timezone: 'Europe/Berlin',
              status: 'ENABLED',
              manager: false,
              testAccount: true,
              level: 0,
            },
          ],
        };
      }

      // Hole Details für jeden Kunden
      const formattedAccounts: GoogleAdsAccount[] = [];

      for (const customerId of customerIds.slice(0, 5)) {
        // Limit auf 5 für Performance
        try {
          const customer = this.client.Customer({
            customer_id: customerId,
            refresh_token: refreshToken,
          });

          const customerDetails = await customer.query(`
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

          if (customerDetails && customerDetails.length > 0) {
            const details = customerDetails[0];
            formattedAccounts.push({
              id: String(details.customer?.id || customerId),
              name: details.customer?.descriptive_name || `Account ${customerId}`,
              currency: details.customer?.currency_code || 'EUR',
              timezone: details.customer?.time_zone || 'Europe/Berlin',
              status: this.mapCustomerStatus(details.customer?.status) || 'ENABLED',
              manager: details.customer?.manager || false,
              testAccount: details.customer?.test_account || false,
              level: 0,
            });
          }
        } catch (customerError) {
          console.error(`Error fetching details for customer ${customerId}:`, customerError);
          // Füge trotzdem einen Basic-Account hinzu
          formattedAccounts.push({
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

      return {
        success: true,
        data: formattedAccounts,
      };
    } catch (error: any) {
      console.error('🔥 getAccessibleCustomers error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        response: error.response,
        details: error.details,
        fullError: error,
      });

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
            console.log('🔄 Using existing valid access token');
            return storedData.data.accountConfig.accessToken;
          }
        }
      }

      console.log('🔄 Refreshing access token...');
      const refreshResult = await this.refreshAccessToken(refreshToken);
      if (refreshResult.success && refreshResult.data) {
        console.log('✅ Access token refreshed successfully');
        return refreshResult.data.access_token;
      }
      throw new Error('Failed to refresh access token');
    } catch (error: any) {
      console.error('❌ Token refresh failed:', error);
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
      console.log('🎯 Fetching campaigns for customer:', customerId);

      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
      });

      console.log('📊 Querying campaign data...');
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

      console.log(`✅ Found ${campaigns.length} campaigns`);

      const formattedCampaigns: GoogleAdsCampaign[] = campaigns.map((camp: any) => ({
        id: camp.campaign?.id || '',
        name: camp.campaign?.name || '',
        status: this.mapCampaignStatus(camp.campaign?.status),
        type: camp.campaign?.advertising_channel_type || 'SEARCH',
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
      console.error('❌ Campaign fetch error:', error);
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
      console.log('🎯 Creating campaign for customer:', customerId);
      console.log('📝 Campaign data:', campaignData);

      // Validiere Customer ID Format
      if (!customerId || customerId === 'auto-detect') {
        throw new Error('Invalid customer ID provided');
      }

      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
      });

      // Test Customer Access zuerst
      console.log('🔍 Testing customer access...');
      try {
        const testQuery = await customer.query(`
          SELECT customer.id, customer.descriptive_name
          FROM customer
          LIMIT 1
        `);
        console.log('✅ Customer access confirmed:', testQuery[0]?.customer);
      } catch (accessError: any) {
        console.error('❌ Customer access failed:', accessError);
        throw new Error(`Customer access failed: ${accessError.message}`);
      }

      // 1. Erstelle Campaign Budget
      console.log('💰 Creating campaign budget...');
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

        budgetResourceName = budgetResult.results[0].resource_name;
        console.log('✅ Budget created:', budgetResourceName);
      } catch (budgetError: any) {
        console.error('❌ Budget creation failed:', budgetError);
        console.error('❌ Budget error details:', {
          name: budgetError.name,
          message: budgetError.message,
          code: budgetError.code,
          status: budgetError.status,
          details: budgetError.details,
          failures: budgetError.failures,
          stack: budgetError.stack?.substring(0, 500),
        });
        throw new Error(
          `Budget creation failed: ${budgetError.message || budgetError.details || 'Unknown budget error'}`
        );
      }

      // 2. Erstelle Campaign
      console.log('🚀 Creating campaign...');

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

        const campaignResourceName = campaignResult.results[0].resource_name;
        const campaignId = campaignResourceName.split('/')[3]; // Extract ID from resource name

        console.log('✅ Campaign created successfully:', campaignId);

        return {
          success: true,
          data: { campaignId },
        };
      } catch (campaignError: any) {
        console.error('❌ Campaign creation failed:', campaignError);
        throw new Error(
          `Campaign creation failed: ${campaignError.message || 'Unknown campaign error'}`
        );
      }
    } catch (error: any) {
      console.error('❌ Campaign creation error:', error);

      // Detaillierte Fehleranalyse
      let errorMessage = 'Failed to create campaign';
      let errorCode = 'CAMPAIGN_CREATION_ERROR';

      if (error.details) {
        console.error('📋 Error details:', error.details);
        errorMessage = error.details;
      }

      if (error.message) {
        console.error('💬 Error message:', error.message);
        errorMessage = error.message;
      }

      if (error.code) {
        console.error('🔢 Error code:', error.code);
        errorCode = error.code;
      }

      if (error.status) {
        console.error('📊 Error status:', error.status);
      }

      // Log vollständiges Error-Objekt für Debugging
      console.error('🔍 Full error object:', JSON.stringify(error, null, 2));

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
    }
  ): Promise<GoogleAdsApiResponse<{ campaignId: string; adGroupIds: string[] }>> {
    try {
      console.log('🎯 Creating comprehensive campaign for customer:', customerId);
      console.log('📝 Campaign data:', JSON.stringify(campaignData, null, 2));

      // Validiere Customer ID Format
      if (!customerId || customerId === 'auto-detect') {
        throw new Error('Invalid customer ID provided');
      }

      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
      });

      // Test Customer Access zuerst
      console.log('🔍 Testing customer access...');
      try {
        const testQuery = await customer.query(`
          SELECT customer.id, customer.descriptive_name
          FROM customer
          LIMIT 1
        `);
        console.log('✅ Customer access confirmed:', testQuery[0]?.customer);
      } catch (accessError: any) {
        console.error('❌ Customer access failed:', accessError);
        throw new Error(`Customer access failed: ${accessError.message}`);
      }

      // 1. Erstelle Campaign Budget
      console.log('💰 Creating campaign budget...');
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

        budgetResourceName = budgetResult.results[0].resource_name;
        console.log('✅ Budget created:', budgetResourceName);
      } catch (budgetError: any) {
        console.error('❌ Budget creation failed:', budgetError);
        console.error('❌ Budget error details:', {
          name: budgetError.name,
          message: budgetError.message,
          code: budgetError.code,
          status: budgetError.status,
          details: budgetError.details,
          failures: budgetError.failures,
          stack: budgetError.stack?.substring(0, 500),
        });
        throw new Error(
          `Budget creation failed: ${budgetError.message || budgetError.details || 'Unknown budget error'}`
        );
      }

      // 2. Erstelle Campaign
      console.log('🚀 Creating campaign...');

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
          },
        ]);

        campaignResourceName = campaignResult.results[0].resource_name;
        campaignId = campaignResourceName.split('/')[3]; // Extract ID from resource name

        console.log('✅ Campaign created successfully:', campaignId);
      } catch (campaignError: any) {
        console.error('❌ Campaign creation failed:', campaignError);
        throw new Error(
          `Campaign creation failed: ${campaignError.message || 'Unknown campaign error'}`
        );
      }

      // 3. Erstelle Ad Groups mit Keywords und Ads
      console.log('📁 Creating ad groups with keywords and ads...');
      const adGroupIds: string[] = [];

      for (let i = 0; i < campaignData.adGroups.length; i++) {
        const adGroupData = campaignData.adGroups[i];
        console.log(
          `🎯 Creating ad group ${i + 1}/${campaignData.adGroups.length}: ${adGroupData.name}`
        );

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
          const adGroupId = adGroupResourceName.split('/')[5]; // Extract ID from resource name
          adGroupIds.push(adGroupId);

          console.log(`✅ Ad group created: ${adGroupId}`);

          // Erstelle Keywords für diese Ad Group
          if (adGroupData.keywords && adGroupData.keywords.length > 0) {
            console.log(
              `🔑 Creating ${adGroupData.keywords.length} keywords for ad group ${adGroupId}`
            );

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
              console.log(`✅ Created ${keywordResult.results.length} keywords`);
            } catch (keywordError: any) {
              console.error(`❌ Failed to create keywords:`, keywordError);
            }
          }

          // Erstelle Ads für diese Ad Group
          if (adGroupData.ads && adGroupData.ads.length > 0) {
            console.log(`📝 Creating ${adGroupData.ads.length} ads for ad group ${adGroupId}`);

            for (const adData of adGroupData.ads) {
              try {
                // Validiere Ad-Daten
                if (!adData.headlines || adData.headlines.length === 0) {
                  console.warn('⚠️ Ad has no headlines, skipping');
                  continue;
                }

                if (!adData.descriptions || adData.descriptions.length === 0) {
                  console.warn('⚠️ Ad has no descriptions, skipping');
                  continue;
                }

                if (!adData.finalUrls || adData.finalUrls.length === 0) {
                  console.warn('⚠️ Ad has no final URLs, skipping');
                  continue;
                }

                // Filter leere Headlines und Descriptions
                const validHeadlines = adData.headlines.filter(h => h && h.trim().length > 0);
                const validDescriptions = adData.descriptions.filter(d => d && d.trim().length > 0);

                if (validHeadlines.length < 3) {
                  console.warn('⚠️ Ad needs at least 3 headlines, skipping');
                  continue;
                }

                if (validDescriptions.length < 2) {
                  console.warn('⚠️ Ad needs at least 2 descriptions, skipping');
                  continue;
                }

                console.log(
                  `📝 Creating ad with ${validHeadlines.length} headlines and ${validDescriptions.length} descriptions`
                );

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

                console.log('📤 Ad payload being sent:', JSON.stringify(adPayload, null, 2));

                const adResult = await customer.adGroupAds.create([adPayload]);
                console.log('✅ Ad created successfully');
              } catch (adError: any) {
                console.error(`❌ Failed to create ad:`, adError);
                // Continue mit anderen Ads
              }
            }
          }
        } catch (adGroupError: any) {
          console.error(`❌ Failed to create ad group ${adGroupData.name}:`, adGroupError);
          // Continue mit anderen Ad Groups
        }
      }

      // 4. Füge Targeting hinzu (optional)
      if (campaignData.targetingOptions) {
        console.log('🎯 Adding targeting options...');

        // TODO: Implement targeting options
        // - Locations
        // - Languages
        // - Demographics
        // Dies würde weitere campaignCriteria und adGroupCriteria operations benötigen
      }

      console.log('✅ Comprehensive campaign created successfully:', {
        campaignId,
        adGroupIds,
        totalAdGroups: adGroupIds.length,
      });

      return {
        success: true,
        data: {
          campaignId,
          adGroupIds,
        },
      };
    } catch (error: any) {
      console.error('❌ Comprehensive campaign creation error:', error);

      // Detaillierte Fehleranalyse
      let errorMessage = 'Failed to create comprehensive campaign';
      let errorCode = 'COMPREHENSIVE_CAMPAIGN_CREATION_ERROR';

      // Google Ads API Fehler-Details extrahieren
      if (error.failures && error.failures.length > 0) {
        const firstFailure = error.failures[0];
        console.error('📋 Google Ads API failure:', firstFailure);
        errorMessage = firstFailure.message || firstFailure.error_code?.message || errorMessage;
        errorCode = firstFailure.error_code?.error_code || errorCode;
      }

      if (error.details) {
        console.error('📋 Error details:', error.details);
        errorMessage = error.details;
      }

      if (error.message) {
        console.error('💬 Error message:', error.message);
        errorMessage = error.message;
      }

      if (error.code) {
        console.error('🔢 Error code:', error.code);
        errorCode = error.code;
      }

      if (error.status) {
        console.error('📊 Error status:', error.status);
      }

      // Log vollständiges Error-Objekt für Debugging
      console.error('🔍 Full error object:', {
        name: error.name,
        message: error.message,
        code: error.code,
        status: error.status,
        failures: error.failures,
        stack: error.stack?.substring(0, 500), // Begrenzte Stack Trace
      });

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
      console.log('🔄 Updating campaign:', { customerId, campaignId, campaignData });

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

      console.log('🔄 Campaign update operations:', operations);

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
      console.error('❌ Campaign update error:', error);
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.message || 'Failed to update campaign',
        },
      };
    }
  }

  // 🎯 ===== WHITE-LABEL EXTENSIONS START =====

  /**
   * 🎯 KEYWORD MANAGEMENT - White-Label Feature
   */
  async getKeywords(
    refreshToken: string,
    customerId: string,
    adGroupId?: string
  ): Promise<GoogleAdsApiResponse<any[]>> {
    try {
      console.log('🔍 Getting keywords for White-Label interface...');

      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
      });

      let query = `
        SELECT
          ad_group_criterion.criterion_id,
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          ad_group_criterion.status,
          ad_group_criterion.final_urls,
          ad_group_criterion.cpc_bid_micros,
          ad_group.id,
          ad_group.name,
          campaign.id,
          campaign.name,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc
        FROM keyword_view
        WHERE ad_group_criterion.type = KEYWORD
        AND ad_group_criterion.status != REMOVED
      `;

      if (adGroupId) {
        query += ` AND ad_group.id = ${adGroupId}`;
      }

      const result = await customer.query(query);

      const keywords = result.map((row: any) => ({
        id: String(row.ad_group_criterion?.criterion_id || ''),
        text: row.ad_group_criterion?.keyword?.text || '',
        matchType: row.ad_group_criterion?.keyword?.match_type || 'BROAD',
        status: row.ad_group_criterion?.status || 'UNKNOWN',
        finalUrl: row.ad_group_criterion?.final_urls?.[0] || '',
        cpc: (row.ad_group_criterion?.cpc_bid_micros || 0) / 1000000,
        adGroupId: String(row.ad_group?.id || ''),
        adGroupName: row.ad_group?.name || '',
        campaignId: String(row.campaign?.id || ''),
        campaignName: row.campaign?.name || '',
        metrics: {
          impressions: row.metrics?.impressions || 0,
          clicks: row.metrics?.clicks || 0,
          cost: (row.metrics?.cost_micros || 0) / 1000000,
          conversions: row.metrics?.conversions || 0,
          ctr: row.metrics?.ctr || 0,
          cpc: (row.metrics?.average_cpc || 0) / 1000000,
        },
      }));

      return {
        success: true,
        data: keywords,
      };
    } catch (error: any) {
      console.error('❌ Keywords fetch error:', error);
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.message || 'Failed to fetch keywords',
        },
      };
    }
  }

  /**
   * 🎯 AD MANAGEMENT - White-Label Feature
   */
  async getAds(
    refreshToken: string,
    customerId: string,
    adGroupId?: string
  ): Promise<GoogleAdsApiResponse<any[]>> {
    try {
      console.log('🎨 Getting ads for White-Label interface...');

      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
      });

      let query = `
        SELECT
          ad_group_ad.ad.id,
          ad_group_ad.ad.type,
          ad_group_ad.status,
          ad_group_ad.ad.final_urls,
          ad_group_ad.ad.display_url,
          ad_group_ad.ad.text_ad.headline,
          ad_group_ad.ad.text_ad.description1,
          ad_group_ad.ad.text_ad.description2,
          ad_group_ad.ad.responsive_search_ad.headlines,
          ad_group_ad.ad.responsive_search_ad.descriptions,
          ad_group.id,
          ad_group.name,
          campaign.id,
          campaign.name,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr
        FROM ad_group_ad
        WHERE ad_group_ad.status != REMOVED
      `;

      if (adGroupId) {
        query += ` AND ad_group.id = ${adGroupId}`;
      }

      const result = await customer.query(query);

      const ads = result.map((row: any) => ({
        id: String(row.ad_group_ad?.ad?.id || ''),
        type: row.ad_group_ad?.ad?.type || 'TEXT_AD',
        status: row.ad_group_ad?.status || 'UNKNOWN',
        finalUrls: row.ad_group_ad?.ad?.final_urls || [],
        displayUrl: row.ad_group_ad?.ad?.display_url || '',
        headline: row.ad_group_ad?.ad?.text_ad?.headline || '',
        description1: row.ad_group_ad?.ad?.text_ad?.description1 || '',
        description2: row.ad_group_ad?.ad?.text_ad?.description2 || '',
        responsiveSearchAd: {
          headlines:
            row.ad_group_ad?.ad?.responsive_search_ad?.headlines?.map((h: any) => ({
              text: h.text,
              pinned_field: h.pinned_field,
            })) || [],
          descriptions:
            row.ad_group_ad?.ad?.responsive_search_ad?.descriptions?.map((d: any) => ({
              text: d.text,
              pinned_field: d.pinned_field,
            })) || [],
        },
        adGroupId: String(row.ad_group?.id || ''),
        adGroupName: row.ad_group?.name || '',
        campaignId: String(row.campaign?.id || ''),
        campaignName: row.campaign?.name || '',
        metrics: {
          impressions: row.metrics?.impressions || 0,
          clicks: row.metrics?.clicks || 0,
          cost: (row.metrics?.cost_micros || 0) / 1000000,
          conversions: row.metrics?.conversions || 0,
          ctr: row.metrics?.ctr || 0,
        },
      }));

      return {
        success: true,
        data: ads,
      };
    } catch (error: any) {
      console.error('❌ Ads fetch error:', error);
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.message || 'Failed to fetch ads',
        },
      };
    }
  }

  /**
   * 🎯 AD GROUP MANAGEMENT - White-Label Feature
   */
  async getAdGroups(
    refreshToken: string,
    customerId: string,
    campaignId?: string
  ): Promise<GoogleAdsApiResponse<any[]>> {
    try {
      console.log('📊 Getting ad groups for White-Label interface...');

      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
      });

      let query = `
        SELECT
          ad_group.id,
          ad_group.name,
          ad_group.status,
          ad_group.type,
          ad_group.cpc_bid_micros,
          ad_group.cpa_bid_micros,
          ad_group.target_cpm_micros,
          campaign.id,
          campaign.name,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc
        FROM ad_group
        WHERE ad_group.status != REMOVED
      `;

      if (campaignId) {
        query += ` AND campaign.id = ${campaignId}`;
      }

      const result = await customer.query(query);

      const adGroups = result.map((row: any) => ({
        id: String(row.ad_group?.id || ''),
        name: row.ad_group?.name || '',
        status: row.ad_group?.status || 'UNKNOWN',
        type: row.ad_group?.type || 'SEARCH_STANDARD',
        cpcBid: (row.ad_group?.cpc_bid_micros || 0) / 1000000,
        cpaBid: (row.ad_group?.cpa_bid_micros || 0) / 1000000,
        targetCpm: (row.ad_group?.target_cpm_micros || 0) / 1000000,
        campaignId: String(row.campaign?.id || ''),
        campaignName: row.campaign?.name || '',
        metrics: {
          impressions: row.metrics?.impressions || 0,
          clicks: row.metrics?.clicks || 0,
          cost: (row.metrics?.cost_micros || 0) / 1000000,
          conversions: row.metrics?.conversions || 0,
          ctr: row.metrics?.ctr || 0,
          cpc: (row.metrics?.average_cpc || 0) / 1000000,
        },
      }));

      return {
        success: true,
        data: adGroups,
      };
    } catch (error: any) {
      console.error('❌ Ad groups fetch error:', error);
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.message || 'Failed to fetch ad groups',
        },
      };
    }
  }

  /**
   * 🎯 BUDGET MANAGEMENT - White-Label Feature
   */
  async getBudgets(refreshToken: string, customerId: string): Promise<GoogleAdsApiResponse<any[]>> {
    try {
      console.log('💰 Getting budgets for White-Label interface...');

      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
      });

      const query = `
        SELECT
          campaign_budget.id,
          campaign_budget.name,
          campaign_budget.amount_micros,
          campaign_budget.delivery_method,
          campaign_budget.period,
          campaign_budget.status,
          campaign_budget.total_amount_micros
        FROM campaign_budget
        WHERE campaign_budget.status != REMOVED
      `;

      const result = await customer.query(query);

      const budgets = result.map((row: any) => ({
        id: String(row.campaign_budget?.id || ''),
        name: row.campaign_budget?.name || '',
        amount: (row.campaign_budget?.amount_micros || 0) / 1000000,
        currency: 'EUR', // Default, should be fetched from account
        deliveryMethod: row.campaign_budget?.delivery_method || 'STANDARD',
        period: row.campaign_budget?.period || 'DAILY',
        status: row.campaign_budget?.status || 'ENABLED',
        totalAmount: (row.campaign_budget?.total_amount_micros || 0) / 1000000,
      }));

      return {
        success: true,
        data: budgets,
      };
    } catch (error: any) {
      console.error('❌ Budgets fetch error:', error);
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.message || 'Failed to fetch budgets',
        },
      };
    }
  }

  /**
   * 🎯 PERFORMANCE ANALYTICS - White-Label Feature
   */
  async getPerformanceAnalytics(
    refreshToken: string,
    customerId: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<GoogleAdsApiResponse<any>> {
    try {
      console.log('📈 Getting performance analytics for White-Label interface...');

      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
      });

      const startDate = dateRange?.startDate || '2024-01-01';
      const endDate = dateRange?.endDate || new Date().toISOString().split('T')[0];

      const query = `
        SELECT
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversion_value,
          metrics.ctr,
          metrics.average_cpc,
          metrics.average_cpa,
          metrics.value_per_conversion,
          segments.date
        FROM customer
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      `;

      const result = await customer.query(query);

      const totalMetrics = {
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
        conversionValue: 0,
        ctr: 0,
        cpc: 0,
        cpa: 0,
        roas: 0,
      };

      const dailyData: any[] = [];

      result.forEach((row: any) => {
        const metrics = row.metrics || {};
        const cost = (metrics.cost_micros || 0) / 1000000;
        const conversions = metrics.conversions || 0;
        const conversionValue = metrics.conversion_value || 0;

        totalMetrics.impressions += metrics.impressions || 0;
        totalMetrics.clicks += metrics.clicks || 0;
        totalMetrics.cost += cost;
        totalMetrics.conversions += conversions;
        totalMetrics.conversionValue += conversionValue;

        dailyData.push({
          date: row.segments?.date || '',
          impressions: metrics.impressions || 0,
          clicks: metrics.clicks || 0,
          cost: cost,
          conversions: conversions,
          conversionValue: conversionValue,
          ctr: metrics.ctr || 0,
          cpc: (metrics.average_cpc || 0) / 1000000,
        });
      });

      // Calculate averages
      if (totalMetrics.impressions > 0) {
        totalMetrics.ctr = (totalMetrics.clicks / totalMetrics.impressions) * 100;
      }
      if (totalMetrics.clicks > 0) {
        totalMetrics.cpc = totalMetrics.cost / totalMetrics.clicks;
      }
      if (totalMetrics.conversions > 0) {
        totalMetrics.cpa = totalMetrics.cost / totalMetrics.conversions;
      }
      if (totalMetrics.cost > 0) {
        totalMetrics.roas = totalMetrics.conversionValue / totalMetrics.cost;
      }

      return {
        success: true,
        data: {
          summary: totalMetrics,
          daily: dailyData,
          dateRange: { startDate, endDate },
        },
      };
    } catch (error: any) {
      console.error('❌ Performance analytics fetch error:', error);
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.message || 'Failed to fetch performance analytics',
        },
      };
    }
  }

  /**
   * 🎯 USER PROFILE - Get Google Account Info for White-Label
   */
  async getUserProfile(accessToken: string): Promise<GoogleAdsApiResponse<any>> {
    try {
      console.log('👤 Getting user profile for White-Label interface...');

      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.status}`);
      }

      const userInfo = await response.json();

      return {
        success: true,
        data: {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          locale: userInfo.locale,
          verified: userInfo.verified_email,
        },
      };
    } catch (error: any) {
      console.error('❌ User profile fetch error:', error);
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.message || 'Failed to fetch user profile',
        },
      };
    }
  }

  // 🎯 ===== WHITE-LABEL EXTENSIONS END =====
}

// Singleton-Instanz exportieren
export const googleAdsClientService = new GoogleAdsClientService();
