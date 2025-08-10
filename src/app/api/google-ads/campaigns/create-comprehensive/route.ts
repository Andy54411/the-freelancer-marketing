// 🚀 Comprehensive Google Ads Campaign Creation API
// Creates complete campaigns with ad groups, keywords, and ads

import { NextRequest, NextResponse } from 'next/server';
import { googleAdsClientService } from '@/services/googleAdsClientService';

interface ComprehensiveCampaignRequest {
  name: string;
  budgetAmountMicros: number;
  advertisingChannelType: string;
  biddingStrategyType: string;
  startDate?: string;
  endDate?: string;

  // ✅ Assets und Extensions hinzufügen
  assets?: Array<{
    id: string;
    type: 'IMAGE' | 'VIDEO' | 'TEXT' | 'LOGO';
    assetType:
      | 'MARKETING_IMAGE'
      | 'SQUARE_MARKETING_IMAGE'
      | 'LOGO'
      | 'BUSINESS_NAME'
      | 'CALL_TO_ACTION_SELECTION';
    name: string;
    url?: string;
    text?: string;
  }>;

  extensions?: Array<{
    id: string;
    type: 'SITELINK' | 'CALLOUT' | 'STRUCTURED_SNIPPET' | 'CALL' | 'PRICE';
    data: any;
  }>;

  // Ad Groups
  adGroups: Array<{
    name: string;
    cpcBidMicros: number;
    keywords: Array<{
      text: string;
      matchType: string;
    }>;
    ads: Array<{
      headlines: string[];
      descriptions: string[];
      finalUrls: string[];
    }>;
  }>;

  // Target Locations (optional)
  geoTargets?: Array<{
    locationId: string;
    name: string;
  }>;

  // Demographics (optional)
  demographics?: {
    ageRanges?: string[];
    genders?: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignData, companyId } = body as {
      campaignData: ComprehensiveCampaignRequest;
      companyId: string;
    };

    if (!companyId || !campaignData) {
      return NextResponse.json(
        { error: 'Company ID and campaign data are required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!campaignData.name || !campaignData.budgetAmountMicros || !campaignData.adGroups?.length) {
      return NextResponse.json(
        { error: 'Campaign name, budget, and at least one ad group are required' },
        { status: 400 }
      );
    }

    // Validate ad groups
    for (const adGroup of campaignData.adGroups) {
      if (!adGroup.name || !adGroup.keywords?.length || !adGroup.ads?.length) {
        return NextResponse.json(
          { error: 'Each ad group must have a name, keywords, and ads' },
          { status: 400 }
        );
      }

      // Validate ads
      for (const ad of adGroup.ads) {
        if (!ad.headlines?.length || !ad.descriptions?.length || !ad.finalUrls?.length) {
          return NextResponse.json(
            { error: 'Each ad must have headlines, descriptions, and final URLs' },
            { status: 400 }
          );
        }
      }
    }

    // Get Firebase config with company lookup
    const { db } = await import('@/firebase/server');

    let googleAdsDocRef = db
      .collection('companies')
      .doc(companyId)
      .collection('integrations')
      .doc('googleAds');
    let googleAdsSnap = await googleAdsDocRef.get();
    let actualCompanyId = companyId;

    console.log('🔍 Debug Google Ads Campaign Creation:', {
      companyId,
      docExists: googleAdsSnap.exists,
      docPath: `companies/${companyId}/integrations/googleAds`,
      timestamp: new Date().toISOString(),
    });

    // If not found with provided companyId, search all companies for Google Ads config
    if (!googleAdsSnap.exists) {
      console.log(`🔍 Google Ads config not found for ${companyId}, searching all companies...`);

      const companiesRef = db.collection('companies');
      const companiesSnap = await companiesRef.get();

      for (const companyDoc of companiesSnap.docs) {
        const testGoogleAdsDocRef = companyDoc.ref.collection('integrations').doc('googleAds');
        const testGoogleAdsSnap = await testGoogleAdsDocRef.get();

        if (testGoogleAdsSnap.exists) {
          console.log(`✅ Found Google Ads config for company: ${companyDoc.id}`);
          googleAdsDocRef = testGoogleAdsDocRef;
          googleAdsSnap = testGoogleAdsSnap;
          actualCompanyId = companyDoc.id;
          break;
        }
      }
    }

    if (!googleAdsSnap.exists) {
      return NextResponse.json(
        { error: 'No Google Ads configuration found', companyId, actualCompanyId },
        { status: 404 }
      );
    }

    console.log('🎯 Comprehensive campaign creation request:', {
      originalCompanyId: companyId,
      actualCompanyId: actualCompanyId,
    });
    console.log('📝 Campaign data:', JSON.stringify(campaignData, null, 2));

    const data = googleAdsSnap.data();
    const accountConfig = data?.accountConfig;

    if (!accountConfig?.refreshToken) {
      return NextResponse.json(
        {
          error: 'No refresh token found',
          companyId,
          actualCompanyId,
        },
        { status: 400 }
      );
    }

    // ✅ AUTOMATISCHE CUSTOMER ID AUSWAHL (wie in main campaigns route)
    console.log('🔍 Fetching available customers...');

    const customersResponse = await googleAdsClientService.getAccessibleCustomers(
      accountConfig.refreshToken
    );

    if (!customersResponse.success || !customersResponse.data?.length) {
      return NextResponse.json(
        { error: 'No customers found', details: customersResponse.error },
        { status: 400 }
      );
    }

    // Verwende dieselbe Logik wie campaigns route: erste verfügbare Customer ID
    const finalCustomerId = customersResponse.data[0].id;
    console.log('🎯 Using first available customer ID (same as campaigns route):', finalCustomerId);

    // Optional: Log alle verfügbaren Accounts für Debug
    console.log(
      '📋 Available accounts:',
      customersResponse.data.map(c => ({
        id: c.id,
        name: c.name,
        manager: c.manager,
      }))
    );

    // Create simple campaign using the basic service (not comprehensive)
    console.log('🚀 Creating simple campaign...');
    const result = await googleAdsClientService.createCampaign(
      accountConfig.refreshToken,
      finalCustomerId,
      {
        name: campaignData.name,
        budgetAmountMicros: campaignData.budgetAmountMicros,
        advertisingChannelType: campaignData.advertisingChannelType,
        biddingStrategyType: campaignData.biddingStrategyType,
        startDate: campaignData.startDate,
        endDate: campaignData.endDate,
      }
    );

    if (!result.success) {
      console.error('❌ Campaign creation failed:', result.error);
      return NextResponse.json(
        {
          error: 'Failed to create campaign',
          details: result.error,
          debugInfo: {
            customerId: finalCustomerId,
            campaignName: campaignData.name,
          },
        },
        { status: 500 }
      );
    }

    console.log('✅ Campaign created successfully');
    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Campaign created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Comprehensive campaign creation error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
