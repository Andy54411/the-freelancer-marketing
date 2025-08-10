// 🎯 TABOOLA SERVICE
// Integration mit Taboola Backstage API

import { MultiPlatformApiResponse, UnifiedCampaign, UnifiedMetrics } from '@/types/advertising';

export class TaboolaService {
  private apiUrl = 'https://backstage.taboola.com';
  private version = '1.0';

  constructor() {
    // Taboola Backstage API Setup
  }

  /**
   * 🔗 Taboola OAuth URL generieren
   */
  generateAuthUrl(companyId: string, redirectUri: string): string {
    // Taboola verwendet oft API Keys statt OAuth, aber für Konsistenz:
    const params = new URLSearchParams({
      client_id: process.env.TABOOLA_CLIENT_ID || '',
      redirect_uri: redirectUri,
      state: companyId,
      response_type: 'code',
    });

    return `https://backstage.taboola.com/backstage/oauth/authorize?${params.toString()}`;
  }

  /**
   * 🎯 Taboola Kampagnen abrufen
   */
  async getCampaigns(
    accessToken: string,
    accountId: string
  ): Promise<MultiPlatformApiResponse<UnifiedCampaign[]>> {
    try {
      const url = `${this.apiUrl}/backstage/api/${this.version}/${accountId}/campaigns/`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Taboola API error: ${response.status}`);
      }

      const data = await response.json();

      const campaigns: UnifiedCampaign[] = (data.results || []).map((campaign: any) => ({
        id: campaign.id?.toString() || '',
        name: campaign.name || '',
        platform: 'taboola' as const,
        status: this.mapTaboolaStatus(campaign.is_active),
        type: campaign.branding_text || 'NATIVE_CONTENT',
        startDate: campaign.start_date || new Date().toISOString().split('T')[0],
        endDate: campaign.end_date || undefined,
        budget: {
          amount: campaign.daily_cap ? Math.round(campaign.daily_cap) : 0,
          currency: campaign.currency || 'USD',
          period: 'DAILY' as const,
          spent: campaign.spent ? Math.round(campaign.spent) : undefined,
        },
        targeting: {
          locations: campaign.country_targeting?.include || [],
          demographics: {},
          interests: campaign.interests || [],
          placements: campaign.publisher_targeting?.include || [],
        },
        creative: {
          headlines: [],
          descriptions: [],
          images: [],
          callToAction: 'READ_MORE',
          landingUrl: campaign.url || '',
        },
        metrics: {
          impressions: 0,
          clicks: 0,
          cost: 0,
          conversions: 0,
          conversionValue: 0,
          ctr: 0,
          cpc: 0,
          cpa: 0,
          roas: 0,
        },
        platformSpecific: {
          taboola: {
            campaignId: campaign.id,
            brandingText: campaign.branding_text,
            biddingModel: campaign.cpc || 'CPC',
            contentCategories: campaign.content_categories,
          },
        },
      }));

      return {
        success: true,
        data: campaigns,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'TABOOLA_API_ERROR',
          message: error.message || 'Failed to fetch Taboola campaigns',
          platform: 'taboola',
        },
      };
    }
  }

  /**
   * 📊 Taboola Analytics abrufen
   */
  async getAnalytics(
    accessToken: string,
    accountId: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<MultiPlatformApiResponse<{ summary: UnifiedMetrics; campaignCount: number }>> {
    try {
      const startDate =
        dateRange?.startDate ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = dateRange?.endDate || new Date().toISOString().split('T')[0];

      const url = `${this.apiUrl}/backstage/api/${this.version}/${accountId}/reports/campaign-summary/dimensions/campaign_breakdown?start_date=${startDate}&end_date=${endDate}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Taboola Analytics API error: ${response.status}`);
      }

      const data = await response.json();
      const results = data.results || [];

      const summary = results.reduce(
        (acc: any, result: any) => ({
          impressions: acc.impressions + (result.impressions || 0),
          clicks: acc.clicks + (result.clicks || 0),
          cost: acc.cost + (result.spent ? Math.round(result.spent * 100) : 0), // Convert to cents
          conversions: acc.conversions + (result.actions || 0),
          conversionValue:
            acc.conversionValue +
            (result.actions_value ? Math.round(result.actions_value * 100) : 0),
        }),
        {
          impressions: 0,
          clicks: 0,
          cost: 0,
          conversions: 0,
          conversionValue: 0,
        }
      );

      const metrics: UnifiedMetrics = {
        ...summary,
        ctr: summary.impressions > 0 ? (summary.clicks / summary.impressions) * 100 : 0,
        cpc: summary.clicks > 0 ? summary.cost / summary.clicks : 0,
        cpa: summary.conversions > 0 ? summary.cost / summary.conversions : 0,
        roas: summary.cost > 0 ? summary.conversionValue / summary.cost : 0,
      };

      return {
        success: true,
        data: {
          summary: metrics,
          campaignCount: results.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'TABOOLA_ANALYTICS_ERROR',
          message: error.message || 'Failed to fetch Taboola analytics',
          platform: 'taboola',
        },
      };
    }
  }

  /**
   * ✅ Taboola Kampagne erstellen
   */
  async createCampaign(
    accessToken: string,
    accountId: string,
    campaignData: {
      name: string;
      brandingText: string;
      budget: { amount: number; currency: string };
      targeting?: any;
      url: string;
    }
  ): Promise<MultiPlatformApiResponse<{ campaignId: string }>> {
    try {
      const campaignPayload = {
        name: campaignData.name,
        branding_text: campaignData.brandingText || 'Sponsored Content',
        daily_cap: campaignData.budget.amount,
        currency: campaignData.budget.currency || 'USD',
        url: campaignData.url,
        is_active: false, // Start paused for review
        cpc: 0.5, // Default CPC
        spending_model: 'ENTIRE_BUDGET',
        budget_model: 'DAILY',
        // Targeting
        country_targeting: {
          type: 'INCLUDE',
          value: campaignData.targeting?.locations || ['US'],
        },
      };

      const response = await fetch(
        `${this.apiUrl}/backstage/api/${this.version}/${accountId}/campaigns/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(campaignPayload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Taboola Campaign creation failed: ${errorData.message || response.status}`
        );
      }

      const result = await response.json();

      return {
        success: true,
        data: { campaignId: result.id.toString() },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'TABOOLA_CAMPAIGN_CREATION_ERROR',
          message: error.message || 'Failed to create Taboola campaign',
          platform: 'taboola',
        },
      };
    }
  }

  /**
   * 🔍 Verbindungsstatus prüfen
   */
  async checkConnection(accessToken: string, accountId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/backstage/api/${this.version}/${accountId}/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * 📋 Taboola Accounts abrufen
   */
  async getAccounts(accessToken: string): Promise<MultiPlatformApiResponse<any[]>> {
    try {
      const response = await fetch(
        `${this.apiUrl}/backstage/api/${this.version}/users/current/allowed-accounts`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Taboola API error: ${response.status}`);
      }

      const data = await response.json();

      const accounts = (data.results || []).map((account: any) => ({
        id: account.account_id,
        name: account.account_name,
        type: account.type,
        currency: account.currency,
      }));

      return {
        success: true,
        data: accounts,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'TABOOLA_ACCOUNTS_ERROR',
          message: error.message || 'Failed to fetch Taboola accounts',
          platform: 'taboola',
        },
      };
    }
  }

  /**
   * 🔄 Status-Mapping
   */
  private mapTaboolaStatus(isActive: boolean): 'ENABLED' | 'PAUSED' | 'REMOVED' | 'DRAFT' {
    return isActive ? 'ENABLED' : 'PAUSED';
  }
}
