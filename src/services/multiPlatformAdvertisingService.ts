// 🎯 TASKILO MULTI-PLATFORM ADVERTISING SERVICE
// Zentrale Verwaltung aller Werbeplattformen

import {
  AdvertisingPlatform,
  PlatformCredentials,
  UnifiedCampaign,
  UnifiedAnalytics,
  PlatformConnection,
  MultiPlatformApiResponse,
  UnifiedMetrics,
} from '@/types/advertising';

// Platform-spezifische Services
import { GoogleAdsClientService } from './googleAdsClientService';
import { LinkedInAdsService } from './platform-services/linkedinAdsService';
import { MetaAdsService } from './platform-services/metaAdsService';
import { TaboolaService } from './platform-services/taboolaService';
import { OutbrainService } from './platform-services/outbrainService';
import { advertisingFirebaseService } from './firebase/advertisingService';

export class MultiPlatformAdvertisingService {
  private googleAdsService: GoogleAdsClientService;
  private linkedinService: LinkedInAdsService;
  private metaService: MetaAdsService;
  private taboolaService: TaboolaService;
  private outbrainService: OutbrainService;

  constructor() {
    this.googleAdsService = new GoogleAdsClientService();
    this.linkedinService = new LinkedInAdsService();
    this.metaService = new MetaAdsService();
    this.taboolaService = new TaboolaService();
    this.outbrainService = new OutbrainService();
  }

  /**
   * 🔗 Platform-Verbindungen verwalten
   */
  async connectPlatform(
    platform: AdvertisingPlatform,
    companyId: string,
    authData: any
  ): Promise<MultiPlatformApiResponse<PlatformConnection>> {
    try {
      switch (platform) {
        case 'google-ads':
          return this.connectGoogleAds(companyId, authData);
        case 'linkedin':
          return this.connectLinkedIn(companyId, authData);
        case 'meta':
          return this.connectMeta(companyId, authData);
        case 'taboola':
          return this.connectTaboola(companyId, authData);
        case 'outbrain':
          return this.connectOutbrain(companyId, authData);
        default:
          return {
            success: false,
            error: {
              code: 'UNSUPPORTED_PLATFORM',
              message: `Platform ${platform} is not supported`,
              platform,
            },
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: error.message || 'Failed to connect platform',
          platform,
        },
      };
    }
  }

