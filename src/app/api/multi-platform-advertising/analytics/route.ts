import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

const GOOGLE_ADS_API_VERSION = 'v18';

interface PlatformMetrics {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
}

interface PlatformBreakdownItem {
  platform: string;
  metrics: PlatformMetrics;
  campaignCount: number;
  isActive: boolean;
}

async function refreshGoogleAdsToken(refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh Google token:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error refreshing Google token:', error);
    return null;
  }
}

async function fetchGoogleAdsAnalytics(connection: any): Promise<{ metrics: PlatformMetrics; campaignCount: number }> {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  
  const emptyMetrics: PlatformMetrics = {
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

  console.log('📊 fetchGoogleAdsAnalytics called');
  
  if (!developerToken) {
    console.log('⚠️ Missing developer token for Google Ads analytics');
    return { metrics: emptyMetrics, campaignCount: 0 };
  }

  // Try to get a fresh access token
  let accessToken = connection.oauth?.access_token;
  
  if (connection.oauth?.refresh_token) {
    const freshToken = await refreshGoogleAdsToken(connection.oauth.refresh_token);
    if (freshToken) {
      accessToken = freshToken;
      console.log('🔄 Refreshed Google Ads access token for analytics');
    }
  }

  if (!accessToken) {
    console.log('⚠️ No access token available for Google Ads analytics');
    return { metrics: emptyMetrics, campaignCount: 0 };
  }

  // Get customer ID
  let customerId = connection.customerId?.replace(/-/g, '') || '';
  
  if (!customerId || customerId === 'oauth-connected' || customerId.startsWith('oauth-')) {
    // List accessible customers first
    try {
      console.log('🔍 Listing accessible Google Ads customers for analytics...');
      const accessibleResponse = await fetch(
        `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers:listAccessibleCustomers`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': developerToken,
          },
        }
      );

      if (!accessibleResponse.ok) {
        console.error('Failed to list accessible customers for analytics:', await accessibleResponse.text());
        return { metrics: emptyMetrics, campaignCount: 0 };
      }

      const accessibleData = await accessibleResponse.json();
      console.log('📊 Accessible customers for analytics:', accessibleData);
      
      if (!accessibleData.resourceNames?.length) {
        console.log('No accessible Google Ads customers found for analytics');
        return { metrics: emptyMetrics, campaignCount: 0 };
      }

      customerId = accessibleData.resourceNames[0].replace('customers/', '');
      console.log('📊 Using customer ID for analytics:', customerId);
    } catch (error) {
      console.error('Error listing accessible customers:', error);
      return { metrics: emptyMetrics, campaignCount: 0 };
    }
  }

  return await fetchAnalyticsForCustomer(customerId, accessToken, developerToken);
}

async function fetchAnalyticsForCustomer(
  customerId: string, 
  accessToken: string, 
  developerToken: string
): Promise<{ metrics: PlatformMetrics; campaignCount: number }> {
  const emptyMetrics: PlatformMetrics = {
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

  try {
    // Query for account-level metrics (last 30 days)
    const query = `
      SELECT
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        segments.date
      FROM customer
      WHERE segments.date DURING LAST_30_DAYS
    `;

    const response = await fetch(
      `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Ads Analytics API error:', errorText);
      return { metrics: emptyMetrics, campaignCount: 0 };
    }

    const data = await response.json();
    
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalCostMicros = 0;
    let totalConversions = 0;
    let totalConversionsValue = 0;

    if (Array.isArray(data)) {
      for (const batch of data) {
        if (batch.results) {
          for (const result of batch.results) {
            const metrics = result.metrics || {};
            totalImpressions += parseInt(metrics.impressions || '0');
            totalClicks += parseInt(metrics.clicks || '0');
            totalCostMicros += parseInt(metrics.costMicros || '0');
            totalConversions += parseFloat(metrics.conversions || '0');
            totalConversionsValue += parseFloat(metrics.conversionsValue || '0');
          }
        }
      }
    }

    // Get campaign count
    const campaignCountQuery = `
      SELECT campaign.id
      FROM campaign
      WHERE campaign.status = 'ENABLED'
    `;

    const campaignResponse = await fetch(
      `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: campaignCountQuery }),
      }
    );

    let campaignCount = 0;
    if (campaignResponse.ok) {
      const campaignData = await campaignResponse.json();
      if (Array.isArray(campaignData)) {
        for (const batch of campaignData) {
          campaignCount += batch.results?.length || 0;
        }
      }
    }

    const costCents = Math.round(totalCostMicros / 10000);
    const conversionsValueCents = Math.round(totalConversionsValue * 100);

    const metrics: PlatformMetrics = {
      impressions: totalImpressions,
      clicks: totalClicks,
      cost: costCents,
      conversions: Math.round(totalConversions),
      conversionValue: conversionsValueCents,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpc: totalClicks > 0 ? Math.round(costCents / totalClicks) : 0,
      cpa: totalConversions > 0 ? Math.round(costCents / totalConversions) : 0,
      roas: costCents > 0 ? conversionsValueCents / costCents : 0,
    };

    console.log(`📊 Google Ads Analytics: ${totalImpressions} impressions, ${totalClicks} clicks, ${campaignCount} campaigns`);
    
    return { metrics, campaignCount };
  } catch (error) {
    console.error('Error fetching Google Ads analytics:', error);
    return { metrics: emptyMetrics, campaignCount: 0 };
  }
}

