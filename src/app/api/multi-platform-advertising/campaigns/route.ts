import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

const GOOGLE_ADS_API_VERSION = 'v18';

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

async function fetchGoogleAdsCampaigns(connection: any) {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  
  console.log('📊 fetchGoogleAdsCampaigns called, developerToken:', developerToken ? 'present' : 'missing');
  console.log('📊 OAuth tokens:', {
    access_token: connection.oauth?.access_token ? 'present' : 'missing',
    refresh_token: connection.oauth?.refresh_token ? 'present' : 'missing',
  });
  
  if (!developerToken) {
    console.log('⚠️ Missing developer token for Google Ads');
    return [];
  }

  // Try to get a fresh access token
  let accessToken = connection.oauth?.access_token;
  
  if (connection.oauth?.refresh_token) {
    const freshToken = await refreshGoogleAdsToken(connection.oauth.refresh_token);
    if (freshToken) {
      accessToken = freshToken;
      console.log('🔄 Refreshed Google Ads access token');
    }
  }

  if (!accessToken) {
    console.log('⚠️ No access token available for Google Ads');
    return [];
  }

  // Get customer IDs to query
  const customerId = connection.customerId?.replace(/-/g, '') || '';
  
  if (!customerId || customerId === 'oauth-connected' || customerId.startsWith('oauth-')) {
    // First, list accessible customers
    try {
      console.log('🔍 Listing accessible Google Ads customers...');
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
        console.error('Failed to list accessible customers:', await accessibleResponse.text());
        return [];
      }

      const accessibleData = await accessibleResponse.json();
      console.log('📊 Accessible customers:', accessibleData);
      
      if (!accessibleData.resourceNames?.length) {
        console.log('No accessible Google Ads customers found');
        return [];
      }

      // Use first customer
      const firstCustomerId = accessibleData.resourceNames[0].replace('customers/', '');
      console.log('📊 Using customer ID:', firstCustomerId);
      return await fetchCampaignsForCustomer(firstCustomerId, accessToken, developerToken);
    } catch (error) {
      console.error('Error listing accessible customers:', error);
      return [];
    }
  }

  return await fetchCampaignsForCustomer(customerId, accessToken, developerToken);
}

async function fetchCampaignsForCustomer(customerId: string, accessToken: string, developerToken: string) {
  try {
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.start_date,
        campaign.end_date,
        campaign_budget.amount_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM campaign
      WHERE campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
      LIMIT 50
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
      console.error('Google Ads API error:', errorText);
      return [];
    }

    const data = await response.json();
    const campaigns: any[] = [];

    // Parse the streaming response
    if (Array.isArray(data)) {
      for (const batch of data) {
        if (batch.results) {
          for (const result of batch.results) {
            const campaign = result.campaign;
            const metrics = result.metrics || {};
            const budget = result.campaignBudget || {};

            const impressions = parseInt(metrics.impressions || '0');
            const clicks = parseInt(metrics.clicks || '0');
            const costMicros = parseInt(metrics.costMicros || '0');
            const conversions = parseFloat(metrics.conversions || '0');
            const conversionsValue = parseFloat(metrics.conversionsValue || '0');

            campaigns.push({
              id: campaign.id,
              name: campaign.name,
              platform: 'google-ads',
              status: campaign.status,
              type: campaign.advertisingChannelType,
              startDate: campaign.startDate,
              endDate: campaign.endDate,
              budget: {
                amount: Math.round((parseInt(budget.amountMicros || '0') / 1000000) * 100), // cents
                currency: 'EUR',
                period: 'DAILY',
              },
              metrics: {
                impressions,
                clicks,
                cost: Math.round(costMicros / 10000), // micros to cents
                conversions: Math.round(conversions),
                conversionValue: Math.round(conversionsValue * 100), // to cents
                ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
                cpc: clicks > 0 ? Math.round(costMicros / clicks / 10000) : 0,
                cpa: conversions > 0 ? Math.round(costMicros / conversions / 10000) : 0,
                roas: costMicros > 0 ? (conversionsValue * 1000000) / costMicros : 0,
              },
            });
          }
        }
      }
    }

    console.log(`📊 Fetched ${campaigns.length} campaigns from Google Ads`);
    return campaigns;
  } catch (error) {
    console.error('Error fetching Google Ads campaigns:', error);
    return [];
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
    const platform = searchParams.get('platform');

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
    
    let allCampaigns: any[] = [];

    for (const doc of connectionsSnapshot.docs) {
      const connection = doc.data();
      
      if (connection.status !== 'connected') continue;
      if (platform && doc.id !== platform) continue;

      if (doc.id === 'google-ads') {
        const googleCampaigns = await fetchGoogleAdsCampaigns(connection);
        allCampaigns = [...allCampaigns, ...googleCampaigns];
      }
      // Add other platforms here (linkedin, meta, etc.)
    }

    return NextResponse.json({
      success: true,
      data: allCampaigns,
      totalCampaigns: allCampaigns.length,
      activeCampaigns: allCampaigns.filter(c => c.status === 'ENABLED').length,
    });
  } catch (error) {
    console.error('Fehler beim Laden der Kampagnen:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Laden der Kampagnen',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const body = await request.json();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    const { name, platform, budget } = body;

    if (!name || !platform || !budget) {
      return NextResponse.json(
        { success: false, error: 'Name, Platform und Budget sind erforderlich' },
        { status: 400 }
      );
    }

    // TODO: Implement real campaign creation via Google Ads API
    return NextResponse.json({
      success: false,
      error: 'Kampagnenerstellung über API noch nicht implementiert. Bitte nutzen Sie die Google Ads Oberfläche.',
    }, { status: 501 });
  } catch (error) {
    console.error('Fehler beim Erstellen der Kampagne:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Erstellen der Kampagne',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