  /**
   * 📊 Alle Platform-Verbindungen abrufen
   */
  async getAllPlatformConnections(
    companyId: string
  ): Promise<MultiPlatformApiResponse<PlatformConnection[]>> {
    try {
      // Zuerst cached connections aus Firestore laden
      const cachedConnections =
        await advertisingFirebaseService.getAllPlatformConnections(companyId);

      const platforms: AdvertisingPlatform[] = [
        'google-ads',
        'linkedin',
        'meta',
        'taboola',
        'outbrain',
      ];
      const connections: PlatformConnection[] = [];

      for (const platform of platforms) {
        try {
          // Schaue zuerst in cached connections
          const cached = cachedConnections.find(c => c.platform === platform);

          if (cached && cached.status !== 'error') {
            connections.push(cached);
          } else {
            // Fallback: Status real-time prüfen
            const status = await this.checkPlatformConnection(companyId, platform);
            connections.push(status);

            // Status in Firestore speichern
            await advertisingFirebaseService.savePlatformConnection(companyId, status);
          }
        } catch (error) {
          const errorConnection: PlatformConnection = {
            platform,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          };
          connections.push(errorConnection);

          // Error state auch speichern
          await advertisingFirebaseService.savePlatformConnection(companyId, errorConnection);
        }
      }

      return {
        success: true,
        data: connections,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'FETCH_CONNECTIONS_ERROR',
          message: error.message || 'Failed to fetch platform connections',
        },
      };
    }
  }

  /**
   * 🎯 Alle Kampagnen von allen Plattformen abrufen
   */
  async getAllCampaigns(companyId: string): Promise<MultiPlatformApiResponse<UnifiedCampaign[]>> {
    try {
      const allCampaigns: UnifiedCampaign[] = [];
      const platforms: AdvertisingPlatform[] = [
        'google-ads',
        'linkedin',
        'meta',
        'taboola',
        'outbrain',
      ];

      for (const platform of platforms) {
        try {
          // Prüfe Cache-Validität (15 Minuten)
          const cacheValid = await advertisingFirebaseService.isCacheValid(
            companyId,
            platform,
            15 * 60 * 1000
          );

          let platformCampaigns: UnifiedCampaign[] = [];

          if (cacheValid) {
            // Verwende cached Daten
            platformCampaigns = await advertisingFirebaseService.getCachedCampaigns(
              companyId,
              platform
            );

          } else {
            // Lade frische Daten von API
            const apiResult = await this.getCampaignsByPlatform(companyId, platform);
            if (apiResult.success && apiResult.data) {
              platformCampaigns = apiResult.data;

              // Speichere in Cache
              await advertisingFirebaseService.saveCampaigns(
                companyId,
                platform,
                platformCampaigns
              );

            }
          }

          allCampaigns.push(...platformCampaigns);
        } catch (error) {

          // Fallback zu cached Daten auch bei Fehlern
          try {
            const fallbackCampaigns = await advertisingFirebaseService.getCachedCampaigns(
              companyId,
              platform
            );
            if (fallbackCampaigns.length > 0) {
              allCampaigns.push(...fallbackCampaigns);

            }
          } catch (cacheError) {

          }
        }
      }

      // Sortiere nach Performance (ROAS)
      allCampaigns.sort((a, b) => (b.metrics.roas || 0) - (a.metrics.roas || 0));

      return {
        success: true,
        data: allCampaigns,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'FETCH_CAMPAIGNS_ERROR',
          message: error.message || 'Failed to fetch campaigns from all platforms',
        },
      };
    }
  }

  /**
   * 📈 Unified Analytics für alle Plattformen
   */
  async getUnifiedAnalytics(
    companyId: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<MultiPlatformApiResponse<UnifiedAnalytics>> {
    try {
      const platforms: AdvertisingPlatform[] = [
        'google-ads',
        'linkedin',
        'meta',
        'taboola',
        'outbrain',
      ];
      const platformBreakdown: UnifiedAnalytics['platformBreakdown'] = [];
      const dailyData: UnifiedAnalytics['dailyData'] = [];

      const totalMetrics: UnifiedMetrics = {
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

      for (const platform of platforms) {
        try {
          const platformAnalytics = await this.getAnalyticsByPlatform(
            companyId,
            platform,
            dateRange
          );

          if (platformAnalytics.success && platformAnalytics.data) {
            const metrics = platformAnalytics.data.summary;

            // Addiere zu total metrics
            totalMetrics.impressions += metrics.impressions;
            totalMetrics.clicks += metrics.clicks;
            totalMetrics.cost += metrics.cost;
            totalMetrics.conversions += metrics.conversions;
            totalMetrics.conversionValue += metrics.conversionValue;

            // Platform breakdown
            platformBreakdown.push({
              platform,
              metrics,
              campaignCount: platformAnalytics.data.campaignCount || 0,
              isActive: metrics.cost > 0,
            });

            // Daily data (falls verfügbar)
            if (platformAnalytics.data.dailyData) {
              dailyData.push(...platformAnalytics.data.dailyData);
            }
          } else {
            // Inactive platform
            platformBreakdown.push({
              platform,
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
              campaignCount: 0,
              isActive: false,
            });
          }
        } catch (error) {

          // Continue mit anderen Plattformen
        }
      }

      // Berechne durchschnittliche Metriken
      totalMetrics.ctr =
        totalMetrics.impressions > 0 ? (totalMetrics.clicks / totalMetrics.impressions) * 100 : 0;
      totalMetrics.cpc = totalMetrics.clicks > 0 ? totalMetrics.cost / totalMetrics.clicks : 0;
      totalMetrics.cpa =
        totalMetrics.conversions > 0 ? totalMetrics.cost / totalMetrics.conversions : 0;
      totalMetrics.roas =
        totalMetrics.cost > 0 ? totalMetrics.conversionValue / totalMetrics.cost : 0;

      // Insights generieren
      const activePlatforms = platformBreakdown.filter(p => p.isActive);
      const bestPerformingPlatform =
        activePlatforms.sort((a, b) => b.metrics.roas - a.metrics.roas)[0]?.platform ||
        'google-ads';
      const worstPerformingPlatform =
        activePlatforms.sort((a, b) => a.metrics.roas - b.metrics.roas)[0]?.platform ||
        'google-ads';

      const insights = {
        bestPerformingPlatform,
        worstPerformingPlatform,
        totalBudgetUtilization:
          activePlatforms.length > 0
            ? activePlatforms.reduce((sum, p) => sum + p.metrics.cost, 0) / activePlatforms.length
            : 0,
        averageRoas:
          activePlatforms.length > 0
            ? activePlatforms.reduce((sum, p) => sum + p.metrics.roas, 0) / activePlatforms.length
            : 0,
        recommendations: this.generateRecommendations(platformBreakdown),
      };

      return {
        success: true,
        data: {
          summary: totalMetrics,
          platformBreakdown,
          dailyData,
          insights,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'ANALYTICS_ERROR',
          message: error.message || 'Failed to fetch unified analytics',
        },
      };
    }
  }

  /**
   * 🎯 Neue Multi-Platform Kampagne erstellen
   */
  async createCampaign(
    companyId: string,
    platform: AdvertisingPlatform,
    campaignData: Partial<UnifiedCampaign>
  ): Promise<MultiPlatformApiResponse<{ campaignId: string }>> {
    try {
      switch (platform) {
        case 'google-ads':
          return this.createGoogleAdsCampaign(companyId, campaignData);
        case 'linkedin':
          return this.createLinkedInCampaign(companyId, campaignData);
        case 'meta':
          return this.createMetaCampaign(companyId, campaignData);
        case 'taboola':
          return this.createTaboolaCampaign(companyId, campaignData);
        case 'outbrain':
          return this.createOutbrainCampaign(companyId, campaignData);
        default:
          return {
            success: false,
            error: {
              code: 'UNSUPPORTED_PLATFORM',
              message: `Campaign creation not supported for ${platform}`,
              platform,
            },
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'CAMPAIGN_CREATION_ERROR',
          message: error.message || 'Failed to create campaign',
          platform,
        },
      };
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  private async checkPlatformConnection(
    companyId: string,
    platform: AdvertisingPlatform
  ): Promise<PlatformConnection> {
    // Implementation für jede Platform
    switch (platform) {
      case 'google-ads':
        return this.checkGoogleAdsConnection(companyId);
      case 'linkedin':
        return this.checkLinkedInConnection(companyId);
      case 'meta':
        return this.checkMetaConnection(companyId);
      case 'taboola':
        return this.checkTaboolaConnection(companyId);
      case 'outbrain':
        return this.checkOutbrainConnection(companyId);
      default:
        return {
          platform,
          status: 'disconnected',
        };
    }
  }

  private async getCampaignsByPlatform(
    companyId: string,
    platform: AdvertisingPlatform
  ): Promise<MultiPlatformApiResponse<UnifiedCampaign[]>> {
    // Implementation für jede Platform
    switch (platform) {
      case 'google-ads':
        return this.getGoogleAdsCampaigns(companyId);
      case 'linkedin':
        return this.getLinkedInCampaigns(companyId);
      case 'meta':
        return this.getMetaCampaigns(companyId);
      case 'taboola':
        return this.getTaboolaCampaigns(companyId);
      case 'outbrain':
        return this.getOutbrainCampaigns(companyId);
      default:
        return { success: true, data: [] };
    }
  }

  private async getAnalyticsByPlatform(
    companyId: string,
    platform: AdvertisingPlatform,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<MultiPlatformApiResponse<any>> {
    switch (platform) {
      case 'google-ads':
        return this.getGoogleAdsAnalytics(companyId, dateRange);
      case 'linkedin':
        return this.getLinkedInAnalytics(companyId, dateRange);
      case 'meta':
        return this.getMetaAnalytics(companyId, dateRange);
      case 'taboola':
        return this.getTaboolaAnalytics(companyId, dateRange);
      case 'outbrain':
        return this.getOutbrainAnalytics(companyId, dateRange);
      default:
        return {
          success: false,
          error: { code: 'UNSUPPORTED_PLATFORM', message: 'Platform not supported' },
        };
    }
  }

  private generateRecommendations(
    platformBreakdown: UnifiedAnalytics['platformBreakdown']
  ): string[] {
    const recommendations: string[] = [];

    const activePlatforms = platformBreakdown.filter(p => p.isActive);
    if (activePlatforms.length === 0) {
      recommendations.push(
        'Starten Sie Ihre erste Werbekampagne auf einer der verfügbaren Plattformen'
      );
      return recommendations;
    }

    // Best performing platform
    const bestPlatform = activePlatforms.sort((a, b) => b.metrics.roas - a.metrics.roas)[0];
    if (bestPlatform.metrics.roas > 2) {
      recommendations.push(
        `${bestPlatform.platform} zeigt excellent Performance (ROAS: ${bestPlatform.metrics.roas.toFixed(2)}). Erhöhen Sie das Budget hier.`
      );
    }

    // Poor performing platforms
    const poorPlatforms = activePlatforms.filter(p => p.metrics.roas < 1);
    if (poorPlatforms.length > 0) {
      recommendations.push(
        `Überprüfen Sie die Performance von ${poorPlatforms.map(p => p.platform).join(', ')} - ROAS unter 1.0`
      );
    }

    // Unutilized platforms
    const inactivePlatforms = platformBreakdown.filter(p => !p.isActive);
    if (inactivePlatforms.length > 0) {
      recommendations.push(
        `Erwägen Sie Tests auf ${inactivePlatforms.map(p => p.platform).join(', ')} für zusätzliche Reichweite`
      );
    }

    return recommendations;
  }

  // Platform-spezifische Implementierungen (werden in separaten Dateien implementiert)
  private async connectGoogleAds(
    companyId: string,
    authData: any
  ): Promise<MultiPlatformApiResponse<PlatformConnection>> {
    // Implementation delegieren an GoogleAdsClientService
    return { success: true, data: { platform: 'google-ads', status: 'connected' } };
  }

  private async connectLinkedIn(
    companyId: string,
    authData: any
  ): Promise<MultiPlatformApiResponse<PlatformConnection>> {
    return { success: true, data: { platform: 'linkedin', status: 'connected' } };
  }

  private async connectMeta(
    companyId: string,
    authData: any
  ): Promise<MultiPlatformApiResponse<PlatformConnection>> {
    return { success: true, data: { platform: 'meta', status: 'connected' } };
  }

  private async connectTaboola(
    companyId: string,
    authData: any
  ): Promise<MultiPlatformApiResponse<PlatformConnection>> {
    return { success: true, data: { platform: 'taboola', status: 'connected' } };
  }

  private async connectOutbrain(
    companyId: string,
    authData: any
  ): Promise<MultiPlatformApiResponse<PlatformConnection>> {
    return { success: true, data: { platform: 'outbrain', status: 'connected' } };
  }

  // Connection checks
  private async checkGoogleAdsConnection(companyId: string): Promise<PlatformConnection> {
    return { platform: 'google-ads', status: 'connected' };
  }

  private async checkLinkedInConnection(companyId: string): Promise<PlatformConnection> {
    return { platform: 'linkedin', status: 'disconnected' };
  }

  private async checkMetaConnection(companyId: string): Promise<PlatformConnection> {
    return { platform: 'meta', status: 'disconnected' };
  }

  private async checkTaboolaConnection(companyId: string): Promise<PlatformConnection> {
    return { platform: 'taboola', status: 'disconnected' };
  }

  private async checkOutbrainConnection(companyId: string): Promise<PlatformConnection> {
    return { platform: 'outbrain', status: 'disconnected' };
  }

  // Campaign methods (TO BE IMPLEMENTED)
  private async getGoogleAdsCampaigns(
    companyId: string
  ): Promise<MultiPlatformApiResponse<UnifiedCampaign[]>> {
    return { success: true, data: [] };
  }

  private async getLinkedInCampaigns(
    companyId: string
  ): Promise<MultiPlatformApiResponse<UnifiedCampaign[]>> {
    return { success: true, data: [] };
  }

  private async getMetaCampaigns(
    companyId: string
  ): Promise<MultiPlatformApiResponse<UnifiedCampaign[]>> {
    return { success: true, data: [] };
  }

  private async getTaboolaCampaigns(
    companyId: string
  ): Promise<MultiPlatformApiResponse<UnifiedCampaign[]>> {
    return { success: true, data: [] };
  }

  private async getOutbrainCampaigns(
    companyId: string
  ): Promise<MultiPlatformApiResponse<UnifiedCampaign[]>> {
    return { success: true, data: [] };
  }

  // Analytics methods (TO BE IMPLEMENTED)
  private async getGoogleAdsAnalytics(
    companyId: string,
    dateRange?: any
  ): Promise<MultiPlatformApiResponse<any>> {
    return { success: true, data: { summary: {}, campaignCount: 0, dailyData: [] } };
  }

  private async getLinkedInAnalytics(
    companyId: string,
    dateRange?: any
  ): Promise<MultiPlatformApiResponse<any>> {
    return { success: true, data: { summary: {}, campaignCount: 0, dailyData: [] } };
  }

  private async getMetaAnalytics(
    companyId: string,
    dateRange?: any
  ): Promise<MultiPlatformApiResponse<any>> {
    return { success: true, data: { summary: {}, campaignCount: 0, dailyData: [] } };
  }

  private async getTaboolaAnalytics(
    companyId: string,
    dateRange?: any
  ): Promise<MultiPlatformApiResponse<any>> {
    return { success: true, data: { summary: {}, campaignCount: 0, dailyData: [] } };
  }

  private async getOutbrainAnalytics(
    companyId: string,
    dateRange?: any
  ): Promise<MultiPlatformApiResponse<any>> {
    return { success: true, data: { summary: {}, campaignCount: 0, dailyData: [] } };
  }

  // Campaign creation methods (TO BE IMPLEMENTED)
  private async createGoogleAdsCampaign(
    companyId: string,
    campaignData: any
  ): Promise<MultiPlatformApiResponse<{ campaignId: string }>> {
    return { success: true, data: { campaignId: 'google-test-campaign' } };
  }

  private async createLinkedInCampaign(
    companyId: string,
    campaignData: any
  ): Promise<MultiPlatformApiResponse<{ campaignId: string }>> {
    return { success: true, data: { campaignId: 'linkedin-test-campaign' } };
  }

  private async createMetaCampaign(
    companyId: string,
    campaignData: any
  ): Promise<MultiPlatformApiResponse<{ campaignId: string }>> {
    return { success: true, data: { campaignId: 'meta-test-campaign' } };
  }

  private async createTaboolaCampaign(
    companyId: string,
    campaignData: any
  ): Promise<MultiPlatformApiResponse<{ campaignId: string }>> {
    return { success: true, data: { campaignId: 'taboola-test-campaign' } };
  }

  private async createOutbrainCampaign(
    companyId: string,
    campaignData: any
  ): Promise<MultiPlatformApiResponse<{ campaignId: string }>> {
    return { success: true, data: { campaignId: 'outbrain-test-campaign' } };
  }
}

// Singleton Export
export const multiPlatformAdvertisingService = new MultiPlatformAdvertisingService();