export async function GET(request: NextRequest) {
  if (!db) {
    return NextResponse.json(
      { success: false, error: 'Database connection failed' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Get all connected platforms
    const connectionsRef = db
      .collection('companies')
      .doc(companyId)
      .collection('advertising_connections');
    
    const connectionsSnapshot = await connectionsRef.get();
    
    const platformBreakdown: PlatformBreakdownItem[] = [];
    const summaryMetrics: PlatformMetrics = {
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

    const allPlatforms = ['google-ads', 'linkedin', 'meta', 'taboola', 'outbrain'];

    for (const platformName of allPlatforms) {
      const connectionDoc = connectionsSnapshot.docs.find(d => d.id === platformName);
      const connection = connectionDoc?.data();
      const isConnected = connection?.status === 'connected';

      if (isConnected && platformName === 'google-ads') {
        const { metrics, campaignCount } = await fetchGoogleAdsAnalytics(connection);
        
        platformBreakdown.push({
          platform: platformName,
          metrics,
          campaignCount,
          isActive: campaignCount > 0,
        });

        // Add to summary
        summaryMetrics.impressions += metrics.impressions;
        summaryMetrics.clicks += metrics.clicks;
        summaryMetrics.cost += metrics.cost;
        summaryMetrics.conversions += metrics.conversions;
        summaryMetrics.conversionValue += metrics.conversionValue;
      } else {
        // Platform not connected - show empty metrics
        platformBreakdown.push({
          platform: platformName,
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
    }

    // Calculate summary rates
    if (summaryMetrics.impressions > 0) {
      summaryMetrics.ctr = (summaryMetrics.clicks / summaryMetrics.impressions) * 100;
    }
    if (summaryMetrics.clicks > 0) {
      summaryMetrics.cpc = Math.round(summaryMetrics.cost / summaryMetrics.clicks);
    }
    if (summaryMetrics.conversions > 0) {
      summaryMetrics.cpa = Math.round(summaryMetrics.cost / summaryMetrics.conversions);
    }
    if (summaryMetrics.cost > 0) {
      summaryMetrics.roas = summaryMetrics.conversionValue / summaryMetrics.cost;
    }

    // Generate insights
    const activePlatforms = platformBreakdown.filter(p => p.isActive);
    const bestPerforming = activePlatforms.length > 0 
      ? activePlatforms.reduce((best, current) => 
          current.metrics.roas > best.metrics.roas ? current : best
        ).platform
      : null;

    const recommendations: string[] = [];
    
    if (activePlatforms.length === 0) {
      recommendations.push('Verbinden Sie eine Werbeplattform, um mit der Kampagnenverwaltung zu beginnen.');
    } else {
      if (summaryMetrics.roas > 2) {
        recommendations.push(`Gute Performance! ROAS von ${summaryMetrics.roas.toFixed(1)}. Erwägen Sie eine Budgeterhöhung.`);
      }
      if (activePlatforms.length < 3) {
        recommendations.push('Erwägen Sie zusätzliche Plattformen für mehr Reichweite.');
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: summaryMetrics,
        platformBreakdown,
        dailyData: [], // TODO: Implement daily breakdown
        insights: {
          bestPerformingPlatform: bestPerforming,
          totalBudgetUtilization: 0,
          averageRoas: summaryMetrics.roas,
          recommendations,
        },
      },
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
