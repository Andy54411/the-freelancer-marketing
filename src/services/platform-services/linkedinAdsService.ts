// 🎯 LINKEDIN ADS SERVICE
// Integration mit LinkedIn Marketing Solutions API

import { MultiPlatformApiResponse, UnifiedCampaign, UnifiedMetrics } from '@/types/advertising';

export class LinkedInAdsService {
  private apiUrl = 'https://api.linkedin.com/v2';
  private version = 'v2';

  constructor() {
    // LinkedIn Marketing Solutions API Setup
  }

  /**
   * 🔗 LinkedIn OAuth URL generieren
   */
  generateAuthUrl(companyId: string, redirectUri: string): string {
    const scopes = ['r_ads', 'rw_ads', 'r_ads_reporting', 'r_organization_social'].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.LINKEDIN_CLIENT_ID || '',
      redirect_uri: redirectUri,
      state: companyId,
      scope: scopes,
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  /**
   * 🎯 LinkedIn Kampagnen abrufen
   */
  async getCampaigns(
    accessToken: string,
    accountId: string
  ): Promise<MultiPlatformApiResponse<UnifiedCampaign[]>> {
    try {
      // LinkedIn Campaign Groups (entspricht Kampagnen)
      const response = await fetch(
        `${this.apiUrl}/adCampaignGroupsV2?q=search&search.account.values=List(urn:li:sponsoredAccount:${accountId})`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`LinkedIn API error: ${response.status}`);
      }

      const data = await response.json();

      const campaigns: UnifiedCampaign[] = (data.elements || []).map((campaign: any) => ({
        id: campaign.id?.toString() || '',
        name: campaign.name || '',
        platform: 'linkedin' as const,
        status: this.mapLinkedInStatus(campaign.status),
        type: campaign.type || 'SPONSORED_CONTENT',
        startDate: campaign.runSchedule?.start
          ? new Date(campaign.runSchedule.start).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        endDate: campaign.runSchedule?.end
          ? new Date(campaign.runSchedule.end).toISOString().split('T')[0]
          : undefined,
        budget: {
          amount: campaign.dailyBudget?.amount ? Math.round(campaign.dailyBudget.amount / 1000) : 0,
          currency: campaign.dailyBudget?.currencyCode || 'EUR',
          period: 'DAILY' as const,
        },
        targeting: {
          locations: campaign.targeting?.locations || [],
          demographics: {},
          interests: campaign.targeting?.interests || [],
        },
        creative: {
          headlines: [],
          descriptions: [],
          images: [],
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
          linkedin: {
            campaignGroupId: campaign.id,
            objectiveType: campaign.objectiveType,
            format: campaign.format,
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
          code: 'LINKEDIN_API_ERROR',
          message: error.message || 'Failed to fetch LinkedIn campaigns',
          platform: 'linkedin',
        },
      };
    }
  }

  /**
   * 📊 LinkedIn Analytics abrufen
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

      // LinkedIn Analytics API
      const analyticsUrl = `${this.apiUrl}/adAnalyticsV2?q=analytics&pivot=CAMPAIGN&dateRange.start.day=${startDate.split('-')[2]}&dateRange.start.month=${startDate.split('-')[1]}&dateRange.start.year=${startDate.split('-')[0]}&dateRange.end.day=${endDate.split('-')[2]}&dateRange.end.month=${endDate.split('-')[1]}&dateRange.end.year=${endDate.split('-')[0]}&campaigns=List(urn:li:sponsoredCampaign:*)`;

      const response = await fetch(analyticsUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });

      if (!response.ok) {
        throw new Error(`LinkedIn Analytics API error: ${response.status}`);
      }

      const data = await response.json();
      const elements = data.elements || [];

      const summary = elements.reduce(
        (acc: any, element: any) => ({
          impressions: acc.impressions + (element.impressions || 0),
          clicks: acc.clicks + (element.clicks || 0),
          cost: acc.cost + (element.costInUsd ? element.costInUsd * 100 : 0), // Convert to cents
          conversions: acc.conversions + (element.externalWebsiteConversions || 0),
          conversionValue:
            acc.conversionValue +
            (element.conversionValueInUsd ? element.conversionValueInUsd * 100 : 0),
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
          campaignCount: elements.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'LINKEDIN_ANALYTICS_ERROR',
          message: error.message || 'Failed to fetch LinkedIn analytics',
          platform: 'linkedin',
        },
      };
    }
  }

  /**
   * ✅ LinkedIn Kampagne erstellen
   */
  async createCampaign(
    accessToken: string,
    accountId: string,
    campaignData: {
      name: string;
      objectiveType: string;
      budget: { amount: number; currency: string };
      targeting?: any;
    }
  ): Promise<MultiPlatformApiResponse<{ campaignId: string }>> {
    try {
      // LinkedIn Campaign Group erstellen
      const campaignGroupPayload = {
        name: campaignData.name,
        status: 'DRAFT',
        type: 'SPONSORED_CONTENT',
        account: `urn:li:sponsoredAccount:${accountId}`,
        objectiveType: campaignData.objectiveType || 'WEBSITE_CONVERSIONS',
        runSchedule: {
          start: Date.now(),
        },
        dailyBudget: {
          amount: campaignData.budget.amount * 1000, // LinkedIn expects micro amounts
          currencyCode: campaignData.budget.currency,
        },
      };

      const response = await fetch(`${this.apiUrl}/adCampaignGroupsV2`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(campaignGroupPayload),
      });

      if (!response.ok) {
        throw new Error(`LinkedIn Campaign creation failed: ${response.status}`);
      }

      const result = await response.json();
      const campaignId = result.id;

      return {
        success: true,
        data: { campaignId: campaignId.toString() },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'LINKEDIN_CAMPAIGN_CREATION_ERROR',
          message: error.message || 'Failed to create LinkedIn campaign',
          platform: 'linkedin',
        },
      };
    }
  }

  /**
   * 🔍 Verbindungsstatus prüfen
   */
  async checkConnection(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/me`, {
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
   * 🔄 Status-Mapping
   */
  private mapLinkedInStatus(status: string): 'ENABLED' | 'PAUSED' | 'REMOVED' | 'DRAFT' {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'ENABLED';
      case 'PAUSED':
        return 'PAUSED';
      case 'ARCHIVED':
        return 'REMOVED';
      case 'DRAFT':
        return 'DRAFT';
      default:
        return 'PAUSED';
    }
  }
}
