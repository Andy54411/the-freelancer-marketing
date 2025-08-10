// 🎯 META ADS SERVICE (Facebook & Instagram)
// Integration mit Meta Marketing API

import { MultiPlatformApiResponse, UnifiedCampaign, UnifiedMetrics } from '@/types/advertising';

export class MetaAdsService {
  private apiUrl = 'https://graph.facebook.com';
  private version = 'v19.0';

  constructor() {
    // Meta Marketing API Setup
  }

  /**
   * 🔗 Meta OAuth URL generieren
   */
  generateAuthUrl(companyId: string, redirectUri: string): string {
    const scopes = [
      'ads_management',
      'ads_read',
      'business_management',
      'pages_read_engagement',
    ].join(',');

    const params = new URLSearchParams({
      client_id: process.env.META_APP_ID || '',
      redirect_uri: redirectUri,
      state: companyId,
      scope: scopes,
      response_type: 'code',
    });

    return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * 🎯 Meta Kampagnen abrufen
   */
  async getCampaigns(
    accessToken: string,
    adAccountId: string
  ): Promise<MultiPlatformApiResponse<UnifiedCampaign[]>> {
    try {
      const fields = [
        'id',
        'name',
        'status',
        'objective',
        'created_time',
        'start_time',
        'stop_time',
        'daily_budget',
        'lifetime_budget',
        'budget_remaining',
        'spend_cap',
      ].join(',');

      const url = `${this.apiUrl}/${this.version}/act_${adAccountId}/campaigns?fields=${fields}&access_token=${accessToken}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Meta API error: ${response.status}`);
      }

      const data = await response.json();

      const campaigns: UnifiedCampaign[] = (data.data || []).map((campaign: any) => ({
        id: campaign.id || '',
        name: campaign.name || '',
        platform: 'meta' as const,
        status: this.mapMetaStatus(campaign.status),
        type: campaign.objective || 'CONVERSIONS',
        startDate: campaign.start_time
          ? new Date(campaign.start_time).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        endDate: campaign.stop_time
          ? new Date(campaign.stop_time).toISOString().split('T')[0]
          : undefined,
        budget: {
          amount: campaign.daily_budget
            ? Math.round(campaign.daily_budget / 100)
            : campaign.lifetime_budget
              ? Math.round(campaign.lifetime_budget / 100)
              : 0,
          currency: 'EUR',
          period: campaign.daily_budget ? ('DAILY' as const) : ('LIFETIME' as const),
          spent: campaign.spend_cap ? Math.round(campaign.spend_cap / 100) : undefined,
          remaining: campaign.budget_remaining
            ? Math.round(campaign.budget_remaining / 100)
            : undefined,
        },
        targeting: {
          locations: [],
          demographics: {},
          interests: [],
          placements: ['facebook', 'instagram'],
        },
        creative: {
          headlines: [],
          descriptions: [],
          images: [],
          callToAction: 'LEARN_MORE',
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
          reach: 0,
          frequency: 0,
          engagement: 0,
        },
        platformSpecific: {
          meta: {
            campaignId: campaign.id,
            objective: campaign.objective,
            optimizationGoal: campaign.optimization_goal,
            bidStrategy: campaign.bid_strategy,
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
          code: 'META_API_ERROR',
          message: error.message || 'Failed to fetch Meta campaigns',
          platform: 'meta',
        },
      };
    }
  }

  /**
   * 📊 Meta Analytics abrufen
   */
  async getAnalytics(
    accessToken: string,
    adAccountId: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<MultiPlatformApiResponse<{ summary: UnifiedMetrics; campaignCount: number }>> {
    try {
      const startDate =
        dateRange?.startDate ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = dateRange?.endDate || new Date().toISOString().split('T')[0];

      const fields = [
        'impressions',
        'clicks',
        'spend',
        'reach',
        'frequency',
        'actions',
        'action_values',
        'ctr',
        'cpc',
        'cpm',
        'cpp',
      ].join(',');

      const url = `${this.apiUrl}/${this.version}/act_${adAccountId}/insights?fields=${fields}&time_range={"since":"${startDate}","until":"${endDate}"}&access_token=${accessToken}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Meta Insights API error: ${response.status}`);
      }

      const data = await response.json();
      const insights = data.data?.[0] || {};

      // Conversions aus actions extrahieren
      const conversions =
        insights.actions?.find(
          (action: any) => action.action_type === 'purchase' || action.action_type === 'lead'
        )?.value || 0;

      const conversionValue =
        insights.action_values?.find(
          (value: any) => value.action_type === 'purchase' || value.action_type === 'lead'
        )?.value || 0;

      const summary: UnifiedMetrics = {
        impressions: parseInt(insights.impressions || '0'),
        clicks: parseInt(insights.clicks || '0'),
        cost: Math.round(parseFloat(insights.spend || '0') * 100), // Convert to cents
        conversions: parseInt(conversions),
        conversionValue: Math.round(parseFloat(conversionValue) * 100),
        ctr: parseFloat(insights.ctr || '0'),
        cpc: Math.round(parseFloat(insights.cpc || '0') * 100),
        cpa:
          conversions > 0 ? Math.round((parseFloat(insights.spend || '0') * 100) / conversions) : 0,
        roas:
          parseFloat(insights.spend || '0') > 0
            ? parseFloat(conversionValue) / parseFloat(insights.spend || '1')
            : 0,
        reach: parseInt(insights.reach || '0'),
        frequency: parseFloat(insights.frequency || '0'),
        engagement:
          insights.actions?.reduce((sum: number, action: any) => {
            if (['like', 'comment', 'share', 'reaction'].includes(action.action_type)) {
              return sum + parseInt(action.value || '0');
            }
            return sum;
          }, 0) || 0,
      };

      return {
        success: true,
        data: {
          summary,
          campaignCount: 1, // Meta returns aggregated data
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'META_ANALYTICS_ERROR',
          message: error.message || 'Failed to fetch Meta analytics',
          platform: 'meta',
        },
      };
    }
  }

  /**
   * ✅ Meta Kampagne erstellen
   */
  async createCampaign(
    accessToken: string,
    adAccountId: string,
    campaignData: {
      name: string;
      objective: string;
      budget: { amount: number; currency: string; period: 'DAILY' | 'LIFETIME' };
      targeting?: any;
    }
  ): Promise<MultiPlatformApiResponse<{ campaignId: string }>> {
    try {
      const campaignPayload = {
        name: campaignData.name,
        objective: campaignData.objective || 'CONVERSIONS',
        status: 'PAUSED', // Start paused for review
        special_ad_categories: [],
        access_token: accessToken,
      };

      // Budget hinzufügen
      if (campaignData.budget.period === 'DAILY') {
        (campaignPayload as any).daily_budget = campaignData.budget.amount * 100; // Meta expects cents
      } else {
        (campaignPayload as any).lifetime_budget = campaignData.budget.amount * 100;
      }

      const response = await fetch(`${this.apiUrl}/${this.version}/act_${adAccountId}/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Meta Campaign creation failed: ${errorData.error?.message || response.status}`
        );
      }

      const result = await response.json();

      return {
        success: true,
        data: { campaignId: result.id },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'META_CAMPAIGN_CREATION_ERROR',
          message: error.message || 'Failed to create Meta campaign',
          platform: 'meta',
        },
      };
    }
  }

  /**
   * 🔍 Verbindungsstatus prüfen
   */
  async checkConnection(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/${this.version}/me?access_token=${accessToken}`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * 📋 Ad Accounts abrufen
   */
  async getAdAccounts(accessToken: string): Promise<MultiPlatformApiResponse<any[]>> {
    try {
      const fields = 'id,name,account_status,currency,timezone_name';
      const url = `${this.apiUrl}/${this.version}/me/adaccounts?fields=${fields}&access_token=${accessToken}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Meta API error: ${response.status}`);
      }

      const data = await response.json();

      const accounts = (data.data || []).map((account: any) => ({
        id: account.id.replace('act_', ''),
        name: account.name,
        status: account.account_status,
        currency: account.currency,
        timezone: account.timezone_name,
      }));

      return {
        success: true,
        data: accounts,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'META_ACCOUNTS_ERROR',
          message: error.message || 'Failed to fetch Meta ad accounts',
          platform: 'meta',
        },
      };
    }
  }

  /**
   * 🔄 Status-Mapping
   */
  private mapMetaStatus(status: string): 'ENABLED' | 'PAUSED' | 'REMOVED' | 'DRAFT' {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'ENABLED';
      case 'PAUSED':
        return 'PAUSED';
      case 'DELETED':
      case 'ARCHIVED':
        return 'REMOVED';
      case 'DRAFT':
        return 'DRAFT';
      default:
        return 'PAUSED';
    }
  }
}
