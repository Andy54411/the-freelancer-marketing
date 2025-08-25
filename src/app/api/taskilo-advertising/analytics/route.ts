// 🎯 WHITE-LABEL TASKILO ADVERTISING - Analytics API
// Vollständige Performance-Analytics über Taskilo Interface

import { NextRequest, NextResponse } from 'next/server';
import { googleAdsClientService } from '@/services/googleAdsClientService';
import { db } from '@/firebase/server';

/**
 * 📈 GET /api/taskilo-advertising/analytics - Performance Analytics für White-Label Interface
 */
export async function GET(request: NextRequest) {
  try {

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const startDate = searchParams.get('startDate') || '2024-01-01';
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    // Hole Google Ads Konfiguration aus Firestore
    const googleAdsSnap = await db
      .collection('users')
      .doc(companyId)
      .collection('integrations')
      .doc('googleAds')
      .get();

    if (!googleAdsSnap.exists) {
      return NextResponse.json(
        {
          error: 'Taskilo Advertising nicht aktiviert',
          action: 'setup_advertising',
          redirect: `/dashboard/company/${companyId}/taskilo-advertising/setup`,
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

    // Hole Performance Analytics über White-Label Service
    const analyticsResponse = await googleAdsClientService.getPerformanceAnalytics(
      accountConfig.refreshToken,
      customerId,
      { startDate, endDate }
    );

    if (!analyticsResponse.success) {
      return NextResponse.json(
        {
          error: 'Fehler beim Laden der Analytics',
          details: analyticsResponse.error,
        },
        { status: 500 }
      );
    }

    const analytics = analyticsResponse.data;

    // Berechne zusätzliche Taskilo-spezifische Metriken
    const taskiloMetrics = {
      efficiency:
        analytics.summary.roas > 4
          ? 'Excellent'
          : analytics.summary.roas > 2
            ? 'Good'
            : analytics.summary.roas > 1
              ? 'Average'
              : 'Needs Improvement',

      recommendedActions: [] as string[],

      insights: {
        topPerformingDay: analytics.daily.reduce(
          (prev: any, curr: any) => (curr.conversions > (prev?.conversions || 0) ? curr : prev),
          {}
        ),

        costTrend:
          analytics.daily.length > 1
            ? analytics.daily[analytics.daily.length - 1].cost > analytics.daily[0].cost
              ? 'increasing'
              : 'decreasing'
            : 'stable',

        conversionTrend:
          analytics.daily.length > 1
            ? analytics.daily[analytics.daily.length - 1].conversions >
              analytics.daily[0].conversions
              ? 'improving'
              : 'declining'
            : 'stable',
      },
    };

    // Füge Empfehlungen hinzu basierend auf Performance
    if (analytics.summary.ctr < 2) {
      taskiloMetrics.recommendedActions.push('Improve ad headlines and descriptions');
    }
    if (analytics.summary.roas < 2) {
      taskiloMetrics.recommendedActions.push('Review and optimize keyword targeting');
    }
    if (analytics.summary.conversions === 0) {
      taskiloMetrics.recommendedActions.push('Set up conversion tracking');
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: analytics.summary,
        daily: analytics.daily,
        dateRange: analytics.dateRange,
        taskiloInsights: taskiloMetrics,
        account: {
          id: customerId,
          name: customersResponse.data[0].name,
        },
        // White-Label Branding
        platform: 'Taskilo Advertising',
        feature: 'Performance Analytics',
        dashboardUrl: `/dashboard/company/${companyId}/taskilo-advertising/analytics`,
        capabilities: [
          'Real-time Performance Tracking',
          'ROI Analysis',
          'Conversion Tracking',
          'Cost Optimization',
          'Automated Insights',
          'Custom Reporting',
        ],
      },
    });
  } catch (error: any) {

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
 * 📊 POST /api/taskilo-advertising/analytics - Custom Analytics Report erstellen
 */
export async function POST(request: NextRequest) {
  try {

    const body = await request.json();
    const { companyId, reportType, dateRange, metrics, dimensions, filters } = body;

    if (!companyId || !reportType) {
      return NextResponse.json(
        { error: 'Company ID und Report Type sind erforderlich' },
        { status: 400 }
      );
    }

    // TODO: Implement custom report generation
    // This would create custom reports via Google Ads API

    return NextResponse.json({
      success: true,
      message: 'Custom Report-Erstellung über Taskilo Advertising (in Entwicklung)',
      data: {
        platform: 'Taskilo Advertising',
        feature: 'Custom Reporting',
        status: 'development',
        reportPreview: {
          type: reportType,
          dateRange,
          metrics: metrics || ['impressions', 'clicks', 'cost', 'conversions'],
          dimensions: dimensions || ['date'],
          filters: filters || {},
        },
      },
    });
  } catch (error: any) {

    return NextResponse.json(
      {
        error: 'Fehler beim Erstellen des Custom Reports',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
