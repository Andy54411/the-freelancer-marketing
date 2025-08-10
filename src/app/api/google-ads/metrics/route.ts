// 🚀 PHASE 2: Google Ads Performance Analytics API
// Metriken und Performance-Daten für Kampagnen

import { NextRequest, NextResponse } from 'next/server';
import { googleAdsClientService } from '@/services/googleAdsClientService';
import { GoogleAdsSetupValidator } from '@/utils/googleAdsSetupValidator';
import type { GoogleAdsOAuthConfig } from '@/types/googleAds';

/**
 * 📊 GET /api/google-ads/metrics - Kampagnen-Metriken abrufen
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1';
    const customerId = searchParams.get('customerId');
    const campaignId = searchParams.get('campaignId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    console.log('🎯 Metrics API called with:', { companyId, customerId, campaignId });

    // Datumsbereich validieren
    const dateRange = {
      startDate:
        startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: endDate || new Date().toISOString().split('T')[0],
    };

    // Get real stored config from Firestore
    const { db } = await import('@/firebase/server');
    const googleAdsDocRef = db
      .collection('companies')
      .doc(companyId)
      .collection('integrations')
      .doc('googleAds');

    const googleAdsSnap = await googleAdsDocRef.get();

    if (!googleAdsSnap.exists) {
      return NextResponse.json(
        {
          error: 'No Google Ads configuration found',
          companyId,
        },
        { status: 404 }
      );
    }

    const data = googleAdsSnap.data();
    const accountConfig = data?.accountConfig;

    if (!accountConfig?.refreshToken) {
      return NextResponse.json(
        {
          error: 'No refresh token found in configuration',
          companyId,
        },
        { status: 400 }
      );
    }

    // If no customerId provided, get the first available customer
    let finalCustomerId = customerId;
    if (!finalCustomerId) {
      console.log('🔍 No customerId provided, fetching available customers...');

      const customersResponse = await googleAdsClientService.getAccessibleCustomers(
        accountConfig.refreshToken
      );

      if (
        customersResponse.success &&
        customersResponse.data &&
        customersResponse.data.length > 0
      ) {
        // Use the first customer ID (excluding fallback)
        const realCustomer = customersResponse.data.find(c => c.id !== 'pending-setup');
        finalCustomerId = realCustomer?.id || customersResponse.data[0].id;
        console.log('🎯 Using auto-detected customerId:', finalCustomerId);
      } else {
        return NextResponse.json(
          {
            error: 'No customers found or failed to fetch customers',
            details: customersResponse.error,
          },
          { status: 400 }
        );
      }
    }

    // Kampagnen-Metriken abrufen
    const result = await googleAdsClientService.getCampaigns(
      accountConfig.refreshToken,
      finalCustomerId
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Failed to fetch campaign metrics',
          details: result.error,
        },
        { status: 500 }
      );
    }

    // Wenn spezifische Kampagne angefragt, finde sie
    if (campaignId) {
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
          customerId: finalCustomerId,
          campaignName: campaign.name,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Sonst alle Kampagnen-Metriken zurückgeben
    return NextResponse.json({
      success: true,
      data: {
        campaigns: result.data?.campaigns || [],
        metrics: {
          totalImpressions:
            result.data?.campaigns?.reduce((sum, c) => sum + (c.metrics?.impressions || 0), 0) || 0,
          totalClicks:
            result.data?.campaigns?.reduce((sum, c) => sum + (c.metrics?.clicks || 0), 0) || 0,
          totalCost:
            result.data?.campaigns?.reduce((sum, c) => sum + (c.metrics?.cost || 0), 0) || 0,
          totalConversions:
            result.data?.campaigns?.reduce((sum, c) => sum + (c.metrics?.conversions || 0), 0) || 0,
        },
        dateRange,
        customerId: finalCustomerId,
        companyId,
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
    if (!config.refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token available for campaign metrics' },
        { status: 400 }
      );
    }

    const campaignsResult = await googleAdsClientService.getCampaigns(
      config.refreshToken,
      customerId
    );

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
