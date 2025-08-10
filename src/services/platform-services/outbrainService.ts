// 🎯 OUTBRAIN SERVICE
// Integration mit Outbrain Amplify API

import { MultiPlatformApiResponse, UnifiedCampaign, UnifiedMetrics } from '@/types/advertising';

export class OutbrainService {
  private apiUrl = 'https://api.outbrain.com';
  private version = 'v0.1';

  constructor() {
    // Outbrain Amplify API Setup
  }

  /**
   * 🔗 Outbrain OAuth URL generieren
   */
  generateAuthUrl(companyId: string, redirectUri: string): string {
    // Outbrain verwendet oft API Keys, aber für OAuth Konsistenz:
    const params = new URLSearchParams({
      client_id: process.env.OUTBRAIN_CLIENT_ID || '',
      redirect_uri: redirectUri,
      state: companyId,
      response_type: 'code',
      scope: 'read_campaigns,write_campaigns,read_reports',
    });

    return `https://api.outbrain.com/amplify/v0.1/oauth/authorize?${params.toString()}`;
  }

  /**
   * 🎯 Outbrain Kampagnen abrufen
   */
  async getCampaigns(
    accessToken: string,
    accountId: string
  ): Promise<MultiPlatformApiResponse<UnifiedCampaign[]>> {
    try {
      const url = `${this.apiUrl}/amplify/${this.version}/campaigns?marketerId=${accountId}`;

      const response = await fetch(url, {
        headers: {
          'OB-TOKEN-V1': accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Outbrain API error: ${response.status}`);
      }

      const data = await response.json();

      const campaigns: UnifiedCampaign[] = (data.campaigns || []).map((campaign: any) => ({
        id: campaign.id || '',
        name: campaign.name || '',
        platform: 'outbrain' as const,
        status: this.mapOutbrainStatus(campaign.enabled),
        type: campaign.contentType || 'PROMOTED_CONTENT',
        startDate: campaign.creationTime
          ? new Date(campaign.creationTime).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        endDate: campaign.endTime
          ? new Date(campaign.endTime).toISOString().split('T')[0]
          : undefined,
        budget: {
          amount: campaign.budget?.amount ? Math.round(campaign.budget.amount) : 0,
          currency: campaign.budget?.currency || 'USD',
          period: campaign.budget?.type === 'DAILY' ? ('DAILY' as const) : ('LIFETIME' as const),
          spent: campaign.spent ? Math.round(campaign.spent) : undefined,
        },
        targeting: {
          locations: campaign.targeting?.geo || [],
          demographics: {
            ageMin: campaign.targeting?.age?.min,
            ageMax: campaign.targeting?.age?.max,
          },
          interests: campaign.targeting?.interests || [],
          placements: campaign.targeting?.publishers || [],
        },
        creative: {
          headlines: [],
          descriptions: [],
          images: [],
          callToAction: 'DISCOVER_MORE',
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
          outbrain: {
            campaignId: campaign.id,
            contentType: campaign.contentType,
            biddingStrategy: campaign.defaultBid?.type || 'CPC',
            onAirType: campaign.onAirType,
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
          code: 'OUTBRAIN_API_ERROR',
          message: error.message || 'Failed to fetch Outbrain campaigns',
          platform: 'outbrain',
        },
      };
    }
  }

  /**
   * 📊 Outbrain Analytics abrufen
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

      const url = `${this.apiUrl}/amplify/${this.version}/reports/marketers/${accountId}?breakdown=campaign&from=${startDate}&to=${endDate}&metrics=impressions,clicks,spend,conversions,ctr,cpc`;

      const response = await fetch(url, {
        headers: {
          'OB-TOKEN-V1': accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Outbrain Analytics API error: ${response.status}`);
      }

      const data = await response.json();
      const results = data.results || [];

      const summary = results.reduce(
        (acc: any, result: any) => ({
          impressions: acc.impressions + (result.impressions || 0),
          clicks: acc.clicks + (result.clicks || 0),
          cost: acc.cost + (result.spend ? Math.round(result.spend * 100) : 0), // Convert to cents
          conversions: acc.conversions + (result.conversions || 0),
          conversionValue:
            acc.conversionValue +
            (result.conversionValue ? Math.round(result.conversionValue * 100) : 0),
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
          code: 'OUTBRAIN_ANALYTICS_ERROR',
          message: error.message || 'Failed to fetch Outbrain analytics',
          platform: 'outbrain',
        },
      };
    }
  }

  /**
   * ✅ Outbrain Kampagne erstellen
   */
  async createCampaign(
    accessToken: string,
    accountId: string,
    campaignData: {
      name: string;
      contentType: string;
      budget: { amount: number; currency: string; type: string };
      targeting?: any;
      url: string;
    }
  ): Promise<MultiPlatformApiResponse<{ campaignId: string }>> {
    try {
      const campaignPayload = {
        name: campaignData.name,
        enabled: false, // Start disabled for review
        budget: {
          amount: campaignData.budget.amount,
          currency: campaignData.budget.currency || 'USD',
          type: campaignData.budget.type || 'DAILY',
        },
        defaultBid: {
          amount: 0.5, // Default CPC
          type: 'CPC',
        },
        contentType: campaignData.contentType || 'PROMOTED_LINKS',
        onAirType: 'Branded',
        // Targeting
        targeting: {
          geo: campaignData.targeting?.locations || ['US'],
          platforms: ['DESKTOP', 'MOBILE'],
          ...(campaignData.targeting || {}),
        },
      };

      const response = await fetch(
        `${this.apiUrl}/amplify/${this.version}/campaigns?marketerId=${accountId}`,
        {
          method: 'POST',
          headers: {
            'OB-TOKEN-V1': accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(campaignPayload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Outbrain Campaign creation failed: ${errorData.message || response.status}`
        );
      }

      const result = await response.json();

      return {
        success: true,
        data: { campaignId: result.id || result.campaignId },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'OUTBRAIN_CAMPAIGN_CREATION_ERROR',
          message: error.message || 'Failed to create Outbrain campaign',
          platform: 'outbrain',
        },
      };
    }
  }

  /**
   * 🔍 Verbindungsstatus prüfen
   */
  async checkConnection(accessToken: string, accountId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.apiUrl}/amplify/${this.version}/marketers/${accountId}`,
        {
          headers: {
            'OB-TOKEN-V1': accessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * 📋 Outbrain Marketers (Accounts) abrufen
   */
  async getMarketers(accessToken: string): Promise<MultiPlatformApiResponse<any[]>> {
    try {
      const response = await fetch(`${this.apiUrl}/amplify/${this.version}/marketers`, {
        headers: {
          'OB-TOKEN-V1': accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Outbrain API error: ${response.status}`);
      }

      const data = await response.json();

      const marketers = (data.marketers || []).map((marketer: any) => ({
        id: marketer.id,
        name: marketer.name,
        currency: marketer.currency,
        timezone: marketer.timezone,
      }));

      return {
        success: true,
        data: marketers,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'OUTBRAIN_MARKETERS_ERROR',
          message: error.message || 'Failed to fetch Outbrain marketers',
          platform: 'outbrain',
        },
      };
    }
  }

  /**
   * 🔄 Status-Mapping
   */
  private mapOutbrainStatus(enabled: boolean): 'ENABLED' | 'PAUSED' | 'REMOVED' | 'DRAFT' {
    return enabled ? 'ENABLED' : 'PAUSED';
  }
}
