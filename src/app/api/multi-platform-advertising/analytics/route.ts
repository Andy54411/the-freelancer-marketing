import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const platform = searchParams.get('platform');
    const timeRange = searchParams.get('timeRange') || '30d';

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Mock-Analytics-Daten für Demo
    const mockAnalytics = {
      overview: {
        totalSpent: 262.55,
        totalImpressions: 28990,
        totalClicks: 479,
        totalConversions: 24,
        averageCTR: 1.65,
        averageCPC: 0.55,
        conversionRate: 5.01,
        ROAS: 4.2,
      },
      platformBreakdown: [
        {
          platform: 'google',
          spent: 127.50,
          impressions: 15420,
          clicks: 234,
          conversions: 12,
          ctr: 1.52,
          cpc: 0.54,
          conversionRate: 5.13,
        },
        {
          platform: 'linkedin', 
          spent: 89.25,
          impressions: 8340,
          clicks: 156,
          conversions: 8,
          ctr: 1.87,
          cpc: 0.57,
          conversionRate: 5.13,
        },
        {
          platform: 'meta',
          spent: 45.80,
          impressions: 5230,
          clicks: 89,
          conversions: 4,
          ctr: 1.70,
          cpc: 0.51,
          conversionRate: 4.49,
        }
      ],
      dailyStats: generateDailyStats(30), // 30 Tage Mock-Daten
      topKeywords: [
        { keyword: 'elektriker', impressions: 5420, clicks: 89, cpc: 0.65, position: 2.1 },
        { keyword: 'elektroinstallation', impressions: 3210, clicks: 67, cpc: 0.58, position: 1.8 },
        { keyword: 'notdienst elektriker', impressions: 2890, clicks: 45, cpc: 0.72, position: 2.4 },
        { keyword: 'elektriker in der nähe', impressions: 2340, clicks: 38, cpc: 0.48, position: 1.9 },
        { keyword: 'elektroplanung', impressions: 1890, clicks: 32, cpc: 0.81, position: 2.2 },
      ],
      campaignPerformance: [
        {
          campaignName: 'Google Ads - Elektriker Services',
          platform: 'google',
          spent: 127.50,
          clicks: 234,
          conversions: 12,
          roas: 4.8,
          status: 'active'
        },
        {
          campaignName: 'LinkedIn - B2B Elektrodienstleistungen', 
          platform: 'linkedin',
          spent: 89.25,
          clicks: 156,
          conversions: 8,
          roas: 3.6,
          status: 'active'
        },
        {
          campaignName: 'Meta - Lokale Elektrikerdienstleistungen',
          platform: 'meta', 
          spent: 45.80,
          clicks: 89,
          conversions: 4,
          roas: 3.1,
          status: 'paused'
        }
      ]
    };

    // Filtere nach Platform falls angegeben
    if (platform && platform !== 'all') {
      const platformData = mockAnalytics.platformBreakdown.find(p => p.platform === platform);
      if (platformData) {
        mockAnalytics.overview = {
          totalSpent: platformData.spent,
          totalImpressions: platformData.impressions,
          totalClicks: platformData.clicks,
          totalConversions: platformData.conversions,
          averageCTR: platformData.ctr,
          averageCPC: platformData.cpc,
          conversionRate: platformData.conversionRate,
          ROAS: mockAnalytics.overview.ROAS, // Behalte ROAS
        };
        mockAnalytics.platformBreakdown = [platformData];
        mockAnalytics.campaignPerformance = mockAnalytics.campaignPerformance.filter(c => c.platform === platform);
      }
    }

    return NextResponse.json({
      success: true,
      analytics: mockAnalytics,
      timeRange,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Fehler beim Laden der Analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Laden der Analytics',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

// Hilfsfunktion für Mock Daily Stats
function generateDailyStats(days: number) {
  const stats: Array<{
    date: string;
    spent: number;
    clicks: number;
    impressions: number;
    conversions: number;
    ctr: number;
  }> = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Simuliere realistische aber zufällige Daten
    const baseSpent = 5 + Math.random() * 15;
    const baseClicks = Math.floor(8 + Math.random() * 20);
    const baseImpressions = Math.floor(baseClicks * (50 + Math.random() * 100));
    
    stats.push({
      date: date.toISOString().split('T')[0],
      spent: Math.round(baseSpent * 100) / 100,
      clicks: baseClicks,
      impressions: baseImpressions,
      conversions: Math.floor(baseClicks * (0.02 + Math.random() * 0.08)),
      ctr: Math.round((baseClicks / baseImpressions) * 10000) / 100,
    });
  }
  
  return stats;
}