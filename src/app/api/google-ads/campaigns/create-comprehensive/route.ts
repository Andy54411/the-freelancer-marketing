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
    const { customerId, campaignData, companyId } = body as {
      customerId: string;
      campaignData: ComprehensiveCampaignRequest;
      companyId?: string;
    };

    console.log('🎯 Comprehensive campaign creation request:', { customerId, companyId });
    console.log('📝 Campaign data:', JSON.stringify(campaignData, null, 2));

    if (!customerId || !campaignData) {
      return NextResponse.json(
        { error: 'Customer ID and campaign data are required' },
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

    // Get Firebase config
    const { db } = await import('@/firebase/server');
    const finalCompanyId = companyId || '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1';

    const googleAdsDocRef = db
      .collection('companies')
      .doc(finalCompanyId)
      .collection('integrations')
      .doc('googleAds');

    const googleAdsSnap = await googleAdsDocRef.get();

    if (!googleAdsSnap.exists) {
      return NextResponse.json(
        { error: 'No Google Ads configuration found', companyId: finalCompanyId },
        { status: 404 }
      );
    }

    const data = googleAdsSnap.data();
    const accountConfig = data?.accountConfig;

    if (!accountConfig?.refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token found', companyId: finalCompanyId },
        { status: 400 }
      );
    }

    // Resolve customer ID if needed
    let finalCustomerId = customerId;
    if (customerId === 'auto-detect') {
      const customersResponse = await googleAdsClientService.getAccessibleCustomers(
        accountConfig.refreshToken
      );

      if (customersResponse.success && customersResponse.data?.length > 0) {
        const realCustomer = customersResponse.data.find(c => c.id !== 'pending-setup');
        finalCustomerId = realCustomer?.id || customersResponse.data[0].id;
        console.log('🎯 Resolved customer ID:', finalCustomerId);
      } else {
        return NextResponse.json(
          { error: 'No customers found', details: customersResponse.error },
          { status: 400 }
        );
      }
    }

    // Create comprehensive campaign using the service
    console.log('🚀 Creating comprehensive campaign...');
    const result = await googleAdsClientService.createComprehensiveCampaign(
      accountConfig.refreshToken,
      finalCustomerId,
      campaignData
    );

    if (!result.success) {
      console.error('❌ Campaign creation failed:', result.error);
      return NextResponse.json(
        {
          error: 'Failed to create comprehensive campaign',
          details: result.error,
          debugInfo: {
            customerId: finalCustomerId,
            campaignName: campaignData.name,
            adGroupsCount: campaignData.adGroups.length,
          },
        },
        { status: 500 }
      );
    }

    console.log('✅ Comprehensive campaign created successfully');
    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Comprehensive campaign created successfully',
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
