// 🚀 PHASE 2: Google Ads Performance Analytics API
// Metriken und Performance-Daten für Kampagnen

import { NextRequest, NextResponse } from 'next/server';
import { googleAdsService } from '@/services/googleAdsService';
import { GoogleAdsSetupValidator } from '@/utils/googleAdsSetupValidator';
import type { GoogleAdsOAuthConfig } from '@/types/googleAds';

/**
 * 📊 GET /api/google-ads/metrics - Kampagnen-Metriken abrufen
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const campaignId = searchParams.get('campaignId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!customerId || !campaignId) {
      return NextResponse.json(
        { error: 'Customer ID and Campaign ID are required' },
        { status: 400 }
      );
    }

    // Datumsbereich validieren
    const dateRange = {
      startDate:
        startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: endDate || new Date().toISOString().split('T')[0],
    };

    // OAuth Config validieren
    const configValidation = GoogleAdsSetupValidator.validateSetup();
    if (!configValidation.valid) {
      return NextResponse.json(
        {
          error: 'Google Ads configuration invalid',
          details: configValidation.errors,
        },
        { status: 400 }
      );
    }

    // Environment Config laden
    const config = {
      clientId: process.env.GOOGLE_ADS_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refreshToken: '',
      developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    } as GoogleAdsOAuthConfig;

    // Kampagnen-Metriken abrufen - verwende getCampaigns vorerst
    const result = await googleAdsService.getCampaigns(config, customerId);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Failed to fetch campaign metrics',
          details: result.error,
        },
        { status: 500 }
      );
    }

    // Finde die spezifische Kampagne
    const campaign = result.data?.campaigns?.find(c => c.id === campaignId);

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        metrics: campaign.metrics,
        dateRange,
        campaignId,
        customerId,
        campaignName: campaign.name,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Metrics fetch error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * 📈 POST /api/google-ads/metrics/report - Umfassender Performance Report
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, campaignIds, dateRange, metrics, dimensions } = body as {
      customerId: string;
      campaignIds?: string[];
      dateRange: { startDate: string; endDate: string };
      metrics: string[];
      dimensions?: string[];
    };

    if (!customerId || !dateRange) {
      return NextResponse.json(
        { error: 'Customer ID and date range are required' },
        { status: 400 }
      );
    }

    // OAuth Config validieren
    const configValidation = GoogleAdsSetupValidator.validateSetup();
    if (!configValidation.valid) {
      return NextResponse.json(
        {
          error: 'Google Ads configuration invalid',
          details: configValidation.errors,
        },
        { status: 400 }
      );
    }

    // Environment Config laden
    const config = {
      clientId: process.env.GOOGLE_ADS_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refreshToken: '',
      developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    } as GoogleAdsOAuthConfig;

    // Performance Report erstellen
    const reportData = {
      customerId,
      campaignIds,
      dateRange,
      metrics: metrics || [
        'impressions',
        'clicks',
        'cost_micros',
        'conversions',
        'conversion_value_micros',
        'ctr',
        'average_cpc',
      ],
      dimensions: dimensions || ['campaign.name', 'segments.date'],
    };

    // Alle Kampagnen abrufen
    const campaignsResult = await googleAdsService.getCampaigns(config, customerId);

    if (!campaignsResult.success || !campaignsResult.data?.campaigns) {
      return NextResponse.json(
        {
          error: 'Failed to fetch campaigns for report',
          details: campaignsResult.error,
        },
        { status: 500 }
      );
    }

    const allCampaigns = campaignsResult.data.campaigns;

    // Filtere Kampagnen wenn spezifische IDs angegeben
    const targetCampaigns =
      campaignIds && campaignIds.length > 0
        ? allCampaigns.filter(campaign => campaignIds.includes(campaign.id))
        : allCampaigns;

    // Report-Ergebnisse zusammenstellen
    const reportResults = targetCampaigns.map(campaign => ({
      campaignId: campaign.id,
      campaignName: campaign.name,
      status: campaign.status,
      metrics: campaign.metrics,
    }));

    // Aggregierte Metriken berechnen
    const aggregatedMetrics = reportResults.reduce(
      (acc, result) => {
        const metrics = result.metrics;
        return {
          totalImpressions: acc.totalImpressions + (metrics?.impressions || 0),
          totalClicks: acc.totalClicks + (metrics?.clicks || 0),
          totalCost: acc.totalCost + (metrics?.cost || 0),
          totalConversions: acc.totalConversions + (metrics?.conversions || 0),
          totalConversionValue: acc.totalConversionValue + (metrics?.conversionValue || 0),
        };
      },
      {
        totalImpressions: 0,
        totalClicks: 0,
        totalCost: 0,
        totalConversions: 0,
        totalConversionValue: 0,
      }
    );

    // Durchschnittswerte berechnen
    const averageMetrics = {
      averageCtr:
        aggregatedMetrics.totalImpressions > 0
          ? (aggregatedMetrics.totalClicks / aggregatedMetrics.totalImpressions) * 100
          : 0,
      averageCpc:
        aggregatedMetrics.totalClicks > 0
          ? aggregatedMetrics.totalCost / aggregatedMetrics.totalClicks
          : 0,
      averageConversionRate:
        aggregatedMetrics.totalClicks > 0
          ? (aggregatedMetrics.totalConversions / aggregatedMetrics.totalClicks) * 100
          : 0,
      averageRoas:
        aggregatedMetrics.totalCost > 0
          ? (aggregatedMetrics.totalConversionValue / aggregatedMetrics.totalCost) * 100
          : 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          ...aggregatedMetrics,
          ...averageMetrics,
          campaignCount: reportResults.length,
        },
        campaigns: reportResults,
        reportConfig: reportData,
        generatedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Performance report error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
