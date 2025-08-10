// 🎯 WHITE-LABEL TASKILO ADVERTISING - Campaigns API
// Vollständige Kampagnen-Verwaltung über Taskilo Interface

import { NextRequest, NextResponse } from 'next/server';
import { googleAdsClientService } from '@/services/googleAdsClientService';
import { db } from '@/firebase/server';

/**
 * 📊 GET /api/taskilo-advertising/campaigns - Kampagnen für White-Label Interface abrufen
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🎯 Taskilo Advertising Campaigns API called');

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const includeMetrics = searchParams.get('metrics') !== 'false';

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    // Hole Google Ads Konfiguration aus Firestore
    const googleAdsSnap = await db
      .collection('companies')
      .doc(companyId)
      .collection('integrations')
      .doc('googleAds')
      .get();

    if (!googleAdsSnap.exists) {
      return NextResponse.json(
        {
          error: 'Taskilo Advertising nicht aktiviert',
          action: 'setup_advertising',
          setupUrl: `/dashboard/company/${companyId}/taskilo-advertising/setup`,
          benefits: [
            'Zentrale Kampagnen-Verwaltung',
            'Automatische Optimierung',
            'Performance Tracking',
            'ROI Maximierung',
          ],
        },
        { status: 404 }
      );
    }

    const data = googleAdsSnap.data();
    const accountConfig = data?.accountConfig;

    if (!accountConfig?.refreshToken) {
      return NextResponse.json(
        { error: 'Advertising-Verbindung nicht verfügbar' },
        { status: 400 }
      );
    }

    // Hole verfügbare Customer IDs
    const customersResponse = await googleAdsClientService.getAccessibleCustomers(
      accountConfig.refreshToken
    );

    if (!customersResponse.success || !customersResponse.data?.length) {
      return NextResponse.json({ error: 'Keine Advertising-Accounts verfügbar' }, { status: 400 });
    }

    // Verwende ersten verfügbaren Account
    const customerId = customersResponse.data[0].id;

    // Hole Kampagnen über bestehenden Service
    const campaignsResponse = await googleAdsClientService.getCampaigns(
      accountConfig.refreshToken,
      customerId
    );

    if (!campaignsResponse.success) {
      return NextResponse.json(
        {
          error: 'Fehler beim Laden der Kampagnen',
          details: campaignsResponse.error,
        },
        { status: 500 }
      );
    }

    const campaigns = campaignsResponse.data?.campaigns || [];

    // Erweitere Kampagnen mit Taskilo-spezifischen Insights
    const enhancedCampaigns = campaigns.map((campaign: any) => {
      const roas = campaign.metrics?.roas || 0;
      const ctr = campaign.metrics?.ctr || 0;
      const conversions = campaign.metrics?.conversions || 0;

      // Taskilo Performance Score (0-100)
      const performanceScore = Math.min(
        100,
        Math.max(0, roas * 20 + ctr * 10 + (conversions > 0 ? 20 : 0))
      );

      let status = 'needs-attention';
      if (performanceScore >= 80) status = 'excellent';
      else if (performanceScore >= 60) status = 'good';
      else if (performanceScore >= 40) status = 'average';

      const recommendations = [];
      if (ctr < 2) recommendations.push('Improve ad copy for better click-through rate');
      if (roas < 2) recommendations.push('Optimize keywords and targeting');
      if (conversions === 0) recommendations.push('Set up conversion tracking');

      return {
        ...campaign,
        taskiloInsights: {
          performanceScore,
          status,
          recommendations,
          automationLevel: 'manual', // TODO: Detect if automated bidding is used
          optimization: {
            budgetUtilization: Math.random() * 100, // TODO: Calculate real budget utilization
            qualityScore: Math.floor(Math.random() * 5) + 6, // TODO: Get real quality scores
            competitiveMetrics: {
              impressionShare: Math.random() * 100,
              rankAboveRate: Math.random() * 100,
            },
          },
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        campaigns: enhancedCampaigns,
        totalCampaigns: enhancedCampaigns.length,
        account: {
          id: customerId,
          name: customersResponse.data[0].name,
        },
        summary: {
          active: enhancedCampaigns.filter((c: any) => c.status === 'ENABLED').length,
          paused: enhancedCampaigns.filter((c: any) => c.status === 'PAUSED').length,
          totalSpend: enhancedCampaigns.reduce(
            (sum: number, c: any) => sum + (c.metrics?.cost || 0),
            0
          ),
          averageRoas:
            enhancedCampaigns.reduce((sum: number, c: any) => sum + (c.metrics?.roas || 0), 0) /
            enhancedCampaigns.length,
        },
        // White-Label Branding
        platform: 'Taskilo Advertising',
        feature: 'Campaign Management',
        dashboardUrl: `/dashboard/company/${companyId}/taskilo-advertising/campaigns`,
        capabilities: [
          'Kampagnen erstellen & verwalten',
          'Automatische Optimierung',
          'Performance Monitoring',
          'Budget Management',
          'A/B Testing',
          'Conversion Tracking',
        ],
      },
    });
  } catch (error: any) {
    console.error('❌ Taskilo Advertising Campaigns error:', error);
    return NextResponse.json(
      {
        error: 'Interner Server-Fehler',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * 🚀 POST /api/taskilo-advertising/campaigns - Neue Kampagne über Taskilo erstellen
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Creating new campaign via Taskilo Advertising...');

    const body = await request.json();
    const { companyId, name, type, budget, biddingStrategy, targeting, schedule, creatives } = body;

    if (!companyId || !name || !type || !budget) {
      return NextResponse.json(
        { error: 'Erforderliche Felder: Company ID, Name, Type, Budget' },
        { status: 400 }
      );
    }

    // Hole Google Ads Konfiguration
    const googleAdsSnap = await db
      .collection('companies')
      .doc(companyId)
      .collection('integrations')
      .doc('googleAds')
      .get();

    if (!googleAdsSnap.exists) {
      return NextResponse.json({ error: 'Taskilo Advertising nicht aktiviert' }, { status: 404 });
    }

    const data = googleAdsSnap.data();
    const accountConfig = data?.accountConfig;

    if (!accountConfig?.refreshToken) {
      return NextResponse.json(
        { error: 'Advertising-Verbindung nicht verfügbar' },
        { status: 400 }
      );
    }

    // Hole Customer ID
    const customersResponse = await googleAdsClientService.getAccessibleCustomers(
      accountConfig.refreshToken
    );

    if (!customersResponse.success || !customersResponse.data?.length) {
      return NextResponse.json({ error: 'Keine Advertising-Accounts verfügbar' }, { status: 400 });
    }

    const customerId = customersResponse.data[0].id;

    // Erstelle Kampagne über bestehenden Service
    const campaignData = {
      name: `[TASKILO] ${name}`, // Taskilo Branding
      budgetAmountMicros: budget.amount * 1000000,
      advertisingChannelType: type,
      biddingStrategyType: biddingStrategy?.type || 'MAXIMIZE_CLICKS',
      startDate: schedule?.startDate,
      endDate: schedule?.endDate,
      geoTargets: targeting?.locations || [],
      languageTargets: targeting?.languages || ['1000'], // Default: German
      deviceTargets: targeting?.devices || ['DESKTOP', 'MOBILE'],
    };

    const createResponse = await googleAdsClientService.createCampaign(
      accountConfig.refreshToken,
      customerId,
      campaignData
    );

    if (!createResponse.success) {
      return NextResponse.json(
        {
          error: 'Fehler beim Erstellen der Kampagne',
          details: createResponse.error,
        },
        { status: 500 }
      );
    }

    // Speichere Taskilo-spezifische Metadaten
    const taskiloMetadata = {
      createdVia: 'taskilo-advertising',
      originalName: name,
      createdAt: new Date().toISOString(),
      settings: {
        type,
        budget,
        biddingStrategy,
        targeting,
        schedule,
      },
      taskiloOptimizations: {
        autoOptimization: true,
        performanceTracking: true,
        budgetMonitoring: true,
      },
    };

    // Speichere Metadaten in Firestore
    await db
      .collection('companies')
      .doc(companyId)
      .collection('taskiloAdvertising')
      .doc('campaigns')
      .collection('metadata')
      .doc(createResponse.data.campaignId)
      .set(taskiloMetadata);

    return NextResponse.json({
      success: true,
      data: {
        campaign: createResponse.data,
        taskiloMetadata,
        // White-Label Response
        platform: 'Taskilo Advertising',
        feature: 'Campaign Creation',
        message: 'Kampagne erfolgreich über Taskilo Advertising erstellt',
        nextSteps: [
          'Anzeigengruppen hinzufügen',
          'Keywords definieren',
          'Anzeigen erstellen',
          'Performance überwachen',
        ],
        dashboardUrl: `/dashboard/company/${companyId}/taskilo-advertising/campaigns/${createResponse.data.campaignId}`,
      },
    });
  } catch (error: any) {
    console.error('❌ Campaign creation error:', error);
    return NextResponse.json(
      {
        error: 'Fehler beim Erstellen der Kampagne',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
